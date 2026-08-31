/**
 * Centralized UpStore Pricing, Tax & Currency Engine
 * Single Source of Truth for:
 * 1. 5% VAT (الضريبة المضافة)
 * 2. Multi-currency conversions (USD, EGP, SAR, Arab Country Currencies)
 * 3. Coupon discounts (UPSTORE10, SAVE10, UPSTORE20, VIP20)
 * 4. Exact mathematical consistency across Cart, Instant Checkout, Gateways & Receipt OCR.
 */

import { getArabCountryConfig, getArabiPayMinimum, ArabiPayLimit } from '@/utils/arabPaymentMethods';

export const TAX_RATE = 0.05; // 5% VAT

export const EXCHANGE_RATES: Record<'EGP' | 'SAR' | 'USD', number> = {
  EGP: 53,
  SAR: 4,
  USD: 1,
};

export interface PricingItem {
  id?: string;
  product_id?: string;
  product?: {
    id?: string;
    name?: string;
    name_ar?: string;
    our_price?: number;
    ourPrice?: number;
    price?: number;
    price_egp?: number;
    priceEgp?: number;
    price_sar?: number;
    priceSar?: number;
    image_url?: string;
    imageUrl?: string;
    slug?: string;
  } | null;
  variant_id?: string | null;
  variant?: {
    id?: string;
    name?: string;
    name_ar?: string;
    our_price?: number;
    ourPrice?: number;
    price_egp?: number;
    priceEgp?: number;
    price_sar?: number;
    priceSar?: number;
    image_url?: string;
  } | null;
  quantity: number;
}

export interface CouponEvaluation {
  code: string;
  discountPct: number;
  isValid: boolean;
  errorMessage?: string;
}

export interface CalculatedTotals {
  // USD
  subtotalUsd: number;
  discountAmountUsd: number;
  discountedSubtotalUsd: number;
  taxUsd: number;
  totalUsd: number;

  // EGP (Egypt)
  subtotalEgp: number;
  discountAmountEgp: number;
  discountedSubtotalEgp: number;
  taxEgp: number;
  totalEgp: number;

  // SAR (Saudi Arabia)
  subtotalSar: number;
  discountAmountSar: number;
  discountedSubtotalSar: number;
  taxSar: number;
  totalSar: number;

  // Active coupon info
  appliedCoupon: CouponEvaluation | null;
  discountPct: number;
  itemCount: number;
}

/**
 * Validates and calculates discount percentage for a coupon code
 */
export function evaluateCouponDiscount(couponCode?: string | null, subtotalUsd: number = 0): CouponEvaluation {
  if (!couponCode || !couponCode.trim()) {
    return { code: '', discountPct: 0, isValid: false };
  }

  const code = couponCode.trim().toUpperCase();

  if (code === 'UPSTORE10' || code === 'SAVE10') {
    return {
      code,
      discountPct: 10,
      isValid: true,
    };
  }

  if (code === 'UPSTORE20' || code === 'VIP20') {
    if (subtotalUsd < 20) {
      return {
        code,
        discountPct: 0,
        isValid: false,
        errorMessage: 'This coupon requires a minimum order of $20 (1,060 EGP / 80 SAR)',
      };
    }
    return {
      code,
      discountPct: 20,
      isValid: true,
    };
  }

  return {
    code,
    discountPct: 0,
    isValid: false,
    errorMessage: 'Invalid or expired coupon code',
  };
}

/**
 * Calculates comprehensive pricing breakdown including subtotal, coupon discount, 5% VAT, and final total
 */
export function calculateOrderTotals(
  items: PricingItem[] = [],
  couponCode?: string | null,
  overrideTotalUsd?: number | null
): CalculatedTotals {
  let rawSubtotalUsd = 0;
  let rawSubtotalEgp = 0;
  let rawSubtotalSar = 0;
  let totalItemCount = 0;

  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      const prod = item.product || {};
      const variant = item.variant || null;
      const qty = Math.max(1, Number(item.quantity) || 1);
      totalItemCount += qty;

      // Extract USD unit price
      const unitUsd = Number(
        variant?.our_price ??
        variant?.ourPrice ??
        prod.our_price ??
        prod.ourPrice ??
        prod.price ??
        0
      );

      // Extract or convert EGP unit price
      const directEgp = variant?.price_egp ?? variant?.priceEgp ?? prod.price_egp ?? prod.priceEgp;
      const unitEgp = directEgp !== undefined && directEgp !== null && Number(directEgp) > 0
        ? Number(directEgp)
        : unitUsd * EXCHANGE_RATES.EGP;

      // Extract or convert SAR unit price
      const directSar = variant?.price_sar ?? variant?.priceSar ?? prod.price_sar ?? prod.priceSar;
      const unitSar = directSar !== undefined && directSar !== null && Number(directSar) > 0
        ? Number(directSar)
        : unitUsd * EXCHANGE_RATES.SAR;

      rawSubtotalUsd += unitUsd * qty;
      rawSubtotalEgp += unitEgp * qty;
      rawSubtotalSar += unitSar * qty;
    }
  }

  // If overrideTotalUsd is provided and items were empty or sum was zero
  if (rawSubtotalUsd <= 0 && typeof overrideTotalUsd === 'number' && overrideTotalUsd > 0) {
    rawSubtotalUsd = overrideTotalUsd;
    rawSubtotalEgp = rawSubtotalUsd * EXCHANGE_RATES.EGP;
    rawSubtotalSar = rawSubtotalUsd * EXCHANGE_RATES.SAR;
  }

  // 1. Coupon Evaluation
  const couponEval = evaluateCouponDiscount(couponCode, rawSubtotalUsd);
  const discountPct = couponEval.isValid ? couponEval.discountPct : 0;

  // 2. USD Calculations
  const discountAmountUsd = (rawSubtotalUsd * discountPct) / 100;
  const discountedSubtotalUsd = Math.max(0, rawSubtotalUsd - discountAmountUsd);
  const taxUsd = discountedSubtotalUsd * TAX_RATE; // 5% VAT
  const totalUsd = discountedSubtotalUsd + taxUsd;

  // 3. EGP Calculations (Rounded cleanly to whole EGP for local payments)
  const discountAmountEgp = (rawSubtotalEgp * discountPct) / 100;
  const discountedSubtotalEgp = Math.max(0, rawSubtotalEgp - discountAmountEgp);
  const taxEgp = discountedSubtotalEgp * TAX_RATE; // 5% VAT
  const totalEgp = Math.ceil(discountedSubtotalEgp + taxEgp);

  // 4. SAR Calculations (Rounded cleanly to whole SAR for local payments)
  const discountAmountSar = (rawSubtotalSar * discountPct) / 100;
  const discountedSubtotalSar = Math.max(0, rawSubtotalSar - discountAmountSar);
  const taxSar = discountedSubtotalSar * TAX_RATE; // 5% VAT
  const totalSar = Math.ceil(discountedSubtotalSar + taxSar);

  return {
    subtotalUsd: Math.round(rawSubtotalUsd * 100) / 100,
    discountAmountUsd: Math.round(discountAmountUsd * 100) / 100,
    discountedSubtotalUsd: Math.round(discountedSubtotalUsd * 100) / 100,
    taxUsd: Math.round(taxUsd * 100) / 100,
    totalUsd: Math.round(totalUsd * 100) / 100,

    subtotalEgp: Math.ceil(rawSubtotalEgp),
    discountAmountEgp: Math.round(discountAmountEgp * 100) / 100,
    discountedSubtotalEgp: Math.round(discountedSubtotalEgp * 100) / 100,
    taxEgp: Math.ceil(taxEgp),
    totalEgp,

    subtotalSar: Math.ceil(rawSubtotalSar),
    discountAmountSar: Math.round(discountAmountSar * 100) / 100,
    discountedSubtotalSar: Math.round(discountedSubtotalSar * 100) / 100,
    taxSar: Math.ceil(taxSar),
    totalSar,

    appliedCoupon: couponEval.isValid ? couponEval : null,
    discountPct,
    itemCount: totalItemCount,
  };
}

export interface ArabCalculatedPrice {
  countryCode: string;
  countryNameAr: string;
  countryNameEn: string;
  currencyCode: string;
  symbolAr: string;
  symbolEn: string;
  subtotalLocal: number;
  taxLocal: number;
  totalLocal: number;
  displayPriceAr: string;
  displayPriceEn: string;
  arabiPayLimit: ArabiPayLimit;
  isBelowMinimum: boolean;
  minimumDiff: number;
}

/**
 * Calculates localized price with 5% VAT and coupon for any of the 22 Arab countries
 */
export function calculateArabCountryPrice(
  countryCode: string,
  totals: CalculatedTotals,
  _isArabic: boolean = true
): ArabCalculatedPrice {
  const code = (countryCode || 'SA').toUpperCase();
  const countryConfig = getArabCountryConfig(code);
  const arabiPayLimit = getArabiPayMinimum(code);

  if (code === 'EG') {
    const isBelow = totals.totalEgp < arabiPayLimit.minAmount;
    const diff = Math.max(0, arabiPayLimit.minAmount - totals.totalEgp);
    return {
      countryCode: 'EG',
      countryNameAr: countryConfig.nameAr,
      countryNameEn: countryConfig.nameEn,
      currencyCode: 'EGP',
      symbolAr: 'ج.م',
      symbolEn: 'EGP',
      subtotalLocal: totals.subtotalEgp,
      taxLocal: totals.taxEgp,
      totalLocal: totals.totalEgp,
      displayPriceAr: `${totals.totalEgp} ج.م`,
      displayPriceEn: `EGP ${totals.totalEgp}`,
      arabiPayLimit,
      isBelowMinimum: isBelow,
      minimumDiff: diff,
    };
  }

  if (code === 'SA') {
    const isBelow = totals.totalSar < arabiPayLimit.minAmount;
    const diff = Math.max(0, arabiPayLimit.minAmount - totals.totalSar);
    return {
      countryCode: 'SA',
      countryNameAr: countryConfig.nameAr,
      countryNameEn: countryConfig.nameEn,
      currencyCode: 'SAR',
      symbolAr: 'ر.س',
      symbolEn: 'SAR',
      subtotalLocal: totals.subtotalSar,
      taxLocal: totals.taxSar,
      totalLocal: totals.totalSar,
      displayPriceAr: `${totals.totalSar} ر.س`,
      displayPriceEn: `SAR ${totals.totalSar}`,
      arabiPayLimit,
      isBelowMinimum: isBelow,
      minimumDiff: diff,
    };
  }

  if (arabiPayLimit.currencyCode === 'USD') {
    const isBelow = totals.totalUsd < arabiPayLimit.minAmount;
    const diff = Math.max(0, arabiPayLimit.minAmount - totals.totalUsd);
    const formatted = totals.totalUsd.toFixed(2);
    return {
      countryCode: code,
      countryNameAr: countryConfig.nameAr,
      countryNameEn: countryConfig.nameEn,
      currencyCode: 'USD',
      symbolAr: '$',
      symbolEn: 'USD',
      subtotalLocal: totals.subtotalUsd,
      taxLocal: totals.taxUsd,
      totalLocal: totals.totalUsd,
      displayPriceAr: `$${formatted} USD`,
      displayPriceEn: `$${formatted} USD`,
      arabiPayLimit,
      isBelowMinimum: isBelow,
      minimumDiff: diff,
    };
  }

  // Derive local rate based on USD total and country minimum limit anchor (e.g. minAmount / $14 USD)
  const approxRate = arabiPayLimit.minAmount / 14;
  const subtotalLocal = Math.ceil(totals.subtotalUsd * approxRate);
  const taxLocal = Math.ceil(totals.taxUsd * approxRate);
  const totalLocal = Math.ceil(totals.totalUsd * approxRate);
  const isBelow = totalLocal < arabiPayLimit.minAmount;
  const diff = Math.max(0, arabiPayLimit.minAmount - totalLocal);

  return {
    countryCode: code,
    countryNameAr: countryConfig.nameAr,
    countryNameEn: countryConfig.nameEn,
    currencyCode: arabiPayLimit.currencyCode,
    symbolAr: arabiPayLimit.symbolAr,
    symbolEn: arabiPayLimit.symbolEn,
    subtotalLocal,
    taxLocal,
    totalLocal,
    displayPriceAr: `${totalLocal} ${arabiPayLimit.symbolAr}`,
    displayPriceEn: `${totalLocal} ${arabiPayLimit.symbolEn}`,
    arabiPayLimit,
    isBelowMinimum: isBelow,
    minimumDiff: diff,
  };
}
