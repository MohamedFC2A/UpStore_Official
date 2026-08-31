// Edge-compatible security utilities

/**
 * Generates a HMAC-SHA256 fingerprint of the user's IP and User-Agent
 * using Web Crypto API, which is compatible with Next.js Edge Runtime.
 */
export async function generateDeviceFingerprint(ip: string, userAgent: string): Promise<string> {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-key-12345';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(`${ip}-${userAgent}`);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  
  // Convert ArrayBuffer to Hex String
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
