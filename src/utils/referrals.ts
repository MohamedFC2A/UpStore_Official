import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeReferralCode } from '@/utils/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient as createServerClient } from '@/utils/supabase/server';
import {
  detectReferralFraud,
  calculateMilestoneReward,
  type ReferralFraudCheckParams,
} from './referralSecurity';
import { sendTelegramNotification, escapeHtml } from './telegram';

export const REFERRAL_REWARD_PER_BATCH = 1.00; // $1.00 USD
export const REFERRAL_BATCH_SIZE = 3; // 3 verified friends

const REFERRAL_PROFILE_COLUMNS =
  'id, display_name, email, referral_code, referred_by, referral_applied_code, referral_locked_at, device_fingerprint, wallet_balance';
const LEGACY_REFERRAL_PROFILE_COLUMNS =
  'id, display_name, email, referral_code, referred_by, device_fingerprint, wallet_balance';

export interface ReferralLookupResult {
  id: string;
  referral_code: string;
  display_name: string | null;
  email: string | null;
  device_fingerprint?: string | null;
  referred_by?: string | null;
  wallet_balance?: number | null;
}

export interface ReferralProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  referral_code: string | null;
  referred_by: string | null;
  referral_applied_code: string | null;
  referral_locked_at: string | null;
  device_fingerprint: string | null;
  wallet_balance: number;
}

function normalizeReferralProfile(data: Record<string, unknown> | null | undefined): ReferralProfile | null {
  if (!data || typeof data.id !== 'string') {
    return null;
  }

  return {
    id: data.id,
    display_name: typeof data.display_name === 'string' ? data.display_name : null,
    email: typeof data.email === 'string' ? data.email : null,
    referral_code: typeof data.referral_code === 'string' ? data.referral_code : null,
    referred_by: typeof data.referred_by === 'string' ? data.referred_by : null,
    referral_applied_code: typeof data.referral_applied_code === 'string' ? data.referral_applied_code : null,
    referral_locked_at: typeof data.referral_locked_at === 'string' ? data.referral_locked_at : null,
    device_fingerprint: typeof data.device_fingerprint === 'string' ? data.device_fingerprint : null,
    wallet_balance: Number(data.wallet_balance || 0),
  };
}

export async function readReferralProfile(
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<ReferralProfile | null> {
  const extendedResult = await supabase
    .from('profiles')
    .select(REFERRAL_PROFILE_COLUMNS)
    .eq('id', userId)
    .single();

  if (!extendedResult.error && extendedResult.data) {
    return normalizeReferralProfile(extendedResult.data as Record<string, unknown>);
  }

  if (extendedResult.error?.code !== '42703') {
    return null;
  }

  const legacyResult = await supabase
    .from('profiles')
    .select(LEGACY_REFERRAL_PROFILE_COLUMNS)
    .eq('id', userId)
    .single();

  if (legacyResult.error || !legacyResult.data) {
    return null;
  }

  return normalizeReferralProfile(legacyResult.data as Record<string, unknown>);
}

export async function getReferrerByCode(
  code?: string | null,
  supabaseClient?: SupabaseClient<any, any, any>
): Promise<ReferralLookupResult | null> {
  const normalizedCode = normalizeReferralCode(code);
  if (!normalizedCode) {
    return null;
  }

  const supabase = supabaseClient || await createServerClient();
  const { data, error } = await supabase.rpc('get_referrer_by_code', { code: normalizedCode });

  if (error || !data || data.length === 0) {
    // Fallback direct query if RPC is missing
    const { data: directData } = await supabase
      .from('profiles')
      .select('id, referral_code, display_name, email, device_fingerprint, referred_by, wallet_balance')
      .eq('referral_code', normalizedCode)
      .maybeSingle();

    if (directData) {
      return directData as ReferralLookupResult;
    }
    return null;
  }

  return data[0] as ReferralLookupResult;
}

/**
 * Evaluates and credits all unlocked 3-friends milestone rewards for a referrer.
 * Automatically adds $1.00 to wallet_balance for each complete batch of 3 verified friends.
 * Batched, concurrent, idempotent & race-condition safe.
 */
export async function evaluateAndCreditMilestones(
  referrerId: string,
  supabaseAdminClient?: SupabaseClient<any, any, any>
) {
  const supabaseAdmin = supabaseAdminClient || createAdminClient();

  // 1. Fetch referrer's current profile
  const referrer = await readReferralProfile(supabaseAdmin, referrerId);
  if (!referrer) {
    return { credited: false, batchesCredited: 0 };
  }

  // 2. Count total verified referred users
  let verifiedCount = 0;

  // Try counting from referral_logs first
  const { data: logs, error: logsError } = await supabaseAdmin
    .from('referral_logs')
    .select('id, status')
    .eq('referrer_id', referrerId)
    .in('status', ['verified', 'rewarded']);

  if (!logsError && logs) {
    verifiedCount = logs.length;
  } else {
    // Fallback count from profiles table directly
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', referrerId);

    if (!countError && typeof count === 'number') {
      verifiedCount = count;
    }
  }

  if (verifiedCount === 0) {
    return { credited: false, batchesCredited: 0, verifiedCount: 0 };
  }

  // 3. Calculate reward progression (Every 3 Friends = $1.00 USD)
  const milestoneData = calculateMilestoneReward(verifiedCount);
  const targetTotalBatches = milestoneData.totalBatchesEarned; // e.g. 1 for 3 friends, 2 for 6 friends, etc.

  if (targetTotalBatches <= 0) {
    return { credited: false, batchesCredited: 0, verifiedCount, milestoneData };
  }

  // 4. Check already rewarded batches from transactions ledger
  const { data: existingCredits, error: txError } = await supabaseAdmin
    .from('transactions')
    .select('id, reference_id')
    .eq('user_id', referrerId)
    .eq('type', 'credit_referral');

  const creditedBatches = new Set<number>();
  if (!txError && existingCredits) {
    for (const tx of existingCredits) {
      if (tx.reference_id && typeof tx.reference_id === 'string' && tx.reference_id.startsWith('ref_milestone_batch_')) {
        const batchNum = parseInt(tx.reference_id.replace('ref_milestone_batch_', ''), 10);
        if (!isNaN(batchNum)) creditedBatches.add(batchNum);
      }
    }
  }

  // 5. Identify uncredited batches
  const uncreditedBatches: number[] = [];
  for (let batchIndex = 1; batchIndex <= targetTotalBatches; batchIndex++) {
    if (!creditedBatches.has(batchIndex)) {
      uncreditedBatches.push(batchIndex);
    }
  }

  if (uncreditedBatches.length === 0) {
    return {
      credited: false,
      batchesCredited: 0,
      verifiedCount,
      newBalance: referrer.wallet_balance,
      milestoneData,
    };
  }

  // 6. Perform batched balance increment & concurrent database inserts (O(1) roundtrips)
  const totalRewardAmount = uncreditedBatches.length * REFERRAL_REWARD_PER_BATCH;
  let updatedWalletBalance = referrer.wallet_balance;

  const { error: balanceError } = await supabaseAdmin.rpc('increment_wallet_balance', {
    p_user_id: referrerId,
    amount: totalRewardAmount,
  });

  if (balanceError) {
    // Fallback direct atomic read & update
    const { data: freshProfile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', referrerId)
      .single();

    const currentBal = Number((freshProfile as Record<string, unknown>)?.wallet_balance || 0);
    updatedWalletBalance = currentBal + totalRewardAmount;

    await supabaseAdmin
      .from('profiles')
      .update({ wallet_balance: updatedWalletBalance })
      .eq('id', referrerId);
  } else {
    updatedWalletBalance += totalRewardAmount;
  }

  // Build batch payload rows
  const newTransactions = uncreditedBatches.map((batchIndex) => {
    const totalFriendsCount = batchIndex * REFERRAL_BATCH_SIZE;
    return {
      user_id: referrerId,
      amount: REFERRAL_REWARD_PER_BATCH,
      type: 'credit_referral',
      label: `مكافأة دعوة ${totalFriendsCount} أصدقاء (دفعة #${batchIndex})`,
      reference_id: `ref_milestone_batch_${batchIndex}`,
    };
  });

  const newNotifications = uncreditedBatches.map((batchIndex) => {
    const totalFriendsCount = batchIndex * REFERRAL_BATCH_SIZE;
    return {
      user_id: referrerId,
      title: 'مبروك! تم إيداع $1.00 كاش في محفظتك',
      message: `وصل عدد أصدقائك المسجلين إلى ${totalFriendsCount} أفراد. تم إيداع 1.00$ تلقائياً في رصيد محفظتك لتشتري بها أي اشتراك رقمي!`,
      type: 'referral_milestone',
    };
  });

  // Execute transactions and notifications insertion concurrently in parallel
  await Promise.all([
    supabaseAdmin.from('transactions').insert(newTransactions),
    supabaseAdmin.from('notifications').insert(newNotifications),
  ]);

  // Dispatch single consolidated Telegram alert
  try {
    const telegramMsg = `
<b>مكافأة إحالة ذكية تم إيداعها!</b>
━━━━━━━━━━━━━━━━━━
<b>المستخدم:</b> <code>${escapeHtml(referrer.display_name || referrer.email || referrer.id)}</code>
<b>إجمالي المبلغ المودع:</b> <b>$${totalRewardAmount.toFixed(2)} USD</b>
<b>الدفعات المعتمدة:</b> ${uncreditedBatches.length} دفعة (${uncreditedBatches.map(b => `#${b}`).join(', ')})
<b>الرصيد الجديد بالمحفظة:</b> $${updatedWalletBalance.toFixed(2)}
    `.trim();
    await sendTelegramNotification(telegramMsg);
  } catch {
    // ignore telegram delivery errors
  }

  return {
    credited: true,
    batchesCredited: uncreditedBatches.length,
    verifiedCount,
    newBalance: updatedWalletBalance,
    milestoneData,
  };
}

/**
 * Processes a smart registration referral event:
 * 1. Runs anti-fraud checks (disposable email, device fingerprint, self-referral, circular loops).
 * 2. Links the referral relationship in database.
 * 3. Sends instant notification to referrer about new friend.
 * 4. Checks and unlocks $1.00 automated milestone deposits.
 */
export async function processRegistrationReferral(
  candidateUserId: string,
  referralCode?: string | null,
  metadata?: {
    ip?: string | null;
    userAgent?: string | null;
    deviceFingerprint?: string | null;
  }
) {
  const normalizedCode = normalizeReferralCode(referralCode);
  if (!normalizedCode) {
    return { applied: false, reason: 'يرجى إدخال كود دعوة صالح.' };
  }

  const supabaseAdmin = createAdminClient();

  // 1. Fetch Candidate Profile
  const candidateProfile = await readReferralProfile(supabaseAdmin, candidateUserId);
  if (!candidateProfile) {
    return { applied: false, reason: 'حساب المستخدم غير موجود.' };
  }

  // Self-referral by own referral code check
  if (
    candidateProfile.referral_code &&
    candidateProfile.referral_code.trim().toUpperCase() === normalizedCode
  ) {
    return { applied: false, reason: 'لا يمكنك استخدام كود الدعوة الخاص بك.' };
  }

  // If already referred, skip
  if (candidateProfile.referred_by || candidateProfile.referral_applied_code) {
    return {
      applied: false,
      alreadyLocked: true,
      reason: 'تم ربط كود دعوة بحسابك مسبقاً ولا يمكن تغييره.',
      profile: candidateProfile,
    };
  }

  // 2. Fetch Referrer Profile
  const referrer = await getReferrerByCode(normalizedCode, supabaseAdmin);
  if (!referrer) {
    return { applied: false, reason: 'كود الدعوة المدخل غير موجود أو غير صحيح.' };
  }

  // Strict check: candidate cannot refer themselves
  if (referrer.id === candidateUserId) {
    return { applied: false, reason: 'لا يمكنك استخدام كود الدعوة الخاص بك.' };
  }

  // 3. Fetch referrer full details for fraud evaluation
  const referrerProfile = await readReferralProfile(supabaseAdmin, referrer.id);

  // 4. Check for 365-Day Single Referral Limit per Device
  const effectiveDeviceFingerprint = metadata?.deviceFingerprint || candidateProfile.device_fingerprint;
  let hasUsedReferralOnDeviceWithinYear = false;
  let deviceRemainingDays: number | null = null;

  if (effectiveDeviceFingerprint) {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    // Check referral_logs first
    try {
      const { data: recentDeviceLogs } = await supabaseAdmin
        .from('referral_logs')
        .select('id, referred_user_id, created_at')
        .eq('device_fingerprint', effectiveDeviceFingerprint)
        .in('status', ['verified', 'rewarded'])
        .gte('created_at', oneYearAgo)
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentDeviceLogs && recentDeviceLogs.length > 0) {
        const isOtherUser = recentDeviceLogs.some((l: any) => l.referred_user_id !== candidateUserId);
        if (isOtherUser) {
          hasUsedReferralOnDeviceWithinYear = true;
          const logDate = recentDeviceLogs[0].created_at;
          if (logDate) {
            const elapsed = Math.floor((Date.now() - new Date(logDate).getTime()) / (1000 * 60 * 60 * 24));
            deviceRemainingDays = Math.max(1, 365 - elapsed);
          }
        }
      }
    } catch {
      // ignore
    }

    if (!hasUsedReferralOnDeviceWithinYear) {
      try {
        const { data: recentProfileClaims } = await supabaseAdmin
          .from('profiles')
          .select('id, created_at')
          .eq('device_fingerprint', effectiveDeviceFingerprint)
          .neq('id', candidateUserId)
          .not('referred_by', 'is', null)
          .gte('created_at', oneYearAgo)
          .order('created_at', { ascending: false })
          .limit(1);

        if (recentProfileClaims && recentProfileClaims.length > 0) {
          hasUsedReferralOnDeviceWithinYear = true;
          const claimDate = recentProfileClaims[0].created_at;
          if (claimDate) {
            const elapsed = Math.floor((Date.now() - new Date(claimDate).getTime()) / (1000 * 60 * 60 * 24));
            deviceRemainingDays = Math.max(1, 365 - elapsed);
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // Multi-Vector Fraud Check
  const fraudParams: ReferralFraudCheckParams = {
    candidateUserId,
    candidateEmail: candidateProfile.email,
    candidateDeviceFingerprint: effectiveDeviceFingerprint,
    candidateIp: metadata?.ip,
    referrerId: referrer.id,
    referrerEmail: referrerProfile?.email || referrer.email,
    referrerDeviceFingerprint: referrerProfile?.device_fingerprint,
    referrerReferredBy: referrerProfile?.referred_by,
    hasUsedReferralOnDeviceWithinYear,
  };

  const fraudResult = detectReferralFraud(fraudParams);

  if (fraudResult.status === 'rejected') {
    let rejectionArabicReason = 'تم رفض كود الدعوة وفقاً لسياسة الأمان ومكافحة الاحتيال.';
    if (fraudResult.fraudReason?.includes('Self-referral')) {
      rejectionArabicReason = 'لا يمكنك استخدام كود الدعوة الخاص بك.';
    } else if (fraudResult.fraudReason?.includes('365 days')) {
      const daysLeft = deviceRemainingDays || 365;
      rejectionArabicReason = `هذا الجهاز مرتبط بكود إحالة نشط بالفعل (عداد الأمان السنوي: متبقي ${daysLeft} يوماً لإعادة تفعيل الجهاز).`;
    } else if (fraudResult.fraudReason?.includes('same physical device')) {
      rejectionArabicReason = 'لا يمكن استخدام كود إحالة لحسابك من نفس الجهاز.';
    } else if (fraudResult.fraudReason?.includes('identical email')) {
      rejectionArabicReason = 'لا يمكن استخدام نفس البريد الإلكتروني في الإحالة.';
    }

    // Log rejected fraud attempt
    try {
      await supabaseAdmin.from('referral_logs').insert({
        referrer_id: referrer.id,
        referred_user_id: candidateUserId,
        referral_code: normalizedCode,
        status: 'flagged_fraud',
        ip_address: metadata?.ip || null,
        device_fingerprint: metadata?.deviceFingerprint || null,
        fraud_score: fraudResult.fraudScore,
        fraud_reason: fraudResult.fraudReason,
      });
    } catch {
      // ignore
    }

    return {
      applied: false,
      fraudBlocked: true,
      reason: rejectionArabicReason,
    };
  }

  const isVerified = fraudResult.status === 'verified';
  const logStatus = isVerified ? 'verified' : 'flagged_fraud';

  // 4. Update Candidate Profile
  const updatePayload: Record<string, any> = {
    referred_by: referrer.id,
    referral_applied_code: referrer.referral_code,
    referral_locked_at: new Date().toISOString(),
  };

  if (metadata?.deviceFingerprint && !candidateProfile.device_fingerprint) {
    updatePayload.device_fingerprint = metadata.deviceFingerprint;
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(updatePayload)
    .eq('id', candidateUserId)
    .is('referred_by', null);

  if (updateError) {
    console.error('[processRegistrationReferral] Error updating profile:', updateError);
    return { applied: false, reason: updateError.message };
  }

  // 5. Insert Log
  try {
    await supabaseAdmin.from('referral_logs').insert({
      referrer_id: referrer.id,
      referred_user_id: candidateUserId,
      referral_code: normalizedCode,
      status: logStatus,
      ip_address: metadata?.ip || null,
      device_fingerprint: metadata?.deviceFingerprint || null,
      fraud_score: fraudResult.fraudScore,
      fraud_reason: fraudResult.fraudReason,
    });
  } catch {
    // Ignore if table not yet created
  }

  // 6. Calculate verified progress and send instant notification to Referrer
  const { count: currentTotalVerified } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', referrer.id);

  const safeCount = currentTotalVerified || 1;
  const milestoneData = calculateMilestoneReward(safeCount);
  const friendName = candidateProfile.display_name || candidateProfile.email?.split('@')[0] || 'صديق جديد';

  await supabaseAdmin.from('notifications').insert({
    user_id: referrer.id,
    title: 'صديق جديد انضم عبر كودك!',
    message: `قام ${friendName} بالتسجيل بنجاح عبر كودك. لديك الآن ${safeCount} أصدقاء مسجلين - باقي ${milestoneData.invitesNeededForNextDollar} للحصول على 1.00$ تلقائياً في محفظتك!`,
    type: 'referral',
  });

  // 7. Trigger Automated Milestone Credit (e.g. at 3, 6, 9, 12 friends)
  const milestoneResult = await evaluateAndCreditMilestones(referrer.id, supabaseAdmin);

  return {
    applied: true,
    alreadyLocked: false,
    referrer,
    milestoneResult,
  };
}

/**
 * Claims a referral code for an authenticated user post-registration.
 */
export async function claimReferralCodeForUser(
  userId: string,
  referralCode?: string | null,
  _supabaseClient?: SupabaseClient<any, any, any>,
  metadata?: { ip?: string | null; deviceFingerprint?: string | null }
) {
  return processRegistrationReferral(userId, referralCode, metadata);
}

/**
 * Returns full real-time referral dashboard status for a user.
 */
export async function getReferralStatusForUser(
  userId: string,
  supabaseClient?: SupabaseClient<any, any, any>
) {
  const supabaseAdmin = supabaseClient || createAdminClient();

  const profile = await readReferralProfile(supabaseAdmin, userId);
  if (!profile) {
    throw new Error('Profile not found.');
  }

  // 1. Fetch referrer if this user was referred by someone
  const referrerPromise = profile.referred_by
    ? supabaseAdmin
        .from('profiles')
        .select('id, display_name, email, referral_code')
        .eq('id', profile.referred_by)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  // 2. Fetch all invited users
  const invitedPromise = supabaseAdmin
    .from('profiles')
    .select('id, email, display_name, created_at, wallet_balance')
    .eq('referred_by', userId)
    .order('created_at', { ascending: false });

  // 3. Fetch all rewarded transactions for this user
  const transactionsPromise = supabaseAdmin
    .from('transactions')
    .select('id, amount, reference_id, created_at')
    .eq('user_id', userId)
    .eq('type', 'credit_referral')
    .order('created_at', { ascending: false });

  const [referrerResult, invitedResult, transactionsResult] = await Promise.all([
    referrerPromise,
    invitedPromise,
    transactionsPromise,
  ]);

  const rawInvited = invitedResult.data ?? [];
  const validReferralsCount = rawInvited.length;
  const milestoneData = calculateMilestoneReward(validReferralsCount);

  // Map invited users with privacy-preserving display
  const invitedUsers = rawInvited.map((invited: any, index: number) => {
    // Determine if this user contributed to an unlocked batch
    const isRewarded = (rawInvited.length - index) <= (milestoneData.totalBatchesEarned * REFERRAL_BATCH_SIZE);

    const emailStr = invited.email || '';
    const maskedEmail = emailStr.includes('@')
      ? `${emailStr.slice(0, 3)}***@${emailStr.split('@')[1]}`
      : 'User';

    return {
      id: invited.id,
      displayName: invited.display_name || maskedEmail,
      email: maskedEmail,
      createdAt: invited.created_at,
      status: isRewarded ? 'rewarded' : 'verified',
      isVerified: true,
    };
  });

  const totalRewardsPaid = (transactionsResult.data ?? []).reduce(
    (sum: number, tx: any) => sum + Number(tx.amount || 0),
    0
  );

  const appliedFriendCode = profile.referral_applied_code || referrerResult.data?.referral_code || null;

  return {
    profile: {
      ...profile,
      referral_applied_code: appliedFriendCode,
    },
    referrer: referrerResult.data,
    appliedFriendCode,
    isReferralLocked: Boolean(appliedFriendCode || profile.referred_by || profile.referral_locked_at),
    invitedUsers,
    validReferralsCount,
    totalInvitedCount: validReferralsCount,
    totalEarnedCash: totalRewardsPaid || milestoneData.totalEarnedCash,
    currentBatchFriends: milestoneData.currentBatchFriends,
    invitesNeededForNextDollar: milestoneData.invitesNeededForNextDollar,
    totalBatchesEarned: milestoneData.totalBatchesEarned,
    nextMilestone: milestoneData.nextMilestone,
    milestoneProgressPercent: milestoneData.milestoneProgressPercent,
    rewardPerBatch: REFERRAL_REWARD_PER_BATCH,
    batchSize: REFERRAL_BATCH_SIZE,
  };
}

/**
 * Legacy hook for backwards compatibility with checkout fulfillment.
 */
export async function processReferralReward(buyerUserId: string) {
  // In the new system, rewards are granted on smart registration.
  // We can re-check milestone status for the referrer in case of any pending credit.
  const supabaseAdmin = createAdminClient();
  const { data: buyer } = await supabaseAdmin
    .from('profiles')
    .select('referred_by')
    .eq('id', buyerUserId)
    .maybeSingle();

  if (buyer?.referred_by) {
    return evaluateAndCreditMilestones(buyer.referred_by, supabaseAdmin);
  }

  return { credited: false };
}
