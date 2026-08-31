'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Tablet,
  Laptop,
  Tv,
  Gamepad2,
  Globe,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  Layers,
  Sparkles,
  X,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminDeviceIntelligenceBadgeProps {
  deviceInfo?: Record<string, any> | null;
  compact?: boolean;
}

export const AdminDeviceIntelligenceBadge: React.FC<AdminDeviceIntelligenceBadgeProps> = ({
  deviceInfo,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!deviceInfo || Object.keys(deviceInfo).length === 0) {
    return (
      <span className="text-[10px] text-neutral-600 italic font-mono font-bold">
        غير محدد
      </span>
    );
  }

  // Normalize fields whether from getClientTelemetry or legacy
  const devType = (deviceInfo.deviceType || (deviceInfo.userAgent && /mobile|android|iphone/i.test(deviceInfo.userAgent) ? 'Mobile' : 'Desktop')) as string;
  const devModel = (deviceInfo.deviceModel || (devType === 'Mobile' ? 'هاتف ذكي' : 'كمبيوتر مكتبي')) as string;
  const os = (deviceInfo.os || '') as string;
  const osVer = (deviceInfo.osVersion || '') as string;
  const browser = (deviceInfo.browser || '') as string;
  const screenW = deviceInfo.screenWidth || deviceInfo.viewportWidth;
  const screenH = deviceInfo.screenHeight || deviceInfo.viewportHeight;
  const pixelRatio = deviceInfo.pixelRatio || 1;
  const ram = deviceInfo.deviceMemoryGb || deviceInfo.deviceMemory;
  const cores = deviceInfo.cpuCores || deviceInfo.hardwareConcurrency;
  const gpu = deviceInfo.gpuRenderer || deviceInfo.gpuVendor;
  const tz = deviceInfo.timezone || 'UTC';
  const tzOffset = deviceInfo.timezoneOffset || '';
  const net = deviceInfo.connectionType || deviceInfo.networkSpeed;
  const isWebView = Boolean(deviceInfo.isWebView);

  const getDevIcon = () => {
    switch (devType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 stroke-[2.5]" />;
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5 stroke-[2.5]" />;
      case 'smarttv':
        return <Tv className="w-3.5 h-3.5 stroke-[2.5]" />;
      case 'console':
        return <Gamepad2 className="w-3.5 h-3.5 stroke-[2.5]" />;
      default:
        return <Laptop className="w-3.5 h-3.5 stroke-[2.5]" />;
    }
  };

  const badgeBg =
    os.toLowerCase().includes('ios') || devModel.toLowerCase().includes('iphone')
      ? 'bg-[#E8F0FE] text-[#1967D2] border-[#1967D2]'
      : os.toLowerCase().includes('android') || devModel.toLowerCase().includes('samsung')
      ? 'bg-[#E6F4EA] text-[#137333] border-[#137333]'
      : os.toLowerCase().includes('win')
      ? 'bg-[#FEF7E0] text-[#B06000] border-[#B06000]'
      : os.toLowerCase().includes('mac')
      ? 'bg-[#F3E8FD] text-[#8430CE] border-[#8430CE]'
      : 'bg-neutral-100 text-neutral-800 border-black';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border shadow-[1px_1px_0px_0px_#000] text-[10.5px] font-black cursor-pointer hover:scale-102 active:scale-98 transition-all ${badgeBg}`}
        title="اضغط لعرض تفاصيل العتاد والجهاز كاملة"
      >
        {getDevIcon()}
        <span className="truncate max-w-[130px]">
          {devModel} {osVer ? `(${os} ${osVer})` : os}
        </span>
        {isWebView && (
          <span className="px-1 py-0.2 bg-purple-600 text-white rounded text-[8.5px] font-bold">
            App
          </span>
        )}
      </button>

      {/* Detail Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-3 border-black rounded-3xl p-6 max-w-lg w-full shadow-[8px_8px_0px_0px_#000] space-y-4 text-black text-right"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#FFE600] border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000]">
                    {getDevIcon()}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-black">
                      معلومات جهاز وبيئة العميل
                    </h3>
                    <p className="text-[11px] text-neutral-600 font-bold">
                      تم جمعها آلياً بدون أي صلاحيات أو إزعاج للعميل
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-neutral-100 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Grid of Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Device & OS */}
                <div className="p-3 bg-[#FFFDF9] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_#000] space-y-1">
                  <span className="text-[10px] text-neutral-500 font-black block">
                    📱 الجهاز والنظام
                  </span>
                  <div className="font-black text-sm text-black">{devModel}</div>
                  <div className="text-neutral-700 font-mono font-bold">
                    {os} {osVer ? `v${osVer}` : ''}
                  </div>
                </div>

                {/* Browser */}
                <div className="p-3 bg-[#FFFDF9] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_#000] space-y-1">
                  <span className="text-[10px] text-neutral-500 font-black block">
                    🌐 المتصفح والمحرك
                  </span>
                  <div className="font-black text-sm text-black">
                    {browser || 'المتصفح الافتراضي'}
                  </div>
                  <div className="text-neutral-700 font-mono font-bold">
                    {isWebView ? 'In-App WebView' : 'متصفح قياسي مباشر'}
                  </div>
                </div>

                {/* Screen & Display */}
                <div className="p-3 bg-[#FFFDF9] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_#000] space-y-1">
                  <span className="text-[10px] text-neutral-500 font-black block">
                    🖥️ الشاشة والدقة
                  </span>
                  <div className="font-black text-sm text-black font-mono">
                    {screenW && screenH ? `${screenW} × ${screenH}` : 'غير محدد'}
                  </div>
                  <div className="text-neutral-700 font-bold text-[11px]">
                    كثافة بكسل: {pixelRatio}x {pixelRatio >= 2 ? '(شاشة ريتنا فائقة)' : ''}
                  </div>
                </div>

                {/* Hardware (RAM, CPU, GPU) */}
                <div className="p-3 bg-[#FFFDF9] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_#000] space-y-1">
                  <span className="text-[10px] text-neutral-500 font-black block">
                    ⚡ المعالج والعتاد
                  </span>
                  <div className="font-black text-sm text-black">
                    {ram ? `${ram}` : ''} {cores ? `• ${cores} أنوية` : ''}
                  </div>
                  {gpu && (
                    <div className="text-[10.5px] text-neutral-600 font-mono font-bold truncate" title={gpu}>
                      GPU: {gpu.split('/')[0]}
                    </div>
                  )}
                </div>

                {/* Timezone & Region */}
                <div className="p-3 bg-[#FFFDF9] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_#000] space-y-1">
                  <span className="text-[10px] text-neutral-500 font-black block">
                    📍 النطاق والتوقيت
                  </span>
                  <div className="font-black text-sm text-black font-mono">
                    {tz}
                  </div>
                  <div className="text-neutral-700 font-mono font-bold text-[11px]">
                    {tzOffset || 'توقيت عالمي'}
                  </div>
                </div>

                {/* Network */}
                <div className="p-3 bg-[#FFFDF9] border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_#000] space-y-1">
                  <span className="text-[10px] text-neutral-500 font-black block">
                    📶 الشبكة والاتصال
                  </span>
                  <div className="font-black text-sm text-black font-mono uppercase">
                    {net || 'اتصال مباشر'}
                  </div>
                  {deviceInfo.downlinkSpeed && (
                    <div className="text-neutral-700 font-bold text-[11px]">
                      السرعة: {deviceInfo.downlinkSpeed} {deviceInfo.rttLatency ? `(RTT: ${deviceInfo.rttLatency})` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Raw User Agent */}
              {deviceInfo.userAgent && (
                <div className="p-3 bg-neutral-100 border-2 border-black rounded-2xl space-y-1">
                  <span className="text-[9.5px] text-neutral-500 font-black block">
                    User-Agent الكامل:
                  </span>
                  <p className="text-[10px] font-mono text-neutral-800 break-all select-all font-bold">
                    {deviceInfo.userAgent}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2 bg-[#FFE600] border-2 border-black rounded-xl font-black text-xs shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
