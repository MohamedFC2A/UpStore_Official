/**
 * geo.ts — UpStore Smart Geo-Location & IP Intelligence Engine
 *
 * Automatically detects user country, flag emoji, city, region, and ISP
 * without asking the user, using edge headers + high-speed cached IP lookups.
 */

export interface GeoLocationInfo {
  countryCode: string;
  countryNameAr: string;
  countryNameEn: string;
  flagEmoji: string;
  city: string | null;
  region: string | null;
  isp: string | null;
  asNumber?: string | null;
  carrierNameAr?: string | null;
  carrierNameEn?: string | null;
  carrierBadge?: string | null;
  isEgyptianCarrier?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  ip: string;
  formattedLocation: string; // e.g. "🇪🇬 مصر (Cairo)"
}

export interface EgyptianCarrierResult {
  isEgyptianCarrier: boolean;
  carrierNameAr: string;
  carrierNameEn: string;
  carrierBadge: string;
  carrierBrand: 'WE' | 'Vodafone' | 'Orange' | 'Etisalat' | 'Noor' | 'Other';
}

const EGYPTIAN_ASNS: Record<string, EgyptianCarrierResult> = {
  'AS8452': {
    isEgyptianCarrier: true,
    carrierNameAr: 'المصرية للاتصالات (WE / TE Data)',
    carrierNameEn: 'Telecom Egypt (WE)',
    carrierBadge: '🟣 WE (Telecom Egypt - المصرية للاتصالات)',
    carrierBrand: 'WE',
  },
  'AS24863': {
    isEgyptianCarrier: true,
    carrierNameAr: 'المصرية للاتصالات (WE / Link)',
    carrierNameEn: 'Telecom Egypt (WE / Link)',
    carrierBadge: '🟣 WE (Telecom Egypt - المصرية للاتصالات)',
    carrierBrand: 'WE',
  },
  'AS36935': {
    isEgyptianCarrier: true,
    carrierNameAr: 'المصرية للاتصالات (TE-AS)',
    carrierNameEn: 'Telecom Egypt (TE-AS)',
    carrierBadge: '🟣 WE (Telecom Egypt - المصرية للاتصالات)',
    carrierBrand: 'WE',
  },
  'AS24835': {
    isEgyptianCarrier: true,
    carrierNameAr: 'فودافون مصر (Vodafone Egypt)',
    carrierNameEn: 'Vodafone Egypt',
    carrierBadge: '🔴 Vodafone Egypt (فودافون مصر)',
    carrierBrand: 'Vodafone',
  },
  'AS36992': {
    isEgyptianCarrier: true,
    carrierNameAr: 'أورنج مصر (Orange Egypt / موبينيل)',
    carrierNameEn: 'Orange Egypt',
    carrierBadge: '🟠 Orange Egypt (أورنج مصر)',
    carrierBrand: 'Orange',
  },
  'AS36996': {
    isEgyptianCarrier: true,
    carrierNameAr: 'اتصالات مصر (e& Misr)',
    carrierNameEn: 'e& Egypt (Etisalat Misr)',
    carrierBadge: '🟢 e& Egypt (اتصالات مصر)',
    carrierBrand: 'Etisalat',
  },
  'AS20928': {
    isEgyptianCarrier: true,
    carrierNameAr: 'شبكة نور للاتصالات (NOOR Data)',
    carrierNameEn: 'NOOR Advanced Technologies',
    carrierBadge: '🔵 Noor Network (شبكة نور)',
    carrierBrand: 'Noor',
  },
};

export function resolveEgyptianCarrier(
  asn?: string | null,
  ispName?: string | null,
  _ip?: string
): EgyptianCarrierResult {
  // 1. Exact ASN lookup
  if (asn) {
    const cleanAsn = asn.toUpperCase().trim();
    if (EGYPTIAN_ASNS[cleanAsn]) {
      return EGYPTIAN_ASNS[cleanAsn];
    }
    const numMatch = cleanAsn.match(/\d+/);
    if (numMatch && EGYPTIAN_ASNS[`AS${numMatch[0]}`]) {
      return EGYPTIAN_ASNS[`AS${numMatch[0]}`];
    }
  }

  // 2. ISP string heuristics
  const rawIsp = (ispName || '').toLowerCase();
  if (
    rawIsp.includes('telecom egypt') ||
    rawIsp.includes('te data') ||
    rawIsp.includes('tedata') ||
    rawIsp.includes('te-as') ||
    /\bwe\b/i.test(rawIsp)
  ) {
    return EGYPTIAN_ASNS['AS8452'];
  }
  if (rawIsp.includes('vodafone')) {
    return EGYPTIAN_ASNS['AS24835'];
  }
  if (rawIsp.includes('orange') || rawIsp.includes('mobinil') || rawIsp.includes('ecms')) {
    return EGYPTIAN_ASNS['AS36992'];
  }
  if (rawIsp.includes('etisalat') || rawIsp.includes('e&')) {
    return EGYPTIAN_ASNS['AS36996'];
  }
  if (rawIsp.includes('noor')) {
    return EGYPTIAN_ASNS['AS20928'];
  }

  return {
    isEgyptianCarrier: false,
    carrierNameAr: ispName || 'مزود خدمة خارجي',
    carrierNameEn: ispName || 'External ISP',
    carrierBadge: ispName ? `🏢 ${ispName}` : '🏢 مزود شبكة',
    carrierBrand: 'Other',
  };
}

// In-memory cache for IP lookups to ensure 0ms latency for repeating IPs
const IP_CACHE = new Map<string, { data: GeoLocationInfo; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Comprehensive ISO-2 to Arabic/English Country Names & Codes
const COUNTRY_MAP: Record<string, { ar: string; en: string; flag: string }> = {
  EG: { ar: 'مصر', en: 'Egypt', flag: '🇪🇬' },
  SA: { ar: 'السعودية', en: 'Saudi Arabia', flag: '🇸🇦' },
  AE: { ar: 'الإمارات', en: 'United Arab Emirates', flag: '🇦🇪' },
  KW: { ar: 'الكويت', en: 'Kuwait', flag: '🇰🇼' },
  QA: { ar: 'قطر', en: 'Qatar', flag: '🇶🇦' },
  BH: { ar: 'البحرين', en: 'Bahrain', flag: '🇧🇭' },
  OM: { ar: 'عمان', en: 'Oman', flag: '🇴🇲' },
  IQ: { ar: 'العراق', en: 'Iraq', flag: '🇮🇶' },
  JO: { ar: 'الأردن', en: 'Jordan', flag: '🇯🇴' },
  LB: { ar: 'لبنان', en: 'Lebanon', flag: '🇱🇧' },
  SY: { ar: 'سوريا', en: 'Syria', flag: '🇸🇾' },
  PS: { ar: 'فلسطين', en: 'Palestine', flag: '🇵🇸' },
  YE: { ar: 'اليمن', en: 'Yemen', flag: '🇾🇪' },
  MA: { ar: 'المغرب', en: 'Morocco', flag: '🇲🇦' },
  DZ: { ar: 'الجزائر', en: 'Algeria', flag: '🇩🇿' },
  TN: { ar: 'تونس', en: 'Tunisia', flag: '🇹🇳' },
  LY: { ar: 'ليبيا', en: 'Libya', flag: '🇱🇾' },
  SD: { ar: 'السودان', en: 'Sudan', flag: '🇸🇩' },
  TR: { ar: 'تركيا', en: 'Turkey', flag: '🇹🇷' },
  US: { ar: 'الولايات المتحدة', en: 'United States', flag: '🇺🇸' },
  GB: { ar: 'المملكة المتحدة', en: 'United Kingdom', flag: '🇬🇧' },
  DE: { ar: 'ألمانيا', en: 'Germany', flag: '🇩🇪' },
  FR: { ar: 'فرنسا', en: 'France', flag: '🇫🇷' },
  CA: { ar: 'كندا', en: 'Canada', flag: '🇨🇦' },
  RU: { ar: 'روسيا', en: 'Russia', flag: '🇷🇺' },
  NL: { ar: 'هولندا', en: 'Netherlands', flag: '🇳🇱' },
  IT: { ar: 'إيطاليا', en: 'Italy', flag: '🇮🇹' },
  ES: { ar: 'إسبانيا', en: 'Spain', flag: '🇪🇸' },
  SE: { ar: 'السويد', en: 'Sweden', flag: '🇸🇪' },
  CH: { ar: 'سويسرا', en: 'Switzerland', flag: '🇨🇭' },
  AT: { ar: 'النمسا', en: 'Austria', flag: '🇦🇹' },
  BE: { ar: 'بلجيكا', en: 'Belgium', flag: '🇧🇪' },
  IN: { ar: 'الهند', en: 'India', flag: '🇮🇳' },
  PK: { ar: 'باكستان', en: 'Pakistan', flag: '🇵🇰' },
  BR: { ar: 'البرازيل', en: 'Brazil', flag: '🇧🇷' },
  AU: { ar: 'أستراليا', en: 'Australia', flag: '🇦🇺' },
};

/**
 * Converts a 2-letter country code (ISO-3166-1 alpha-2) to clean flag emoji
 */
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌐';
  }
}

/**
 * Normalizes client IP from request headers.
 */
export function extractClientIp(requestOrHeaders: Request | Headers): string {
  const headers = requestOrHeaders instanceof Request ? requestOrHeaders.headers : requestOrHeaders;

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    if (ips[0] && !isPrivateIp(ips[0])) return ips[0];
    for (const ip of ips) {
      if (!isPrivateIp(ip)) return ip;
    }
  }

  const realIp = headers.get('x-real-ip') || headers.get('cf-connecting-ip');
  if (realIp && !isPrivateIp(realIp)) return realIp.trim();

  return '127.0.0.1';
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.trim();
  return (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    clean.startsWith('172.16.') ||
    clean.startsWith('172.31.') ||
    clean.startsWith('fe80:') ||
    clean === 'localhost'
  );
}

/**
 * Detects smart location from headers or high-speed Geo-IP lookups.
 */
export async function detectSmartLocation(
  requestOrHeaders?: Request | Headers | { ip?: string; headers?: Headers }
): Promise<GeoLocationInfo> {
  let headers: Headers | null = null;
  let ip = '127.0.0.1';

  if (requestOrHeaders instanceof Request) {
    headers = requestOrHeaders.headers;
    ip = extractClientIp(requestOrHeaders);
  } else if (requestOrHeaders instanceof Headers) {
    headers = requestOrHeaders;
    ip = extractClientIp(requestOrHeaders);
  } else if (requestOrHeaders?.headers) {
    headers = requestOrHeaders.headers;
    ip = requestOrHeaders.ip || extractClientIp(requestOrHeaders.headers);
  } else if (requestOrHeaders?.ip) {
    ip = requestOrHeaders.ip;
  }

  // 1. Check local/private IPs
  if (isPrivateIp(ip)) {
    return {
      countryCode: 'LOCAL',
      countryNameAr: 'محلي',
      countryNameEn: 'Local Dev',
      flagEmoji: '💻',
      city: 'Localhost',
      region: null,
      isp: 'Internal Network',
      ip,
      formattedLocation: '💻 محلي (Localhost)',
    };
  }

  // 2. Check memory cache
  const cached = IP_CACHE.get(ip);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 3. Check Cloudflare or Vercel Edge Headers
  let edgeCountry = headers?.get('cf-ipcountry') || headers?.get('x-vercel-ip-country') || null;
  let edgeCity = headers?.get('cf-ipcity') || headers?.get('x-vercel-ip-city') || null;
  let edgeRegion = headers?.get('x-vercel-ip-country-region') || null;
  let edgeAsNumber = headers?.get('x-vercel-ip-as-number') || null;
  let edgeIsp = headers?.get('x-vercel-ip-as-name') || headers?.get('x-vercel-ip-as-org') || null;

  // 4. Perform fast external GeoIP lookup with timeout (ipwho.is -> ipapi.co)
  let geoResult: GeoLocationInfo | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1100);

    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'UpStore-Geo-Engine/2.0' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && data.country_code) {
        const code = String(data.country_code).toUpperCase();
        const meta = COUNTRY_MAP[code] || {
          ar: data.country || code,
          en: data.country || code,
          flag: getFlagEmoji(code),
        };

        const city = data.city || edgeCity || null;
        const region = data.region || edgeRegion || null;
        const ispName = data.connection?.isp || data.connection?.org || edgeIsp || null;
        const asn = data.connection?.asn ? `AS${data.connection.asn}` : edgeAsNumber;

        const formatted = city
          ? `${meta.flag} ${meta.ar} (${city})`
          : `${meta.flag} ${meta.ar} (${meta.en})`;

        const carrier = (code === 'EG' || (!code && ispName))
          ? resolveEgyptianCarrier(asn, ispName, ip)
          : null;

        geoResult = {
          countryCode: code,
          countryNameAr: meta.ar,
          countryNameEn: meta.en,
          flagEmoji: meta.flag,
          city,
          region,
          isp: ispName,
          asNumber: asn,
          carrierNameAr: carrier?.carrierNameAr || null,
          carrierNameEn: carrier?.carrierNameEn || null,
          carrierBadge: carrier?.carrierBadge || null,
          isEgyptianCarrier: carrier?.isEgyptianCarrier || false,
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone?.id,
          ip,
          formattedLocation: formatted,
        };
      }
    }
  } catch {
    // Lookup failed or timed out
  }

  // Fallback to edge headers if external lookup timed out
  if (!geoResult && edgeCountry && edgeCountry.length === 2 && edgeCountry !== 'XX') {
    const code = edgeCountry.toUpperCase();
    const meta = COUNTRY_MAP[code] || {
      ar: code,
      en: code,
      flag: getFlagEmoji(code),
    };

    const city = edgeCity ? decodeURIComponent(edgeCity) : null;
    const formatted = city
      ? `${meta.flag} ${meta.ar} (${city})`
      : `${meta.flag} ${meta.ar} (${meta.en})`;

    const carrier = code === 'EG' ? resolveEgyptianCarrier(edgeAsNumber, edgeIsp, ip) : null;

    geoResult = {
      countryCode: code,
      countryNameAr: meta.ar,
      countryNameEn: meta.en,
      flagEmoji: meta.flag,
      city,
      region: edgeRegion || null,
      isp: edgeIsp || null,
      asNumber: edgeAsNumber,
      carrierNameAr: carrier?.carrierNameAr || null,
      carrierNameEn: carrier?.carrierNameEn || null,
      carrierBadge: carrier?.carrierBadge || null,
      isEgyptianCarrier: carrier?.isEgyptianCarrier || false,
      ip,
      formattedLocation: formatted,
    };
  }

  // Default fallback
  if (!geoResult) {
    geoResult = {
      countryCode: 'UN',
      countryNameAr: 'غير محدد',
      countryNameEn: 'Unknown',
      flagEmoji: '🌐',
      city: null,
      region: null,
      isp: null,
      ip,
      formattedLocation: `IP: ${ip}`,
    };
  }

  IP_CACHE.set(ip, { data: geoResult, expiresAt: Date.now() + CACHE_TTL_MS });
  return geoResult;
}

export function formatLocationForTelegram(geo: GeoLocationInfo): string {
  if (!geo) return '<b>الموقع:</b> غير محدد';

  const carrierInfo = geo.carrierBadge ? `\n├ 📶 <b>الشبكة والمزود:</b> <code>${geo.carrierBadge}</code>` : '';

  if (geo.city && geo.city !== 'Unknown' && geo.city !== 'Localhost') {
    return `<b>الموقع:</b> <b>${geo.countryNameAr}</b> (${geo.city}) [<code>${geo.ip}</code>]${carrierInfo}`;
  }

  return `<b>الموقع:</b> <b>${geo.countryNameAr}</b> (${geo.countryNameEn}) [<code>${geo.ip}</code>]${carrierInfo}`;
}
