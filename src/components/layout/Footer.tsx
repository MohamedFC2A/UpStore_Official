'use client';

/**
 * Footer.tsx — UpStore Authentic White Neubrutalism Footer
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Send, ArrowRight, ShieldCheck, Zap, Mail, Copy, Check, Sparkles } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { useToastStore } from '@/store/useToastStore';
import { BrandLogo } from '@/components/ui/BrandLogo';

// ─── TikTok Vector Icon ─────────────────────────────────────────────────────

function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.46V11.2a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-2.92-1.07 4.78 4.78 0 0 1-1.12-1.56z" />
    </svg>
  );
}

// ─── UpStore Official Social Channels ────────────────────────────────────────

const SOCIALS = [
  { label: 'Store Bot', Icon: Send, href: 'https://t.me/upstore_one_bot', color: 'hover:bg-[#FFE600]' },
  { label: 'Live Monitor', Icon: Send, href: 'https://t.me/upstorelive_bot', color: 'hover:bg-[#FF70A6]' },
  { label: 'Official Support', Icon: Mail, href: 'https://t.me/UPSTORE_HELP', color: 'hover:bg-[#06D6A0]' },
] as const;

export default function Footer() {
  const pathname = usePathname();
  const { language, t, mounted } = useLocale();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const toast = useToastStore();

  if (pathname?.startsWith('/ad')) {
    return null;
  }

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('support@upstore.one');
    }
    setCopiedEmail(true);
    toast.success(
      language === 'ar' ? 'تم نسخ البريد الإلكتروني الرسمي!' : 'Official support email copied!',
      'support@upstore.one'
    );
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const getFooterText = (key: string) => {
    const dicts: Record<string, Record<string, string>> = {
      ar: {
        'Navigation': 'التنقل السريع',
        'Home': 'الرئيسية',
        'Dashboard': 'لوحة التحكم',
        'Shopping Cart': 'سلة المشتريات',
        'Flash Deals': 'صيد اليوم (عروض فلاش)',
        'Referral Program': 'برنامج الأرباح والمكافآت',
        'Support & Legal': 'الدعم والمعلومات',
        'Terms & Conditions': 'الشروط والأحكام',
        'Privacy Policy': 'سياسة الخصوصية',
        'Refund Policy': 'سياسة الاسترجاع والضمان',
        'Telegram Support': 'الدعم الفني عبر تليجرام',
        'Email Support': 'البريد الإلكتروني للدعم',
        'Connect with us:': 'تواصل معنا:',
        'We Accept:': 'طرق الدفع المدعومة:',
        '100% Safe': 'آمن 100%',
        'disclaimerText': 'إخلاء مسؤولية: UpStore هو سوق رقمي مستقل لبيع الحسابات والخدمات الرقمية. جميع العلامات التجارية والشعارات وأسماء المنتجات هي ملك لأصحابها المعنيين ولا نتبع لأي جهة بشكل رسمي.',
        'Support Hours:': 'أوقات العمل والدعم:',
        '9 AM - 11 PM GMT+2': '9 صباحاً - 11 مساءً (GMT+2)',
        'Support Channels:': 'قنوات الدعم الفني:',
        'Telegram Support:': 'الدعم عبر تليجرام:',
        'Contact Email:': 'البريد الإلكتروني:'
      },
      en: {
        'Navigation': 'Quick Navigation',
        'Home': 'Home',
        'Dashboard': 'Customer Dashboard',
        'Shopping Cart': 'Shopping Cart',
        'Flash Deals': "Today's Catch (Flash Deals)",
        'Referral Program': 'Referral Program (Cash Rewards)',
        'Support & Legal': 'Support & Legal',
        'Terms & Conditions': 'Terms & Conditions',
        'Privacy Policy': 'Privacy Policy',
        'Refund Policy': 'Refund & Warranty Policy',
        'Telegram Support': 'Telegram Priority Support',
        'Email Support': 'Email Support',
        'Connect with us:': 'Connect with us:',
        'We Accept:': 'Accepted Payment Methods:',
        '100% Safe': '100% Secure',
        'disclaimerText': 'Disclaimer: UpStore is an independent digital marketplace. All product names, logos, and brands are property of their respective owners. We are not affiliated, associated, or officially connected with any trademark owners.',
        'Support Hours:': 'Support Hours:',
        '9 AM - 11 PM GMT+2': '9 AM - 11 PM (GMT+2)',
        'Support Channels:': 'Support Channels:',
        'Telegram Support:': 'Telegram Support:',
        'Contact Email:': 'Contact Email:'
      }
    };
    const activeLang = language === 'en' ? 'en' : 'ar';
    return dicts[activeLang]?.[key] || dicts['ar']?.[key] || key;
  };

  return (
    <footer className="bg-[#FFFDF9] border-t-[3px] border-black text-black relative z-10 select-none pb-20 sm:pb-0" role="contentinfo" suppressHydrationWarning>
      
      {/* ── Main Footer Grid (3-Column Layout) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16" suppressHydrationWarning>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
          
          {/* Col 1: UpStore Brand Info */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-3">
                <BrandLogo size="lg" />
              </div>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed max-w-xs font-bold mt-2">
                {t('footerDesc')}
              </p>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h3 className="text-black text-sm font-black uppercase tracking-wider mb-5 flex items-center gap-2 select-none">
              <span className="w-2 h-4 rounded-sm bg-[#FFE600] border border-black" />
              {getFooterText('Navigation')}
            </h3>
            <ul className="space-y-3">
              {[
                { label: 'Home', href: '/' },
                { label: 'Browse Store', href: '/browse' },
                { label: 'FIFA World Cup 26', href: '/worldcup' },
                { label: 'Dashboard', href: '/dashboard', nofollow: true },
                { label: 'Shopping Cart', href: '/cart', nofollow: true },
                { label: 'Referral Program', href: '/referral', nofollow: true },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    rel={link.nofollow ? 'nofollow' : undefined}
                    className={`text-xs sm:text-sm font-bold text-neutral-700 hover:text-black hover:underline inline-block transition-all ${language === 'ar' ? 'hover:-translate-x-1' : 'hover:translate-x-1'}`}
                  >
                    {link.label === 'Browse Store' 
                      ? (language === 'ar' ? 'تصفح المتجر بالكامل' : 'Browse All Products')
                      : link.label === 'FIFA World Cup 26'
                      ? (language === 'ar' ? 'باقة كأس العالم 2026' : 'FIFA World Cup 26 Pass')
                      : getFooterText(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: UpStore Customer Support */}
          <div>
            <h3 className="text-black text-sm font-black uppercase tracking-wider mb-5 flex items-center gap-2 select-none">
              <span className="w-2 h-4 rounded-sm bg-[#FF70A6] border border-black" />
              {getFooterText('Support & Legal')}
            </h3>
            <div className="space-y-4">
              <div className="text-xs sm:text-sm space-y-2 font-bold">
                <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">{getFooterText('Support Channels:')}</p>
                <p className="text-neutral-800">
                  <span className="font-black text-black">{getFooterText('Telegram Support:')}</span>{' '}
                  <a href="https://t.me/UPSTORE_HELP" target="_blank" rel="noopener noreferrer" className="hover:underline text-black font-black bg-[#FFE600] px-2 py-0.5 rounded-lg border border-black inline-block shadow-[1px_1px_0px_0px_#000]">@UPSTORE_HELP</a>
                </p>
                <p className="text-neutral-800">
                  <span className="font-black text-black">{getFooterText('Contact Email:')}</span>{' '}
                  <a href="mailto:support@upstore.one" className="hover:underline text-black font-black bg-[#06D6A0] px-2 py-0.5 rounded-lg border border-black inline-block shadow-[1px_1px_0px_0px_#000]">support@upstore.one</a>
                </p>
              </div>

              <div className="pt-3 border-t-2 border-dashed border-neutral-300 space-y-2">
                <div>
                  <p className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-1">{getFooterText('Support Hours:')}</p>
                  <p className="text-xs sm:text-sm font-black text-black">{getFooterText('9 AM - 11 PM GMT+2')}</p>
                </div>
                <div className="pt-1">
                  <Link href="/refund" className="text-xs sm:text-sm text-black font-black hover:underline block">
                    {getFooterText('Refund Policy')} →
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Social Media & Payment Methods Row ── */}
        <div className="mt-12 pt-8 border-t-2 border-black flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-black uppercase tracking-wider">{getFooterText('Connect with us:')}</span>
            <div className="flex items-center gap-2.5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className={`w-10 h-10 rounded-xl bg-white border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] text-black ${s.color} active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center transition-all`}
                >
                  <s.Icon className="w-5 h-5 stroke-[2.5]" />
                </a>
              ))}
            </div>
          </div>

          {/* We Accept Section */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] px-5 py-3 rounded-2xl">
            <span className="text-xs font-black text-black uppercase tracking-wider whitespace-nowrap">{getFooterText('We Accept:')}</span>
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-center select-none font-bold text-xs">
              <span className="bg-[#FFE600] px-2 py-0.5 rounded border border-black font-black">Bybit P2P</span>
              <span className="bg-[#FFE600] px-2 py-0.5 rounded border border-black font-black">USDT</span>
              <span className="bg-[#4CC9F0] px-2 py-0.5 rounded border border-black font-black">InstaPay</span>
              <span className="bg-[#FF70A6] px-2 py-0.5 rounded border border-black font-black">Vodafone Cash</span>
              <span className="bg-[#B892FF] px-2 py-0.5 rounded border border-black font-black">STC Pay</span>
              <span className="bg-[#06D6A0] px-2 py-0.5 rounded border border-black font-black">Al Rajhi</span>
              <span className="bg-[#FFFDF9] px-2 py-0.5 rounded border border-black font-black">Visa & MC</span>
              <span className="bg-[#06D6A0] px-2 py-0.5 rounded border border-black font-black">Apple Pay</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Footer Copyright & Development Studio Signature Strip ── */}
      <div className="border-t-2 border-black bg-[#FFE600] py-5 text-black font-bold" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4" suppressHydrationWarning>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-black" suppressHydrationWarning>
            
            {/* UpStore Copyright + Clean Official Engineering Signature */}
            <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
              <p suppressHydrationWarning>{t('copyright', { year: new Date().getFullYear() })}</p>
              <span className="hidden sm:inline-block text-black/30 font-black">•</span>
              
              {/* High-End UpStore Engineering Studio Badge */}
              <div 
                dir="ltr" 
                className="font-sans antialiased inline-flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-[#0d0d11] text-white border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] hover:shadow-[3.5px_3.5px_0px_0px_#000] hover:-translate-y-0.5 transition-all select-none group"
              >
                {/* Visual Icon Accent */}
                <div className="w-5 h-5 rounded-lg bg-[#FFE600] border border-black flex items-center justify-center text-black shadow-[1px_1px_0px_0px_#000] shrink-0 group-hover:scale-105 transition-transform">
                  <Zap className="w-3 h-3 fill-black stroke-[2.5]" />
                </div>

                {/* Studio Name & Subtitle */}
                <div className="flex flex-col text-start leading-none pr-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400">
                    Official
                  </span>
                  <span className="text-xs font-black tracking-tight text-white group-hover:text-[#FFE600] transition-colors">
                    UpStore Engineering
                  </span>
                </div>

                {/* Connected Action Buttons (Telegram & Email) */}
                <div className="flex items-center gap-1 ps-1.5 border-s border-neutral-700">
                  {/* Telegram Bot Link */}
                  <a
                    href="https://t.me/upstore_one_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded-xl bg-neutral-900 hover:bg-[#0088cc] text-neutral-300 hover:text-white border border-neutral-700/80 hover:border-black transition-all text-[11px] font-black cursor-pointer"
                    title="Telegram Store: @upstore_one_bot"
                    aria-label="UpStore Bot"
                  >
                    <Send className="w-3.5 h-3.5 text-[#0088cc] group-hover:text-white" />
                    <span className="hidden sm:inline text-[10px]">Bot</span>
                  </a>

                  {/* Email Link & 1-Click Copy */}
                  <a
                    href="mailto:support@upstore.one"
                    onClick={handleCopyEmail}
                    className={`flex items-center gap-1 px-2 py-1 rounded-xl border transition-all text-[11px] font-black cursor-pointer ${
                      copiedEmail 
                        ? 'bg-[#06D6A0] text-black border-black shadow-[1px_1px_0px_0px_#000]' 
                        : 'bg-neutral-900 hover:bg-[#06D6A0] text-neutral-300 hover:text-black border-neutral-700/80 hover:border-black'
                    }`}
                    title="support@upstore.one (انقر للنسخ)"
                    aria-label="Email UpStore Support"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span className="text-[10px]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5 text-[#06D6A0]" />
                        <span className="hidden sm:inline text-[10px]">Email</span>
                      </>
                    )}
                  </a>
                </div>
              </div>
            </div>

            {/* Legal Links (Clean Neubrutalism Pill Buttons) */}
            <div className="flex items-center justify-center gap-2 flex-wrap text-xs font-black">
              <Link 
                href="/terms" 
                className="px-3 py-1 bg-white/90 hover:bg-white text-black border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                {getFooterText('Terms & Conditions')}
              </Link>
              <Link 
                href="/privacy" 
                className="px-3 py-1 bg-white/90 hover:bg-white text-black border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                {getFooterText('Privacy Policy')}
              </Link>
              <Link 
                href="/refund" 
                className="px-3 py-1 bg-white/90 hover:bg-white text-black border-2 border-black rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                {getFooterText('Refund Policy')}
              </Link>
            </div>
          </div>
          
          {/* Legal Disclaimer */}
          <div className="border-t border-black/20 pt-2.5 text-[10px] sm:text-[11px] text-neutral-800 leading-relaxed font-bold text-center">
            <p>{getFooterText('disclaimerText')}</p>
          </div>
        </div>
      </div>

    </footer>
  );
}
