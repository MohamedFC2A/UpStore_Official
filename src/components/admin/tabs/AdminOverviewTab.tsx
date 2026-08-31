'use client';

import React from 'react';
import { Package, ShoppingBag, Smartphone, FileText } from 'lucide-react';

interface AdminOverviewTabProps {
  products: any[];
  orders: any[];
  outOfStockCount: number;
  pendingOrdersCount: number;
  zelenkaBalance: { balance: number; currency: string } | null;
  setActiveTab: (tab: any) => void;
  at: Record<string, string>;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  products,
  orders,
  outOfStockCount,
  pendingOrdersCount,
  zelenkaBalance,
  setActiveTab,
  at,
}) => {
  return (
    <div className="space-y-6 text-black">
      {/* Welcome banner */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 relative overflow-hidden select-none shadow-[6px_6px_0px_0px_#000] text-start">
        <h2 className="text-xl sm:text-2xl font-black text-black mb-2">
          {at.welcomeTitle} <span className="bg-[#FFE600] px-2 py-0.5 border-2 border-black rounded-lg shadow-[1.5px_1.5px_0px_0px_#000]">{at.welcomeHighlight}</span>
        </h2>
        <p className="text-xs sm:text-sm text-neutral-800 font-bold max-w-xl leading-relaxed">
          {at.welcomeDesc}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-start">
        
        {/* Products Summary Card */}
        <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[5px_5px_0px_0px_#000] space-y-4">
          <div className="flex justify-between items-center select-none pb-2 border-b-2 border-black">
            <h4 className="font-black text-black text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-black stroke-[2.5]" /> {at.catalogSummary}
            </h4>
            <button onClick={() => setActiveTab('products')} className="text-black font-black hover:underline text-xs">{at.manageCatalog}</button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center font-mono">
            <div className="bg-[#FFFDF9] p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <span className="text-xl font-black text-black">{products.length}</span>
              <span className="text-xs text-neutral-700 uppercase font-sans font-black block mt-1">{at.totalItems}</span>
            </div>
            <div className="bg-[#FFFDF9] p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <span className="text-xl font-black text-rose-600">{outOfStockCount}</span>
              <span className="text-xs text-neutral-700 uppercase font-sans font-black block mt-1">{at.outOfStock}</span>
            </div>
          </div>
        </div>

        {/* Orders Summary Card */}
        <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[5px_5px_0px_0px_#000] space-y-4">
          <div className="flex justify-between items-center select-none pb-2 border-b-2 border-black">
            <h4 className="font-black text-black text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-black stroke-[2.5]" /> {at.ordersSummary}
            </h4>
            <button onClick={() => setActiveTab('orders')} className="text-black font-black hover:underline text-xs">{at.manageOrders}</button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center font-mono">
            <div className="bg-[#FFFDF9] p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <span className="text-xl font-black text-black">{orders.length}</span>
              <span className="text-xs text-neutral-700 uppercase font-sans font-black block mt-1">{at.completedOrders}</span>
            </div>
            <div className="bg-[#FFFDF9] p-3.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <span className="text-xl font-black text-black">{pendingOrdersCount}</span>
              <span className="text-xs text-neutral-700 uppercase font-sans font-black block mt-1">{at.pendingOrders}</span>
            </div>
          </div>
        </div>

        {/* Zelenka Balance Card */}
        <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[5px_5px_0px_0px_#000] space-y-4">
          <div className="flex justify-between items-center select-none pb-2 border-b-2 border-black">
            <h4 className="font-black text-black text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-black stroke-[2.5]" /> Zelenka API Balance
            </h4>
            <span className="text-xs font-black text-neutral-800">LZT Market</span>
          </div>
          <div className="bg-[#FFFDF9] p-3.5 rounded-xl border-2 border-black text-center font-mono h-[68px] flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
            {zelenkaBalance ? (
              <div>
                <span className={`text-lg sm:text-xl font-black ${Number(zelenkaBalance.balance) < (zelenkaBalance.currency === 'USD' ? 10 : 500) ? 'text-rose-600 animate-pulse' : 'text-black'}`}>
                  {zelenkaBalance.balance.toLocaleString()} {zelenkaBalance.currency}
                </span>
                {Number(zelenkaBalance.balance) < (zelenkaBalance.currency === 'USD' ? 10 : 500) && (
                  <span className="text-[10px] text-rose-600 font-sans font-black block mt-0.5">
                    Low Balance warning!
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-neutral-600 font-bold">Loading balance...</span>
            )}
          </div>
        </div>
      </div>

      {/* Sales Log */}
      <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_#000]">
        <div className="px-5 py-4 border-b-2 border-black flex items-center gap-2 select-none bg-[#FFFDF9]">
          <FileText className="w-4.5 h-4.5 text-black" />
          <h3 className="font-black text-black text-sm">{at.recentOrders}</h3>
        </div>
        <div className="divide-y-2 divide-neutral-100 max-h-[360px] overflow-y-auto scrollbar-thin">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs select-none">{at.noRecentOrders}</div>
          ) : (
            orders.slice(0, 5).map((ord) => (
              <div key={ord.id} className="p-4 flex flex-col hover:bg-neutral-50 transition-colors text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-black pr-2 truncate max-w-[200px]" title={ord.products?.name}>
                    {ord.products?.name || 'Digital Item'}
                  </span>
                  <span className="font-mono font-black text-black">${Number(ord.amount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-neutral-500">
                  <span>{ord.profiles?.display_name || ord.profiles?.email || 'Customer'}</span>
                  <span>{new Date(ord.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
