'use client';

import React, { useState } from 'react';
import { 
  Plus, Sparkles, Wand2, Edit2, Trash2, Loader2, X, 
  Upload, Image as ImageIcon, CheckCircle2, AlertCircle, DollarSign,
  Package, Zap, ShieldCheck, Tag, FolderOpen
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useToastStore } from '@/store/useToastStore';
import { SerperImagePickerModal } from '@/components/admin/modals/SerperImagePickerModal';
import { ProductImage } from '@/components/ProductImage';
import {
  formatLocalizedDuration,
  formatLocalizedWarranty,
  generateSmartProductAdvantages,
  generateSmartProductAttributes,
} from '@/utils/products';

interface AdminProductsTabProps {
  products: any[];
  filteredProducts: any[];
  productSearch: string;
  setProductSearch: (v: string) => void;
  handleBulkTranslateAllProducts: () => void;
  isBulkTranslating: boolean;
  bulkTranslateProgress: string;
  setAiGenPrompt: (v: string) => void;
  setAiGenCategory: (v: string) => void;
  setIsAiGenModalOpen: (v: boolean) => void;
  handleOpenAddModal?: () => void;
  handleOpenVariantsModal?: (product: any) => void;
  handleOpenEditModal?: (product: any) => void;
  handleDeleteProduct: (id: string) => void;
  loadNotice: boolean;
  isRtl: boolean;
  at: Record<string, string>;
  onRefresh?: () => void;
}

const QUICK_PRICES = [2.99, 4.99, 9.99, 14.99, 19.99, 29.99, 49.99, 99.99];
const QUICK_STOCK = [10, 25, 50, 100, 250, 500];
const QUICK_DURATIONS = ['1 Month', '3 Months', '6 Months', '1 Year', '18 Months', '2 Years', 'Lifetime'];

export const AdminProductsTab: React.FC<AdminProductsTabProps> = ({
  filteredProducts,
  productSearch,
  setProductSearch,
  handleBulkTranslateAllProducts,
  isBulkTranslating,
  bulkTranslateProgress,
  setAiGenPrompt,
  setAiGenCategory,
  setIsAiGenModalOpen,
  handleDeleteProduct,
  loadNotice,
  isRtl,
  at,
  onRefresh,
}) => {
  const supabase = createClient();

  // ─── Modal State ──────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSerperModalOpen, setIsSerperModalOpen] = useState(false);
  const [serperModalTab, setSerperModalTab] = useState<'search' | 'vault'>('search');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  // ─── Form Fields ──────────────────────────────────────────────────
  const [nameAr, setNameAr] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Subscriptions');
  const [imageUrl, setImageUrl] = useState('');
  const [ourPrice, setOurPrice] = useState<number>(9.99);
  const [marketPrice, setMarketPrice] = useState<number>(39.99);
  const [stock, setStock] = useState<number>(50);
  const [subscriptionDuration, setSubscriptionDuration] = useState('1 Month');
  const [warrantyDuration, setWarrantyDuration] = useState('1 Month');
  const [deliveryMode, setDeliveryMode] = useState<'key' | 'pre_assigned' | 'zelenka_api' | 'telegram'>('key');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [description, setDescription] = useState('');
  const [advantagesAr, setAdvantagesAr] = useState<string[]>([]);
  const [advantages, setAdvantages] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [newAdvantageInput, setNewAdvantageInput] = useState('');
  const [isFlashDeal, setIsFlashDeal] = useState(false);
  const [flashDealPrice, setFlashDealPrice] = useState<number>(11.99);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleDurationChange = (dur: string) => {
    setSubscriptionDuration(dur);
    // Auto sync warranty duration to subscription duration by default
    setWarrantyDuration(dur);
  };

  const openAddModal = () => {
    setEditingId(null);
    setNameAr('');
    setName('');
    setCategory('Subscriptions');
    setImageUrl('');
    setOurPrice(9.99);
    setMarketPrice(39.99);
    setStock(50);
    setSubscriptionDuration('1 Month');
    setWarrantyDuration('1 Month');
    setDeliveryMode('key');
    setDescriptionAr('');
    setDescription('');
    setAdvantagesAr([]);
    setAdvantages([]);
    setAttributes([]);
    setNewAdvantageInput('');
    setIsFlashDeal(false);
    setFlashDealPrice(Math.round(39.99 * 0.30 * 100) / 100);
    setModalError('');
    setModalSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setNameAr(p.name_ar || p.name || '');
    setName(p.name || '');
    setCategory(p.category || 'Subscriptions');
    setImageUrl(p.image_url || '');
    const op = Number(p.our_price) || 9.99;
    const mp = Number(p.market_price) || Math.round(op * 3.5 * 100) / 100;
    setOurPrice(op);
    setMarketPrice(mp);
    setStock(Number(p.stock) ?? 50);
    const sDur = p.subscription_duration || '1 Month';
    setSubscriptionDuration(sDur);
    setWarrantyDuration(p.warranty_duration || sDur);
    setDeliveryMode(p.delivery_mode || 'key');
    setDescriptionAr(p.description_ar || p.description || '');
    setDescription(p.description || '');
    setAdvantagesAr(Array.isArray(p.advantages_ar) ? p.advantages_ar : []);
    setAdvantages(Array.isArray(p.advantages) ? p.advantages : []);
    setAttributes(Array.isArray(p.attributes) ? p.attributes : []);
    setNewAdvantageInput('');
    setIsFlashDeal(Boolean(p.is_flash_deal));
    // Default flash deal to 70% off the real market price
    setFlashDealPrice(Number(p.flash_deal_price) || Math.round(mp * 0.30 * 100) / 100);
    setModalError('');
    setModalSuccess('');
    setIsModalOpen(true);
  };

  // ─── Auto English Name & Slug Derivation ──────────────────────────────────
  const deriveEnglishNameAndSlug = (arName: string, existingEnName?: string) => {
    if (existingEnName && existingEnName.trim()) {
      const cleanSlug = existingEnName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return { enName: existingEnName.trim(), slug: cleanSlug || `product-${Date.now()}` };
    }

    const lower = arName.toLowerCase();
    let eng = '';
    if (lower.includes('جيمناي') || lower.includes('gemini')) eng = 'Google Gemini Advanced';
    else if (lower.includes('نتفليكس') || lower.includes('netflix')) eng = 'Netflix Premium 4K';
    else if (lower.includes('شات') || lower.includes('chatgpt')) eng = 'ChatGPT Plus';
    else if (lower.includes('كانفا') || lower.includes('canva')) eng = 'Canva Pro';
    else if (lower.includes('سبوتيفاي') || lower.includes('spotify')) eng = 'Spotify Premium';
    else if (lower.includes('ديسكورد') || lower.includes('discord')) eng = 'Discord Nitro';
    else if (lower.includes('ويندوز') || lower.includes('windows')) eng = 'Windows 11 Pro Retail';
    else if (lower.includes('يوتيوب') || lower.includes('youtube')) eng = 'YouTube Premium';
    else if (lower.includes('اوفيس') || lower.includes('office')) eng = 'Microsoft Office 365 Pro';
    else if (lower.includes('نورد') || lower.includes('nordvpn')) eng = 'NordVPN 2-Years';
    else eng = arName.replace(/[\u0600-\u06FF]+/g, '').trim() || 'Digital Product';

    if (lower.includes('18 شهر') || lower.includes('18 month')) eng += ' - 18 Months';
    else if (lower.includes('12 شهر') || lower.includes('سنة') || lower.includes('1 year')) eng += ' - 1 Year';
    else if (lower.includes('6 شهر') || lower.includes('6 month')) eng += ' - 6 Months';
    else if (lower.includes('3 شهر') || lower.includes('3 month')) eng += ' - 3 Months';
    else if (lower.includes('شهر') || lower.includes('1 month')) eng += ' - 1 Month';

    const cleanSlug = eng
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return { enName: eng, slug: cleanSlug || `product-${Date.now()}` };
  };

  // ─── 1-Click AI Auto Description Generator ───────────────────────────────
  const handleAutoGenerateDescription = async () => {
    if (!nameAr.trim()) {
      setModalError(isRtl ? 'يرجى كتابة اسم المنتج أولاً لصياغة الوصف' : 'Please enter product name first');
      return;
    }

    setIsGeneratingDesc(true);
    setModalError('');
    try {
      const res = await fetch('/api/admin/ai/generate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: nameAr.trim(), category }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'AI generation failed');

      const prod = data.product || data;
      if (prod.description_ar) setDescriptionAr(prod.description_ar);
      if (prod.description) setDescription(prod.description);
      if (prod.category && !category) setCategory(prod.category);
      if (prod.image_url && !imageUrl) setImageUrl(prod.image_url);
      if (prod.subscription_duration) {
        setSubscriptionDuration(prod.subscription_duration);
        setWarrantyDuration(prod.warranty_duration || prod.subscription_duration);
      } else if (prod.warranty_duration) {
        setWarrantyDuration(prod.warranty_duration);
      }
      if (prod.advantages_ar && Array.isArray(prod.advantages_ar) && prod.advantages_ar.length > 0) {
        setAdvantagesAr(prod.advantages_ar);
      }
      if (prod.advantages && Array.isArray(prod.advantages) && prod.advantages.length > 0) {
        setAdvantages(prod.advantages);
      }
      if (prod.attributes && Array.isArray(prod.attributes) && prod.attributes.length > 0) {
        setAttributes(prod.attributes);
      }
      if (prod.market_price) {
        setMarketPrice(Number(prod.market_price));
      }
      if (prod.our_price && !editingId) {
        setOurPrice(Number(prod.our_price));
      }

      setModalSuccess(isRtl ? 'تمت صياغة الوصف والمميزات والسمات بالذكاء الاصطناعي بنجاح!' : 'AI Generated Description, Advantages & Attributes!');
      setTimeout(() => setModalSuccess(''), 2500);
    } catch (err: any) {
      setModalError(err.message || 'Error generating description');
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  // ─── Image File Upload Handler ───────────────────────────────────────────
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setModalError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (editingId) formData.append('productId', editingId);

      const res = await fetch('/api/upload-product-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to upload image');

      if (data.url) {
        setImageUrl(data.url);
        setModalSuccess(isRtl ? 'تم رفع الصورة بنجاح!' : 'Image uploaded successfully!');
        setTimeout(() => setModalSuccess(''), 2500);
        if (editingId) {
          handleImageSelectedDirectly(data.url);
        }
      }
    } catch (err: any) {
      setModalError(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  // ─── Direct Image Selection & Auto-Save Handler ───────────────────────────
  const handleImageSelectedDirectly = async (importedUrl: string) => {
    setImageUrl(importedUrl);

    // Auto-save immediately if editing an existing product
    if (editingId) {
      try {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            image_url: importedUrl,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          useToastStore.getState().success(
            isRtl ? 'تم تحديث وحفظ صورة المنتج تلقائياً في قاعدة البيانات!' : 'Product image auto-saved successfully!',
            nameAr || name
          );
          if (onRefresh) {
            onRefresh();
          }
        }
      } catch (err: any) {
        console.error('[Auto Save Image Error]:', err);
      }
    }
  };

  // ─── Save Product to DB (100% AUTO Background Calculations) ───────────────
  // ─── Save Product to DB (100% Robust via Admin API) ───────────────────────
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNameAr = nameAr.trim();
    if (!finalNameAr) {
      const err = isRtl ? 'يرجى إدخال اسم المنتج أولاً' : 'Product name is required.';
      setModalError(err);
      useToastStore.getState().error(err);
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      const validPrice = Number(ourPrice) || 9.99;
      const validMarketPrice = Number(marketPrice) || Math.round(validPrice * 3.5 * 100) / 100;
      const autoPriceEgp = Math.ceil(validPrice * 53);
      const autoPriceSar = Math.ceil(validPrice * 4);
      const autoFlashPrice = isFlashDeal 
        ? (Number(flashDealPrice) || Math.round(validMarketPrice * 0.30 * 100) / 100) 
        : null;

      const payload = {
        id: editingId || undefined,
        name: name.trim() || undefined,
        name_ar: finalNameAr,
        category,
        image_url: imageUrl.trim() || null,
        our_price: validPrice,
        market_price: validMarketPrice,
        price_egp: autoPriceEgp,
        price_sar: autoPriceSar,
        stock: Number(stock) || 0,
        max_stock: 100,
        description: description.trim() || undefined,
        description_ar: descriptionAr.trim() || undefined,
        advantages,
        advantages_ar: advantagesAr,
        attributes,
        subscription_duration: subscriptionDuration,
        warranty_duration: warrantyDuration || subscriptionDuration,
        delivery_time: 'Instant',
        delivery_mode: deliveryMode,
        is_flash_deal: isFlashDeal,
        flash_deal_price: autoFlashPrice,
        flash_deal_duration_hours: 12,
      };

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save product');
      }

      useToastStore.getState().success(
        isRtl ? 'تم نشر وحفظ المنتج بنجاح!' : 'Product published successfully!',
        finalNameAr
      );

      setIsModalOpen(false);
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('[Product Publish Error]:', err);
      const msg = err.message || 'Failed to save product';
      setModalError(msg);
      useToastStore.getState().error(
        isRtl ? 'فشل حفظ ونشر المنتج' : 'Failed to publish product',
        msg
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Calculations for live badge display
  const numOurPrice = Number(ourPrice) || 0;
  const numMarketPrice = Number(marketPrice) || 0;
  const liveEgp = Math.ceil(numOurPrice * 53);
  const liveSar = Math.ceil(numOurPrice * 4).toString();
  const liveDiscountPct = numMarketPrice > numOurPrice 
    ? Math.round(((numMarketPrice - numOurPrice) / numMarketPrice) * 100) 
    : 0;
  const auto70FlashPrice = (Math.round(numMarketPrice * 0.30 * 100) / 100).toFixed(2);

  return (
    <div className="space-y-6 text-black">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Bar */}
        <input 
          type="text"
          placeholder={at.searchProductsPlaceholder}
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          className="bg-white border-2 border-black rounded-xl px-4 py-2.5 text-xs font-bold text-black placeholder-neutral-600 outline-none shadow-[2px_2px_0px_0px_#000] flex-1"
        />
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBulkTranslateAllProducts}
            disabled={isBulkTranslating}
            className="px-3.5 py-2.5 bg-[#4CC9F0] hover:bg-[#3db6db] border-2 border-black text-black font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Translate all products missing Arabic in one click using AI"
          >
            {isBulkTranslating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{bulkTranslateProgress || 'Translating...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isRtl ? 'ترجمة الكل ذكياً' : 'Bulk Translate AI'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSerperModalTab('vault');
              setIsSerperModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-[#06D6A0] hover:bg-[#05b888] border-2 border-black text-black font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
            title={isRtl ? 'تصفح وحذف واختيار صور المنتجات من مخزون Supabase' : 'Browse & manage Supabase image vault'}
          >
            <FolderOpen className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isRtl ? '🗄️ مخزون صور المنتجات' : '🗄️ Supabase Vault'}</span>
          </button>

          <button
            onClick={() => {
              setAiGenPrompt('');
              setAiGenCategory('');
              setIsAiGenModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-[#B892FF] hover:bg-[#a77dfb] border-2 border-black text-black font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
            title="Generate a brand new product from prompt with AI"
          >
            <Wand2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isRtl ? 'توليد منتج ذكي' : 'AI Auto-Create'}</span>
          </button>

          <button 
            onClick={openAddModal}
            className="px-4 py-2.5 bg-[#FFE600] hover:bg-[#ebd300] border-2 border-black text-black font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{at.addNewProduct}</span>
          </button>
        </div>
      </div>

      {/* Products Inventory Table */}
      <div className="bg-white border-2 border-black rounded-3xl overflow-hidden shadow-[6px_6px_0px_0px_#000]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black text-neutral-800 text-xs font-black uppercase tracking-wider select-none bg-[#FFFDF9]">
                <th className="p-4">{at.colProduct}</th>
                <th className="p-4">{at.colCategory}</th>
                <th className="p-4">{at.colPrice}</th>
                <th className="p-4">{at.colStock}</th>
                <th className="p-4 text-center">{at.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-neutral-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-700 font-bold select-none">
                    {loadNotice
                      ? 'No live products could be shown with the current database state.'
                      : 'No live products found in Supabase yet.'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-4 font-black text-black">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(p.id);
                            setNameAr(p.name_ar || '');
                            setName(p.name || '');
                            setCategory(p.category || 'Subscriptions');
                            setSerperModalTab('vault');
                            setIsSerperModalOpen(true);
                          }}
                          className="w-10 h-10 rounded-xl overflow-hidden bg-[#FFFDF9] hover:bg-[#FFE600] border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[1.5px_1.5px_0px_0px_#000] p-0.5 cursor-pointer transition-all hover:scale-105"
                          title={isRtl ? 'اضغط لتغيير وحفظ صورة هذا المنتج فوراً من المخزون' : 'Click to change & auto-save image'}
                        >
                          <ProductImage
                            product={{
                              ...p,
                              image_url: p.image_url,
                              imageUrl: p.image_url,
                              name: p.name,
                              name_ar: p.name_ar,
                              slug: p.slug,
                            }}
                            alt={p.name_ar || p.name}
                            size="sm"
                          />
                        </button>
                        <div>
                          <div className="font-black text-black text-xs sm:text-sm">{p.name_ar || p.name}</div>
                          {p.name && p.name !== p.name_ar && (
                            <div className="text-[11px] text-neutral-500 font-mono font-bold">{p.name}</div>
                          )}
                          {p.is_flash_deal && (
                            <span className="inline-block mt-0.5 text-[9px] font-black bg-[#FFE600] border border-black px-1.5 py-0.2 rounded shadow-[1px_1px_0px_0px_#000]">
                              FLASH DEAL (${p.flash_deal_price || p.our_price})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-neutral-800 font-bold">
                      <span className="bg-[#FFFDF9] border border-black px-2 py-0.5 rounded text-xs font-black shadow-[1px_1px_0px_0px_#000]">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-black font-mono font-black text-sm">${Number(p.our_price || 0).toFixed(2)}</div>
                      <div className="text-neutral-500 font-mono text-[10px] line-through">${Number(p.market_price || 0).toFixed(2)}</div>
                      {(p.price_egp > 0 || p.price_sar > 0) && (
                        <div className="text-[11px] text-neutral-700 font-mono font-bold mt-0.5">
                          {p.price_egp > 0 && <span>{Number(p.price_egp).toFixed(0)} ج.م</span>}
                          {p.price_egp > 0 && p.price_sar > 0 && <span className="mx-1">•</span>}
                          {p.price_sar > 0 && <span>{Number(p.price_sar).toFixed(0)} ر.س</span>}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`font-mono font-black ${p.stock === 0 ? 'text-rose-600 animate-pulse' : p.stock < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {p.stock}
                      </span>
                      <span className="text-neutral-600 text-xs font-mono font-bold"> units</span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(p)}
                          className="p-2 hover:bg-[#FFE600] text-black rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 hover:bg-rose-100 text-rose-700 rounded-xl border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── STREAMLINED FAST ADD / EDIT PRODUCT MODAL (100% AUTO) ────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm select-none overflow-y-auto">
          <div 
            className="bg-white border-[3px] border-black rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-[8px_8px_0px_0px_#000] my-6 max-h-[92vh] overflow-y-auto text-black"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b-2 border-black">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                  <Package className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-black leading-tight flex items-center gap-2">
                    <span>{editingId ? (isRtl ? 'تعديل بيانات المنتج' : 'Edit Product') : (isRtl ? 'إضافة منتج جديد' : 'Add Product')}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#06D6A0] text-black text-[10px] font-mono font-black border border-black shadow-[1px_1px_0px_0px_#000]">
                      100% AUTO
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-600 font-bold">
                    {isRtl ? 'اكتب اسم المنتج والسعر فقط - الباقي محسوب ومترجم تلقائياً' : 'Set product name & price - everything else is automated'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black shadow-[2px_2px_0px_0px_#000] text-black font-black active:translate-x-0.5 active:translate-y-0.5 transition-transform cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Notification Messages */}
            {modalSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-[#06D6A0] border-2 border-black text-black font-black text-xs shadow-[2px_2px_0px_0px_#000] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>{modalSuccess}</span>
              </div>
            )}

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-[#FF6B6B] border-2 border-black text-black font-black text-xs shadow-[2px_2px_0px_0px_#000] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Streamlined Form */}
            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              {/* 1. Image Box */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[#FFFDF9] border-2 border-black shadow-[3px_3px_0px_0px_#000] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-black flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 stroke-[2.5]" />
                    <span>{isRtl ? 'صورة المنتج (PNG / WebP)' : 'Product Image'}</span>
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[11px] font-black text-rose-600 hover:underline cursor-pointer"
                    >
                      {isRtl ? 'حذف الصورة' : 'Remove'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Thumbnail Preview */}
                  <div className="w-16 h-16 rounded-xl bg-white border-2 border-black flex items-center justify-center p-1 overflow-hidden flex-shrink-0 shadow-[1.5px_1.5px_0px_0px_#000] relative">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ProductImage
                        product={{
                          name: name || 'Product',
                          name_ar: nameAr,
                          slug: (name || nameAr || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        }}
                        size="sm"
                      />
                    )}
                    {imageUrl && (
                      <span className="absolute top-0.5 start-0.5 px-1 py-0.2 rounded bg-[#06D6A0] text-[8px] font-black border border-black">
                        PNG
                      </span>
                    )}
                  </div>

                  {/* Image Controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      placeholder="https://example.com/image.png"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-white border-2 border-black rounded-xl p-2 text-xs font-mono font-bold text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="px-2.5 py-2 bg-white hover:bg-neutral-50 border-2 border-black rounded-xl text-xs font-black text-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer">
                        {uploadingImage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{isRtl ? 'جاري الرفع...' : 'Uploading...'}</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{isRtl ? 'رفع من الجهاز' : 'Upload'}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileUpload}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setSerperModalTab('search');
                          setIsSerperModalOpen(true);
                        }}
                        className="px-2.5 py-2 bg-[#FFE600] hover:bg-[#FFD600] border-2 border-black rounded-xl text-xs font-black text-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 fill-black stroke-black" />
                        <span>{isRtl ? 'بحث صور PNG' : 'Search PNG'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSerperModalTab('vault');
                          setIsSerperModalOpen(true);
                        }}
                        className="px-2.5 py-2 bg-[#06D6A0] hover:bg-[#05b888] border-2 border-black rounded-xl text-xs font-black text-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{isRtl ? 'مخزون Supabase' : 'Vault'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Product Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-black mb-1">
                    {isRtl ? 'اسم المنتج (عربي)' : 'Product Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder={isRtl ? 'مثال: اشتراك جيمناي أدفانسد - 18 شهر' : 'e.g. Gemini Advanced - 18 Months'}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2.5 text-xs font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-black mb-1">
                    {at.colCategory}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2.5 text-xs font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                  >
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Accounts">AI & Accounts</option>
                    <option value="VPNs & Security">VPNs & Security</option>
                    <option value="Software">Software & OS</option>
                    <option value="Game Keys">Game Keys</option>
                  </select>
                </div>
              </div>

              {/* 3. Pricing & Real Market Value (2 inputs with live auto discount) */}
              <div className="p-3.5 rounded-2xl bg-[#FFFDF9] border-2 border-black shadow-[3px_3px_0px_0px_#000] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-black flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 stroke-[2.5]" />
                    <span>{isRtl ? 'التسعير وسعر السوق الحقيقي' : 'Pricing & Real Market Value'} *</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {liveDiscountPct > 0 && (
                      <span className="text-[10px] font-mono font-black bg-[#06D6A0] text-black px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_0px_#000]">
                        {isRtl ? `وفر ${liveDiscountPct}% تلقائي` : `${liveDiscountPct}% OFF`}
                      </span>
                    )}
                    <span className="text-[10px] font-mono font-black bg-white text-black px-2 py-0.5 rounded-md border border-black">
                      AUTO Sync
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* UpStore Selling Price */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-neutral-800">
                      {isRtl ? 'سعر البيع في المتجر ($) *' : 'Selling Price ($) *'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        required
                        value={ourPrice || ''}
                        onChange={(e) => setOurPrice(parseFloat(e.target.value) || 0)}
                        placeholder="9.99"
                        className="w-full bg-white border-2 border-black rounded-xl p-2.5 ps-7 text-sm font-mono font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                      />
                      <span className="absolute top-1/2 -translate-y-1/2 start-2.5 text-neutral-500 font-mono font-black text-sm">$</span>
                    </div>

                    {/* Quick Price Buttons */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {QUICK_PRICES.map((qp) => (
                        <button
                          key={qp}
                          type="button"
                          onClick={() => setOurPrice(qp)}
                          className={`px-1.5 py-0.5 rounded-lg border text-[10px] font-mono font-black cursor-pointer transition-all ${
                            ourPrice === qp
                              ? 'bg-[#FFE600] border-black shadow-[1px_1px_0px_0px_#000]'
                              : 'bg-white hover:bg-neutral-100 border-black/40'
                          }`}
                        >
                          ${qp}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Real Original Market Price */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-neutral-800 flex items-center justify-between">
                      <span>{isRtl ? 'سعر السوق الأصلي الحقيقي ($) *' : 'Real Original Market Price ($) *'}</span>
                      <span className="text-[9px] text-neutral-500 font-bold">{isRtl ? '(سعر الشطب)' : '(Original)'}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        required
                        value={marketPrice || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setMarketPrice(val);
                          if (isFlashDeal) {
                            setFlashDealPrice(Math.round(val * 0.30 * 100) / 100);
                          }
                        }}
                        placeholder="39.99"
                        className="w-full bg-white border-2 border-black rounded-xl p-2.5 ps-7 text-sm font-mono font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                      />
                      <span className="absolute top-1/2 -translate-y-1/2 start-2.5 text-neutral-500 font-mono font-black text-sm">$</span>
                    </div>

                    <div className="text-[10px] text-neutral-600 font-bold flex items-center justify-between pt-1">
                      <span>{isRtl ? 'الخصم التلقائي للعميل:' : 'Calculated Discount:'}</span>
                      <span className="font-mono font-black text-emerald-600">{liveDiscountPct}% OFF</span>
                    </div>
                  </div>
                </div>

                {/* Auto Calculated Live Currency Badges */}
                <div className="flex items-center gap-2 flex-wrap pt-1 text-[10px] font-mono font-bold text-neutral-700">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-black/30">
                    EGP: {liveEgp} ج.م (تلقائي)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-black/30">
                    SAR: {liveSar} ر.س (تلقائي)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FF70A6]/20 border border-black/30 text-neutral-800">
                    فلاش ديل (70% خصم من السوق): ${auto70FlashPrice}
                  </span>
                </div>
              </div>

              {/* 4. Duration, Warranty, Stock & Delivery Mode */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-black text-black mb-1 flex items-center justify-between">
                    <span>{isRtl ? 'مدة الاشتراك' : 'Duration'}</span>
                  </label>
                  <select
                    value={subscriptionDuration}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2 text-xs font-black text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
                  >
                    <option value="1 Month">1 Month (1 شهر)</option>
                    <option value="3 Months">3 Months (3 أشهر)</option>
                    <option value="6 Months">6 Months (6 أشهر)</option>
                    <option value="1 Year">1 Year (1 سنة)</option>
                    <option value="18 Months">18 Months (18 شهر)</option>
                    <option value="2 Years">2 Years (2 سنة)</option>
                    <option value="Lifetime">Lifetime (مدى الحياة)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-black mb-1 flex items-center justify-between">
                    <span>{isRtl ? 'فترة الضمان' : 'Warranty'}</span>
                    <span className="text-[9px] text-[#06D6A0] font-mono bg-black px-1 rounded">مطابق</span>
                  </label>
                  <input
                    type="text"
                    value={warrantyDuration}
                    onChange={(e) => setWarrantyDuration(e.target.value)}
                    placeholder={subscriptionDuration}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2 text-xs font-black text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-black mb-1">{at.colStock}</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2 text-xs font-mono font-black text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-black mb-1">{isRtl ? 'التسليم' : 'Delivery'}</label>
                  <select
                    value={deliveryMode}
                    onChange={(e) => setDeliveryMode(e.target.value as any)}
                    className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2 text-xs font-black text-black outline-none shadow-[1.5px_1.5px_0px_0px_#000]"
                  >
                    <option value="key">Digital Key</option>
                    <option value="pre_assigned">Pre-assigned Account</option>
                    <option value="telegram">Telegram Bot</option>
                    <option value="zelenka_api">Zelenka API</option>
                  </select>
                </div>
              </div>

              {/* 5. Arabic Description (Single Clean Textarea + Magic AI Button) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-black">
                    {isRtl ? 'وصف المنتج (عربي)' : 'Description'}
                  </label>
                  <button
                    type="button"
                    disabled={isGeneratingDesc}
                    onClick={handleAutoGenerateDescription}
                    className="px-2.5 py-1 bg-[#B892FF] hover:bg-[#a77dfb] border-2 border-black rounded-lg text-[10px] font-black text-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingDesc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{isRtl ? 'صياغة ذكية بالـ AI (الوصف + المميزات + السمات)' : 'AI Generate All'}</span>
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  placeholder={isRtl ? 'اكتب وصف المنتج بالعربي (أو اضغط على زر الصياغة الذكية لتوليد الوصف والمميزات بالـ AI)...' : 'Enter Arabic description...'}
                  className="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-2.5 text-xs font-bold text-black outline-none shadow-[2px_2px_0px_0px_#000] resize-none leading-relaxed"
                />
              </div>

              {/* 5b. Smart Advantages (المميزات الذكية) */}
              <div className="p-3 rounded-2xl bg-[#FFFDF9] border-2 border-black shadow-[3px_3px_0px_0px_#000] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-black flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#06D6A0] stroke-[2.5]" />
                    <span>{isRtl ? 'مميزات المنتج الذكية (تظهر داخل صفحة المنتج)' : 'Smart Product Advantages'}</span>
                  </label>
                  <span className="text-[10px] font-mono font-black text-neutral-600">
                    {advantagesAr.length} {isRtl ? 'مميزات' : 'items'}
                  </span>
                </div>

                {/* List of advantages */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {advantagesAr.length > 0 ? (
                    advantagesAr.map((adv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-black/30 text-xs font-bold text-neutral-800"
                      >
                        <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
                          <span className="w-4 h-4 rounded-full bg-[#FFE600] border border-black flex items-center justify-center text-[9px] font-black shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-[11px] truncate">{adv}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAdvantagesAr(advantagesAr.filter((_, i) => i !== idx));
                            if (advantages.length > idx) {
                              setAdvantages(advantages.filter((_, i) => i !== idx));
                            }
                          }}
                          className="text-neutral-400 hover:text-rose-600 cursor-pointer p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 rounded-lg bg-neutral-50 border border-dashed border-neutral-300 text-center text-[11px] text-neutral-500 font-bold">
                      {isRtl
                        ? 'سيتم توليد مميزات تسويقية ذكية ومخصصة للمنتج تلقائياً عند الحفظ أو الضغط على زر AI Magic'
                        : 'Smart product-specific advantages will be auto-generated on save or via AI Magic'}
                    </div>
                  )}
                </div>

                {/* Add Custom Advantage Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newAdvantageInput}
                    onChange={(e) => setNewAdvantageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newAdvantageInput.trim()) {
                          setAdvantagesAr([...advantagesAr, newAdvantageInput.trim()]);
                          setNewAdvantageInput('');
                        }
                      }
                    }}
                    placeholder={isRtl ? 'أضف ميزة جديدة واضغط Enter...' : 'Add advantage and press Enter...'}
                    className="flex-1 bg-white border border-black/40 rounded-lg p-1.5 text-xs font-bold text-black outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newAdvantageInput.trim()) {
                        setAdvantagesAr([...advantagesAr, newAdvantageInput.trim()]);
                        setNewAdvantageInput('');
                      }
                    }}
                    className="px-2.5 py-1.5 bg-[#06D6A0] hover:bg-[#05b385] border border-black rounded-lg text-xs font-black text-black cursor-pointer shadow-[1px_1px_0px_0px_#000]"
                  >
                    {isRtl ? 'إضافة' : 'Add'}
                  </button>
                </div>
              </div>

              {/* 5c. Smart External Badges / Attributes (السمات الخارجية) */}
              <div className="p-3 rounded-2xl bg-[#FFFDF9] border-2 border-black shadow-[3px_3px_0px_0px_#000] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-black flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-[#00f0ff] stroke-[2.5]" />
                    <span>{isRtl ? 'السمات والشارات الخارجية (تظهر على كارت المنتج)' : 'External Badges / Attributes'}</span>
                  </label>
                  <span className="text-[10px] font-mono font-black text-neutral-600">
                    {attributes.length} {isRtl ? 'شارات' : 'badges'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {attributes.length > 0 ? (
                    attributes.map((attr, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-black bg-white text-[11px] font-black text-black shadow-[1px_1px_0px_0px_#000]"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: attr.color || '#06D6A0' }} />
                        <span>{isRtl ? (attr.label_ar || attr.label_en) : attr.label_en}</span>
                      </span>
                    ))
                  ) : (
                    <div className="w-full p-2 rounded-lg bg-neutral-50 border border-dashed border-neutral-300 text-center text-[11px] text-neutral-500 font-bold">
                      {isRtl
                        ? `سيتم توليد شارات ذكية تلقائياً (دفع عالمي وضمان كامل المدة، ضمان ${formatLocalizedDuration(subscriptionDuration, 'ar')}، إلخ)`
                        : `Smart badges will be auto-generated (Global Pay & Full Warranty, ${formatLocalizedDuration(subscriptionDuration, 'en')} Warranty, etc.)`}
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Flash Deal (70% secret discount off real original market price) */}
              <div className="p-3 rounded-xl bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-black text-black cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFlashDeal}
                    onChange={(e) => {
                      setIsFlashDeal(e.target.checked);
                      if (e.target.checked) {
                        setFlashDealPrice(Math.round(marketPrice * 0.30 * 100) / 100);
                      }
                    }}
                    className="w-4 h-4 rounded border-2 border-black text-black focus:ring-0"
                  />
                  <span>{isRtl ? 'تفعيل كعرض فلاش ديل (صيد اليوم - خصم 70% من سعر السوق الأصلي)' : 'Set as Flash Deal (70% OFF Real Market Price)'}</span>
                </label>

                {isFlashDeal && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-black">{isRtl ? 'سعر الفلاش:' : 'Flash Price:'}</span>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        value={flashDealPrice || ''}
                        onChange={(e) => setFlashDealPrice(parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border-2 border-black rounded-lg p-1.5 ps-5 text-xs font-mono font-black text-black outline-none shadow-[1px_1px_0px_0px_#000]"
                      />
                      <span className="absolute top-1/2 -translate-y-1/2 start-1.5 text-neutral-500 font-mono font-black text-xs">$</span>
                    </div>
                    <span className="text-[10px] font-mono font-black bg-[#06D6A0] text-black px-1.5 py-0.5 rounded border border-black">
                      -70% OFF
                    </span>
                  </div>
                )}
              </div>

              {/* 7. Footer Action */}
              <div className="pt-3 border-t-2 border-black space-y-3">
                {modalError && (
                  <div className="p-3 rounded-xl bg-[#FF6B6B] border-2 border-black text-black font-black text-xs shadow-[2px_2px_0px_0px_#000] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 stroke-[2.5] flex-shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-neutral-100 border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                  >
                    {at.cancel}
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-[#06D6A0] hover:bg-[#05b385] border-2 border-black rounded-xl text-xs font-black text-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isRtl ? 'جاري الحفظ...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                        <span>{editingId ? (isRtl ? 'حفظ وتحديث المنتج' : 'Save Changes') : (isRtl ? 'إضافة ونشر المنتج فوراً' : 'Publish Product')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Serper Image Picker & Supabase Vault Modal */}
      <SerperImagePickerModal
        isOpen={isSerperModalOpen}
        onClose={() => setIsSerperModalOpen(false)}
        onSelectImage={handleImageSelectedDirectly}
        productId={editingId}
        initialQuery={nameAr || name || 'Google Gemini AI'}
        initialTab={serperModalTab}
        isRtl={isRtl}
      />

    </div>
  );
};
