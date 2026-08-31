'use client';

import React from 'react';
import { 
  Check, Zap, ShieldCheck, Sparkles, 
  CheckCircle2, Layers
} from 'lucide-react';

interface ProductDescriptionRendererProps {
  content: string;
  isArabic?: boolean;
  className?: string;
}

// ─── Text Formatter Helper ──────────────────────────────────────────────────

function stripEmojis(text: string): string {
  if (!text) return '';
  return text.trim();
}

// ─── Inline Markdown Formatter (Bolds, Highlights, Badges) ────────────────────

function formatInlineText(text: string): React.ReactNode[] {
  if (!text) return [];

  const clean = stripEmojis(text);

  // Match **bold** tokens
  const parts = clean.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2).trim();
      return (
        <strong key={idx} className="font-black text-black">
          {inner}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

// ─── Section Parser & Structured Visual Component ─────────────────────────────

interface ParsedSection {
  type: 'intro' | 'features' | 'delivery' | 'warranty' | 'faq' | 'generic';
  title?: string;
  items: string[];
}

function parseMarkdownDescription(content: string): ParsedSection[] {
  if (!content || !content.trim()) return [];

  const rawLines = content.split('\n');
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection = {
    type: 'intro',
    items: [],
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    // Detect Header (### or ## or #)
    if (line.startsWith('#')) {
      if (currentSection.items.length > 0 || currentSection.title) {
        sections.push(currentSection);
      }

      const cleanHeader = stripEmojis(line.replace(/^#+\s*/, '').trim());
      const lower = cleanHeader.toLowerCase();
      let type: ParsedSection['type'] = 'generic';

      if (lower.includes('يشمل') || lower.includes('مميزات') || lower.includes('features') || lower.includes('included') || lower.includes('مواصفات')) {
        type = 'features';
      } else if (lower.includes('تفعيل') || lower.includes('تسليم') || lower.includes('delivery') || lower.includes('activation') || lower.includes('كيفية')) {
        type = 'delivery';
      } else if (lower.includes('ضمان') || lower.includes('warranty') || lower.includes('guarantee') || lower.includes('أمان')) {
        type = 'warranty';
      } else if (lower.includes('أسئلة') || lower.includes('faq') || lower.includes('شائع')) {
        type = 'faq';
      }

      currentSection = {
        type,
        title: cleanHeader,
        items: [],
      };
      continue;
    }

    // Detect Bullet Points (- or * or • or number.)
    if (/^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const cleanItem = stripEmojis(line.replace(/^[-*•\d.]+\s*/, '').trim());
      if (cleanItem) {
        currentSection.items.push(cleanItem);
      }
    } else {
      const cleanPara = stripEmojis(line);
      if (cleanPara) {
        currentSection.items.push(cleanPara);
      }
    }
  }

  if (currentSection.items.length > 0 || currentSection.title) {
    sections.push(currentSection);
  }

  return sections;
}

export function ProductDescriptionRenderer({
  content,
  isArabic = true,
  className = '',
}: ProductDescriptionRendererProps) {
  if (!content || !content.trim()) {
    return (
      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-center text-sm font-bold text-neutral-500">
        {isArabic ? 'لا يوجد وصف متاح لهذا المنتج حالياً.' : 'No description available for this product yet.'}
      </div>
    );
  }

  const sections = parseMarkdownDescription(content);

  return (
    <div className={`space-y-5 ${className} text-start`}>
      {sections.map((sec, idx) => {
        // ── 1. Intro Lead Section ──
        if (sec.type === 'intro' && !sec.title) {
          return (
            <div 
              key={idx} 
              className="p-5 rounded-2xl bg-[#FFFDF9] border-2 border-black shadow-[3px_3px_0px_0px_#000] text-sm sm:text-base font-bold text-neutral-800 leading-relaxed space-y-3"
            >
              {sec.items.map((item, itemIdx) => (
                <p key={itemIdx} className="leading-relaxed">
                  {formatInlineText(item)}
                </p>
              ))}
            </div>
          );
        }

        // ── 2. Features & What's Included ──
        if (sec.type === 'features') {
          return (
            <div 
              key={idx} 
              className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] space-y-4"
            >
              <div className="flex items-center gap-2.5 border-b-2 border-black pb-3">
                <span className="w-8 h-8 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black font-black text-sm shadow-[1.5px_1.5px_0px_0px_#000] flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-black stroke-[2.5]" />
                </span>
                <h3 className="text-base sm:text-lg font-black text-black tracking-tight">
                  {sec.title || (isArabic ? 'ماذا يشمل هذا الاشتراك؟' : 'What is Included?')}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {sec.items.map((item, itemIdx) => (
                  <div 
                    key={itemIdx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FFFDF9] border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:bg-neutral-50 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-lg bg-[#06D6A0] border border-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[1px_1px_0px_0px_#000]">
                      <Check className="w-3 h-3 text-black stroke-[3.5]" />
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-neutral-800 leading-snug">
                      {formatInlineText(item)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // ── 3. Delivery & Instant Activation Box ──
        if (sec.type === 'delivery') {
          return (
            <div 
              key={idx} 
              className="p-5 sm:p-6 rounded-2xl bg-[#FFE600] border-2 border-black shadow-[4px_4px_0px_0px_#000] space-y-3.5"
            >
              <div className="flex items-center gap-2.5 border-b-2 border-black pb-3">
                <span className="w-8 h-8 rounded-xl bg-white border-2 border-black flex items-center justify-center text-black font-black text-sm shadow-[1.5px_1.5px_0px_0px_#000] flex-shrink-0">
                  <Zap className="w-4 h-4 text-black stroke-[2.5] fill-black" />
                </span>
                <h3 className="text-base sm:text-lg font-black text-black tracking-tight">
                  {sec.title || (isArabic ? 'التفعيل وتسليم الطلب' : 'Order Activation & Delivery')}
                </h3>
                <span className="ms-auto text-[10px] font-mono font-black bg-black text-white px-2.5 py-1 rounded-full border border-black uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-white" />
                  <span>{isArabic ? 'تسليم آلي مباشر' : 'Auto Delivery'}</span>
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {sec.items.map((item, itemIdx) => (
                  <div 
                    key={itemIdx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                  >
                    <div className="w-5 h-5 rounded-full bg-[#FFE600] border border-black flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-mono font-black text-black shadow-[1px_1px_0px_0px_#000]">
                      {itemIdx + 1}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug">
                      {formatInlineText(item)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // ── 4. Warranty & Guarantee Trust Shield ──
        if (sec.type === 'warranty') {
          return (
            <div 
              key={idx} 
              className="p-5 sm:p-6 rounded-2xl bg-[#06D6A0] border-2 border-black shadow-[4px_4px_0px_0px_#000] space-y-3.5"
            >
              <div className="flex items-center gap-2.5 border-b-2 border-black pb-3">
                <span className="w-8 h-8 rounded-xl bg-white border-2 border-black flex items-center justify-center text-black font-black text-sm shadow-[1.5px_1.5px_0px_0px_#000] flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
                </span>
                <h3 className="text-base sm:text-lg font-black text-black tracking-tight">
                  {sec.title || (isArabic ? 'ضمان UpStore الشامل' : 'UpStore Comprehensive Warranty')}
                </h3>
                <span className="ms-auto text-[10px] font-black bg-white text-black px-2.5 py-0.5 rounded-full border border-black shadow-[1px_1px_0px_0px_#000]">
                  {isArabic ? 'ضمان 100% رسمي' : '100% Guaranteed'}
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {sec.items.map((item, itemIdx) => (
                  <div 
                    key={itemIdx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5] flex-shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug">
                      {formatInlineText(item)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // ── 5. Generic / Other Custom Sections ──
        return (
          <div 
            key={idx} 
            className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] space-y-3"
          >
            {sec.title && (
              <div className="flex items-center gap-2 border-b-2 border-black pb-3">
                <span className="w-7 h-7 rounded-lg bg-[#4CC9F0] border border-black flex items-center justify-center text-sm">
                  <Layers className="w-4 h-4 text-black stroke-[2]" />
                </span>
                <h3 className="text-base sm:text-lg font-black text-black">
                  {sec.title}
                </h3>
              </div>
            )}

            <div className="space-y-2.5 text-xs sm:text-sm font-bold text-neutral-800 leading-relaxed">
              {sec.items.map((item, itemIdx) => (
                <div 
                  key={itemIdx}
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FFFDF9] border border-black/30"
                >
                  <span className="text-black font-black">•</span>
                  <div className="leading-snug">{formatInlineText(item)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ProductDescriptionRenderer;
