'use client';

/**
 * Smart Biometric Authentication Utility (WebAuthn / Passkeys / FaceID / TouchID / Android Biometrics)
 * Designed for all mobile devices in the world (Android, iOS, macOS, Windows Hello)
 */

const PASSKEY_STORAGE_KEY = 'upstore_biometric_key_id';

export interface BiometricDeviceInfo {
  type: 'apple' | 'android' | 'windows' | 'generic';
  nameAr: string;
  nameEn: string;
  subAr: string;
  subEn: string;
  iconType: 'face' | 'fingerprint' | 'shield';
  isMobile: boolean;
}

export function detectBiometricDevice(): BiometricDeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      type: 'generic',
      nameAr: 'البصمة الذكية المعتمدة',
      nameEn: 'Smart Device Biometrics',
      subAr: 'تأكيد الحماية البيومترية لجهازك',
      subEn: 'Verify device security',
      iconType: 'fingerprint',
      isMobile: false,
    };
  }

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isIOS;
  const isWindows = /Windows/i.test(ua);

  if (isIOS) {
    return {
      type: 'apple',
      nameAr: 'بصمة الوجه / الإصبع (Face ID & Touch ID)',
      nameEn: 'Apple Face ID & Touch ID',
      subAr: 'المصادقة الآمنة عبر أجهزة Apple',
      subEn: 'Secure Apple Biometric Sensor',
      iconType: 'face',
      isMobile: true,
    };
  }

  if (isAndroid) {
    return {
      type: 'android',
      nameAr: 'بصمة الإصبع والوجه (Android Biometrics)',
      nameEn: 'Android Smart Biometrics',
      subAr: 'مستشعر البصمة والحماية المباشر لأجهزة Android',
      subEn: 'Hardware-level biometric verification',
      iconType: 'fingerprint',
      isMobile: true,
    };
  }

  if (isMac) {
    return {
      type: 'apple',
      nameAr: 'بصمة الإصبع (Touch ID for Mac)',
      nameEn: 'Mac Touch ID',
      subAr: 'مستشعر الحماية لأجهزة Mac',
      subEn: 'Mac hardware biometric sensor',
      iconType: 'fingerprint',
      isMobile: false,
    };
  }

  if (isWindows) {
    return {
      type: 'windows',
      nameAr: 'بصمة الوجه / الإصبع (Windows Hello)',
      nameEn: 'Windows Hello Biometrics',
      subAr: 'حماية النظام لأجهزة Windows',
      subEn: 'Windows device security sensor',
      iconType: 'face',
      isMobile: false,
    };
  }

  return {
    type: 'generic',
    nameAr: 'البصمة الذكية ومفتاح الأمان (Passkey)',
    nameEn: 'Smart Passkey & Biometrics',
    subAr: 'تأكيد الحماية البيومترية المعتمدة',
    subEn: 'Universal secure platform check',
    iconType: 'fingerprint',
    isMobile: isAndroid || isIOS,
  };
}

export async function isPlatformBiometricsAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!isAvailable;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute native WebAuthn Platform Biometric Challenge
 */
export async function executeWebAuthnChallenge(customChallengeData?: string): Promise<{ success: boolean; cancelled?: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: true };
  }

  if (!window.PublicKeyCredential) {
    return { success: true };
  }

  try {
    const existingKeyBase64 = localStorage.getItem(PASSKEY_STORAGE_KEY);
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    if (customChallengeData) {
      const enc = new TextEncoder().encode(customChallengeData);
      for (let i = 0; i < Math.min(challenge.length, enc.length); i++) {
        challenge[i] = enc[i];
      }
    }

    if (!existingKeyBase64) {
      // First-time credential creation on device
      const hostname = window.location.hostname || 'localhost';
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'UpStore Arabi Pay Secure',
            id: hostname === 'localhost' ? undefined : hostname,
          },
          user: {
            id: new Uint8Array(16),
            name: 'UpStore Arabi Pay User',
            displayName: 'UpStore Verified Customer',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 }, // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            userVerification: 'required',
            authenticatorAttachment: 'platform',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential;

      if (credential && credential.rawId) {
        const rawIdArray = Array.from(new Uint8Array(credential.rawId));
        const base64Id = btoa(String.fromCharCode(...rawIdArray));
        localStorage.setItem(PASSKEY_STORAGE_KEY, base64Id);
        return { success: true };
      }
      return { success: true };
    } else {
      // Existing credential check
      const binaryString = atob(existingKeyBase64);
      const rawId = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        rawId[i] = binaryString.charCodeAt(i);
      }

      await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              type: 'public-key',
              id: rawId,
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      });

      return { success: true };
    }
  } catch (error: any) {
    const name = error?.name || '';
    if (name === 'NotAllowedError' || name === 'AbortError') {
      return { success: false, cancelled: true, error: 'User cancelled biometric prompt' };
    }
    console.warn('[Smart Biometrics API Notice]:', error);
    // If browser lacks platform authenticator hardware, allow graceful continuation
    return { success: true };
  }
}

/**
 * General verifyBiometrics (backward compatibility)
 */
export async function verifyBiometrics(force: boolean = false): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  if (!force) {
    const isEnabled = localStorage.getItem('upstore_biometrics_enabled');
    if (isEnabled !== 'true') {
      return true;
    }
  }

  const result = await executeWebAuthnChallenge();
  return result.success;
}
