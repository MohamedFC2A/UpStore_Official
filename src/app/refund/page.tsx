import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle2, Send } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund & Replacement Policy | UpStore',
  description: 'Understand the 100% replacement warranty and refund policies for UpStore digital subscriptions and products.',
  alternates: {
    canonical: 'https://upstore.one/refund',
  },
  openGraph: {
    title: 'Refund & Replacement Policy | UpStore',
    description: 'Understand the 100% replacement warranty and refund policies for UpStore digital subscriptions and products.',
    url: 'https://upstore.one/refund',
    type: 'website',
    images: [{
      url: '/api/og?title=Refund%20%26%20Warranty%20Policy&category=WARRANTY',
      width: 1200,
      height: 630,
      alt: 'UpStore Refund and Replacement Warranty Policy',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Refund & Replacement Policy | UpStore',
    description: 'Understand the 100% replacement warranty and refund policies for UpStore digital subscriptions and products.',
    images: ['/api/og?title=Refund%20%26%20Warranty%20Policy&category=WARRANTY'],
  },
};

export default function RefundPage() {
  const lastUpdated = "August 17, 2026";

  return (
    <main className="min-h-screen bg-[#FFFDF9] text-black py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none" suppressHydrationWarning>
      <div className="max-w-4xl mx-auto relative z-10 space-y-8" suppressHydrationWarning>
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#06D6A0] border-2 border-black text-black text-xs font-black tracking-widest uppercase shadow-[2px_2px_0px_0px_#000] select-none">
            <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Guaranteed Buyer Protection</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight">
            Refund & <span className="bg-[#FFE600] px-3 py-0.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000]">Replacement Policy</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-700 font-bold max-w-xl mx-auto">
            سياسة الاسترجاع والضمان والاستبدال لمتجر UpStore | Last Updated: {lastUpdated}
          </p>
        </div>

        {/* 100% Guarantee Banner */}
        <div className="rounded-3xl border-2 border-black p-6 sm:p-8 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between bg-[#FFE600] shadow-[6px_6px_0px_0px_#000] text-black">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000]">
              <ShieldCheck className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-black">ضمان استبدال كامل 100%</h3>
              <p className="text-xs sm:text-sm text-neutral-900 font-bold leading-relaxed">نضمن عمل جميع الاشتراكات والمفاتيح الرقمية طوال فترة الضمان المحددة، مع الاستبدال الفوري في حال حدوث أي خلل فني.</p>
            </div>
          </div>
          <a
            href="https://t.me/upstore_one_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-2xl bg-black hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-[3px_3px_0px_0px_#FFE600] active:translate-x-0.5 active:translate-y-0.5"
          >
            <Send className="w-4 h-4" />
            <span>طلب مساعدة فورية</span>
          </a>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6 text-xs sm:text-sm text-neutral-800 leading-relaxed font-bold">
          
          {/* Section 1: Digital Products Nature */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2.5 border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#06D6A0] border border-black rounded-sm inline-block" />
              1. طبيعة المنتجات الرقمية (Digital Goods Nature)
            </h2>
            <div className="space-y-2.5 text-neutral-800">
              <p>
                نظراً لطبيعة المنتجات الرقمية والتراخيص وحسابات الاشتراكات التي يتم تسليمها فورياً وبشكل غير قابل للإرجاع بمجرد الكشف عن الرموز أو بيانات تسجيل الدخول، فإن سياسة المتجر تعتمد أساساً على <strong className="text-black">الاستبدال الفوري والتأكد من استمرار الخدمة طوال فترة الاشتراك</strong>.
              </p>
              <p>
                Digital products, software licenses, and account subscriptions are delivered instantaneously. Once credentials or keys are revealed, standard physical returns do not apply. Our primary commitment is providing <strong className="text-black">instant technical replacement</strong> throughout the entire warranty lifespan.
              </p>
            </div>
          </section>

          {/* Section 2: Replacement Eligibility */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2.5 border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#FFE600] border border-black rounded-sm inline-block" />
              2. حالات استحقاق الاستبدال الفوري (Replacement Conditions)
            </h2>
            <ul className="space-y-2.5 text-neutral-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5 stroke-[2.5]" />
                <span>إذا كانت بيانات الحساب أو مفتاح التفعيل غير صالحة عند الاستلام (Defective on Arrival).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5 stroke-[2.5]" />
                <span>إذا توقف الاشتراك أو الحساب خلال فترة الضمان المحددة للمنتج دون أي مخالفة لتعليمات الاستخدام.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5 stroke-[2.5]" />
                <span>إذا تعذر على فريق الدعم الفني توفير بديل صالح لنفس المنتج خلال 24 ساعة، يحق للعميل استرداد المبلغ كرصيد في محفظة المتجر أو وسيلة الدفع الأصلية.</span>
              </li>
            </ul>
          </section>

          {/* Section 3: Non-Refundable Cases */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2.5 border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-rose-500 border border-black rounded-sm inline-block" />
              3. الحالات المستثناة من الضمان والاسترجاع (Exclusions)
            </h2>
            <ul className="space-y-2.5 text-neutral-800">
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <span>تغيير بيانات الحساب الأساسية (مثل الإيميل أو كلمة المرور أو رقم الهاتف) في الاشتراكات المشتركة التي يُحظر تعديلها صراحة في التعليمات.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <span>مشاركة الحسابات الخاصة أو الشاشات مع أطراف أخرى بما يتجاوز السعة المسموح بها في وصف المنتج.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <span>الخطأ من طرف المشتري في اختيار نوع المنتج أو المنطقة الجغرافية (Region) على الرغم من توضيحها في صفحة المنتج.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <span>محاولة الاحتيال أو التلاعب أو تقديم بلاغات كاذبة.</span>
              </li>
            </ul>
          </section>

          {/* Section 4: Resolution Steps */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2.5 border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#4CC9F0] border border-black rounded-sm inline-block" />
              4. خطوات طلب الاستبدال أو الاسترجاع (Resolution Steps)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#FFFDF9] border-2 border-black space-y-2 shadow-[2px_2px_0px_0px_#000]">
                <div className="w-7 h-7 rounded-lg bg-[#FFE600] border border-black text-black font-black flex items-center justify-center text-xs shadow-[1px_1px_0px_0px_#000]">1</div>
                <h4 className="text-xs font-black text-black">تجهيز رقم الطلب</h4>
                <p className="text-[11px] text-neutral-700 font-bold">انسخ رقم طلبك (Order ID) من لوحة التحكم أو بريدك الإلكتروني.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#FFFDF9] border-2 border-black space-y-2 shadow-[2px_2px_0px_0px_#000]">
                <div className="w-7 h-7 rounded-lg bg-[#06D6A0] border border-black text-black font-black flex items-center justify-center text-xs shadow-[1px_1px_0px_0px_#000]">2</div>
                <h4 className="text-xs font-black text-black">التواصل مع الدعم</h4>
                <p className="text-[11px] text-neutral-700 font-bold">أرسل رسالة فورية لحساب الدعم عبر تليجرام موضحاً المشكلة وصورة الخطأ إن وجدت.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#FFFDF9] border-2 border-black space-y-2 shadow-[2px_2px_0px_0px_#000]">
                <div className="w-7 h-7 rounded-lg bg-[#FF70A6] border border-black text-black font-black flex items-center justify-center text-xs shadow-[1px_1px_0px_0px_#000]">3</div>
                <h4 className="text-xs font-black text-black">الحل الفوري</h4>
                <p className="text-[11px] text-neutral-700 font-bold">يقوم الفريق بالتحقق وتزويدك ببيانات بديلة وصالحة فوراً خلال دقائق معدودة.</p>
              </div>
            </div>
          </section>

        </div>

        {/* Direct Contact Footer Link */}
        <div className="text-center pt-4">
          <p className="text-xs text-neutral-700 font-bold">
            للمزيد من الاستفسارات يمكنك الاطلاع على{' '}
            <Link href="/terms" className="text-black font-black underline hover:opacity-80">الشروط والأحكام</Link>
            {' '}أو{' '}
            <Link href="/privacy" className="text-black font-black underline hover:opacity-80">سياسة الخصوصية</Link>.
          </p>
        </div>

      </div>
    </main>
  );
}
