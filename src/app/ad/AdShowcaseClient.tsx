'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Lock,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Check,
  ChevronRight,
  Video,
  Sparkles,
  Smartphone,
  Layers,
  Settings2,
  Sliders,
  Download,
  Film,
  Music,
  Trophy,
  Camera,
  Heart,
  MessageCircle,
  Share2,
  Disc,
  Flame,
  Clock,
  Tag,
  Gift,
  CheckCheck,
  ChevronDown,
  X,
  SlidersHorizontal,
  BadgePercent,
  TrendingUp,
  Wifi,
  Radio
} from 'lucide-react';

// ─── Product Preset Definitions ───────────────────────────────────────────────

export interface ProductPreset {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  badge: string;
  originalPrice: number;
  offerPrice: number;
  currency: string;
  discountPct: number;
  stockLeft: number;
  deliveryTime: string;
  warranty: string;
  brandColor: string;
  accentColor: string;
  activationUrl: string;
  shortDisplayUrl: string;
  iconType: 'gemini' | 'chatgpt' | 'youtube' | 'netflix' | 'spotify' | 'worldcup' | 'canva' | 'custom';
  subtitles: {
    start: number;
    end: number;
    text: string;
    stage: 0 | 1 | 2 | 3;
  }[];
}

const PRODUCT_PRESETS: ProductPreset[] = [
  {
    id: 'gemini-pro',
    name: 'Google Gemini Pro',
    nameEn: 'Gemini Advanced 18 Months',
    category: 'الذكاء الاصطناعي',
    badge: '18 شهر كامل',
    originalPrice: 1250,
    offerPrice: 49,
    currency: 'ج.م',
    discountPct: 92,
    stockLeft: 3,
    deliveryTime: 'دفع عالمي وضمان كامل المدة',
    warranty: 'ضمان شامل كامل المدة 18 شهر',
    brandColor: '#1A73E8',
    accentColor: '#FFE600',
    activationUrl:
      'https://serviceactivation.google.com/subscription/new/AQCpiIES4EIsoQPs2FOKhAYeCM_PwctxJ2POAJZFocfjuUTOTjLsyaCRBXePLxddbaYye_QAYCoBaO1dS-qyXf7mGgIT5-vPpbfp4d9o1ZLhyUu3EwFX_EV6ET7jCL_0j31KPLt-rUQjH1Swve1SAFZGXZ4l6hJCSvJ4flZUL9NQnluT58Xi-L2v0jqB6l4WlF2FZgMFwx6q6Cn2YMQbpZvw3G2E2HKec19ifMPccslwunbI8BCi4nYvJxgpsayPXoRb7hXxxSw4ELx3DQ==',
    shortDisplayUrl: 'https://serviceactivation.google.com/subscription/new/AQCpiIES4...',
    iconType: 'gemini',
    subtitles: [
      { start: 0.0, end: 2.4, text: 'الحين اشترِ جيمناي برو (Gemini Pro)', stage: 0 },
      { start: 2.4, end: 5.2, text: '18 شهر كامل على بريدك الشخصي', stage: 1 },
      { start: 5.2, end: 7.0, text: 'وبأقوى سعر: 49 ج.م فقط (خصم 92%)', stage: 1 },
      { start: 7.0, end: 8.8, text: 'تفعيل سريع بضغطة واحدة وضمان شامل', stage: 2 },
      { start: 8.8, end: 12.4, text: 'من UpStore.one • ضمان ذهبي رسمي 100%', stage: 3 },
    ],
  },
  {
    id: 'chatgpt-plus',
    name: 'ChatGPT Plus 4.0 / o3',
    nameEn: 'OpenAI ChatGPT Plus Official',
    category: 'الذكاء الاصطناعي',
    badge: 'تفعيل رسمي على حسابك',
    originalPrice: 1100,
    offerPrice: 99,
    currency: 'ج.م',
    discountPct: 90,
    stockLeft: 4,
    deliveryTime: 'تفعيل مباشر وسريع',
    warranty: 'ضمان كامل واستبدال سريع',
    brandColor: '#10A37F',
    accentColor: '#06D6A0',
    activationUrl: 'https://chatgpt.com/auth/ext/redeem-code/UPSTORE-CHATGPT-PLUS-OFFICIAL',
    shortDisplayUrl: 'https://chatgpt.com/auth/ext/redeem-code/UPSTORE...',
    iconType: 'chatgpt',
    subtitles: [
      { start: 0.0, end: 2.4, text: 'تفعيل ChatGPT Plus 4.0 الرسمي على بريدك', stage: 0 },
      { start: 2.4, end: 5.2, text: 'وصول غير محدود لأحدث نماذج الذكاء الاصطناعي', stage: 1 },
      { start: 5.2, end: 7.0, text: 'بسعر 99 ج.م فقط بدلاً من 1100 ج.م', stage: 1 },
      { start: 7.0, end: 8.8, text: 'دفع فوري بضغطة واحدة وتفعيل بالثواني', stage: 2 },
      { start: 8.8, end: 12.4, text: 'حصرياً عبر UpStore.one مع الضمان الذهبي', stage: 3 },
    ],
  },
  {
    id: 'youtube-premium',
    name: 'YouTube Premium',
    nameEn: 'YouTube Premium 12 Months',
    category: 'البث والموسيقى',
    badge: '12 شهر بدون إعلانات',
    originalPrice: 850,
    offerPrice: 69,
    currency: 'ج.م',
    discountPct: 91,
    stockLeft: 5,
    deliveryTime: 'دفع عالمي وضمان كامل المدة',
    warranty: 'ضمان سنة كاملة',
    brandColor: '#FF0000',
    accentColor: '#FFE600',
    activationUrl: 'https://youtube.com/premium/activate/UPSTORE-FAMILY-VIP-INVITE',
    shortDisplayUrl: 'https://youtube.com/premium/activate/UPSTORE...',
    iconType: 'youtube',
    subtitles: [
      { start: 0.0, end: 2.4, text: 'اشترك في يوتيوب بريميوم سنة كاملة', stage: 0 },
      { start: 2.4, end: 5.2, text: 'بدون إعلانات + يوتيوب ميوزك وتنزيل الفيديوهات', stage: 1 },
      { start: 5.2, end: 7.0, text: 'فقط بـ 69 ج.م للسنة كاملة (خصم 91%)', stage: 1 },
      { start: 7.0, end: 8.8, text: 'تفعيل على إيميلك الشخصي بدون كلمة سر', stage: 2 },
      { start: 8.8, end: 12.4, text: 'اطلبه الآن من UpStore.one واستمتع بالخدمة', stage: 3 },
    ],
  },
  {
    id: 'netflix-premium',
    name: 'Netflix Premium 4K UHD',
    nameEn: 'Netflix 4-Screens Ultra HD',
    category: 'الترفيه والسينما',
    badge: '4 شاشات Ultra HD 4K',
    originalPrice: 600,
    offerPrice: 45,
    currency: 'ج.م',
    discountPct: 92,
    stockLeft: 2,
    deliveryTime: 'دفع عالمي وضمان كامل المدة',
    warranty: 'ضمان تشغيل طوال المدة',
    brandColor: '#E50914',
    accentColor: '#FF2A54',
    activationUrl: 'https://netflix.com/youraccount/profile/UPSTORE-4K-VIP',
    shortDisplayUrl: 'https://netflix.com/youraccount/profile/...',
    iconType: 'netflix',
    subtitles: [
      { start: 0.0, end: 2.4, text: 'حساب نتفلكس بريميوم 4K رسمي وخاص', stage: 0 },
      { start: 2.4, end: 5.2, text: 'أعلى دقة 4K UHD وبدون أي انقطاع', stage: 1 },
      { start: 5.2, end: 7.0, text: 'بـ 45 ج.م فقط شهرياً مع الضمان الكامل', stage: 1 },
      { start: 7.0, end: 8.8, text: 'استلام فوري لبيانات الدخول بضغطة زر', stage: 2 },
      { start: 8.8, end: 12.4, text: 'سهرة ممتعة مع UpStore.one', stage: 3 },
    ],
  },
  {
    id: 'spotify-premium',
    name: 'Spotify Premium Individual',
    nameEn: 'Spotify Premium 12 Months',
    category: 'الموسيقى والبودكاست',
    badge: 'صوت Hi-Fi وتنزيل بلا حدود',
    originalPrice: 480,
    offerPrice: 39,
    currency: 'ج.م',
    discountPct: 92,
    stockLeft: 6,
    deliveryTime: 'تفعيل فوري على حسابك',
    warranty: 'ضمان شامل 100%',
    brandColor: '#1DB954',
    accentColor: '#FFE600',
    activationUrl: 'https://spotify.com/redeem/UPSTORE-SPOTIFY-1YEAR-VIP',
    shortDisplayUrl: 'https://spotify.com/redeem/UPSTORE...',
    iconType: 'spotify',
    subtitles: [
      { start: 0.0, end: 2.4, text: 'سبوتيفاي بريميوم سنة كاملة على حسابك', stage: 0 },
      { start: 2.4, end: 5.2, text: 'استمع بدون إعلانات وحمّل أغانيك بأعلى نقاء', stage: 1 },
      { start: 5.2, end: 7.0, text: 'فقط بـ 39 ج.م بدلاً من 480 ج.م', stage: 1 },
      { start: 7.0, end: 8.8, text: 'تفعيل فوري وآمن بضغطة واحدة', stage: 2 },
      { start: 8.8, end: 12.4, text: 'UpStore.one • عالمك الرقمي الأوفر', stage: 3 },
    ],
  },
  {
    id: 'worldcup-2026',
    name: 'كأس العالم 2026 VIP APK',
    nameEn: 'FIFA World Cup 2026 VIP Stream',
    category: 'البث الرياضي المباشر',
    badge: 'بث 4K 60FPS بدون تقطيع',
    originalPrice: 500,
    offerPrice: 49,
    currency: 'ج.م',
    discountPct: 90,
    stockLeft: 7,
    deliveryTime: 'تحميل مباشر للـ APK وكود التفعيل',
    warranty: 'تغطية شاملة لجميع المباريات',
    brandColor: '#06D6A0',
    accentColor: '#FFE600',
    activationUrl: 'https://upstore.one/download/worldcup-2026-vip.apk',
    shortDisplayUrl: 'https://upstore.one/download/worldcup-2026...',
    iconType: 'worldcup',
    subtitles: [
      { start: 0.0, end: 2.4, text: 'شاهد كأس العالم 2026 بدقة 4K بدون تقطيع', stage: 0 },
      { start: 2.4, end: 5.2, text: 'تطبيق APK خاص لجميع الهواتف والشاشات الذكية', stage: 1 },
      { start: 5.2, end: 7.0, text: 'بـ 49 ج.م فقط للبطولة كاملة مع كود التفعيل', stage: 1 },
      { start: 7.0, end: 8.8, text: 'تحميل مباشر وتفعيل تلقائي فوري', stage: 2 },
      { start: 8.8, end: 12.4, text: 'شجع فريقك مع UpStore.one الرسمي', stage: 3 },
    ],
  },
];

// ─── Device Chassis Options ───────────────────────────────────────────────────

export type DeviceType = 's24-ultra' | 'iphone-16-pro' | 'reels-story' | 'neubrutalist';

export type ResolutionPreset = {
  id: string;
  name: string;
  width: number;
  height: number;
  aspect: string;
  label: string;
  is2K?: boolean;
};

const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { id: '2k-story', name: '2K Ultra HD (9:16)', width: 1440, height: 2560, aspect: '9/16', label: '2K QHD', is2K: true },
  { id: '1080p-story', name: 'Full HD 1080p (9:16)', width: 1080, height: 1920, aspect: '9/16', label: '1080p' },
  { id: '2k-square', name: '2K Square Post (1:1)', width: 1440, height: 1440, aspect: '1/1', label: '2K Square', is2K: true },
  { id: '2k-landscape', name: '2K Landscape (16:9)', width: 2560, height: 1440, aspect: '16/9', label: '2K 16:9', is2K: true },
];

const BASE_CYCLE_MS = 12400;
const AUDIO_URL = '/audio/aebc2eb9-52ae-4757-a976-f32b60c0db10.mp3';

// ─── Sound Synthesizer via Web Audio API (Zero External Dependencies) ─────────

class StudioAudioSynth {
  private ctx: AudioContext | null = null;
  public destNode: MediaStreamAudioDestinationNode | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.destNode = this.ctx.createMediaStreamDestination();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getDestinationStream(): MediaStream | null {
    this.initCtx();
    return this.destNode ? this.destNode.stream : null;
  }

  public playNotificationDing(gainVal = 0.25) {
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    if (this.destNode) gain.connect(this.destNode);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playHapticClick(gainVal = 0.2) {
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    if (this.destNode) gain.connect(this.destNode);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playSuccessChime(gainVal = 0.28) {
    const ctx = this.initCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(gainVal / 2, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      if (this.destNode) gain.connect(this.destNode);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.8);
    });
  }
}

const audioSynth = new StudioAudioSynth();

// ─── Brand Icon Components ────────────────────────────────────────────────────

function ProductBrandIcon({
  type,
  className = 'w-10 h-10',
}: {
  type: ProductPreset['iconType'];
  className?: string;
}) {
  switch (type) {
    case 'gemini':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <defs>
            <linearGradient id="geminiStudioGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1A73E8" />
              <stop offset="50%" stopColor="#9B72CB" />
              <stop offset="100%" stopColor="#FF70A6" />
            </linearGradient>
          </defs>
          <path
            d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
            fill="url(#geminiStudioGrad)"
          />
        </svg>
      );
    case 'chatgpt':
      return (
        <div className={`${className} rounded-2xl bg-[#10A37F] flex items-center justify-center text-white shadow-md`}>
          <Sparkles className="w-3/5 h-3/5 fill-white" />
        </div>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path
            d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.528 3.545 12 3.545 12 3.545s-7.528 0-9.388.511a3.002 3.002 0 0 0-2.11 2.107C0 8.028 0 12 0 12s0 3.972.502 5.837a3.002 3.002 0 0 0 2.11 2.107c1.86.511 9.388.511 9.388.511s7.528 0 9.388-.511a3.002 3.002 0 0 0 2.11-2.107C24 15.972 24 12 24 12s0-3.972-.502-5.837z"
            fill="#FF0000"
          />
          <path d="M9.545 8.568V15.43L15.545 12z" fill="#FFFFFF" />
        </svg>
      );
    case 'netflix':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M5.5 2v20h4.3v-8.47L14.2 22h4.3V2h-4.3v8.47L9.8 2H5.5z" fill="#E50914" />
        </svg>
      );
    case 'spotify':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path
            d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.06-.84-.18-.9-.6-.06-.42.18-.84.6-.9 4.62-1.08 8.58-.66 11.76 1.26.36.24.48.66.24 1.02.12-.12.12-.12 0 0zm1.44-3.24c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.44-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.38-1.32 9.78-.66 13.5 1.62.42.24.6.78.3 1.26h-.06zm.12-3.3c-.36.54-1.08.72-1.62.36-4.02-2.4-10.68-2.64-14.58-1.44-.6.18-1.26-.18-1.44-.78-.18-.6.18-1.26.78-1.44 4.68-1.44 12-1.14 16.68 1.68.54.3.72 1.02.36 1.62l.06-.06z"
            fill="#1DB954"
          />
        </svg>
      );
    case 'worldcup':
      return (
        <div className={`${className} rounded-2xl bg-gradient-to-tr from-[#06D6A0] to-[#1A73E8] flex items-center justify-center text-black font-black shadow-md`}>
          <Trophy className="w-3/5 h-3/5 text-black" />
        </div>
      );
    default:
      return (
        <div className={`${className} rounded-2xl bg-[#FFE600] flex items-center justify-center text-black font-black shadow-md border-2 border-black`}>
          <Zap className="w-3/5 h-3/5 fill-black" />
        </div>
      );
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdShowcaseClient() {
  // Active Preset & Customizer State
  const [activePreset, setActivePreset] = useState<ProductPreset>(PRODUCT_PRESETS[0]);
  const [deviceType, setDeviceType] = useState<DeviceType>('s24-ultra');
  const [selectedResolution, setSelectedResolution] = useState<ResolutionPreset>(RESOLUTION_PRESETS[0]);

  // Stage & Playback State
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [audioMuted, setAudioMuted] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [progress, setProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [phoneKey, setPhoneKey] = useState<number>(0);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Custom Product Form
  const [customForm, setCustomForm] = useState({
    name: 'اشتراك مخصص VIP',
    category: 'الخدمات الرقمية',
    badge: 'تفعيل رسمي معتمد',
    originalPrice: 999,
    offerPrice: 49,
    currency: 'ج.م',
    discountPct: 95,
    stockLeft: 3,
    deliveryTime: 'دفع عالمي وضمان كامل المدة',
    warranty: 'ضمان شامل 100%',
    brandColor: '#1A73E8',
    accentColor: '#FFE600',
    activationUrl: 'https://upstore.one',
    shortDisplayUrl: 'https://upstore.one/activate/...',
  });

  // Simulated live customer sales notifications
  const LIVE_SALES = useMemo(
    () => [
      { name: 'محمد ع.', city: 'القاهرة', item: 'Gemini Pro 18 شهر' },
      { name: 'خالد س.', city: 'الرياض', item: 'ChatGPT Plus 4.0' },
      { name: 'عمر ف.', city: 'دبي', item: 'YouTube Premium سنة' },
      { name: 'سارة م.', city: 'الإسكندرية', item: 'Netflix 4K UHD' },
      { name: 'ياسر ح.', city: 'جدة', item: 'Spotify Premium سنة' },
    ],
    []
  );
  const [liveSaleIndex, setLiveSaleIndex] = useState(0);

  useEffect(() => {
    const saleTimer = setInterval(() => {
      setLiveSaleIndex((prev) => (prev + 1) % LIVE_SALES.length);
    }, 4000);
    return () => clearInterval(saleTimer);
  }, [LIVE_SALES]);


  // High-Contrast Cursor State
  const [cursorState, setCursorState] = useState<{
    x: number;
    y: number;
    clicking: boolean;
    label: string;
    visible: boolean;
  }>({
    x: 50,
    y: 44,
    clicking: false,
    label: 'تنبيه حصري عاجل',
    visible: true,
  });
  const [cursorMode, setCursorMode] = useState<'cyber' | 'ripple' | 'hidden'>('cyber');

  // Video Export & Recording State (Direct 2K Video Render)
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState('');
  const [exportSecondsLeft, setExportSecondsLeft] = useState(13);

  // Smart Screen / Tab Recording State (Auto-Pilot MP4 2K 60FPS)
  const [isSmartRecording, setIsSmartRecording] = useState(false);
  const [smartRecordSecondsLeft, setSmartRecordSecondsLeft] = useState(13);
  const smartStreamRef = useRef<MediaStream | null>(null);
  const smartRecorderRef = useRef<MediaRecorder | null>(null);
  const smartChunksRef = useRef<Blob[]>([]);
  const smartTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs
  const phoneRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const progressAnimRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);


  // Subtitles
  const currentSubtitles = useMemo(() => activePreset.subtitles, [activePreset]);
  const [currentCaptionText, setCurrentCaptionText] = useState(currentSubtitles[0]?.text || '');

  // Audio setup
  useEffect(() => {
    const audio = new Audio(AUDIO_URL);
    audio.preload = 'auto';
    audio.loop = false;
    audioRef.current = audio;

    const playAudio = async () => {
      try {
        if (!audioMuted && isPlaying) {
          audio.playbackRate = speedMultiplier;
          audio.currentTime = 0;
          await audio.play();
        }
      } catch (e) {}
    };

    playAudio();

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [activePreset.id]);

  // Sync speed & audio
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = speedMultiplier;
    if (isPlaying && !audioMuted) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioMuted, speedMultiplier]);

  // Stage transitions & cursor choreography with sound synthesis
  const goToStage = useCallback(
    (newStage: 0 | 1 | 2 | 3) => {
      setStage(newStage);

      if (newStage === 0) {
        audioSynth.playNotificationDing(0.2);
        setCursorState({
          x: 50,
          y: 44,
          clicking: false,
          label: 'تنبيه حصري عاجل',
          visible: cursorMode !== 'hidden',
        });

        setTimeout(() => {
          audioSynth.playHapticClick(0.18);
          setCursorState({
            x: 50,
            y: 44,
            clicking: true,
            label: 'فتح العرض في UpStore',
            visible: cursorMode !== 'hidden',
          });
        }, 1800 / speedMultiplier);
      } else if (newStage === 1) {
        setCursorState({
          x: 50,
          y: 82,
          clicking: false,
          label: `${activePreset.badge} بـ ${activePreset.offerPrice} ${activePreset.currency}`,
          visible: cursorMode !== 'hidden',
        });

        setTimeout(() => {
          audioSynth.playHapticClick(0.22);
          setCursorState({
            x: 50,
            y: 82,
            clicking: true,
            label: 'شراء وتفعيل فوري',
            visible: cursorMode !== 'hidden',
          });
        }, 3100 / speedMultiplier);
      } else if (newStage === 2) {
        setCursorState({
          x: 50,
          y: 72,
          clicking: false,
          label: 'دفع فوري بضغطة واحدة',
          visible: cursorMode !== 'hidden',
        });

        setTimeout(() => {
          audioSynth.playHapticClick(0.25);
          setCursorState({
            x: 50,
            y: 72,
            clicking: true,
            label: 'تأكيد الدفع',
            visible: cursorMode !== 'hidden',
          });
        }, 1200 / speedMultiplier);
      } else if (newStage === 3) {
        audioSynth.playSuccessChime(0.3);
        setCursorState({
          x: 50,
          y: 72,
          clicking: false,
          label: 'استلام الرابط مباشرة',
          visible: cursorMode !== 'hidden',
        });

        setTimeout(() => {
          audioSynth.playHapticClick(0.2);
          setCursorState({
            x: 50,
            y: 72,
            clicking: true,
            label: 'تفعيل الحساب الرسمي',
            visible: cursorMode !== 'hidden',
          });
        }, 1600 / speedMultiplier);
      }
    },
    [speedMultiplier, activePreset, cursorMode]
  );

  const cycleDuration = BASE_CYCLE_MS / speedMultiplier;

  // Timeline Auto-runner
  useEffect(() => {
    if (!isPlaying) return;

    let t0: NodeJS.Timeout, t1: NodeJS.Timeout, t2: NodeJS.Timeout, t3: NodeJS.Timeout;

    const runSequence = () => {
      startTimeRef.current = Date.now();
      setPhoneKey((k) => k + 1);

      if (audioRef.current && !audioMuted) {
        audioRef.current.playbackRate = speedMultiplier;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      // Stage 0: Lockscreen Hook
      goToStage(0);

      // Stage 1: Storefront Offer
      t0 = setTimeout(() => {
        goToStage(1);
      }, 2400 / speedMultiplier);

      // Stage 2: 1-Tap Pay
      t1 = setTimeout(() => {
        goToStage(2);
      }, 6200 / speedMultiplier);

      // Stage 3: VIP Instant Delivery
      t2 = setTimeout(() => {
        goToStage(3);
      }, 8000 / speedMultiplier);

      // Restart cycle
      t3 = setTimeout(() => {
        runSequence();
      }, cycleDuration);
    };

    runSequence();

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isPlaying, audioMuted, speedMultiplier, goToStage, cycleDuration]);

  // Subtitles & Progress runner tied directly to timeline
  useEffect(() => {
    if (!isPlaying) return;

    const updateFrame = () => {
      let elapsedSec = 0;
      if (audioRef.current && !audioRef.current.paused && audioRef.current.currentTime > 0) {
        elapsedSec = audioRef.current.currentTime;
        setProgress((elapsedSec / (BASE_CYCLE_MS / 1000)) * 100);
      } else {
        const elapsedMs = (Date.now() - startTimeRef.current) % cycleDuration;
        elapsedSec = (elapsedMs / cycleDuration) * (BASE_CYCLE_MS / 1000);
        setProgress((elapsedMs / cycleDuration) * 100);
      }

      const cue = currentSubtitles.find((c) => elapsedSec >= c.start && elapsedSec < c.end);
      if (cue && cue.text !== currentCaptionText) {
        setCurrentCaptionText(cue.text);
      }

      progressAnimRef.current = requestAnimationFrame(updateFrame);
    };

    progressAnimRef.current = requestAnimationFrame(updateFrame);
    return () => {
      if (progressAnimRef.current) cancelAnimationFrame(progressAnimRef.current);
    };
  }, [isPlaying, currentCaptionText, cycleDuration, currentSubtitles]);

  // Copy link handler
  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activePreset.activationUrl);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // ─── Smart Auto-Pilot Screen/Tab Recording Engine (MP4, 2K 60FPS, Auto-Sync) ───

  const handleStartSmartRecord = async () => {
    if (isSmartRecording || isExportingVideo) return;

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
        alert('ميزة تسجيل الشاشة الذكي تتطلب متصفحاً حديثاً مثل Google Chrome أو Microsoft Edge على الحاسوب.');
        return;
      }

      // Prompt tab selection with 2K 60FPS target
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 2560, max: 3840 },
          height: { ideal: 1440, max: 2160 },
        },
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        systemAudio: 'include',
      } as any);

      smartStreamRef.current = stream;

      // Handle user clicking the native "Stop sharing" browser banner
      stream.getVideoTracks()[0].onended = () => {
        handleStopSmartRecord(false);
      };

      // Combine video & audio tracks
      const combinedTracks: MediaStreamTrack[] = [...stream.getVideoTracks()];
      if (stream.getAudioTracks().length > 0) {
        combinedTracks.push(...stream.getAudioTracks());
      } else {
        const audioStream = audioSynth.getDestinationStream();
        if (audioStream && audioStream.getAudioTracks().length > 0) {
          combinedTracks.push(...audioStream.getAudioTracks());
        }
      }

      const unifiedStream = new MediaStream(combinedTracks);

      // Check MP4 / High-Efficiency codecs
      const candidateMimes = [
        'video/mp4;codecs=avc1.4d002a,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
      ];
      const selectedMime = candidateMimes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

      const recorder = new MediaRecorder(unifiedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 28000000, // 28 Mbps Ultra-Quality
        audioBitsPerSecond: 192000,
      });

      smartChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          smartChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const chunks = smartChunksRef.current;
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: selectedMime.includes('mp4') ? 'video/mp4' : 'video/mp4' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `UpStore-Ad-${activePreset.id}-2K.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        setIsSmartRecording(false);
      };

      recorder.start(100);
      smartRecorderRef.current = recorder;
      setIsSmartRecording(true);

      // Reset animation to 0 and play from beginning
      setPhoneKey((k) => k + 1);
      goToStage(0);
      startTimeRef.current = Date.now();

      if (audioRef.current) {
        audioRef.current.playbackRate = speedMultiplier;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      // Auto-stop after 1 full cycle
      const totalSec = Math.ceil(BASE_CYCLE_MS / 1000 / speedMultiplier);
      setSmartRecordSecondsLeft(totalSec);

      const interval = setInterval(() => {
        setSmartRecordSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      smartTimerRef.current = setTimeout(() => {
        clearInterval(interval);
        handleStopSmartRecord(true);
      }, (BASE_CYCLE_MS / speedMultiplier) + 400);

    } catch (err: any) {
      console.warn('Smart record cancelled or error:', err);
      setIsSmartRecording(false);
    }
  };

  const handleStopSmartRecord = (shouldDownload = true) => {
    if (smartTimerRef.current) clearTimeout(smartTimerRef.current);
    if (smartRecorderRef.current && smartRecorderRef.current.state !== 'inactive') {
      smartRecorderRef.current.stop();
    }
    if (smartStreamRef.current) {
      smartStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsSmartRecording(false);
  };

  // ─── Direct 2K Video Render Engine (Zero Popups, Zero Permissions, Zero Auth) ───

  const handleStart2KExport = async () => {
    if (isExportingVideo || isSmartRecording) return;


    try {
      setIsExportingVideo(true);
      setExportProgress(5);
      setExportStatusText('تهيئة محرك التصدير بدقة 2K (1440p 60FPS)...');

      // Create an ultra-high-definition 2K canvas
      const targetW = selectedResolution.width;
      const targetH = selectedResolution.height;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = targetW;
      exportCanvas.height = targetH;
      const ctx = exportCanvas.getContext('2d', { alpha: false });

      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      // Prepare Canvas Capture Stream (60 FPS)
      const canvasStream = exportCanvas.captureStream(60);

      // Connect Web Audio Destination stream if available
      const audioStream = audioSynth.getDestinationStream();
      const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

      if (audioStream && audioStream.getAudioTracks().length > 0) {
        combinedTracks.push(...audioStream.getAudioTracks());
      }

      const unifiedStream = new MediaStream(combinedTracks);

      // Determine optimal mimeType
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const selectedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

      // 30 Mbps Ultra 2K Bitrate
      const recorder = new MediaRecorder(unifiedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 30000000,
        audioBitsPerSecond: 192000,
      });

      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setExportStatusText('تم الانتهاء! جاري حفظ ملف الفيديو...');
        setExportProgress(100);

        const blob = new Blob(recordedChunksRef.current, { type: selectedMime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = selectedMime.includes('mp4') ? 'mp4' : 'webm';
        a.download = `UpStore-2K-Ad-${activePreset.id}-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setTimeout(() => {
          setIsExportingVideo(false);
          setExportProgress(0);
          setExportStatusText('');
        }, 1500);
      };

      recorder.start(100); // chunk every 100ms
      mediaRecorderRef.current = recorder;

      // Start fresh playback from 0
      setPhoneKey((k) => k + 1);
      goToStage(0);
      startTimeRef.current = Date.now();

      if (audioRef.current) {
        audioRef.current.playbackRate = speedMultiplier;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      const totalMs = cycleDuration;
      const startTime = performance.now();

      // High-performance render loop for 2K frames
      const renderExportFrame = () => {
        const elapsed = performance.now() - startTime;
        const pct = Math.min(100, Math.round((elapsed / totalMs) * 100));
        setExportProgress(pct);
        setExportSecondsLeft(Math.max(0, Math.ceil((totalMs - elapsed) / 1000)));
        setExportStatusText(`جاري تسجيل وتوليد الفيديو بدقة 2K (${pct}%)...`);

        // Render Background Gradient
        const bgGrad = ctx.createRadialGradient(
          targetW / 2,
          targetH / 2,
          100,
          targetW / 2,
          targetH / 2,
          targetH / 1.2
        );
        bgGrad.addColorStop(0, '#0F0F17');
        bgGrad.addColorStop(1, '#050508');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, targetW, targetH);

        // Render Cyber Accent Glow
        ctx.save();
        const glowGrad = ctx.createRadialGradient(
          targetW / 2,
          targetH * 0.4,
          0,
          targetW / 2,
          targetH * 0.4,
          targetW * 0.6
        );
        glowGrad.addColorStop(0, `${activePreset.brandColor}33`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.restore();

        // Render Phone & Content Frame
        const phoneW = targetW * 0.84;
        const phoneH = phoneW * 2.05;
        const phoneX = (targetW - phoneW) / 2;
        const phoneY = (targetH - phoneH) / 2;

        // Outer Shadow
        ctx.save();
        ctx.shadowColor = activePreset.accentColor;
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 12;
        ctx.shadowOffsetY = 12;
        ctx.fillStyle = '#16161E';
        ctx.beginPath();
        ctx.roundRect(phoneX, phoneY, phoneW, phoneH, 50);
        ctx.fill();
        ctx.restore();

        // Phone Screen Inner White
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(phoneX + 12, phoneY + 12, phoneW - 24, phoneH - 24, 42);
        ctx.fill();
        ctx.restore();

        // Punch hole / Dynamic Island
        ctx.save();
        ctx.fillStyle = '#000000';
        if (deviceType === 'iphone-16-pro') {
          ctx.beginPath();
          ctx.roundRect(targetW / 2 - 90, phoneY + 28, 180, 44, 22);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(targetW / 2, phoneY + 40, 16, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Render Active Caption Banner on Canvas
        ctx.save();
        const capBoxW = phoneW - 60;
        const capBoxH = 80;
        const capBoxX = (targetW - capBoxW) / 2;
        const capBoxY = phoneY + 90;

        ctx.fillStyle = '#000000';
        ctx.shadowColor = '#FFE600';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.roundRect(capBoxX, capBoxY, capBoxW, capBoxH, 20);
        ctx.fill();

        ctx.fillStyle = '#FFE600';
        ctx.font = 'bold 32px Cairo, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentCaptionText, targetW / 2, capBoxY + capBoxH / 2);
        ctx.restore();

        // Render Stage-Specific Graphics
        ctx.save();
        const cardW = phoneW - 70;
        const cardX = (targetW - cardW) / 2;
        const cardY = phoneY + 200;

        if (stage === 0) {
          // Hook notification
          ctx.fillStyle = '#FFE600';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.roundRect(cardX, cardY + 120, cardW, 260, 32);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 36px Cairo, Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`تنبيه خصم ${activePreset.discountPct}% عاجل!`, targetW / 2, cardY + 200);
          ctx.font = 'bold 28px Cairo, Arial, sans-serif';
          ctx.fillText(`${activePreset.name} — فقط ${activePreset.offerPrice} ${activePreset.currency}`, targetW / 2, cardY + 260);
          ctx.font = 'bold 24px Cairo, Arial, sans-serif';
          ctx.fillText('اضغط للشراء الفوري والضمان الشامل', targetW / 2, cardY + 320);
        } else if (stage === 1) {
          // Storefront Card
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.roundRect(cardX, cardY + 50, cardW, 460, 36);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 44px Cairo, Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(activePreset.name, targetW / 2, cardY + 140);

          ctx.fillStyle = '#888888';
          ctx.font = 'bold 26px Cairo, Arial, sans-serif';
          ctx.fillText(`السعر الأصلي: ${activePreset.originalPrice} ${activePreset.currency}`, targetW / 2, cardY + 210);

          // Big Price Badge
          ctx.fillStyle = '#06D6A0';
          ctx.beginPath();
          ctx.roundRect(cardX + 40, cardY + 250, cardW - 80, 110, 24);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = 'black 54px Cairo, Arial, sans-serif';
          ctx.fillText(`${activePreset.offerPrice} ${activePreset.currency} فقط!`, targetW / 2, cardY + 320);

          // Action Button
          ctx.fillStyle = '#FFE600';
          ctx.beginPath();
          ctx.roundRect(cardX + 30, cardY + 390, cardW - 60, 90, 24);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 32px Cairo, Arial, sans-serif';
          ctx.fillText('شراء وتفعيل فوري الآن', targetW / 2, cardY + 445);
        } else if (stage === 2) {
          // 1-Tap Pay
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.roundRect(cardX, cardY + 80, cardW, 400, 36);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 40px Cairo, Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('دفع فوري بضغطة واحدة', targetW / 2, cardY + 170);

          ctx.fillStyle = '#06D6A0';
          ctx.beginPath();
          ctx.roundRect(cardX + 30, cardY + 320, cardW - 60, 90, 24);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 34px Cairo, Arial, sans-serif';
          ctx.fillText(`تأكيد ودفع ${activePreset.offerPrice} ${activePreset.currency}`, targetW / 2, cardY + 375);
        } else {
          // Success
          ctx.fillStyle = '#06D6A0';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.roundRect(cardX, cardY + 40, cardW, 100, 24);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 36px Cairo, Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('تم الدفع والتفعيل بنجاح!', targetW / 2, cardY + 102);

          // Delivery card
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(cardX, cardY + 160, cardW, 360, 32);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 32px Cairo, Arial, sans-serif';
          ctx.fillText('رابط التفعيل المباشر:', targetW / 2, cardY + 230);

          ctx.fillStyle = '#111118';
          ctx.beginPath();
          ctx.roundRect(cardX + 20, cardY + 270, cardW - 40, 70, 16);
          ctx.fill();

          ctx.fillStyle = '#06D6A0';
          ctx.font = 'bold 22px monospace';
          ctx.fillText(activePreset.shortDisplayUrl, targetW / 2, cardY + 312);

          ctx.fillStyle = '#FFE600';
          ctx.beginPath();
          ctx.roundRect(cardX + 30, cardY + 370, cardW - 60, 80, 20);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 30px Cairo, Arial, sans-serif';
          ctx.fillText('تفعيل الحساب فوراً في المنصة', targetW / 2, cardY + 420);
        }
        ctx.restore();

        // Render UpStore Watermark
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 26px Cairo, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('UpStore.one • World’s Lowest-Priced Digital Marketplace', targetW / 2, targetH - 60);
        ctx.restore();

        if (elapsed < totalMs && recorder.state === 'recording') {
          requestAnimationFrame(renderExportFrame);
        } else if (recorder.state === 'recording') {
          recorder.stop();
        }
      };

      requestAnimationFrame(renderExportFrame);
    } catch (err) {
      console.error('2K Video Export Error:', err);
      alert('حدث خطأ أثناء تصدير الفيديو. جاري التحويل للمسجل المباشر.');
      setIsExportingVideo(false);
    }
  };

  // ─── 2K PNG Snapshot Poster Generator ─────────────────────────────────────────

  const handleDownload2KPoster = () => {
    try {
      const targetW = selectedResolution.width;
      const targetH = selectedResolution.height;

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background
      const bgGrad = ctx.createLinearGradient(0, 0, targetW, targetH);
      bgGrad.addColorStop(0, '#0E0E15');
      bgGrad.addColorStop(1, '#050508');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, targetW, targetH);

      // Card
      const phoneW = targetW * 0.86;
      const phoneH = phoneW * 1.85;
      const phoneX = (targetW - phoneW) / 2;
      const phoneY = (targetH - phoneH) / 2;

      ctx.fillStyle = '#FFE600';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 14;
      ctx.shadowOffsetY = 14;
      ctx.beginPath();
      ctx.roundRect(phoneX, phoneY, phoneW, phoneH, 44);
      ctx.fill();

      // Inner White Content
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(phoneX + 16, phoneY + 16, phoneW - 32, phoneH - 32, 36);
      ctx.fill();

      // Title & Offer
      ctx.fillStyle = '#000000';
      ctx.font = 'black 54px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(activePreset.name, targetW / 2, phoneY + 140);

      ctx.fillStyle = '#FF0055';
      ctx.font = 'bold 36px Cairo, sans-serif';
      ctx.fillText(`خصم ${activePreset.discountPct}% لفترة محدودة`, targetW / 2, phoneY + 220);

      // Price Tag
      ctx.fillStyle = '#06D6A0';
      ctx.beginPath();
      ctx.roundRect(phoneX + 50, phoneY + 280, phoneW - 100, 140, 28);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = 'black 72px Cairo, sans-serif';
      ctx.fillText(`${activePreset.offerPrice} ${activePreset.currency}`, targetW / 2, phoneY + 375);

      ctx.fillStyle = '#555555';
      ctx.font = 'bold 28px Cairo, sans-serif';
      ctx.fillText(`بدلاً من ${activePreset.originalPrice} ${activePreset.currency}`, targetW / 2, phoneY + 480);

      // Footer
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 32px Cairo, sans-serif';
      ctx.fillText('تسليم وتفعيل فوري على بريدك الشخصي', targetW / 2, phoneY + 560);
      ctx.fillText('UpStore.one', targetW / 2, targetH - 80);

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `UpStore-2K-Poster-${activePreset.id}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-white font-sans flex flex-col items-center justify-between p-2 sm:p-4 md:p-6 select-none overflow-x-hidden selection:bg-[#FFE600] selection:text-black">
      
      {/* ── Background Cyber Ambient Glow & Grid ── */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#FFE600 1.5px, transparent 1.5px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none opacity-25"
        style={{
          background: `radial-gradient(circle, ${activePreset.brandColor} 0%, ${activePreset.accentColor} 60%, transparent 80%)`,
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          SMART RECORDING ACTIVE HUD (Floating Top Cinema Controller)
          ═══════════════════════════════════════════════════════════════════════ */}
      {isSmartRecording && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/95 text-white border-4 border-[#FFE600] shadow-[0px_0px_35px_rgba(255,230,0,0.5)] px-6 py-3 rounded-2xl z-50 flex items-center gap-4 animate-pulse">
          <div className="flex items-center gap-2.5 font-black text-sm">
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 animate-ping" />
            <span className="text-[#FFE600]">جاري تسجيل فيديو MP4 بدقة 2K 60FPS</span>
            <span className="text-white/80 text-xs">| المتبقي: {smartRecordSecondsLeft} ثانية</span>
          </div>
          <button
            onClick={() => handleStopSmartRecord(true)}
            className="px-4 py-1.5 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-xs rounded-xl border-2 border-black cursor-pointer shadow-md active:scale-95 transition-all"
          >
            إنهاء وتنزيل MP4 الآن
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TOP MASTER CONTROL DECK (Studio Pro Toolbar)
          ═══════════════════════════════════════════════════════════════════════ */}
      <header className={`w-full max-w-5xl mb-4 z-40 flex flex-col gap-2.5 transition-all duration-300 ${isSmartRecording ? 'hidden' : ''}`}>
        
        {/* Upper Action Strip */}
        <div className="w-full px-4 py-3 bg-[#12121B]/95 backdrop-blur-xl border-2 border-white/15 rounded-2xl shadow-[6px_6px_0px_#000000] flex flex-wrap items-center justify-between gap-3 text-white">

          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black font-black shadow-[2px_2px_0px_#000]">
              <Zap className="w-5 h-5 fill-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#FFE600] tracking-wide">
                  UpStore 2K Ad Studio
                </span>
                <span className="px-2 py-0.5 bg-[#06D6A0] text-black font-black text-[10px] rounded-md border border-black shadow-[1px_1px_0px_#000]">
                  PRO 2K
                </span>
              </div>
              <span className="text-[11px] font-bold text-neutral-400 block">
                تصدير إعلانات فيديو احترافية تصل لدقة 2K فورياً وبدون تسجيل
              </span>
            </div>
          </div>

          {/* Core Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Resolution Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedResolution.id}
                onChange={(e) => {
                  const res = RESOLUTION_PRESETS.find((r) => r.id === e.target.value);
                  if (res) setSelectedResolution(res);
                }}
                className="px-3 py-2 bg-[#1A1A27] hover:bg-[#232335] text-white border-2 border-white/20 rounded-xl text-xs font-black appearance-none pr-7 cursor-pointer transition-all shadow-[2px_2px_0px_#000] focus:outline-none focus:border-[#FFE600]"
              >
                {RESOLUTION_PRESETS.map((res) => (
                  <option key={res.id} value={res.id}>
                    {res.name} {res.is2K ? '(2K Ultra)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Smart Auto-Pilot Screen/Tab Recording MP4 Button (PRIMARY & RECOMMENDED) */}
            <button
              onClick={handleStartSmartRecord}
              disabled={isSmartRecording || isExportingVideo}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border-2 border-black shadow-[4px_4px_0px_#FFE600] active:translate-y-0.5 transition-all cursor-pointer ${
                isSmartRecording
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-[#FFE600] hover:bg-[#ffd900] text-black ring-2 ring-[#FFE600]/40'
              }`}
              title="تسجيل ذكي تلقائي للشاشة وحفظ MP4 فوري بدون تقطيع وبأعلى جودة"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span>
                {isSmartRecording
                  ? `جاري التسجيل (${smartRecordSecondsLeft}s)`
                  : 'تسجيل ذكي تلقائي MP4 (2K)'}
              </span>
            </button>

            {/* Direct 2K Export Video Button (Internal Canvas Fallback) */}
            <button
              onClick={handleStart2KExport}
              disabled={isExportingVideo || isSmartRecording}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer ${
                isExportingVideo
                  ? 'bg-amber-400 text-black animate-pulse'
                  : 'bg-[#06D6A0] hover:bg-[#05B385] text-black'
              }`}
              title="تصدير داخلي مباشر بدون نافذة متصفح"
            >
              <Video className="w-3.5 h-3.5 text-black" />
              <span>
                {isExportingVideo
                  ? `جاري التصدير (${exportSecondsLeft}s)`
                  : 'تصدير داخلي'}
              </span>
            </button>

            {/* 2K PNG Poster Button */}
            <button
              onClick={handleDownload2KPoster}
              className="px-3 py-2 bg-white hover:bg-neutral-100 text-black border-2 border-black rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
              title="التقاط صورة بوستر 2K عالي الدقة"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>بوستر 2K</span>
            </button>

            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-white hover:bg-[#FFE600] text-black border-2 border-black rounded-xl text-xs font-bold transition-all shadow-[2px_2px_0px_#000] cursor-pointer"
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >

              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-black" />}
            </button>

            {/* Restart */}
            <button
              onClick={() => {
                setPhoneKey((k) => k + 1);
                goToStage(0);
                startTimeRef.current = Date.now();
              }}
              className="p-2 bg-white hover:bg-[#FFE600] text-black border-2 border-black rounded-xl text-xs font-bold transition-all shadow-[2px_2px_0px_#000] cursor-pointer"
              title="إعادة تشغيل من البداية"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => setAudioMuted(!audioMuted)}
              className={`p-2 border-2 border-black rounded-xl text-xs font-bold transition-all shadow-[2px_2px_0px_#000] cursor-pointer ${
                !audioMuted ? 'bg-[#FFE600] text-black' : 'bg-neutral-800 text-neutral-400'
              }`}
              title={audioMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            >
              {!audioMuted ? <Volume2 className="w-4 h-4 text-black" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Speed Multiplier */}
            <button
              onClick={() =>
                setSpeedMultiplier(
                  speedMultiplier === 1
                    ? 1.25
                    : speedMultiplier === 1.25
                    ? 1.5
                    : speedMultiplier === 1.5
                    ? 2
                    : 1
                )
              }
              className="px-2.5 py-2 bg-[#FFE600] text-black border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0px_#000] cursor-pointer"
              title="سرعة العرض والتسجيل"
            >
              {speedMultiplier}x
            </button>
          </div>
        </div>

        {/* Lower Selector Strip: Presets, Device Switcher, & Customizer */}
        <div className="w-full px-3 py-2 bg-[#12121B]/90 backdrop-blur-md border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
          
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[11px] font-black text-neutral-400 pl-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FFE600]" />
              المنتج:
            </span>
            {PRODUCT_PRESETS.map((preset) => {
              const isActive = activePreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setActivePreset(preset);
                    setPhoneKey((k) => k + 1);
                    goToStage(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all border cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#FFE600] text-black border-black shadow-[2px_2px_0px_#000]'
                      : 'bg-[#181824] hover:bg-[#202030] text-neutral-300 border-white/10'
                  }`}
                >
                  <ProductBrandIcon type={preset.iconType} className="w-3.5 h-3.5" />
                  <span>{preset.name}</span>
                </button>
              );
            })}

            {/* Custom Ad Creator Button */}
            <button
              onClick={() => setIsCustomModalOpen(true)}
              className="px-3 py-1.5 rounded-xl font-black text-xs transition-all border cursor-pointer flex items-center gap-1.5 bg-[#06D6A0] hover:bg-[#05b385] text-black border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5"
            >
              <Settings2 className="w-3.5 h-3.5 text-black" />
              <span>+ تخصيص إعلانك (Custom)</span>
            </button>
          </div>


          {/* Device Mockup Switcher */}
          <div className="flex items-center gap-1.5 bg-[#181824] p-1 rounded-xl border border-white/10">
            <span className="text-[10px] font-black text-neutral-400 px-1">الهيكل:</span>
            {[
              { id: 's24-ultra', label: 'S24 Ultra' },
              { id: 'iphone-16-pro', label: 'iPhone 16 Pro' },
              { id: 'reels-story', label: 'Reels / TikTok' },
              { id: 'neubrutalist', label: 'Cyber Card' },
            ].map((dev) => (
              <button
                key={dev.id}
                onClick={() => setDeviceType(dev.id as DeviceType)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  deviceType === dev.id
                    ? 'bg-[#06D6A0] text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {dev.label}
              </button>
            ))}
          </div>

          {/* Cursor Choreography Toggle */}
          <div className="flex items-center gap-1 bg-[#181824] p-1 rounded-xl border border-white/10">
            <span className="text-[10px] font-black text-neutral-400 px-1">المؤشر:</span>
            {[
              { id: 'cyber', label: 'ذكي' },
              { id: 'ripple', label: 'لمس' },
              { id: 'hidden', label: 'مخفي' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setCursorMode(m.id as any)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                  cursorMode === m.id
                    ? 'bg-[#FFE600] text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

        </div>

      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          EXPORT PROGRESS OVERLAY (When Rendering 2K Video)
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isExportingVideo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-xl mb-4 p-4 bg-[#FFE600] border-4 border-black rounded-2xl shadow-[6px_6px_0px_#000] text-black z-50 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between font-black text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                <span>{exportStatusText}</span>
              </div>
              <span>{exportProgress}%</span>
            </div>

            <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden border border-black">
              <div
                className="h-full bg-black transition-all duration-100 ease-linear"
                style={{ width: `${exportProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-black/80">
              <span>الدقة: 2K Ultra HD (1440x2560) • 60 FPS • بدون أذونات</span>
              <span>المتبقي: {exportSecondsLeft} ثانية</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          THE MAIN REALISTIC DEVICE CANVAS & AD VIEWPORT
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative flex items-center justify-center w-full my-auto py-2">
        
        {/* Device Frame */}
        <motion.div
          key={`device-viewport-${phoneKey}-${deviceType}`}
          initial={{ y: 280, rotate: -4, scale: 0.88, opacity: 0 }}
          animate={{ y: 0, rotate: 0, scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 150,
            mass: 1.0,
          }}
          ref={phoneRef}
          className={`relative w-full max-w-[400px] aspect-[9/19] max-h-[88vh] bg-[#FFFFFF] overflow-hidden flex flex-col justify-between select-none z-20 transition-all ${
            deviceType === 'iphone-16-pro'
              ? 'rounded-[50px] border-[6px] border-[#2C2C32] shadow-[0px_0px_0px_2px_#60606B,0_20px_50px_rgba(0,0,0,0.8),8px_8px_0px_0px_#FFE600]'
              : deviceType === 'reels-story'
              ? 'rounded-[30px] border-[4px] border-black shadow-[0_20px_40px_rgba(0,0,0,0.9),8px_8px_0px_0px_#06D6A0]'
              : deviceType === 'neubrutalist'
              ? 'rounded-3xl border-[5px] border-black shadow-[10px_10px_0px_0px_#FFE600,10px_10px_0px_3px_#000000]'
              : 'rounded-[36px] border-[5px] border-[#181822] shadow-[0px_0px_0px_2px_#343444,10px_10px_0px_0px_#FFE600,10px_10px_0px_3px_#000000]'
          }`}
        >

          {/* ── TOP NOTCH / PUNCH HOLE / DYNAMIC ISLAND ── */}
          {deviceType === 'iphone-16-pro' ? (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-2.5 text-[9px] text-white pointer-events-none shadow-md">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#06D6A0] animate-pulse" />
                <span className="font-bold">UpStore</span>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="w-0.5 h-2 bg-[#FFE600] animate-bounce" />
                <div className="w-0.5 h-3 bg-[#FFE600] animate-bounce delay-75" />
                <div className="w-0.5 h-2.5 bg-[#FFE600] animate-bounce delay-150" />
              </div>
            </div>
          ) : (
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-black ring-1 ring-zinc-700 z-50 flex items-center justify-center pointer-events-none">
              <div className="w-1 h-1 rounded-full bg-[#1A73E8]/80 shadow-[0_0_4px_#1A73E8]" />
            </div>
          )}

          {/* Dynamic Story Progress Bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-black/10 z-50 flex">
            <div
              className="h-full bg-gradient-to-r from-[#FFE600] via-[#06D6A0] to-[#FFE600] transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* ── STATUS BAR ── */}
          <div className="pt-2 px-5 pb-1 flex items-center justify-between text-[11px] font-black text-black z-40 bg-transparent">
            <div className="flex items-center gap-1.5">
              <span>04:20</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#06D6A0]" />
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="font-mono">5G</span>
              <Wifi className="w-3 h-3 text-black stroke-[2.5]" />
              <div className="w-4 h-2.5 border-2 border-black rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-black" />
              </div>
            </div>
          </div>

          {/* ── KINETIC SUBTITLE BADGE ── */}
          <div className="px-3 z-40">
            <motion.div
              key={currentCaptionText}
              initial={{ opacity: 0, scale: 0.94, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full py-2 px-3 bg-black border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#FFE600] flex items-center justify-center text-center text-white"
            >
              <span className="text-sm font-black tracking-wide text-[#FFE600]">
                {currentCaptionText}
              </span>
            </motion.div>
          </div>

          {/* ── MAIN STAGE SCENES ── */}
          <div className="relative flex-1 p-3 flex flex-col justify-center items-center overflow-hidden">
            
            {/* ═════════════════════════════════════════════════════════════════
                SCENE 0: REALISTIC LOCKSCREEN HOOK NOTIFICATION (0.0s - 2.4s)
                ═════════════════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
              {stage === 0 && (
                <motion.div
                  key="stage-0"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.04, y: -15 }}
                  transition={{ duration: 0.22 }}
                  className="w-full flex flex-col items-center justify-between my-auto gap-3.5"
                >
                  {/* Top Lockscreen Clock */}
                  <div className="text-center pt-1">
                    <span className="text-5xl font-black text-black tracking-tighter block font-display leading-none">
                      04:20
                    </span>
                    <span className="text-xs font-bold text-neutral-600 block mt-1">
                      الجمعة، 21 أغسطس • UpStore 5G
                    </span>
                  </div>

                  {/* Push Notification Card */}
                  <motion.div
                    initial={{ y: -35, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 16, stiffness: 160, delay: 0.1 }}
                    className="w-full bg-[#FFE600] border-[3px] border-black rounded-3xl p-4 shadow-[6px_6px_0px_0px_#000] flex flex-col gap-2.5 cursor-pointer active:scale-95 transition-transform"
                    onClick={() => goToStage(1)}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-black flex items-center justify-center text-white">
                          <Zap className="w-4 h-4 text-[#FFE600] fill-[#FFE600]" />
                        </div>
                        <span className="text-xs font-black text-black">
                          UpStore • تنبيه خصم فوري {activePreset.discountPct}%
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-black/70">الآن</span>
                    </div>

                    {/* Body */}
                    <div>
                      <h3 className="text-base font-black text-black leading-snug">
                        عرض حصري: {activePreset.name} بـ {activePreset.offerPrice} {activePreset.currency}!
                      </h3>
                      <p className="text-xs font-bold text-black/80 mt-0.5">
                        {activePreset.badge} • تفعيل رسمي وضمان شامل
                      </p>
                    </div>

                    {/* Action Pill */}
                    <div className="w-full py-2 bg-black text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#fff]">
                      <span>اضغط للشراء الفوري</span>
                      <ChevronRight className="w-4 h-4 text-[#FFE600]" />
                    </div>
                  </motion.div>

                  {/* Swipe Up Guide */}
                  <div className="flex flex-col items-center gap-1 opacity-70 pb-1">
                    <div className="w-12 h-1 bg-black/30 rounded-full animate-bounce" />
                    <span className="text-[10px] font-black text-neutral-400">انقر أو اسحب لفتح المتجر</span>
                  </div>
                </motion.div>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  SCENE 1: UPSTORE STOREFRONT PRODUCT CARD (2.4s - 6.2s)
                  ═════════════════════════════════════════════════════════════ */}
              {stage === 1 && (
                <motion.div
                  key="stage-1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="w-full flex flex-col gap-2.5 my-auto"
                >
                  {/* UpStore Header */}
                  <div className="w-full bg-white border-2 border-black rounded-2xl p-2 shadow-[3px_3px_0px_#000] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-[#FFE600] border border-black flex items-center justify-center">
                        <Zap className="w-4 h-4 text-black fill-black" />
                      </div>
                      <span className="font-black text-sm text-black font-display">UpStore.one</span>
                    </div>
                    <span className="px-2 py-0.5 bg-[#06D6A0] border border-black rounded-lg text-[10px] font-black text-black">
                      باقي {activePreset.stockLeft} اشتراكات فقط
                    </span>
                  </div>

                  {/* Neubrutalism Mega Product Card */}
                  <div className="w-full bg-white border-[3px] border-black rounded-3xl p-4 shadow-[6px_6px_0px_0px_#000] flex flex-col gap-3">
                    
                    {/* Badges */}
                    <div className="flex items-center justify-between">
                      <span className="bg-[#FFE600] border-2 border-black px-3 py-1 rounded-xl font-black text-xs text-black shadow-[2px_2px_0px_#000]">
                        {activePreset.badge}
                      </span>
                      <span className="bg-black text-white border-2 border-black px-3 py-1 rounded-xl font-black text-xs shadow-[2px_2px_0px_#FFE600]">
                        خصم {activePreset.discountPct}%
                      </span>
                    </div>

                    {/* Title & Brand Icon */}
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-neutral-100 border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center shrink-0">
                        <ProductBrandIcon type={activePreset.iconType} className="w-9 h-9" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-black tracking-tight leading-tight">
                          {activePreset.name}
                        </h2>
                        <p className="text-xs font-bold text-neutral-500 mt-0.5">
                          {activePreset.deliveryTime}
                        </p>
                      </div>
                    </div>

                    {/* Price Banner */}
                    <div className="bg-[#FFFDF9] border-[3px] border-black rounded-2xl p-3 flex items-center justify-between shadow-[3px_3px_0px_#000]">
                      <div>
                        <span className="text-xs text-neutral-400 font-bold block line-through">
                          السعر الأصلي: {activePreset.originalPrice} {activePreset.currency}
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-3xl font-black text-black">{activePreset.offerPrice}</span>
                          <span className="text-sm font-black text-black">{activePreset.currency} فقط</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-[#06D6A0] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_#000]">
                        دفع عالمي وضمان
                      </span>
                    </div>

                    {/* Buy Button */}
                    <button
                      onClick={() => goToStage(2)}
                      className="w-full py-3.5 bg-[#06D6A0] hover:bg-[#05B385] text-black font-black text-sm border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_#000] flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      <Zap className="w-4 h-4 fill-black text-black" />
                      <span>شراء وتفعيل مضمون — {activePreset.offerPrice} {activePreset.currency}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  SCENE 2: 1-TAP FAST PAYMENT (6.2s - 8.0s)
                  ═════════════════════════════════════════════════════════════ */}
              {stage === 2 && (
                <motion.div
                  key="stage-2"
                  initial={{ opacity: 0, y: 25, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                  className="w-full bg-white border-[3px] border-black rounded-3xl p-5 shadow-[6px_6px_0px_0px_#000] flex flex-col gap-4 my-auto text-center"
                >
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FFE600] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center">
                    <Zap className="w-7 h-7 text-black fill-black" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-black">
                      دفع فوري بضغطة واحدة
                    </h3>
                    <p className="text-xs font-bold text-neutral-500 mt-1">
                      {activePreset.warranty}
                    </p>
                  </div>

                  <div className="p-3 bg-[#FFFDF9] border-2 border-black rounded-2xl flex items-center justify-between shadow-[2px_2px_0px_#000]">
                    <span className="text-xs font-black text-neutral-600">المبلغ المطلوب:</span>
                    <span className="text-xl font-black text-black bg-[#FFE600] border-2 border-black px-3 py-0.5 rounded-xl shadow-[2px_2px_0px_#000]">
                      {activePreset.offerPrice} {activePreset.currency} فقط
                    </span>
                  </div>

                  <button
                    onClick={() => goToStage(3)}
                    className="w-full py-3.5 bg-[#06D6A0] hover:bg-[#05B385] text-black font-black text-sm border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_#000] flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>تأكيد ودفع ({activePreset.offerPrice} {activePreset.currency}) الآن</span>
                  </button>
                </motion.div>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  SCENE 3: VIP DELIVERY & ACTIVATION (8.0s - 12.4s)
                  ═════════════════════════════════════════════════════════════ */}
              {stage === 3 && (
                <motion.div
                  key="stage-3"
                  initial={{ opacity: 0, scale: 0.92, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="w-full flex flex-col items-center gap-3 my-auto"
                >
                  {/* Success Badge */}
                  <div className="w-full bg-[#06D6A0] border-[3px] border-black rounded-2xl p-3 shadow-[4px_4px_0px_#000] text-center">
                    <span className="text-base font-black text-black flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-6 h-6 fill-black text-[#06D6A0]" />
                      تم الدفع والتفعيل بنجاح!
                    </span>
                  </div>

                  {/* VIP Link Delivery Card */}
                  <div className="w-full bg-white border-[3px] border-black rounded-3xl p-4 shadow-[6px_6px_0px_0px_#000] flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
                      <div className="flex items-center gap-2">
                        <ProductBrandIcon type={activePreset.iconType} className="w-7 h-7" />
                        <div>
                          <span className="text-xs font-black text-black block">{activePreset.name}</span>
                          <span className="text-[10px] text-green-700 font-black">الحالة: مفعل رسمي</span>
                        </div>
                      </div>
                      <span className="text-xs font-black bg-[#FFE600] border-2 border-black px-2.5 py-0.5 rounded-lg shadow-[1px_1px_0px_#000]">
                        {activePreset.offerPrice} {activePreset.currency}
                      </span>
                    </div>

                    {/* Direct Activation URL */}
                    <div className="bg-[#FFFDF9] border-2 border-black rounded-2xl p-3 flex flex-col gap-2.5 shadow-[2px_2px_0px_#000]">
                      <span className="text-xs font-black text-black">
                        رابط التفعيل المباشر من الخدمة:
                      </span>

                      <div className="p-2 bg-neutral-900 text-[#06D6A0] rounded-xl border border-black font-mono text-[10px] truncate font-bold">
                        {activePreset.shortDisplayUrl}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 pt-0.5">
                        <a
                          href={activePreset.activationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 bg-[#FFE600] hover:bg-[#ffd900] text-black font-black text-xs border-[3px] border-black rounded-xl shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 transition-all text-center"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>تفعيل الحساب فوراً</span>
                        </a>

                        <button
                          onClick={handleCopyLink}
                          className="w-full py-2.5 bg-white hover:bg-neutral-100 text-black font-black text-xs border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-4 h-4 text-green-600" />
                              <span className="text-green-700">تم نسخ الرابط بالكامل!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>نسخ الرابط بالكامل</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Official Stamp */}
                    <div className="flex items-center justify-between p-2 bg-[#FFFDF9] border border-black/30 rounded-xl text-[10px] font-black text-neutral-800">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                        {activePreset.warranty}
                      </span>
                      <span className="px-2 py-0.5 bg-black text-white rounded border border-black">
                        UpStore Official
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═════════════════════════════════════════════════════════════
                CHOREOGRAPHED MOUSE CURSOR POINTER
                ═════════════════════════════════════════════════════════════ */}
            {cursorState.visible && cursorMode !== 'hidden' && (
              <motion.div
                animate={{
                  left: `${cursorState.x}%`,
                  top: `${cursorState.y}%`,
                  scale: cursorState.clicking ? 0.82 : 1,
                }}
                transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                className="absolute pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
              >
                {cursorState.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-2.5 py-0.5 bg-black text-white text-[11px] font-black rounded-lg border-2 border-[#FFE600] shadow-[2px_2px_0px_#FFE600] whitespace-nowrap"
                  >
                    {cursorState.label}
                  </motion.div>
                )}

                <div className="relative">
                  {cursorState.clicking && (
                    <div className="absolute -inset-3 rounded-full bg-[#FFE600] opacity-80 animate-ping" />
                  )}
                  {cursorMode === 'ripple' ? (
                    <div className="w-8 h-8 rounded-full border-4 border-[#FFE600] bg-white/40 shadow-lg animate-pulse" />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="w-8 h-8 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] filter"
                    >
                      <path
                        d="M3 3L10.5 21L14 14L21 10.5L3 3Z"
                        fill="#FFE600"
                        stroke="#000000"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </motion.div>
            )}

            {/* Reels / Story UI Overlay Elements */}
            {deviceType === 'reels-story' && (
              <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 text-black z-40">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-md">
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  </div>
                  <span className="text-[10px] font-black mt-0.5">14.8K</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-md">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black mt-0.5">1.2K</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-md">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black mt-0.5">مشاركة</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-black border-2 border-white flex items-center justify-center text-white animate-spin">
                  <Disc className="w-5 h-5 text-[#FFE600]" />
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════
                STAGE 3 CELEBRATION CONFETTI PARTICLES
                ═════════════════════════════════════════════════════════════ */}
            {stage === 3 && (
              <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.div
                    key={`confetti-${i}`}
                    initial={{
                      x: (i * 14) % 320,
                      y: -20,
                      rotate: 0,
                      scale: 0.6 + (i % 3) * 0.3,
                    }}
                    animate={{
                      y: 650,
                      x: `+=${(i % 2 === 0 ? 1 : -1) * 35}`,
                      rotate: 360 * (i % 2 === 0 ? 1 : -1),
                    }}
                    transition={{
                      duration: 2.2 + (i % 4) * 0.4,
                      repeat: Infinity,
                      delay: i * 0.08,
                      ease: 'linear',
                    }}
                    style={{
                      backgroundColor: ['#FFE600', '#06D6A0', '#FF0055', '#1A73E8', '#9B72CB'][i % 5],
                    }}
                    className="absolute w-2.5 h-2.5 rounded-sm shadow-sm"
                  />
                ))}
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════
                LIVE SOCIAL PROOF ACTIVITY TICKER (Bottom Micro-Card)
                ═════════════════════════════════════════════════════════════ */}
            <div className="absolute bottom-3 left-3 right-3 z-40 pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`live-sale-${liveSaleIndex}`}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="bg-black/90 text-white backdrop-blur-md border border-white/20 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold shadow-lg"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#06D6A0] animate-ping" />
                    <span>اشترى {LIVE_SALES[liveSaleIndex].name} ({LIVE_SALES[liveSaleIndex].city})</span>
                  </div>
                  <span className="text-[#FFE600] font-black">{LIVE_SALES[liveSaleIndex].item}</span>
                </motion.div>
              </AnimatePresence>
            </div>

          </div>

          {/* ── BOTTOM GESTURE BAR ── */}
          <div className="py-2.5 px-6 bg-[#FFFFFF] border-t border-black/10 flex items-center justify-center z-40">
            <div className="w-28 h-1 bg-black rounded-full" />
          </div>

        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          INTERACTIVE STAGE TIMELINE NAVIGATION BAR
          ═══════════════════════════════════════════════════════════════════════ */}
      <footer className={`mt-3 w-full max-w-2xl flex flex-wrap items-center justify-center gap-2 z-30 transition-all duration-300 ${isSmartRecording ? 'hidden' : ''}`}>

        {[
          { id: 0, label: '1. هوك الإشعار (0s)', color: '#FFE600' },
          { id: 1, label: `2. عرض ${activePreset.offerPrice} ${activePreset.currency} (2.4s)`, color: '#FFE600' },
          { id: 2, label: '3. دفع فوري 1-Tap (6.2s)', color: '#06D6A0' },
          { id: 3, label: '4. استلام وتفعيل الحساب (8s)', color: '#06D6A0' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => goToStage(s.id as any)}
            style={{
              backgroundColor: stage === s.id ? s.color : '#12121B',
              color: stage === s.id ? '#000000' : '#ffffff',
            }}
            className="px-3.5 py-1.5 border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0px_#000] transition-all active:scale-95 cursor-pointer"
          >
            {s.label}
          </button>
        ))}
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════════
          CUSTOM AD BUILDER MODAL (Full Customization Studio)
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isCustomModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-[#12121B] border-4 border-black rounded-3xl p-6 shadow-[10px_10px_0px_#FFE600] text-white flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black font-black shadow-sm">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#FFE600]">
                      تخصيص إعلان جديد (Custom Ad)
                    </h3>
                    <p className="text-xs text-neutral-400 font-bold">
                      أدخل بيانات المنتج أو الخدمة لتوليد إعلان 2K فورياً
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCustomModalOpen(false)}
                  className="p-1.5 bg-white hover:bg-neutral-200 text-black rounded-xl border-2 border-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-black text-neutral-300 mb-1">اسم المنتج</label>
                  <input
                    type="text"
                    value={customForm.name}
                    onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                    className="w-full p-2.5 bg-[#1C1C2A] border-2 border-white/20 rounded-xl font-bold focus:border-[#FFE600] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black text-neutral-300 mb-1">الشارة الترويجية (Badge)</label>
                  <input
                    type="text"
                    value={customForm.badge}
                    onChange={(e) => setCustomForm({ ...customForm, badge: e.target.value })}
                    className="w-full p-2.5 bg-[#1C1C2A] border-2 border-white/20 rounded-xl font-bold focus:border-[#FFE600] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black text-neutral-300 mb-1">السعر في العرض</label>
                  <input
                    type="number"
                    value={customForm.offerPrice}
                    onChange={(e) => setCustomForm({ ...customForm, offerPrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#1C1C2A] border-2 border-white/20 rounded-xl font-bold focus:border-[#FFE600] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black text-neutral-300 mb-1">السعر الأصلي قبل الخصم</label>
                  <input
                    type="number"
                    value={customForm.originalPrice}
                    onChange={(e) => setCustomForm({ ...customForm, originalPrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#1C1C2A] border-2 border-white/20 rounded-xl font-bold focus:border-[#FFE600] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black text-neutral-300 mb-1">العملة</label>
                  <input
                    type="text"
                    value={customForm.currency}
                    onChange={(e) => setCustomForm({ ...customForm, currency: e.target.value })}
                    className="w-full p-2.5 bg-[#1C1C2A] border-2 border-white/20 rounded-xl font-bold focus:border-[#FFE600] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black text-neutral-300 mb-1">نسبة الخصم (%)</label>
                  <input
                    type="number"
                    value={customForm.discountPct}
                    onChange={(e) => setCustomForm({ ...customForm, discountPct: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#1C1C2A] border-2 border-white/20 rounded-xl font-bold focus:border-[#FFE600] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-black text-neutral-300 mb-1">رابط التفعيل أو الاستلام</label>
                  <input
                    type="text"
                    value={customForm.activationUrl}
                    onChange={(e) =>
                      setCustomForm({
                        ...customForm,
                        activationUrl: e.target.value,
                        shortDisplayUrl: e.target.value.substring(0, 32) + '...',
                      })
                    }
                    className="w-full p-2.5 bg-[#1C1C2A] border-2 border-white/20 rounded-xl font-bold focus:border-[#FFE600] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-black text-neutral-300 mb-1">نص الضمان والمميزات</label>
                  <input
                    type="text"
                    value={customForm.warranty}
                    onChange={(e) => setCustomForm({ ...customForm, warranty: e.target.value })}
                    className="w-full p-2.5 bg-[#1C1C2A] border-2 border-white/20 rounded-xl font-bold focus:border-[#FFE600] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-black text-xs rounded-xl border border-white/20 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    const customPreset: ProductPreset = {
                      id: `custom-${Date.now()}`,
                      name: customForm.name,
                      nameEn: customForm.name,
                      category: customForm.category,
                      badge: customForm.badge,
                      originalPrice: customForm.originalPrice,
                      offerPrice: customForm.offerPrice,
                      currency: customForm.currency,
                      discountPct: customForm.discountPct,
                      stockLeft: customForm.stockLeft,
                      deliveryTime: customForm.deliveryTime,
                      warranty: customForm.warranty,
                      brandColor: customForm.brandColor,
                      accentColor: customForm.accentColor,
                      activationUrl: customForm.activationUrl,
                      shortDisplayUrl: customForm.shortDisplayUrl,
                      iconType: 'custom',
                      subtitles: [
                        { start: 0.0, end: 2.4, text: `عرض حصري على ${customForm.name}`, stage: 0 },
                        { start: 2.4, end: 5.2, text: `${customForm.badge} مع ضمان شامل`, stage: 1 },
                        { start: 5.2, end: 7.0, text: `بـ ${customForm.offerPrice} ${customForm.currency} فقط بدلاً من ${customForm.originalPrice} ${customForm.currency}`, stage: 1 },
                        { start: 7.0, end: 8.8, text: 'دفع فوري بضغطة زر وتفعيل مباشر', stage: 2 },
                        { start: 8.8, end: 12.4, text: 'حصرياً عبر UpStore.one', stage: 3 },
                      ],
                    };
                    setActivePreset(customPreset);
                    setIsCustomModalOpen(false);
                    setPhoneKey((k) => k + 1);
                    goToStage(0);
                  }}
                  className="px-5 py-2 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>تطبيق الإعلان وتوليد الفيديو</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}





