import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Home, Compass, MessageSquare, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: '404 - Page Not Found | UpStore',
  description: 'The page you are looking for does not exist or has been moved. Explore our catalog of digital subscriptions and licenses.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  const categories = [
    { name: 'Streaming Accounts', nameAr: 'اشتراكات البث والترفيه', href: '/?category=STREAMING', icon: '🎬' },
    { name: 'AI & Productivity', nameAr: 'أدوات الذكاء الاصطناعي', href: '/?category=AI', icon: '🤖' },
    { name: 'VPN & Security', nameAr: 'برامج الحماية وVPN', href: '/?category=VPN', icon: '🛡️' },
    { name: 'Gaming Keys', nameAr: 'مفاتيح وألعاب رقمية', href: '/?category=GAMING', icon: '🎮' },
  ];

  return (
    <main className="min-h-[85vh] bg-[#030308] text-white flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyber-green/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-[#FFE600]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-2xl w-full text-center relative z-10 space-y-8">
        
        {/* Badge & Code */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-bold tracking-widest text-[#FFE600] uppercase">
            <AlertTriangle className="w-4 h-4 text-[#FFE600]" />
            <span>Error 404 • Page Not Found</span>
          </div>

          <h1 className="text-7xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600">
            404
          </h1>

          <h2 className="text-xl sm:text-2xl font-bold text-gray-200 tracking-tight">
            عذراً! الصفحة المطلوبة غير موجودة
          </h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            ربما تم نقل الرابط أو حذف المنتج. يمكنك العودة إلى المتجر الرئيسي أو تصفح الأقسام الأكثر طلباً أدناه.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyber-green hover:bg-cyber-green/90 text-black font-extrabold text-sm transition-all shadow-[0_0_20px_rgba(0,255,102,0.25)] active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>الرئيسية (Home Store)</span>
          </Link>

          <Link
            href="/browse"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-sm transition-all active:scale-95"
          >
            <Compass className="w-4 h-4 text-[#FFE600]" />
            <span>تصفح الكل (Browse All)</span>
          </Link>

          <a
            href="https://t.me/upstore_one_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold text-sm transition-all"
          >
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span>الدعم الفني (Support)</span>
          </a>
        </div>

        {/* Popular Categories Grid */}
        <div className="pt-6 border-t border-white/10">
          <p className="text-xs uppercase font-mono tracking-widest text-gray-500 mb-4 font-bold">
            الأقسام الشائعة • POPULAR CATEGORIES
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="flex flex-col items-center p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-cyber-green/30 transition-all text-center group"
              >
                <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">{cat.icon}</span>
                <span className="text-xs font-bold text-gray-200 group-hover:text-cyber-green transition-colors">{cat.nameAr}</span>
                <span className="text-[10px] text-gray-500 font-medium">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Trust Footer */}
        <div className="flex items-center justify-center gap-6 pt-4 text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyber-green" />
            <span>تسليم آلي فوري</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FFE600]" />
            <span>ضمان استبدال ذهبي 30 يوماً</span>
          </div>
        </div>

      </div>
    </main>
  );
}
