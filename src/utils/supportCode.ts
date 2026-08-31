import crypto from 'crypto';

/**
 * Support Code generation, formatting, and validation utility
 * Generates a high-entropy, cryptographic, device/account-bound secret Support Code.
 * Format: UP-SEC-XXXX-YYYY-ZZZZ (e.g., UP-SEC-8924-K7M9-P2W4)
 */

const SUPPORT_SECRET_SALT = process.env.SUPPORT_SECRET_SALT || 'UPSTORE_SECURE_SUPPORT_SALT_2026_V1';

export function generateSupportCode(userId: string, options?: { deviceFingerprint?: string | null }): string {
  if (!userId) return 'UP-SEC-GUEST-0000-0000';
  
  const cleanId = userId.trim();
  const rawInput = `${cleanId}:${options?.deviceFingerprint || 'account'}:${SUPPORT_SECRET_SALT}`;
  const hash = crypto.createHash('sha256').update(rawInput).digest('hex').toUpperCase();

  const part1 = hash.slice(0, 4);
  const part2 = hash.slice(4, 8);
  const part3 = hash.slice(8, 12);

  return `UP-SEC-${part1}-${part2}-${part3}`;
}

export function extractSupportCode(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();

  // 1. Match full high-entropy code: UP-SEC-XXXX-YYYY-ZZZZ
  const matchFull = clean.match(/\bUP-SEC-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})\b/i);
  if (matchFull) {
    return matchFull[0].toUpperCase();
  }

  // 2. Match standard format: UP-XXXX-XXXX-XXXX or UP-XXXX-XXXX
  const matchChunked = clean.match(/\bUP-([A-Z0-9]{4}(?:-[A-Z0-9]{4}){1,3})\b/i);
  if (matchChunked) {
    return matchChunked[0].toUpperCase();
  }

  // 3. Match explicit prefix UP-XXXXXX (legacy or compact)
  const matchExplicit = clean.match(/\b(?:UP|SUP)-([A-Z0-9]{4,16})\b/i);
  if (matchExplicit) {
    return matchExplicit[0].toUpperCase();
  }

  // 4. Match labeled: كود الدعم: XXXXXX or PIN: XXXXXX
  const matchLabeled = clean.match(/(?:كود\s*الدعم|كود|code|دعم|support\s*pin|pin|secret)\s*[:#-]?\s*([A-Z0-9-]{4,20})\b/i);
  if (matchLabeled && matchLabeled[1]) {
    const raw = matchLabeled[1].toUpperCase().trim();
    return raw.startsWith('UP-') ? raw : `UP-SEC-${raw}`;
  }

  return null;
}
