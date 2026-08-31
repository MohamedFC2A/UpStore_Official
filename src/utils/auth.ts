export const REFERRAL_COOKIE_NAME = 'upstore_referral';

export interface AppProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string | null;
  wallet_balance?: number | null;
  referral_code?: string | null;
  referred_by?: string | null;
  referral_applied_code?: string | null;
  referral_locked_at?: string | null;
  device_fingerprint?: string | null;
  country?: string | null;
  created_at?: string | null;
}

export interface DeliveryPayload {
  email: string;
  pass: string;
  profile: string;
  pin: string;
  instructions: string;
  instructionsAr: string;
}

export interface AuthBootstrapResult {
  profile: AppProfile;
  redirectTo: string;
}

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? '';
}

export function normalizeReferralCode(code?: string | null) {
  if (!code) return null;
  let clean = code.trim();
  if (clean.includes('/ref/')) {
    clean = clean.split('/ref/').pop() || clean;
  } else if (clean.toLowerCase().startsWith('ref/')) {
    clean = clean.slice(4);
  }
  clean = clean.trim().toUpperCase();
  return clean || null;
}

export const ADMIN_USER_IDS = new Set([
  '241bdec0-e236-4be4-bfc1-5eb50c344e27',
]);

export const ADMIN_EMAILS = new Set([
  'uversionstore@gmail.com',
  'mohamedahmedmatany@gmail.com',
]);

export function isAdminIdentity(input: {
  id?: string | null;
  email?: string | null;
  role?: string | null;
}) {
  if (input.role === 'admin') {
    return true;
  }

  if (input.id && ADMIN_USER_IDS.has(input.id)) {
    return true;
  }

  return ADMIN_EMAILS.has(normalizeEmail(input.email));
}

export function getDashboardPath(input: {
  id?: string | null;
  email?: string | null;
  role?: string | null;
}) {
  return isAdminIdentity(input) ? '/admin' : '/';
}

export function getSafeRedirectTarget(
  nextPath: string | null | undefined,
  fallbackPath: string = '/'
) {
  if (
    nextPath &&
    typeof nextPath === 'string' &&
    nextPath.startsWith('/') &&
    !nextPath.startsWith('//') &&
    !nextPath.startsWith('/\\') &&
    !nextPath.startsWith('/auth/login') &&
    !nextPath.startsWith('/auth/register') &&
    !nextPath.startsWith('/auth/forgot') &&
    !nextPath.startsWith('/auth/signout')
  ) {
    return nextPath;
  }

  return fallbackPath;
}

export function buildReferralCode(seed: string, userId: string) {
  const prefix = seed
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8) || 'USER';
  const suffix = userId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

export function parseDeliveryPayload(key: string | null) {
  if (!key) {
    return null;
  }

  const trimmed = key.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.type === 'zelenka_account') {
        const data = parsed.data || {};
        return {
          email: data.login || data.phone || data.email || 'N/A',
          pass: data.password || 'N/A',
          profile: data.user_id ? String(data.user_id) : 'N/A',
          pin: data.dc_id ? String(data.dc_id) : 'N/A',
          instructions: data.auth_key ? `Auth Key: ${data.auth_key}` : 'N/A',
          instructionsAr: data.auth_key ? `مفتاح التفويض: ${data.auth_key}` : 'N/A',
          zelenkaData: data
        } as any;
      }

      if (parsed && (parsed.email || parsed.login || parsed.pass || parsed.password)) {
        return {
          email: parsed.email || parsed.login || 'N/A',
          pass: parsed.pass || parsed.password || 'N/A',
          profile: parsed.profile || 'N/A',
          pin: parsed.pin || 'N/A',
          instructions: parsed.instructions || 'N/A',
          instructionsAr: parsed.instructionsAr || 'N/A',
        } satisfies DeliveryPayload;
      }
    } catch (e) {
      // fallback
    }
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return {
      email: key,
      pass: 'N/A',
      profile: 'N/A',
      pin: 'N/A',
      instructions: 'Import the cookies/session data above into your application to log in.',
      instructionsAr: 'قم باستيراد ملفات تعريف الارتباط (Cookies) أو بيانات الجلسة أعلاه لتسجيل الدخول.'
    } satisfies DeliveryPayload;
  }

  // Multi-line credential check (Email on line 1, Password on line 2)
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    let email = '';
    let pass = '';
    let profile = 'N/A';
    let pin = 'N/A';

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith('email:') || lower.startsWith('ايميل:') || lower.startsWith('بريد:') || lower.startsWith('البريد:') || lower.startsWith('الإيميل:') || lower.startsWith('user:') || lower.startsWith('login:') || lower.startsWith('المستخدم:')) {
        email = line.split(':')[1]?.trim() || '';
      } else if (lower.startsWith('pass:') || lower.startsWith('password:') || lower.startsWith('باسورد:') || lower.startsWith('كلمة المرور:') || lower.startsWith('الباسورد:') || lower.startsWith('الرمز:')) {
        pass = line.split(':')[1]?.trim() || '';
      } else if (lower.startsWith('pin:') || lower.startsWith('رمز:') || lower.startsWith('pin code:')) {
        pin = line.split(':')[1]?.trim() || 'N/A';
      } else if (lower.startsWith('profile:') || lower.startsWith('ملف:') || lower.startsWith('بروفايل:')) {
        profile = line.split(':')[1]?.trim() || 'N/A';
      }
    }

    if (!email && !pass && lines.length >= 2) {
      email = lines[0];
      pass = lines[1];
      if (lines[2]) pin = lines[2];
    }

    if (email && pass && pass !== 'N/A') {
      return {
        email,
        pass,
        profile,
        pin,
        instructions: 'Login with your credentials. Enjoy your digital product!',
        instructionsAr: 'سجل الدخول ببياناتك المرفقة واستمتع بالمنتج الرقمي الخاص بك!',
      } satisfies DeliveryPayload;
    }
  }

  // Single-line colon-separated (email:password)
  const parts = key.split(':');

  if (parts.length >= 2) {
    return {
      email: parts[0].trim(),
      pass: parts[1].trim(),
      profile: parts[2]?.trim() || 'N/A',
      pin: parts[3]?.trim() || 'N/A',
      instructions:
        parts[4]?.trim() ||
        'Login with your credentials. Enjoy your digital product!',
      instructionsAr:
        parts[5]?.trim() ||
        'سجل الدخول ببياناتك المرفقة واستمتع بالمنتج الرقمي الخاص بك!',
    } satisfies DeliveryPayload;
  }

  return {
    email: key,
    pass: 'N/A',
    profile: 'N/A',
    pin: 'N/A',
    instructions: 'Use the license key above to activate your product.',
    instructionsAr: 'استخدم مفتاح الترخيص الموضح أعلاه لتنشيط منتجك.',
  } satisfies DeliveryPayload;
}
