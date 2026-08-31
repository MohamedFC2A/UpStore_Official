'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Download, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { useToastStore } from '@/store/useToastStore';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  code: string;
  isAr?: boolean;
}

export function QRCodeModal({ isOpen, onClose, url, code, isAr = false }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !url) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Generate real, fully compliant, scannable QR Code
    QRCode.toCanvas(
      canvas,
      url,
      {
        width: 240,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      },
      (error) => {
        if (error) {
          console.error('[QRCode Generation Error]:', error);
        }
      }
    );
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    useToastStore.getState().success(
      isAr ? 'تم نسخ رابط الإحالة بنجاح!' : 'Referral link copied successfully!',
      isAr ? 'جاهز للمشاركة الفورية' : 'Ready to share'
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `UpStore-Referral-${code || 'QR'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-sm rounded-3xl border-2 border-black bg-white p-6 shadow-[8px_8px_0px_0px_#000] flex flex-col items-center text-center overflow-hidden text-black"
        style={{ direction: isAr ? 'rtl' : 'ltr' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white hover:bg-neutral-100 border-2 border-black text-black flex items-center justify-center transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer z-10 shadow-[1.5px_1.5px_0px_0px_#000]"
          aria-label="Close"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center mb-3 text-black shadow-[2px_2px_0px_0px_#000]">
          <QrCode className="w-6 h-6 stroke-[2.5]" />
        </div>

        <h3 className="text-lg sm:text-xl font-black text-black mb-1">
          {isAr ? 'رمز QR الخاص بإحالتك' : 'Your Referral QR Code'}
        </h3>
        <p className="text-xs text-neutral-800 font-bold mb-4 max-w-[260px]">
          {isAr
            ? 'امسح الرمز بكاميرا هاتفك لفتح رابط الدعوة والتسجيل الفوري.'
            : 'Scan this code with your phone camera to register instantly.'}
        </p>

        {/* Real QR Code Canvas Container */}
        <div className="relative p-2.5 rounded-2xl bg-[#FFFDF9] border-2 border-black flex items-center justify-center mb-4 shadow-[3px_3px_0px_0px_#000]">
          <canvas 
            ref={canvasRef} 
            className="w-48 h-48 rounded-xl bg-white" 
          />
        </div>

        {/* Invite Code Badge */}
        <div className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl mb-4 text-xs shadow-[2px_2px_0px_0px_#000]">
          <span className="text-neutral-800 font-black">
            {isAr ? 'كود الدعوة الخاص بك:' : 'Your Invite Code:'}
          </span>
          <span className="font-mono font-black text-black text-sm tracking-wider">
            {code || 'N/A'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-2.5">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black text-black text-xs font-black transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>{copied ? (isAr ? 'تم النسخ' : 'Copied!') : (isAr ? 'نسخ الرابط' : 'Copy Link')}</span>
          </button>

          <button
            onClick={handleDownloadQR}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black text-black text-xs font-black transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isAr ? 'حفظ الصورة' : 'Save Image'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
