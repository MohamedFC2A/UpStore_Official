import 'server-only'

import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  buildReferralCode,
  getDashboardPath,
  isAdminIdentity,
  normalizeEmail,
  normalizeReferralCode,
  type AppProfile,
} from '@/utils/auth';
import { processRegistrationReferral } from '@/utils/referrals';
import { heuristicExtractFirstName } from '@/utils/nameUtils';
import { createAdminClient } from '@/utils/supabase/admin';

const PROFILE_COLUMNS =
  'id, email, display_name, role, wallet_balance, referral_code, referred_by, referral_applied_code, referral_locked_at, device_fingerprint, country, created_at';
const LEGACY_PROFILE_COLUMNS =
  'id, email, display_name, role, wallet_balance, referral_code, referred_by, created_at';

function normalizeProfileRecord(profile: Partial<AppProfile> | null | undefined): AppProfile | null {
  if (!profile?.id) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email ?? null,
    display_name: profile.display_name ?? null,
    role: profile.role ?? null,
    wallet_balance: profile.wallet_balance ?? 0,
    referral_code: profile.referral_code ?? null,
    referred_by: profile.referred_by ?? null,
    referral_applied_code: profile.referral_applied_code ?? null,
    referral_locked_at: profile.referral_locked_at ?? null,
    device_fingerprint: (profile as any).device_fingerprint ?? null,
    country: (profile as any).country ?? null,
    created_at: profile.created_at ?? null,
  };
}

async function readProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<AppProfile | null> {
  const extendedResult = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (!extendedResult.error) {
    return normalizeProfileRecord(extendedResult.data as AppProfile | null);
  }

  if (extendedResult.error.code !== '42703') {
    throw extendedResult.error;
  }

  const legacyResult = await supabase
    .from('profiles')
    .select(LEGACY_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (legacyResult.error) {
    throw legacyResult.error;
  }

  return normalizeProfileRecord(legacyResult.data as AppProfile | null);
}

async function resolveReferrerId(
  supabase: SupabaseClient,
  userId: string,
  referralCode?: string | null
) {
  const normalizedCode = normalizeReferralCode(referralCode);

  if (!normalizedCode) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_referrer_by_code', { code: normalizedCode });

  if (error || !data || data.length === 0) {
    // Direct lookup fallback
    const { data: directData } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', normalizedCode)
      .maybeSingle();
    return directData && directData.id !== userId ? directData.id : null;
  }

  const referrer = data[0];
  return referrer.id !== userId ? referrer.id : null;
}

function getActiveClient(supabase: SupabaseClient): SupabaseClient {
  try {
    return createAdminClient();
  } catch {
    return supabase;
  }
}

/**
 * Upserts a profile row for the given user (idempotent).
 * Works correctly regardless of whether the DB trigger already created the row.
 */
export async function bootstrapProfileForUser(
  supabase: SupabaseClient,
  user: User,
  referralCode?: string | null,
  deviceFingerprint?: string | null,
  metadata?: {
    ip?: string | null;
    userAgent?: string | null;
    country?: string | null;
    location?: string | null;
  }
) {
  const dbClient = getActiveClient(supabase);
  const normalizedEmail = normalizeEmail(user.email);

  // Read existing profile first to avoid overwriting database values like wallet_balance or role
  let existingProfile: AppProfile | null = null;
  try {
    existingProfile = await readProfile(dbClient, user.id);
  } catch {
    // Fallback to user client if admin read failed
    try {
      existingProfile = await readProfile(supabase, user.id);
    } catch {
      existingProfile = null;
    }
  }

  // Support both email/password sign-ups and OAuth with instant heuristic first-name extraction
  let displayName = existingProfile?.display_name?.trim();
  const rawEmailPrefix = normalizedEmail.split('@')[0];

  // If display_name is empty, contains email syntax, or is raw messy concatenated email string
  if (!displayName || displayName.includes('@') || displayName.toLowerCase() === rawEmailPrefix.toLowerCase()) {
    const rawMetadataName = user.user_metadata?.display_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      user.user_metadata?.name?.trim();

    displayName = heuristicExtractFirstName(rawMetadataName || user.email || '') || 'User';
  }

  const role = (existingProfile?.role === 'admin' || isAdminIdentity({
    id: user.id,
    email: normalizedEmail,
  }))
    ? 'admin'
    : 'customer';

  const pendingReferralCode =
    normalizeReferralCode(referralCode) ||
    normalizeReferralCode(user.user_metadata?.pending_referral_code);

  const referredBy = existingProfile?.referred_by ?? null;

  // Attempt an UPSERT — safe to call even if the trigger already created the row.
  const upsertData: any = {
    id: user.id,
    email: normalizedEmail || null,
    display_name: displayName,
    role,
    wallet_balance: existingProfile?.wallet_balance ?? 0,
    referral_code: existingProfile?.referral_code || buildReferralCode(displayName, user.id),
    referred_by: referredBy,
  };
  
  if (deviceFingerprint || existingProfile?.device_fingerprint) {
    upsertData.device_fingerprint = deviceFingerprint || existingProfile?.device_fingerprint;
  }

  if ((metadata?.country || metadata?.location) && !existingProfile?.country) {
    upsertData.country = metadata.country || metadata.location;
  }

  let profile: AppProfile | null = null;

  try {
    const upsertResult = await dbClient
      .from('profiles')
      .upsert(upsertData, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select(PROFILE_COLUMNS)
      .maybeSingle();

    if (!upsertResult.error && upsertResult.data) {
      profile = normalizeProfileRecord(upsertResult.data as AppProfile);
    }
  } catch (upsertError) {
    console.warn('[Bootstrap] Upsert profile notice:', upsertError);
  }

  if (!profile) {
    try {
      profile = await readProfile(dbClient, user.id);
    } catch {
      profile = null;
    }
  }

  if (!profile) {
    // Ultimate fallback to guarantee user can proceed
    profile = {
      id: user.id,
      email: normalizedEmail || null,
      display_name: displayName || 'User',
      role,
      wallet_balance: existingProfile?.wallet_balance ?? 0,
      referral_code: buildReferralCode(displayName, user.id),
      referred_by: referredBy,
      created_at: new Date().toISOString(),
    };
  }

  // Trigger Smart Registration Referral processing if a pending code was attached
  if (
    pendingReferralCode &&
    !profile.referred_by &&
    !profile.referral_applied_code
  ) {
    try {
      await processRegistrationReferral(user.id, pendingReferralCode, {
        ip: metadata?.ip,
        userAgent: metadata?.userAgent,
        deviceFingerprint: deviceFingerprint || profile.device_fingerprint,
      });

      const updatedProfile = await readProfile(supabase, user.id);
      if (updatedProfile) {
        return {
          profile: updatedProfile,
          redirectTo: getDashboardPath({
            id: user.id,
            email: normalizedEmail,
            role: updatedProfile.role,
          }),
        };
      }
    } catch (refError) {
      console.warn('[Bootstrap] Smart referral processing notice:', refError);
    }
  }

  return {
    profile,
    redirectTo: getDashboardPath({
      id: user.id,
      email: normalizedEmail,
      role: profile.role,
    }),
  };
}
