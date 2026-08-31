'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ImageIcon,
  Loader2,
  Check,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Layers,
  Download,
  Trash2,
  FolderOpen,
  Upload,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { useToastStore } from '@/store/useToastStore';

export interface SerperImageItem {
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  previewUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  source?: string;
  domain?: string;
  link?: string;
  isPng?: boolean;
}

export interface VaultImageItem {
  id: string;
  name: string;
  url: string;
  size?: number;
  createdAt: string;
  updatedAt?: string;
  isLocalAsset?: boolean;
  linkedProducts: {
    id: string;
    name: string;
    name_ar?: string;
    slug?: string;
  }[];
}

export interface SerperImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (importedUrl: string) => void;
  productId?: string | null;
  initialQuery?: string;
  isRtl?: boolean;
  initialTab?: 'search' | 'vault';
}

const QUICK_SUGGESTIONS = [
  { label: 'Google Gemini', query: 'Google Gemini AI' },
  { label: 'ChatGPT Plus', query: 'ChatGPT Plus OpenAI' },
  { label: 'CapCut Pro', query: 'CapCut Pro' },
  { label: 'Cursor AI', query: 'Cursor AI' },
  { label: 'Canva Pro', query: 'Canva Pro' },
  { label: 'Netflix 4K', query: 'Netflix logo' },
  { label: 'Spotify Premium', query: 'Spotify' },
  { label: 'Discord Nitro', query: 'Discord Nitro' },
  { label: 'NordVPN', query: 'NordVPN' },
  { label: 'Xbox Game Pass', query: 'Xbox Game Pass' },
];

export const SerperImagePickerModal: React.FC<SerperImagePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  productId,
  initialQuery = '',
  isRtl = true,
  initialTab = 'search',
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'vault'>(initialTab);

  // Search Tab State
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [images, setImages] = useState<SerperImageItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [searchError, setSearchError] = useState('');
  const [detectedBrand, setDetectedBrand] = useState('');

  // Vault Tab State
  const [vaultImages, setVaultImages] = useState<VaultImageItem[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [deletingImage, setDeletingImage] = useState<VaultImageItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [uploadingToVault, setUploadingToVault] = useState(false);

  // Fetch Serper Images with Gemini Flash
  const fetchImages = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) return;

    setLoadingSearch(true);
    setSearchError('');
    try {
      const res = await fetch('/api/admin/ai/search-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to search images');
      }

      if (Array.isArray(data.images)) {
        setImages(data.images);
      } else {
        setImages([]);
      }
      if (data.brand) {
        setDetectedBrand(data.brand);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Error fetching images');
      setImages([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  // Fetch Supabase Vault Images
  const fetchVaultImages = async () => {
    setLoadingVault(true);
    try {
      const res = await fetch('/api/admin/images/vault', {
        method: 'GET',
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.images)) {
        setVaultImages(data.images);
      } else {
        setVaultImages([]);
      }
    } catch (err: any) {
      console.error('[Vault Fetch Error]:', err);
    } finally {
      setLoadingVault(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery(initialQuery);
      if (initialQuery.trim()) {
        fetchImages(initialQuery);
      } else {
        fetchImages('Google Gemini AI');
      }
      fetchVaultImages();
    }
  }, [isOpen, initialQuery, initialTab]);

  // Handle Image Selection from Serper
  const handleSelectSerperImage = async (imgItem: SerperImageItem) => {
    setImportingUrl(imgItem.imageUrl);
    setSelectedUrl(imgItem.imageUrl);

    try {
      // 1. Download & upload directly to Supabase Storage
      const res = await fetch('/api/admin/ai/import-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imgItem.imageUrl,
          productId: productId || undefined,
        }),
      });
      const data = await res.json();
      const finalUrl = (data && data.url) ? data.url : imgItem.imageUrl;

      // 2. Apply final URL & notify
      onSelectImage(finalUrl);
      useToastStore
        .getState()
        .success(
          isRtl ? 'تم حفظ وتطبيق صورة المنتج بنجاح في Supabase!' : 'Product image saved to Supabase!',
          imgItem.title || 'Product Image'
        );
      onClose();
    } catch (err: any) {
      console.error('[Import Image Error]:', err);
      // Fallback
      onSelectImage(imgItem.imageUrl);
      onClose();
    } finally {
      setImportingUrl(null);
    }
  };

  // Handle Image Selection from Vault
  const handleSelectVaultImage = (item: VaultImageItem) => {
    onSelectImage(item.url);
    useToastStore
      .getState()
      .success(isRtl ? 'تم اختيار الصورة من المخزون بنجاح!' : 'Image selected from vault!', item.name);
    onClose();
  };

  // Handle Direct File Upload into Supabase Vault
  const handleUploadToVault = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingToVault(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-product-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to upload image');

      useToastStore
        .getState()
        .success(isRtl ? 'تم رفع الصورة وحفظها في المخزون بنجاح!' : 'Image uploaded to vault!');
      fetchVaultImages();
    } catch (err: any) {
      useToastStore.getState().error(isRtl ? 'فشل رفع الصورة' : 'Upload failed', err.message);
    } finally {
      setUploadingToVault(false);
    }
  };

  // Handle Permanent Image Deletion from Vault
  const handleConfirmDelete = async (force: boolean = false) => {
    if (!deletingImage) return;

    setIsDeleting(true);
    setDeleteWarning(null);

    try {
      const res = await fetch('/api/admin/images/vault', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: deletingImage.name,
          url: deletingImage.url,
          force,
        }),
      });

      const data = await res.json();

      if (data.warning && !force) {
        setDeleteWarning(data.message);
        setIsDeleting(false);
        return;
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete image');
      }

      useToastStore
        .getState()
        .success(
          isRtl ? 'تم حذف الصورة نهائياً من مخزون Supabase!' : 'Image permanently deleted from Supabase Storage!'
        );

      setDeletingImage(null);
      setDeleteWarning(null);
      fetchVaultImages();
    } catch (err: any) {
      useToastStore.getState().error(isRtl ? 'فشل حذف الصورة' : 'Deletion failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredVaultImages = vaultImages.filter((img) => {
    if (!vaultSearchQuery.trim()) return true;
    const q = vaultSearchQuery.toLowerCase();
    return (
      img.name.toLowerCase().includes(q) ||
      img.linkedProducts.some(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.name_ar && p.name_ar.toLowerCase().includes(q))
      )
    );
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_#000] overflow-hidden"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Top Header */}
          <div className="p-4 sm:p-5 bg-[#FFE600] border-b-4 border-black flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                <ImageIcon className="w-5 h-5 text-black stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-black leading-tight flex items-center gap-2">
                  <span>{isRtl ? 'استوديو ومخزون صور المنتجات الذكي' : 'Product Images & Vault Studio'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-black text-[#FFE600] text-[10px] font-mono font-black uppercase">
                    Gemini 2.5 Flash + Supabase
                  </span>
                </h3>
                <p className="text-xs font-bold text-neutral-800">
                  {isRtl
                    ? 'بحث إجباري عن صور PNG شفافة ومخزون سحابي لجميع صور المنتجات مع الحذف الذكي'
                    : 'High-res transparent PNG search & Supabase image vault with safe deletion'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black shadow-[2px_2px_0px_0px_#000] text-black font-black active:translate-x-0.5 active:translate-y-0.5 transition-transform cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex border-b-2 border-black bg-neutral-100 p-2 gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2.5 px-4 rounded-xl border-2 border-black text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000] ${
                activeTab === 'search'
                  ? 'bg-[#FFE600] text-black'
                  : 'bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>{isRtl ? '🔍 بحث Serper الذكي (Gemini AI + PNG)' : '🔍 Serper PNG Search (Gemini AI)'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('vault');
                fetchVaultImages();
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl border-2 border-black text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000] ${
                activeTab === 'vault'
                  ? 'bg-[#06D6A0] text-black'
                  : 'bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <FolderOpen className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isRtl
                  ? `🗄️ مخزون صور Supabase (${vaultImages.length})`
                  : `🗄️ Supabase Vault (${vaultImages.length})`}
              </span>
            </button>
          </div>

          {/* ─── TAB 1: SERPER AI SEARCH ────────────────────────────────────────── */}
          {activeTab === 'search' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search & Suggestions */}
              <div className="p-4 bg-[#FFFDF9] border-b-2 border-black space-y-3 flex-shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchImages(searchQuery);
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        isRtl
                          ? 'اكتب اسم الخدمة أو المنتج (مثال: Gemini AI, Cursor, CapCut, Canva)...'
                          : 'Search product brand (e.g. Gemini AI, Cursor, CapCut, Canva)...'
                      }
                      className="w-full bg-white border-2 border-black rounded-2xl p-3 ps-10 text-xs sm:text-sm font-black text-black outline-none shadow-[3px_3px_0px_0px_#000]"
                    />
                    <Search className="w-4 h-4 text-neutral-400 absolute top-1/2 -translate-y-1/2 start-3.5 stroke-[2.5]" />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingSearch}
                    className="px-5 py-3 bg-[#FFE600] hover:bg-[#FFD600] border-2 border-black rounded-2xl text-xs sm:text-sm font-black text-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loadingSearch ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>{isRtl ? 'بحث ذكي' : 'AI Search'}</span>
                  </button>
                </form>

                {/* Quick Suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-black text-neutral-600 me-1">
                    {isRtl ? 'اقتراحات سريعة:' : 'Quick Searches:'}
                  </span>
                  {QUICK_SUGGESTIONS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setSearchQuery(item.query);
                        fetchImages(item.query);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-[#FFE600] border border-black rounded-lg text-[11px] font-black text-black shadow-[1px_1px_0px_0px_#000] transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Serper Results Grid */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto min-h-[300px]">
                {loadingSearch ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3 text-neutral-600">
                    <Loader2 className="w-8 h-8 animate-spin text-black stroke-[2.5]" />
                    <span className="text-xs font-black text-black">
                      {isRtl
                        ? 'جاري فحص وتوليد الكلمات الدلالية عبر Gemini Flash وجلب صور PNG عالية الدقة...'
                        : 'Gemini Flash reasoning & searching transparent high-res PNGs via Serper...'}
                    </span>
                  </div>
                ) : searchError ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-500 text-rose-700 text-xs font-bold text-center">
                    {searchError}
                  </div>
                ) : images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-2 text-neutral-400">
                    <ImageIcon className="w-12 h-12 stroke-[1.5]" />
                    <span className="text-xs font-bold text-neutral-600">
                      {isRtl ? 'لم يتم العثور على صور. جرب كلمات بحث أخرى.' : 'No images found. Try different search terms.'}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {images.map((img, idx) => (
                      <div
                        key={img.imageUrl + idx}
                        className="group relative rounded-2xl border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_#000] flex flex-col justify-between hover:-translate-y-1 transition-all"
                      >
                        {/* Image Preview Box */}
                        <div className="w-full h-32 rounded-xl bg-neutral-50/70 border border-black/20 flex items-center justify-center p-2 overflow-hidden relative mb-2.5">
                          <img
                            src={img.thumbnailUrl || img.imageUrl}
                            alt={img.title || 'Product Image'}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          {img.isPng && (
                            <span className="absolute top-1.5 start-1.5 px-1.5 py-0.5 rounded-md bg-[#06D6A0] text-black text-[9px] font-mono font-black border border-black shadow-[1px_1px_0px_0px_#000]">
                              PNG
                            </span>
                          )}
                          {img.imageWidth && img.imageHeight && (
                            <span className="absolute bottom-1.5 end-1.5 px-1.5 py-0.5 rounded-md bg-black/80 text-white text-[9px] font-mono font-bold">
                              {img.imageWidth}x{img.imageHeight}
                            </span>
                          )}
                        </div>

                        {/* Title & Domain */}
                        <div className="space-y-1 mb-3">
                          <p className="text-[11px] font-black text-black line-clamp-1 leading-snug" title={img.title}>
                            {img.title}
                          </p>
                          <p className="text-[10px] font-bold text-neutral-500 line-clamp-1">
                            {img.domain || img.source || 'Web'}
                          </p>
                        </div>

                        {/* Select Button */}
                        <button
                          type="button"
                          disabled={importingUrl === img.imageUrl}
                          onClick={() => handleSelectSerperImage(img)}
                          className="w-full py-2 px-2.5 rounded-xl border-2 border-black font-black text-[11px] shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-black hover:bg-neutral-800 text-white disabled:opacity-75"
                        >
                          {importingUrl === img.imageUrl ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>{isRtl ? 'جاري الرفع والحفظ...' : 'Saving...'}</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>{isRtl ? 'اختيار هذه الصورة' : 'Select Image'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 2: SUPABASE PRODUCT IMAGES VAULT ───────────────────────────── */}
          {activeTab === 'vault' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Vault Filter & Upload Bar */}
              <div className="p-4 bg-[#FFFDF9] border-b-2 border-black flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={vaultSearchQuery}
                    onChange={(e) => setVaultSearchQuery(e.target.value)}
                    placeholder={
                      isRtl
                        ? 'تصفية صور المخزون بالاسم أو اسم المنتج المرتبط...'
                        : 'Filter vault images by name or linked product...'
                    }
                    className="w-full bg-white border-2 border-black rounded-2xl p-2.5 ps-9 text-xs sm:text-sm font-black text-black outline-none shadow-[2px_2px_0px_0px_#000]"
                  />
                  <Search className="w-4 h-4 text-neutral-400 absolute top-1/2 -translate-y-1/2 start-3 stroke-[2.5]" />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={fetchVaultImages}
                    disabled={loadingVault}
                    className="p-2.5 bg-white hover:bg-neutral-50 border-2 border-black rounded-xl text-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                    title={isRtl ? 'تحديث المخزون' : 'Refresh Vault'}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingVault ? 'animate-spin' : ''}`} />
                  </button>

                  <label className="flex-1 sm:flex-none px-4 py-2.5 bg-[#06D6A0] hover:bg-[#05b888] border-2 border-black rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer">
                    {uploadingToVault ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isRtl ? 'جاري الرفع...' : 'Uploading...'}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 stroke-[2.5]" />
                        <span>{isRtl ? 'رفع صورة جديدة للمخزون' : 'Upload to Vault'}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadToVault}
                      disabled={uploadingToVault}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Vault Images Grid */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto min-h-[300px]">
                {loadingVault ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3 text-neutral-600">
                    <Loader2 className="w-8 h-8 animate-spin text-black stroke-[2.5]" />
                    <span className="text-xs font-black text-black">
                      {isRtl ? 'جاري جلب صور المخزون من Supabase Storage...' : 'Fetching Supabase Storage images...'}
                    </span>
                  </div>
                ) : filteredVaultImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-2 text-neutral-400">
                    <FolderOpen className="w-12 h-12 stroke-[1.5]" />
                    <span className="text-xs font-bold text-neutral-600">
                      {isRtl ? 'لا توجد صور في المخزون مطابقة للبحث.' : 'No images found in Supabase vault.'}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {filteredVaultImages.map((vaultItem) => {
                      const isUsed = vaultItem.linkedProducts && vaultItem.linkedProducts.length > 0;

                      return (
                        <div
                          key={vaultItem.id}
                          className="group relative rounded-2xl border-2 border-black bg-white p-3 shadow-[3px_3px_0px_0px_#000] flex flex-col justify-between hover:-translate-y-1 transition-all"
                        >
                          {/* Image Thumbnail */}
                          <div className="w-full h-32 rounded-xl bg-neutral-50/70 border border-black/20 flex items-center justify-center p-2 overflow-hidden relative mb-2">
                            <img
                              src={vaultItem.url}
                              alt={vaultItem.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                            {vaultItem.isLocalAsset ? (
                              <span className="absolute top-1.5 start-1.5 px-1.5 py-0.5 rounded-md bg-[#FFE600] text-black text-[9px] font-black border border-black shadow-[1px_1px_0px_0px_#000]">
                                LOCAL
                              </span>
                            ) : (
                              <span className="absolute top-1.5 start-1.5 px-1.5 py-0.5 rounded-md bg-[#06D6A0] text-black text-[9px] font-black border border-black shadow-[1px_1px_0px_0px_#000]">
                                SUPABASE
                              </span>
                            )}
                          </div>

                          {/* Info & Linked Products Tag */}
                          <div className="space-y-1 mb-2.5">
                            <p className="text-[11px] font-black text-black line-clamp-1" title={vaultItem.name}>
                              {vaultItem.name}
                            </p>
                            {isUsed ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-500 text-emerald-800 text-[9px] font-black line-clamp-1">
                                {isRtl ? 'مستخدم في: ' : 'Used in: '}
                                {vaultItem.linkedProducts.map((p) => p.name_ar || p.name).join(', ')}
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 text-[9px] font-bold">
                                {isRtl ? 'غير مرتبط بمنتج حالياً' : 'Unlinked'}
                              </span>
                            )}
                          </div>

                          {/* Actions: Select & Permanent Delete */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectVaultImage(vaultItem)}
                              className="flex-1 py-1.5 px-2 bg-black hover:bg-neutral-800 text-white rounded-xl border-2 border-black font-black text-[10px] shadow-[1.5px_1.5px_0px_0px_#000] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>{isRtl ? 'اختيار' : 'Select'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDeletingImage(vaultItem);
                                setDeleteWarning(null);
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 border-2 border-rose-600 text-rose-600 rounded-xl shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer transition-colors"
                              title={isRtl ? 'حذف نهائي من المخزون' : 'Delete permanently'}
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delete Confirmation Sub-Modal */}
          <AnimatePresence>
            {deletingImage && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-md bg-white border-4 border-black rounded-2xl p-5 shadow-[6px_6px_0px_0px_#000] space-y-4"
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 border-2 border-rose-600 flex items-center justify-center text-rose-600 flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-black">
                        {isRtl ? 'تأكيد الحذف النهائي من مخزون Supabase' : 'Confirm Permanent Deletion'}
                      </h4>
                      <p className="text-xs text-neutral-600 font-bold">{deletingImage.name}</p>
                    </div>
                  </div>

                  {deleteWarning ? (
                    <div className="p-3 bg-amber-50 border-2 border-amber-500 rounded-xl text-amber-800 text-xs font-bold space-y-1.5">
                      <p>{deleteWarning}</p>
                      <p className="text-[11px] text-amber-700">
                        {isRtl
                          ? 'في حال الحذف سيتم تفريغ رابط الصورة من المنتجات المرتبطة تلقائياً.'
                          : 'Linked products image URLs will be cleared.'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-700 font-bold">
                      {isRtl
                        ? 'سيتم حذف هذا الملف من سحابة Supabase Storage نهائياً ولا يمكن التراجع عن هذا الإجراء.'
                        : 'This file will be permanently removed from Supabase Storage.'}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleConfirmDelete(!!deleteWarning)}
                      className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl border-2 border-black font-black text-xs shadow-[2px_2px_0px_0px_#000] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 stroke-[2.5]" />
                      )}
                      <span>
                        {deleteWarning
                          ? isRtl
                            ? 'نعم، احذف وحرر المنتجات'
                            : 'Force Delete & Unlink'
                          : isRtl
                          ? 'تأكيد الحذف النهائي'
                          : 'Confirm Delete'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => {
                        setDeletingImage(null);
                        setDeleteWarning(null);
                      }}
                      className="py-2.5 px-4 bg-white hover:bg-neutral-100 text-black rounded-xl border-2 border-black font-black text-xs shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Footer Bar */}
          <div className="p-3 bg-neutral-100 border-t-2 border-black flex items-center justify-between text-xs font-bold text-neutral-600 flex-shrink-0">
            <span>
              {activeTab === 'search'
                ? isRtl
                  ? `تم العثور على ${images.length} صورة PNG عالية الدقة عبر Serper & Gemini Flash`
                  : `Found ${images.length} high-res PNG images via Serper & Gemini Flash`
                : isRtl
                ? `مخزون Supabase يحتوي على ${vaultImages.length} صورة مخزنة`
                : `Supabase vault contains ${vaultImages.length} stored images`}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white border border-black rounded-lg text-black font-black text-xs hover:bg-neutral-50 shadow-[1px_1px_0px_0px_#000] cursor-pointer"
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
