'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CreditCard,
  Smartphone,
  Bitcoin,
  Zap,
  CheckCircle2,
  Copy,
  ShieldCheck,
  Building,
  Building2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  ChevronDown,
  Lock,
  ExternalLink,
  Info,
  PhoneCall,
  Send,
  Globe,
  MessageSquare,
  Clock,
  Timer,
  Sparkles,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  Radio,
  ShoppingBag,
  Fingerprint,
  ScanFace
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useLocale } from '@/context/LocaleContext';
import { useToastStore } from '@/store/useToastStore';
import { useActiveArabOrderStore } from '@/store/useActiveArabOrderStore';
import { verifyBiometrics, detectBiometricDevice } from '@/utils/biometrics';
import { getClientTelemetry } from '@/utils/clientTelemetry';

const BiometricAuthModal = dynamic(
  () => import('@/components/checkout/BiometricAuthModal').then((mod) => mod.BiometricAuthModal),
  { ssr: false }
);
import {
  ARAB_COUNTRIES_PAYMENT_DATA,
  buildArabTelegramHelpUrl,
  ArabCountryConfig,
  ArabPaymentMethod,
  getArabiPayMinimum,
  ArabiPayLimit,
} from '@/utils/arabPaymentMethods';
import {
  calculateOrderTotals,
  calculateArabCountryPrice,
  TAX_RATE,
  EXCHANGE_RATES,
  CalculatedTotals,
} from '@/utils/pricing';

interface SmartPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{
    id?: string;
    product_id?: string;
    product?: any;
    variant_id?: string | null;
    variant?: any;
    quantity: number;
  }>;
  totalUsd: number;
  couponCode?: string;
  isWalletTopup?: boolean;
}

interface PaymentOption {
  id: string;
  category: 'egypt' | 'saudi' | 'global';
  nameAr: string;
  nameEn: string;
  subtitleAr: string;
  subtitleEn: string;
  badgeAr: string;
  badgeEn: string;
  badgeBg: string;
  brandBg: string;
  rowBg: string;
  selectedBg: string;
  icon: string;
  secondaryIcon?: string;
  currency: 'EGP' | 'SAR' | 'USD';
  exchangeRate: number;
  isComingSoon?: boolean;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  // GLOBAL & INTERNATIONAL
  {
    id: 'paypal',
    category: 'global',
    nameAr: 'بايبال (PayPal Direct Payment)',
    nameEn: 'PayPal Direct Payment',
    subtitleAr: 'دفع فوري مباشر عبر رابط بايبال الرسمي المعتمد',
    subtitleEn: 'Instant payment via official direct PayPal link',
    badgeAr: 'فوري 0% رسوم',
    badgeEn: 'Instant 0% Fee',
    badgeBg: 'bg-[#0079C1] text-white',
    brandBg: 'bg-[#003087]',
    rowBg: 'bg-[#EBF5FF]',
    selectedBg: 'bg-[#0079C1]',
    icon: '/images/payment/paypal.svg',
    currency: 'USD',
    exchangeRate: 1,
  },
  {
    id: 'arab_local_methods',
    category: 'global',
    nameAr: 'عربي باي (Arabi Pay)',
    nameEn: 'Arabi Pay',
    subtitleAr: 'بوابة الدفع العربي المباشر والسريع بالمحافظ والتحويلات لـ 22 دولة',
    subtitleEn: 'Express direct Arab payment via mobile wallets & instant bank transfers',
    badgeAr: 'دفع عربي فوري',
    badgeEn: 'Arabi Pay',
    badgeBg: 'bg-[#FFE600] text-black',
    brandBg: 'bg-black',
    rowBg: 'bg-[#F4FDF7]',
    selectedBg: 'bg-[#FFE600]',
    icon: '/images/payment/arabipay.png',
    currency: 'USD',
    exchangeRate: 1,
  },
  {
    id: 'lemonsqueezy',
    category: 'global',
    nameAr: 'بطاقات بنكية (Visa / MasterCard)',
    nameEn: 'Bank Cards (Visa & MasterCard)',
    subtitleAr: 'البوابة البنكية تخضع للتحديث والتطوير — ستفتح قريباً',
    subtitleEn: 'Bank cards gateway is under upgrade — Opening soon',
    badgeAr: 'سيفتح قريباً',
    badgeEn: 'Opening Soon',
    badgeBg: 'bg-[#FFE600] text-black border border-black',
    brandBg: 'bg-white',
    rowBg: 'bg-[#FFFDF0]',
    selectedBg: 'bg-[#FFE600]',
    icon: '/images/payment/visa.svg',
    secondaryIcon: '/images/payment/mastercard.svg',
    currency: 'USD',
    exchangeRate: 1,
    isComingSoon: true,
  },

  // EGYPT LOCAL METHODS
  {
    id: 'vodafone_cash',
    category: 'egypt',
    nameAr: 'فودافون كاش (Vodafone Cash)',
    nameEn: 'Vodafone Cash',
    subtitleAr: 'تحويل فوري مباشر عبر محفظة فودافون كاش وكافة المحافظ المصرية',
    subtitleEn: 'Instant transfer via Vodafone Cash & Egyptian mobile wallets',
    badgeAr: 'فوري 0% رسوم',
    badgeEn: 'Instant 0%',
    badgeBg: 'bg-[#E60000] text-white',
    brandBg: 'bg-[#E60000]',
    rowBg: 'bg-[#FFF2F2]',
    selectedBg: 'bg-[#E60000]',
    icon: '/images/payment/vodafone.svg',
    currency: 'EGP',
    exchangeRate: 53,
    isComingSoon: false,
  },
  {
    id: 'instapay',
    category: 'egypt',
    nameAr: 'إنستاباي (InstaPay)',
    nameEn: 'InstaPay Egypt',
    subtitleAr: 'تحويل لحظي مباشر عبر منظومة إنستاباي',
    subtitleEn: 'Instant transfer via InstaPay network',
    badgeAr: 'تحويل لحظي',
    badgeEn: 'Instant IPA',
    badgeBg: 'bg-[#4F008C] text-white',
    brandBg: 'bg-white',
    rowBg: 'bg-[#F9F3FF]',
    selectedBg: 'bg-[#4F008C]',
    icon: '/images/payment/instapay.png',
    currency: 'EGP',
    exchangeRate: 53,
  },
  {
    id: 'orange_cash',
    category: 'egypt',
    nameAr: 'أورنج كاش',
    nameEn: 'Orange Cash',
    subtitleAr: 'محفظة أورنج كاش — ستتوفر قريباً',
    subtitleEn: 'Orange Cash — Coming soon',
    badgeAr: 'ستتوفر قريباً',
    badgeEn: 'Coming Soon',
    badgeBg: 'bg-[#FFE600] text-black border border-black',
    brandBg: 'bg-black',
    rowBg: 'bg-[#FFF5EB]',
    selectedBg: 'bg-[#FF7900]',
    icon: '/images/payment/orange.png',
    currency: 'EGP',
    exchangeRate: 53,
    isComingSoon: true,
  },

  // SAUDI ARABIA LOCAL METHODS
  {
    id: 'stc_pay',
    category: 'saudi',
    nameAr: 'محفظة STC Pay',
    nameEn: 'STC Pay',
    subtitleAr: 'تحويل فوري بالريال السعودي عبر رقم المحفظة',
    subtitleEn: 'Direct instant transfer in SAR via STC Pay',
    badgeAr: 'محفظة STC',
    badgeEn: 'Instant SAR',
    badgeBg: 'bg-[#4F008C] text-white',
    brandBg: 'bg-[#4F008C]',
    rowBg: 'bg-[#F9F3FF]',
    selectedBg: 'bg-[#4F008C]',
    icon: '/images/payment/stcpay.svg',
    currency: 'SAR',
    exchangeRate: 4,
  },
  {
    id: 'alrajhi',
    category: 'saudi',
    nameAr: 'مصرف الراجحي',
    nameEn: 'Al Rajhi Bank',
    subtitleAr: 'تحويل بنكي فوري بالريال السعودي عبر الآيبان',
    subtitleEn: 'Direct IBAN transfer in SAR',
    badgeAr: 'مصرف الراجحي',
    badgeEn: 'Direct IBAN',
    badgeBg: 'bg-[#0077C8] text-white',
    brandBg: 'bg-[#002D62]',
    rowBg: 'bg-[#EDF6FD]',
    selectedBg: 'bg-[#002D62]',
    icon: '/images/payment/alrajhi.svg',
    currency: 'SAR',
    exchangeRate: 4,
  },
];

export function SmartPaymentModal({ isOpen, onClose, items, totalUsd, couponCode, isWalletTopup }: SmartPaymentModalProps) {
  const { language, country, mounted } = useLocale();
  const isAr = mounted && language === 'ar';

  const isWalletTopupMode = Boolean(
    isWalletTopup ||
    (Array.isArray(items) && items.some(i => i.product_id === 'wallet_topup' || i.id === 'wallet_topup' || i.product?.id === 'wallet_topup' || i.product?.delivery_mode === 'wallet_topup'))
  );

  const [selectedMethodId, setSelectedMethodId] = useState<string>('stripe');
  const [bybitNetwork, setBybitNetwork] = useState<'UID' | 'TRC20' | 'BEP20' | 'TON'>('UID');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [egyptianPhone, setEgyptianPhone] = useState('01010101010');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [egCarrier, setEgCarrier] = useState<'vodafone' | 'orange' | 'etisalat' | 'we'>('vodafone');
  const [selectedArabCountryCode, setSelectedArabCountryCode] = useState<string>('SA');
  const [selectedArabMethodId, setSelectedArabMethodId] = useState<string>('sa_stc');
  const [isNotifyingArab, setIsNotifyingArab] = useState(false);
  const [isArabCountryMenuOpen, setIsArabCountryMenuOpen] = useState(false);
  const [arabCountrySearch, setArabCountrySearch] = useState('');
  const [isArabiPayBoosted, setIsArabiPayBoosted] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'local' | 'global'>('local');
  const [modalStep, setModalStep] = useState<'select' | 'details'>('select');
  const [isBiometricAuthOpen, setIsBiometricAuthOpen] = useState(false);
  const [arabiPayTermsAgreed, setArabiPayTermsAgreed] = useState(false);
  const [userStrikes, setUserStrikes] = useState<number>(0);
  const [userBanned, setUserBanned] = useState<boolean>(false);
  const [userBanReason, setUserBanReason] = useState<string | null>(null);
  
  // Live Arab Support Bridge & 60-Minute Countdown State
  const [activeArabOrder, setActiveArabOrder] = useState<{
    orderId: string;
    sessionId: string;
    countryName: string;
    flagUrl: string;
    methodName: string;
    displayPrice: string;
    startedAt: number;
    isFulfilled: boolean;
    deliveredKey?: string | null;
  } | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(3600);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [enabledGateways, setEnabledGateways] = useState<Record<string, boolean>>({});

  // Auth Guard: Unauthenticated users are not permitted to access payment modal
  useEffect(() => {
    if (!isOpen) return;
    const verifyAuth = async () => {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          onClose();
          const currentPath = window.location.pathname + window.location.search;
          window.location.href = `/auth/login?next=${encodeURIComponent(currentPath)}`;
          return;
        }

        // Fetch user profile for strikes & ban state
        const { data: profile } = await supabase
          .from('profiles')
          .select('strike_count, is_banned, ban_reason, phone, is_phone_blacklisted')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          const strikes = Number(profile.strike_count || 0);
          const isBanned = Boolean(profile.is_banned || strikes >= 2 || profile.is_phone_blacklisted);
          setUserStrikes(strikes);
          setUserBanned(isBanned);
          setUserBanReason(profile.ban_reason || null);
          if (profile.phone) {
            setEgyptianPhone(profile.phone);
          }
        }
      } catch {
        // ignore
      }
    };
    verifyAuth();
  }, [isOpen, onClose]);

  useEffect(() => {
    fetch('/api/checkout/gateways')
      .then((res) => res.json())
      .then((data) => {
        if (data?.enabledGateways) {
          setEnabledGateways(data.enabledGateways);
        }
      })
      .catch(() => {});
  }, []);

  // 1-second countdown ticker for Live Support Bridge with auto-dismiss on timeout (Strike & cleanup)
  useEffect(() => {
    if (!activeArabOrder || activeArabOrder.isFulfilled) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeArabOrder.startedAt) / 1000);
      const remaining = 3600 - elapsed;

      if (remaining <= 0) {
        // Time ran out: cancel order, log strike, clear store, and close modal
        try {
          fetch('/api/checkout/arab-local-timeout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: activeArabOrder.orderId,
              sessionId: activeArabOrder.sessionId,
            }),
          }).catch(() => {});
        } catch (e) {}

        setActiveArabOrder(null);
        useActiveArabOrderStore.getState().clearActiveOrder();
        useToastStore.getState().error(
          isAr
            ? 'انتهت مهلة السداد (60 دقيقة). تم إلغاء الطلب وتسجيل إنذار عدم السداد على حسابك.'
            : 'Payment window (60m) expired. Order cancelled and strike recorded.',
          isAr ? 'انتهاء مهلة السداد' : 'Payment Timed Out'
        );
        onClose();
        return;
      }

      setCountdownSeconds(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeArabOrder, isAr, onClose]);

  // 3.5-second real-time polling to /api/orders/track
  useEffect(() => {
    if (!activeArabOrder) return;
    if (activeArabOrder.isFulfilled && activeArabOrder.deliveredKey && activeArabOrder.deliveredKey !== 'CONFIRMED_AWAITING_KEY') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/track?session_id=${encodeURIComponent(activeArabOrder.sessionId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const ord = data.order || (Array.isArray(data.orders) ? data.orders[0] : null);
        if (ord) {
          if (
            ord.status === 'completed' ||
            (ord.product_key &&
              ord.product_key !== 'PENDING_SUPPORT_DISPATCH' &&
              ord.product_key !== 'PENDING_FULFILLMENT' &&
              ord.product_key !== 'CONFIRMED_AWAITING_KEY' &&
              ord.product_key !== 'UNPAID_CANCELLED' &&
              ord.product_key !== 'TIMEOUT_EXPIRED')
          ) {
            setActiveArabOrder((prev) =>
              prev
                ? {
                    ...prev,
                    isFulfilled: true,
                    deliveredKey: ord.product_key,
                  }
                : null
            );
            useActiveArabOrderStore.getState().updateFulfillment(ord.product_key);
          } else if (
            ord.status === 'pending_fulfillment' ||
            ord.product_key === 'CONFIRMED_AWAITING_KEY'
          ) {
            setActiveArabOrder((prev) =>
              prev
                ? {
                    ...prev,
                    isFulfilled: true,
                    deliveredKey: 'CONFIRMED_AWAITING_KEY',
                  }
                : null
            );
            useActiveArabOrderStore.getState().updateFulfillment('CONFIRMED_AWAITING_KEY');
          } else if (
            ord.status === 'cancelled' ||
            ord.product_key === 'UNPAID_CANCELLED' ||
            ord.product_key === 'TIMEOUT_EXPIRED'
          ) {
            setActiveArabOrder(null);
            useActiveArabOrderStore.getState().clearActiveOrder();
            useToastStore.getState().error(
              isAr
                ? 'تم إلغاء الطلب وتسجيل الإنذار على حسابك لعدم إتمام السداد.'
                : 'Order was cancelled and a strike was recorded due to non-payment.',
              isAr ? 'إنذار لعدم السداد' : 'Non-Payment Strike'
            );
            onClose();
          }
        }
      } catch (e) {
        // silent
      }
    }, 3500);

    return () => clearInterval(pollInterval);
  }, [activeArabOrder, isAr, onClose]);

  // Filter available options based on country/region & dynamic admin settings
  const availableOptions = React.useMemo(() => {
    const isMethodEnabled = (id: string, cat: string) => {
      if (isWalletTopupMode && (id === 'wallet' || id === 'upstore_wallet')) return false;
      if (enabledGateways[id] === false) return false;
      if (cat === 'egypt' && enabledGateways.egypt_manual === false) return false;
      if (cat === 'saudi' && enabledGateways.saudi_manual === false) return false;
      return true;
    };

    let base: PaymentOption[] = [];
    if (country === 'EG') {
      base = [
        ...PAYMENT_OPTIONS.filter((o) => o.category === 'egypt'),
        ...PAYMENT_OPTIONS.filter((o) => o.category === 'global'),
      ];
    } else if (country === 'SA') {
      base = [
        ...PAYMENT_OPTIONS.filter((o) => o.category === 'saudi'),
        ...PAYMENT_OPTIONS.filter((o) => o.category === 'global'),
      ];
    } else {
      // US / Global - all global methods
      base = PAYMENT_OPTIONS.filter((o) => o.category === 'global');
    }

    const filtered = base.filter((o) => isMethodEnabled(o.id, o.category));
    return filtered.length > 0 ? filtered : base;
  }, [country, enabledGateways]);

  // Auto-select best method on country change
  useEffect(() => {
    if (availableOptions.length > 0 && !availableOptions.some((o) => o.id === selectedMethodId)) {
      setSelectedMethodId(availableOptions[0].id);
    } else if (!selectedMethodId) {
      if (country === 'EG') {
        setSelectedMethodId('instapay');
      } else if (country === 'SA') {
        setSelectedMethodId('stc_pay');
      } else {
        setSelectedMethodId('paypal');
      }
    }
  }, [country, availableOptions, selectedMethodId]);

  // Auto-sync selected Arab country with user's detected country (places user's country first)
  useEffect(() => {
    if (country) {
      const match = ARAB_COUNTRIES_PAYMENT_DATA.find((c) => c.code === country);
      if (match) {
        setSelectedArabCountryCode(match.code);
        if (match.popularMethods.length > 0) {
          setSelectedArabMethodId(match.popularMethods[0].id);
        }
      }
    }
  }, [country]);

  // Reset modal step and state when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedArabOrder = useActiveArabOrderStore.getState().activeOrder;
      if (savedArabOrder && !savedArabOrder.isFulfilled) {
        setActiveArabOrder(savedArabOrder);
        const elapsed = Math.floor((Date.now() - savedArabOrder.startedAt) / 1000);
        setCountdownSeconds(Math.max(0, 3600 - elapsed));
      } else {
        setModalStep('select');
        setActiveArabOrder(null);
      }
      setErrorMessage(null);
      setIsArabiPayBoosted(false);
    }
  }, [isOpen]);

  const handleModalClose = () => {
    const currentOrder = useActiveArabOrderStore.getState().activeOrder || activeArabOrder;
    if (currentOrder && !currentOrder.isFulfilled) {
      useActiveArabOrderStore.getState().closeModal(true, isAr);
    }
    onClose();
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption =
    availableOptions.find((opt) => opt.id === selectedMethodId) ||
    availableOptions[0] ||
    PAYMENT_OPTIONS[0];

  // Robust price calculation with single-source-of-truth pricing engine
  const orderPricing = React.useMemo<CalculatedTotals>(() => {
    return calculateOrderTotals(items, couponCode, totalUsd);
  }, [items, couponCode, totalUsd]);

  const egpAmount = String(orderPricing.totalEgp);
  const sarAmount = String(orderPricing.totalSar);
  const usdAmount = orderPricing.totalUsd.toFixed(2);

  const displayPrice =
    activeOption.currency === 'EGP'
      ? `${egpAmount} ج.م`
      : activeOption.currency === 'SAR'
      ? `${sarAmount} ر.س`
      : `$${usdAmount} ${selectedMethodId === 'bybit' || selectedMethodId === 'binance_pay' ? 'USDT' : 'USD'}`;

  // Arab country localized pricing calculation with 5% VAT & coupon
  const arabCountryPrice = React.useMemo(() => {
    const targetCode = selectedArabCountryCode || country || 'SA';
    return calculateArabCountryPrice(targetCode, orderPricing, isAr);
  }, [selectedArabCountryCode, country, orderPricing, isAr]);

  const arabiPayLimit = arabCountryPrice.arabiPayLimit;
  const isArabiPayBelowMin = arabCountryPrice.isBelowMinimum;
  const arabiPayDiff = arabCountryPrice.minimumDiff;
  const currentArabOrderAmount = arabCountryPrice.totalLocal;

  const effectiveArabDisplayPrice = React.useMemo(() => {
    if (isArabiPayBoosted) {
      return `${arabiPayLimit.minAmount} ${isAr ? arabiPayLimit.symbolAr : arabiPayLimit.symbolEn}`;
    }
    return isAr ? arabCountryPrice.displayPriceAr : arabCountryPrice.displayPriceEn;
  }, [isArabiPayBoosted, arabiPayLimit, arabCountryPrice, isAr]);

  // Check if detected user is Egyptian or Arab
  const isArabOrEgyptian = React.useMemo(() => {
    if (!country) return true;
    if (country === 'EG' || country === 'SA') return true;
    return ARAB_COUNTRIES_PAYMENT_DATA.some((c) => c.code === country);
  }, [country]);

  // Detected country name for friendly display
  const detectedArabCountryName = React.useMemo(() => {
    if (country === 'EG') return isAr ? 'مصر' : 'Egypt';
    if (country === 'SA') return isAr ? 'المملكة العربية السعودية' : 'Saudi Arabia';
    const found = ARAB_COUNTRIES_PAYMENT_DATA.find((c) => c.code === country);
    if (found) return isAr ? found.nameAr : found.nameEn;
    return isAr ? 'الدول العربية' : 'Arab Countries';
  }, [country, isAr]);

  // Detected user country config for flag & popular methods
  const detectedUserCountryConfig = React.useMemo(() => {
    if (!country) return null;
    return ARAB_COUNTRIES_PAYMENT_DATA.find((c) => c.code === country) || null;
  }, [country]);

  // Sorted Arab countries with user's detected country pinned to position #1
  const sortedArabCountries = React.useMemo(() => {
    const targetCode = selectedArabCountryCode || country || 'SA';
    const current = ARAB_COUNTRIES_PAYMENT_DATA.find((c) => c.code === targetCode);
    const others = ARAB_COUNTRIES_PAYMENT_DATA.filter((c) => c.code !== targetCode);
    return current ? [current, ...others] : ARAB_COUNTRIES_PAYMENT_DATA;
  }, [selectedArabCountryCode, country]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    useToastStore.getState().success(
      isAr ? 'تم النسخ بنجاح!' : 'Copied to clipboard!',
      text
    );
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDialUssd = (ussdCode: string) => {
    navigator.clipboard.writeText(ussdCode);
    setCopiedKey('ussd_code');
    useToastStore.getState().success(
      isAr ? 'تم نسخ كود التحويل وفتح لوحة الاتصال' : 'USSD code copied & dialer opened',
      ussdCode
    );
    const telUrl = `tel:${ussdCode.replace(/#/g, '%23')}`;
    window.location.href = telUrl;
  };

  // ─── ACTIVE COUNTDOWN LOCK GUARD ───
  const checkActiveCountdownGuard = (): boolean => {
    const hasActiveCountdown = useActiveArabOrderStore.getState().hasActiveCountdown();
    const currentOrder = useActiveArabOrderStore.getState().activeOrder;
    if (hasActiveCountdown && currentOrder) {
      useToastStore.getState().error(
        isAr
          ? `لديك طلب دفع محلي قيد المتابعة والعد التنازلي حالياً (#${currentOrder.orderId}). لا يمكن بدء عملية شراء جديدة حتى إتمام الطلب الحالي أو انتهاء مهلة العداد.`
          : `You have an active local payment order counting down (#${currentOrder.orderId}). Please complete your current order before starting a new one.`,
        isAr ? 'يوجد طلب قيد المتابعة والعد' : 'Active Order In Progress'
      );
      setActiveArabOrder(currentOrder);
      return true;
    }
    return false;
  };

  // ─── CHECKOUT HANDLERS ───

  // 0. UpStore Digital Wallet Direct Checkout (0ms instant execution)
  const handleDirectWalletCheckout = async () => {
    if (checkActiveCountdownGuard()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const bio = await verifyBiometrics();
      if (!bio) {
        setErrorMessage(isAr ? 'تم إلغاء التحقق البيومتري' : 'Biometric check cancelled');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/checkout/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, currency: 'usd', couponCode, totalUsd: orderPricing.totalUsd }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage(data.error || (isAr ? 'فشل إتمام الدفع عبر المحفظة' : 'Wallet checkout failed'));
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing wallet checkout');
      setLoading(false);
    }
  };

  // 1. Stripe Checkout
  const handleStripeCheckout = async () => {
    if (checkActiveCountdownGuard()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const bio = await verifyBiometrics();
      if (!bio) {
        setErrorMessage(isAr ? 'تم إلغاء التحقق البيومتري' : 'Biometric check cancelled');
        setLoading(false);
        return;
      }

      const currency = country === 'EG' ? 'egp' : country === 'SA' ? 'sar' : 'usd';
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, currency, language, couponCode, totalUsd: orderPricing.totalUsd, isWalletTopup: isWalletTopupMode }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Fallback directly to Lemon Squeezy (supports Visa, MasterCard, Apple Pay, PayPal)
        await handleLemonSqueezyCheckout();
      }
    } catch (err: any) {
      await handleLemonSqueezyCheckout();
    }
  };

  // 2. Bybit Suite Checkout (UID, TRC20, BEP20, TON)
  const handleBybitCheckout = async () => {
    if (checkActiveCountdownGuard()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const bio = await verifyBiometrics();
      if (!bio) {
        setErrorMessage(isAr ? 'تم إلغاء التحقق البيومتري' : 'Biometric check cancelled');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/checkout/bybit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          network: bybitNetwork,
          p2pMethod: `bybit_${bybitNetwork.toLowerCase()}`,
          couponCode,
          totalUsd: orderPricing.totalUsd,
          isWalletTopup: isWalletTopupMode,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage(data.error || (isAr ? 'فشل إنشاء جلسة Bybit' : 'Failed to create Bybit session'));
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating Bybit session');
      setLoading(false);
    }
  };

  // 3. Local / Manual Checkout (Saudi / Binance Pay)
  const handleLocalCheckout = async (localMethod: string, currency: 'egp' | 'sar' | 'usd') => {
    if (checkActiveCountdownGuard()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const bio = await verifyBiometrics();
      if (!bio) {
        setErrorMessage(isAr ? 'تم إلغاء التحقق البيومتري' : 'Biometric check cancelled');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/checkout/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          currency,
          paymentMethod: localMethod,
          couponCode,
          totalUsd: orderPricing.totalUsd,
          isWalletTopup: isWalletTopupMode,
          clientTelemetry: getClientTelemetry(),
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage(data.error || (isAr ? 'فشل إنشاء الطلب' : 'Failed to initiate order'));
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating order');
      setLoading(false);
    }
  };

  // 4. Automated Paymob Checkout (Vodafone Cash, InstaPay)
  const handlePaymobCheckout = async (methodKey: string) => {
    if (checkActiveCountdownGuard()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const bio = await verifyBiometrics();
      if (!bio) {
        setErrorMessage(isAr ? 'تم إلغاء التحقق البيومتري' : 'Biometric check cancelled');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/checkout/paymob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          paymentMethod: methodKey,
          phone: egyptianPhone || '01010101010',
          couponCode,
          totalUsd: orderPricing.totalUsd,
          isWalletTopup: isWalletTopupMode,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage(data.error || (isAr ? 'فشل إنشاء جلسة الدفع' : 'Failed to create payment session'));
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || (isAr ? 'حدث خطأ في الاتصال بالبوابة' : 'Error connecting to payment gateway'));
      setLoading(false);
    }
  };

  // 5. Automated Cryptomus Checkout (Visa, Mastercard, Apple Pay, 100+ Cryptos)
  const handleCryptomusCheckout = async () => {
    if (checkActiveCountdownGuard()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const bio = await verifyBiometrics();
      if (!bio) {
        setErrorMessage(isAr ? 'تم إلغاء التحقق البيومتري' : 'Biometric check cancelled');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/checkout/cryptomus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          currency: 'USD',
          couponCode,
          totalUsd: orderPricing.totalUsd,
          isWalletTopup: isWalletTopupMode,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage(data.error || (isAr ? 'فشل إنشاء فاتورة الدفع عبر Cryptomus' : 'Failed to create Cryptomus invoice'));
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || (isAr ? 'حدث خطأ في الاتصال ببوابة Cryptomus' : 'Error connecting to Cryptomus gateway'));
      setLoading(false);
    }
  };

  // 6. Automated NOWPayments Checkout (300+ Cryptos & Cards)
  const handleNowPaymentsCheckout = async () => {
    if (checkActiveCountdownGuard()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const bio = await verifyBiometrics();
      if (!bio) {
        setErrorMessage(isAr ? 'تم إلغاء التحقق البيومتري' : 'Biometric check cancelled');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/checkout/nowpayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          currency: 'USD',
          couponCode,
          totalUsd: orderPricing.totalUsd,
          isWalletTopup: isWalletTopupMode,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage(data.error || (isAr ? 'فشل إنشاء فاتورة الدفع عبر NOWPayments' : 'Failed to create NOWPayments invoice'));
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || (isAr ? 'حدث خطأ في الاتصال ببوابة NOWPayments' : 'Error connecting to NOWPayments gateway'));
      setLoading(false);
    }
  };

  // 7. Automated Lemon Squeezy Checkout (Global Cards, Apple Pay, Google Pay, PayPal)
  const handleLemonSqueezyCheckout = async () => {
    if (checkActiveCountdownGuard()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const bio = await verifyBiometrics();
      if (!bio) {
        setErrorMessage(isAr ? 'تم إلغاء التحقق البيومتري' : 'Biometric check cancelled');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/checkout/lemonsqueezy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          currency: activeOption.currency || 'USD',
          totalUsd: orderPricing.totalUsd,
          couponCode: couponCode,
          isWalletTopup: isWalletTopupMode,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage(data.error || (isAr ? 'فشل إنشاء فاتورة الدفع عبر Lemon Squeezy' : 'Failed to create Lemon Squeezy checkout'));
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || (isAr ? 'حدث خطأ في الاتصال ببوابة Lemon Squeezy' : 'Error connecting to Lemon Squeezy'));
      setLoading(false);
    }
  };

  const handleConnectArabTelegramSupport = async (biometricVerified: boolean = false) => {
    if (checkActiveCountdownGuard()) return;
    setIsNotifyingArab(true);
    try {
      const currentCountry =
        ARAB_COUNTRIES_PAYMENT_DATA.find((c) => c.code === selectedArabCountryCode) ||
        ARAB_COUNTRIES_PAYMENT_DATA[0];
      const currentMethod =
        currentCountry.popularMethods.find((m) => m.id === selectedArabMethodId) ||
        currentCountry.popularMethods[0];

      const itemsList = items.map((it) => ({
        product_id: it.product_id || it.product?.id,
        variant_id: it.variant_id || it.variant?.id,
        name: isWalletTopupMode ? (isAr ? 'شحن رصيد محفظة UpStore' : 'UpStore Wallet Top-Up') : (it.product?.name_ar || it.product?.name || 'منتج رقمي'),
        quantity: it.quantity || 1,
        amount: Number(it.product?.our_price ?? it.product?.price ?? totalUsd ?? 0) * (it.quantity || 1),
      }));

      // 1. Create real database order & dispatch background alert to @UpStore_payment_bot
      let orderRef = `UP-${Date.now().toString().slice(-6)}`;
      let finalSessionId = `arab_${orderRef}`;
      const boostUserNote = isArabiPayBoosted
        ? `تطبيق الحد الأدنى: شحن رصيد فائض ${arabiPayDiff} ${arabiPayLimit.symbolAr} في محفظة العميل`
        : '';

      try {
        const res = await fetch('/api/checkout/arab-local-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            countryName: isAr ? currentCountry.nameAr : currentCountry.nameEn,
            countryFlag: currentCountry.flagUrl,
            methodName: isAr ? currentMethod.nameAr : currentMethod.nameEn,
            methodId: currentMethod.id,
            displayPrice: effectiveArabDisplayPrice,
            items: itemsList,
            totalUsd: orderPricing.totalUsd,
            userNote: boostUserNote,
            phone: egyptianPhone || undefined,
            biometricVerified: biometricVerified,
            isWalletTopup: isWalletTopupMode,
            clientTelemetry: getClientTelemetry(),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.orderId) orderRef = data.orderId;
          if (data.sessionId) finalSessionId = data.sessionId;
        } else {
          const data = await res.json().catch(() => ({}));
          if (data?.banned || res.status === 403) {
            setUserBanned(true);
            setErrorMessage(data.message || (isAr ? 'حسابك محظور من استخدام Arabi Pay.' : 'Account banned from Arabi Pay.'));
            return;
          }
        }
      } catch (err) {
        console.warn('[Arab Notify Warning]:', err);
      }

      // 2. Open Telegram @UpStore_help directly with prefilled parameters & real order ref
      const telegramUrl = buildArabTelegramHelpUrl({
        country: currentCountry,
        selectedMethod: currentMethod,
        items: itemsList,
        displayPrice: effectiveArabDisplayPrice,
        isArabic: isAr,
        orderRef: orderRef,
        isBoosted: isArabiPayBoosted,
        walletTopupAmount: isArabiPayBoosted ? `${arabiPayDiff} ${arabiPayLimit.symbolAr}` : undefined,
      });

      window.open(telegramUrl, '_blank');

      // 3. Switch to Live Support Bridge & Countdown view & Persist in Global Store
      const arabOrderPayload = {
        orderId: orderRef,
        sessionId: finalSessionId,
        countryName: isAr ? currentCountry.nameAr : currentCountry.nameEn,
        countryCode: currentCountry.code,
        flagUrl: currentCountry.flagUrl,
        methodName: isAr ? currentMethod.nameAr : currentMethod.nameEn,
        methodId: currentMethod.id,
        displayPrice,
        startedAt: Date.now(),
        isFulfilled: false,
        deliveredKey: null,
        telegramUrl: telegramUrl,
        items: itemsList,
        totalUsd: orderPricing.totalUsd,
      };

      setActiveArabOrder(arabOrderPayload);
      useActiveArabOrderStore.getState().setActiveOrder(arabOrderPayload);
      setCountdownSeconds(3600);
    } finally {
      setIsNotifyingArab(false);
    }
  };

  const handleProceed = () => {
    if (checkActiveCountdownGuard()) return;
    if (selectedMethodId === 'paypal') {
      handleLocalCheckout('paypal', 'usd');
    } else if (selectedMethodId === 'arab_local_methods') {
      if (userBanned) {
        useToastStore.getState().error(
          isAr ? 'حسابك محظور من استخدام Arabi Pay' : 'Account Banned from Arabi Pay',
          userBanReason || (isAr ? 'تم حظر حسابك لتكرار مخالفات عدم السداد (2 Strikes). يرجى مراجعة الدعم الفني للاستئناف.' : 'Account is banned for non-payment strikes.')
        );
        return;
      }
      if (!arabiPayTermsAgreed) {
        useToastStore.getState().error(
          isAr ? 'يجب الموافقة على الشروط أولاً' : 'Agreement Required',
          isAr ? 'يرجى تفعيل خيار الموافقة على شروط الالتزام وسياسة الإنذارات بالأسفل للمتابعة.' : 'Please check the agreement box below to confirm your commitment.'
        );
        return;
      }
      // Open Smart Biometrics Modal for confirmation
      setIsBiometricAuthOpen(true);
    } else if (selectedMethodId === 'lemonsqueezy') {
      useToastStore.getState().info(
        isAr ? 'البوابة البنكية تخضع للتحديث والتطوير دورياً — ستفتح قريباً' : 'Bank cards gateway is under upgrade and will open soon',
        isAr ? 'تم توجيهك إلى بايبال المباشر أو يمكنك اختيار الدفع بـ Arabi Pay' : 'Redirected to PayPal or you can choose Arabi Pay'
      );
      setSelectedMethodId('paypal');
      return;
    } else if (selectedMethodId === 'orange_cash') {
      handleLocalCheckout('orange_cash', 'egp');
    } else if (selectedMethodId === 'vodafone_cash') {
      handleLocalCheckout('vodafone_cash', 'egp');
    } else if (selectedMethodId === 'wallet' || selectedMethodId === 'upstore_wallet') {
      handleDirectWalletCheckout();
    } else if (selectedMethodId === 'stripe') {
      handleStripeCheckout();
    } else if (selectedMethodId === 'instapay') {
      handleLocalCheckout('instapay', 'egp');
    } else if (selectedMethodId === 'stc_pay') {
      handleLocalCheckout('stc_pay', 'sar');
    } else if (selectedMethodId === 'alrajhi') {
      handleLocalCheckout('alrajhi', 'sar');
    } else {
      handleLemonSqueezyCheckout();
    }
  };

  const getWhatsAppDeliveryUrl = () => {
    const itemsSummary = items
      .map((it) => `${it.product?.name_ar || it.product?.name || 'منتج رقمي'} (x${it.quantity})`)
      .join('، ');

    const msg = isAr
      ? `مرحباً خدمة تسليم UpStore،
أرغب في تأكيد ومتابعة تسليم طلبي:
• المنتجات: ${itemsSummary || 'طلب رقمي'}
• المبلغ: ${displayPrice}
• وسيلة الدفع: ${activeOption.nameAr}
(مرفق صورة إيصال التحويل للاعتماد والتسليم المباشر)`
      : `Hello UpStore Delivery Support,
I would like to process my order delivery:
• Items: ${itemsSummary || 'Digital Order'}
• Total: ${displayPrice}
• Payment Method: ${activeOption.nameEn}
(Attaching payment receipt for dispatch)`;

    return `https://t.me/UPSTORE_HELP?text=${encodeURIComponent(msg)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        className="bg-[#FFFDF9] border-[2.5px] sm:border-[3px] border-black max-w-lg w-full rounded-2xl sm:rounded-3xl shadow-[6px_6px_0px_0px_#000] sm:shadow-[10px_10px_0px_0px_#000] text-black my-auto max-h-[94dvh] sm:max-h-[88vh] flex flex-col font-sans select-none overflow-hidden"
      >
        {/* ─── Sticky Header ─── */}
        <div className="shrink-0 bg-white border-b-2 sm:border-b-[3px] border-black p-3.5 sm:p-4 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {modalStep === 'details' && !activeArabOrder && (
              <button
                type="button"
                onClick={() => setModalStep('select')}
                className="px-2.5 py-1 sm:px-3 sm:py-1 bg-white hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-1 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer transition-all shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[3] rtl:rotate-180" />
                <span>{isAr ? 'الوسائل' : 'Methods'}</span>
              </button>
            )}
            <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-[#FFE600] border-2 border-black rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1.5 shrink-0">
              <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isWalletTopupMode ? (isAr ? 'شحن رصيد المحفظة' : 'Wallet Top-Up') : (isAr ? 'بوابة الدفع الإلكتروني' : 'Secure Checkout')}</span>
            </span>
            <h2 className="text-xs sm:text-sm font-black text-black truncate">
              {activeArabOrder
                ? (isAr ? 'متابعة الطلب مع الدعم' : 'Support Live Bridge')
                : modalStep === 'select'
                ? (isAr ? 'اختر وسيلة الدفع' : 'Choose Payment Method')
                : (isAr ? 'تفاصيل إتمام الدفع' : 'Payment Details')}
            </h2>
          </div>

          {/* Close Button */}
          <button
            onClick={handleModalClose}
            className="p-1.5 sm:p-2 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* ─── Scrollable Body with Smart Neubrutalism Scrollbar ─── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 overscroll-contain scrollbar-thin scrollbar-thumb-black scrollbar-track-neutral-100">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-100 border-2 border-black text-xs font-black text-rose-900 shadow-[3px_3px_0px_0px_#000]">
              {errorMessage}
            </div>
          )}

          {activeArabOrder ? (
            /* ─── LIVE 60-MIN ARAB SUPPORT DISPATCH SCREEN ─── */
            <div className="space-y-3.5 sm:space-y-4 text-start animate-in fade-in zoom-in-95 duration-200">
              {/* Live Pulsing Radar Bar */}
              <div className="p-3 sm:p-3.5 bg-[#064E3B] text-white border-2 border-black rounded-xl sm:rounded-2xl flex items-center justify-between shadow-[3px_3px_0px_0px_#000]">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      {activeArabOrder.isFulfilled
                        ? (isAr ? 'تم اعتماد وتسليم طلبك بنجاح!' : 'Order Fulfilled Successfully!')
                        : (isAr ? 'جاري المتابعة مع مسؤول الدعم المباشر' : 'Live Support Dispatch In Progress')}
                    </h4>
                    <p className="text-[10px] text-emerald-200 font-bold">
                      {activeArabOrder.isFulfilled
                        ? (isAr ? 'بيانات التفعيل جاهزة للاستخدام الآن' : 'Your digital key is ready')
                        : (isAr ? 'تم إشعار الفريق وتجهيز حساب التحويل لدولتك' : 'Team alerted, preparing payment info')}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[#FFE600] text-black border border-black rounded-lg text-[11px] sm:text-xs font-mono font-black shadow-[1px_1px_0px_0px_#000] shrink-0">
                  #{activeArabOrder.orderId}
                </span>
              </div>

              {/* 60-Minute Countdown Clock & Live Pulse (Stops when fulfilled) */}
              {!activeArabOrder.isFulfilled ? (
                <div className="p-4 sm:p-5 bg-[#FFF9E6] border-2 border-black rounded-2xl shadow-[3.5px_3.5px_0px_0px_#000] text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-xs font-black text-neutral-800">
                    <Timer className="w-4 h-4 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>{isAr ? 'العداد المباشر لتسليم وتأكيد الطلب:' : 'Live Support Response Countdown:'}</span>
                  </div>

                  {/* Big Neon Digital Clock */}
                  <div className="inline-flex items-center justify-center px-6 py-2 bg-black text-[#FFE600] border-2 border-black rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000]">
                    <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest">
                      {`${String(Math.floor(countdownSeconds / 60)).padStart(2, '0')}:${String(countdownSeconds % 60).padStart(2, '0')}`}
                    </span>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="w-full h-2.5 bg-neutral-200 border border-black rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-[#06D6A0] rounded-full transition-all duration-1000"
                      style={{ width: `${Math.max(3, ((3600 - countdownSeconds) / 3600) * 100)}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-neutral-700 font-bold leading-tight">
                    {isAr
                      ? 'بمجرد رد مسؤول الدعم واعتماد التحويل، سيتوقف العداد تلقائياً ويتم تسليم وتفعيل طلبك فوراً هنا وفي المحادثة.'
                      : 'As soon as the support team verifies the transfer, this timer will complete and your order will activate automatically.'}
                  </p>
                </div>
              ) : (
                /* Fulfilled Showcase Banner */
                <div className="p-4 bg-[#D1FADF] border-2 border-black rounded-2xl shadow-[3.5px_3.5px_0px_0px_#000] space-y-3">
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <span>{isAr ? 'تم استلام وتفعيل طلبك بنجاح!' : 'Order Activated Successfully!'}</span>
                  </div>
                  {activeArabOrder.deliveredKey && (
                    <div className="p-3 bg-white border-2 border-black rounded-xl text-start">
                      <span className="text-[10px] text-neutral-600 font-bold block mb-1">
                        {isAr ? 'بيانات التفعيل والحساب:' : 'Delivered Credentials:'}
                      </span>
                      <div className="font-mono text-xs font-black bg-neutral-100 p-2 rounded border border-black select-all break-all">
                        {activeArabOrder.deliveredKey}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Order Details Breakdown Card */}
              <div className="p-3.5 bg-white border-2 border-black rounded-xl sm:rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000] space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                  <span className="text-xs font-bold text-neutral-600">{isAr ? 'رقم الطلب الرسمي:' : 'Official Order Ref:'}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-xs sm:text-sm text-black">#{activeArabOrder.orderId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeArabOrder.orderId, 'live_order_id')}
                      className="p-1 hover:bg-neutral-100 border border-black rounded text-black shadow-[1px_1px_0px_0px_#000] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
                      title="Copy"
                    >
                      {copiedKey === 'live_order_id' ? <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> : <Copy className="w-3 h-3 stroke-[2.5]" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-neutral-200 text-xs font-black">
                  <span className="text-neutral-600">{isAr ? 'الدولة ووسيلة الدفع:' : 'Country & Method:'}</span>
                  <div className="flex items-center gap-1.5">
                    <img src={activeArabOrder.flagUrl} alt="Country" className="w-5 h-3.5 object-cover rounded border border-black/30 shrink-0" />
                    <span>{activeArabOrder.countryName} • {activeArabOrder.methodName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-neutral-600">{isAr ? 'المبلغ المطلوب:' : 'Amount:'}</span>
                  <span className="text-sm font-mono text-black font-black">{activeArabOrder.displayPrice}</span>
                </div>
              </div>

              {/* Direct Re-Open Telegram Action Button */}
              <a
                href={buildArabTelegramHelpUrl({
                  country: ARAB_COUNTRIES_PAYMENT_DATA.find((c) => c.nameAr === activeArabOrder.countryName || c.nameEn === activeArabOrder.countryName) || ARAB_COUNTRIES_PAYMENT_DATA[0],
                  selectedMethod: { id: 'custom', nameAr: activeArabOrder.methodName, nameEn: activeArabOrder.methodName, type: 'wallet' },
                  items: items.map((it) => ({ name: isWalletTopupMode ? (isAr ? 'شحن رصيد محفظة UpStore' : 'UpStore Wallet Top-Up') : (it.product?.name_ar || it.product?.name || 'طلب رقمي'), quantity: it.quantity })),
                  displayPrice: activeArabOrder.displayPrice,
                  isArabic: isAr,
                  orderRef: activeArabOrder.orderId,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-3.5 bg-[#229ED9] hover:bg-[#1b8ec5] border-2 border-black text-white rounded-xl sm:rounded-2xl flex items-center justify-between gap-2.5 shadow-[3.5px_3.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white border border-black flex items-center justify-center p-1 shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    <Send className="w-4 h-4 text-[#229ED9] stroke-[2.5]" />
                  </div>
                  <div className="text-start min-w-0">
                    <span className="text-xs sm:text-sm font-black text-white block truncate">
                      {isAr ? 'فتح محادثة الدعم @UpStore_help مجدداً' : 'Open Support Chat @UpStore_help'}
                    </span>
                    <span className="text-[10px] text-blue-100 font-bold block truncate">
                      {isAr ? 'البيانات ورقم الطلب جاهزة في الرسالة' : 'Prefilled order ref & data ready'}
                    </span>
                  </div>
                </div>
                <div className="px-2.5 py-1.5 bg-[#FFE600] text-black rounded-lg border border-black font-black text-xs flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] group-hover:scale-105 transition-transform shrink-0">
                  <span>{isAr ? 'فتح' : 'Open'}</span>
                  <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                </div>
              </a>

              {/* Return Button */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveArabOrder(null);
                    setModalStep('select');
                  }}
                  className="text-xs font-bold text-neutral-600 hover:text-black underline cursor-pointer"
                >
                  {isAr ? '← العودة لاختيار وسيلة دفع أخرى' : '← Return to payment methods'}
                </button>
              </div>
            </div>
          ) : modalStep === 'select' ? (
            /* ══════════════════════════════════════════════════════ */
            /* ─── PAGE 1: CHOOSE PAYMENT METHOD (صفحة اختيار الوسيلة) ─── */
            /* ══════════════════════════════════════════════════════ */
            <div className="space-y-3.5 text-start animate-in fade-in zoom-in-95 duration-150">
              {/* ─── Amount Banner (Neubrutalism with Smart Copy Button & 5% VAT breakdown) ─── */}
              <div className="p-3 sm:p-3.5 bg-white border-2 border-black rounded-xl sm:rounded-2xl shadow-[3px_3px_0px_0px_#000] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0 text-start">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] sm:text-xs font-black text-neutral-600">
                        {isAr ? (isWalletTopupMode ? 'إجمالي مبلغ الشحن المطلوب:' : 'المبلغ الإجمالي للطلب:') : (isWalletTopupMode ? 'Total Top-Up Due:' : 'Total Order Amount:')}
                      </span>
                      <span className="px-1.5 py-0.2 bg-[#06D6A0] text-black text-[9px] font-black rounded border border-black">
                        {isAr ? 'شامل الضريبة 5%' : 'Includes 5% VAT'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl sm:text-2xl font-black text-black font-mono tracking-tight">
                        {displayPrice}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const numOnly = activeOption.currency === 'EGP' ? egpAmount : activeOption.currency === 'SAR' ? sarAmount : usdAmount;
                      handleCopy(numOnly, 'top_amount');
                    }}
                    className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-[#FFE600] hover:bg-[#ffd900] active:translate-x-0.5 active:translate-y-0.5 border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] cursor-pointer transition-all shrink-0"
                    title={isAr ? 'نسخ المبلغ بدقة' : 'Copy Exact Amount'}
                  >
                    {copiedKey === 'top_amount' ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3] text-black" />
                        <span>{isAr ? 'تم النسخ' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 stroke-[2.5] text-black" />
                        <span>{isAr ? 'نسخ المبلغ' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Subtle breakdown bar for total clarity */}
                <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[10.5px] font-bold text-neutral-700 flex-wrap gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      {isAr ? (isWalletTopupMode ? 'رصيد الشحن المضاف:' : 'المجموع:') : (isWalletTopupMode ? 'Net Wallet Credit:' : 'Subtotal:')}{' '}
                      <strong className="font-mono text-black font-black">
                        {activeOption.currency === 'EGP' ? `${orderPricing.subtotalEgp} ج.م` : activeOption.currency === 'SAR' ? `${orderPricing.subtotalSar} ر.س` : `$${orderPricing.subtotalUsd.toFixed(2)}`}
                      </strong>
                    </span>
                    {orderPricing.discountPct > 0 && (
                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-300">
                        {isAr ? `خصم (-${orderPricing.discountPct}%):` : `Discount (-${orderPricing.discountPct}%):`}{' '}
                        <strong className="font-mono font-black">
                          {activeOption.currency === 'EGP' ? `-${orderPricing.discountAmountEgp} ج.م` : activeOption.currency === 'SAR' ? `-${orderPricing.discountAmountSar} ر.س` : `-$${orderPricing.discountAmountUsd.toFixed(2)}`}
                        </strong>
                      </span>
                    )}
                    <span>
                      {isAr ? 'الضريبة (5% VAT):' : 'Tax (5% VAT):'}{' '}
                      <strong className="font-mono text-black font-black">
                        {activeOption.currency === 'EGP' ? `+${orderPricing.taxEgp} ج.م` : activeOption.currency === 'SAR' ? `+${orderPricing.taxSar} ر.س` : `+$${orderPricing.taxUsd.toFixed(2)}`}
                      </strong>
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {isWalletTopupMode ? (isAr ? 'شحن رصيد' : 'Wallet Top-Up') : `${orderPricing.itemCount} ${isAr ? 'عنصر' : 'item(s)'}`}
                  </span>
                </div>
              </div>

              {/* ─── GEO-ADAPTIVE NOTICE (خيارات الدفع الإضافية) ─── */}
              {isArabOrEgyptian && (
                <div className="p-3.5 bg-[#FFFDF0] border-2 border-black rounded-xl sm:rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000] flex items-start gap-3 text-start animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="w-8 h-8 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_#000] mt-0.5">
                    <Sparkles className="w-4 h-4 text-black stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap justify-between">
                      <span className="text-xs sm:text-sm font-black text-black block">
                        {isAr
                          ? `خيارات الدفع الإضافية في ${detectedArabCountryName}:`
                          : `Additional Payment Options in ${detectedArabCountryName}:`}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-950 border border-black rounded-md text-[10px] font-black">
                        {isAr ? 'معالجة 5 - 60 دقيقة للبدائل' : '5-60 min for alternatives'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] font-bold text-neutral-900 leading-relaxed mt-1">
                      {isAr ? (
                        <>
                          تتوفر طرق دفع ومحافظ محلية لكافة الدول العربية عبر خدمة <strong>(عربي باي — Arabi Pay)</strong> المخصصة، والتي تتطلب التزاماً صريحاً بالسداد وتأكيد البصمة الذكية لتجهيز طلبك وتسليمه مع الدعم المباشر.
                        </>
                      ) : (
                        <>
                          Direct local wallets and bank transfers for 22 Arab countries are available via <strong>(Arabi Pay)</strong> express service with smart biometric signature and live direct support.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* ─── DIRECT IN-FLOW VISUAL PAYMENT METHOD SELECTOR (NO BLIND SPOTS) ─── */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-black flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isAr ? 'اختر وسيلة الدفع المناسبة لك:' : 'Choose Payment Method:'}</span>
                  </label>
                  <span className="text-[10px] font-mono font-black text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-black/30">
                    {availableOptions.length} {isAr ? 'وسائل متاحة' : 'methods'}
                  </span>
                </div>

                {/* 1. Category Switcher Tabs (Egypt / Saudi) - Zero Emojis */}
                {(country === 'EG' || country === 'SA') && (
                  <div className="p-1 bg-[#F4F4F0] border-2 border-black rounded-xl grid grid-cols-2 gap-1.5 shadow-[2px_2px_0px_0px_#000]">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentTab('local');
                        const firstLocal = availableOptions.find((o) => o.category === (country === 'EG' ? 'egypt' : 'saudi'));
                        if (firstLocal) setSelectedMethodId(firstLocal.id);
                      }}
                      className={`py-2 px-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentTab === 'local'
                          ? 'bg-[#FFE600] text-black border border-black shadow-[1.5px_1.5px_0px_0px_#000]'
                          : 'text-neutral-700 hover:bg-white/80'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                      <span>{country === 'EG' ? (isAr ? 'المحافظ وطرق الدفع المصرية' : 'Egypt Wallets') : (isAr ? 'طرق الدفع بالسعودية' : 'Saudi Payments')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentTab('global');
                        const firstGlobal = availableOptions.find((o) => o.category === 'global');
                        if (firstGlobal) setSelectedMethodId(firstGlobal.id);
                      }}
                      className={`py-2 px-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentTab === 'global'
                          ? 'bg-[#FFE600] text-black border border-black shadow-[1.5px_1.5px_0px_0px_#000]'
                          : 'text-neutral-700 hover:bg-white/80'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                      <span>{isAr ? 'البطاقات والدفع العربي والعالمي' : 'Cards & Global'}</span>
                    </button>
                  </div>
                )}

                {/* 2. In-Flow Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableOptions
                    .filter((opt) => {
                      if (country !== 'EG' && country !== 'SA') return true;
                      if (paymentTab === 'local') return opt.category === (country === 'EG' ? 'egypt' : 'saudi');
                      return opt.category === 'global';
                    })
                    .map((opt) => {
                      const isSelected = opt.id === selectedMethodId;
                      const isLocked = opt.id === 'arab_local_methods' && isArabiPayBelowMin && !isArabiPayBoosted;
                      const isArabMethod = opt.id === 'arab_local_methods';
                      const targetFlagUrl = isArabMethod ? (detectedUserCountryConfig ? detectedUserCountryConfig.flagUrl : 'https://flagcdn.com/w80/sa.png') : null;
                      const targetCountryName = isArabMethod && detectedUserCountryConfig ? (isAr ? detectedUserCountryConfig.nameAr : detectedUserCountryConfig.nameEn) : null;

                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setSelectedMethodId(opt.id);
                            setModalStep('details');
                          }}
                          className={`p-3 rounded-xl border-2 border-black flex items-center justify-between cursor-pointer transition-all relative overflow-hidden group ${
                            isSelected
                              ? 'bg-[#FFE600] shadow-[3px_3px_0px_0px_#000] scale-[1.01]'
                              : `${opt.rowBg} hover:brightness-95 hover:-translate-y-0.5 shadow-[1.5px_1.5px_0px_0px_#000]`
                          } ${isLocked ? 'opacity-90 border-dashed bg-[#FFFBEA]' : ''} ${opt.isComingSoon ? 'border-dashed' : ''}`}
                        >
                          {/* Smart Glass Blur Overlay with Centered Lock Icon & "ستتوفر قريباً" underneath */}
                          {opt.isComingSoon && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2.5px] rounded-xl flex items-center justify-center z-10 border-2 border-dashed border-black/30 transition-all group-hover:bg-white/55">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <div className="w-7 h-7 rounded-xl bg-black text-[#FFE600] border border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_#000] group-hover:scale-110 transition-transform">
                                  <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                                </div>
                                <span className="text-[10px] font-black text-black px-2 py-0.5 bg-[#FFE600] border border-black rounded-lg shadow-[1px_1px_0px_0px_#000] tracking-tight">
                                  {isAr ? 'ستتوفر قريباً' : 'Coming Soon'}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 rounded-xl ${isArabMethod && targetFlagUrl ? 'bg-neutral-900' : opt.brandBg} border border-black flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-[1px_1px_0px_0px_#000] relative group/icon`}>
                              {isArabMethod && targetFlagUrl ? (
                                <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
                                  {/* Smart Country Flag Backdrop */}
                                  <img
                                    src={targetFlagUrl}
                                    alt={targetCountryName || 'Country Flag'}
                                    className="absolute inset-0 w-full h-full object-cover transform scale-110 group-hover/icon:scale-125 transition-transform duration-200"
                                  />
                                  {/* Smart Contrast Scrim Overlay */}
                                  <div className="absolute inset-0 bg-black/25 backdrop-blur-[0.5px]" />
                                  {/* Floating Center UP Badge */}
                                  <div className="relative z-10 w-5.5 h-5.5 rounded-md bg-white/95 border border-black shadow-[1px_1px_0px_0px_#000] flex items-center justify-center p-0.5 group-hover/icon:scale-110 transition-transform duration-200">
                                    <img src="/images/up-logo.svg" alt="Up" className="w-full h-full object-contain" />
                                  </div>
                                </div>
                              ) : opt.secondaryIcon ? (
                                <div className="flex items-center justify-center gap-0.5 w-full h-full p-0.5 shrink-0">
                                  <img src={opt.icon} alt="Visa" className="h-4 max-w-[48%] object-contain" />
                                  <img src={opt.secondaryIcon} alt="Mastercard" className="h-4 max-w-[48%] object-contain" />
                                </div>
                              ) : (
                                <img src={opt.icon} alt={opt.nameEn} className="w-full h-full object-contain p-0.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs sm:text-sm font-black text-black truncate">
                                  {isArabMethod && targetCountryName
                                    ? (isAr ? `طرق دفع ${targetCountryName} (Up)` : `${targetCountryName} Payments (Up)`)
                                    : (isAr ? opt.nameAr : opt.nameEn)}
                                </p>
                                {isArabMethod && targetCountryName ? (
                                  <span className="px-1.5 py-0.2 bg-[#FFE600] text-black border border-black rounded text-[9px] font-black shrink-0">
                                    {isAr ? `متاح في ${targetCountryName}` : `In ${targetCountryName}`}
                                  </span>
                                ) : (
                                  <span className={`px-1.5 py-0.2 ${opt.badgeBg} border border-black rounded text-[9px] font-black shrink-0`}>
                                    {isAr ? opt.badgeAr : opt.badgeEn}
                                  </span>
                                )}
                              </div>
                              {isLocked ? (
                                <span className="text-[9px] font-black text-amber-950 flex items-center gap-0.5 mt-0.5">
                                  <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                                  <span>{isAr ? `حد أدنى ${arabiPayLimit.minAmount} ${arabiPayLimit.symbolAr}` : `Min ${arabiPayLimit.minAmount} ${arabiPayLimit.symbolEn}`}</span>
                                </span>
                              ) : (
                                <span className="text-[10.5px] text-neutral-600 font-bold block truncate mt-0.5">
                                  {isArabMethod && targetCountryName
                                    ? (isAr ? `دعم المحافظ والتحويلات البنكية في ${targetCountryName}` : `Wallets & bank transfers in ${targetCountryName}`)
                                    : (isAr ? opt.subtitleAr : opt.subtitleEn)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <div className={`w-7 h-7 rounded-xl ${opt.id === 'arab_local_methods' || opt.brandBg === 'bg-white' ? 'bg-[#FFE600]' : opt.brandBg} border border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_#000] transition-transform group-hover:scale-110`}>
                              <ArrowRight className={`w-3.5 h-3.5 stroke-[3] ${opt.id === 'arab_local_methods' || opt.brandBg === 'bg-white' ? 'text-black' : 'text-white'} rtl:rotate-180`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* 3. Anti-Blindspot Quick Bridge Bar */}
                {(country === 'EG' || country === 'SA') && (
                  <div className="pt-0.5">
                    {paymentTab === 'local' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentTab('global');
                          const firstGlobal = availableOptions.find((o) => o.category === 'global');
                          if (firstGlobal) setSelectedMethodId(firstGlobal.id);
                        }}
                        className="w-full p-2 bg-[#EAF5FF] hover:bg-[#d8edff] border-2 border-black rounded-xl text-[11px] font-black text-neutral-800 flex items-center justify-between shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">
                            {isAr ? 'تود الدفع بـ PayPal أو طرق الدفع العربية (Up)؟' : 'Want to pay with PayPal or Arab Payments (Up)?'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-[#FFE600] text-black border border-black rounded text-[10px] font-black shrink-0">
                          {isAr ? 'عرض الطرق العالمية' : 'View Global'}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentTab('local');
                          const firstLocal = availableOptions.find((o) => o.category === (country === 'EG' ? 'egypt' : 'saudi'));
                          if (firstLocal) setSelectedMethodId(firstLocal.id);
                        }}
                        className="w-full p-2 bg-[#F0FDF4] hover:bg-[#dcfce7] border-2 border-black rounded-xl text-[11px] font-black text-neutral-800 flex items-center justify-between shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            {country === 'EG'
                              ? (isAr ? 'متاح أيضاً الدفع عبر فودافون كاش، إنستاباي، وأورنج كاش' : 'Local Egypt Wallets available')
                              : (isAr ? 'متاح أيضاً الدفع عبر STC Pay ومصرف الراجحي' : 'Saudi STC Pay & Bank Transfers available')}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-[#FFE600] text-black border border-black rounded text-[10px] font-black shrink-0">
                          {isAr ? 'عرض المحافظ المحلية' : 'View Local'}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════ */
            /* ─── PAGE 2: METHOD DETAILS & EXECUTION (صفحة تفاصيل الدفع) ─── */
            /* ══════════════════════════════════════════════════════ */
            <div className="space-y-3.5 text-start animate-in fade-in zoom-in-95 duration-150">
              {/* Active Method Overview Bar */}
              <div className="p-3 bg-white border-2 border-black rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-[3px_3px_0px_0px_#000]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl ${activeOption.id === 'arab_local_methods' ? 'bg-neutral-900' : activeOption.brandBg} border-2 border-black flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-[1px_1px_0px_0px_#000] relative`}>
                    {activeOption.id === 'arab_local_methods' ? (
                      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
                        <img
                          src={
                            (selectedArabCountryCode && ARAB_COUNTRIES_PAYMENT_DATA.find((c) => c.code === selectedArabCountryCode)?.flagUrl) ||
                            detectedUserCountryConfig?.flagUrl ||
                            'https://flagcdn.com/w80/sa.png'
                          }
                          alt="Flag"
                          className="absolute inset-0 w-full h-full object-cover transform scale-110"
                        />
                        <div className="absolute inset-0 bg-black/25 backdrop-blur-[0.5px]" />
                        <div className="relative z-10 w-5.5 h-5.5 rounded-md bg-white/95 border border-black shadow-[1px_1px_0px_0px_#000] flex items-center justify-center p-0.5">
                          <img src="/images/up-logo.svg" alt="Up" className="w-full h-full object-contain" />
                        </div>
                      </div>
                    ) : activeOption.secondaryIcon ? (
                      <div className="flex items-center justify-center gap-0.5 w-full h-full p-0.5 shrink-0">
                        <img src={activeOption.icon} alt="Visa" className="h-4 max-w-[48%] object-contain" />
                        <img src={activeOption.secondaryIcon} alt="Mastercard" className="h-4 max-w-[48%] object-contain" />
                      </div>
                    ) : (
                      <img src={activeOption.icon} alt={activeOption.nameEn} className="w-full h-full object-contain p-0.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-black text-black truncate">
                        {isAr ? activeOption.nameAr : activeOption.nameEn}
                      </h3>
                      <span className={`px-1.5 py-0.2 ${activeOption.badgeBg} border border-black rounded text-[9px] font-black shrink-0`}>
                        {isAr ? activeOption.badgeAr : activeOption.badgeEn}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs sm:text-sm font-black text-black font-mono">
                        {displayPrice}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const numOnly = activeOption.currency === 'EGP' ? egpAmount : activeOption.currency === 'SAR' ? sarAmount : usdAmount;
                      handleCopy(numOnly, 'top_amount');
                    }}
                    className="p-1.5 bg-[#FFE600] hover:bg-[#ffd900] border border-black rounded-lg text-xs font-black text-black shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                    title="Copy Amount"
                  >
                    {copiedKey === 'top_amount' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStep('select')}
                    className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 border border-black rounded-lg text-[10px] font-black text-black shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                  >
                    {isAr ? 'تغيير' : 'Change'}
                  </button>
                </div>
              </div>

              {/* ─── ACTIVE METHOD DETAILS CARD WITH DYNAMIC BRAND BAR ─── */}
              <div className="bg-white border-[2.5px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] overflow-hidden text-start">
          
          {/* 1. PAYPAL DIRECT PAYMENT (SMART ICONIC STEPS) */}
          {selectedMethodId === 'paypal' && (
            <div>
              {/* PayPal Brand Bar */}
              <div className="p-3 bg-[#003087] text-white border-b-2 border-black flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-black flex items-center justify-center p-1 shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    <img src="/images/payment/paypal.svg" alt="PayPal" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white leading-tight">PayPal Direct Payment</h4>
                    <p className="text-[10px] text-blue-200 font-bold">{isAr ? 'حساب رسمي معتمد' : 'Official Verified Merchant'}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#FFE600] text-black border border-black rounded text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                  {isAr ? 'فوري 0% رسوم' : '0% Fee Instant'}
                </span>
              </div>

              {/* PayPal Iconic Smart Steps */}
              <div className="p-3 sm:p-4 space-y-2.5 bg-[#FFFDF9]">
                {/* STEP 1: Exact Amount in USD */}
                <div className="p-2.5 sm:p-3 bg-[#FFF9E6] border-2 border-black rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#FFE600] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      1
                    </div>
                    <div className="text-start min-w-0">
                      <span className="text-[10px] text-neutral-600 font-bold block truncate">
                        {isAr ? 'المبلغ المطلوب سداده بدقة:' : 'Exact Amount to Pay:'}
                      </span>
                      <span className="font-mono font-black text-sm sm:text-base text-black select-all tracking-wider">
                        ${usdAmount} USD
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(usdAmount, 'amount_paypal')}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer shrink-0"
                  >
                    {copiedKey === 'amount_paypal' ? <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{copiedKey === 'amount_paypal' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ المبلغ' : 'Copy Amount')}</span>
                  </button>
                </div>

                {/* STEP 2: Direct Link Button */}
                <div className="p-2.5 sm:p-3 bg-[#F0FDF4] border-2 border-black rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#06D6A0] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      2
                    </div>
                    <div className="text-start min-w-0">
                      <span className="text-xs font-black text-black block truncate">
                        {isAr ? 'السداد المباشر بضغطة واحدة' : '1-Click Instant Payment'}
                      </span>
                      <span className="text-[10px] text-neutral-600 font-bold block truncate">
                        UpStore Official (0% Fees)
                      </span>
                    </div>
                  </div>
                  <a
                    href="https://www.paypal.com/qrcodes/p2pqrc/N7AD8WM43LYVA"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#0079C1] hover:bg-[#005c94] text-white border-2 border-black rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
                  >
                    <span>{isAr ? 'فتح رابط PayPal والدفع' : 'Open & Pay via PayPal'}</span>
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  </a>
                </div>

                {/* STEP 3: Submit Proof / Finish */}
                <div className="p-2.5 sm:p-3 bg-[#EAF5FF] border-2 border-black rounded-xl sm:rounded-2xl flex items-center gap-2.5 shadow-[2px_2px_0px_0px_#000] text-start">
                  <div className="w-7 h-7 rounded-lg bg-[#003087] border-2 border-black font-black text-xs text-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    3
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-black block">
                      {isAr ? 'تأكيد السداد ومتابعة المراجعة والتسليم' : 'Confirm Payment & Proceed to Delivery'}
                    </span>
                    <p className="text-[10.5px] text-neutral-700 font-bold leading-tight mt-0.5">
                      {isAr
                        ? 'بعد إتمام السداد عبر الرابط، اضغط على (تم التحويل ← متابعة) لرفع صورة الإشعار لمراجعة الدفع واستلام حسابك ⚡'
                        : 'After paying via PayPal, click Proceed below to upload confirmation for review and activation ⚡'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. ARAB COUNTRIES LOCAL PAYMENTS VIP SMART SELECTOR */}
          {selectedMethodId === 'arab_local_methods' && (
            <div>
              {/* Arab Countries Brand Bar */}
              <div className="p-3 bg-black text-white border-b-2 border-black flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-black flex items-center justify-center overflow-hidden shrink-0 shadow-[1px_1px_0px_0px_#000] relative group">
                    <img
                      src="/images/payment/arabipay.png"
                      alt="Arabi Pay"
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                      {isAr ? 'عربي باي (Arabi Pay)' : 'Arabi Pay'}
                    </h4>
                    <p className="text-[10px] text-yellow-300 font-bold">
                      {isAr ? 'بوابة الدفع العربي السريع بالمحافظ والتحويلات اللحظية لـ 22 دولة' : 'Instant direct Arab payment via mobile wallets & bank transfers'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#FFE600] text-black border border-black rounded text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                  Arabi Pay
                </span>
              </div>

              {/* Arab Countries Body */}
              <div className="p-3.5 sm:p-4 space-y-3.5 bg-[#FFFDF9]">

                {/* EXPRESS COMMITMENT & SMART EXPLANATION NOTICE */}
                <div className="p-3.5 bg-[#FFFDF0] border-2 border-black rounded-xl sm:rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000] flex items-start gap-3 text-start">
                  <div className="w-8 h-8 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_#000] mt-0.5">
                    <Zap className="w-4 h-4 text-black stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-black">
                        {isAr ? 'خدمة دفع سريع ومخصصة (Arabi Pay):' : 'Express Dedicated Arabi Pay Service:'}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-200 text-emerald-950 border border-black rounded-md text-[10px] font-black">
                        {isAr ? 'تجهيز فوري 0% انتظار' : 'Fast-Track Support'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-[12.5px] font-bold text-neutral-900 leading-relaxed mt-1">
                      {isAr
                        ? 'خدمة Arabi Pay هي وسيلة دفع عربي سريعة وفورية ومخصصة، تتطلب حجز موارد وتجهيز فوري من مسؤولي العمليات والدعم لتوفير بيانات التحويل المباشرة لدولتك. يلزم الالتزام التام بالسداد فور استلام البيانات.'
                        : 'Arabi Pay is an express dedicated payment gateway requiring fast-track allocation by support agents for your country. Immediate payment commitment is required.'}
                    </p>
                  </div>
                </div>

                {/* USER STRIKE WARNING NOTICE (IF STRIKES > 0) */}
                {userStrikes > 0 && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-950 rounded-xl sm:rounded-2xl shadow-[2.5px_2.5px_0px_0px_#991b1b] flex items-start gap-2.5 text-start animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-black text-rose-950 block">
                        {isAr ? `تنبيه أمني: لديك إنذار سابق (${userStrikes}/2)` : `Security Alert: You have ${userStrikes}/2 strikes`}
                      </span>
                      <p className="text-[11px] font-bold text-rose-900 leading-tight mt-0.5">
                        {isAr
                          ? 'تأكيد هذا الطلب دون إتمام السداد أو الإلغاء غير المبرر سيؤدي تلقائياً لتسجيل الإنذار الثاني وحظر حسابك ورقم هاتفك نهائياً!'
                          : 'Confirming this order and failing to pay will result in a permanent ban on your account and phone number!'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 0. SMART MARKETING & BALANCE TOP-UP UPGRADE CARD */}
                {isArabiPayBelowMin && !isArabiPayBoosted && (
                  <div className="p-3.5 sm:p-4 bg-[#FFF9E6] border-2 border-black rounded-xl sm:rounded-2xl shadow-[3px_3px_0px_0px_#000] space-y-2.5 text-start animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#FFE600] border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                          <Lock className="w-4 h-4 text-black stroke-[2.5]" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-black leading-tight truncate">
                            {isAr
                              ? `تنبيه الحد الأدنى: ${arabiPayLimit.minAmount} ${arabiPayLimit.symbolAr}`
                              : `Minimum Order Limit: ${arabiPayLimit.minAmount} ${arabiPayLimit.symbolEn}`}
                          </h4>
                          <p className="text-[10px] text-neutral-700 font-bold truncate">
                            {isAr
                              ? `قيمة طلبك الحالية: ${currentArabOrderAmount} ${arabiPayLimit.symbolAr}`
                              : `Current order value: ${currentArabOrderAmount} ${arabiPayLimit.symbolEn}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-[#FFE600] text-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000] shrink-0">
                        {isAr ? 'عرض مميز' : 'Smart Deal'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white border border-black rounded-xl text-start space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        <span>{isAr ? 'شحن رصيد المحفظة الفائض تلقائياً:' : 'Instant Excess Wallet Balance Credit:'}</span>
                      </div>
                      <p className="text-[11px] text-neutral-800 font-bold leading-relaxed">
                        {isAr
                          ? `يمكنك سداد مبلغ الحد الأدنى (${arabiPayLimit.minAmount} ${arabiPayLimit.symbolAr}) وسيتم تحويل وإضافة المبلغ الفائض (${arabiPayDiff} ${arabiPayLimit.symbolAr}) فوراً كرصيد إضافي في محفظتك الإلكترونية بـ UpStore لتستخدمه في أي طلب قادم بدون أي خصم أو مصاريف!`
                          : `You can complete payment with ${arabiPayLimit.minAmount} ${arabiPayLimit.symbolEn} and the excess remaining amount (${arabiPayDiff} ${arabiPayLimit.symbolEn}) will be credited directly to your UpStore wallet for any future purchase!`}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setIsArabiPayBoosted(true)}
                        className="w-full p-2.5 sm:p-3 bg-[#FFE600] hover:bg-[#ffd700] text-black border-2 border-black rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                      >
                        <Zap className="w-4 h-4 text-black fill-black shrink-0" />
                        <span className="truncate">
                          {isAr
                            ? `إتمام الطلب بـ ${arabiPayLimit.minAmount} ${arabiPayLimit.symbolAr} (وشحن ${arabiPayDiff} ${arabiPayLimit.symbolAr} لمحفظتي)`
                            : `Pay ${arabiPayLimit.minAmount} ${arabiPayLimit.symbolEn} (+${arabiPayDiff} to Wallet)`}
                        </span>
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            window.location.href = '/browse';
                          }}
                          className="p-2 bg-white hover:bg-neutral-100 text-black border-2 border-black rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                          <span>{isAr ? 'إضافة منتج آخر للسلة' : 'Add more items'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMethodId('lemonsqueezy')}
                          className="p-2 bg-[#EBF5FF] hover:bg-[#d9ecff] text-black border-2 border-black rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{isAr ? 'الدفع بالبطاقة مباشرة' : 'Pay with Cards'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* BOOSTED BANNER */}
                {isArabiPayBoosted && (
                  <div className="p-3 bg-[#DCFCE7] border-2 border-black rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-[2.5px_2.5px_0px_0px_#000] text-start animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-emerald-950 block truncate">
                          {isAr
                            ? `تم تطبيق الحد الأدنى: ${arabiPayLimit.minAmount} ${arabiPayLimit.symbolAr}`
                            : `Minimum Limit Applied: ${arabiPayLimit.minAmount} ${arabiPayLimit.symbolEn}`}
                        </span>
                        <span className="text-[10px] text-emerald-800 font-bold block truncate">
                          {isAr
                            ? `سيتم شحن ${arabiPayDiff} ${arabiPayLimit.symbolAr} تلقائياً في محفظتك`
                            : `${arabiPayDiff} ${arabiPayLimit.symbolEn} will be credited to your wallet`}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsArabiPayBoosted(false)}
                      className="px-2 py-1 bg-white hover:bg-neutral-100 text-black border border-black rounded-lg text-[10px] font-black shrink-0 shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                )}
                
                {/* 1. Smart Vector Country Selector */}
                {(() => {
                  const activeCountry =
                    sortedArabCountries.find((c) => c.code === selectedArabCountryCode) ||
                    sortedArabCountries[0];
                  return (
                    <div className="space-y-1.5 text-start">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-black">
                          {isAr ? 'الدولة المختارة:' : 'Selected Country:'}
                        </label>
                        <span className="text-[10px] font-mono font-bold text-neutral-700 bg-[#FFF9D2] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
                          {activeCountry.currencyCode}
                        </span>
                      </div>

                      <div className="relative">
                        {/* Trigger Card */}
                        <button
                          type="button"
                          onClick={() => setIsArabCountryMenuOpen((prev) => !prev)}
                          className="w-full p-2.5 sm:p-3 bg-white hover:bg-neutral-50 border-2 border-black rounded-xl sm:rounded-2xl flex items-center justify-between gap-2.5 shadow-[2.5px_2.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer text-start"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-6 rounded-md overflow-hidden border border-black/40 shadow-xs shrink-0 flex items-center justify-center bg-neutral-100">
                              <img
                                src={activeCountry.flagUrl}
                                alt={activeCountry.nameEn}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs sm:text-sm font-black text-black block truncate">
                                  {isAr ? activeCountry.nameAr : activeCountry.nameEn}
                                </span>
                                {activeCountry.code === country && (
                                  <span className="px-1.5 py-0.2 bg-[#06D6A0] text-black border border-black rounded text-[9px] font-black shrink-0">
                                    {isAr ? 'دولتـك' : 'Your Country'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-neutral-600 font-bold block truncate">
                                {isAr ? activeCountry.currencyNameAr : activeCountry.currencyNameEn} • {activeCountry.popularMethods.length} {isAr ? 'وسائل دفع' : 'methods'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-black text-neutral-800 bg-neutral-100 px-2 py-1 rounded-lg border border-black/30">
                              {isAr ? 'تغيير' : 'Change'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-black stroke-[3] transition-transform ${isArabCountryMenuOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {/* Dropdown Grid / List */}
                        <AnimatePresence>
                          {isArabCountryMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -4, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.98 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 right-0 top-full mt-2 z-40 bg-white border-2 sm:border-[2.5px] border-black rounded-2xl shadow-[6px_6px_0px_0px_#000] p-2.5 sm:p-3 space-y-2 max-h-64 overflow-hidden flex flex-col"
                            >
                              {/* Search Box */}
                              <div className="relative shrink-0">
                                <input
                                  type="text"
                                  value={arabCountrySearch}
                                  onChange={(e) => setArabCountrySearch(e.target.value)}
                                  placeholder={isAr ? 'ابحث عن اسم الدولة...' : 'Search Arab Country...'}
                                  className="w-full px-3 py-1.5 text-xs font-black bg-[#FFFDF9] border-2 border-black rounded-xl outline-none focus:bg-white shadow-[1.5px_1.5px_0px_0px_#000]"
                                  autoFocus
                                />
                              </div>

                              {/* Countries List */}
                              <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-black scrollbar-track-neutral-100 pr-1 overscroll-contain">
                                {sortedArabCountries
                                  .filter((c) => {
                                    if (!arabCountrySearch.trim()) return true;
                                    const q = arabCountrySearch.toLowerCase().trim();
                                    return (
                                      c.nameAr.toLowerCase().includes(q) ||
                                      c.nameEn.toLowerCase().includes(q) ||
                                      c.currencyCode.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((c) => {
                                    const isSelected = c.code === selectedArabCountryCode;
                                    const isUserCountry = c.code === country;
                                    return (
                                      <div
                                        key={c.code}
                                        onClick={() => {
                                          setSelectedArabCountryCode(c.code);
                                          if (c.popularMethods.length > 0) {
                                            setSelectedArabMethodId(c.popularMethods[0].id);
                                          }
                                          setIsArabCountryMenuOpen(false);
                                          setArabCountrySearch('');
                                        }}
                                        className={`p-2 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                                          isSelected
                                            ? 'bg-[#FFE600] border-black shadow-[2px_2px_0px_0px_#000]'
                                            : 'bg-white hover:bg-neutral-100 border-transparent'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="w-6 h-4 rounded overflow-hidden border border-black/40 shadow-xs shrink-0 flex items-center justify-center bg-neutral-100">
                                            <img
                                              src={c.flagUrl}
                                              alt={c.nameEn}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                          <div className="min-w-0 flex items-center gap-1.5">
                                            <span className="text-xs font-black text-black truncate">
                                              {isAr ? c.nameAr : c.nameEn}
                                            </span>
                                            {isUserCountry && (
                                              <span className="px-1 py-0.2 bg-[#06D6A0] text-black border border-black rounded text-[8.5px] font-black shrink-0">
                                                {isAr ? 'دولتـك' : 'Yours'}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-[10px] font-mono font-bold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded border border-black/20">
                                            {c.currencyCode}
                                          </span>
                                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-black" />}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Methods Selection Section for Active Country */}
                {(() => {
                  const activeCountry =
                    ARAB_COUNTRIES_PAYMENT_DATA.find((c) => c.code === selectedArabCountryCode) ||
                    ARAB_COUNTRIES_PAYMENT_DATA[0];
                  return (
                    <div className="space-y-2 text-start">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={activeCountry.flagUrl}
                            alt={activeCountry.nameEn}
                            className="w-5 h-3.5 object-cover rounded shadow-sm border border-black/30 inline-block shrink-0"
                          />
                          <label className="text-xs font-black text-black">
                            {isAr
                              ? `طرق الدفع المتاحة في ${activeCountry.nameAr}:`
                              : `Payment Methods in ${activeCountry.nameEn}:`}
                          </label>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-neutral-800 bg-[#FFF9D2] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
                          {isAr ? activeCountry.currencyNameAr : activeCountry.currencyNameEn}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeCountry.popularMethods.map((method) => {
                          const isSelected = selectedArabMethodId === method.id;
                          return (
                            <div
                              key={method.id}
                              onClick={() => setSelectedArabMethodId(method.id)}
                              className={`p-2.5 rounded-xl border-2 border-black flex items-center justify-between cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#FFE600] shadow-[2.5px_2.5px_0px_0px_#000] scale-[1.02]'
                                  : 'bg-white hover:bg-neutral-50 shadow-[1.5px_1.5px_0px_0px_#000]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-md bg-neutral-100 border border-black flex items-center justify-center text-xs font-black shrink-0">
                                  {method.type === 'wallet' ? (
                                    <Smartphone className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                                  ) : method.type === 'bank' ? (
                                    <Building2 className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                                  ) : (
                                    <Zap className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-black text-black block truncate">
                                    {isAr ? method.nameAr : method.nameEn}
                                  </span>
                                  {method.badgeAr && (
                                    <span className="text-[9px] font-bold text-neutral-700 block">
                                      {isAr ? method.badgeAr : method.badgeEn}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-4 h-4 rounded bg-black text-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. STRICT COMMITMENT & 2-STRIKES TERMS CHECKBOX */}
                <div className="p-3.5 bg-[#FFFDF0] border-2 border-black rounded-xl sm:rounded-2xl shadow-[2.5px_2.5px_0px_0px_#000] space-y-2 text-start">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="arabi_pay_terms"
                      checked={arabiPayTermsAgreed}
                      onChange={(e) => setArabiPayTermsAgreed(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-2 border-black text-[#FFE600] focus:ring-0 cursor-pointer shrink-0 accent-black"
                    />
                    <label htmlFor="arabi_pay_terms" className="text-xs font-black text-black cursor-pointer leading-relaxed select-none">
                      {isAr ? (
                        <>
                          أقر بالتزامي الكامل بالسداد الفوري فور استلام بيانات التحويل، وأوافق على شروط خدمة Arabi Pay وسياسة الإنذارات (2 Strikes): في حال تأكيد الطلب وعدم السداد أو الإلغاء غير المبرر يتم تسجيل إنذار (Strike)، وعند مرتين يتم حظر الحساب ورقم الهاتف نهائياً دون الرجوع للخدمة إلا بمراجعة الدعم الفني.
                        </>
                      ) : (
                        <>
                          I commit to instant payment upon receiving details, and agree to Arabi Pay express terms & 2-Strikes policy: non-payment or unjustified cancellation incurs strikes, and 2 strikes result in an automatic permanent ban on account and phone.
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* 4. Smart Biometrics & Telegram Direct Bridge CTA */}
                <button
                  type="button"
                  onClick={() => {
                    if (userBanned) {
                      useToastStore.getState().error(
                        isAr ? 'حسابك محظور' : 'Account Banned',
                        userBanReason || (isAr ? 'تم حظر حسابك لتكرار مخالفات السداد (2 Strikes).' : 'Account is banned.')
                      );
                      return;
                    }
                    if (!arabiPayTermsAgreed) {
                      useToastStore.getState().error(
                        isAr ? 'الموافقة على الشروط مطلوبة' : 'Agreement Required',
                        isAr ? 'يرجى وضع علامة الصح في المربع أعلاه للموافقة على شروط الالتزام للمتابعة.' : 'Please check the agreement box above to proceed.'
                      );
                      return;
                    }
                    setIsBiometricAuthOpen(true);
                  }}
                  disabled={isNotifyingArab}
                  className="w-full p-3.5 bg-[#FFE600] hover:bg-[#ffd900] active:translate-x-0.5 active:translate-y-0.5 border-2 border-black text-black rounded-xl sm:rounded-2xl flex items-center justify-between gap-2.5 shadow-[3.5px_3.5px_0px_0px_#000] transition-all group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-black text-[#FFE600] border border-black flex items-center justify-center p-1 shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      <Fingerprint className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="text-start min-w-0">
                      <span className="text-xs sm:text-sm font-black text-black block truncate">
                        {isAr ? 'تأكيد بالبصمة الذكية والدفع بـ Arabi Pay' : 'Authenticate Biometrics & Pay via Arabi Pay'}
                      </span>
                      <span className="text-[10px] text-neutral-700 font-bold block truncate">
                        {isAr ? 'التحقق البيومتري الفوري لجهازك والتوجيه للدعم' : 'Fast-track biometric signature & direct support'}
                      </span>
                    </div>
                  </div>
                  <div className="px-2.5 py-1.5 bg-black text-[#FFE600] rounded-lg border border-black font-black text-xs flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] group-hover:scale-105 transition-transform shrink-0">
                    <span>{isAr ? 'تأكيد البصمة' : 'Verify'}</span>
                    <Zap className="w-3 h-3 stroke-[2.5]" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 3. INSTAPAY DIRECT PAYMENT (SMART ICONIC STEPS) */}
          {selectedMethodId === 'instapay' && (
            <div>
              {/* InstaPay Brand Bar */}
              <div className="p-3 bg-[#432371] text-white border-b-2 border-black flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-black flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    <img src="/images/payment/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-yellow-300 leading-tight">InstaPay Egypt</h4>
                    <p className="text-[10px] text-purple-200 font-bold flex items-center gap-1">
                      <span>{isAr ? 'المستلم المعتمد:' : 'Verified Recipient:'}</span>
                      <span className="font-mono text-yellow-300 font-black">UpStore Official IPA</span>
                      <Check className="w-3 h-3 text-emerald-400 stroke-[3] inline" />
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#FFE600] text-black border border-black rounded text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                  {isAr ? 'لحظي 0%' : '0% Fee'}
                </span>
              </div>

              {/* InstaPay Iconic Smart Steps */}
              <div className="p-3 sm:p-4 space-y-2.5 bg-[#FFFDF9]">
                {/* STEP 1: Exact Amount in EGP */}
                <div className="p-2.5 sm:p-3 bg-[#FFF9E6] border-2 border-black rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#FFE600] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      1
                    </div>
                    <div className="text-start min-w-0">
                      <span className="text-[10px] text-neutral-600 font-bold block truncate">
                        {isAr ? 'المبلغ المطلوب سداده بدقة:' : 'Exact Amount to Transfer:'}
                      </span>
                      <span className="font-mono font-black text-sm sm:text-base text-black select-all tracking-wider">
                        {egpAmount} ج.م
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(egpAmount, 'amount_instapay')}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer shrink-0"
                  >
                    {copiedKey === 'amount_instapay' ? <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{copiedKey === 'amount_instapay' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ المبلغ' : 'Copy Amount')}</span>
                  </button>
                </div>

                {/* STEP 2: Direct App Link Button */}
                <div className="p-2.5 sm:p-3 bg-[#F0FDF4] border-2 border-black rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#06D6A0] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      2
                    </div>
                    <div className="text-start min-w-0">
                      <span className="text-xs font-black text-black block truncate">
                        {isAr ? 'فتح تطبيق InstaPay والتحويل فوراً' : 'Open InstaPay App & Transfer'}
                      </span>
                      <span className="text-[10px] text-neutral-600 font-bold block truncate">
                        {isAr ? 'المستلم مكتوب تلقائياً في التطبيق' : 'Pre-filled recipient in app'}
                      </span>
                    </div>
                  </div>
                  <a
                    href="https://t.me/UPSTORE_HELP"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#501A79] hover:bg-[#3E1260] text-white border-2 border-black rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
                  >
                    <span>{isAr ? 'فتح تطبيق InstaPay' : 'Open InstaPay App'}</span>
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  </a>
                </div>

                {/* STEP 3: Submit Proof / Finish */}
                <div className="p-2.5 sm:p-3 bg-[#EAF5FF] border-2 border-black rounded-xl sm:rounded-2xl flex items-center gap-2.5 shadow-[2px_2px_0px_0px_#000] text-start">
                  <div className="w-7 h-7 rounded-lg bg-[#0079C1] border-2 border-black font-black text-xs text-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    3
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-black block">
                      {isAr ? 'تأكيد السداد ومتابعة المراجعة والتسليم' : 'Confirm Payment & Proceed to Delivery'}
                    </span>
                    <p className="text-[10.5px] text-neutral-700 font-bold leading-tight mt-0.5">
                      {isAr
                        ? 'احفظ لقطة شاشة للإيصال ثم اضغط بالأسفل على (تم التحويل ← متابعة) لرفع الإثبات لمراجعة الدفع واستلام حسابك ⚡'
                        : 'Take a screenshot of the receipt, then click Proceed below to upload proof for review and fulfillment ⚡'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. ORANGE CASH - COMING SOON SMART STATE */}
          {selectedMethodId === 'orange_cash' && (
            <div>
              {/* Orange Brand Bar */}
              <div className="p-3 bg-black text-white border-b-2 border-black flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-black border border-black flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    <img src="/images/payment/orange.png" alt="Orange Cash" className="w-full h-full object-contain" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-white">
                    {isAr ? 'محفظة أورنج كاش (Orange Cash)' : 'Orange Cash Wallet'}
                  </h4>
                </div>
                <span className="px-2 py-0.5 bg-[#FFE600] text-black border border-black rounded text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                  {isAr ? 'ستتوفر قريباً' : 'Coming Soon'}
                </span>
              </div>

              {/* Orange Body - Smart Maintenance Notice & 1-Click Alternative Switches */}
              <div className="p-3.5 sm:p-4 bg-[#FFFDF9] space-y-3 text-start">
                <div className="p-3 bg-amber-50 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FFE600] border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000] mt-0.5">
                    <Clock className="w-4 h-4 text-black stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-black text-amber-950">
                      {isAr ? 'محفظة أورنج كاش تخضع لأعمال الصيانة والتطوير الدوري' : 'Orange Cash Under Maintenance & Upgrade'}
                    </h5>
                    <p className="text-[10.5px] font-bold text-amber-900 leading-relaxed mt-0.5">
                      {isAr
                        ? 'نعمل حالياً على ترقية خوادم محفظة أورنج كاش وسيتم إعادة تفعيلها قريباً. يمكنك إتمام طلبك الآن فوراً عبر المحافظ المصرية النشطة البديلة:'
                        : 'We are currently upgrading our Orange Cash gateway servers. It will be reopening shortly. You can complete your order instantly via other active Egypt wallets:'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-0.5">
                  <label className="text-xs font-black text-black block">
                    {isAr ? 'اختر وسيلة دفع بديلة ومتاحة فوراً لإتمام طلبك الآن:' : 'Choose an active alternative method to pay instantly:'}
                  </label>

                  {/* Quick Switch 1: InstaPay */}
                  <button
                    type="button"
                    onClick={() => setSelectedMethodId('instapay')}
                    className="w-full p-2.5 bg-[#F9F3FF] hover:bg-[#f0e2ff] border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer text-start group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white border border-black flex items-center justify-center p-0.5 shrink-0 shadow-[1px_1px_0px_0px_#000]">
                        <img src="/images/payment/instapay.png" alt="InstaPay" className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-black block truncate">
                          {isAr ? 'إنستاباي (InstaPay Egypt)' : 'InstaPay Egypt'}
                        </span>
                        <span className="text-[10px] text-purple-900 font-bold block truncate">
                          {isAr ? 'تحويل لحظي مباشر 0% رسوم عبر منظومة إنستاباي' : 'Instant IPA transfer via InstaPay network'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-[#FFE600] text-black border border-black rounded-lg text-[10px] font-black shrink-0 group-hover:scale-105 transition-transform">
                      {isAr ? 'ادفع بـ إنستاباي ←' : 'Pay via InstaPay →'}
                    </span>
                  </button>

                  {/* Quick Switch 2: PayPal */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentTab('global');
                      setSelectedMethodId('paypal');
                    }}
                    className="w-full p-2.5 bg-[#EBF5FF] hover:bg-[#d8edff] border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer text-start group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white border border-black flex items-center justify-center p-1 shrink-0 shadow-[1px_1px_0px_0px_#000]">
                        <img src="/images/payment/paypal.svg" alt="PayPal" className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-black block truncate">
                          {isAr ? 'بايبال مباشر (PayPal Direct Payment)' : 'PayPal Direct Payment'}
                        </span>
                        <span className="text-[10px] text-blue-900 font-bold block truncate">
                          {isAr ? 'دفع فوري 0% رسوم عبر الحساب الرسمي' : '0% Fees Instant PayPal'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-[#FFE600] text-black border border-black rounded-lg text-[10px] font-black shrink-0 group-hover:scale-105 transition-transform">
                      {isAr ? 'ادفع بـ PayPal ←' : 'Pay via PayPal →'}
                    </span>
                  </button>

                  {/* Quick Switch 3: Arab Payment Methods (Up) */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentTab('global');
                      setSelectedMethodId('arab_local_methods');
                    }}
                    className="w-full p-2.5 bg-[#F4FDF7] hover:bg-[#e0f8e9] border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer text-start group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-black flex items-center justify-center overflow-hidden shrink-0 shadow-[1px_1px_0px_0px_#000] relative group">
                        <img
                          src={detectedUserCountryConfig?.flagUrl || 'https://flagcdn.com/w80/sa.png'}
                          alt="Flag"
                          className="absolute inset-0 w-full h-full object-cover transform scale-110 group-hover:scale-125 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/25 backdrop-blur-[0.5px]" />
                        <div className="relative z-10 w-5 h-5 rounded-md bg-white/95 border border-black shadow-[1px_1px_0px_0px_#000] flex items-center justify-center p-0.5 group-hover:scale-110 transition-transform duration-200">
                          <img src="/images/up-logo.svg" alt="Up" className="w-full h-full object-contain" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-black block truncate">
                          {isAr ? 'طرق الدفع العربية (Up)' : 'Other Arab Payment Methods (Up)'}
                        </span>
                        <span className="text-[10px] text-emerald-900 font-bold block truncate">
                          {isAr ? 'تحويلات بنكية ومحافظ لكافة الدول العربية مع دعم فوري' : 'Wallets & instant transfers for all Arab countries'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-[#FFE600] text-black border border-black rounded-lg text-[10px] font-black shrink-0 group-hover:scale-105 transition-transform">
                      {isAr ? 'دفع عربي ←' : 'Arab Pay →'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. VODAFONE CASH - ACTIVE SMART PAYMENT CARD */}
          {selectedMethodId === 'vodafone_cash' && (() => {
            const roundedEgpAmount = Math.ceil(orderPricing.totalEgp || totalUsd * 53);
            const vfNumber = '';
            const vfUssd = `*9*7*${roundedEgpAmount}#`;
            const vfDeepUrl = 'https://t.me/UPSTORE_HELP';

            return (
              <div>
                {/* Vodafone Brand Bar */}
                <div className="p-3 bg-[#E60000] text-white border-b-2 border-black flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white border border-black flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      <img src="/images/payment/vodafone.svg" alt="Vodafone Cash" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                        {isAr ? 'محفظة فودافون كاش وكافة المحافظ المصرية' : 'Vodafone Cash & Egyptian Mobile Wallets'}
                      </h4>
                      <span className="text-[10px] text-red-100 font-bold block">
                        {isAr ? 'التحويل متاح من فودافون، أورنج، اتصالات، وي، والمحافظ البنكية' : 'Accepts transfers from all Egyptian mobile & bank wallets'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-[#FFE600] text-black border border-black rounded text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                    {isAr ? 'فوري 0% رسوم' : '0% Fee'}
                  </span>
                </div>

                {/* Vodafone Body - Interactive Transfer Steps */}
                <div className="p-3.5 sm:p-4 bg-[#FFFDF9] space-y-2.5 text-start">
                  
                  {/* STEP 1: Exact Amount in EGP */}
                  <div className="p-2.5 bg-[#FFF9E6] border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[1.5px_1.5px_0px_0px_#000]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-[#FFE600] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0">
                        1
                      </div>
                      <div className="text-start min-w-0">
                        <span className="text-[10px] text-neutral-600 font-bold block truncate">
                          {isAr ? 'المبلغ المطلوب سداده بالضبط:' : 'Exact Amount to Transfer:'}
                        </span>
                        <span className="font-mono font-black text-xs sm:text-sm text-black select-all tracking-wider">
                          {roundedEgpAmount} ج.م
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(roundedEgpAmount.toString(), 'vf_modal_amount')}
                      className="px-3 py-1 bg-white hover:bg-neutral-100 border-2 border-black rounded-lg text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] cursor-pointer shrink-0"
                    >
                      {copiedKey === 'vf_modal_amount' ? <Check className="w-3 h-3 stroke-[3] text-emerald-600" /> : <Copy className="w-3 h-3 stroke-[2.5]" />}
                      <span>{copiedKey === 'vf_modal_amount' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ المبلغ' : 'Copy')}</span>
                    </button>
                  </div>

                  {/* STEP 2: Direct Support Dispatch */}
                  <div className="p-2.5 bg-white border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[1.5px_1.5px_0px_0px_#000]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-[#E60000] border-2 border-black font-black text-xs text-white flex items-center justify-center shrink-0">
                        2
                      </div>
                      <div className="text-start min-w-0">
                        <span className="text-[10px] text-neutral-600 font-bold block truncate">
                          {isAr ? 'تأكيد واستلام بيانات التحويل المباشرة:' : 'Direct Wallet Transfer Details:'}
                        </span>
                        <span className="font-black text-xs sm:text-sm text-black select-all tracking-wider">
                          @UPSTORE_HELP
                        </span>
                      </div>
                    </div>
                    <a
                      href="https://t.me/UPSTORE_HELP"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-[#0088cc] hover:bg-[#0077b5] text-white border-2 border-black rounded-lg text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_#000] cursor-pointer shrink-0"
                    >
                      <span>{isAr ? 'تواصل مع الدعم' : 'Contact Support'}</span>
                      <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                    </a>
                  </div>

                  {/* Multi-Network Notice */}
                  <div className="p-2 bg-neutral-50 border border-black rounded-lg text-[10px] text-neutral-700 font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>
                      {isAr
                        ? 'ملاحظة: الدفع متاح عبر كافة المحافظ الإلكترونية في مصر (فودافون كاش، أورنج، اتصالات، وي، وإنستاباي).'
                        : 'Note: Payment is accepted across all mobile wallets and instant banking in Egypt.'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 5. SAUDI STC PAY (SMART ICONIC STEPS) */}
          {selectedMethodId === 'stc_pay' && (
            <div>
              {/* STC Brand Bar */}
              <div className="p-3 bg-[#4F008C] text-white border-b-2 border-black flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-black flex items-center justify-center p-1 shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    <img src="/images/payment/stcpay.svg" alt="STC Pay" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white leading-tight">STC Pay Saudi Arabia</h4>
                    <p className="text-[10px] text-purple-200 font-bold">{isAr ? 'تحويل فوري مباشر بالريال السعودي' : 'Direct SAR Instant Transfer'}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#06D6A0] text-black border border-black rounded text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                  {isAr ? 'فوري SAR' : 'Direct SAR'}
                </span>
              </div>

              {/* STC Iconic Smart Steps */}
              <div className="p-3 sm:p-4 space-y-2.5 bg-[#FFFDF9]">
                {/* STEP 1: Exact Amount in SAR */}
                <div className="p-2.5 sm:p-3 bg-[#FFF9E6] border-2 border-black rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#FFE600] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      1
                    </div>
                    <div className="text-start min-w-0">
                      <span className="text-[10px] text-neutral-600 font-bold block truncate">
                        {isAr ? 'المبلغ المطلوب بالريال السعودي:' : 'Exact Amount in SAR:'}
                      </span>
                      <span className="font-mono font-black text-sm sm:text-base text-black select-all tracking-wider">
                        {sarAmount} ر.س
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(sarAmount, 'amount_stc')}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer shrink-0"
                  >
                    {copiedKey === 'amount_stc' ? <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{copiedKey === 'amount_stc' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ المبلغ' : 'Copy Amount')}</span>
                  </button>
                </div>

                {/* STEP 2: STC Pay Wallet Number */}
                <div className="p-2.5 sm:p-3 bg-[#F4EDFF] border-2 border-black rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#4F008C] border-2 border-black font-black text-xs text-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      2
                    </div>
                    <div className="text-start min-w-0">
                      <span className="text-[10px] text-neutral-600 font-bold block truncate">
                        {isAr ? 'رقم محفظة التحويل (STC Pay):' : 'STC Pay Mobile / Account:'}
                      </span>
                      <span className="font-mono font-black text-sm sm:text-base text-black select-all tracking-wider">
                        0551234567
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('0551234567', 'stc_num')}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shrink-0"
                  >
                    {copiedKey === 'stc_num' ? <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{copiedKey === 'stc_num' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الرقم' : 'Copy Number')}</span>
                  </button>
                </div>

                {/* STEP 3: Transfer Instructions */}
                <div className="p-2.5 sm:p-3 bg-[#F0FDF4] border-2 border-black rounded-xl sm:rounded-2xl flex items-center gap-2.5 shadow-[2px_2px_0px_0px_#000] text-start">
                  <div className="w-7 h-7 rounded-lg bg-[#06D6A0] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    3
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-black block">
                      {isAr ? 'التحويل من تطبيق STC Pay' : 'Transfer via STC Pay App'}
                    </span>
                    <p className="text-[10.5px] text-neutral-600 font-bold leading-tight mt-0.5">
                      {isAr ? 'افتح تطبيق STC Pay واختر تحويل إلى رقم محفظة ثم أدخل الرقم والمبلغ أعلاه.' : 'Open STC Pay app and transfer to the wallet number above.'}
                    </p>
                  </div>
                </div>

                {/* STEP 4: Submit Proof / Finish */}
                <div className="p-2.5 sm:p-3 bg-[#EAF5FF] border-2 border-black rounded-xl sm:rounded-2xl flex items-center gap-2.5 shadow-[2px_2px_0px_0px_#000] text-start">
                  <div className="w-7 h-7 rounded-lg bg-[#4F008C] border-2 border-black font-black text-xs text-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    4
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-black block">
                      {isAr ? 'تأكيد السداد ومتابعة المراجعة والتسليم' : 'Confirm Payment & Proceed to Delivery'}
                    </span>
                    <p className="text-[10.5px] text-neutral-700 font-bold leading-tight mt-0.5">
                      {isAr
                        ? 'احفظ لقطة شاشة للإشعار واضغط بالأسفل على (تم التحويل ← متابعة) لرفع الإيصال ومراجعة الدفع والتسليم ⚡'
                        : 'Screenshot the transfer confirmation and click Proceed below to upload proof for review ⚡'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. AL RAJHI BANK (SMART ICONIC STEPS) */}
          {selectedMethodId === 'alrajhi' && (
            <div>
              {/* Al Rajhi Brand Bar */}
              <div className="p-3 bg-[#0B2545] text-white border-b-2 border-black flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-black flex items-center justify-center p-1 shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    <img src="/images/payment/alrajhi.svg" alt="Al Rajhi" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white leading-tight">Al Rajhi Bank</h4>
                    <p className="text-[10px] text-blue-200 font-bold">{isAr ? 'تحويل بنكي فوري عبر الآيبان (سريع)' : 'Instant IBAN Bank Transfer (SARIE)'}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#4CC9F0] text-black border border-black rounded text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                  {isAr ? 'آيبان SAR' : 'Direct IBAN'}
                </span>
              </div>

              {/* Al Rajhi Iconic Smart Steps */}
              <div className="p-3 sm:p-4 space-y-2.5 bg-[#FFFDF9]">
                {/* STEP 1: Exact Amount in SAR */}
                <div className="p-2.5 sm:p-3 bg-[#FFF9E6] border-2 border-black rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#FFE600] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      1
                    </div>
                    <div className="text-start min-w-0">
                      <span className="text-[10px] text-neutral-600 font-bold block truncate">
                        {isAr ? 'المبلغ المطلوب بالريال السعودي:' : 'Exact Amount in SAR:'}
                      </span>
                      <span className="font-mono font-black text-sm sm:text-base text-black select-all tracking-wider">
                        {sarAmount} ر.س
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(sarAmount, 'amount_alrajhi')}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer shrink-0"
                  >
                    {copiedKey === 'amount_alrajhi' ? <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{copiedKey === 'amount_alrajhi' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ المبلغ' : 'Copy Amount')}</span>
                  </button>
                </div>

                {/* STEP 2: Al Rajhi IBAN */}
                <div className="p-2.5 sm:p-3 bg-[#EBF5FF] border-2 border-black rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#0077C8] border-2 border-black font-black text-xs text-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      2
                    </div>
                    <div className="text-start min-w-0">
                      <span className="text-[10px] text-neutral-600 font-bold block truncate">
                        {isAr ? 'رقم الآيبان (Al Rajhi IBAN):' : 'Official Al Rajhi IBAN:'}
                      </span>
                      <span className="font-mono font-black text-[11px] sm:text-xs text-black block select-all break-all mt-0.5">
                        SA0380000000608010167519
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('SA0380000000608010167519', 'alrajhi_iban')}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shrink-0"
                  >
                    {copiedKey === 'alrajhi_iban' ? <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{copiedKey === 'alrajhi_iban' ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الآيبان' : 'Copy IBAN')}</span>
                  </button>
                </div>

                {/* STEP 3: Transfer Instructions */}
                <div className="p-2.5 sm:p-3 bg-[#F0FDF4] border-2 border-black rounded-xl sm:rounded-2xl flex items-center gap-2.5 shadow-[2px_2px_0px_0px_#000] text-start">
                  <div className="w-7 h-7 rounded-lg bg-[#06D6A0] border-2 border-black font-black text-xs text-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    3
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-black block">
                      {isAr ? 'التحويل البنكي الفوري' : 'Instant Bank Transfer'}
                    </span>
                    <p className="text-[10.5px] text-neutral-600 font-bold leading-tight mt-0.5">
                      {isAr ? 'حوّل المبلغ عبر تطبيق بنكك أو الراجحي باستخدام الآيبان أعلاه مع اختيار التحويل الفوري (سريع).' : 'Transfer via your Saudi banking app using the IBAN above.'}
                    </p>
                  </div>
                </div>

                {/* STEP 4: Submit Proof / Finish */}
                <div className="p-2.5 sm:p-3 bg-[#EAF5FF] border-2 border-black rounded-xl sm:rounded-2xl flex items-center gap-2.5 shadow-[2px_2px_0px_0px_#000] text-start">
                  <div className="w-7 h-7 rounded-lg bg-[#0B2545] border-2 border-black font-black text-xs text-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                    4
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-black block">
                      {isAr ? 'تأكيد السداد ومتابعة المراجعة والتسليم' : 'Confirm Payment & Proceed to Delivery'}
                    </span>
                    <p className="text-[10.5px] text-neutral-700 font-bold leading-tight mt-0.5">
                      {isAr
                        ? 'احفظ لقطة شاشة لإيصال التحويل واضغط بالأسفل على (تم التحويل ← متابعة) لرفع الإيصال ومراجعة الدفع والتسليم ⚡'
                        : 'Save the transfer receipt screenshot and click Proceed below to upload proof for review ⚡'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. BANK CARDS GLOBAL GATEWAY (VISA / MASTERCARD / APPLE PAY) - COMING SOON SMART STATE */}
          {selectedMethodId === 'lemonsqueezy' && (
            <div>
              {/* Cards Brand Bar */}
              <div className="p-3 bg-[#181A1E] text-white border-b-2 border-black flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-black shadow-[1px_1px_0px_0px_#000]">
                    <img src="/images/payment/visa.svg" alt="Visa" className="h-3.5 object-contain" />
                    <img src="/images/payment/mastercard.svg" alt="Mastercard" className="h-3.5 object-contain" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-white">
                    {isAr ? 'بوابة البطاقات البنكية (Visa / MasterCard)' : 'Bank Cards (Visa & MasterCard)'}
                  </h4>
                </div>
                <span className="px-2 py-0.5 bg-[#FFE600] text-black border border-black rounded text-[10px] font-black shadow-[1px_1px_0px_0px_#000]">
                  {isAr ? 'سيفتح قريباً' : 'Opening Soon'}
                </span>
              </div>

              {/* Cards Body - Smart Maintenance Notice & 1-Click Alternative Switches */}
              <div className="p-3.5 sm:p-4 bg-[#FFFDF9] space-y-3 text-start">
                <div className="p-3 bg-amber-50 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FFE600] border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000] mt-0.5">
                    <Clock className="w-4 h-4 text-black stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-black text-amber-950">
                      {isAr ? 'البوابة البنكية تخضع لأعمال الصيانة والتطوير الدوري' : 'Bank Gateway Under Maintenance & Upgrade'}
                    </h5>
                    <p className="text-[10.5px] font-bold text-amber-900 leading-relaxed mt-0.5">
                      {isAr
                        ? 'نعمل حالياً على ترقية خوادم الدفع ببطاقات الفيزا والماستركارد لتوفير أعلى معايير الحماية 3D Secure وسيتم إعادة فتحها قريباً جداً.'
                        : 'We are currently upgrading our bank cards (Visa & MasterCard) infrastructure for enhanced 3D Secure checkout. It will be reopening very soon.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-0.5">
                  <label className="text-xs font-black text-black block">
                    {isAr ? 'اختر وسيلة دفع بديلة ومتاحة فوراً لإتمام طلبك الآن:' : 'Choose an active alternative method to pay instantly:'}
                  </label>

                  {/* Quick Switch 1: PayPal Direct */}
                  <button
                    type="button"
                    onClick={() => setSelectedMethodId('paypal')}
                    className="w-full p-2.5 bg-[#EBF5FF] hover:bg-[#d8edff] border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer text-start group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white border border-black flex items-center justify-center p-1 shrink-0 shadow-[1px_1px_0px_0px_#000]">
                        <img src="/images/payment/paypal.svg" alt="PayPal" className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-black block truncate">
                          {isAr ? 'بايبال مباشر (PayPal Direct Payment)' : 'PayPal Direct Payment'}
                        </span>
                        <span className="text-[10px] text-blue-900 font-bold block truncate">
                          {isAr ? 'دفع فوري 0% رسوم عبر الحساب الرسمي المعتمد' : '0% Fees Instant checkout via verified account'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-[#FFE600] text-black border border-black rounded-lg text-[10px] font-black shrink-0 group-hover:scale-105 transition-transform">
                      {isAr ? 'ادفع بـ PayPal ←' : 'Pay via PayPal →'}
                    </span>
                  </button>

                  {/* Quick Switch 2: Arab Payment Methods (Up) */}
                  <button
                    type="button"
                    onClick={() => setSelectedMethodId('arab_local_methods')}
                    className="w-full p-2.5 bg-[#F4FDF7] hover:bg-[#e0f8e9] border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer text-start group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-black flex items-center justify-center overflow-hidden shrink-0 shadow-[1px_1px_0px_0px_#000] relative group">
                        <img
                          src={detectedUserCountryConfig?.flagUrl || 'https://flagcdn.com/w80/sa.png'}
                          alt="Flag"
                          className="absolute inset-0 w-full h-full object-cover transform scale-110 group-hover:scale-125 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/25 backdrop-blur-[0.5px]" />
                        <div className="relative z-10 w-5 h-5 rounded-md bg-white/95 border border-black shadow-[1px_1px_0px_0px_#000] flex items-center justify-center p-0.5 group-hover:scale-110 transition-transform duration-200">
                          <img src="/images/up-logo.svg" alt="Up" className="w-full h-full object-contain" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-black block truncate">
                          {isAr ? 'طرق الدفع العربية (Up)' : 'Other Arab Payment Methods (Up)'}
                        </span>
                        <span className="text-[10px] text-emerald-900 font-bold block truncate">
                          {isAr ? 'تحويلات بنكية ومحافظ لكافة الدول العربية مع دعم فوري' : 'Wallets & instant transfers for all Arab countries'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-[#FFE600] text-black border border-black rounded-lg text-[10px] font-black shrink-0 group-hover:scale-105 transition-transform">
                      {isAr ? 'دفع عربي ←' : 'Arab Pay →'}
                    </span>
                  </button>

                  {/* Quick Switch 3: Egypt/Saudi Local Wallets if applicable */}
                  {(country === 'EG' || country === 'SA') && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentTab('local');
                        const firstLocal = availableOptions.find((o) => o.category === (country === 'EG' ? 'egypt' : 'saudi'));
                        if (firstLocal) setSelectedMethodId(firstLocal.id);
                      }}
                      className="w-full p-2.5 bg-[#FFF5EB] hover:bg-[#ffe9d2] border-2 border-black rounded-xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer text-start group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-black flex items-center justify-center p-1 shrink-0 shadow-[1px_1px_0px_0px_#000]">
                          <Smartphone className="w-4 h-4 text-orange-600 stroke-[2.5]" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-black block truncate">
                            {country === 'EG' ? (isAr ? 'المحافظ المصرية (إنستاباي InstaPay)' : 'Egypt Local Wallets (InstaPay)') : (isAr ? 'الدفع السعودي (STC Pay / الراجحي)' : 'Saudi Payments')}
                          </span>
                          <span className="text-[10px] text-amber-900 font-bold block truncate">
                            {isAr ? 'دفع فوري بالعملة المحلية مع تسليم مباشر' : 'Instant local currency transfer'}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-[#FFE600] text-black border border-black rounded-lg text-[10px] font-black shrink-0 group-hover:scale-105 transition-transform">
                        {isAr ? 'المحافظ المحلية ←' : 'Local Wallets →'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>

  {/* ─── Sticky Modal Footer & Action Button (Neubrutalism) ─── */}
  {!activeArabOrder && (
    <div className="shrink-0 bg-[#FFFDF9] border-t-2 sm:border-t-[3px] border-black p-3.5 sm:p-4 flex flex-col gap-2">
      {modalStep === 'select' ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-neutral-800 font-black">
            <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span>{isAr ? 'تشفير آمن 100% وتسليم رقمي بعد مراجعة الدفع' : '100% Secure & Encrypted Checkout'}</span>
          </div>

          <button
            type="button"
            onClick={() => setModalStep('details')}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-[#FFE600] hover:bg-[#ffd900] border-2 border-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[3px_3px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer text-black"
          >
            <Zap className="w-4 h-4 stroke-[2.5]" />
            <span>{isAr ? 'متابعة لتفاصيل وسيلة الدفع' : 'Proceed to Payment Details'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5] rtl:rotate-180" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-800 font-black">
              <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              <span>{isAr ? 'تشفير آمن 100% وحماية كاملة' : '100% Secure & Encrypted Checkout'}</span>
            </div>

            <button
              onClick={handleProceed}
              disabled={loading || isNotifyingArab}
              className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 border-2 border-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl sm:rounded-2xl shadow-[3px_3px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                selectedMethodId === 'arab_local_methods'
                  ? 'bg-[#229ED9] hover:bg-[#1b8ec5] text-white'
                  : selectedMethodId === 'lemonsqueezy' || selectedMethodId === 'orange_cash'
                  ? 'bg-[#FFE600] hover:bg-[#ffd900] text-black'
                  : selectedMethodId === 'vodafone_cash'
                  ? 'bg-[#E60000] hover:bg-[#c90000] text-white'
                  : selectedMethodId === 'paypal' || activeOption.category === 'egypt' || activeOption.category === 'saudi'
                  ? 'bg-[#06D6A0] hover:bg-[#05be8e] text-black'
                  : 'bg-[#FFE600] hover:bg-[#ebd300] text-black'
              }`}
            >
              {loading || isNotifyingArab ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري المعالجة...' : 'Processing...'}</span>
                </>
              ) : selectedMethodId === 'lemonsqueezy' || selectedMethodId === 'orange_cash' ? (
                <>
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                  <span>{isAr ? 'ستتوفر قريباً (اضغط للبديل المتاح)' : 'Coming Soon (Click for Alternatives)'}</span>
                </>
              ) : selectedMethodId === 'arab_local_methods' ? (
                <>
                  <Fingerprint className="w-4 h-4 stroke-[2.5]" />
                  <span>{isAr ? 'تأكيد الطلب بالبصمة الذكية والدفع بـ Arabi Pay' : 'Confirm with Biometrics & Pay via Arabi Pay'}</span>
                  <Zap className="w-4 h-4 stroke-[2.5]" />
                </>
              ) : selectedMethodId === 'vodafone_cash' || selectedMethodId === 'paypal' || activeOption.category === 'egypt' || activeOption.category === 'saudi' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{isAr ? 'تم التحويل ← متابعة لرفع الإيصال والتسليم' : 'Transferred ← Proceed to Submit Receipt'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5] rtl:rotate-180" />
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 stroke-[2.5]" />
                  <span>{isAr ? 'الانتقال إلى بوابة الدفع الآمنة' : 'Proceed to Secure Payment'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5] rtl:rotate-180" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-1 text-[11px] font-bold text-neutral-600">
            <p className="text-start leading-tight">
              {selectedMethodId === 'arab_local_methods'
                ? (isAr
                  ? 'خدمة Arabi Pay المخصصة: يلزم الالتزام التام بالسداد الفوري فور استلام البيانات لتفادي تسجيل أي إنذار (Strike) على حسابك.'
                  : 'Arabi Pay Express: Strict payment commitment is required to avoid strikes or bans on your account.')
                : (selectedMethodId === 'paypal' || activeOption.category === 'egypt' || activeOption.category === 'saudi')
                ? (isAr
                  ? 'الخطوة التالية: بعد تحويل المبلغ، اضغط على الزر أعلاه لرفع صورة الإيصال أو رقم المعاملة واستلام حسابك فوراً.'
                  : 'Next Step: After transferring the amount, click above to upload your payment receipt for instant dispatch.')
                : null}
            </p>
            <button
              type="button"
              onClick={() => setModalStep('select')}
              className="text-xs font-black text-neutral-800 hover:text-black underline cursor-pointer shrink-0"
            >
              {isAr ? '← اختيار وسيلة دفع أخرى' : '← Choose another method'}
            </button>
          </div>
        </>
      )}
    </div>
  )}

</motion.div>

      {/* Smart Biometric Verification Modal for Arabi Pay */}
      <BiometricAuthModal
        isOpen={isBiometricAuthOpen}
        onClose={() => setIsBiometricAuthOpen(false)}
        onSuccess={() => {
          setIsBiometricAuthOpen(false);
          handleConnectArabTelegramSupport(true);
        }}
        displayPrice={effectiveArabDisplayPrice}
        countryName={isAr ? (ARAB_COUNTRIES_PAYMENT_DATA.find((c) => c.code === selectedArabCountryCode)?.nameAr || 'دولة عربية') : (ARAB_COUNTRIES_PAYMENT_DATA.find((c) => c.code === selectedArabCountryCode)?.nameEn || 'Arab Country')}
        methodName={isAr ? (ARAB_COUNTRIES_PAYMENT_DATA.find((c) => c.code === selectedArabCountryCode)?.popularMethods.find((m) => m.id === selectedArabMethodId)?.nameAr || 'عربي باي') : (ARAB_COUNTRIES_PAYMENT_DATA.find((c) => c.code === selectedArabCountryCode)?.popularMethods.find((m) => m.id === selectedArabMethodId)?.nameEn || 'Arabi Pay')}
        isArabic={isAr}
        orderRef={`UP-${Date.now().toString().slice(-6)}`}
        strikeCount={userStrikes}
      />
</div>
);
}
