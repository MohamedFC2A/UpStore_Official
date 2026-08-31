'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  Users,
  Search,
  RefreshCw,
  Zap,
  Activity,
  AlertTriangle,
  Eye,
  ShoppingBag,
  Clock,
  Laptop,
  Flame,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Sliders,
  CheckCircle2,
  X,
  Bot,
  UserCheck,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminDeviceIntelligenceBadge } from '../AdminDeviceIntelligenceBadge';

export interface UnifiedUserBehavioralRecord {
  id: string;
  userId: string | null;
  sessionId: string;
  email: string | null;
  displayName: string | null;
  isRegistered: boolean;
  role: string;
  walletBalance: number;
  ordersCount: number;
  totalSpent: number;
  persona: string;
  personaConfidence: number;
  profileCompleteness: number;
  cognitiveLoad: number;
  confusionScore: number;
  hesitationLevel: string;
  priceSensitivity: string;
  topCategory: string;
  categoryScores: Record<string, number>;
  viewedSlugs: string[];
  searchHistory: string[];
  cartCount: number;
  cartSlugs: string[];
  rageClicksCount: number;
  deviceInfo: Record<string, any>;
  aiReport: any | null;
  lastSeenAt: string;
  createdAt: string;
}

interface AdminHyperAdaptiveTabProps {
  isRtl?: boolean;
  at?: Record<string, string>;
}

export const AdminHyperAdaptiveTab: React.FC<AdminHyperAdaptiveTabProps> = ({
  isRtl = true,
  at = {},
}) => {
  const [users, setUsers] = useState<UnifiedUserBehavioralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<string>('all');
  const [selectedCompleteness, setSelectedCompleteness] = useState<string>('all');
  const [selectedUserType, setSelectedUserType] = useState<string>('all');

  // Selected User for Detail / AI Report Modal
  const [selectedUser, setSelectedUser] = useState<UnifiedUserBehavioralRecord | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiReportData, setAiReportData] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchUsersData = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/hyper-adaptive/users');
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      }
    } catch (err) {
      console.error('[Admin Hyper-Adaptive Tab] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  // Filtered List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        u.sessionId.toLowerCase().includes(q) ||
        (u.topCategory && u.topCategory.toLowerCase().includes(q));

      const matchPersona = selectedPersona === 'all' || u.persona === selectedPersona;

      let matchCompleteness = true;
      if (selectedCompleteness === 'mature') matchCompleteness = u.profileCompleteness >= 75;
      else if (selectedCompleteness === 'developing') matchCompleteness = u.profileCompleteness >= 40 && u.profileCompleteness < 75;
      else if (selectedCompleteness === 'early') matchCompleteness = u.profileCompleteness < 40;

      let matchType = true;
      if (selectedUserType === 'registered') matchType = u.isRegistered;
      else if (selectedUserType === 'guest') matchType = !u.isRegistered;

      return matchQuery && matchPersona && matchCompleteness && matchType;
    });
  }, [users, searchQuery, selectedPersona, selectedCompleteness, selectedUserType]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = users.length;
    const registered = users.filter((u) => u.isRegistered).length;
    const avgCompleteness = total > 0 ? Math.round(users.reduce((acc, u) => acc + u.profileCompleteness, 0) / total) : 0;
    const highHesitation = users.filter((u) => u.hesitationLevel === 'high' || u.rageClicksCount > 0).length;
    const reportsCount = users.filter((u) => Boolean(u.aiReport)).length;

    return { total, registered, avgCompleteness, highHesitation, reportsCount };
  }, [users]);

  // Open Dossier Modal
  const handleOpenUserDossier = (user: UnifiedUserBehavioralRecord) => {
    setSelectedUser(user);
    setAiReportData(user.aiReport || null);
    setAiError(null);
  };

  // Generate / Refresh AI Behavioral Report with DeepSeek V4 Flash
  const handleGenerateAiReport = async () => {
    if (!selectedUser) return;
    setIsAiGenerating(true);
    setAiError(null);

    try {
      const res = await fetch('/api/admin/ai/user-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedUser.sessionId,
          userId: selectedUser.userId,
          userEmail: selectedUser.email,
          displayName: selectedUser.displayName,
          persona: selectedUser.persona,
          personaConfidence: selectedUser.personaConfidence,
          profileCompleteness: selectedUser.profileCompleteness,
          topCategory: selectedUser.topCategory,
          categoryScores: selectedUser.categoryScores,
          viewedSlugs: selectedUser.viewedSlugs,
          searchHistory: selectedUser.searchHistory,
          cartCount: selectedUser.cartCount,
          cartSlugs: selectedUser.cartSlugs,
          ordersCount: selectedUser.ordersCount,
          totalSpent: selectedUser.totalSpent,
          hesitationLevel: selectedUser.hesitationLevel,
          cognitiveLoad: selectedUser.cognitiveLoad,
          rageClicksCount: selectedUser.rageClicksCount,
          deviceInfo: selectedUser.deviceInfo,
          forceRefresh: Boolean(aiReportData),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate AI report');
      }

      setAiReportData(data.report);
      // Update local state record
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, aiReport: data.report } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, aiReport: data.report } : null));
    } catch (err: any) {
      setAiError(err.message || 'Error communicating with DeepSeek AI');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const getPersonaBadge = (persona: string) => {
    switch (persona) {
      case 'rushed':
        return { label: isRtl ? 'سريع ومستعجل' : 'Rushed', color: 'bg-[#FFE600] text-black' };
      case 'deliberate':
        return { label: isRtl ? 'دقيق ومتروي' : 'Deliberate', color: 'bg-[#B892FF] text-black' };
      case 'elderly':
        return { label: isRtl ? 'خط واضح وثبات' : 'Gentle/Clear', color: 'bg-[#FFD166] text-black' };
      case 'power':
        return { label: isRtl ? 'محترف تقني' : 'Power User', color: 'bg-[#06D6A0] text-black' };
      default:
        return { label: isRtl ? 'متوازن وسلس' : 'Balanced', color: 'bg-neutral-200 text-black' };
    }
  };

  return (
    <div className="space-y-6 text-black" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── Header Title & Stats ── */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-6 shadow-[6px_6px_0px_0px_#000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#06D6A0] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
              <Brain className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-black">
                  {isRtl ? 'تتبع وتحليل سلوك المستخدمين (Hyper-Adaptive AI)' : 'Hyper-Adaptive AI Behavioral Intelligence'}
                </h2>
                <span className="px-2.5 py-0.5 bg-[#FFE600] border border-black rounded-lg text-[10px] font-mono font-black text-black shadow-[1px_1px_0px_0px_#000]">
                  DeepSeek V4 Flash
                </span>
              </div>
              <p className="text-xs text-neutral-700 font-bold mt-1">
                {isRtl
                  ? 'رصد لحظي لسلوكيات التصفح، درجات التردد، اكتمال البروفايل، وتقارير الذكاء الاصطناعي النفسية'
                  : 'Real-time telemetry, cognitive load, profile maturity metrics, and AI psychographic dossiers'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsersData}
              disabled={refreshing}
              className="px-4 py-2 bg-[#FFFDF9] hover:bg-neutral-100 border-2 border-black rounded-xl text-xs font-black flex items-center gap-2 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${refreshing ? 'animate-spin' : ''}`} />
              <span>{isRtl ? 'تحديث البيانات اللحظية' : 'Refresh Telemetry'}</span>
            </button>
          </div>
        </div>

        {/* ── Summary Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between text-neutral-600 mb-1">
              <span className="text-xs font-black uppercase tracking-wider">{isRtl ? 'إجمالي المتتبعين' : 'Tracked Sessions'}</span>
              <Users className="w-4 h-4 stroke-[2.5] text-black" />
            </div>
            <div className="text-2xl font-black text-black font-mono">{stats.total}</div>
            <div className="text-[10px] text-neutral-600 font-bold mt-1">
              {stats.registered} {isRtl ? 'مسجلين' : 'registered'} / {stats.total - stats.registered} {isRtl ? 'زوار' : 'guests'}
            </div>
          </div>

          <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between text-neutral-600 mb-1">
              <span className="text-xs font-black uppercase tracking-wider">{isRtl ? 'اكتمال البروفايل' : 'Avg Maturity'}</span>
              <TrendingUp className="w-4 h-4 stroke-[2.5] text-black" />
            </div>
            <div className="text-2xl font-black text-black font-mono">{stats.avgCompleteness}%</div>
            <div className="w-full bg-neutral-200 h-2 rounded-full mt-2 overflow-hidden border border-black">
              <div className="bg-[#06D6A0] h-full transition-all" style={{ width: `${stats.avgCompleteness}%` }} />
            </div>
          </div>

          <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between text-neutral-600 mb-1">
              <span className="text-xs font-black uppercase tracking-wider">{isRtl ? 'التعافي الذاتي' : 'Self-Healing'}</span>
              <Zap className="w-4 h-4 stroke-[2.5] text-[#06D6A0]" />
            </div>
            <div className="text-2xl font-black text-[#06D6A0] font-mono">100%</div>
            <div className="text-[10px] text-neutral-600 font-bold mt-1">
              {isRtl ? 'محرك التعافي نشط' : 'Active & Resilient'}
            </div>
          </div>

          <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between text-neutral-600 mb-1">
              <span className="text-xs font-black uppercase tracking-wider">{isRtl ? 'حالات التردد' : 'Hesitation Alerts'}</span>
              <AlertTriangle className="w-4 h-4 stroke-[2.5] text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 font-mono">{stats.highHesitation}</div>
            <div className="text-[10px] text-neutral-600 font-bold mt-1">
              {isRtl ? 'تدخل تعاطفي فوري' : 'Targeted care'}
            </div>
          </div>

          <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between text-neutral-600 mb-1">
              <span className="text-xs font-black uppercase tracking-wider">{isRtl ? 'تقارير AI' : 'AI Dossiers'}</span>
              <Sparkles className="w-4 h-4 stroke-[2.5] text-amber-500" />
            </div>
            <div className="text-2xl font-black text-black font-mono">{stats.reportsCount}</div>
            <div className="text-[10px] text-neutral-600 font-bold mt-1">
              {isRtl ? 'سحابية ومحفوظة' : 'Cloud Cached'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3 rtl:right-3 rtl:left-auto text-neutral-500 stroke-[2.5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? 'ابحث بالاسم، البريد الإلكتروني، معرف الجلسة، أو القسم...' : 'Search by name, email, session ID, or category...'}
            className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-3 py-2 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-bold text-black placeholder-neutral-500 outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Persona Filter */}
          <select
            value={selectedPersona}
            onChange={(e) => setSelectedPersona(e.target.value)}
            className="px-3 py-2 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-black text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
          >
            <option value="all">{isRtl ? 'كل الشخصيات السلوكية' : 'All Personas'}</option>
            <option value="rushed">{isRtl ? 'سريع ومستعجل' : 'Rushed'}</option>
            <option value="deliberate">{isRtl ? 'دقيق ومتروي' : 'Deliberate'}</option>
            <option value="power">{isRtl ? 'محترف تقني' : 'Power User'}</option>
            <option value="elderly">{isRtl ? 'خط واضح وثبات' : 'Clear/Gentle'}</option>
            <option value="balanced">{isRtl ? 'متوازن' : 'Balanced'}</option>
          </select>

          {/* Completeness Filter */}
          <select
            value={selectedCompleteness}
            onChange={(e) => setSelectedCompleteness(e.target.value)}
            className="px-3 py-2 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-black text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
          >
            <option value="all">{isRtl ? 'كل مستويات النضج' : 'All Maturity Levels'}</option>
            <option value="mature">{isRtl ? 'ناضج وعالي الدقة (75%+)' : 'Mature (75%+)'}</option>
            <option value="developing">{isRtl ? 'قيد التطور (40% - 75%)' : 'Developing (40%-75%)'}</option>
            <option value="early">{isRtl ? 'أولي وحديث (<40%)' : 'Early (<40%)'}</option>
          </select>

          {/* User Type */}
          <select
            value={selectedUserType}
            onChange={(e) => setSelectedUserType(e.target.value)}
            className="px-3 py-2 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-black text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
          >
            <option value="all">{isRtl ? 'الكل (مسجلين + زوار)' : 'All (Registered + Guests)'}</option>
            <option value="registered">{isRtl ? 'المستخدمين المسجلين فقط' : 'Registered Users Only'}</option>
            <option value="guest">{isRtl ? 'جلسات الزوار فقط' : 'Guest Sessions Only'}</option>
          </select>
        </div>
      </div>

      {/* ── Users Behavioral Intelligence Table ── */}
      <div className="bg-white border-2 border-black rounded-3xl overflow-hidden shadow-[6px_6px_0px_0px_#000]">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black bg-[#FFFDF9] text-neutral-800 text-xs font-black uppercase tracking-wider select-none">
                <th className="p-4">{isRtl ? 'المستخدم / الجلسة' : 'User / Session'}</th>
                <th className="p-4">{isRtl ? 'الجهاز والبيئة' : 'Device & Specs'}</th>
                <th className="p-4">{isRtl ? 'الشخصية السلوكية' : 'Persona'}</th>
                <th className="p-4">{isRtl ? 'اكتمال البروفايل' : 'Profile Maturity'}</th>
                <th className="p-4">{isRtl ? 'الاهتمام والقسم' : 'Top Category'}</th>
                <th className="p-4">{isRtl ? 'التردد / المشاهدات' : 'Friction / Views'}</th>
                <th className="p-4">{isRtl ? 'تقرير AI' : 'AI Dossier'}</th>
                <th className="p-4 text-center">{isRtl ? 'الإجراء' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-neutral-700 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-black stroke-[2.5]" />
                      <span>{isRtl ? 'جاري تحميل سجلات التتبع السلوكي...' : 'Loading behavioral telemetry...'}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-neutral-700 font-bold">
                    {isRtl ? 'لا توجد بيانات مطابقة لخيارات البحث الحالية.' : 'No behavioral records match current filters.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const pBadge = getPersonaBadge(user.persona);
                  const hasReport = Boolean(user.aiReport);
                  const isHighFriction = user.hesitationLevel === 'high' || user.rageClicksCount > 0;

                  return (
                    <tr key={user.id} className="hover:bg-[#FFFDF9] transition-colors">
                      {/* User Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center font-black text-xs shadow-[1.5px_1.5px_0px_0px_#000]">
                            {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'GS'}
                          </div>
                          <div>
                            <div className="font-black text-black flex items-center gap-1.5">
                              <span>{user.displayName || (isRtl ? 'زائر غير مسجل' : 'Guest Visitor')}</span>
                              {user.isRegistered && (
                                <span className="px-1.5 py-0.2 bg-[#06D6A0] border border-black rounded text-[9px] font-black shadow-[0.5px_0.5px_0px_0px_#000]">
                                  {isRtl ? 'عضو' : 'Member'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-600 font-mono font-bold">
                              {user.email || user.sessionId.slice(0, 16)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Device Intelligence Badge */}
                      <td className="p-4">
                        <AdminDeviceIntelligenceBadge deviceInfo={user.deviceInfo} />
                      </td>

                      {/* Persona */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg border border-black text-[11px] font-black shadow-[1px_1px_0px_0px_#000] inline-block ${pBadge.color}`}>
                          {pBadge.label}
                        </span>
                        <div className="text-[10px] text-neutral-600 font-bold mt-1">
                          {user.personaConfidence}% {isRtl ? 'ثقة النموذج' : 'confidence'}
                        </div>
                      </td>

                      {/* Profile Completeness */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono font-black">
                            <span>{user.profileCompleteness}%</span>
                            <span className="text-[10px] text-neutral-500 font-bold">
                              {user.profileCompleteness >= 75 ? (isRtl ? 'مكتمل' : 'Mature') : user.profileCompleteness >= 40 ? (isRtl ? 'نامٍ' : 'Growing') : (isRtl ? 'أولي' : 'Early')}
                            </span>
                          </div>
                          <div className="w-24 bg-neutral-200 h-2 rounded-full overflow-hidden border border-black">
                            <div
                              className={`h-full transition-all ${
                                user.profileCompleteness >= 75
                                  ? 'bg-[#06D6A0]'
                                  : user.profileCompleteness >= 40
                                  ? 'bg-[#FFE600]'
                                  : 'bg-[#FF70A6]'
                              }`}
                              style={{ width: `${user.profileCompleteness}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Top Category & Slugs */}
                      <td className="p-4">
                        <div className="font-black text-black">{user.topCategory || 'Subscriptions'}</div>
                        <div className="text-[10px] text-neutral-600 font-bold mt-0.5">
                          {user.viewedSlugs.length} {isRtl ? 'منتجات مشاهدة' : 'viewed items'}
                        </div>
                      </td>

                      {/* Friction / Hesitation */}
                      <td className="p-4">
                        {isHighFriction ? (
                          <span className="px-2 py-0.5 bg-[#FF70A6] border border-black rounded text-[10px] font-black text-black inline-flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
                            <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                            <span>{isRtl ? 'تردد عالي' : 'High Friction'}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#06D6A0] border border-black rounded text-[10px] font-black text-black inline-flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
                            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                            <span>{isRtl ? 'انسيابي 100%' : 'Smooth Flow'}</span>
                          </span>
                        )}
                        {user.rageClicksCount > 0 && (
                          <div className="text-[10px] text-rose-600 font-bold mt-1">
                            {user.rageClicksCount} {isRtl ? 'نقرات غضب' : 'rage clicks'}
                          </div>
                        )}
                      </td>

                      {/* AI Report Status */}
                      <td className="p-4">
                        {hasReport ? (
                          <span className="px-2 py-0.5 bg-[#B892FF] border border-black rounded text-[10px] font-black text-black inline-flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
                            <Sparkles className="w-3 h-3 stroke-[2.5]" />
                            <span>{isRtl ? 'جاهز ومفصل' : 'Dossier Ready'}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-[10px] font-bold text-neutral-600">
                            {isRtl ? 'غير مولد بعد' : 'Not generated'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenUserDossier(user)}
                          className="px-3 py-1.5 bg-[#FFE600] hover:bg-[#ffea33] border-2 border-black rounded-xl text-xs font-black text-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer mx-auto"
                        >
                          <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{isRtl ? 'الملف الشامل' : 'View Dossier'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: FULL BEHAVIORAL DOSSIER & DEEPSEEK REPORT ─── */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-black rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-[8px_8px_0px_0px_#000] max-h-[90vh] overflow-y-auto text-black"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b-2 border-black pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                    <Bot className="w-6 h-6 text-black stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-black flex items-center gap-2">
                      <span>{selectedUser.displayName || 'Guest User'}</span>
                      <span className="text-xs px-2 py-0.5 bg-[#06D6A0] border border-black rounded-md font-mono">
                        {selectedUser.profileCompleteness}% {isRtl ? 'اكتمال' : 'Maturity'}
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-600 font-mono font-bold">
                      {selectedUser.email || selectedUser.sessionId}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-neutral-100 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Grid 1: Granular Telemetry Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#FFFDF9] border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_0px_#000]">
                  <div className="text-[10px] text-neutral-600 font-black uppercase">{isRtl ? 'الشخصية الرقمية' : 'Persona'}</div>
                  <div className="text-sm font-black text-black mt-1">
                    {getPersonaBadge(selectedUser.persona).label}
                  </div>
                </div>

                <div className="bg-[#FFFDF9] border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_0px_#000]">
                  <div className="text-[10px] text-neutral-600 font-black uppercase">{isRtl ? 'الحمل المعرفي / التردد' : 'Cognitive Load'}</div>
                  <div className="text-sm font-black text-black mt-1 font-mono">
                    {selectedUser.cognitiveLoad}/100 ({selectedUser.hesitationLevel})
                  </div>
                </div>

                <div className="bg-[#FFFDF9] border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_0px_#000]">
                  <div className="text-[10px] text-neutral-600 font-black uppercase">{isRtl ? 'حساسية السعر' : 'Price Sensitivity'}</div>
                  <div className="text-sm font-black text-black mt-1 uppercase font-mono">
                    {selectedUser.priceSensitivity}
                  </div>
                </div>

                <div className="bg-[#FFFDF9] border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_0px_#000]">
                  <div className="text-[10px] text-neutral-600 font-black uppercase">{isRtl ? 'الطلبات والمصروفات' : 'Orders & Spent'}</div>
                  <div className="text-sm font-black text-black mt-1 font-mono">
                    {selectedUser.ordersCount} (${selectedUser.totalSpent.toFixed(2)})
                  </div>
                </div>
              </div>

              {/* ── Granular Completeness Breakdown (0 - 100%) ── */}
              <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-black stroke-[2.5]" />
                    <span className="text-xs font-black text-black">
                      {isRtl ? 'تحليل دقة واكتمال البروفايل (0 - 100%)' : 'Profile Completeness Breakdown'}
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono px-2 py-0.5 bg-[#FFE600] border border-black rounded-md shadow-[1px_1px_0px_0px_#000]">
                    {selectedUser.profileCompleteness}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-neutral-200 border-2 border-black rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
                  <div
                    className="bg-[#06D6A0] h-full rounded-full transition-all duration-500 border border-black"
                    style={{ width: `${selectedUser.profileCompleteness}%` }}
                  />
                </div>

                {/* Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                  <div className="p-2 bg-white border border-black rounded-lg shadow-[1px_1px_0px_0px_#000]">
                    <span className="text-neutral-500 font-bold block">{isRtl ? 'الهوية' : 'Identity'}</span>
                    <span className="font-black text-black">{selectedUser.isRegistered ? '20/20' : '10/20'}</span>
                  </div>
                  <div className="p-2 bg-white border border-black rounded-lg shadow-[1px_1px_0px_0px_#000]">
                    <span className="text-neutral-500 font-bold block">{isRtl ? 'المنتجات' : 'Products'}</span>
                    <span className="font-black text-black">{Math.min(25, selectedUser.viewedSlugs.length * 6)}/25</span>
                  </div>
                  <div className="p-2 bg-white border border-black rounded-lg shadow-[1px_1px_0px_0px_#000]">
                    <span className="text-neutral-500 font-bold block">{isRtl ? 'البحث' : 'Searches'}</span>
                    <span className="font-black text-black">{Math.min(20, selectedUser.searchHistory.length * 7)}/20</span>
                  </div>
                  <div className="p-2 bg-white border border-black rounded-lg shadow-[1px_1px_0px_0px_#000]">
                    <span className="text-neutral-500 font-bold block">{isRtl ? 'المكوث' : 'Dwell Time'}</span>
                    <span className="font-black text-black">{Math.min(15, Object.keys(selectedUser.categoryScores || {}).length * 5)}/15</span>
                  </div>
                  <div className="p-2 bg-white border border-black rounded-lg shadow-[1px_1px_0px_0px_#000]">
                    <span className="text-neutral-500 font-bold block">{isRtl ? 'التفاعل' : 'Engagement'}</span>
                    <span className="font-black text-black">{selectedUser.ordersCount > 0 ? '20/20' : (selectedUser.cartCount > 0 ? '15/20' : '5/20')}</span>
                  </div>
                </div>

                {selectedUser.profileCompleteness < 80 && (
                  <div className="p-2.5 bg-[#FFF3CD] border border-black rounded-xl text-xs font-bold text-neutral-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-black shrink-0" />
                    <span>
                      {isRtl
                        ? 'نصيحة لرفع الدقة لـ 100%: تتبع المزيد من عمليات البحث وإضافة منتجات للسلة يرفع دقة تقرير الذكاء الاصطناعي لأعلى مستوى.'
                        : 'Tip for 100% maturity: Additional searches and cart interactions will push AI behavioral confidence to 100%.'}
                    </span>
                  </div>
                )}
              </div>

              {/* Device & Hardware Intelligence Section */}
              {selectedUser.deviceInfo && Object.keys(selectedUser.deviceInfo).length > 0 && (
                <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000] space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-black pb-2">
                    <div className="flex items-center gap-2 text-xs font-black text-black">
                      <Laptop className="w-4 h-4 stroke-[2.5]" />
                      <span>{isRtl ? 'بيانات جهاز وبيئة العميل (Hardware & Device Intelligence)' : 'Client Hardware & Device Intelligence'}</span>
                    </div>
                    <AdminDeviceIntelligenceBadge deviceInfo={selectedUser.deviceInfo} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-white border border-black rounded-xl space-y-0.5">
                      <span className="text-[10px] text-neutral-500 font-bold block">{isRtl ? 'الجهاز' : 'Device'}</span>
                      <span className="font-black text-black block truncate">{selectedUser.deviceInfo.deviceModel || 'جهاز عميل'}</span>
                    </div>
                    <div className="p-2.5 bg-white border border-black rounded-xl space-y-0.5">
                      <span className="text-[10px] text-neutral-500 font-bold block">{isRtl ? 'النظام' : 'OS'}</span>
                      <span className="font-black text-black block truncate">{selectedUser.deviceInfo.os} {selectedUser.deviceInfo.osVersion}</span>
                    </div>
                    <div className="p-2.5 bg-white border border-black rounded-xl space-y-0.5">
                      <span className="text-[10px] text-neutral-500 font-bold block">{isRtl ? 'المتصفح' : 'Browser'}</span>
                      <span className="font-black text-black block truncate">{selectedUser.deviceInfo.browser} {selectedUser.deviceInfo.browserVersion}</span>
                    </div>
                    <div className="p-2.5 bg-white border border-black rounded-xl space-y-0.5">
                      <span className="text-[10px] text-neutral-500 font-bold block">{isRtl ? 'الشاشة' : 'Screen'}</span>
                      <span className="font-black text-black block font-mono">{selectedUser.deviceInfo.screenWidth || 0}x{selectedUser.deviceInfo.screenHeight || 0} @{selectedUser.deviceInfo.pixelRatio || 1}x</span>
                    </div>
                  </div>

                  {(selectedUser.deviceInfo.deviceMemoryGb || selectedUser.deviceInfo.cpuCores || selectedUser.deviceInfo.gpuRenderer || selectedUser.deviceInfo.timezone) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      {selectedUser.deviceInfo.deviceMemoryGb && (
                        <div className="p-2 bg-neutral-50 border border-black/40 rounded-lg">
                          <span className="text-neutral-500 block font-bold">{isRtl ? 'الذاكرة العشوائية:' : 'RAM:'}</span>
                          <span className="font-black text-black">{selectedUser.deviceInfo.deviceMemoryGb}</span>
                        </div>
                      )}
                      {selectedUser.deviceInfo.gpuRenderer && (
                        <div className="p-2 bg-neutral-50 border border-black/40 rounded-lg">
                          <span className="text-neutral-500 block font-bold">{isRtl ? 'كرت الشاشة:' : 'GPU:'}</span>
                          <span className="font-black text-black truncate block" title={selectedUser.deviceInfo.gpuRenderer}>{selectedUser.deviceInfo.gpuRenderer.split('/')[0]}</span>
                        </div>
                      )}
                      {selectedUser.deviceInfo.timezone && (
                        <div className="p-2 bg-neutral-50 border border-black/40 rounded-lg">
                          <span className="text-neutral-500 block font-bold">{isRtl ? 'النطاق والتوقيت:' : 'Timezone:'}</span>
                          <span className="font-black text-black">{selectedUser.deviceInfo.timezone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Grid 2: Viewed Slugs & Search History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black border-b-2 border-black pb-2">
                    <Eye className="w-4 h-4 stroke-[2.5]" />
                    <span>{isRtl ? 'المنتجات المشاهدة حديثاً' : 'Recently Viewed Products'}</span>
                  </div>
                  {selectedUser.viewedSlugs.length === 0 ? (
                    <p className="text-xs text-neutral-600 font-bold">{isRtl ? 'لم يشاهد أي منتج بعد' : 'No products viewed yet'}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUser.viewedSlugs.map((slug) => (
                        <span key={slug} className="px-2.5 py-1 bg-white border-2 border-black rounded-lg text-xs font-mono font-bold shadow-[1px_1px_0px_0px_#000]">
                          {slug}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black border-b-2 border-black pb-2">
                    <Search className="w-4 h-4 stroke-[2.5]" />
                    <span>{isRtl ? 'سجل عمليات البحث' : 'Search Queries'}</span>
                  </div>
                  {selectedUser.searchHistory.length === 0 ? (
                    <p className="text-xs text-neutral-600 font-bold">{isRtl ? 'لم يقم بأي بحث بعد' : 'No search queries performed'}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUser.searchHistory.map((q, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-[#FFE600] border-2 border-black rounded-lg text-xs font-black shadow-[1px_1px_0px_0px_#000]">
                          "{q}"
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* DeepSeek AI Behavioral Analysis Section */}
              <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#B892FF] border-2 border-black rounded-lg shadow-[1px_1px_0px_0px_#000]">
                      <Sparkles className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-black">
                        {isRtl ? 'تقرير الذكاء الاصطناعي النفسي والسلوكي' : 'DeepSeek AI Psychographic Report'}
                      </h4>
                      <p className="text-[10px] text-neutral-600 font-bold">
                        {isRtl ? 'تحليل معمق لنوايا الشراء واستراتيجيات الإقناع بواسطة deepseek-v4-flash' : 'Deep buyer intent & conversion strategy generated by deepseek-v4-flash'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateAiReport}
                    disabled={isAiGenerating}
                    className="px-3.5 py-1.5 bg-[#FFE600] hover:bg-[#ffea33] border-2 border-black rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isAiGenerating ? 'animate-spin' : ''}`} />
                    <span>
                      {isAiGenerating
                        ? (isRtl ? 'جاري التحليل والإنشاء...' : 'Generating Report...')
                        : (aiReportData ? (isRtl ? 'إعادة التوليد والتحديث' : 'Regenerate Dossier') : (isRtl ? 'توليد التقرير بالذكاء الاصطناعي' : 'Generate AI Dossier'))}
                    </span>
                  </button>
                </div>

                {aiError && (
                  <div className="p-3 bg-[#FF70A6] border-2 border-black rounded-xl text-xs font-black text-black">
                    {aiError}
                  </div>
                )}

                {aiReportData ? (
                  <div className="space-y-4 text-xs">
                    {/* Archetype Title */}
                    <div className="p-3 bg-[#FFE600] border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000]">
                      <span className="text-[10px] text-neutral-800 uppercase font-black block">{isRtl ? 'النمط السلوكي المحدد' : 'Identified Archetype'}</span>
                      <div className="text-sm font-black text-black mt-0.5">
                        {isRtl ? aiReportData.profileTitleAr : aiReportData.profileTitleEn}
                      </div>
                    </div>

                    {/* Psychographic Summary */}
                    <div className="p-3.5 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] space-y-1">
                      <span className="text-[10px] text-neutral-600 uppercase font-black">{isRtl ? 'الملخص النفسي والسلوكي' : 'Psychographic Analysis'}</span>
                      <p className="text-xs font-bold text-neutral-900 leading-relaxed">
                        {isRtl ? aiReportData.psychographicSummaryAr : aiReportData.psychographicSummaryEn}
                      </p>
                    </div>

                    {/* Readiness & Price Diagnostic */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-neutral-600 uppercase font-black">{isRtl ? 'جاهزية الشراء والتحويل' : 'Conversion Readiness'}</span>
                          <span className="px-2 py-0.5 bg-[#06D6A0] border border-black rounded text-[10px] font-mono font-black">
                            {aiReportData.buyingIntentScore}%
                          </span>
                        </div>
                        <p className="text-xs font-bold text-neutral-900">
                          {isRtl ? aiReportData.conversionReadinessAr : aiReportData.conversionReadinessEn}
                        </p>
                      </div>

                      <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] space-y-1">
                        <span className="text-[10px] text-neutral-600 uppercase font-black">{isRtl ? 'تشخيص حساسية السعر' : 'Price Sensitivity'}</span>
                        <p className="text-xs font-bold text-neutral-900">
                          {isRtl ? aiReportData.priceSensitivityDiagnosticAr : aiReportData.priceSensitivityDiagnosticEn}
                        </p>
                      </div>
                    </div>

                    {/* Next Best Offer */}
                    {aiReportData.nextBestOffer && (
                      <div className="p-3.5 bg-[#B892FF] border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-neutral-900 uppercase font-black">
                            {isRtl ? 'أفضل عرض مقترح للعميل (Next Best Offer)' : 'Next Best Offer'}
                          </span>
                          <span className="px-2 py-0.5 bg-black text-white text-[10px] font-mono font-bold rounded">
                            {aiReportData.nextBestOffer.productSlug}
                          </span>
                        </div>
                        <div className="text-xs font-black text-black">
                          {isRtl ? aiReportData.nextBestOffer.productNameAr : aiReportData.nextBestOffer.productNameEn}
                        </div>
                        <p className="text-xs font-bold text-neutral-900">
                          {isRtl ? aiReportData.nextBestOffer.salesPitchAr : aiReportData.nextBestOffer.salesPitchEn}
                        </p>
                      </div>
                    )}

                    {/* Admin Action Plan */}
                    {Array.isArray(aiReportData.adminActionPlan) && aiReportData.adminActionPlan.length > 0 && (
                      <div className="p-3.5 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] space-y-2">
                        <span className="text-[10px] text-neutral-600 uppercase font-black">
                          {isRtl ? 'خطة عمل مقترحة لمدير المتجر' : 'Admin Action Plan'}
                        </span>
                        <div className="space-y-1.5">
                          {aiReportData.adminActionPlan.map((step: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-xs font-bold text-neutral-900">
                              <span className="w-4 h-4 rounded-full bg-[#FFE600] border border-black flex items-center justify-center text-[10px] font-black shrink-0">
                                {step.stepNumber || idx + 1}
                              </span>
                              <span>{isRtl ? step.actionAr : step.actionEn}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-neutral-300 rounded-xl text-center space-y-2">
                    <Bot className="w-8 h-8 text-neutral-400 mx-auto stroke-[1.5]" />
                    <p className="text-xs text-neutral-600 font-bold">
                      {isRtl
                        ? 'لم يتم إنشاء تقرير ذكاء اصطناعي لهذا المستخدم بعد. اضغط على الزر بالأعلى للتوليد الفوري.'
                        : 'No AI dossier has been generated for this user yet. Click above to generate.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 border-t-2 border-black pt-4">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-5 py-2 bg-neutral-100 hover:bg-neutral-200 border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  {isRtl ? 'إغلاق النافذة' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
