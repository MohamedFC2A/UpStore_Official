import type { Metadata } from 'next';
import AdShowcaseClient from './AdShowcaseClient';

export const metadata: Metadata = {
  title: 'UpStore 2K Ad Studio — ستوديو تصدير الإعلانات الاحترافي بدقة 2K',
  description: 'ستوديو تصدير وتصوير الإعلانات الترويجية الرسمية لمنصة UpStore بجودة فائقة تصل إلى 2K وبدون تسجيل.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdPage() {
  return <AdShowcaseClient />;
}

