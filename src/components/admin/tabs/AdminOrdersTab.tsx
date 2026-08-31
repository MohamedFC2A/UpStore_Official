'use client';

import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { AdminDeviceIntelligenceBadge } from '../AdminDeviceIntelligenceBadge';

interface AdminOrdersTabProps {
  filteredOrders: any[];
  orderSearch: string;
  setOrderSearch: (v: string) => void;
  handleOpenEditOrderModal: (order: any) => void;
  handleDeleteOrder: (id: string) => void;
  at: Record<string, string>;
}

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  filteredOrders,
  orderSearch,
  setOrderSearch,
  handleOpenEditOrderModal,
  handleDeleteOrder,
  at,
}) => {
  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center justify-between gap-4">
        <input 
          type="text"
          placeholder={at.searchOrdersPlaceholder}
          value={orderSearch}
          onChange={(e) => setOrderSearch(e.target.value)}
          className="bg-white border-2 border-black rounded-xl px-4 py-2.5 text-xs font-bold text-black placeholder-neutral-600 outline-none shadow-[2px_2px_0px_0px_#000] flex-1"
        />
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
                <th className="p-4">{at.colStatus}</th>
                <th className="p-4">{at.colKey}</th>
                <th className="p-4 text-center">{at.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-neutral-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-700 font-bold select-none">No orders found.</td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-4">
                      <div className="font-black text-black mb-0.5">{o.products?.name || 'Digital Item'}</div>
                      <div className="text-xs text-neutral-700 font-mono font-bold uppercase">{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-black text-black">{o.profiles?.display_name || 'N/A'}</div>
                      <div className="text-xs text-neutral-700 font-mono font-bold">{o.profiles?.email || 'Anonymous'}</div>
                    </td>
                    <td className="p-4">
                      <AdminDeviceIntelligenceBadge deviceInfo={o.client_telemetry || o.device_info || o.profiles?.last_device_info} />
                    </td>
                    <td className="p-4 text-black font-mono font-black">${Number(o.amount).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded border border-black shadow-[1px_1px_0px_0px_#000] select-none ${
                        o.status === 'fulfilled' || o.status === 'completed'
                          ? 'bg-[#06D6A0] text-black' 
                          : o.status === 'cancelled'
                            ? 'bg-[#FF70A6] text-black'
                            : 'bg-[#FFE600] text-black'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono max-w-[150px] truncate">
                      {o.product_key ? (
                        <span className="text-xs bg-[#FFFDF9] border border-black px-2 py-1 rounded text-black font-bold select-all block break-all whitespace-pre-wrap">
                          {o.product_key}
                        </span>
                      ) : (
                        <span className="text-neutral-600 font-bold italic">{at.noKeyYet}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenEditOrderModal(o)}
                          className="p-1.5 hover:bg-neutral-100 text-black rounded-lg border border-black shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-colors cursor-pointer"
                          title="Edit Status / Key"
                        >
                          <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <button 
                          onClick={() => handleDeleteOrder(o.id)}
                          className="p-1.5 hover:bg-rose-100 text-rose-700 rounded-lg border border-black shadow-[1px_1px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-colors cursor-pointer"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
