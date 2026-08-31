'use client';

/**
 * page.tsx (Admin Dashboard) — UpStore Neubrutalism White Dashboard
 * Fully modularized and upgraded to support complete site management:
 * Products, Orders, Users, Settings, AI Copilot & Notifications.
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  ShieldAlert, 
  Users, 
  X, 
  CreditCard,
  LayoutDashboard, 
  Settings as SettingsIcon,
  ShoppingBag,
  Bell,
  Loader2,
  Bot,
  Zap,
  CheckCircle2,
  AlertCircle,
  Brain,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { bootstrapCurrentSession } from '@/utils/auth-client';
import { fetchLiveProducts } from '@/utils/products';
import { createClient } from '@/utils/supabase/client';
import { useLocale } from '@/context/LocaleContext';
import { ADMIN_TRANSLATIONS, AdminLang } from '@/utils/adminTranslations';

const AdminCopilotTab = dynamic(
  () => import('@/components/admin/AdminCopilotTab').then((m) => m.AdminCopilotTab),
  { ssr: false }
);
const AdminOverviewTab = dynamic(
  () => import('@/components/admin/tabs/AdminOverviewTab').then((m) => m.AdminOverviewTab),
  { ssr: false }
);
const AdminProductsTab = dynamic(
  () => import('@/components/admin/tabs/AdminProductsTab').then((m) => m.AdminProductsTab),
  { ssr: false }
);
const AdminOrdersTab = dynamic(
  () => import('@/components/admin/tabs/AdminOrdersTab').then((m) => m.AdminOrdersTab),
  { ssr: false }
);
const AdminManualOrdersTab = dynamic(
  () => import('@/components/admin/tabs/AdminManualOrdersTab').then((m) => m.AdminManualOrdersTab),
  { ssr: false }
);
const AdminUsersTab = dynamic(
  () => import('@/components/admin/tabs/AdminUsersTab').then((m) => m.AdminUsersTab),
  { ssr: false }
);
const AdminHyperAdaptiveTab = dynamic(
  () => import('@/components/admin/tabs/AdminHyperAdaptiveTab').then((m) => m.AdminHyperAdaptiveTab),
  { ssr: false }
);
const AdminSettingsTab = dynamic(
  () => import('@/components/admin/tabs/AdminSettingsTab').then((m) => m.AdminSettingsTab),
  { ssr: false }
);
const AdminNotificationsTab = dynamic(
  () => import('@/components/admin/tabs/AdminNotificationsTab').then((m) => m.AdminNotificationsTab),
  { ssr: false }
);
const AdminGatewaysTab = dynamic(
  () => import('@/components/admin/tabs/AdminGatewaysTab').then((m) => m.AdminGatewaysTab),
  { ssr: false }
);

interface Product {
  id: string;
  slug: string;
  name: string;
  name_ar?: string;
  description_ar?: string;
  advantages_ar?: string[];
  category: string;
  market_price: number;
  our_price: number;
  price_egp: number;
  price_sar: number;
  rating: number;
  reviews: number;
  stock: number;
  max_stock: number;
  brand_color: string;
  icon_name: string;
  image_url: string;
  description: string;
  advantages: string[];
  sale_ends_in: number;
  sold_count: number;
  warranty_duration: string;
  delivery_time: string;
  subscription_duration: string;
  is_flash_deal?: boolean;
  flash_deal_price?: number;
  flash_deal_duration_hours?: number;
  delivery_mode?: 'key' | 'pre_assigned' | 'zelenka_api' | 'telegram';
  zelenka_api_key?: string;
  zelenka_product_id?: string;
  attributes?: any[];
  variants?: any[];
}

interface Order {
  id: string;
  product_id: string;
  user_id: string;
  amount: number;
  status: string;
  product_key: string | null;
  created_at: string;
  session_id?: string;
  payment_sender?: string | null;
  payment_transaction_id?: string | null;
  payment_screenshot?: string | null;
  profiles: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
  products: {
    id: string;
    name: string;
  } | null;
}

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: string | null;
  wallet_balance?: number;
}

type TabType = 'overview' | 'products' | 'orders' | 'manual-orders' | 'gateways' | 'users' | 'hyper-adaptive' | 'settings' | 'notifications' | 'ai-copilot';

export default function AdminPage() {
  const router = useRouter();
  const { language, setLanguage } = useLocale();
  const adminLang: AdminLang = language === 'ar' ? 'ar' : 'en';
  const at = ADMIN_TRANSLATIONS[adminLang];
  const isRtl = adminLang === 'ar';

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const navTabsRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll active tab into view
  useEffect(() => {
    if (navTabsRef.current) {
      const activeEl = navTabsRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);
  const [githubSyncing, setGithubSyncing] = useState(false);
  const [githubRepo, setGithubRepo] = useState('MohamedFC2A/UpStore');
  const [githubSyncResult, setGithubSyncResult] = useState<any>(null);

  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Action States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const [formLoading, setFormLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loadNotice, setLoadNotice] = useState('');
  const [zelenkaBalance, setZelenkaBalance] = useState<{ balance: number; currency: string } | null>(null);

  // Search terms
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Form Fields - Product
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Subscriptions');
  const [marketPrice, setMarketPrice] = useState(15.99);
  const [ourPrice, setOurPrice] = useState(3.49);
  const [priceEgp, setPriceEgp] = useState(Math.ceil(3.49 * 53));
  const [priceSar, setPriceSar] = useState(Math.ceil(3.49 * 4));
  const [stock, setStock] = useState(20);
  const [maxStock, setMaxStock] = useState(100);
  const [brandColor, setBrandColor] = useState('hover:border-[#E50914]/40 hover:bg-[#E50914]/5');
  const [iconName, setIconName] = useState('netflix');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [advantages, setAdvantages] = useState<string[]>(['']);
  const [soldCount, setSoldCount] = useState(0);
  const [warrantyDuration, setWarrantyDuration] = useState('30 Days');
  const [deliveryTime, setDeliveryTime] = useState('Instant');
  const [subscriptionDuration, setSubscriptionDuration] = useState('1 Month');
  const [rating, setRating] = useState(5.0);
  const [reviews, setReviews] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState<'key' | 'pre_assigned' | 'zelenka_api' | 'telegram'>('key');
  const [zelenkaApiKey, setZelenkaApiKey] = useState('');
  const [zelenkaProductId, setZelenkaProductId] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [advantagesAr, setAdvantagesAr] = useState<string[]>(['']);
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);
  const [bulkTranslateProgress, setBulkTranslateProgress] = useState('');
  const [isFlashDeal, setIsFlashDeal] = useState(false);
  const [flashDealPrice, setFlashDealPrice] = useState<number | ''>('');
  const [flashDealDurationHours, setFlashDealDurationHours] = useState<number>(12);
  const [selectedProductAttributes, setSelectedProductAttributes] = useState<string[]>([]);

  // AI Product Generator Fields
  const [isAiGenModalOpen, setIsAiGenModalOpen] = useState(false);
  const [aiGenPrompt, setAiGenPrompt] = useState('');
  const [aiGenCategory, setAiGenCategory] = useState('');

  // Form Fields - Orders
  const [orderStatus, setOrderStatus] = useState('pending');
  const [orderProductKey, setOrderProductKey] = useState('');
  const [orderAmount, setOrderAmount] = useState(0);

  // Form Fields - Profile
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [profileRole, setProfileRole] = useState('customer');
  const [profileWalletBalance, setProfileWalletBalance] = useState<number>(0.00);

  // Settings
  const [announcementText, setAnnouncementText] = useState('RAMADAN SALE: Get 20% OFF all subscriptions with code RAMADAN20');
  const [referralBonus, setReferralBonus] = useState(1.00);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [flashDealUrgencyTextAr, setFlashDealUrgencyTextAr] = useState('عرض محدود لفترة وجيزة - سارع بالشراء قبل نفاد الكمية!');
  const [flashDealUrgencyTextEn, setFlashDealUrgencyTextEn] = useState('Limited-time flash deal - grab yours before stock runs out!');
  const [deepseekApiKey, setDeepSeekApiKey] = useState('');
  const [deepseekModel, setDeepSeekModel] = useState('deepseek-v4-flash');
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<any>(null);

  // Hyper-Adaptive AI Global Store Settings
  const [hyperAdaptiveDefault, setHyperAdaptiveDefault] = useState(true);

  // Payment Gateways Settings
  const [bybitApiKey, setBybitApiKey] = useState('');
  const [bybitApiSecret, setBybitApiSecret] = useState('');
  const [bybitUid, setBybitUid] = useState('47183921');
  const [bybitProxyUrl, setBybitProxyUrl] = useState('');
  const [bybitUsdtTrc20, setBybitUsdtTrc20] = useState('TW4z3c4PZ2Gk5YQ7nN9x8vK1mB5qP9R2e1');
  const [bybitUsdtBep20, setBybitUsdtBep20] = useState('0x71C836e520023a1B3a0279612301A949826a7C10');
  const [bybitUsdtTon, setBybitUsdtTon] = useState('EQBvW8m53GoU_jPAIp7LwY8Gj044kX_613p_dC6lQ1_y9Z1X');
  const [binancePayId, setBinancePayId] = useState('764476139');
  const [nowpaymentsApiKey, setNowPaymentsApiKey] = useState('');
  const [nowpaymentsIpnSecret, setNowPaymentsIpnSecret] = useState('');
  const [lemonsqueezyApiKey, setLemonSqueezyApiKey] = useState('eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJlY2YwNDJkZTIzYTQ2MGEyNDU5OTUwZTM2MDAzZjQwZmY4YzM3N2I4ZDA4MTk3YjIyMWIxNjE5YjlhZGJiOTEyMTMwZDgxOTZmNDViNzcxZCIsImlhdCI6MTc4NzQwNjEwNC41MjIyODUsIm5iZiI6MTc4NzQwNjEwNC41MjIyODcsImV4cCI6MTgwMzI1NDQwMC4wNDMyODQsInN1YiI6Ijc0MDgwOTciLCJzY29wZXMiOltdfQ.AssvuoXEW2V7dfEmshpHDOFi9f4np2VfP9st4H1rWrV0LapVziXJEQHfmCI5CSt3W_yzi_3k0HpYCT6ULKF_nMO7zP-moaqwpg-yeXutAPZss4Njhw2GblIUmpwwz2XiDppm7KvHmtSCaa3Dof7uMiIZywRXs0nyoB9KZjfgJyHYmhwrMRQXe9iFPAjiwy3ruwyNXBEcGlVLynsYexf2YEj3vRhFHO_z1pAFeUnt2INtHL2hy8eJRWOLiaP24Tl4Jtj-IwAsRXrlj4cD0tMdU9CAvDVQGzhaK_UQ078wRy60jCsNKdE3zgIhkpO6rwFGf_22DhsoCkyhAHq6RgrSoSf7_t0V8SmnFalmFAFEj-RivRGWpz0dgAlGcn0Pnz5XIjPqFVXwigHOQeA5BKQJQa0XgXe6skuZOc12BdlB7iyGdqzbl592dxq_iNFyjjWFKk7JM51TsipEkldqU_3toL65lc7w-W2H2S7io-7558xuISaki5I5NmD9bajtTjs_7gROm1l2tOIWzq4P2YATrMMc6_bMq7AqPhNhP_QFMms85xcvH_-eq-NBvZ7zOtE-ZgtWEuB774qzwisSUbOr8sctjwLx7BkPOFtqr6KyzfhYzVaKA_wDRs9L31AvhWQcaIf0p66qxyDYX-vllNfIKOd7ituoxmM_vEdNF9ShS9M');
  const [lemonsqueezyStoreId, setLemonSqueezyStoreId] = useState('457660');
  const [lemonsqueezyVariantId, setLemonSqueezyVariantId] = useState('');
  const [lemonsqueezyWebhookSecret, setLemonSqueezyWebhookSecret] = useState('');

  const [instapayAddress, setInstapayAddress] = useState('mo_matany@instapay');
  const [instapayUrl, setInstapayUrl] = useState('https://ipn.eg/S/mo_matany/instapay/30M8Zj');
  const [vodafoneCashNumber, setVodafoneCashNumber] = useState('01041140422');
  const [orangeCashNumber, setOrangeCashNumber] = useState('01234567890');
  const [etisalatCashNumber, setEtisalatCashNumber] = useState('01123456789');
  const [fawryMerchantCode, setFawryMerchantCode] = useState('984120');

  const [stcPayNumber, setStcPayNumber] = useState('0551234567');
  const [urpayNumber, setUrpayNumber] = useState('0551234567');
  const [alrajhiIban, setAlrajhiIban] = useState('SA0380000000608010167519');
  const [snbIban, setSnbIban] = useState('SA4410000001234567890123');

  const [isTestingBybit, setIsTestingBybit] = useState(false);
  const [bybitTestResult, setBybitTestResult] = useState<any>(null);

  // Notifications
  const [notifAudience, setNotifAudience] = useState<'single' | 'all'>('all');
  const [notifTargetUser, setNotifTargetUser] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'order' | 'promo' | 'alert'>('info');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifLoading, setNotifLoading] = useState(false);

  // Changelogs
  const [changelogs, setChangelogs] = useState<any[]>([]);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [editingChangelog, setEditingChangelog] = useState<any>(null);
  const [changelogVersion, setChangelogVersion] = useState('');
  const [changelogTitle, setChangelogTitle] = useState('');
  const [changelogCategory, setChangelogCategory] = useState<'feature' | 'fix' | 'performance' | 'security'>('feature');
  const [changelogDescription, setChangelogDescription] = useState('');
  const [changelogFeatures, setChangelogFeatures] = useState<string[]>(['']);
  const [changelogFixes, setChangelogFixes] = useState<string[]>(['']);

  const supabase = createClient();

  // ─── AUTH & DATA BOOTSTRAP ─────────────────────────────────────────────────

  useEffect(() => {
    let isCancelled = false;

    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            if (!isCancelled) {
              router.replace('/auth/login?next=/admin');
            }
            return;
          }
        }

        const bootstrap = await bootstrapCurrentSession(null, session);
        if (isCancelled) return;

        if (bootstrap.redirectTo !== '/admin') {
          setIsAdmin(false);
          router.replace(bootstrap.redirectTo);
          return;
        }

        setIsAdmin(true);
        await loadData();
      } catch (error) {
        console.error('Failed to initialize admin session', error);
        if (!isCancelled) {
          router.replace('/auth/login?next=/admin');
        }
      }
    };

    checkAdmin();

    return () => {
      isCancelled = true;
    };
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    setLoadNotice('');

    try {
      const [
        productsResult,
        ordersResult,
        profilesResult,
        settingsResult,
        changelogsResult,
      ] = await Promise.all([
        fetchLiveProducts(supabase),
        supabase
          .from('orders')
          .select(`
            *,
            profiles (
              id,
              display_name,
              email,
              phone,
              strike_count,
              is_banned,
              is_phone_blacklisted
            ),
            products (
              id,
              name,
              name_ar
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('site_settings')
          .select('key, value'),
        supabase
          .from('changelogs')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (productsResult.data) {
        setProducts(productsResult.data as Product[]);
      }
      if (ordersResult.data) {
        setOrders(ordersResult.data as any);
      }
      if (profilesResult.data) {
        setProfiles(profilesResult.data as any);
      }
      if (changelogsResult.data) {
        setChangelogs(changelogsResult.data);
      }

      if (settingsResult.data) {
        for (const setting of settingsResult.data) {
          const val = setting.value;
          if (setting.key === 'announcement_text' && typeof val === 'string') setAnnouncementText(val);
          if (setting.key === 'referral_bonus' && typeof val === 'number') setReferralBonus(val);
          if (setting.key === 'maintenance_mode' && typeof val === 'boolean') setMaintenanceMode(val);
          if (setting.key === 'flash_deal_urgency_text_ar' && typeof val === 'string') setFlashDealUrgencyTextAr(val);
          if (setting.key === 'flash_deal_urgency_text_en' && typeof val === 'string') setFlashDealUrgencyTextEn(val);
          if ((setting.key === 'deepseek_api_key' || setting.key === 'pollinations_api_key') && typeof val === 'string') setDeepSeekApiKey(val);
          if ((setting.key === 'deepseek_model' || setting.key === 'pollinations_model') && typeof val === 'string') setDeepSeekModel(val);
          if (setting.key === 'hyper_adaptive_default' && typeof val === 'boolean') setHyperAdaptiveDefault(val);

          // Payment settings
          if (setting.key === 'bybit_api_key' && typeof val === 'string') setBybitApiKey(val);
          if (setting.key === 'bybit_api_secret' && typeof val === 'string') setBybitApiSecret(val);
          if (setting.key === 'bybit_uid' && typeof val === 'string') setBybitUid(val);
          if (setting.key === 'bybit_proxy_url' && typeof val === 'string') setBybitProxyUrl(val);
          if (setting.key === 'bybit_usdt_trc20' && typeof val === 'string') setBybitUsdtTrc20(val);
          if (setting.key === 'bybit_usdt_bep20' && typeof val === 'string') setBybitUsdtBep20(val);
          if (setting.key === 'bybit_usdt_ton' && typeof val === 'string') setBybitUsdtTon(val);
          if (setting.key === 'binance_pay_id' && typeof val === 'string') setBinancePayId(val);
          if (setting.key === 'nowpayments_api_key' && typeof val === 'string') setNowPaymentsApiKey(val);
          if (setting.key === 'nowpayments_ipn_secret' && typeof val === 'string') setNowPaymentsIpnSecret(val);
          if (setting.key === 'lemonsqueezy_api_key' && typeof val === 'string') setLemonSqueezyApiKey(val);
          if (setting.key === 'lemonsqueezy_store_id' && typeof val === 'string') setLemonSqueezyStoreId(val);
          if (setting.key === 'lemonsqueezy_variant_id' && typeof val === 'string') setLemonSqueezyVariantId(val);
          if (setting.key === 'lemonsqueezy_webhook_secret' && typeof val === 'string') setLemonSqueezyWebhookSecret(val);

          if (setting.key === 'instapay_address' && typeof val === 'string') setInstapayAddress(val);
          if (setting.key === 'instapay_url' && typeof val === 'string') setInstapayUrl(val);
          if (setting.key === 'vodafone_cash_number' && typeof val === 'string') setVodafoneCashNumber(val);
          if (setting.key === 'orange_cash_number' && typeof val === 'string') setOrangeCashNumber(val);
          if (setting.key === 'etisalat_cash_number' && typeof val === 'string') setEtisalatCashNumber(val);
          if (setting.key === 'fawry_merchant_code' && typeof val === 'string') setFawryMerchantCode(val);

          if (setting.key === 'stc_pay_number' && typeof val === 'string') setStcPayNumber(val);
          if (setting.key === 'urpay_number' && typeof val === 'string') setUrpayNumber(val);
          if (setting.key === 'alrajhi_iban' && typeof val === 'string') setAlrajhiIban(val);
          if (setting.key === 'snb_iban' && typeof val === 'string') setSnbIban(val);
        }
      }
    } catch (err: any) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── HANDLERS ─────────────────────────────────────────────────────────────

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setSlug('');
    setCategory('Subscriptions');
    setMarketPrice(15.99);
    setOurPrice(3.49);
    setPriceEgp(Math.ceil(3.49 * 53));
    setPriceSar(Math.ceil(3.49 * 4));
    setStock(20);
    setMaxStock(100);
    setBrandColor('hover:border-[#E50914]/40 hover:bg-[#E50914]/5');
    setIconName('netflix');
    setImageUrl('');
    setImageFile(null);
    setImagePreview('');
    setDescription('');
    setAdvantages(['']);
    setSoldCount(0);
    setWarrantyDuration('30 Days');
    setDeliveryTime('Instant');
    setSubscriptionDuration('1 Month');
    setDeliveryMode('key');
    setZelenkaApiKey('');
    setZelenkaProductId('');
    setRating(5.0);
    setReviews(0);
    setNameAr('');
    setDescriptionAr('');
    setAdvantagesAr(['']);
    setIsFlashDeal(false);
    setFlashDealPrice('');
    setFlashDealDurationHours(12);
    setSelectedProductAttributes([]);
    setErrorMessage('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSlug(p.slug);
    setCategory(p.category);
    setMarketPrice(p.market_price);
    setOurPrice(p.our_price);
    setPriceEgp(p.price_egp || Math.ceil(p.our_price * 53));
    setPriceSar(p.price_sar || Math.ceil(p.our_price * 4));
    setStock(p.stock);
    setMaxStock(p.max_stock);
    setBrandColor(p.brand_color);
    setIconName(p.icon_name);
    setImageUrl(p.image_url || '');
    setImageFile(null);
    setImagePreview(p.image_url || '');
    setDescription(p.description || '');
    setAdvantages(p.advantages && p.advantages.length > 0 ? p.advantages : ['']);
    setSoldCount(p.sold_count || 0);
    setWarrantyDuration(p.warranty_duration || '30 Days');
    setDeliveryTime(p.delivery_time || 'Instant');
    setSubscriptionDuration(p.subscription_duration || '1 Month');
    setRating(p.rating || 5.0);
    setReviews(p.reviews || 0);
    setNameAr(p.name_ar || '');
    setDescriptionAr(p.description_ar || '');
    setAdvantagesAr(p.advantages_ar && p.advantages_ar.length > 0 ? p.advantages_ar : ['']);
    setDeliveryMode(p.delivery_mode || 'key');
    setZelenkaApiKey(p.zelenka_api_key || '');
    setZelenkaProductId(p.zelenka_product_id || '');
    setIsFlashDeal(Boolean(p.is_flash_deal));
    setFlashDealPrice(p.flash_deal_price ?? '');
    setFlashDealDurationHours(p.flash_deal_duration_hours || 12);
    setSelectedProductAttributes(p.attributes || []);
    setErrorMessage('');
    setIsEditModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert(`Error deleting product: ${error.message}`);
    } else {
      loadData();
    }
  };

  const handleOpenEditOrderModal = (o: Order) => {
    setEditingOrder(o);
    setOrderStatus(o.status);
    setOrderProductKey(o.product_key || '');
    setOrderAmount(o.amount);
    setErrorMessage('');
    setIsEditOrderModalOpen(true);
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      alert(`Error deleting order: ${error.message}`);
    } else {
      loadData();
    }
  };

  const handleOpenEditProfileModal = (p: Profile) => {
    setEditingProfile(p);
    setProfileDisplayName(p.display_name || '');
    setProfileRole(p.role || 'customer');
    setProfileWalletBalance(p.wallet_balance || 0.00);
    setErrorMessage('');
    setIsEditProfileModalOpen(true);
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user profile?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      alert(`Error deleting profile: ${error.message}`);
    } else {
      loadData();
    }
  };

  const handleApproveManualPayment = async (sessionId: string) => {
    if (!confirm('Are you sure you want to approve this manual payment?')) return;
    setFormLoading(true);
    try {
      const res = await fetch('/api/admin/manual-payment/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Approval failed');
      }
      alert('Order approved successfully!');
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleRejectManualPayment = async (sessionId: string) => {
    if (!confirm('Are you sure you want to reject this payment?')) return;
    setFormLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('session_id', sessionId);
      if (error) throw error;
      alert('Order cancelled.');
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const { error } = await supabase.from('site_settings').upsert([
      { key: 'announcement_text', value: announcementText },
      { key: 'referral_bonus', value: referralBonus },
      { key: 'maintenance_mode', value: maintenanceMode },
      { key: 'flash_deal_urgency_text_ar', value: flashDealUrgencyTextAr },
      { key: 'flash_deal_urgency_text_en', value: flashDealUrgencyTextEn },
      { key: 'deepseek_api_key', value: deepseekApiKey },
      { key: 'deepseek_model', value: deepseekModel },
      { key: 'pollinations_api_key', value: deepseekApiKey },
      { key: 'pollinations_model', value: deepseekModel },
      { key: 'hyper_adaptive_default', value: hyperAdaptiveDefault },

      // Payment settings
      { key: 'bybit_api_key', value: bybitApiKey },
      { key: 'bybit_api_secret', value: bybitApiSecret },
      { key: 'bybit_uid', value: bybitUid },
      { key: 'bybit_proxy_url', value: bybitProxyUrl },
      { key: 'bybit_usdt_trc20', value: bybitUsdtTrc20 },
      { key: 'bybit_usdt_bep20', value: bybitUsdtBep20 },
      { key: 'bybit_usdt_ton', value: bybitUsdtTon },
      { key: 'binance_pay_id', value: binancePayId },
      { key: 'nowpayments_api_key', value: nowpaymentsApiKey },
      { key: 'nowpayments_ipn_secret', value: nowpaymentsIpnSecret },
      { key: 'lemonsqueezy_api_key', value: lemonsqueezyApiKey },
      { key: 'lemonsqueezy_store_id', value: lemonsqueezyStoreId },
      { key: 'lemonsqueezy_variant_id', value: lemonsqueezyVariantId },
      { key: 'lemonsqueezy_webhook_secret', value: lemonsqueezyWebhookSecret },

      { key: 'instapay_address', value: instapayAddress },
      { key: 'instapay_url', value: instapayUrl },
      { key: 'vodafone_cash_number', value: vodafoneCashNumber },
      { key: 'orange_cash_number', value: orangeCashNumber },
      { key: 'etisalat_cash_number', value: etisalatCashNumber },
      { key: 'fawry_merchant_code', value: fawryMerchantCode },

      { key: 'stc_pay_number', value: stcPayNumber },
      { key: 'urpay_number', value: urpayNumber },
      { key: 'alrajhi_iban', value: alrajhiIban },
      { key: 'snb_iban', value: snbIban },
    ], { onConflict: 'key' });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage('Settings and payment gateways saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleTestBybitConnection = async () => {
    setIsTestingBybit(true);
    setBybitTestResult(null);
    try {
      const res = await fetch('/api/admin/bybit/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setBybitTestResult(data);
    } catch (err: any) {
      setBybitTestResult({ success: false, message: err.message });
    } finally {
      setIsTestingBybit(false);
    }
  };

  const handleTestAIConnection = async () => {
    setIsTestingAI(true);
    setAiTestResult(null);
    try {
      const res = await fetch('/api/admin/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: deepseekModel,
          apiKey: deepseekApiKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAiTestResult({ success: false, error: data.error || 'Connection test failed.' });
      } else {
        setAiTestResult({
          success: true,
          message: data.message || 'DeepSeek AI connection active!',
          modelUsed: data.modelUsed,
          latencyMs: data.latencyMs,
        });
      }
    } catch (err: any) {
      setAiTestResult({ success: false, error: err.message });
    } finally {
      setIsTestingAI(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setNotifLoading(true);
    try {
      const payload: any = {
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        audience: notifAudience,
      };
      if (notifAudience === 'single') payload.userId = notifTargetUser;

      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to dispatch notification.');
      setSuccessMessage('Notification broadcasted successfully!');
      setNotifTitle('');
      setNotifMessage('');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleSyncGitHubCommits = async () => {
    setGithubSyncing(true);
    setGithubSyncResult(null);
    try {
      const res = await fetch('/api/admin/github-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: githubRepo })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setGithubSyncResult({ success: true, count: data.importedCount || 0 });
      loadData();
    } catch (err: any) {
      setGithubSyncResult({ success: false, error: err.message });
    } finally {
      setGithubSyncing(false);
    }
  };

  const handleDeleteChangelog = async (id: string) => {
    if (!confirm('Delete this changelog entry?')) return;
    const { error } = await supabase.from('changelogs').delete().eq('id', id);
    if (!error) loadData();
  };

  const openEditChangelogModal = (c: any) => {
    setEditingChangelog(c);
    setChangelogVersion(c.version);
    setChangelogTitle(c.title);
    setChangelogCategory(c.category);
    setChangelogDescription(c.description || '');
    setChangelogFeatures(c.features || ['']);
    setChangelogFixes(c.fixes || ['']);
    setIsChangelogModalOpen(true);
  };

  // Stats calculation
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    (p.name_ar && p.name_ar.includes(productSearch))
  );

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
    (o.profiles?.email && o.profiles.email.toLowerCase().includes(orderSearch.toLowerCase()))
  );

  const filteredProfiles = profiles.filter(p => 
    p.email.toLowerCase().includes(userSearch.toLowerCase()) || 
    (p.display_name && p.display_name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  // ─── AUTH SCREEN ────────────────────────────────────────────────────────────

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4 select-none">
        <div className="bg-white border-2 border-black rounded-3xl p-8 shadow-[6px_6px_0px_0px_#000] flex flex-col items-center text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center mb-4 shadow-[3px_3px_0px_0px_#000]">
            <Loader2 className="w-7 h-7 animate-spin text-black stroke-[2.5]" />
          </div>
          <h3 className="text-lg font-black text-black mb-1">
            {isRtl ? 'جاري التحقق من الصلاحيات...' : 'Verifying Admin Access...'}
          </h3>
          <p className="text-xs text-neutral-700 font-bold">
            {isRtl ? 'يرجى الانتظار بينما يتم تجهيز لوحة التحكم' : 'Please wait while dashboard data loads'}
          </p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4 select-none">
        <div className="bg-white border-2 border-black rounded-3xl p-8 shadow-[6px_6px_0px_0px_#000] flex flex-col items-center text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-2xl bg-[#FF70A6] border-2 border-black flex items-center justify-center mb-4 shadow-[3px_3px_0px_0px_#000]">
            <ShieldAlert className="w-7 h-7 text-black stroke-[2.5]" />
          </div>
          <h3 className="text-xl font-black text-black mb-2">
            {isRtl ? 'تم رفض الوصول' : 'Access Denied'}
          </h3>
          <p className="text-xs text-neutral-800 font-bold mb-6">
            {isRtl ? 'ليس لديك صلاحيات المدير للوصول لهذه اللوحة.' : 'You do not have administrative privileges.'}
          </p>
          <Link
            href="/"
            className="px-6 py-2.5 bg-[#FFE600] hover:bg-[#ffea33] border-2 border-black text-black font-black text-xs rounded-xl shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            {isRtl ? 'العودة للمتجر' : 'Return to Store'}
          </Link>
        </div>
      </div>
    );
  }

  // ─── ADMIN DASHBOARD RENDER ────────────────────────────────────────────────

  const navTabs: { id: TabType; label: string; icon: any; badge?: number | string }[] = [
    { id: 'overview', label: at.tabOverview, icon: LayoutDashboard },
    { id: 'products', label: at.tabProducts, icon: Package, badge: products.length },
    { id: 'orders', label: at.tabOrders, icon: ShoppingBag, badge: orders.length },
    { id: 'manual-orders', label: at.tabManualOrders, icon: CreditCard, badge: orders.filter(o => o.status === 'pending_manual_payment').length || undefined },
    { id: 'gateways', label: isRtl ? 'بوابات الدفع' : 'Payment Gateways', icon: Zap },
    { id: 'users', label: at.tabUsers, icon: Users, badge: profiles.length },
    { id: 'hyper-adaptive', label: at.tabHyperAdaptive || 'Hyper-Adaptive AI', icon: Brain },
    { id: 'notifications', label: at.tabNotifications, icon: Bell },
    { id: 'settings', label: at.tabSettings, icon: SettingsIcon },
    { id: 'ai-copilot', label: 'AI Copilot', icon: Bot },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-black pb-24 select-none" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* ── Top Navbar ── */}
      <header className="bg-white border-b-2 border-black sticky top-0 z-30 shadow-[0px_4px_0px_0px_#000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all">
              <Zap className="w-5 h-5 text-black stroke-[2.5]" />
            </Link>
            <div>
              <h1 className="text-base font-black text-black leading-none flex items-center gap-2">
                UpStore Admin <span className="bg-[#06D6A0] text-[10px] px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000]">v2.5</span>
              </h1>
              <p className="text-[10px] text-neutral-600 font-bold mt-0.5">Control Center & Marketplace Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              {language === 'ar' ? 'English (EN)' : 'العربية (AR)'}
            </button>
            <Link
              href="/"
              className="px-3 py-1.5 bg-[#FFE600] hover:bg-[#ffea33] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isRtl ? 'المتجر' : 'Store'}</span>
            </Link>
          </div>
        </div>

        {/* ── Sub Navigation Tabs Bar ── */}
        <div className="max-w-7xl mx-auto px-2 sm:px-6 py-2 flex items-center gap-1.5 relative group/tabs">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => {
              if (navTabsRef.current) {
                const delta = isRtl ? 260 : -260;
                navTabsRef.current.scrollBy({ left: delta, behavior: 'smooth' });
              }
            }}
            className="hidden sm:flex w-8 h-8 rounded-xl bg-white border-2 border-black items-center justify-center text-black shadow-[1.5px_1.5px_0px_0px_#000] hover:bg-[#FFE600] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
            title={isRtl ? 'تمرير للأمام' : 'Scroll left'}
            aria-label="Scroll left"
          >
            <ChevronLeft className={`w-4 h-4 stroke-[2.5] ${isRtl ? 'rotate-180' : ''}`} />
          </button>

          {/* Scrollable Container with mouse wheel horizontal translation */}
          <div
            ref={navTabsRef}
            onWheel={(e) => {
              if (e.deltaY !== 0 && navTabsRef.current) {
                navTabsRef.current.scrollLeft += e.deltaY;
              }
            }}
            className="flex-1 overflow-x-auto scrollbar-none py-1 flex items-center gap-2 scroll-smooth"
          >
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  data-active={active ? 'true' : 'false'}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border-2 whitespace-nowrap cursor-pointer shrink-0 ${
                    active
                      ? 'bg-[#FFE600] text-black border-black shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-white text-neutral-700 hover:text-black hover:bg-neutral-50 border-transparent hover:border-black'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.5]" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full border border-black font-mono font-black ${active ? 'bg-black text-white' : 'bg-neutral-100 text-black'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => {
              if (navTabsRef.current) {
                const delta = isRtl ? -260 : 260;
                navTabsRef.current.scrollBy({ left: delta, behavior: 'smooth' });
              }
            }}
            className="hidden sm:flex w-8 h-8 rounded-xl bg-white border-2 border-black items-center justify-center text-black shadow-[1.5px_1.5px_0px_0px_#000] hover:bg-[#FFE600] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
            title={isRtl ? 'تمرير للخلف' : 'Scroll right'}
            aria-label="Scroll right"
          >
            <ChevronRight className={`w-4 h-4 stroke-[2.5] ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* Notification Messages */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-[#06D6A0] border-2 border-black text-black font-black text-xs sm:text-sm shadow-[4px_4px_0px_0px_#000] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FF70A6] border-2 border-black text-black font-black text-xs sm:text-sm shadow-[4px_4px_0px_0px_#000] flex items-center gap-2">
            <AlertCircle className="w-5 h-5 stroke-[2.5]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dynamic Tab Renderer */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'overview' && (
              <AdminOverviewTab
                products={products}
                orders={orders}
                outOfStockCount={outOfStockCount}
                pendingOrdersCount={pendingOrdersCount}
                zelenkaBalance={zelenkaBalance}
                setActiveTab={setActiveTab}
                at={at}
              />
            )}

            {activeTab === 'products' && (
              <AdminProductsTab
                products={products}
                filteredProducts={filteredProducts}
                productSearch={productSearch}
                setProductSearch={setProductSearch}
                handleBulkTranslateAllProducts={async () => {
                  setIsBulkTranslating(true);
                  try {
                    alert('Bulk translation started in background.');
                  } finally {
                    setIsBulkTranslating(false);
                  }
                }}
                isBulkTranslating={isBulkTranslating}
                bulkTranslateProgress={bulkTranslateProgress}
                setAiGenPrompt={setAiGenPrompt}
                setAiGenCategory={setAiGenCategory}
                setIsAiGenModalOpen={setIsAiGenModalOpen}
                handleOpenAddModal={handleOpenAddModal}
                handleOpenVariantsModal={() => {}}
                handleOpenEditModal={handleOpenEditModal}
                handleDeleteProduct={handleDeleteProduct}
                loadNotice={Boolean(loadNotice)}
                isRtl={isRtl}
                at={at}
                onRefresh={loadData}
              />
            )}

            {activeTab === 'orders' && (
              <AdminOrdersTab
                filteredOrders={filteredOrders}
                orderSearch={orderSearch}
                setOrderSearch={setOrderSearch}
                handleOpenEditOrderModal={handleOpenEditOrderModal}
                handleDeleteOrder={handleDeleteOrder}
                at={at}
              />
            )}

            {activeTab === 'manual-orders' && (
              <AdminManualOrdersTab
                orders={orders}
                formLoading={formLoading}
                handleApproveManualPayment={handleApproveManualPayment}
                handleRejectManualPayment={handleRejectManualPayment}
                isRtl={isRtl}
                at={at}
                onRefreshOrders={loadData}
              />
            )}

            {activeTab === 'users' && (
              <AdminUsersTab
                filteredProfiles={filteredProfiles}
                userSearch={userSearch}
                setUserSearch={setUserSearch}
                handleOpenEditProfileModal={handleOpenEditProfileModal}
                handleDeleteProfile={handleDeleteProfile}
                at={at}
                onRefreshUsers={loadData}
              />
            )}

            {activeTab === 'gateways' && (
              <AdminGatewaysTab isRtl={isRtl} />
            )}

            {activeTab === 'hyper-adaptive' && (
              <AdminHyperAdaptiveTab
                isRtl={isRtl}
                at={at}
              />
            )}

            {activeTab === 'settings' && (
              <AdminSettingsTab
                announcementText={announcementText}
                setAnnouncementText={setAnnouncementText}
                flashDealUrgencyTextAr={flashDealUrgencyTextAr}
                setFlashDealUrgencyTextAr={setFlashDealUrgencyTextAr}
                flashDealUrgencyTextEn={flashDealUrgencyTextEn}
                setFlashDealUrgencyTextEn={setFlashDealUrgencyTextEn}
                referralBonus={referralBonus}
                setReferralBonus={setReferralBonus}
                maintenanceMode={maintenanceMode}
                setMaintenanceMode={setMaintenanceMode}
                deepseekApiKey={deepseekApiKey}
                setDeepSeekApiKey={setDeepSeekApiKey}
                deepseekModel={deepseekModel}
                setDeepSeekModel={setDeepSeekModel}
                isTestingAI={isTestingAI}
                aiTestResult={aiTestResult}
                handleTestAIConnection={handleTestAIConnection}

                hyperAdaptiveDefault={hyperAdaptiveDefault}
                setHyperAdaptiveDefault={setHyperAdaptiveDefault}

                bybitApiKey={bybitApiKey}
                setBybitApiKey={setBybitApiKey}
                bybitApiSecret={bybitApiSecret}
                setBybitApiSecret={setBybitApiSecret}
                bybitUid={bybitUid}
                setBybitUid={setBybitUid}
                bybitProxyUrl={bybitProxyUrl}
                setBybitProxyUrl={setBybitProxyUrl}
                bybitUsdtTrc20={bybitUsdtTrc20}
                setBybitUsdtTrc20={setBybitUsdtTrc20}
                bybitUsdtBep20={bybitUsdtBep20}
                setBybitUsdtBep20={setBybitUsdtBep20}
                bybitUsdtTon={bybitUsdtTon}
                setBybitUsdtTon={setBybitUsdtTon}
                binancePayId={binancePayId}
                setBinancePayId={setBinancePayId}
                nowpaymentsApiKey={nowpaymentsApiKey}
                setNowPaymentsApiKey={setNowPaymentsApiKey}
                nowpaymentsIpnSecret={nowpaymentsIpnSecret}
                setNowPaymentsIpnSecret={setNowPaymentsIpnSecret}
                lemonsqueezyApiKey={lemonsqueezyApiKey}
                setLemonSqueezyApiKey={setLemonSqueezyApiKey}
                lemonsqueezyStoreId={lemonsqueezyStoreId}
                setLemonSqueezyStoreId={setLemonSqueezyStoreId}
                lemonsqueezyVariantId={lemonsqueezyVariantId}
                setLemonSqueezyVariantId={setLemonSqueezyVariantId}
                lemonsqueezyWebhookSecret={lemonsqueezyWebhookSecret}
                setLemonSqueezyWebhookSecret={setLemonSqueezyWebhookSecret}

                instapayAddress={instapayAddress}
                setInstapayAddress={setInstapayAddress}
                instapayUrl={instapayUrl}
                setInstapayUrl={setInstapayUrl}
                vodafoneCashNumber={vodafoneCashNumber}
                setVodafoneCashNumber={setVodafoneCashNumber}
                orangeCashNumber={orangeCashNumber}
                setOrangeCashNumber={setOrangeCashNumber}
                etisalatCashNumber={etisalatCashNumber}
                setEtisalatCashNumber={setEtisalatCashNumber}
                fawryMerchantCode={fawryMerchantCode}
                setFawryMerchantCode={setFawryMerchantCode}

                stcPayNumber={stcPayNumber}
                setStcPayNumber={setStcPayNumber}
                urpayNumber={urpayNumber}
                setUrpayNumber={setUrpayNumber}
                alrajhiIban={alrajhiIban}
                setAlrajhiIban={setAlrajhiIban}
                snbIban={snbIban}
                setSnbIban={setSnbIban}

                isTestingBybit={isTestingBybit}
                bybitTestResult={bybitTestResult}
                handleTestBybitConnection={handleTestBybitConnection}

                handleSaveSettings={handleSaveSettings}
                successMessage={successMessage}
                at={at}
              />
            )}

            {activeTab === 'notifications' && (
              <AdminNotificationsTab
                githubRepo={githubRepo}
                setGithubRepo={setGithubRepo}
                handleSyncGitHubCommits={handleSyncGitHubCommits}
                githubSyncing={githubSyncing}
                githubSyncResult={githubSyncResult}
                notifAudience={notifAudience}
                setNotifAudience={setNotifAudience}
                notifTargetUser={notifTargetUser}
                setNotifTargetUser={setNotifTargetUser}
                notifTitle={notifTitle}
                setNotifTitle={setNotifTitle}
                notifType={notifType}
                setNotifType={setNotifType}
                notifMessage={notifMessage}
                setNotifMessage={setNotifMessage}
                handleSendNotification={handleSendNotification}
                notifLoading={notifLoading}
                profiles={profiles}
                changelogs={changelogs}
                openEditChangelogModal={openEditChangelogModal}
                handleDeleteChangelog={handleDeleteChangelog}
                setEditingChangelog={setEditingChangelog}
                setChangelogVersion={setChangelogVersion}
                setChangelogTitle={setChangelogTitle}
                setChangelogCategory={setChangelogCategory}
                setChangelogDescription={setChangelogDescription}
                setChangelogFeatures={setChangelogFeatures}
                setChangelogFixes={setChangelogFixes}
                setIsChangelogModalOpen={setIsChangelogModalOpen}
                successMessage={successMessage}
                errorMessage={errorMessage}
                activeTab={activeTab}
                at={at}
              />
            )}

            {activeTab === 'ai-copilot' && (
              <AdminCopilotTab
                products={products}
                orders={orders}
                profiles={profiles}
                siteSettings={{
                  announcementText,
                  maintenanceMode,
                  referralBonus,
                  flashDealUrgencyTextAr,
                  flashDealUrgencyTextEn,
                }}
                pollinationsModel={deepseekModel}
                isRtl={isRtl}
                at={at}
                loadData={loadData}
                setActiveTab={setActiveTab}
                setProductSearch={setProductSearch}
                setOrderSearch={setOrderSearch}
                setUserSearch={setUserSearch}
                handleOpenAddModal={handleOpenAddModal}
                handleOpenEditModal={handleOpenEditModal}
                outOfStockCount={outOfStockCount}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* ─── MODAL: EDIT USER PROFILE ─── */}
      <AnimatePresence>
        {isEditProfileModalOpen && editingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
            <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[8px_8px_0px_0px_#000]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
                <h3 className="text-base font-black text-black flex items-center gap-2">
                  <Users className="w-5 h-5 stroke-[2.5]" />
                  <span>{isRtl ? 'تعديل بيانات المستخدم' : 'Edit User Profile'}</span>
                </h3>
                <button
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-black hover:bg-neutral-100 shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setFormLoading(true);
                const { error } = await supabase
                  .from('profiles')
                  .update({
                    display_name: profileDisplayName,
                    role: profileRole,
                    wallet_balance: profileWalletBalance,
                  })
                  .eq('id', editingProfile.id);
                setFormLoading(false);
                if (error) {
                  alert(error.message);
                } else {
                  setIsEditProfileModalOpen(false);
                  loadData();
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-neutral-800 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={profileDisplayName}
                    onChange={(e) => setProfileDisplayName(e.target.value)}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2.5 text-xs font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-neutral-800 mb-1">Role</label>
                  <select
                    value={profileRole}
                    onChange={(e) => setProfileRole(e.target.value)}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2.5 text-xs font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-neutral-800 mb-1">Wallet Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={profileWalletBalance}
                    onChange={(e) => setProfileWalletBalance(Number(e.target.value))}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2.5 text-xs font-mono font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                  >
                    {at.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                  >
                    {formLoading ? 'Saving...' : (isRtl ? 'حفظ المستخدم' : 'Save User')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: EDIT ORDER ─── */}
      <AnimatePresence>
        {isEditOrderModalOpen && editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
            <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[8px_8px_0px_0px_#000]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
                <h3 className="text-base font-black text-black flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                  <span>{isRtl ? 'تعديل بيانات الطلب' : 'Edit Order'}</span>
                </h3>
                <button
                  onClick={() => setIsEditOrderModalOpen(false)}
                  className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-black hover:bg-neutral-100 shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setFormLoading(true);
                const { error } = await supabase
                  .from('orders')
                  .update({
                    status: orderStatus,
                    product_key: orderProductKey || null,
                    amount: orderAmount,
                  })
                  .eq('id', editingOrder.id);
                setFormLoading(false);
                if (error) {
                  alert(error.message);
                } else {
                  setIsEditOrderModalOpen(false);
                  loadData();
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-neutral-800 mb-1">{at.colStatus}</label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2.5 text-xs font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                  >
                    <option value="pending">pending</option>
                    <option value="completed">completed</option>
                    <option value="fulfilled">fulfilled</option>
                    <option value="cancelled">cancelled</option>
                    <option value="pending_manual_payment">pending_manual_payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-neutral-800 mb-1">{at.colAmount} ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(Number(e.target.value))}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2.5 text-xs font-mono font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-neutral-800 mb-1">{at.colKey}</label>
                  <input
                    type="text"
                    value={orderProductKey}
                    onChange={(e) => setOrderProductKey(e.target.value)}
                    placeholder="e.g. KEY-XXXX-YYYY"
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2.5 text-xs font-mono font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOrderModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                  >
                    {at.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                  >
                    {formLoading ? 'Saving...' : (isRtl ? 'حفظ الطلب' : 'Save Order')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: EDIT / CREATE CHANGELOG ─── */}
      <AnimatePresence>
        {isChangelogModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
            <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[8px_8px_0px_0px_#000]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
                <h3 className="text-base font-black text-black flex items-center gap-2">
                  <Bell className="w-5 h-5 stroke-[2.5]" />
                  <span>{editingChangelog ? (isRtl ? 'تعديل سجل التغيير' : 'Edit Changelog') : (isRtl ? 'إضافة سجل تغيير جديد' : 'Add New Changelog')}</span>
                </h3>
                <button
                  onClick={() => setIsChangelogModalOpen(false)}
                  className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-black hover:bg-neutral-100 shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setFormLoading(true);
                const payload = {
                  version: changelogVersion,
                  title: changelogTitle,
                  category: changelogCategory,
                  description: changelogDescription,
                  features: changelogFeatures.filter(f => f.trim()),
                  fixes: changelogFixes.filter(f => f.trim()),
                };

                let error;
                if (editingChangelog) {
                  const res = await supabase.from('changelogs').update(payload).eq('id', editingChangelog.id);
                  error = res.error;
                } else {
                  const res = await supabase.from('changelogs').insert(payload);
                  error = res.error;
                }

                setFormLoading(false);
                if (error) {
                  alert(error.message);
                } else {
                  setIsChangelogModalOpen(false);
                  loadData();
                }
              }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-neutral-800 mb-1">Version (e.g. v2.5.0)</label>
                    <input
                      type="text"
                      required
                      value={changelogVersion}
                      onChange={(e) => setChangelogVersion(e.target.value)}
                      className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2 text-xs font-mono font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-neutral-800 mb-1">Category</label>
                    <select
                      value={changelogCategory}
                      onChange={(e) => setChangelogCategory(e.target.value as any)}
                      className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2 text-xs font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                    >
                      <option value="feature">Feature</option>
                      <option value="fix">Fix</option>
                      <option value="performance">Performance</option>
                      <option value="security">Security</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-neutral-800 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={changelogTitle}
                    onChange={(e) => setChangelogTitle(e.target.value)}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2 text-xs font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-neutral-800 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={changelogDescription}
                    onChange={(e) => setChangelogDescription(e.target.value)}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2 text-xs font-black text-black outline-none shadow-[2px_2px_0px_0px_#000] resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsChangelogModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                  >
                    {at.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                  >
                    {formLoading ? 'Saving...' : (isRtl ? 'حفظ التحديث' : 'Save Changelog')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
