'use client';

import React, { useState } from 'react';
import { Upload, AlertTriangle, ShieldAlert, ShieldCheck, PhoneCall, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useToastStore } from '@/store/useToastStore';
import { AdminDeviceIntelligenceBadge } from '../AdminDeviceIntelligenceBadge';

interface AdminManualOrdersTabProps {
  orders: any[];
  formLoading: boolean;
  handleApproveManualPayment: (sessionId: string) => void;
  handleRejectManualPayment: (sessionId: string) => void;
  isRtl: boolean;
  at: Record<string, string>;
  onRefreshOrders?: () => void;
}

export const AdminManualOrdersTab: React.FC<AdminManualOrdersTabProps> = ({
  orders,
  formLoading,
  handleApproveManualPayment,
  handleRejectManualPayment,
  isRtl,
  at,
  onRefreshOrders,
}) => {
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const pendingManual = orders.filter((o) => o.status === 'pending_manual_payment');

  const grouped = Object.entries(
    pendingManual.reduce((acc: Record<string, any[]>, order) => {
      const key = order.session_id || `no-session-${order.id}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(order);
      return acc;
    }, {})
  );

  const handleAdminStrikeAction = async (
    action: 'add_strike' | 'remove_strike' | 'ban_user' | 'unban_user',
    userId: string,
    orderId?: string,
    phone?: string
  ) => {
    if (!userId) {
      useToastStore.getState().error('User ID missing');
      return;
    }

    const confirmMsg =
      action === 'add_strike'
        ? isRtl
          ? 'هل أنت متأكد من تسجيل إنذار (Strike) على هذا العميل لعدم سداد طلب Arabi Pay؟ (الوصول لإنذارين سيحظره تلقائياً)'
          : 'Issue a strike against this customer for unpaid Arabi Pay order?'
        : action === 'ban_user'
        ? isRtl
          ? 'هل أنت متأكد من حظر هذا العميل ورقمه نهائياً (Strike 2)?'
          : 'Permanently ban this user and blacklist their phone?'
        : isRtl
        ? 'هل تريد إزالة الإنذار / فك الحظر عن هذا العميل؟'
        : 'Remove strike / unban this user?';

    if (!window.confirm(confirmMsg)) return;

    setActionInProgress(userId);
    try {
      const res = await fetch('/api/admin/users/strike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId,
          orderId,
          phone,
          reason:
            action === 'add_strike'
              ? 'عدم الالتزام بسداد طلب Arabi Pay بعد التأكيد بالبصمة الذكية'
              : action === 'ban_user'
              ? 'حظر نهائي لتكرار عدم السداد ومخالفة شروط Arabi Pay'
              : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        useToastStore.getState().success(
          isRtl ? 'تم تنفيذ الإجراء بنجاح' : 'Action executed successfully',
          action === 'add_strike'
            ? isRtl
              ? `تم تسجيل الإنذار (رصيد الإنذارات: ${data.profile?.strike_count || 1}/2)`
              : `Strike recorded (${data.profile?.strike_count || 1}/2)`
            : action === 'ban_user'
            ? isRtl
              ? 'تم حظر الحساب ورقم الهاتف نهائياً'
              : 'User and phone permanently banned'
            : isRtl
            ? 'تم فك الحظر / تحديث رصيد الإنذارات'
            : 'Strikes updated / User unbanned'
        );
        if (onRefreshOrders) onRefreshOrders();
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
      <div className="flex justify-between items-center bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_#000]">
        <div>
          <h3 className="text-sm sm:text-base font-black text-black uppercase tracking-wider">
            {at.manualOrdersTitle}
          </h3>
          <p className="text-xs text-neutral-600 font-bold mt-0.5">
            {isRtl
              ? 'إدارة ومراجعة طلبات السداد اليدوي وطلبات Arabi Pay مع نظام الإنذارات (2 Strikes)'
              : 'Manage manual and Arabi Pay orders with 2-Strikes ban management'}
          </p>
        </div>
        <span className="text-xs bg-[#FFE600] text-black border-2 border-black px-3 py-1 rounded-xl font-black font-sans shadow-[1.5px_1.5px_0px_0px_#000]">
          {isRtl ? 'المعلق:' : 'Pending:'} {pendingManual.length}
        </span>
      </div>

      <div className="bg-white border-2 border-black rounded-3xl overflow-hidden shadow-[6px_6px_0px_0px_#000]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black text-neutral-800 text-xs font-black uppercase tracking-wider select-none bg-[#FFFDF9]">
                <th className="p-4">{at.colOrderId}</th>
                <th className="p-4">{at.colCustomer}</th>
                <th className="p-4">الجهاز والبيئة</th>
                <th className="p-4">{at.colAmount}</th>
                <th className="p-4">{at.colSenderPhone}</th>
                <th className="p-4">{at.colReceipt}</th>
                <th className="p-4 text-center">{at.colApproveReject}</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-neutral-200">
              {pendingManual.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-700 font-bold select-none">
                    {at.noManualOrdersPending}
                  </td>
                </tr>
              ) : (
                grouped.map(([sessionId, sessionOrders]: [string, any[]], sIdx: number) => {
                  const firstOrder = sessionOrders[0];
                  const total = sessionOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
                  const isGroup = sessionOrders.length > 1;
                  const isArabiPay =
                    sessionId.startsWith('arab_') ||
                    firstOrder.payment_sender?.includes('Arabi Pay');
                  const userProfile = firstOrder.profiles || {};
                  const userStrikes = Number(userProfile.strike_count || 0);
                  const isBanned = Boolean(userProfile.is_banned || userStrikes >= 2);

                  return (
                    <tr key={`manual-sess-${sessionId || sIdx}`} className="hover:bg-neutral-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-black">
                            {isGroup ? `${sessionOrders.length} Products` : firstOrder.products?.name || 'Digital Item'}
                          </span>
                          {isArabiPay && (
                            <span className="px-1.5 py-0.5 bg-[#FFE600] text-black border border-black rounded text-[9px] font-black shadow-[1px_1px_0px_0px_#000]">
                              Arabi Pay ⚡
                            </span>
                          )}
                        </div>
                        {isGroup && (
                          <div className="text-xs text-neutral-700 mb-1 leading-relaxed font-bold">
                            {sessionOrders.map((o) => o.products?.name).join(', ')}
                          </div>
                        )}
                        <div className="text-xs text-neutral-600 font-mono uppercase font-bold mt-0.5">
                          ID: #{sessionId.replace('manual_', '').replace('arab_', '').substring(0, 10).toUpperCase()}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-black text-black flex items-center gap-1.5">
                          <span>{userProfile.display_name || 'N/A'}</span>
                          {isBanned ? (
                            <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded border border-black text-[9px] font-black">
                              {isRtl ? 'محظور نهائياً' : 'BANNED'}
                            </span>
                          ) : userStrikes === 1 ? (
                            <span className="px-1.5 py-0.2 bg-amber-300 text-black rounded border border-black text-[9px] font-black">
                              {isRtl ? 'إنذار (1/2)' : 'Strike 1/2'}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-950 rounded border border-black/30 text-[9px] font-black">
                              {isRtl ? 'نظيف (0/2)' : '0 Strikes'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-700 font-mono font-bold">{userProfile.email || 'Anonymous'}</div>
                        {userProfile.phone && (
                          <div className="text-[10px] text-neutral-600 font-mono font-bold mt-0.5">
                            📞 {userProfile.phone}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <AdminDeviceIntelligenceBadge deviceInfo={firstOrder.client_telemetry || firstOrder.device_info || userProfile.last_device_info} />
                      </td>

                      <td className="p-4 text-black font-mono font-black text-sm">${total.toFixed(2)}</td>

                      <td className="p-4 text-black">
                        {firstOrder.payment_sender ? (
                          <div>
                            <span className="font-black block text-black text-xs">
                              {isRtl ? 'المرسل:' : 'Sender:'} {firstOrder.payment_sender}
                            </span>
                            {firstOrder.payment_transaction_id && (
                              <span className="text-xs text-neutral-700 font-mono font-bold">
                                TXID: {firstOrder.payment_transaction_id}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-600 font-bold italic">No details submitted yet</span>
                        )}
                      </td>

                      <td className="p-4">
                        {firstOrder.payment_screenshot ? (
                          <a
                            href={firstOrder.payment_screenshot}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-black underline font-black text-xs flex items-center gap-1"
                          >
                            <Upload className="w-3.5 h-3.5 stroke-[2.5]" /> {at.viewReceipt}
                          </a>
                        ) : (
                          <span className="text-neutral-600 italic font-bold">{at.noReceipt}</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <div className="space-y-1.5">
                          {/* Payment Actions */}
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleApproveManualPayment(sessionId)}
                              disabled={formLoading || actionInProgress === firstOrder.user_id}
                              className="px-2.5 py-1 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black text-black font-black uppercase text-xs rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              title={at.approveOrder}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{at.approveOrder}</span>
                            </button>
                            <button
                              onClick={() => handleRejectManualPayment(sessionId)}
                              disabled={formLoading || actionInProgress === firstOrder.user_id}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 border-2 border-black text-rose-700 text-xs font-black uppercase rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              title={at.rejectOrder}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{at.rejectOrder}</span>
                            </button>
                          </div>

                          {/* Strike & Ban Control Actions for Arabi Pay Orders */}
                          {firstOrder.user_id && (
                            <div className="flex items-center justify-center gap-1 pt-1 border-t border-dashed border-black/20">
                              {!isBanned ? (
                                <>
                                  <button
                                    onClick={() =>
                                      handleAdminStrikeAction('add_strike', firstOrder.user_id, sessionId, userProfile.phone)
                                    }
                                    disabled={actionInProgress === firstOrder.user_id}
                                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 border border-black text-amber-900 text-[10px] font-black rounded-lg shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                                    title={isRtl ? 'تسجيل إنذار لعدم السداد' : 'Issue Strike'}
                                  >
                                    ⚠️ {isRtl ? `إنذار (${userStrikes + 1}/2)` : `Strike (${userStrikes + 1}/2)`}
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleAdminStrikeAction('ban_user', firstOrder.user_id, sessionId, userProfile.phone)
                                    }
                                    disabled={actionInProgress === firstOrder.user_id}
                                    className="px-2 py-0.5 bg-rose-200 hover:bg-rose-300 border border-black text-rose-950 text-[10px] font-black rounded-lg shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                                    title={isRtl ? 'حظر الحساب والجوال نهائياً' : 'Ban User & Phone'}
                                  >
                                    🚫 {isRtl ? 'حظر نهائي' : 'Ban User'}
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleAdminStrikeAction('unban_user', firstOrder.user_id, sessionId, userProfile.phone)
                                  }
                                  disabled={actionInProgress === firstOrder.user_id}
                                  className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 border border-black text-emerald-950 text-[10px] font-black rounded-lg shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                                  title={isRtl ? 'فك الحظر عن الحساب' : 'Unban User'}
                                >
                                  ✨ {isRtl ? 'فك الحظر' : 'Unban'}
                                </button>
                              )}
                            </div>
                          )}
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
