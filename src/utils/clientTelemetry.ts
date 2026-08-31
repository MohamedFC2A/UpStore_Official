/**
 * clientTelemetry.ts — UpStore Comprehensive Client Device & Telemetry Intelligence
 * 100% Non-intrusive: Gathers deep device, OS, browser, GPU, screen, and network specs
 * without requiring ANY intrusive browser permissions or prompts.
 */

export interface ClientTelemetryData {
  deviceType: 'Mobile' | 'Tablet' | 'Desktop' | 'SmartTV' | 'Console' | 'Unknown';
  deviceModel: string;
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  isWebView: boolean;
  webViewType?: string;
  
  // Screen & Display
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  colorDepth: number;
  orientation: string;
  touchSupport: boolean;
  maxTouchPoints: number;

  // Hardware & Engine
  deviceMemoryGb?: number | string;
  cpuCores?: number;
  gpuVendor?: string;
  gpuRenderer?: string;

  // Network & Environment
  timezone: string;
  timezoneOffset: string;
  language: string;
  languages: string[];
  connectionType?: string;
  downlinkSpeed?: string;
  rttLatency?: string;
  saveDataMode?: boolean;
  batteryLevel?: string | number;
  isCharging?: boolean;

  // Device Identity & Deduplication
  deviceId?: string;
  hardwareFingerprint?: string;

  // Session & Origin
  referrer: string;
  landingUrl: string;
  userAgent: string;
  collectedAt: string;
  summaryFormatted: string;
}

/**
 * Extracts WebGL GPU Vendor and Renderer without triggering any prompts
 */
function getGpuInfo(): { vendor?: string; renderer?: string } {
  if (typeof window === 'undefined') return {};
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return {};

    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      return {
        vendor: vendor ? String(vendor).trim() : undefined,
        renderer: renderer ? String(renderer).trim() : undefined,
      };
    }
  } catch {
    // Canvas WebGL blocked or unsupported
  }
  return {};
}

/**
 * Parses accurate Samsung model numbers into friendly commercial names
 */
function decodeSamsungModel(code: string): string {
  const c = code.toUpperCase();
  if (c.includes('S928')) return 'Galaxy S24 Ultra';
  if (c.includes('S926')) return 'Galaxy S24+';
  if (c.includes('S921')) return 'Galaxy S24';
  if (c.includes('S918')) return 'Galaxy S23 Ultra';
  if (c.includes('S916')) return 'Galaxy S23+';
  if (c.includes('S911')) return 'Galaxy S23';
  if (c.includes('S908')) return 'Galaxy S22 Ultra';
  if (c.includes('S906')) return 'Galaxy S22+';
  if (c.includes('S901')) return 'Galaxy S22';
  if (c.includes('G998')) return 'Galaxy S21 Ultra';
  if (c.includes('G996')) return 'Galaxy S21+';
  if (c.includes('G991')) return 'Galaxy S21';
  if (c.includes('F946')) return 'Galaxy Z Fold 5';
  if (c.includes('F956')) return 'Galaxy Z Fold 6';
  if (c.includes('F731')) return 'Galaxy Z Flip 5';
  if (c.includes('F741')) return 'Galaxy Z Flip 6';
  if (c.includes('A556')) return 'Galaxy A55 5G';
  if (c.includes('A546')) return 'Galaxy A54 5G';
  if (c.includes('A536')) return 'Galaxy A53 5G';
  if (c.includes('A346')) return 'Galaxy A34 5G';
  if (c.includes('A356')) return 'Galaxy A35 5G';
  if (c.includes('A256')) return 'Galaxy A25 5G';
  if (c.includes('A155') || c.includes('A156')) return 'Galaxy A15';
  if (c.includes('A145') || c.includes('A146')) return 'Galaxy A14';
  if (c.includes('N986')) return 'Galaxy Note 20 Ultra';
  return `Galaxy (${code})`;
}

/**
 * Parses accurate OS name, device family, and hardware model from User Agent & Client Signals
 */
function detectOsAndDevice(
  ua: string,
  screenW: number,
  screenH: number,
  maxTouch: number,
  gpuRenderer?: string
): {
  deviceType: 'Mobile' | 'Tablet' | 'Desktop' | 'SmartTV' | 'Console' | 'Unknown';
  deviceModel: string;
  os: string;
  osVersion: string;
} {
  const lowerUa = ua.toLowerCase();

  // 1. Smart TV detection
  if (/smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast.tv|tizen|webos/i.test(ua)) {
    return { deviceType: 'SmartTV', deviceModel: 'Smart TV', os: 'SmartTV OS', osVersion: '' };
  }

  // 2. Gaming Consoles
  if (/playstation|xbox|nintendo/i.test(ua)) {
    const model = /playstation/i.test(ua) ? 'PlayStation' : /xbox/i.test(ua) ? 'Xbox' : 'Nintendo Switch';
    return { deviceType: 'Console', deviceModel: model, os: 'Console OS', osVersion: '' };
  }

  // 3. Apple iOS Detection (iPhone / iPad / iPod)
  if (/iphone/i.test(ua)) {
    const match = ua.match(/os (\d+[._]\d+([._]\d+)?)/i);
    const osVer = match ? match[1].replace(/_/g, '.') : '';
    
    // Precise iPhone Model by physical screen viewport dimensions
    const minDim = Math.min(screenW, screenH);
    const maxDim = Math.max(screenW, screenH);
    let modelName = 'Apple iPhone';

    if (maxDim >= 932 || minDim >= 430) modelName = 'Apple iPhone 16/15/14 Pro Max / Plus';
    else if (maxDim >= 874 || minDim >= 402) modelName = 'Apple iPhone 16 Pro';
    else if (maxDim >= 852 || minDim >= 393) modelName = 'Apple iPhone 16 / 15 / 15 Pro / 14 Pro';
    else if (maxDim >= 844 || minDim >= 390) modelName = 'Apple iPhone 14 / 13 / 13 Pro / 12 / 12 Pro';
    else if (maxDim >= 896 || minDim >= 414) modelName = 'Apple iPhone 11 Pro Max / XS Max / 11 / XR';
    else if (maxDim >= 812 || minDim >= 375) modelName = 'Apple iPhone 13 mini / 12 mini / 11 Pro / XS / X';
    else if (maxDim >= 667 || minDim >= 375) modelName = 'Apple iPhone SE (2nd/3rd Gen) / 8';

    return {
      deviceType: 'Mobile',
      deviceModel: modelName,
      os: 'iOS',
      osVersion: osVer,
    };
  }

  if (/ipad/i.test(ua) || (lowerUa.includes('macintosh') && maxTouch > 1)) {
    const match = ua.match(/os (\d+[._]\d+([._]\d+)?)/i);
    const osVer = match ? match[1].replace(/_/g, '.') : 'iPadOS';
    return {
      deviceType: 'Tablet',
      deviceModel: 'Apple iPad / iPad Pro',
      os: 'iPadOS',
      osVersion: osVer,
    };
  }

  // 4. Android Detection
  if (/android/i.test(ua)) {
    const verMatch = ua.match(/android\s+([\d.]+)/i);
    const osVer = verMatch ? verMatch[1] : '';

    // Extract device model (e.g., SM-S928B, Redmi Note 13, Pixel 8)
    let modelName = 'Android Device';
    const modelMatch = ua.match(/;\s*([^;]+?)\s*build/i) || ua.match(/\(([^;]+?);\s*[^;]+?\)/i);
    if (modelMatch && modelMatch[1]) {
      const rawModel = modelMatch[1].trim();
      if (!/android|linux|u;|wv|en-us|ar-eg|applewebkit|khtml/i.test(rawModel)) {
        modelName = rawModel;
      }
    }

    if (/samsung|sm-/i.test(ua) || modelName.startsWith('SM-')) {
      modelName = `Samsung ${decodeSamsungModel(modelName)}`;
    } else if (/xiaomi|redmi|poco/i.test(ua)) {
      modelName = `Xiaomi / Redmi (${modelName})`;
    } else if (/pixel/i.test(ua)) {
      modelName = `Google Pixel (${modelName})`;
    } else if (/huawei|honor/i.test(ua)) {
      modelName = `Huawei / Honor (${modelName})`;
    } else if (/oppo|cph/i.test(ua)) {
      modelName = `OPPO (${modelName})`;
    } else if (/vivo|v2/i.test(ua)) {
      modelName = `Vivo (${modelName})`;
    } else if (/realme|rmx/i.test(ua)) {
      modelName = `Realme (${modelName})`;
    } else if (/infinix|x\d{3}/i.test(ua)) {
      modelName = `Infinix (${modelName})`;
    }

    const isTablet = /tablet/i.test(ua) || Math.min(screenW, screenH) >= 600;
    return {
      deviceType: isTablet ? 'Tablet' : 'Mobile',
      deviceModel: modelName,
      os: 'Android',
      osVersion: osVer,
    };
  }

  // 5. Windows Desktop
  if (/windows nt/i.test(ua)) {
    let ver = 'Windows';
    if (/windows nt 10\.0/i.test(ua)) ver = 'Windows 10 / 11';
    else if (/windows nt 6\.3/i.test(ua)) ver = 'Windows 8.1';
    else if (/windows nt 6\.1/i.test(ua)) ver = 'Windows 7';

    let modelName = 'Windows PC (Desktop/Laptop)';
    if (gpuRenderer) {
      if (/rtx|gtx|geforce/i.test(gpuRenderer)) modelName = 'High-End Gaming / Workstation PC';
      else if (/iris|intel|uhd/i.test(gpuRenderer)) modelName = 'Windows Ultrabook / Laptop';
      else if (/radeon/i.test(gpuRenderer)) modelName = 'AMD Radeon PC';
    }

    return {
      deviceType: 'Desktop',
      deviceModel: modelName,
      os: 'Windows',
      osVersion: ver,
    };
  }

  // 6. macOS Desktop
  if (/macintosh|mac os x/i.test(ua)) {
    const verMatch = ua.match(/mac os x (\d+[._]\d+([._]\d+)?)/i);
    const osVer = verMatch ? verMatch[1].replace(/_/g, '.') : '';
    
    let macModel = 'Apple Mac Desktop / Laptop';
    if (gpuRenderer) {
      if (/apple m/i.test(gpuRenderer) || /apple gpu/i.test(gpuRenderer)) {
        macModel = `Apple MacBook (Apple Silicon M-Series)`;
      } else if (/intel/i.test(gpuRenderer) || /amd/i.test(gpuRenderer)) {
        macModel = 'Apple Mac (Intel Core)';
      }
    }

    return {
      deviceType: 'Desktop',
      deviceModel: macModel,
      os: 'macOS',
      osVersion: osVer,
    };
  }

  // 7. Linux
  if (/linux/i.test(ua)) {
    const isChromeOs = /cros/i.test(ua);
    return {
      deviceType: 'Desktop',
      deviceModel: isChromeOs ? 'Google Chromebook' : 'Linux PC',
      os: isChromeOs ? 'ChromeOS' : 'Linux',
      osVersion: '',
    };
  }

  return {
    deviceType: 'Unknown',
    deviceModel: 'Generic Device',
    os: 'Unknown OS',
    osVersion: '',
  };
}

/**
 * Parses browser name, version, and detects exact in-app WebViews
 */
function detectBrowser(ua: string): { browser: string; browserVersion: string; isWebView: boolean; webViewType?: string } {
  let browser = 'Unknown Browser';
  let browserVersion = '';
  let isWebView = false;
  let webViewType: string | undefined;

  // In-App WebViews
  if (/telegram/i.test(ua)) {
    isWebView = true;
    webViewType = 'Telegram In-App WebView';
    browser = 'Telegram In-App';
  } else if (/instagram/i.test(ua)) {
    isWebView = true;
    webViewType = 'Instagram In-App Browser';
    browser = 'Instagram In-App';
  } else if (/fban|fbav/i.test(ua)) {
    isWebView = true;
    webViewType = 'Facebook In-App Browser';
    browser = 'Facebook In-App';
  } else if (/tiktok|bytedance/i.test(ua)) {
    isWebView = true;
    webViewType = 'TikTok In-App Browser';
    browser = 'TikTok In-App';
  } else if (/twitter|x\//i.test(ua)) {
    isWebView = true;
    webViewType = 'X (Twitter) In-App Browser';
    browser = 'Twitter/X In-App';
  } else if (/snapchat/i.test(ua)) {
    isWebView = true;
    webViewType = 'Snapchat In-App Browser';
    browser = 'Snapchat In-App';
  } else if (/whatsapp/i.test(ua)) {
    isWebView = true;
    webViewType = 'WhatsApp In-App Browser';
    browser = 'WhatsApp In-App';
  } else if (/wv\)/i.test(ua) || (/\bversion\/[\d.]+.*chrome/i.test(ua))) {
    isWebView = true;
    webViewType = 'Android System WebView';
    browser = 'Android WebView';
  }

  if (!isWebView) {
    if (/edg\//i.test(ua)) {
      browser = 'Microsoft Edge';
      const m = ua.match(/edg\/([\d.]+)/i);
      browserVersion = m ? m[1] : '';
    } else if (/samsungbrowser/i.test(ua)) {
      browser = 'Samsung Internet';
      const m = ua.match(/samsungbrowser\/([\d.]+)/i);
      browserVersion = m ? m[1] : '';
    } else if (/opera|opr\//i.test(ua)) {
      browser = 'Opera Browser';
      const m = ua.match(/(?:opera|opr)\/([\d.]+)/i);
      browserVersion = m ? m[1] : '';
    } else if (/brave/i.test(ua) || (navigator as any)?.brave) {
      browser = 'Brave Browser';
      const m = ua.match(/chrome\/([\d.]+)/i);
      browserVersion = m ? m[1] : '';
    } else if (/chrome\//i.test(ua)) {
      browser = 'Google Chrome';
      const m = ua.match(/chrome\/([\d.]+)/i);
      browserVersion = m ? m[1] : '';
    } else if (/version\/([\d.]+).*safari/i.test(ua)) {
      browser = 'Apple Safari';
      const m = ua.match(/version\/([\d.]+)/i);
      browserVersion = m ? m[1] : '';
    } else if (/firefox\//i.test(ua)) {
      browser = 'Mozilla Firefox';
      const m = ua.match(/firefox\/([\d.]+)/i);
      browserVersion = m ? m[1] : '';
    }
  }

  return { browser, browserVersion, isWebView, webViewType };
}

/**
 * Returns comprehensive, rich, non-intrusive client telemetry
 */
export function getClientTelemetry(): ClientTelemetryData {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'Unknown',
      deviceModel: 'Server / Bot',
      os: 'Server OS',
      osVersion: '',
      browser: 'Next.js SSR',
      browserVersion: '',
      isWebView: false,
      screenWidth: 0,
      screenHeight: 0,
      viewportWidth: 0,
      viewportHeight: 0,
      pixelRatio: 1,
      colorDepth: 24,
      orientation: 'unknown',
      touchSupport: false,
      maxTouchPoints: 0,
      timezone: 'UTC',
      timezoneOffset: 'UTC+00:00',
      language: 'en',
      languages: ['en'],
      referrer: '',
      landingUrl: '',
      userAgent: '',
      collectedAt: new Date().toISOString(),
      summaryFormatted: 'Server SSR Client',
    };
  }

  const nav = window.navigator as any;
  const screen = window.screen as any;
  const ua = nav.userAgent || '';

  const screenW = screen?.width || window.innerWidth || 0;
  const screenH = screen?.height || window.innerHeight || 0;
  const maxTouch = nav.maxTouchPoints || (('ontouchstart' in window) ? 1 : 0);

  const gpu = getGpuInfo();
  const { deviceType, deviceModel, os, osVersion } = detectOsAndDevice(ua, screenW, screenH, maxTouch, gpu.renderer);
  const { browser, browserVersion, isWebView, webViewType } = detectBrowser(ua);

  // Timezone & Locales
  let timezone = 'UTC';
  let timezoneOffset = '+00:00';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const offsetMin = -new Date().getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMin);
    const hrs = String(Math.floor(absMin / 60)).padStart(2, '0');
    const mins = String(absMin % 60).padStart(2, '0');
    timezoneOffset = `UTC${sign}${hrs}:${mins}`;
  } catch {}

  // Network Information
  let connectionType: string | undefined;
  let downlinkSpeed: string | undefined;
  let rttLatency: string | undefined;
  let saveDataMode: boolean | undefined;

  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (conn) {
    connectionType = conn.effectiveType || conn.type;
    if (conn.downlink) downlinkSpeed = `${conn.downlink} Mbps`;
    if (conn.rtt) rttLatency = `${conn.rtt} ms`;
    if (conn.saveData !== undefined) saveDataMode = Boolean(conn.saveData);
  }

  // Device Memory & Cores
  const deviceMemoryGb = nav.deviceMemory ? `${nav.deviceMemory} GB+ RAM` : undefined;
  const cpuCores = nav.hardwareConcurrency || undefined;

  // Screen Orientation
  let orientation = 'portrait';
  try {
    orientation = screen.orientation?.type || (window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
  } catch {}

  const pixelRatio = window.devicePixelRatio || 1;
  const colorDepth = screen.colorDepth || 24;

  const summaryFormatted = `${deviceType === 'Mobile' ? '📱' : deviceType === 'Tablet' ? '📟' : '💻'} ${deviceModel} (${os} ${osVersion}) • ${browser} • ${screenW}x${screenH}@${pixelRatio}x • ${timezone}`;

  return {
    deviceType,
    deviceModel,
    os,
    osVersion,
    browser,
    browserVersion,
    isWebView,
    webViewType,
    screenWidth: screenW,
    screenHeight: screenH,
    viewportWidth: window.innerWidth || screenW,
    viewportHeight: window.innerHeight || screenH,
    pixelRatio,
    colorDepth,
    orientation,
    touchSupport: maxTouch > 0,
    maxTouchPoints: maxTouch,
    deviceMemoryGb,
    cpuCores,
    gpuVendor: gpu.vendor,
    gpuRenderer: gpu.renderer,
    timezone,
    timezoneOffset,
    language: nav.language || 'ar',
    languages: Array.isArray(nav.languages) ? nav.languages : [nav.language || 'ar'],
    connectionType,
    downlinkSpeed,
    rttLatency,
    saveDataMode,
    referrer: typeof document !== 'undefined' ? document.referrer || 'Direct' : 'Direct',
    landingUrl: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: ua,
    collectedAt: new Date().toISOString(),
    summaryFormatted,
  };
}

/**
 * Formats a clean, high-density Arabic Telegram message block for bots
 */
export function formatTelemetryForTelegram(t?: Partial<ClientTelemetryData> | null): string {
  if (!t || !t.deviceType) return '';

  const devIcon = t.deviceType === 'Mobile' ? '📱' : t.deviceType === 'Tablet' ? '📟' : t.deviceType === 'Desktop' ? '💻' : '🎮';
  const osStr = `${t.os || 'Unknown'}${t.osVersion ? ' ' + t.osVersion : ''}`;
  const browserStr = `${t.browser || 'Browser'}${t.browserVersion ? ' ' + t.browserVersion : ''}${t.isWebView ? ' (In-App WebView)' : ''}`;
  const screenStr = `${t.screenWidth || 0}×${t.screenHeight || 0} (@${t.pixelRatio || 1}x ${t.orientation || 'Portrait'})`;
  
  let hardwareParts: string[] = [];
  if (t.deviceMemoryGb) hardwareParts.push(String(t.deviceMemoryGb));
  if (t.cpuCores) hardwareParts.push(`${t.cpuCores} Cores`);
  if (t.gpuRenderer) hardwareParts.push(t.gpuRenderer.split('/')[0].trim());
  const hardwareStr = hardwareParts.length > 0 ? hardwareParts.join(' • ') : 'معالج قياسي';

  let netParts: string[] = [];
  if (t.connectionType) netParts.push(t.connectionType.toUpperCase());
  if (t.downlinkSpeed) netParts.push(t.downlinkSpeed);
  if (t.rttLatency) netParts.push(`RTT: ${t.rttLatency}`);
  const netStr = netParts.length > 0 ? netParts.join(' • ') : 'متصل بالإنترنت';

  const tzStr = `${t.timezone || 'UTC'} (${t.timezoneOffset || 'UTC+00:00'})`;
  const refStr = t.referrer && t.referrer !== 'Direct' ? t.referrer.substring(0, 40) : 'دخول مباشر (Direct)';

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━
<b>بيانات جهاز العميل والبيئة (Client Intelligence):</b>
├ ${devIcon} <b>الجهاز والنظام:</b> <code>${t.deviceModel || 'جهاز عميل'} (${osStr})</code>
├ 🌐 <b>المتصفح:</b> <code>${browserStr}</code>
├ 🖥️ <b>الشاشة:</b> <code>${screenStr}</code>
├ ⚡ <b>العتاد والذاكرة:</b> <code>${hardwareStr}</code>
├ 📶 <b>الاتصال والشبكة:</b> <code>${netStr}</code>
├ 📍 <b>التوقيت والنطاق:</b> <code>${tzStr}</code>
└ 🔗 <b>المصدر / الإحالة:</b> <code>${refStr}</code>
`.trim();
}

/**
 * Retrieves or generates a permanent, high-entropy unique Device ID (stored in localStorage & cookie)
 */
export function getPermanentDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr_device';
  const STORAGE_KEY = 'upstore_device_permanent_id';
  const COOKIE_NAME = 'upstore_did';

  try {
    // 1. Check localStorage
    const localId = window.localStorage.getItem(STORAGE_KEY);
    if (localId && localId.length >= 10) {
      return localId;
    }

    // 2. Check Cookie fallback
    const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
    if (match && match[1] && match[1].length >= 10) {
      const cookieId = decodeURIComponent(match[1]);
      try {
        window.localStorage.setItem(STORAGE_KEY, cookieId);
      } catch {}
      return cookieId;
    }

    // 3. Generate new permanent device ID
    const randomHex = Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    const newDeviceId = `did_${randomHex}`;

    try {
      window.localStorage.setItem(STORAGE_KEY, newDeviceId);
    } catch {}

    try {
      // 2 years expiry cookie
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(newDeviceId)}; max-age=63072000; path=/; SameSite=Lax`;
    } catch {}

    return newDeviceId;
  } catch {
    return 'did_temp_' + Math.random().toString(36).substring(2, 10);
  }
}

/**
 * Calculates a fast, deterministic client-side hardware fingerprint
 */
export function generateClientHardwareFingerprint(): string {
  if (typeof window === 'undefined') return 'ssr_hw';

  try {
    const nav = window.navigator as any;
    const screen = window.screen as any;
    const gpu = getGpuInfo();

    const parts = [
      screen?.width || 0,
      screen?.height || 0,
      screen?.colorDepth || 24,
      window.devicePixelRatio || 1,
      nav.hardwareConcurrency || 0,
      nav.deviceMemory || 0,
      gpu.renderer || '',
      gpu.vendor || '',
      nav.maxTouchPoints || 0,
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      nav.language || '',
      nav.platform || '',
    ].join('|');

    // Fast deterministic hash (FNV-1a 32-bit variant into hex)
    let hash = 0x811c9dc5;
    for (let i = 0; i < parts.length; i++) {
      hash ^= parts.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }

    return `hw_${hash.toString(16).padStart(8, '0')}`;
  } catch {
    return 'hw_generic';
  }
}

/**
 * Checks whether this specific mobile device has already been alerted to Telegram
 */
export function isDeviceAlreadyNotifiedLocally(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // Check localStorage flag
    const alertedLocal = window.localStorage.getItem('upstore_device_alert_sent');
    if (alertedLocal === 'true') {
      return true;
    }

    // Check cookie flag
    if (document.cookie.includes('upstore_alerted=1')) {
      try {
        window.localStorage.setItem('upstore_device_alert_sent', 'true');
      } catch {}
      return true;
    }
  } catch {}

  return false;
}

/**
 * Marks this mobile device permanently as notified in localStorage and Cookie
 */
export function markDeviceAsNotifiedLocally(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem('upstore_device_alert_sent', 'true');
    window.localStorage.setItem('upstore_device_alert_ts', Date.now().toString());
  } catch {}

  try {
    // 2 years expiry cookie so subdomains and future visits know device was alerted
    document.cookie = 'upstore_alerted=1; max-age=63072000; path=/; SameSite=Lax';
  } catch {}
}

