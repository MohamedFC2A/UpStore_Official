'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  Loader2, 
  Ticket, 
  ExternalLink, 
  Headset, 
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  timestamp: string;
}

const DEFAULT_QUESTIONS = [
  { ar: 'كيف أستبدل حسابي تحت الضمان؟', en: 'How to claim warranty replacement?' },
  { ar: 'أين أجد بيانات الدخول والترخيص؟', en: 'Where can I find my credentials?' },
  { ar: 'كيف أشحن رصيد المحفظة؟', en: 'How do I top up my wallet?' },
  { ar: 'ما هي طرق الدفع المتاحة؟', en: 'What payment methods are supported?' },
];

interface AiSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTicketWithDraft?: (draft: { subject: string; message: string; category: string }) => void;
  userProfile?: any;
}

export function AiSupportModal({
  isOpen,
  onClose,
  onOpenTicketWithDraft,
  userProfile,
}: AiSupportModalProps) {
  const { language } = useLocale();
  const isAr = language === 'ar';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: isAr
        ? 'مرحباً بك! أنا مساعد UpStore الذكي للدعم الفني 🤖. يسعدني مساعدتك في أي استفسار حول طلباتك، التراخيص، تفعيل الحسابات، سياسة الضمان، أو شحن المحفظة. كيف يمكنني خدمتك اليوم؟'
        : 'Hello! I am your UpStore AI Support Assistant 🤖. How can I help you today with your orders, licenses, warranty, or wallet?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text,
      }));

      const res = await fetch('/api/support/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const replyText = data.reply || (isAr ? 'يسعدنا دائماً خدمتك عبر support@upstore.one' : 'Contact support@upstore.one anytime.');

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: isAr
            ? 'حدث ضغط مؤقت على الخوادم. يمكنك مراسلتنا مباشرة على support@upstore.one أو تيليجرام @upstore_one_bot وسنرد فوراً.'
            : 'Service busy. Please contact support@upstore.one or Telegram @upstore_one_bot.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToTicket = (lastUserMsgText: string, lastAiMsgText: string) => {
    if (onOpenTicketWithDraft) {
      onOpenTicketWithDraft({
        subject: lastUserMsgText.slice(0, 60),
        message: `استفسار / مشكلة مقدمة عبر البوت الذكي:\n\nسؤال العميل:\n${lastUserMsgText}\n\nتشخيص البوت الذكي المبدئي:\n${lastAiMsgText}`,
        category: 'ضمان واستبدال المنتج',
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-white border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_#000] flex flex-col h-[620px] max-h-[90vh] overflow-hidden text-black"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b-2 border-black bg-[#FFE600] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-[#FFE600] flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <Bot className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-black leading-tight">
                  {isAr ? 'بوت الدعم الذكي الفوري (UpStore AI)' : 'UpStore AI Smart Support'}
                </h3>
                <span className="px-2 py-0.5 bg-[#06D6A0] text-black text-[9px] font-black rounded-md border border-black flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  <span>ONLINE 24/7</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-800 font-bold">
                {isAr ? 'إجابات فورية وتشخيص مباشر • البريد الرسمي: support@upstore.one' : 'Instant AI troubleshooting & direct warranty support'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border-2 border-black flex items-center justify-center text-black hover:bg-neutral-100 shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-[#FFFDF9]">
          {messages.map((m) => {
            const isBot = m.role === 'assistant';
            return (
              <div
                key={m.id}
                className={`flex gap-3 text-start ${isBot ? 'items-start' : 'items-end flex-row-reverse'}`}
              >
                {isBot && (
                  <div className="w-8 h-8 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                    <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 text-xs font-bold leading-relaxed border-2 border-black shadow-[3px_3px_0px_0px_#000] ${
                    isBot
                      ? 'bg-white text-black'
                      : 'bg-[#4CC9F0] text-black font-black'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <div
                    className={`text-[9px] font-mono font-bold mt-1.5 ${
                      isBot ? 'text-neutral-500' : 'text-neutral-900'
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shrink-0">
                <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
              </div>
              <div className="bg-white border-2 border-black rounded-2xl px-4 py-2.5 shadow-[2px_2px_0px_0px_#000] text-xs font-black text-black flex items-center gap-2">
                <span>{isAr ? 'جاري التفكير وصياغة الحل...' : 'Thinking...'}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t-2 border-black flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {DEFAULT_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => handleSendMessage(isAr ? q.ar : q.en)}
              className="px-3 py-1.5 rounded-xl bg-[#FFFDF9] hover:bg-[#FFE600] border border-black text-[11px] font-black whitespace-nowrap transition-colors cursor-pointer shadow-[1px_1px_0px_0px_#000] shrink-0"
            >
              {isAr ? q.ar : q.en}
            </button>
          ))}
        </div>

        {/* Chat Input & Action Bar */}
        <div className="p-3 sm:p-4 bg-white border-t-2 border-black shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isAr ? 'اكتب استفسارك أو مشكلتك هنا...' : 'Type your question here...'}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#FFFDF9] border-2 border-black rounded-xl text-xs font-bold text-black outline-none shadow-[2px_2px_0px_0px_#000]"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-[#06D6A0] hover:bg-[#05b385] text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 stroke-[2.5]" />}
              <span className="hidden sm:inline">{isAr ? 'إرسال' : 'Send'}</span>
            </button>
          </form>

          {/* Bottom Shortcuts */}
          <div className="flex items-center justify-between mt-2.5 text-[11px] font-bold text-neutral-700">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-black stroke-[2.5]" />
              <span>{isAr ? 'دعم رسمي معتمد: support@upstore.one' : 'Official support: support@upstore.one'}</span>
            </span>

            <a
              href="https://t.me/upstore_one_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black font-black hover:underline flex items-center gap-1"
            >
              <span>{isAr ? 'تيليجرام الفوري' : 'Telegram Bot'}</span>
              <ExternalLink className="w-3 h-3 stroke-[2.5]" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
