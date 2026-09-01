'use client';

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Bot,
  Brain,
  Sparkles,
  Loader2,
  CreditCard,
  Smartphone,
  Bitcoin,
  Building,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';

interface AdminSettingsTabProps {
  announcementText: string;
  setAnnouncementText: (v: string) => void;
  flashDealUrgencyTextAr: string;
  setFlashDealUrgencyTextAr: (v: string) => void;
  flashDealUrgencyTextEn: string;
  setFlashDealUrgencyTextEn: (v: string) => void;
  referralBonus: number;
  setReferralBonus: (v: number) => void;
  maintenanceMode: boolean;
  setMaintenanceMode: (v: boolean) => void;
  pollinationsApiKey?: string;
  setPollinationsApiKey?: (v: string) => void;
  pollinationsModel?: string;
  setPollinationsModel?: (v: string) => void;
  deepseekApiKey?: string;
  setDeepSeekApiKey?: (v: string) => void;
  deepseekModel?: string;
  setDeepSeekModel?: (v: string) => void;
  isTestingAI: boolean;
  aiTestResult: any;
  handleTestAIConnection: () => void;

  // Hyper-Adaptive AI Settings
  hyperAdaptiveDefault: boolean;
  setHyperAdaptiveDefault: (v: boolean) => void;
  
  // Payment Settings
  bybitApiKey: string;
  setBybitApiKey: (v: string) => void;
  bybitApiSecret: string;
  setBybitApiSecret: (v: string) => void;
  bybitUid: string;
  setBybitUid: (v: string) => void;
  bybitProxyUrl: string;
  setBybitProxyUrl: (v: string) => void;
  bybitUsdtTrc20: string;
  setBybitUsdtTrc20: (v: string) => void;
  bybitUsdtBep20: string;
  setBybitUsdtBep20: (v: string) => void;
  bybitUsdtTon: string;
  setBybitUsdtTon: (v: string) => void;
  binancePayId: string;
  setBinancePayId: (v: string) => void;
  nowpaymentsApiKey?: string;
  setNowPaymentsApiKey?: (v: string) => void;
  nowpaymentsIpnSecret?: string;
  setNowPaymentsIpnSecret?: (v: string) => void;
  lemonsqueezyApiKey?: string;
  setLemonSqueezyApiKey?: (v: string) => void;
  lemonsqueezyStoreId?: string;
  setLemonSqueezyStoreId?: (v: string) => void;
  lemonsqueezyVariantId?: string;
  setLemonSqueezyVariantId?: (v: string) => void;
  lemonsqueezyWebhookSecret?: string;
  setLemonSqueezyWebhookSecret?: (v: string) => void;
  
  instapayAddress: string;
  setInstapayAddress: (v: string) => void;
  instapayUrl: string;
  setInstapayUrl: (v: string) => void;
  vodafoneCashNumber: string;
  setVodafoneCashNumber: (v: string) => void;
  orangeCashNumber: string;
  setOrangeCashNumber: (v: string) => void;
  etisalatCashNumber: string;
  setEtisalatCashNumber: (v: string) => void;
  fawryMerchantCode: string;
  setFawryMerchantCode: (v: string) => void;

  stcPayNumber: string;
  setStcPayNumber: (v: string) => void;
  urpayNumber: string;
  setUrpayNumber: (v: string) => void;
  alrajhiIban: string;
  setAlrajhiIban: (v: string) => void;
  snbIban: string;
  setSnbIban: (v: string) => void;

  isTestingBybit: boolean;
  bybitTestResult: any;
  handleTestBybitConnection: () => void;

  handleSaveSettings: (e: React.FormEvent) => void;
  successMessage: string | null;
  at: Record<string, string>;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  announcementText,
  setAnnouncementText,
  flashDealUrgencyTextAr,
  setFlashDealUrgencyTextAr,
  flashDealUrgencyTextEn,
  setFlashDealUrgencyTextEn,
  referralBonus,
  setReferralBonus,
  maintenanceMode,
  setMaintenanceMode,
  pollinationsApiKey,
  setPollinationsApiKey,
  pollinationsModel,
  setPollinationsModel,
  deepseekApiKey,
  setDeepSeekApiKey,
  deepseekModel,
  setDeepSeekModel,
  isTestingAI,
  aiTestResult,
  handleTestAIConnection,

  hyperAdaptiveDefault,
  setHyperAdaptiveDefault,

  bybitApiKey,
  setBybitApiKey,
  bybitApiSecret,
  setBybitApiSecret,
  bybitUid,
  setBybitUid,
  bybitProxyUrl,
  setBybitProxyUrl,
  bybitUsdtTrc20,
  setBybitUsdtTrc20,
  bybitUsdtBep20,
  setBybitUsdtBep20,
  bybitUsdtTon,
  setBybitUsdtTon,
  binancePayId,
  setBinancePayId,
  nowpaymentsApiKey = '',
  setNowPaymentsApiKey,
  nowpaymentsIpnSecret = '',
  setNowPaymentsIpnSecret,
  lemonsqueezyApiKey = '',
  setLemonSqueezyApiKey,
  lemonsqueezyStoreId = '457660',
  setLemonSqueezyStoreId,
  lemonsqueezyVariantId = '',
  setLemonSqueezyVariantId,
  lemonsqueezyWebhookSecret = '',
  setLemonSqueezyWebhookSecret,

  instapayAddress,
  setInstapayAddress,
  instapayUrl,
  setInstapayUrl,
  vodafoneCashNumber,
  setVodafoneCashNumber,
  orangeCashNumber,
  setOrangeCashNumber,
  etisalatCashNumber,
  setEtisalatCashNumber,
  fawryMerchantCode,
  setFawryMerchantCode,

  stcPayNumber,
  setStcPayNumber,
  urpayNumber,
  setUrpayNumber,
  alrajhiIban,
  setAlrajhiIban,
  snbIban,
  setSnbIban,

  isTestingBybit,
  bybitTestResult,
  handleTestBybitConnection,

  handleSaveSettings,
  successMessage,
  at,
}) => {
  const activeApiKey = deepseekApiKey ?? pollinationsApiKey ?? '';
  const setActiveApiKey = (val: string) => {
    if (setDeepSeekApiKey) setDeepSeekApiKey(val);
    if (setPollinationsApiKey) setPollinationsApiKey(val);
  };

  const activeModel = deepseekModel ?? pollinationsModel ?? 'deepseek-v4-flash';
  const setActiveModel = (val: string) => {
    if (setDeepSeekModel) setDeepSeekModel(val);
    if (setPollinationsModel) setPollinationsModel(val);
  };

  return (
    <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-8 shadow-[6px_6px_0px_0px_#000] text-black">
      
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b-2 border-black pb-4 select-none">
        <div className="w-10 h-10 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_#000]">
          <SettingsIcon className="w-5 h-5 text-black stroke-[2.5]" />
        </div>
        <div>
          <h3 className="text-base font-black text-black">{at.systemSettingsTitle || 'System Settings & Payment Gateways'}</h3>
          <p className="text-xs text-neutral-700 font-bold">{at.systemSettingsDesc || 'Manage Bybit API, Egypt & Saudi Wallets, AI Engines, and Store Configurations.'}</p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-[#06D6A0] border-2 border-black rounded-xl text-xs text-black font-black flex items-center gap-2 select-none shadow-[2px_2px_0px_0px_#000]">
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-8 text-xs font-black text-neutral-800">
        
        {/* ─── SECTION 1: BYBIT API V5 & CRYPTO GATEWAY ─── */}
        <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#FFE600] border-2 border-black rounded-xl text-black shadow-[1.5px_1.5px_0px_0px_#000]">
                <Bitcoin className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-black flex items-center gap-2">
                  Bybit V5 API & Smart Crypto Settings
                  <span className="px-2 py-0.5 bg-[#06D6A0] border border-black text-[10px] font-mono font-black text-black rounded-md">
                    Bybit P2P
                  </span>
                </h4>
                <p className="text-xs text-neutral-700 font-bold">
                  Enables Bybit V5 HMAC-SHA256 signatures, deposit checking, and Vercel IP proxy routing (156.204.227.116).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestBybitConnection}
              disabled={isTestingBybit}
              className="px-3.5 py-2 bg-[#FFE600] hover:bg-[#ebd300] border-2 border-black text-black text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
            >
              {isTestingBybit ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Testing Bybit API...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Test Bybit Connection (فحص بايبت)</span>
                </>
              )}
            </button>
          </div>

          {/* Bybit Diagnostic Result */}
          {bybitTestResult && (
            <div
              className={`p-3 rounded-xl border-2 border-black text-xs font-black flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000] ${
                bybitTestResult.success ? 'bg-[#06D6A0] text-black' : 'bg-[#FF70A6] text-black'
              }`}
            >
              <div className="flex items-center gap-2">
                {bybitTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 stroke-[2.5]" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 stroke-[2.5]" />
                )}
                <span>{bybitTestResult.message || bybitTestResult.error}</span>
              </div>
              {bybitTestResult.ipStatus && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white border border-black text-black font-black">
                  Status: {bybitTestResult.ipStatus}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">Bybit API Key</label>
              <input
                type="text"
                value={bybitApiKey}
                onChange={(e) => setBybitApiKey(e.target.value)}
                placeholder="Bybit API Key (Read/Deposit permissions)..."
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">Bybit API Secret</label>
              <input
                type="password"
                value={bybitApiSecret}
                onChange={(e) => setBybitApiSecret(e.target.value)}
                placeholder="Bybit API Secret..."
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">Bybit UID (Internal 0% Fee Transfer)</label>
              <input
                type="text"
                value={bybitUid}
                onChange={(e) => setBybitUid(e.target.value)}
                placeholder="e.g. 47183921"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                Bybit Proxy URL (for Vercel IP: 156.204.227.116)
              </label>
              <input
                type="text"
                value={bybitProxyUrl}
                onChange={(e) => setBybitProxyUrl(e.target.value)}
                placeholder="http://156.204.227.116:8080 or leave empty for direct"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
              <span className="text-[10px] text-neutral-600 font-bold block">
                Routes Vercel serverless requests through your whitelisted IP (156.204.227.116).
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">Bybit USDT TRC20 Address</label>
              <input
                type="text"
                value={bybitUsdtTrc20}
                onChange={(e) => setBybitUsdtTrc20(e.target.value)}
                placeholder="TW4z3c4PZ2Gk5YQ7nN9x8vK1mB5qP9R2e1"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">Bybit USDT BEP20 (BSC) Address</label>
              <input
                type="text"
                value={bybitUsdtBep20}
                onChange={(e) => setBybitUsdtBep20(e.target.value)}
                placeholder="0x71C836e520023a1B3a0279612301A949826a7C10"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">Bybit USDT TON Address</label>
              <input
                type="text"
                value={bybitUsdtTon}
                onChange={(e) => setBybitUsdtTon(e.target.value)}
                placeholder="EQBvW8m53GoU_jPAIp7LwY8Gj044kX_613p_dC6lQ1_y9Z1X"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">Binance Pay ID</label>
              <input
                type="text"
                value={binancePayId}
                onChange={(e) => setBinancePayId(e.target.value)}
                placeholder="e.g. 764476139"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>
          </div>
        </div>

        {/* ─── SECTION 1.1: NOWPAYMENTS 300+ CRYPTO GATEWAY ─── */}
        <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center gap-2 border-b-2 border-black pb-3">
            <div className="w-8 h-8 rounded-lg bg-[#00E599] border-2 border-black flex items-center justify-center p-1.5 shadow-[1px_1px_0px_0px_#000]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/payment/nowpayments.svg" alt="NOWPayments" className="w-full h-full object-contain" />
            </div>
            <div>
              <h4 className="text-sm font-black text-black flex items-center gap-2">
                NOWPayments Gateway Configuration (بوابة الدفع المشفرة)
                <span className="px-2 py-0.5 bg-[#00E599] border border-black text-[10px] font-mono font-black text-black rounded-md">
                  300+ Cryptos
                </span>
              </h4>
              <p className="text-xs text-neutral-700 font-bold">
                Enables instant hosted checkout for USDT, BTC, ETH, SOL, TON, and 300+ crypto assets with HMAC-SHA512 automated IPN key delivery.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                NOWPayments API Key (مفتاح الـ API)
              </label>
              <input
                type="text"
                value={nowpaymentsApiKey}
                onChange={(e) => setNowPaymentsApiKey && setNowPaymentsApiKey(e.target.value)}
                placeholder="Get from Store Settings > Payment API Keys on nowpayments.io"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
              <span className="text-[10px] text-neutral-600 font-bold block">
                تجد هذا المفتاح في لوحة تحكم NOWPayments تحت <strong>Store Settings &gt; Payment API Keys</strong>.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                NOWPayments IPN Secret Key (مفتاح التوقيع الرقمي للـ Webhook)
              </label>
              <input
                type="password"
                value={nowpaymentsIpnSecret}
                onChange={(e) => setNowPaymentsIpnSecret && setNowPaymentsIpnSecret(e.target.value)}
                placeholder="Get from Store Settings > Instant Payment Notifications (IPN)"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
              <span className="text-[10px] text-neutral-600 font-bold block">
                توليد المفتاح من <strong>Store Settings &gt; Generate IPN Secret Key</strong> للتحقق اللحظي المشفر HMAC-SHA512.
              </span>
            </div>
          </div>
        </div>

        {/* ─── SECTION 1.2: LEMON SQUEEZY GLOBAL GATEWAY (CARDS, APPLE PAY, PAYPAL) ─── */}
        <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center gap-2 border-b-2 border-black pb-3">
            <div className="w-8 h-8 rounded-lg bg-[#FFC800] border-2 border-black flex items-center justify-center p-1.5 shadow-[1px_1px_0px_0px_#000]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/payment/lemonsqueezy.svg" alt="Lemon Squeezy" className="w-full h-full object-contain" />
            </div>
            <div>
              <h4 className="text-sm font-black text-black flex items-center gap-2">
                Lemon Squeezy Gateway (بطاقات فيزا، ماستركارد، Apple Pay، بايبال)
                <span className="px-2 py-0.5 bg-[#FFC800] border border-black text-[10px] font-mono font-black text-black rounded-md">
                  Global Cards &amp; Apple Pay
                </span>
              </h4>
              <p className="text-xs text-neutral-700 font-bold">
                Accept 3D-Secure Visa, MasterCard, Apple Pay, Google Pay &amp; PayPal with Merchant of Record global tax compliance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                Lemon Squeezy API Key (مفتاح الـ API)
              </label>
              <input
                type="text"
                value={lemonsqueezyApiKey}
                onChange={(e) => setLemonSqueezyApiKey && setLemonSqueezyApiKey(e.target.value)}
                placeholder="eyJ0eXAi..."
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
              <span className="text-[10px] text-neutral-600 font-bold block">
                استخرج المفتاح من <strong>Settings &gt; API</strong> في لوحة تحكم Lemon Squeezy.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                Store ID (معرّف المتجر)
              </label>
              <input
                type="text"
                value={lemonsqueezyStoreId}
                onChange={(e) => setLemonSqueezyStoreId && setLemonSqueezyStoreId(e.target.value)}
                placeholder="457660"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
              <span className="text-[10px] text-neutral-600 font-bold block">
                معرّف متجرك في Lemon Squeezy (مثلاً: <code>457660</code> لمتجر upstore).
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                Variant ID (اختياري / معرّف المنتج)
              </label>
              <input
                type="text"
                value={lemonsqueezyVariantId}
                onChange={(e) => setLemonSqueezyVariantId && setLemonSqueezyVariantId(e.target.value)}
                placeholder="Leave blank to auto-detect from store"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
              <span className="text-[10px] text-neutral-600 font-bold block">
                اتركه فارغاً ليقوم النظام بجلب أول Variant تلقائياً من متجرك.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                Webhook Signing Secret (مفتاح سر الويب هوك)
              </label>
              <input
                type="password"
                value={lemonsqueezyWebhookSecret}
                onChange={(e) => setLemonSqueezyWebhookSecret && setLemonSqueezyWebhookSecret(e.target.value)}
                placeholder="Get from Settings > Webhooks"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono text-xs font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
              <span className="text-[10px] text-neutral-600 font-bold block">
                رابط الويب هوك: <code>https://your-domain.vercel.app/api/webhooks/lemonsqueezy</code>
              </span>
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: EGYPT LOCAL PAYMENT ACCOUNTS ─── */}
        <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center gap-2 border-b-2 border-black pb-3">
            <div className="w-8 h-8 rounded-lg bg-[#FFE600] border-2 border-black flex items-center justify-center text-xs font-black shadow-[1px_1px_0px_0px_#000]">
              EG
            </div>
            <div>
              <h4 className="text-sm font-black text-black">
                Egypt Local Payment Gateways (طرق الدفع في مصر)
              </h4>
              <p className="text-xs text-neutral-700 font-bold">
                InstaPay IPA, Vodafone Cash, Orange, Etisalat, and Fawry.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                InstaPay IPA Address (عنوان إنستاباي)
              </label>
              <input
                type="text"
                value={instapayAddress}
                onChange={(e) => setInstapayAddress(e.target.value)}
                placeholder="e.g. upstore@instapay"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                InstaPay Direct Payment URL (رابط دفع إنستاباي المباشر)
              </label>
              <input
                type="text"
                value={instapayUrl}
                onChange={(e) => setInstapayUrl(e.target.value)}
                placeholder="e.g. https://ipn.eg/S/upstore/instapay/..."
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                Vodafone Cash Number (رقم فودافون كاش)
              </label>
              <input
                type="text"
                value={vodafoneCashNumber}
                onChange={(e) => setVodafoneCashNumber(e.target.value)}
                placeholder="e.g. 01098765432"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                Orange Cash Number (رقم أورنج كاش)
              </label>
              <input
                type="text"
                value={orangeCashNumber}
                onChange={(e) => setOrangeCashNumber(e.target.value)}
                placeholder="e.g. 01234567890"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                Etisalat Cash Number (رقم اتصالات كاش)
              </label>
              <input
                type="text"
                value={etisalatCashNumber}
                onChange={(e) => setEtisalatCashNumber(e.target.value)}
                placeholder="e.g. 01123456789"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-neutral-800 text-xs font-black">
                Fawry & Aman Merchant Reference Code (كود خدمة فوري)
              </label>
              <input
                type="text"
                value={fawryMerchantCode}
                onChange={(e) => setFawryMerchantCode(e.target.value)}
                placeholder="e.g. 984120"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>
          </div>
        </div>

        {/* ─── SECTION 3: SAUDI ARABIA PAYMENT ACCOUNTS ─── */}
        <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center gap-2.5 border-b-2 border-black pb-3">
            <div className="w-8 h-8 rounded-lg bg-[#06D6A0] border-2 border-black flex items-center justify-center text-xs font-black shadow-[1px_1px_0px_0px_#000]">
              SA
            </div>
            <div>
              <h4 className="text-sm font-black text-black">
                Saudi Arabia Payment Gateways (طرق الدفع في السعودية)
              </h4>
              <p className="text-xs text-neutral-700 font-bold">
                STC Pay, Urpay, Al Rajhi Bank IBAN, and SNB Al Ahli IBAN.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                STC Pay Mobile Number (رقم جوال STC Pay)
              </label>
              <input
                type="text"
                value={stcPayNumber}
                onChange={(e) => setStcPayNumber(e.target.value)}
                placeholder="e.g. 0551234567"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                Urpay / Mobily Pay Mobile (رقم جوال يورباي وموبايلي باي)
              </label>
              <input
                type="text"
                value={urpayNumber}
                onChange={(e) => setUrpayNumber(e.target.value)}
                placeholder="e.g. 0551234567"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                Al Rajhi Bank IBAN (آيبان مصرف الراجحي)
              </label>
              <input
                type="text"
                value={alrajhiIban}
                onChange={(e) => setAlrajhiIban(e.target.value)}
                placeholder="SA0380000000608010167519"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                SNB Al Ahli IBAN (آيبان البنك الأهلي السعودي)
              </label>
              <input
                type="text"
                value={snbIban}
                onChange={(e) => setSnbIban(e.target.value)}
                placeholder="SA4410000001234567890123"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-mono font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
              />
            </div>
          </div>
        </div>

        {/* ─── SECTION 4: ANNOUNCEMENTS & STORE CONFIGURATION ─── */}
        <div className="space-y-1.5">
          <label className="block text-neutral-800 uppercase tracking-wider text-xs font-black">Announcement Banner Text</label>
          <textarea 
            rows={2}
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="Announcements to be shown on client header..."
            className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-black outline-none font-bold shadow-[2px_2px_0px_0px_#000] text-xs font-sans"
          />
        </div>

        {/* Live Flash Deal Urgency Text */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000]">
          <div className="space-y-1.5">
            <label className="block text-black uppercase tracking-wider text-[11px] font-black">Flash Deal Urgency Text (Arabic)</label>
            <input 
              type="text"
              value={flashDealUrgencyTextAr}
              onChange={(e) => setFlashDealUrgencyTextAr(e.target.value)}
              placeholder="مثال: عجل! المتبقي في المخزون: "
              className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
            />
            <span className="text-[10px] text-neutral-600 font-bold block">يظهر بجانب عداد الساعات في قسم العروض الخاطفة.</span>
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-black uppercase tracking-wider text-[11px] font-black">Flash Deal Urgency Text (English)</label>
            <input 
              type="text"
              value={flashDealUrgencyTextEn}
              onChange={(e) => setFlashDealUrgencyTextEn(e.target.value)}
              placeholder="e.g., Hurry! Only "
              className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black font-bold outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
            />
            <span className="text-[10px] text-neutral-600 font-bold block">Shown next to countdown in flash deals corner.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Referral wallet credit reward value */}
          <div className="space-y-1.5">
            <label className="block text-neutral-800 uppercase tracking-wider text-xs font-black">Referral Reward Credit ($)</label>
            <input 
              type="number"
              step="0.50"
              value={referralBonus}
              onChange={(e) => setReferralBonus(parseFloat(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-black outline-none font-mono font-black shadow-[2px_2px_0px_0px_#000]"
            />
            <span className="text-[10px] text-neutral-600 font-bold block">Reward added to user wallets upon completing referral progress.</span>
          </div>

          {/* Maintenance Mode Toggle */}
          <div className="space-y-1.5">
            <label className="block text-neutral-800 uppercase tracking-wider text-xs font-black">Maintenance Mode</label>
            <div className="flex items-center gap-3 bg-[#FFFDF9] border-2 border-black rounded-xl px-4 py-2.5 h-[46px] select-none shadow-[2px_2px_0px_0px_#000]">
              <input 
                type="checkbox"
                id="maintToggle"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-black text-rose-600 focus:ring-0 outline-none cursor-pointer"
              />
              <label htmlFor="maintToggle" className="text-black font-black cursor-pointer">
                {maintenanceMode ? 'ACTIVE - LOCK SITE' : 'INACTIVE - UNLOCKED'}
              </label>
            </div>
            <span className="text-[10px] text-neutral-600 font-bold block">Soft toggle flags website maintenance warnings.</span>
          </div>
        </div>

        {/* ─── SECTION 5: DEEPSEEK AI ENGINE CONFIGURATION ─── */}
        <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#B892FF] border-2 border-black rounded-xl text-black shadow-[1.5px_1.5px_0px_0px_#000]">
                <Bot className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-black flex items-center gap-2">
                  DeepSeek AI Engine Configuration
                  <span className="px-2 py-0.5 bg-[#FFE600] border border-black text-[10px] font-mono font-black text-black rounded-md">
                    {activeModel}
                  </span>
                </h4>
                <p className="text-xs text-neutral-700 font-bold">
                  Connects UpStore's AI features (Auto-Translate, Auto-Product Generator, AI Polish, Storefront Assistant, Copilot) powered by DeepSeek V4 Flash with Prompt Caching.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestAIConnection}
              disabled={isTestingAI}
              className="px-3.5 py-2 bg-[#4CC9F0] hover:bg-[#3db6db] border-2 border-black text-black text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
            >
              {isTestingAI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Testing Ping...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Test Connection (فحص الاتصال)</span>
                </>
              )}
            </button>
          </div>

          {/* Diagnostic Test Result Banner */}
          {aiTestResult && (
            <div
              className={`p-3 rounded-xl border-2 border-black text-xs font-black flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000] ${
                aiTestResult.success
                  ? 'bg-[#06D6A0] text-black'
                  : 'bg-[#FF70A6] text-black'
              }`}
            >
              <div className="flex items-center gap-2">
                {aiTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 stroke-[2.5]" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 stroke-[2.5]" />
                )}
                <span>
                  {aiTestResult.success
                    ? `${aiTestResult.message} (${aiTestResult.modelUsed || 'deepseek-v4-flash'})`
                    : aiTestResult.error}
                </span>
              </div>
              {aiTestResult.latencyMs !== undefined && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white border border-black text-black font-black">
                  Latency: {aiTestResult.latencyMs}ms
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                DeepSeek API Key (Secret Key)
              </label>
              <input
                type="password"
                value={activeApiKey}
                onChange={(e) => setActiveApiKey(e.target.value)}
                placeholder="sk-... (or leave blank to fallback to .env.local)"
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black outline-none font-mono text-xs font-bold shadow-[1.5px_1.5px_0px_0px_#000]"
              />
              <span className="text-[10px] text-neutral-600 font-bold block">
                Get your API key at{' '}
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-black underline font-black"
                >
                  platform.deepseek.com
                </a>
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-800 text-xs font-black">
                Primary AI Model (النموذج الأساسي)
              </label>
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-black rounded-xl text-black outline-none text-xs font-mono font-black shadow-[1.5px_1.5px_0px_0px_#000]"
              >
                <option value="deepseek-v4-flash">deepseek-v4-flash (DeepSeek V4 Flash - Ultra Fast & Active)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── SECTION 6: HYPER-ADAPTIVE AUTO AI GLOBAL ENGINE ─── */}
        <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#06D6A0] border-2 border-black rounded-xl text-black shadow-[1.5px_1.5px_0px_0px_#000]">
                <Brain className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-black flex items-center gap-2">
                  Hyper-Adaptive AI Global Store Engine (نظام التكيف الذاتي)
                  <span className="px-2 py-0.5 bg-[#FFE600] border border-black text-[10px] font-mono font-black text-black rounded-md">
                    Autonomous AI
                  </span>
                </h4>
                <p className="text-xs text-neutral-700 font-bold">
                  100% Autonomous AI: Cognitive Analytics, Ambient Sensing, Self-Healing Glitch Prevention & Intent Pre-rendering.
                </p>
              </div>
            </div>

            {/* Single Toggle */}
            <div className="flex items-center gap-3 bg-white border-2 border-black rounded-xl px-4 py-2 select-none shadow-[1.5px_1.5px_0px_0px_#000]">
              <input
                type="checkbox"
                id="hyperAdaptiveToggle"
                checked={hyperAdaptiveDefault}
                onChange={(e) => setHyperAdaptiveDefault(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-black text-[#06D6A0] focus:ring-0 outline-none cursor-pointer"
              />
              <label htmlFor="hyperAdaptiveToggle" className="text-black font-black cursor-pointer text-xs">
                {hyperAdaptiveDefault ? 'ENABLED BY DEFAULT (مفعل تلقائياً)' : 'DISABLED BY DEFAULT (معطل)'}
              </label>
            </div>
          </div>

          <p className="text-xs text-neutral-600 font-bold">
            يعمل هذا الخيار على تفعيل الذكاء الاصطناعي التكيفي تلقائياً لجميع زوار المتجر لقراءة وتحليل سلوك كل مستخدم وتهيئة تجربة الشراء لراحته وسرعته ذاتياً وبدون أي ضبط يدوي.
          </p>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t-2 border-black flex justify-end">
          <button 
            type="submit"
            className="px-8 py-3.5 bg-[#06D6A0] hover:bg-[#05b385] active:translate-x-0.5 active:translate-y-0.5 text-black font-black rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000] transition-all cursor-pointer flex items-center gap-2 text-sm uppercase tracking-wider"
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>{at.saveSettings || 'Save All System & Payment Settings'}</span>
          </button>
        </div>

      </form>
    </div>
  );
};
