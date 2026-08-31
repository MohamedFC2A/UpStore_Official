'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CreditCard, 
  ShieldCheck, 
  LayoutDashboard, 
  Sparkles,
  Loader2,
  Lock
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { createClient } from '@/utils/supabase/client';
import { bootstrapCurrentSession } from '@/utils/auth-client';
import { AdminGatewaysTab } from '@/components/admin/tabs/AdminGatewaysTab';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function AdminPaymentGatewaysPage() {
  const router = useRouter();
  const { language, mounted } = useLocale();
  const isRtl = mounted && language === 'ar';
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.replace('/auth/login?next=/admin/payment-gateways');
          return;
        }

        const bootstrap = await bootstrapCurrentSession(null, session);
        if (bootstrap?.profile?.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-6 text-black">
        <Loader2 className="w-10 h-10 animate-spin text-black mb-4" />
        <h2 className="text-xl font-black">{isRtl ? 'جاري التحقق من صلاحيات المشرف...' : 'Verifying Admin Permissions...'}</h2>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-6 text-black">
        <div className="bg-white border-2 border-black p-8 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 border-2 border-black rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black mb-2">{isRtl ? 'غير مصرح بالدخول' : 'Access Restricted'}</h2>
          <p className="text-sm font-bold text-neutral-600 mb-6">
            {isRtl ? 'هذه الصفحة مخصصة لمديري المتجر والمشرفين المعتمدين فقط.' : 'This page is restricted to authorized store administrators.'}
          </p>
          <Link
            href="/"
            className="cursor-pointer inline-flex items-center justify-center gap-2 bg-[#FFE600] hover:bg-[#FFE600]/80 text-black border-2 border-black px-6 py-3 rounded-xl font-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            {isRtl ? 'العودة للمتجر الرئيسي' : 'Return to Store'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-black pb-24" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-black px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo size="md" />
            </Link>
            <span className="bg-black text-white px-2 py-0.5 text-[11px] font-black uppercase rounded">
              {isRtl ? 'لوحة المشرف' : 'Admin'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin"
              className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 text-black border-2 border-black px-3.5 py-2 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              {isRtl ? 'لوحة التحكم الرئيسية' : 'Main Dashboard'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        <AdminGatewaysTab isRtl={isRtl} />
      </main>
    </div>
  );
}
