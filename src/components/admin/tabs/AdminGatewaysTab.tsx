'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Zap,
  ShieldCheck,
  Globe,
  Bitcoin,
  Building,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Power,
  Layers,
  Activity,
  Check
} from 'lucide-react';
import { useToastStore } from '@/store/useToastStore';

export interface GatewayMethod {
  id: string;
  nameAr: string;
  nameEn: string;
  badgeAr: string;
  badgeEn: string;
  currency: string;
  details?: string;
}

export interface GatewayItem {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'global' | 'crypto' | 'egypt' | 'saudi' | 'wallet';
  icon: string;
  enabled: boolean;
  status: 'operational' | 'degraded' | 'error' | 'disabled';
  statusMessageAr: string;
  statusMessageEn: string;
  latencyMs: number;
  methods: GatewayMethod[];
  configSummary?: Record<string, any>;
}

interface GatewaySummary {
  totalGateways: number;
  activeGateways: number;
  operationalGateways: number;
  healthScorePercentage: number;
  totalPaymentMethods: number;
}

interface AdminGatewaysTabProps {
  isRtl?: boolean;
}

export const AdminGatewaysTab: React.FC<AdminGatewaysTabProps> = ({ isRtl = true }) => {
  const [gateways, setGateways] = useState<GatewayItem[]>([]);
  const [summary, setSummary] = useState<GatewaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs: number }>>({});
  const [expandedGateways, setExpandedGateways] = useState<Record<string, boolean>>({});

  const toast = useToastStore();

  const fetchGateways = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/gateways/status');
      const data = await res.json();
      if (res.ok && data.success) {
        setGateways(data.gateways || []);
        setSummary(data.summary || null);
        if (isManualRefresh) {
          toast.success(
            isRtl ? 'تم تحديث حالة بوابات الدفع بنجاح' : 'Payment gateways status refreshed',
            isRtl ? `${data.summary?.operationalGateways || 0} بوابات تعمل بكفاءة` : 'All health metrics updated'
          );
        }
      } else {
        toast.error(isRtl ? 'فشل تحميل بيانات البوابات' : 'Failed to load gateway data', data.error);
      }
    } catch (err: any) {
      toast.error(isRtl ? 'خطأ في الاتصال' : 'Connection Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGateways();
  }, []);

  const handleToggle = async (gatewayId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    setTogglingId(gatewayId);

    // Optimistic update
    setGateways((prev) =>
      prev.map((g) => {
        if (g.id === gatewayId) {
          return {
            ...g,
            enabled: newEnabled,
            status: newEnabled ? 'operational' : 'disabled',
            statusMessageAr: newEnabled ? 'تم تفعيل البوابة بنجاح' : 'البوابة معطلة حالياً من قبل الإدارة',
            statusMessageEn: newEnabled ? 'Gateway enabled successfully' : 'Gateway disabled by administrator',
          };
        }
        return g;
      })
    );

    try {
      const res = await fetch('/api/admin/gateways/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayId, enabled: newEnabled }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(
          isRtl
            ? `تم ${newEnabled ? 'تفعيل' : 'تعطيل'} البوابة بنجاح`
            : `Gateway ${newEnabled ? 'enabled' : 'disabled'} successfully`,
          data.message
        );
      } else {
        // Revert on error
        fetchGateways();
        toast.error(isRtl ? 'فشل حفظ التعديل' : 'Failed to toggle gateway', data.error);
      }
    } catch (err: any) {
      fetchGateways();
      toast.error(isRtl ? 'خطأ في الشبكة' : 'Network Error', err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleTestConnection = async (gatewayId: string) => {
    setTestingId(gatewayId);
    try {
      const res = await fetch('/api/admin/gateways/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayId }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const msg = isRtl ? data.messageAr : data.messageEn;
        setTestResults((prev) => ({
          ...prev,
          [gatewayId]: { success: true, message: msg, latencyMs: data.latencyMs },
        }));
        toast.success(
          isRtl ? 'الاتصال سليم ويعمل بكفاءة!' : 'Connection Operational!',
          `${msg} (${data.latencyMs}ms)`
        );
      } else {
        const msg = (isRtl ? data.messageAr : data.messageEn) || data.error || 'Test failed';
        setTestResults((prev) => ({
          ...prev,
          [gatewayId]: { success: false, message: msg, latencyMs: data.latencyMs || 0 },
        }));
        toast.error(isRtl ? 'تنبيه في الاتصال' : 'Connection Warning', msg);
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [gatewayId]: { success: false, message: err.message, latencyMs: 0 },
      }));
      toast.error(isRtl ? 'فشل اختبار الاتصال' : 'Test Failed', err.message);
    } finally {
      setTestingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedGateways((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredGateways = gateways.filter((g) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'crypto') return g.category === 'crypto' || g.category === 'global';
    return g.category === selectedCategory;
  });

  const categories = [
    { id: 'all', labelAr: 'جميع البوابات', labelEn: 'All Gateways', count: gateways.length },
    {
      id: 'crypto',
      labelAr: 'العملات الرقمية والعالمية (Bybit / Stripe)',
      labelEn: 'Crypto & Global',
      count: gateways.filter((g) => g.category === 'crypto' || g.category === 'global').length,
    },
    {
      id: 'egypt',
      labelAr: 'مصر (إنستاباي / كاش / Paymob)',
      labelEn: 'Egypt Gateways',
      count: gateways.filter((g) => g.category === 'egypt').length,
    },
    {
      id: 'saudi',
      labelAr: 'السعودية (STC Pay / بنوك)',
      labelEn: 'Saudi Gateways',
      count: gateways.filter((g) => g.category === 'saudi').length,
    },
    {
      id: 'wallet',
      labelAr: 'المحفظة الداخلية (UpPay)',
      labelEn: 'Internal Wallet',
      count: gateways.filter((g) => g.category === 'wallet').length,
    },
  ];

  if (loading) {
    return (
      <div className="bg-white border-2 border-black p-12 text-center rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] my-6">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-black mb-4" />
        <h3 className="text-xl font-black">{isRtl ? 'جاري فحص واختبار بوابات الدفع...' : 'Testing & Analyzing Payment Gateways...'}</h3>
        <p className="text-sm font-bold text-neutral-600 mt-1">
          {isRtl ? 'يتم التحقق اللحظي من صحة الاتصال بجميع البوابات وخوادم الدفع' : 'Verifying live API health across all payment providers'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── Top Overview Banner ────────────────────────────────────────────── */}
      <div className="bg-[#FFE600] border-2 border-black p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-black text-white px-2.5 py-0.5 text-xs font-black uppercase tracking-wider rounded">
              {isRtl ? 'لوحة التحكم المركزية' : 'Admin Central Hub'}
            </span>
            <span className="bg-white text-black border border-black px-2 py-0.5 text-xs font-black rounded flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {isRtl ? 'مخصص للمشرفين فقط' : 'Admin Only'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7" />
            {isRtl ? 'إدارة بوابات وطرق الدفع' : 'Payment Gateways & Live Health'}
          </h2>
          <p className="text-sm font-bold text-black/80 mt-1 max-w-2xl">
            {isRtl
              ? 'حدد البوابات النشطة للموقع، وعاين طرق الدفع الفرعية تحت كل بوابة (مثل Bybit و Stripe والمحافظ)، وتابع مؤشر الصحة اللحظي واختبر الاتصال بنقرة واحدة.'
              : 'Configure active store gateways, view sub-methods under each provider (Bybit, Stripe, Wallets), monitor operational health, and test live connectivity.'}
          </p>
        </div>

        <button
          onClick={() => fetchGateways(true)}
          disabled={refreshing}
          className="cursor-pointer bg-white hover:bg-neutral-100 text-black border-2 border-black px-5 py-3 rounded-xl font-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-center"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {isRtl ? 'إعادة فحص واختبار الكل' : 'Refresh & Test All'}
        </button>
      </div>

      {/* ── KPI Stats Cards ────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between text-neutral-600 mb-1">
              <span className="text-xs font-black">{isRtl ? 'إجمالي البوابات' : 'Total Gateways'}</span>
              <Layers className="w-4 h-4 text-black" />
            </div>
            <div className="text-3xl font-black text-black">{summary.totalGateways}</div>
            <p className="text-xs font-bold text-neutral-500 mt-1">
              {isRtl ? 'بوابة مدعومة في المتجر' : 'Supported providers'}
            </p>
          </div>

          <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between text-neutral-600 mb-1">
              <span className="text-xs font-black">{isRtl ? 'البوابات المفعلة' : 'Active Gateways'}</span>
              <Power className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-emerald-600">
              {summary.activeGateways} <span className="text-sm text-neutral-500 font-bold">/ {summary.totalGateways}</span>
            </div>
            <p className="text-xs font-bold text-emerald-700 mt-1">
              {isRtl ? 'متاحة للعملاء عند الشراء' : 'Live at customer checkout'}
            </p>
          </div>

          <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between text-neutral-600 mb-1">
              <span className="text-xs font-black">{isRtl ? 'مؤشر الكفاءة التشغيلية' : 'Health Score'}</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-blue-600">{summary.healthScorePercentage}%</div>
            <p className="text-xs font-bold text-blue-700 mt-1">
              {isRtl ? `${summary.operationalGateways} بوابات تعمل بكفاءة تامة` : `${summary.operationalGateways} gateways fully operational`}
            </p>
          </div>

          <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between text-neutral-600 mb-1">
              <span className="text-xs font-black">{isRtl ? 'طرق الدفع الفرعية' : 'Payment Methods'}</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-black">{summary.totalPaymentMethods}</div>
            <p className="text-xs font-bold text-neutral-500 mt-1">
              {isRtl ? 'طريقة تحويل وإيداع مفعلة' : 'Sub-methods & channels'}
            </p>
          </div>
        </div>
      )}

      {/* ── Category Filter Pills ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 pt-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-black border-2 border-black transition-all flex items-center gap-2 ${
              selectedCategory === cat.id
                ? 'bg-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]'
                : 'bg-white text-black hover:bg-neutral-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
            }`}
          >
            <span>{isRtl ? cat.labelAr : cat.labelEn}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                selectedCategory === cat.id ? 'bg-white text-black' : 'bg-neutral-200 text-black'
              }`}
            >
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Gateways List ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {filteredGateways.map((gw) => {
          const isExpanded = expandedGateways[gw.id] ?? true; // default expanded
          const testRes = testResults[gw.id];

          return (
            <motion.div
              key={gw.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white border-2 border-black rounded-2xl p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all ${
                !gw.enabled ? 'bg-neutral-50/80 opacity-80' : ''
              }`}
            >
              {/* Header Row */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b-2 border-neutral-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl border-2 border-black bg-neutral-50 flex items-center justify-center p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gw.icon} alt={gw.nameEn} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-black">
                        {isRtl ? gw.nameAr : gw.nameEn}
                      </h3>
                      {/* Operational Status Badge */}
                      {gw.enabled ? (
                        gw.status === 'operational' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-500">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {isRtl ? 'تعمل بشكل صحيح' : 'Operational'}
                          </span>
                        ) : gw.status === 'degraded' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-500">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {isRtl ? 'تحتاج إلى ضبط' : 'Degraded'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-500">
                            <XCircle className="w-3.5 h-3.5" />
                            {isRtl ? 'خطأ في الربط' : 'Error'}
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-neutral-200 text-neutral-700 border border-neutral-400">
                          <Power className="w-3 h-3" />
                          {isRtl ? 'معطلة حالياً' : 'Disabled'}
                        </span>
                      )}

                      {gw.latencyMs > 0 && (
                        <span className="text-[11px] font-black text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300">
                          {gw.latencyMs}ms
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-neutral-600 mt-1">
                      {isRtl ? gw.statusMessageAr : gw.statusMessageEn}
                    </p>
                  </div>
                </div>

                {/* Right Actions: Test & Toggle */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0">
                  {/* Test Connection Button */}
                  <button
                    onClick={() => handleTestConnection(gw.id)}
                    disabled={testingId === gw.id}
                    className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-black border-2 border-black px-3.5 py-2 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-1.5"
                  >
                    {testingId === gw.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    )}
                    {isRtl ? 'اختبار الاتصال' : 'Test Connection'}
                  </button>

                  {/* Enable / Disable Switch */}
                  <button
                    onClick={() => handleToggle(gw.id, gw.enabled)}
                    disabled={togglingId === gw.id}
                    className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-black border-2 border-black transition-all flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] ${
                      gw.enabled
                        ? 'bg-emerald-400 text-black hover:bg-emerald-300'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {togglingId === gw.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : gw.enabled ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}
                    <span>{gw.enabled ? (isRtl ? 'مفعلة' : 'Enabled') : (isRtl ? 'معطلة' : 'Disabled')}</span>
                  </button>

                  {/* Expand/Collapse Chevron */}
                  <button
                    onClick={() => toggleExpand(gw.id)}
                    className="cursor-pointer p-2 rounded-lg hover:bg-neutral-100 text-neutral-600"
                    title={isRtl ? 'تفاصيل طرق الدفع' : 'Toggle Methods'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Test Result Message Box (if tested) */}
              <AnimatePresence>
                {testRes && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mt-3 p-3 rounded-xl border-2 border-black text-xs font-bold flex items-center justify-between gap-2 ${
                      testRes.success ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testRes.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>{testRes.message}</span>
                    </div>
                    {testRes.latencyMs > 0 && (
                      <span className="bg-white/80 border border-black/20 px-2 py-0.5 rounded text-[11px] font-black shrink-0">
                        {testRes.latencyMs}ms
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sub-Methods Section */}
              {isExpanded && (
                <div className="mt-4 pt-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-black text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-black" />
                      {isRtl ? 'طرق الدفع الفرعية المندرجة تحت هذه البوابة:' : 'Supported Payment Methods & Channels:'}
                    </h4>
                    <span className="text-[11px] font-bold text-neutral-400">
                      {gw.methods.length} {isRtl ? 'طرق دفع' : 'methods'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {gw.methods.map((method) => (
                      <div
                        key={method.id}
                        className="bg-neutral-50 border border-neutral-300 hover:border-black p-3 rounded-xl transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)] flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-xs font-black text-black">
                            {isRtl ? method.nameAr : method.nameEn}
                          </span>
                          <span className="bg-white border border-neutral-300 px-2 py-0.5 text-[10px] font-black rounded-md text-neutral-700 shrink-0">
                            {method.currency}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                          <span className="bg-[#FFE600]/60 border border-black/20 px-2 py-0.5 text-[10px] font-black rounded text-black">
                            {isRtl ? method.badgeAr : method.badgeEn}
                          </span>

                          {method.details && (
                            <span className="text-[10px] font-bold font-mono text-neutral-500 truncate max-w-[140px]" title={method.details}>
                              {method.details}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Config Details Preview */}
                  {gw.configSummary && Object.keys(gw.configSummary).length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-dashed border-neutral-200 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500 font-bold">
                      <span className="font-black text-neutral-700">{isRtl ? 'التهيئة الحالية:' : 'Live Config:'}</span>
                      {Object.entries(gw.configSummary).map(([key, val]) => {
                        if (val === null || val === undefined) return null;
                        return (
                          <span key={key} className="bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 font-mono">
                            {key}: <strong className="text-black">{String(val)}</strong>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
