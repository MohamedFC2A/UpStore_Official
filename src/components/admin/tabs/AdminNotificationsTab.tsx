'use client';

import React, { useState } from 'react';
import { GitBranch, Sparkles, Zap, Check, Bell, CheckCircle2, AlertCircle, History, Plus, Edit2, Trash2, Loader2, Eye, Radio, ExternalLink } from 'lucide-react';

interface AdminNotificationsTabProps {
  githubRepo: string;
  setGithubRepo: (v: string) => void;
  handleSyncGitHubCommits: () => void;
  githubSyncing: boolean;
  githubSyncResult: any;
  notifAudience: 'single' | 'all';
  setNotifAudience: (v: 'single' | 'all') => void;
  notifTargetUser: string;
  setNotifTargetUser: (v: string) => void;
  notifTitle: string;
  setNotifTitle: (v: string) => void;
  notifType: 'info' | 'order' | 'promo' | 'alert';
  setNotifType: (v: 'info' | 'order' | 'promo' | 'alert') => void;
  notifMessage: string;
  setNotifMessage: (v: string) => void;
  handleSendNotification: (e: React.FormEvent) => void;
  notifLoading: boolean;
  profiles: any[];
  changelogs: any[];
  openEditChangelogModal: (changelog: any) => void;
  handleDeleteChangelog: (id: string) => void;
  setEditingChangelog: (v: any) => void;
  setChangelogVersion: (v: string) => void;
  setChangelogTitle: (v: string) => void;
  setChangelogCategory: (v: any) => void;
  setChangelogDescription: (v: string) => void;
  setChangelogFeatures: (v: string[]) => void;
  setChangelogFixes: (v: string[]) => void;
  setIsChangelogModalOpen: (v: boolean) => void;
  successMessage: string | null;
  errorMessage: string | null;
  activeTab: string;
  at: Record<string, string>;
}

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({
  githubRepo,
  setGithubRepo,
  handleSyncGitHubCommits,
  githubSyncing,
  githubSyncResult,
  notifAudience,
  setNotifAudience,
  notifTargetUser,
  setNotifTargetUser,
  notifTitle,
  setNotifTitle,
  notifType,
  setNotifType,
  notifMessage,
  setNotifMessage,
  handleSendNotification,
  notifLoading,
  profiles,
  changelogs,
  openEditChangelogModal,
  handleDeleteChangelog,
  setEditingChangelog,
  setChangelogVersion,
  setChangelogTitle,
  setChangelogCategory,
  setChangelogDescription,
  setChangelogFeatures,
  setChangelogFixes,
  setIsChangelogModalOpen,
  successMessage,
  errorMessage,
  activeTab,
  at,
}) => {
  const [visitorBotLoading, setVisitorBotLoading] = useState(false);
  const [visitorBotResult, setVisitorBotResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestVisitorBot = async () => {
    setVisitorBotLoading(true);
    setVisitorBotResult(null);
    try {
      const res = await fetch('/api/visitor/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'ADMIN_TEST_PANEL_' + Date.now().toString(36),
          pathname: '/admin',
          hostname: window.location.hostname,
          referrer: 'Admin Control Center',
          utmSource: 'admin_dashboard',
          utmCampaign: 'test_dispatch',
          deviceModel: 'Admin Test Console',
          deviceType: 'Desktop',
          os: 'Admin OS',
          browser: 'Browser Console',
          batteryLevel: 100,
          isCharging: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setVisitorBotResult({
          success: true,
          message: 'تم إرسال إشعار الرصد الفوري بنجاح إلى @upstorelive_bot! تفقد محادثة التيليجرام الآن.',
        });
      } else {
        setVisitorBotResult({
          success: false,
          message: data.error || 'فشل إرسال الإشعار. تأكد من فتح @upstorelive_bot والضغط على /start لتسجيل المعرّف.',
        });
      }
    } catch (e: any) {
      setVisitorBotResult({
        success: false,
        message: e.message || 'حدث خطأ في الاتصال بالبوت.',
      });
    } finally {
      setVisitorBotLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-black">
      
      {/* Telegram Live Visitor Intelligence Bot (@upstorelive_bot) Card */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-6 shadow-[6px_6px_0px_0px_#000]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shadow-[1.5px_1.5px_0px_0px_#000]">
              <Eye className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-black flex items-center gap-2">
                بوت استخبارات وزوار المتجر اللحظي
                <span className="px-2 py-0.5 rounded-md bg-[#06D6A0] border border-black text-black text-[10px] font-mono font-black">
                  @upstorelive_bot Live
                </span>
              </h3>
              <p className="text-xs text-neutral-700 font-bold mt-0.5">
                يرصد دخول أي زائر للمتجر وفتح أي صفحة فوراً، ويرسل تقريراً شاملاً (IP, الموقع، الجهاز، المتصفح، البطارية، مسار الزيارة)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://t.me/upstorelive_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3.5 bg-neutral-100 hover:bg-neutral-200 border-2 border-black rounded-xl text-black font-black text-xs shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
              فتح المحادثة @upstorelive_bot
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[#FFFDF9] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_#000] space-y-1">
            <div className="text-[11px] font-bold text-neutral-600">حالة البوت</div>
            <div className="text-sm font-black text-emerald-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-black" />
              أونلاين وجاهز 24/7
            </div>
          </div>

          <div className="p-4 bg-[#FFFDF9] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_#000] space-y-1">
            <div className="text-[11px] font-bold text-neutral-600">نطاق التغطية</div>
            <div className="text-sm font-black text-black">
              جميع الدومينات والصفحات
            </div>
          </div>

          <div className="p-4 bg-[#FFFDF9] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_#000] space-y-1">
            <div className="text-[11px] font-bold text-neutral-600">سرعة الإشعار</div>
            <div className="text-sm font-black text-black flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              فوري (&lt; 100ms)
            </div>
          </div>
        </div>

        {visitorBotResult && (
          <div
            className={`p-3.5 rounded-xl border-2 border-black text-xs font-black shadow-[2px_2px_0px_0px_#000] flex items-center gap-2 ${
              visitorBotResult.success
                ? 'bg-[#06D6A0]/20 text-emerald-950'
                : 'bg-rose-100 text-rose-950'
            }`}
          >
            {visitorBotResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 stroke-[2.5]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 stroke-[2.5]" />
            )}
            <span>{visitorBotResult.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-neutral-600 font-bold">
            💡 ملاحظة: عند فتح البوت لأول مرة، اكتب <code>/start</code> لحفظ معرّف حسابك وتفعيل استقبال التنبيهات الحية فوراً.
          </p>

          <button
            type="button"
            onClick={handleTestVisitorBot}
            disabled={visitorBotLoading}
            className="w-full sm:w-auto py-2.5 px-5 bg-[#FFE600] hover:bg-[#ebd300] border-2 border-black active:translate-x-0.5 active:translate-y-0.5 text-black font-black rounded-xl text-xs shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {visitorBotLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[2.5]" />
            ) : (
              <Radio className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            🧪 إرسال إشعار تجريبي للبوت الآن
          </button>
        </div>
      </div>
      
      {/* GitHub AI Updates & Changelog Sync Card */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-6 shadow-[6px_6px_0px_0px_#000]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#06D6A0] border-2 border-black flex items-center justify-center text-black shadow-[1.5px_1.5px_0px_0px_#000]">
              <GitBranch className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-black flex items-center gap-2">
                {at.githubSyncTitle}
                <span className="px-2 py-0.5 rounded-md bg-[#FFE600] border border-black text-black text-[10px] font-mono font-black">
                  DeepSeek AI
                </span>
              </h3>
              <p className="text-xs text-neutral-700 font-bold mt-0.5">{at.githubSyncDesc}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8 space-y-1.5">
            <label className="block text-neutral-800 text-xs font-black">
              {at.githubRepoLabel}
            </label>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="username/repository (e.g. MohamedFC2A/UpStore)"
              className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-black outline-none font-bold text-xs font-mono shadow-[2px_2px_0px_0px_#000]"
            />
          </div>

          <div className="md:col-span-4 flex items-end">
            <button
              type="button"
              onClick={handleSyncGitHubCommits}
              disabled={githubSyncing}
              className="w-full py-2.5 px-4 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black active:translate-x-0.5 active:translate-y-0.5 text-black font-black rounded-xl text-xs shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {githubSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>{at.syncingStatus}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  <span>{at.syncNowBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* GitHub Webhook Info Callout */}
        <div className="p-4 rounded-2xl bg-[#FFFDF9] border-2 border-black space-y-2 text-xs shadow-[2px_2px_0px_0px_#000]">
          <div className="flex items-center gap-2 text-black font-black flex-wrap">
            <Zap className="w-4 h-4 stroke-[2.5]" />
            <span>{at.webhookUrlLabel}</span>
            <code className="px-2 py-0.5 rounded bg-white text-black font-mono font-black text-xs border border-black">
              https://upstore.one/api/webhooks/github
            </code>
          </div>
          <p className="text-xs text-neutral-700 font-bold leading-relaxed">
            {at.webhookTip}
          </p>
        </div>

        {/* Sync Result Details */}
        {githubSyncResult && (
          <div className="p-4 rounded-2xl bg-[#06D6A0] border-2 border-black space-y-2 shadow-[2px_2px_0px_0px_#000]">
            <div className="flex items-center justify-between text-xs font-black text-black">
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 stroke-[2.5]" /> {githubSyncResult.message}</span>
              <span className="font-mono text-xs">{githubSyncResult.totalProcessed} commits analyzed</span>
            </div>
            {githubSyncResult.createdChangelog && (
              <div className="p-3 bg-white border border-black rounded-xl text-xs space-y-1">
                <span className="font-black text-black block">
                  [{githubSyncResult.createdChangelog.category.toUpperCase()}] {githubSyncResult.createdChangelog.title}
                </span>
                <p className="text-neutral-700 font-bold text-xs">{githubSyncResult.createdChangelog.description}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Send Notification Panel */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-6 shadow-[6px_6px_0px_0px_#000]">
        <div className="flex items-center gap-2.5 border-b-2 border-black pb-4 select-none">
          <div className="w-10 h-10 rounded-xl bg-[#FF70A6] border-2 border-black flex items-center justify-center text-black shadow-[1.5px_1.5px_0px_0px_#000]">
            <Bell className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-black text-black">{at.modalBroadcastTitle}</h3>
            <p className="text-xs text-neutral-700 font-bold">{at.notificationsHubDesc}</p>
          </div>
        </div>

        {successMessage && activeTab === 'notifications' && (
          <div className="p-3 bg-[#06D6A0] border-2 border-black rounded-xl text-xs text-black font-black flex items-center gap-2 select-none shadow-[2px_2px_0px_0px_#000]">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && activeTab === 'notifications' && (
          <div className="p-3 bg-[#FF70A6] border-2 border-black rounded-xl text-xs text-black font-black flex items-center gap-2 select-none shadow-[2px_2px_0px_0px_#000]">
            <AlertCircle className="w-4 h-4 stroke-[2.5]" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSendNotification} className="space-y-6 text-xs font-black text-neutral-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Audience Selection */}
            <div className="space-y-1.5">
              <label className="block text-neutral-800 uppercase tracking-wider text-xs font-black">Recipient Audience</label>
              <select
                value={notifAudience}
                onChange={(e) => {
                  setNotifAudience(e.target.value as 'single' | 'all');
                  setNotifTargetUser('');
                }}
                className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-black font-bold outline-none shadow-[2px_2px_0px_0px_#000]"
              >
                <option value="all">All Registered Users (Broadcast)</option>
                <option value="single">Single Profile (Direct)</option>
              </select>
            </div>

            {/* Target User (Dropdown Search) */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-neutral-800 uppercase tracking-wider text-xs font-black">
                Target User {notifAudience === 'all' && '(Disabled)'}
              </label>
              <select
                disabled={notifAudience === 'all'}
                value={notifTargetUser}
                onChange={(e) => setNotifTargetUser(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-black font-bold outline-none shadow-[2px_2px_0px_0px_#000] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">Select User Profile...</option>
                {profiles.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.display_name || 'No Name'} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Title */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-neutral-800 uppercase tracking-wider text-xs font-black">Notification Title</label>
              <input 
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder={at.broadcastTitlePlaceholder}
                className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-black font-bold outline-none shadow-[2px_2px_0px_0px_#000]"
              />
            </div>

            {/* Notification Type */}
            <div className="space-y-1.5">
              <label className="block text-neutral-800 uppercase tracking-wider text-xs font-black">{at.broadcastType}</label>
              <select
                value={notifType}
                onChange={(e) => setNotifType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-black font-bold outline-none shadow-[2px_2px_0px_0px_#000]"
              >
                <option value="info">Info</option>
                <option value="order">Order Update</option>
                <option value="promo">{at.typePromo}</option>
                <option value="alert">{at.typeAlert}</option>
              </select>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="block text-neutral-800 uppercase tracking-wider text-xs font-black">Notification Message</label>
            <textarea
              rows={3}
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              placeholder={at.broadcastMessagePlaceholder}
              className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-black font-bold outline-none shadow-[2px_2px_0px_0px_#000] text-xs font-sans"
            />
          </div>

          <div className="pt-4 border-t-2 border-black flex justify-end">
            <button
              type="submit"
              disabled={notifLoading}
              className="px-6 py-3 bg-[#4CC9F0] hover:bg-[#3db6db] border-2 border-black active:translate-x-0.5 active:translate-y-0.5 text-black font-black rounded-xl shadow-[3px_3px_0px_0px_#000] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {notifLoading ? 'Sending...' : at.sendBroadcast}
            </button>
          </div>
        </form>
      </div>

      {/* Changelog Releases List */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 space-y-6 shadow-[6px_6px_0px_0px_#000]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shadow-[1.5px_1.5px_0px_0px_#000]">
              <History className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-black">{at.recentChangelogsTitle}</h3>
              <p className="text-xs text-neutral-700 font-bold">UpStore Smart Release Changelogs</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingChangelog(null);
              setChangelogVersion('');
              setChangelogTitle('');
              setChangelogCategory('feature');
              setChangelogDescription('');
              setChangelogFeatures(['']);
              setChangelogFixes(['']);
              setIsChangelogModalOpen(true);
            }}
            className="px-4 py-2 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Add Release Update
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-black text-neutral-800 uppercase tracking-wider select-none font-black bg-[#FFFDF9]">
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Published Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-neutral-200 font-black text-black">
              {changelogs.map((changelog) => (
                <tr key={changelog.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-black text-black">
                    {changelog.version}
                  </td>
                  <td className="py-3.5 px-4 text-black font-bold truncate max-w-[200px]">
                    {changelog.title}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border border-black shadow-[1px_1px_0px_0px_#000] ${
                      changelog.category === 'feature' ? 'text-black bg-[#06D6A0]' :
                      changelog.category === 'fix' ? 'text-black bg-[#FF70A6]' :
                      changelog.category === 'improvement' ? 'text-black bg-[#4CC9F0]' :
                      'text-black bg-[#B892FF]'
                    }`}>
                      {changelog.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-neutral-700 font-bold">
                    {new Date(changelog.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => openEditChangelogModal(changelog)}
                      className="p-1.5 hover:bg-neutral-100 text-black rounded-lg border border-black shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <button
                      onClick={() => handleDeleteChangelog(changelog.id)}
                      className="p-1.5 hover:bg-rose-100 text-rose-700 rounded-lg border border-black shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </td>
                </tr>
              ))}

              {changelogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-700 font-bold">
                    {at.noChangelogsYet}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
