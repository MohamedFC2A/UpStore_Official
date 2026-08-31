'use client';

import React, { useState } from 'react';
import { Edit2, Trash2, ShieldAlert, ShieldCheck, AlertTriangle, UserX, CheckCircle } from 'lucide-react';
import { useToastStore } from '@/store/useToastStore';
import { AdminDeviceIntelligenceBadge } from '../AdminDeviceIntelligenceBadge';

interface AdminUsersTabProps {
  filteredProfiles: any[];
  userSearch: string;
  setUserSearch: (v: string) => void;
  handleOpenEditProfileModal: (profile: any) => void;
  handleDeleteProfile: (id: string) => void;
  at: Record<string, string>;
  onRefreshUsers?: () => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  filteredProfiles,
  userSearch,
  setUserSearch,
  handleOpenEditProfileModal,
  handleDeleteProfile,
  at,
  onRefreshUsers,
}) => {
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleAdminStrikeAction = async (
    action: 'add_strike' | 'remove_strike' | 'ban_user' | 'unban_user',
    userId: string,
    phone?: string
  ) => {
    const confirmMsg =
      action === 'add_strike'
        ? 'هل تريد تسجيل إنذار (Strike) على هذا المستخدم؟ (الوصول لإنذارين سيحظره تلقائياً)'
        : action === 'ban_user'
        ? 'هل أنت متأكد من حظر هذا المستخدم ورقم هاتفه نهائياً؟'
        : 'هل تريد فك الحظر وإعادة تصفير الإنذارات؟';

    if (!window.confirm(confirmMsg)) return;

    setActionInProgress(userId);
    try {
      const res = await fetch('/api/admin/users/strike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId,
          phone,
          reason:
            action === 'add_strike'
              ? 'مخالفة شروط سداد Arabi Pay'
              : action === 'ban_user'
              ? 'حظر إداري مباشر لتكرار مخالفات السداد'
              : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        useToastStore.getState().success(
          'تم تنفيذ الإجراء بنجاح',
          action === 'add_strike'
            ? `تم تسجيل الإنذار (${data.profile?.strike_count || 1}/2)`
            : action === 'ban_user'
            ? 'تم حظر الحساب ورقم الهاتف نهائياً'
            : 'تم فك الحظر وتصفير الإنذارات'
        );
        if (onRefreshUsers) onRefreshUsers();
      } else {
        useToastStore.getState().error('Operation failed', data.error || 'Unknown error');
      }
    } catch (err: any) {
      useToastStore.getState().error('Network error', err.message);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder={at.searchUsersPlaceholder || 'Search users by name, email, or phone...'}
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="bg-white border-2 border-black rounded-xl px-4 py-2.5 text-xs font-bold text-black placeholder-neutral-600 outline-none shadow-[2px_2px_0px_0px_#000] flex-1"
        />
      </div>

      <div className="bg-white border-2 border-black rounded-3xl overflow-hidden shadow-[6px_6px_0px_0px_#000]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black text-neutral-800 text-xs font-black uppercase tracking-wider select-none bg-[#FFFDF9]">
                <th className="p-4">ID</th>
                <th className="p-4">{at.colUser}</th>
                <th className="p-4">{at.colEmail}</th>
                <th className="p-4">{at.colRole}</th>
                <th className="p-4">الجهاز والبيئة</th>
                <th className="p-4">الحالة والإنذارات</th>
                <th className="p-4">{at.colWallet}</th>
                <th className="p-4 text-center">{at.colUserActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-neutral-200">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-700 font-bold select-none">
                    No profiles found.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => {
                  const strikes = Number(p.strike_count || 0);
                  const isBanned = Boolean(p.is_banned || strikes >= 2 || p.is_phone_blacklisted);

                  return (
                    <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                      <td
                        className="p-4 font-mono text-neutral-600 text-xs font-bold select-all max-w-[100px] truncate"
                        title={p.id}
                      >
                        {p.id}
                      </td>
                      <td className="p-4">
                        <div className="font-black text-black">{p.display_name || 'No Name'}</div>
                        {p.phone && (
                          <div className="text-[10.5px] text-neutral-600 font-mono font-bold mt-0.5">
                            📞 {p.phone}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-neutral-800 font-mono font-bold">{p.email || 'N/A'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-black rounded-lg uppercase border border-black shadow-[1px_1px_0px_0px_#000] select-none ${
                            p.role === 'admin' ? 'bg-[#FFE600] text-black' : 'bg-neutral-100 text-black'
                          }`}
                        >
                          {p.role === 'admin' ? at.roleAdmin : at.roleUser}
                        </span>
                      </td>

                      {/* Client Device Intelligence */}
                      <td className="p-4">
                        <AdminDeviceIntelligenceBadge deviceInfo={p.last_device_info || p.device_info || p.telemetry?.device_info} />
                      </td>

                      {/* Strikes & Ban Status */}
                      <td className="p-4">
                        <div className="space-y-1">
                          {isBanned ? (
                            <span className="px-2 py-0.5 bg-rose-600 text-white rounded-lg border border-black text-[10px] font-black inline-flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
                              <UserX className="w-3 h-3" />
                              <span>محظور نهائياً (2/2)</span>
                            </span>
                          ) : strikes === 1 ? (
                            <span className="px-2 py-0.5 bg-amber-300 text-black rounded-lg border border-black text-[10px] font-black inline-flex items-center gap-1 shadow-[1px_1px_0px_0px_#000]">
                              <AlertTriangle className="w-3 h-3" />
                              <span>إنذار أول (1/2)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-950 rounded-lg border border-black/30 text-[10px] font-black inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>نشط (0 إنذارات)</span>
                            </span>
                          )}

                          {p.is_phone_blacklisted && (
                            <div className="text-[9.5px] text-rose-700 font-black">
                              ⛔ الهاتف مدرج بالقائمة السوداء
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4 font-mono font-black text-black">${Number(p.wallet_balance || 0.0).toFixed(2)}</td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Strike Management Quick Buttons */}
                          {!isBanned ? (
                            <>
                              <button
                                onClick={() => handleAdminStrikeAction('add_strike', p.id, p.phone)}
                                disabled={actionInProgress === p.id}
                                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-black rounded-lg text-[10px] font-black shadow-[1px_1px_0px_0px_#000] cursor-pointer disabled:opacity-50"
                                title="إضافة إنذار (Strike)"
                              >
                                ⚠️ إنذار (+1)
                              </button>
                              <button
                                onClick={() => handleAdminStrikeAction('ban_user', p.id, p.phone)}
                                disabled={actionInProgress === p.id}
                                className="px-2 py-1 bg-rose-200 hover:bg-rose-300 text-rose-950 border border-black rounded-lg text-[10px] font-black shadow-[1px_1px_0px_0px_#000] cursor-pointer disabled:opacity-50"
                                title="حظر الحساب والجوال نهائياً"
                              >
                                🚫 حظر
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleAdminStrikeAction('unban_user', p.id, p.phone)}
                              disabled={actionInProgress === p.id}
                              className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-black rounded-lg text-[10px] font-black shadow-[1px_1px_0px_0px_#000] cursor-pointer disabled:opacity-50"
                              title="فك الحظر"
                            >
                              ✨ فك الحظر
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEditProfileModal(p)}
                            className="p-1.5 hover:bg-neutral-100 text-black rounded-lg border border-black shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-colors cursor-pointer"
                            title="Edit User Role"
                          >
                            <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(p.id)}
                            className="p-1.5 hover:bg-rose-100 text-rose-700 rounded-lg border border-black shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
