'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Sparkles,
  Send,
  Zap,
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  Check,
  CheckCircle2,
  Edit2,
  Trash2,
  Undo2,
  Coins,
  Megaphone,
  Bell,
  TrendingUp,
  Eye,
  Settings as SettingsIcon,
  DollarSign,
  Flame,
  Plus,
  SlidersHorizontal,
  Terminal,
  Loader2,
  Activity,
  ArrowRight,
  ShieldAlert,
  ListOrdered,
  XCircle,
  Database,
  Cpu,
  RefreshCw,
  Copy,
  CheckCheck,
  MessageSquare,
  ChevronDown,
  Layers,
  Search,
  X,
  History,
  ChevronRight,
  Menu,
  Image as ImageIcon,
} from 'lucide-react';
import { OrderTracking, OrderTrackingStep } from '@/components/ui/order-tracking';
import { SerperImagePickerModal } from '@/components/admin/modals/SerperImagePickerModal';

export interface CopilotAction {
  tool: string;
  params: Record<string, any>;
  description: string;
  status?: 'success' | 'failed' | 'client_dispatched';
  result?: any;
  diff?: Record<string, { before: any; after: any }>;
  error?: string;
}

export interface ExecutionPlanStep {
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  timestamp?: string;
  isCompleted: boolean;
  isActive?: boolean;
}

export interface ExecutionPlanItem {
  id: string;
  name: string;
  name_ar?: string;
  action: string;
  action_ar?: string;
  details?: string;
}

export interface ExecutionPlan {
  id: string;
  title: string;
  title_ar: string;
  warning?: string;
  warning_ar?: string;
  affected_count: number;
  items: ExecutionPlanItem[];
  steps: ExecutionPlanStep[];
  actions: CopilotAction[];
  status?: 'pending_approval' | 'executing' | 'completed' | 'cancelled';
  suggested_images?: Array<{
    title: string;
    imageUrl: string;
    thumbnailUrl?: string;
    isPng?: boolean;
  }>;
  product_draft?: {
    name: string;
    name_ar: string;
    our_price: number;
    market_price?: number;
    price_egp?: number;
    price_sar?: number;
    stock: number;
    category: string;
    image_url?: string;
    subscription_duration?: string;
    warranty_duration?: string;
  };
}

export interface CopilotChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: CopilotAction[];
  plan?: ExecutionPlan | null;
  requires_confirmation?: boolean;
  suggestedPrompts?: string[];
  modelUsed?: string;
}

export interface CopilotSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: CopilotChatMessage[];
}

export interface AdminCopilotTabProps {
  products: any[];
  orders: any[];
  profiles: any[];
  siteSettings: {
    announcementText?: string;
    maintenanceMode?: boolean;
    referralBonus?: number;
    flashDealUrgencyTextAr?: string;
    flashDealUrgencyTextEn?: string;
  };
  pollinationsModel: string;
  isRtl: boolean;
  at: any;
  loadData: () => Promise<void>;
  setActiveTab: (tab: any) => void;
  setProductSearch: (query: string) => void;
  setOrderSearch: (query: string) => void;
  setUserSearch: (query: string) => void;
  handleOpenAddModal: () => void;
  handleOpenEditModal: (product: any) => void;
  outOfStockCount: number;
}

// ─── COPILOT CLEAN TYPOGRAPHY & MARKDOWN PARSER ─────────────────────────────

const parseInlineFormatting = (text: string, keyPrefix: string | number = 'inline') => {
  const parts: React.ReactNode[] = [];
  const regex = /(\*{2}[^*]+\*{2}|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const str = text.substring(lastIndex, match.index);
      parts.push(<span key={`${keyPrefix}-t-${partIdx++}`}>{str}</span>);
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`${keyPrefix}-s-${partIdx++}`} className="font-black text-black tracking-normal">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={`${keyPrefix}-c-${partIdx++}`} className="px-1.5 py-0.5 mx-0.5 rounded bg-[#FFFDF9] text-black font-mono font-black text-[11px] border border-black shadow-[1px_1px_0px_0px_#000]">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const str = text.substring(lastIndex);
    parts.push(<span key={`${keyPrefix}-t-${partIdx++}`}>{str}</span>);
  }

  return parts;
};

const sanitizeCopilotRawText = (content: string): string => {
  if (!content) return '';
  let cleaned = content.trim();

  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.reply && typeof parsed.reply === 'string') {
        return sanitizeCopilotRawText(parsed.reply);
      }
    } catch {}
  }

  cleaned = cleaned.replace(/```(?:json)?\s*[\s\S]*?```/gi, '').trim();

  if (cleaned.startsWith('{"actions"') || cleaned.startsWith('{"reply"')) {
    const firstBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && firstBrace < cleaned.length - 1) {
      cleaned = cleaned.slice(firstBrace + 1).trim();
    }
  }

  return cleaned || content;
};

const renderFormattedCopilotText = (rawContent: string) => {
  const content = sanitizeCopilotRawText(rawContent);
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];

  const flushTable = (keyPrefix: string | number) => {
    if (tableBuffer.length < 2) {
      tableBuffer.forEach((line, idx) => {
        renderedElements.push(
          <p key={`tb-p-${keyPrefix}-${idx}`} className="text-neutral-900 leading-relaxed font-bold font-sans">
            {parseInlineFormatting(line, `tb-p-${keyPrefix}-${idx}`)}
          </p>
        );
      });
      tableBuffer = [];
      return;
    }

    const headerLine = tableBuffer[0];
    const headerCells = headerLine
      .split('|')
      .map((c) => c.trim())
      .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

    const bodyLines = tableBuffer.slice(2);

    renderedElements.push(
      <div key={`table-${keyPrefix}`} className="my-3 overflow-x-auto rounded-2xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000]">
        <table className="w-full text-xs text-left rtl:text-right border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-[#FFE600] text-black font-mono font-black">
              {headerCells.map((cell, cIdx) => (
                <th key={cIdx} className="px-3.5 py-2.5 text-[11px]">
                  {parseInlineFormatting(cell, `th-${keyPrefix}-${cIdx}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black/20 font-sans">
            {bodyLines.map((rowLine, rIdx) => {
              const cells = rowLine
                .split('|')
                .map((c) => c.trim())
                .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

              return (
                <tr key={rIdx} className="hover:bg-[#FFFDF9] transition-colors">
                  {cells.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 text-neutral-900 font-bold text-xs">
                      {parseInlineFormatting(cell, `td-${keyPrefix}-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

    tableBuffer = [];
  };

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx];
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableBuffer.push(trimmed);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable(lIdx);
    }

    if (!trimmed) {
      renderedElements.push(<div key={`space-${lIdx}`} className="h-2" />);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h3 key={`h3-${lIdx}`} className="text-xs sm:text-sm font-black text-black mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#06D6A0] border border-black shrink-0" />
          <span>{trimmed.replace(/^###\s+/, '')}</span>
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      renderedElements.push(
        <div key={`h2-${lIdx}`} className="mt-3.5 mb-2">
          <span className="inline-flex items-center gap-1.5 bg-[#FFE600] px-2.5 py-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] text-black font-black text-xs sm:text-sm">
            <Zap className="w-3.5 h-3.5 fill-black stroke-black" />
            <span>{trimmed.replace(/^#+\s+/, '')}</span>
          </span>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      renderedElements.push(
        <div key={`li-${lIdx}`} className="flex items-start gap-2 ps-1.5 my-1">
          <span className="w-2 h-2 rounded-full bg-black mt-1.5 shrink-0" />
          <div className="flex-1 text-neutral-900 leading-relaxed font-bold font-sans">
            {parseInlineFormatting(itemText, `li-${lIdx}`)}
          </div>
        </div>
      );
      continue;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      renderedElements.push(
        <div key={`num-${lIdx}`} className="flex items-start gap-2 ps-1.5 my-1">
          <span className="px-2 py-0.5 rounded-md bg-[#FFE600] text-black font-mono font-black text-[11px] shrink-0 mt-0.5 border border-black shadow-[1px_1px_0px_0px_#000]">
            {numMatch[1]}
          </span>
          <div className="flex-1 text-neutral-900 leading-relaxed font-bold font-sans">
            {parseInlineFormatting(numMatch[2], `num-${lIdx}`)}
          </div>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith('> ')) {
      renderedElements.push(
        <div key={`quote-${lIdx}`} className="border-s-4 border-black ps-3.5 py-2 my-2 bg-[#FFFDF9] rounded-r-2xl text-black font-bold text-xs font-sans border-2 border-black shadow-[2px_2px_0px_0px_#000]">
          {parseInlineFormatting(trimmed.replace(/^>\s+/, ''), `quote-${lIdx}`)}
        </div>
      );
      continue;
    }

    renderedElements.push(
      <p key={`p-${lIdx}`} className="text-neutral-900 leading-relaxed font-bold font-sans">
        {parseInlineFormatting(line, `p-${lIdx}`)}
      </p>
    );
  }

  if (tableBuffer.length > 0) {
    flushTable(lines.length);
  }

  return <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed font-sans">{renderedElements}</div>;
};

// ─── ADMIN COPILOT MAIN COMPONENT ─────────────────────────────────────────────

export const AdminCopilotTab: React.FC<AdminCopilotTabProps> = ({
  products,
  orders,
  profiles,
  siteSettings,
  pollinationsModel,
  isRtl,
  at,
  loadData,
  setActiveTab,
  setProductSearch,
  setOrderSearch,
  setUserSearch,
  handleOpenAddModal,
  handleOpenEditModal,
  outOfStockCount,
}) => {
  // ── SESSIONS STATE & LOCALSTORAGE PERSISTENCE ──
  const initialDefaultSession: CopilotSession = {
    id: 'session-main',
    title: isRtl ? 'المحادثة الرئيسية' : 'Main Mission',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    messages: [
      {
        id: 'init-msg',
        role: 'assistant',
        content: isRtl
          ? 'مرحباً بك! أنا **Copilot** مساعدك الذكي في لوحة التحكم.\n\nأستطيع تنفيذ أي إجراء فوري في المتجر: **تعديل وحذف وإضافة المنتجات**، **ضبط المخزون والأسعار**، **شحن المحافظ**، **اعتماد الطلبات**، و**تحديث إعدادات الموقع** بخطط واضحة وموافقة فورية. كيف تحب أن نبدأ؟'
          : 'Welcome! I am **Copilot**, your intelligent store assistant.\n\nI can execute any operation instantly: **update products and prices**, **restock inventory**, **adjust wallets**, **approve orders**, or **create/delete products** with smart execution plans and 1-click approval. How can I assist you?',
        timestamp: '00:00',
      },
    ],
  };

  const [sessions, setSessions] = useState<CopilotSession[]>([initialDefaultSession]);
  const [activeSessionId, setActiveSessionId] = useState<string>('session-main');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Closed by default on mobile, responsive toggle
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [isQuickCommandModalOpen, setIsQuickCommandModalOpen] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [contextTab, setContextTab] = useState<'overview' | 'products' | 'orders' | 'users' | 'settings'>('overview');
  const [contextSearchQuery, setContextSearchQuery] = useState('');
  const [copiedContext, setCopiedContext] = useState(false);

  // Active session messages
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || initialDefaultSession;
  }, [sessions, activeSessionId]);

  const copilotMessages = activeSession.messages;

  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);
  const [planningStage, setPlanningStage] = useState<number>(0);
  const [commandPaletteTab, setCommandPaletteTab] = useState<'products' | 'orders' | 'marketing' | 'audit'>('products');
  const [copilotSerperModalOpen, setCopilotSerperModalOpen] = useState(false);
  const [activePlanTargetMessageId, setActivePlanTargetMessageId] = useState<string | null>(null);
  const [serperCustomSearchQuery, setSerperCustomSearchQuery] = useState('Google Gemini AI');
  const copilotChatBottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Helper to select/change image for a proposed product plan
  const handleSelectImageForPlan = (messageId: string, imageUrl: string) => {
    updateActiveSessionMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.plan) {
          const updatedActions = (msg.plan.actions || []).map((act) => {
            if (act.tool === 'create_product') {
              return {
                ...act,
                params: {
                  ...act.params,
                  image_url: imageUrl,
                },
              };
            }
            return act;
          });

          return {
            ...msg,
            plan: {
              ...msg.plan,
              actions: updatedActions,
              product_draft: msg.plan.product_draft
                ? { ...msg.plan.product_draft, image_url: imageUrl }
                : undefined,
            },
          };
        }
        return msg;
      })
    );
  };

  // Helper to adjust proposed price for a product plan
  const handleUpdatePriceForPlan = (messageId: string, newPrice: number) => {
    const validPrice = Math.max(0.1, Number(newPrice) || 1);
    const priceEgp = Math.ceil(validPrice * 53);
    const priceSar = Math.ceil(validPrice * 4);

    updateActiveSessionMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.plan) {
          const updatedActions = (msg.plan.actions || []).map((act) => {
            if (act.tool === 'create_product') {
              return {
                ...act,
                params: {
                  ...act.params,
                  our_price: validPrice,
                  price_egp: priceEgp,
                  price_sar: priceSar,
                },
                description: `إنشاء منتج ${act.params?.name_ar || act.params?.name} بسعر $${validPrice}`,
              };
            }
            return act;
          });

          return {
            ...msg,
            plan: {
              ...msg.plan,
              actions: updatedActions,
              product_draft: msg.plan.product_draft
                ? {
                    ...msg.plan.product_draft,
                    our_price: validPrice,
                    price_egp: priceEgp,
                    price_sar: priceSar,
                  }
                : undefined,
            },
          };
        }
        return msg;
      })
    );
  };

  // Load sessions from API + localStorage on mount
  useEffect(() => {
    let isCancelled = false;

    const loadSessions = async () => {
      // 1. Try localStorage first for instant rendering
      try {
        const local = localStorage.getItem('upstore_admin_copilot_sessions');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSessions(parsed);
            setActiveSessionId(parsed[0].id);
          }
        }
      } catch {}

      // 2. Fetch from backend API
      try {
        const res = await fetch('/api/admin/ai/copilot/sessions');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.sessions) && data.sessions.length > 0 && !isCancelled) {
            setSessions(data.sessions);
            setActiveSessionId(data.sessions[0].id);
            localStorage.setItem('upstore_admin_copilot_sessions', JSON.stringify(data.sessions));
          }
        }
      } catch {}
    };

    loadSessions();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Save sessions to localStorage & backend API (debounced)
  const saveSessionsDebounced = useRef<NodeJS.Timeout | null>(null);

  const updateSessionsState = (updater: (prev: CopilotSession[]) => CopilotSession[]) => {
    setSessions((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem('upstore_admin_copilot_sessions', JSON.stringify(next));
      } catch {}

      if (saveSessionsDebounced.current) clearTimeout(saveSessionsDebounced.current);
      saveSessionsDebounced.current = setTimeout(async () => {
        try {
          await fetch('/api/admin/ai/copilot/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessions: next }),
          });
        } catch {}
      }, 1500);

      return next;
    });
  };

  // Helper to update messages in active session
  const updateActiveSessionMessages = (updater: (prevMsgs: CopilotChatMessage[]) => CopilotChatMessage[]) => {
    updateSessionsState((allSessions) =>
      allSessions.map((s) => {
        if (s.id === activeSessionId) {
          const newMsgs = updater(s.messages);
          return {
            ...s,
            messages: newMsgs,
            updated_at: new Date().toISOString(),
          };
        }
        return s;
      })
    );
  };

  // Handle New Chat Session
  const handleCreateNewChat = () => {
    const newSessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newSession: CopilotSession = {
      id: newSessionId,
      title: isRtl ? `محادثة جديدة #${sessions.length + 1}` : `New Chat #${sessions.length + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [
        {
          id: `init-${Date.now()}`,
          role: 'assistant',
          content: isRtl
            ? 'بدأت جلسة محادثة جديدة! أنا **Copilot** جاهز لتلقي أوامرك وإدارتك للمتجر.'
            : 'New chat session started! I am **Copilot**, ready for your commands.',
          timestamp: new Date().toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    updateSessionsState((prev) => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setIsSidebarOpen(false); // Close drawer on mobile
  };

  // Handle Delete Session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      handleCreateNewChat();
      return;
    }

    updateSessionsState((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (sessionId === activeSessionId) {
        setActiveSessionId(filtered[0]?.id || 'session-main');
      }
      return filtered;
    });
  };

  // Auto-scroll on new messages ONLY inside the chat container (no whole-page scroll jump)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [copilotMessages, isCopilotThinking, planningStage]);

  // Handle Plan Confirmation (1-Click Execution)
  const handleConfirmPlan = async (plan: ExecutionPlan, messageId: string) => {
    if (!plan || !Array.isArray(plan.actions) || isCopilotThinking) return;

    setIsCopilotThinking(true);
    setPlanningStage(3);

    // Update plan status to executing
    updateActiveSessionMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.plan
          ? {
              ...msg,
              plan: {
                ...msg.plan,
                status: 'executing' as const,
                steps: msg.plan.steps.map((s, idx) =>
                  idx === msg.plan!.steps.length - 1 ? { ...s, isActive: true } : s
                ),
              },
            }
          : msg
      )
    );

    try {
      const res = await fetch('/api/admin/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({
          messages: copilotMessages.map((m) => ({
            role: m.role,
            content: m.content,
            plan: m.plan,
            actions: m.actions,
          })),
          confirmed_actions: plan.actions,
          confirmed_plan: plan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute confirmed plan');
      }

      const completedMsgId = `asst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const completedMsg: CopilotChatMessage = {
        id: completedMsgId,
        role: 'assistant',
        content: data.reply || (isRtl ? 'تم تنفيذ الخطة بنجاح.' : 'Plan executed successfully.'),
        timestamp: new Date().toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        actions: data.actions || [],
        plan: (data.plan as ExecutionPlan) || {
          ...plan,
          status: 'completed' as const,
          steps: plan.steps.map((s) => ({ ...s, isCompleted: true, isActive: false })),
        },
        suggestedPrompts: data.suggestedPrompts || [],
        modelUsed: data.modelUsed || 'Copilot',
      };

      updateActiveSessionMessages((prev) => [
        ...prev.map((msg) =>
          msg.id === messageId && msg.plan
            ? {
                ...msg,
                plan: {
                  ...msg.plan,
                  status: 'completed' as const,
                  steps: msg.plan.steps.map((s) => ({ ...s, isCompleted: true, isActive: false })),
                },
              }
            : msg
        ),
        completedMsg,
      ]);

      await loadData();
    } catch (err: any) {
      updateActiveSessionMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `${isRtl ? 'حدث خطأ أثناء تنفيذ الخطة:' : 'Error executing plan:'} ${err.message}`,
          timestamp: new Date().toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsCopilotThinking(false);
      setPlanningStage(0);
    }
  };

  // Handle Plan Cancellation
  const handleCancelPlan = (plan: ExecutionPlan, messageId: string) => {
    updateActiveSessionMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.plan
          ? {
              ...msg,
              plan: {
                ...msg.plan,
                status: 'cancelled' as const,
              },
            }
          : msg
      )
    );
  };

  // Handle message submission with Live Planning Stream
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || copilotInput).trim();
    if (!textToSend || isCopilotThinking) return;

    const userMsgId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nowTime = new Date().toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const userMsg: CopilotChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      timestamp: nowTime,
    };

    // Auto update session title from first prompt if needed
    if (activeSession.messages.length <= 1) {
      const cleanTitle = textToSend.slice(0, 28).replace(/[\n\r]+/g, ' ');
      updateSessionsState((all) =>
        all.map((s) => (s.id === activeSessionId ? { ...s, title: cleanTitle } : s))
      );
    }

    const currentMessages = activeSession.messages;
    const outgoingMessages = [...currentMessages, userMsg];

    updateActiveSessionMessages(() => outgoingMessages);
    setCopilotInput('');
    setIsCopilotThinking(true);
    setPlanningStage(1);

    // Dynamic Live Stage Progression Simulation
    const timer1 = setTimeout(() => setPlanningStage(2), 350);
    const timer2 = setTimeout(() => setPlanningStage(3), 900);
    const timer3 = setTimeout(() => setPlanningStage(4), 1500);

    try {
      const compactProducts = products.map((p) => ({
        id: p.id,
        name: p.name,
        name_ar: p.name_ar,
        slug: p.slug,
        category: p.category,
        our_price: p.our_price,
        market_price: p.market_price,
        price_egp: p.price_egp,
        price_sar: p.price_sar,
        stock: p.stock,
        is_flash_deal: p.is_flash_deal,
        flash_deal_price: p.flash_deal_price,
        warranty_duration: p.warranty_duration,
        delivery_time: p.delivery_time,
        image_url: p.image_url,
      }));

      const compactOrders = orders.slice(0, 25).map((o) => ({
        id: o.id,
        amount: o.amount,
        status: o.status,
        user_id: o.user_id,
        created_at: o.created_at,
        session_id: o.session_id,
        product_key: o.product_key,
        profiles: o.profiles ? { email: o.profiles.email || '', display_name: o.profiles.display_name || '' } : null,
        products: o.products ? { name: o.products.name } : null,
      }));

      const compactUsers = profiles.slice(0, 35).map((u) => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name || '',
        role: u.role || 'customer',
        wallet_balance: u.wallet_balance || 0,
      }));

      const res = await fetch('/api/admin/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({
          messages: outgoingMessages.map((m) => ({
            role: m.role,
            content: m.content,
            plan: m.plan,
            actions: m.actions,
          })),
          context: {
            products: compactProducts,
            orders: compactOrders,
            users: compactUsers,
            settings: siteSettings,
            totalProducts: products.length,
            totalOrders: orders.length,
            pendingManualOrders: orders.filter((o) => o.status === 'pending').length,
            totalUsers: profiles.length,
            activeTab: 'ai-copilot',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response from Copilot');
      }

      const assistantMsgId = `asst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const assistantMsg: CopilotChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: data.reply || (isRtl ? 'تمت معالجة طلبك.' : 'Operation completed.'),
        timestamp: new Date().toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        actions: data.actions || [],
        plan: data.plan || null,
        requires_confirmation: data.requires_confirmation,
        suggestedPrompts: data.suggestedPrompts || [],
        modelUsed: 'Copilot',
      };

      updateActiveSessionMessages((prev) => [...prev, assistantMsg]);

      // If database changed, trigger instant store sync
      if (data.reloadRequired || (data.actions && data.actions.some((a: any) => a.status === 'success'))) {
        await loadData();
      }

      // Handle client-side dispatched actions
      if (Array.isArray(data.actions)) {
        for (const act of data.actions) {
          if (act.tool === 'navigate_tab' && act.params?.tab) {
            setActiveTab(act.params.tab);
            if (act.params.search_query) {
              if (act.params.tab === 'products') setProductSearch(act.params.search_query);
              if (act.params.tab === 'orders') setOrderSearch(act.params.search_query);
              if (act.params.tab === 'users') setUserSearch(act.params.search_query);
            }
          } else if (act.tool === 'open_modal') {
            if (act.params?.modal === 'add_product') {
              handleOpenAddModal();
            } else if (act.params?.modal === 'edit_product' && act.params?.product_id) {
              const pToEdit = products.find(
                (p) =>
                  p.id === act.params.product_id ||
                  p.slug === act.params.product_id ||
                  p.name.toLowerCase().includes(act.params.product_id.toLowerCase())
              );
              if (pToEdit) handleOpenEditModal(pToEdit);
            }
          }
        }
      }
    } catch (err: any) {
      updateActiveSessionMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `${isRtl ? 'حدث خطأ أثناء معالجة الطلب:' : 'Error processing request:'} ${err.message}`,
          timestamp: new Date().toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsCopilotThinking(false);
      setPlanningStage(0);
    }
  };

  // Categorized commands for the Command Palette modal
  const categorizedCommands = {
    products: [
      {
        icon: DollarSign,
        label: isRtl ? 'تخفيض أسعار الاشتراكات 10%' : '10% Off All Subscriptions',
        prompt: isRtl
          ? 'قم بعمل تخفيض 10% على كافة المنتجات في فئة الاشتراكات مع تحديث أسعار الجنيه والريال آلياً.'
          : 'Apply a 10% price discount to all products in the Subscriptions category.',
      },
      {
        icon: Package,
        label: isRtl ? 'تعبئة نواقص المخزون (+50)' : 'Restock Low Stock (+50)',
        prompt: isRtl
          ? 'افحص المنتجات التي مخزونها 5 أو أقل وزد مخزونها بمقدار 50 قطعة فوراً.'
          : 'Find all products with stock 5 or below and restock them to 50 units.',
      },
      {
        icon: Flame,
        label: isRtl ? 'تفعيل عروض الفلاش ديل 25%' : 'Activate 25% Flash Deals',
        prompt: isRtl
          ? 'قم بتفعيل عروض الفلاش ديل بخصم 25% لمدة 24 ساعة على أكثر المنتجات طلباً.'
          : 'Enable 25% discount Flash Deals for 24 hours on our top performing products.',
      },
      {
        icon: Trash2,
        label: isRtl ? 'خطة حذف واستثناء ذكي' : 'Smart Exclude & Delete Plan',
        prompt: isRtl
          ? 'احذف جميع المنتجات عدا جيمناي وعدا نيتفليكس مع بناء خطة عمل وطلب موافقتي أولاً.'
          : 'Prepare a plan to delete all products except Gemini and Netflix and request my approval.',
      },
    ],
    orders: [
      {
        icon: ShoppingCart,
        label: isRtl ? 'اعتماد كافة الطلبات المعلقة' : 'Approve All Pending Orders',
        prompt: isRtl
          ? 'راجع جميع الطلبات اليدوية المعلقة وقم باعتمادها وتغيير حالتها إلى completed فوراً.'
          : 'Review all pending manual orders and approve them to completed status.',
      },
      {
        icon: Coins,
        label: isRtl ? 'شحن رصيد محفظة مستخدم' : 'Credit User Wallet',
        prompt: isRtl
          ? 'أضف 10 دولار رصيد لمحفظة أول مستخدم مسجل مع تدوين المعاملة في السجل المالي.'
          : 'Credit $10 to the wallet balance of the first registered customer.',
      },
    ],
    marketing: [
      {
        icon: Megaphone,
        label: isRtl ? 'تحديث وتطبيق البانر الإعلاني' : 'Update Hero Announcement',
        prompt: isRtl
          ? 'اكتب نص بانر إعلاني جذاب باللغتين العربية والإنجليزية يعلن عن عروض نهاية الأسبوع وخصم 40% وطبقه على الموقع.'
          : 'Draft an exciting promo text for our top site hero banner announcing 40% off and apply it.',
      },
      {
        icon: Bell,
        label: isRtl ? 'بث إشعار ترويجي عام' : 'Broadcast Promo Notification',
        prompt: isRtl
          ? 'أرسل إشعار ترويجي عام لكافة العملاء بعنوان "تخفيضات كبرى على الاشتراكات الرقمية!".'
          : 'Broadcast a promotional notification to all customers titled "Mega Sale on Digital Subscriptions!".',
      },
    ],
    audit: [
      {
        icon: TrendingUp,
        label: isRtl ? 'فحص وتدقيق شامل للمتجر' : 'Run Full Store Diagnostic Audit',
        prompt: isRtl
          ? 'قم بإجراء فحص شامل للمتجر وقدم تقريراً تنفيذياً عن المبيعات والمخزون والطلبات.'
          : 'Perform a comprehensive store health audit and provide an executive summary on revenue and stock.',
      },
    ],
  };

  // Top Neubrutalist shortcut chips
  const topEssentialChips = [
    {
      label: isRtl ? 'فحص شامل' : 'Health Audit',
      icon: TrendingUp,
      prompt: isRtl ? 'قم بإجراء فحص شامل للمتجر وقدم تقريراً تنفيذياً عن المبيعات والمخزون.' : 'Perform a comprehensive store health audit.',
    },
    {
      label: isRtl ? 'تخفيض 10%' : '10% Discount',
      icon: DollarSign,
      prompt: isRtl ? 'قم بعمل تخفيض 10% على كافة منتجات الاشتراكات.' : 'Apply 10% discount on Subscriptions.',
    },
    {
      label: isRtl ? 'تعبئة النواقص' : 'Restock Low',
      icon: Package,
      prompt: isRtl ? 'افحص المنتجات التي مخزونها 5 أو أقل وزد مخزونها بمقدار 50 قطعة.' : 'Restock low stock items (+50).',
    },
  ];

  return (
    <div className="space-y-4 font-sans text-black">
      {/* ─── NEUBRUTALISM COPILOT HEADER ─── */}
      <div className="bg-white border-2 border-black rounded-3xl p-4 sm:p-5 shadow-[6px_6px_0px_0px_#000] select-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand & Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000] shrink-0">
              <Bot className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-xl font-black text-black tracking-tight flex items-center gap-1.5">
                  <span>AI Copilot</span>
                  <span className="text-[11px] font-mono font-black bg-[#FFE600] border border-black px-1.5 py-0.5 rounded shadow-[1px_1px_0px_0px_#000]">
                    v4 Omni
                  </span>
                </h3>
                <span className="px-2 py-0.5 bg-[#06D6A0] border-2 border-black text-black font-mono font-black text-[11px] rounded-lg shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-black shrink-0" />
                  <span>{isRtl ? 'صلاحيات قصوى' : 'Root Access'}</span>
                </span>
                <span className="px-2 py-0.5 bg-[#4D96FF] border-2 border-black text-black font-mono font-black text-[11px] rounded-lg shadow-[1.5px_1.5px_0px_0px_#000] hidden sm:flex items-center gap-1">
                  <Cpu className="w-3 h-3 stroke-[2.5]" />
                  <span>DeepSeek AI</span>
                </span>
              </div>
              <p className="text-xs text-neutral-800 font-bold truncate max-w-xs sm:max-w-lg mt-0.5">
                {isRtl ? 'المساعد التنفيذي الذكي لإدارة المتجر وغرفة التحكم بالكامل' : 'Autonomous Control Room Director & Store Intelligence'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Context Inspector Button */}
            <button
              type="button"
              onClick={() => setIsContextDrawerOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFFDF9] active:translate-x-[1px] active:translate-y-[1px] border-2 border-black text-black text-xs font-mono font-black transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              title={isRtl ? 'السياق الذكي' : 'Smart Context'}
            >
              <Database className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">{isRtl ? 'السياق وقاعدة البيانات' : 'Context'}</span>
            </button>

            {/* Quick Commands Button */}
            <button
              type="button"
              onClick={() => setIsQuickCommandModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#FFE600] hover:bg-[#ffe100] active:translate-x-[1px] active:translate-y-[1px] border-2 border-black text-black text-xs font-mono font-black transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              title={isRtl ? 'أوامر سريعة' : 'Quick Commands'}
            >
              <Zap className="w-3.5 h-3.5 fill-black stroke-black" />
              <span>{isRtl ? 'الأوامر السريعة' : 'Quick Commands'}</span>
            </button>

            {/* Chat History Drawer Toggle Button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="px-3 py-1.5 rounded-xl bg-[#FFFDF9] hover:bg-neutral-100 active:translate-x-[1px] active:translate-y-[1px] border-2 border-black text-black text-xs font-mono font-black transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              title={isRtl ? 'سجل المحادثات' : 'Chat History'}
            >
              <History className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden md:inline">{isRtl ? 'المحادثات' : 'Chats'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN CHAT & SESSIONS CONTAINER (NEUBRUTALISM) ─── */}
      <div className="bg-[#FFFDF9] border-2 border-black rounded-3xl overflow-hidden shadow-[6px_6px_0px_0px_#000] flex h-[640px] sm:h-[720px] relative">
        {/* ─── SESSIONS SIDEBAR / MOBILE DRAWER ─── */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Mobile Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed md:hidden inset-0 bg-black/60 backdrop-blur-xs z-30"
              />

              {/* Sidebar Panel */}
              <motion.div
                initial={{ x: isRtl ? 320 : -320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isRtl ? 320 : -320, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed md:relative start-0 top-0 bottom-0 w-72 sm:w-80 max-w-[85vw] bg-white border-e-2 border-black flex flex-col z-40 md:z-20 h-full overflow-hidden shadow-[4px_0px_0px_0px_#000] md:shadow-none"
              >
                {/* Sidebar Header */}
                <div className="p-3.5 border-b-2 border-black bg-[#FFFDF9] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-black text-black font-mono">
                      <History className="w-4 h-4 stroke-[2.5]" />
                      <span>{isRtl ? 'سجل المحادثات' : 'Chat Sessions'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCreateNewChat}
                        className="px-2.5 py-1 rounded-xl bg-[#06D6A0] hover:bg-[#05b888] active:translate-x-[1px] active:translate-y-[1px] border-2 border-black text-black text-xs font-black transition-all flex items-center gap-1 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{isRtl ? 'جديدة' : 'New'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden p-1 rounded-lg text-black hover:bg-neutral-200"
                      >
                        <X className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-black absolute start-3 top-2.5 stroke-[2.5]" />
                    <input
                      type="text"
                      value={sessionSearchQuery}
                      onChange={(e) => setSessionSearchQuery(e.target.value)}
                      placeholder={isRtl ? 'بحث في المحادثات...' : 'Search chats...'}
                      className="w-full ps-8 pe-3 py-1.5 bg-white border-2 border-black rounded-xl text-black font-bold text-xs outline-none focus:bg-[#FFFDF9] transition-colors placeholder:text-neutral-500 font-sans shadow-[1.5px_1.5px_0px_0px_#000]"
                    />
                  </div>
                </div>

                {/* Sessions List */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
                  {sessions
                    .filter((s) => !sessionSearchQuery || s.title.toLowerCase().includes(sessionSearchQuery.toLowerCase()))
                    .map((s) => {
                      const isActive = s.id === activeSessionId;
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setActiveSessionId(s.id);
                            setIsSidebarOpen(false);
                          }}
                          className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-all border-2 border-black group ${
                            isActive
                              ? 'bg-[#FFE600] shadow-[3px_3px_0px_0px_#000] text-black font-black'
                              : 'bg-white hover:bg-[#FFFDF9] shadow-[2px_2px_0px_0px_#000] text-neutral-800 font-bold'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <MessageSquare className="w-4 h-4 shrink-0 stroke-[2.5]" />
                            <div className="truncate">
                              <p className="truncate text-xs font-black">{s.title}</p>
                              <p className="text-[10px] font-mono text-neutral-700 font-bold mt-0.5">
                                {s.messages.length} {isRtl ? 'رسائل' : 'msgs'} • {new Date(s.updated_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>

                          {sessions.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSession(s.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#FF6B6B] border border-black text-black transition-all shadow-[1px_1px_0px_0px_#000]"
                              title={isRtl ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Footer Info */}
                <div className="p-3 border-t-2 border-black bg-[#FFFDF9] text-xs font-mono font-black text-black flex items-center justify-between">
                  <span>{sessions.length} {isRtl ? 'جلسات نشطة' : 'Active Chats'}</span>
                  <span className="flex items-center gap-1 text-[#06D6A0]">
                    <span className="w-2 h-2 rounded-full bg-[#06D6A0] border border-black" />
                    <span>{isRtl ? 'حفظ فوري' : 'Live Sync'}</span>
                  </span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ─── MAIN CHAT VIEW (NEUBRUTALISM) ─── */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FFFDF9] min-w-0">
          {/* Chat Toolbar Header */}
          <div className="px-4 py-2.5 bg-white border-b-2 border-black flex items-center justify-between gap-2 shadow-[0px_2px_0px_0px_#000] select-none">
            <div className="flex items-center gap-2 text-xs font-mono font-black text-black min-w-0 truncate">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-1 rounded-lg border-2 border-black bg-[#FFE600] text-black shadow-[1px_1px_0px_0px_#000]"
                title={isRtl ? 'سجل المحادثات' : 'History'}
              >
                <Menu className="w-4 h-4 stroke-[2.5]" />
              </button>
              <Activity className="w-4 h-4 text-black stroke-[2.5] shrink-0" />
              <span className="font-black truncate">{activeSession.title}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCreateNewChat}
                className="px-2.5 py-1 rounded-xl bg-[#06D6A0] hover:bg-[#05b888] text-black border-2 border-black text-xs font-mono font-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">{isRtl ? 'محادثة جديدة' : 'New'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm(isRtl ? 'هل تريد مسح رسائل هذه المحادثة؟' : 'Clear messages in this chat?')) {
                    updateActiveSessionMessages(() => [
                      {
                        id: `cleared-${Date.now()}`,
                        role: 'assistant',
                        content: isRtl
                          ? 'تم مسح المحادثة بنجاح. أنا جاهز لتلقي أوامرك الجديدة في غرفة التحكم!'
                          : 'Conversation cleared. Ready for your next command!',
                        timestamp: new Date().toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
                      },
                    ]);
                  }
                }}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-[#FF6B6B] hover:bg-[#ff5252] text-black border-2 border-black text-xs font-mono font-black shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1 cursor-pointer"
                title={at.aiClearChat}
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Message Stream */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 bg-[#F8F9FA] scrollbar-thin">
            {copilotMessages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id || idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Meta header */}
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-mono text-black font-black flex items-center gap-1">
                      {isUser ? (
                        <>
                          <span className="px-1.5 py-0.5 rounded bg-[#FFE600] border border-black shadow-[1px_1px_0px_0px_#000] flex items-center gap-1">
                            <Users className="w-3 h-3 stroke-[2.5]" />
                            <span>{isRtl ? 'المسؤول' : 'Admin'}</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="px-1.5 py-0.5 rounded bg-[#06D6A0] border border-black shadow-[1px_1px_0px_0px_#000] flex items-center gap-1">
                            <Bot className="w-3 h-3 stroke-[2.5]" />
                            <span>Copilot</span>
                          </span>
                        </>
                      )}
                    </span>
                    <span className="text-black font-black text-xs">•</span>
                    <span className="text-[10px] font-mono text-neutral-600 font-bold">{msg.timestamp || '00:00'}</span>
                  </div>

                  {/* Message Bubble (Neubrutalism) */}
                  <div
                    className={`max-w-[95%] sm:max-w-[85%] rounded-3xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed border-2 border-black shadow-[4px_4px_0px_0px_#000] ${
                      isUser
                        ? 'bg-[#FFE600] text-black font-black rounded-tr-xs'
                        : 'bg-white text-black font-normal rounded-tl-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed font-black">{msg.content}</p>
                    ) : (
                      renderFormattedCopilotText(msg.content)
                    )}

                    {/* Render Execution Plan Card (Neubrutalism) */}
                    {!isUser && msg.plan && (
                      <div className="mt-4 pt-3.5 border-t-2 border-black space-y-3">
                        <div className="rounded-2xl border-2 border-black bg-[#FFFDF9] p-4 sm:p-5 space-y-3.5 shadow-[3px_3px_0px_0px_#000]">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b-2 border-black">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 rounded-xl bg-[#FFE600] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]">
                                <ListOrdered className="w-4 h-4 text-black stroke-[2.5]" />
                              </div>
                              <div>
                                <h4 className="text-xs sm:text-sm font-black text-black tracking-tight">
                                  {msg.plan.title_ar || msg.plan.title}
                                </h4>
                                <p className="text-[10px] sm:text-[11px] text-neutral-800 font-mono font-bold mt-0.5">
                                  {isRtl
                                    ? `العمليات المخططة: ${msg.plan.affected_count || msg.plan.actions?.length || 0} عملية`
                                    : `Planned Operations: ${msg.plan.affected_count || msg.plan.actions?.length || 0}`}
                                </p>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <span
                              className={`px-3 py-1 rounded-xl font-mono text-[11px] font-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] flex items-center gap-1.5 ${
                                msg.plan.status === 'completed'
                                  ? 'bg-[#06D6A0] text-black'
                                  : msg.plan.status === 'cancelled'
                                  ? 'bg-[#FF6B6B] text-black'
                                  : msg.plan.status === 'executing'
                                  ? 'bg-[#4D96FF] text-black animate-pulse'
                                  : 'bg-[#FFE600] text-black'
                              }`}
                            >
                              {msg.plan.status === 'completed' ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>{isRtl ? 'تم التنفيذ بنجاح' : 'Completed'}</span>
                                </>
                              ) : msg.plan.status === 'cancelled' ? (
                                <>
                                  <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>{isRtl ? 'تم الإلغاء' : 'Cancelled'}</span>
                                </>
                              ) : msg.plan.status === 'executing' ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[2.5]" />
                                  <span>{isRtl ? 'جاري التنفيذ...' : 'Executing...'}</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>{isRtl ? 'بانتظار التأكيد والموافقة' : 'Pending Approval'}</span>
                                </>
                              )}
                            </span>
                          </div>

                          {/* Warning Box */}
                          {(msg.plan.warning_ar || msg.plan.warning) && msg.plan.status !== 'completed' && msg.plan.status !== 'cancelled' && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FF6B6B]/20 border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0px_0px_#000]">
                              <ShieldAlert className="w-4 h-4 text-black shrink-0 mt-0.5 stroke-[2.5]" />
                              <p className="leading-relaxed font-sans">{msg.plan.warning_ar || msg.plan.warning}</p>
                            </div>
                          )}

                          {/* OrderTracking Step Progress */}
                          {Array.isArray(msg.plan.steps) && msg.plan.steps.length > 0 && (
                            <div className="py-1">
                              <OrderTracking
                                isRtl={isRtl}
                                steps={msg.plan.steps.map((s) => ({
                                  name: (isRtl ? s.name_ar : s.name) || s.name,
                                  description: (isRtl ? s.description_ar : s.description) || s.description,
                                  timestamp: s.timestamp,
                                  isCompleted: !!s.isCompleted,
                                  isActive: !!s.isActive,
                                }))}
                              />
                            </div>
                          )}

                          {/* Interactive Product Draft & Serper Image Picker Card */}
                          {(msg.plan.product_draft || msg.plan.actions?.some((a) => a.tool === 'create_product') || (Array.isArray(msg.plan.suggested_images) && msg.plan.suggested_images.length > 0)) && (
                            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] space-y-3.5 my-2">
                              {/* Top Bar: Title & Price Adjustment */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-black">
                                <div className="flex items-center gap-3">
                                  {/* Active Product Image Preview */}
                                  <div className="w-14 h-14 rounded-xl bg-neutral-50 border-2 border-black p-1 flex items-center justify-center relative overflow-hidden shrink-0 shadow-[1.5px_1.5px_0px_0px_#000]">
                                    {(msg.plan.product_draft?.image_url || msg.plan.actions?.[0]?.params?.image_url || msg.plan.suggested_images?.[0]?.imageUrl) ? (
                                      <img
                                        src={msg.plan.product_draft?.image_url || msg.plan.actions?.[0]?.params?.image_url || msg.plan.suggested_images?.[0]?.imageUrl}
                                        alt="Selected"
                                        className="w-full h-full object-contain"
                                      />
                                    ) : (
                                      <ImageIcon className="w-6 h-6 text-neutral-400" />
                                    )}
                                    <span className="absolute top-0.5 start-0.5 px-1 py-0.2 rounded bg-[#06D6A0] text-[8px] font-black border border-black">
                                      PNG
                                    </span>
                                  </div>

                                  <div>
                                    <h5 className="text-xs sm:text-sm font-black text-black leading-snug">
                                      {msg.plan.product_draft?.name_ar || msg.plan.product_draft?.name || msg.plan.actions?.[0]?.params?.name_ar || msg.plan.actions?.[0]?.params?.name || 'تصميم منتج جديد'}
                                    </h5>
                                    <p className="text-[11px] text-neutral-600 font-mono font-bold">
                                      {msg.plan.product_draft?.name || msg.plan.actions?.[0]?.params?.name || ''}
                                    </p>
                                  </div>
                                </div>

                                {/* Editable Price Control */}
                                {(!msg.plan.status || msg.plan.status === 'pending_approval') && (
                                  <div className="flex items-center gap-2 bg-[#FFFDF9] p-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] shrink-0">
                                    <span className="text-[11px] font-black text-black flex items-center gap-1">
                                      <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>{isRtl ? 'السعر المقترح:' : 'Price (USD):'}</span>
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0.1"
                                      value={msg.plan.product_draft?.our_price ?? msg.plan.actions?.[0]?.params?.our_price ?? 14.99}
                                      onChange={(e) => handleUpdatePriceForPlan(msg.id, parseFloat(e.target.value))}
                                      className="w-20 px-2 py-1 bg-white border-2 border-black rounded-lg text-xs font-mono font-black text-black outline-none"
                                    />
                                    <div className="flex flex-col text-[9px] font-mono font-bold text-neutral-600">
                                      <span>~{msg.plan.product_draft?.price_egp || Math.ceil(((msg.plan.product_draft?.our_price || 14.99) * 53))} ج.م</span>
                                      <span>~{msg.plan.product_draft?.price_sar || Math.ceil(((msg.plan.product_draft?.our_price || 14.99) * 4))} ر.س</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Serper PNG Image Selection Gallery */}
                              {Array.isArray(msg.plan.suggested_images) && msg.plan.suggested_images.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-black text-black flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 fill-[#FFE600] text-black" />
                                      <span>{isRtl ? 'اختر أفضل صورة للمنتج (PNG عالية الدقة من Serper):' : 'Select Product Image (High-Res PNG):'}</span>
                                    </label>
                                    {(!msg.plan.status || msg.plan.status === 'pending_approval') && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActivePlanTargetMessageId(msg.id);
                                          setSerperCustomSearchQuery(msg.plan?.product_draft?.name || msg.plan?.title || 'Google Gemini AI');
                                          setCopilotSerperModalOpen(true);
                                        }}
                                        className="text-[10px] font-black text-black bg-[#FFE600] hover:bg-[#FFD600] px-2.5 py-1 rounded-lg border border-black shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                                      >
                                        {isRtl ? 'بحث صور أخرى' : 'Search More PNGs'}
                                      </button>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                    {msg.plan.suggested_images.map((img, imgIdx) => {
                                      const currentImg = msg.plan?.product_draft?.image_url || msg.plan?.actions?.[0]?.params?.image_url || msg.plan?.suggested_images?.[0]?.imageUrl;
                                      const isSelected = currentImg === img.imageUrl;

                                      return (
                                        <button
                                          key={img.imageUrl + imgIdx}
                                          type="button"
                                          disabled={msg.plan?.status === 'completed' || msg.plan?.status === 'cancelled'}
                                          onClick={() => handleSelectImageForPlan(msg.id, img.imageUrl)}
                                          className={`relative w-full h-18 rounded-xl bg-neutral-50 p-1.5 border-2 transition-all flex items-center justify-center cursor-pointer overflow-hidden ${
                                            isSelected
                                              ? 'border-[#06D6A0] bg-[#06D6A0]/10 shadow-[2px_2px_0px_0px_#000] scale-105 ring-2 ring-[#06D6A0]'
                                              : 'border-black/30 hover:border-black hover:bg-neutral-100'
                                          }`}
                                        >
                                          <img src={img.thumbnailUrl || img.imageUrl} alt={img.title || 'Option'} className="w-full h-full object-contain" />
                                          {isSelected && (
                                            <div className="absolute top-1 end-1 w-4 h-4 rounded-full bg-[#06D6A0] border border-black flex items-center justify-center text-black">
                                              <Check className="w-2.5 h-2.5 stroke-[4]" />
                                            </div>
                                          )}
                                          {img.isPng && (
                                            <span className="absolute bottom-0.5 start-0.5 px-1 py-0.2 rounded bg-black text-white text-[7px] font-mono font-bold">
                                              PNG
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Fast Confirmation Action Buttons */}
                          {(!msg.plan.status || msg.plan.status === 'pending_approval') && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t-2 border-black">
                              <button
                                type="button"
                                onClick={() => handleConfirmPlan(msg.plan!, msg.id)}
                                disabled={isCopilotThinking}
                                className="px-4 py-2.5 bg-[#06D6A0] hover:bg-[#05b888] active:translate-x-[2px] active:translate-y-[2px] text-black font-black text-xs sm:text-sm rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>
                                  {isRtl
                                    ? `تأكيد وتنفيذ الخطة فوراً (${msg.plan.affected_count || msg.plan.actions?.length})`
                                    : `Confirm & Execute (${msg.plan.affected_count || msg.plan.actions?.length})`}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCancelPlan(msg.plan!, msg.id)}
                                disabled={isCopilotThinking}
                                className="px-3.5 py-2.5 bg-[#FF6B6B] hover:bg-[#ff5252] active:translate-x-[2px] active:translate-y-[2px] text-black font-black text-xs sm:text-sm rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <XCircle className="w-4 h-4 stroke-[2.5]" />
                                <span>{isRtl ? 'إلغاء الخطة' : 'Cancel Plan'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Render Action Execution Cards if any (Neubrutalism) */}
                    {!isUser && Array.isArray(msg.actions) && msg.actions.length > 0 && (
                      <div className="mt-4 pt-3 border-t-2 border-black space-y-2">
                        <div className="text-xs font-mono font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                          <Terminal className="w-4 h-4 stroke-[2.5]" />
                          <span>{isRtl ? 'سجل العمليات المنفذة في قاعدة البيانات:' : 'Database Operations Executed:'}</span>
                        </div>

                        {msg.actions.map((act, aIdx) => {
                          const isSuccess = act.status === 'success';
                          const isFailed = act.status === 'failed';

                          let toolIcon = Sparkles;
                          let toolColor = 'bg-[#FFFDF9] text-black';
                          let badgeText = isRtl ? 'تم التنفيذ في Supabase' : 'Executed in DB';

                          if (act.tool === 'create_product' || act.tool === 'duplicate_product') {
                            toolIcon = Plus;
                            toolColor = 'bg-[#06D6A0]/10 text-black';
                            badgeText = isRtl ? 'تم إنشاء المنتج' : 'Product Created';
                          } else if (act.tool === 'update_product' || act.tool === 'bulk_update_products' || act.tool === 'apply_flash_deal' || act.tool === 'restock_low_stock_products') {
                            toolIcon = Edit2;
                            toolColor = 'bg-[#FFE600]/15 text-black';
                            badgeText = isRtl ? 'تم التعديل بنجاح' : 'Updated Successfully';
                          } else if (act.tool === 'search_and_set_product_image') {
                            toolIcon = Eye;
                            toolColor = 'bg-[#4D96FF]/15 text-black';
                            badgeText = isRtl ? 'تم تحديث الصورة' : 'Image Updated';
                          } else if (act.tool === 'delete_product') {
                            toolIcon = Trash2;
                            toolColor = 'bg-[#FF6B6B]/15 text-black';
                            badgeText = isRtl ? 'تم حذف المنتج' : 'Product Deleted';
                          } else if (act.tool === 'update_order_status' || act.tool === 'approve_manual_order' || act.tool === 'bulk_approve_orders' || act.tool === 'assign_order_key' || act.tool === 'refund_order_to_wallet') {
                            toolIcon = CheckCircle2;
                            toolColor = 'bg-[#06D6A0]/15 text-black';
                            badgeText = isRtl ? 'تم اعتماد الطلب' : 'Order Updated';
                          } else if (act.tool === 'update_user_balance') {
                            toolIcon = Coins;
                            toolColor = 'bg-[#FFE600]/20 text-black';
                            badgeText = isRtl ? 'تم شحن المحفظة' : 'Wallet Adjusted';
                          } else if (act.tool === 'send_notification') {
                            toolIcon = Bell;
                            toolColor = 'bg-[#4D96FF]/15 text-black';
                            badgeText = isRtl ? 'تم بث الإشعار' : 'Notification Sent';
                          } else if (act.tool === 'update_site_settings') {
                            toolIcon = SettingsIcon;
                            toolColor = 'bg-white text-black';
                            badgeText = isRtl ? 'تم تطبيق الإعدادات' : 'Settings Applied';
                          }

                          const ToolIconComp = toolIcon;

                          return (
                            <div
                              key={aIdx}
                              className={`rounded-2xl border-2 border-black p-3.5 my-2 shadow-[3px_3px_0px_0px_#000] ${
                                isFailed
                                  ? 'bg-[#FF6B6B]/20 text-black'
                                  : toolColor
                              }`}
                            >
                              {/* Header */}
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b-2 border-black">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-xl bg-white border-2 border-black shadow-[1px_1px_0px_0px_#000]">
                                    <ToolIconComp className="w-4 h-4 text-black stroke-[2.5]" />
                                  </div>
                                  <span className="font-black text-xs sm:text-sm text-black">
                                    {act.description || act.tool}
                                  </span>
                                </div>
                                <span
                                  className={`px-2.5 py-0.5 rounded-lg font-mono text-[10px] font-black border-2 border-black shadow-[1px_1px_0px_0px_#000] flex items-center gap-1 ${
                                    isFailed
                                      ? 'bg-[#FF6B6B] text-black'
                                      : 'bg-[#06D6A0] text-black'
                                  }`}
                                >
                                  {isFailed ? <AlertTriangle className="w-3 h-3 stroke-[2.5]" /> : <Check className="w-3 h-3 stroke-[2.5]" />}
                                  {isFailed ? act.error || (isRtl ? 'فشل التنفيذ' : 'Failed') : badgeText}
                                </span>
                              </div>

                              {/* Diff Viewer Grid */}
                              {act.diff && Object.keys(act.diff).length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 text-xs font-mono bg-white p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                                  {Object.entries(act.diff).map(([key, val]: [string, any], dIdx) => (
                                    <div key={dIdx} className="flex flex-col bg-[#FFFDF9] p-2 rounded-lg border border-black shadow-[1px_1px_0px_0px_#000]">
                                      <span className="text-neutral-700 uppercase text-[9px] font-black">{key}</span>
                                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        {val.before !== null && val.before !== undefined && (
                                          <>
                                            <span className="line-through text-rose-600 font-bold truncate max-w-[120px]">{String(val.before)}</span>
                                            <ArrowRight className="w-3.5 h-3.5 text-black shrink-0 rtl:rotate-180 stroke-[2.5]" />
                                          </>
                                        )}
                                        <span className="text-emerald-700 font-black truncate max-w-[160px]">{String(val.after)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Action Quick Links */}
                              <div className="flex flex-wrap items-center gap-2 mt-2 pt-1">
                                {(act.tool === 'update_product' || act.tool === 'create_product' || act.tool === 'duplicate_product' || act.tool === 'search_and_set_product_image') && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveTab('products');
                                        const targetName = act.result?.name || act.params?.name || act.params?.product_id || '';
                                        if (targetName) setProductSearch(targetName);
                                      }}
                                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#FFE600] active:translate-x-[1px] active:translate-y-[1px] text-black text-xs font-black transition-all flex items-center gap-1 cursor-pointer border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]"
                                    >
                                      <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>{at.aiViewProduct}</span>
                                    </button>

                                    {act.result && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const targetId = act.result?.id || act.params?.product_id;
                                          const p = products.find((prod) => prod.id === targetId || prod.slug === targetId || prod.name === targetId);
                                          if (p) handleOpenEditModal(p);
                                        }}
                                        className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#06D6A0] active:translate-x-[1px] active:translate-y-[1px] text-black text-xs font-black transition-all flex items-center gap-1 cursor-pointer border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                        <span>{at.aiEditProduct}</span>
                                      </button>
                                    )}

                                    {act.diff && Object.keys(act.diff).length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const undoDesc = isRtl
                                            ? `تراجع عن التعديل الأخير على المنتج ${act.params?.product_id || act.result?.name || ''}`
                                            : `Undo the last change on product ${act.params?.product_id || act.result?.name || ''}`;
                                          handleSendMessage(undoDesc);
                                        }}
                                        className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#FF6B6B] active:translate-x-[1px] active:translate-y-[1px] text-black text-xs font-black transition-all flex items-center gap-1 cursor-pointer ms-auto border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000]"
                                      >
                                        <Undo2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                        <span>{at.aiUndoAction}</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Contextual Suggested Follow-up Chips (Neubrutalism) */}
                    {!isUser && Array.isArray(msg.suggestedPrompts) && msg.suggestedPrompts.length > 0 && (
                      <div className="mt-4 pt-2.5 border-t-2 border-black flex flex-wrap items-center gap-2">
                        {msg.suggestedPrompts.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleSendMessage(sug)}
                            disabled={isCopilotThinking}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFE600] active:translate-x-[1px] active:translate-y-[1px] text-black border-2 border-black text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000]"
                          >
                            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{sug}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Live Dynamic Planning Stream While AI is Thinking */}
            {isCopilotThinking && (
              <div className="rounded-3xl border-2 border-black bg-white p-4 sm:p-5 space-y-3 max-w-md shadow-[4px_4px_0px_0px_#000]">
                <div className="flex items-center justify-between gap-2 pb-2 border-b-2 border-black">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-black stroke-[3]" />
                    <span className="font-mono text-xs sm:text-sm font-black text-black">
                      {isRtl ? 'Copilot جاري التفكير ومعالجة البيانات...' : 'DeepSeek Copilot Processing...'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-[#FFE600] border border-black rounded text-[10px] font-mono font-black">
                    Live
                  </span>
                </div>

                {/* Dynamic Live Step Tracker */}
                <OrderTracking
                  isRtl={isRtl}
                  steps={[
                    {
                      name: isRtl ? 'قراءة سياق المتجر وفحص قاعدة البيانات' : 'Ingest Store Context',
                      description: isRtl ? `فحص ${products.length} منتج و ${orders.length} طلب` : `Inspecting ${products.length} products`,
                      isCompleted: planningStage > 1,
                      isActive: planningStage === 1,
                    },
                    {
                      name: isRtl ? 'تحليل شروط الاستثناء والاستبعاد' : 'Evaluate Exemptions (Netflix, Gemini)',
                      description: isRtl ? 'حماية المنتجات المستثناة' : 'Isolate exempt entities',
                      isCompleted: planningStage > 2,
                      isActive: planningStage === 2,
                    },
                    {
                      name: isRtl ? 'بناء خطة العمليات والتنفيذ' : 'Synthesize Action Plan',
                      description: isRtl ? 'عزل العناصر وحساب التغييرات' : 'Prepare database mutation',
                      isCompleted: planningStage > 3,
                      isActive: planningStage === 3,
                    },
                    {
                      name: isRtl ? 'التحقق من الأمان وإعداد الرد' : 'Safety Check & Formatting',
                      description: isRtl ? 'طلب الموافقة السريعة عند الحاجة' : 'Finalizing response',
                      isCompleted: false,
                      isActive: planningStage >= 4,
                    },
                  ]}
                />
              </div>
            )}

            <div ref={copilotChatBottomRef} />
          </div>

          {/* Quick Prompts Strip (Neubrutalism Chips) */}
          <div className="px-3.5 py-2 bg-white border-t-2 border-black flex items-center justify-between gap-2 overflow-x-auto select-none">
            <div className="flex items-center gap-2 shrink-0">
              {topEssentialChips.map((chip, cIdx) => {
                const IconComp = chip.icon;
                return (
                  <button
                    key={cIdx}
                    type="button"
                    onClick={() => handleSendMessage(chip.prompt)}
                    disabled={isCopilotThinking}
                    className="px-3 py-1 rounded-xl bg-white hover:bg-[#FFE600] active:translate-x-[1px] active:translate-y-[1px] text-black border-2 border-black text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-[2px_2px_0px_0px_#000] disabled:opacity-40"
                  >
                    <IconComp className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsQuickCommandModalOpen(true)}
              className="text-xs font-mono text-black font-black transition-colors cursor-pointer flex items-center gap-1 shrink-0 px-3 py-1 rounded-xl bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#ffe100] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <span>{isRtl ? 'جميع الأوامر' : 'All Commands'}</span>
            </button>
          </div>

          {/* Mobile & Desktop Input Form (Neubrutalism) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 sm:p-4 bg-[#FFFDF9] border-t-2 border-black flex items-center gap-2.5"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder={isRtl ? 'اطلب من Copilot: "خفض السعر 10%", "شحن محفظة", "احذف عدا نتفلكس", "فحص المتجر"...' : 'Command Copilot anything: discount, refund, restock, audit...'}
                className="w-full px-4 py-3 bg-white border-2 border-black rounded-2xl text-black font-bold outline-none focus:bg-[#FFFDF9] text-xs sm:text-sm font-sans transition-all placeholder:text-neutral-500 shadow-[3px_3px_0px_0px_#000]"
                disabled={isCopilotThinking}
              />
            </div>
            <button
              type="submit"
              disabled={!copilotInput.trim() || isCopilotThinking}
              className="px-4 sm:px-6 py-3 bg-[#06D6A0] hover:bg-[#05b888] active:translate-x-[2px] active:translate-y-[2px] text-black font-black text-xs sm:text-sm rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_#000] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 shrink-0"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">{at.sendAiMessage}</span>
            </button>
          </form>
        </div>

        {/* ─── QUICK COMMAND PALETTE MODAL (NEUBRUTALISM) ─── */}
        <AnimatePresence>
          {isQuickCommandModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-xl bg-white border-2 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_#000] flex flex-col font-sans max-h-[85vh] text-black"
              >
                <div className="p-4 bg-[#FFFDF9] border-b-2 border-black flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-2xl bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                      <Zap className="w-5 h-5 fill-black stroke-black" />
                    </div>
                    <div>
                      <h3 className="font-black text-black text-sm sm:text-base">
                        {isRtl ? 'لوحة أوامر Copilot الفورية' : 'Copilot Command Center'}
                      </h3>
                      <p className="text-xs text-neutral-800 font-bold mt-0.5">
                        {isRtl ? 'اختر أي إجراء تنفيذي للتطبيق الفوري في المتجر' : 'Execute instant platform operations'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQuickCommandModalOpen(false)}
                    className="p-1.5 rounded-xl bg-white hover:bg-[#FF6B6B] border-2 border-black text-black transition-colors cursor-pointer shadow-[1.5px_1.5px_0px_0px_#000]"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Category Tabs */}
                <div className="flex items-center gap-1.5 p-2.5 bg-neutral-100 border-b-2 border-black text-xs font-mono overflow-x-auto">
                  {[
                    { id: 'products', label: isRtl ? 'المنتجات' : 'Products', icon: Package },
                    { id: 'orders', label: isRtl ? 'الطلبات' : 'Orders', icon: ShoppingCart },
                    { id: 'marketing', label: isRtl ? 'التسويق والإشعارات' : 'Marketing', icon: Megaphone },
                    { id: 'audit', label: isRtl ? 'التدقيق الشامل' : 'Audit', icon: TrendingUp },
                  ].map((tab) => {
                    const IconComp = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCommandPaletteTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all font-black text-xs cursor-pointer shrink-0 border-2 border-black ${
                          commandPaletteTab === tab.id
                            ? 'bg-[#FFE600] text-black shadow-[2px_2px_0px_0px_#000]'
                            : 'bg-white text-neutral-700 hover:text-black'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Commands Grid */}
                <div className="p-4 max-h-80 overflow-y-auto space-y-2.5 bg-[#F8F9FA]">
                  {categorizedCommands[commandPaletteTab].map((cmd, idx) => {
                    const IconComp = cmd.icon;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setIsQuickCommandModalOpen(false);
                          handleSendMessage(cmd.prompt);
                        }}
                        className="p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-[#FFFDF9] border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-[#FFE600] border-2 border-black group-hover:bg-[#06D6A0] text-black shrink-0 mt-0.5 shadow-[1.5px_1.5px_0px_0px_#000] transition-colors">
                            <IconComp className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <div>
                            <h5 className="font-black text-black text-xs sm:text-sm">
                              {cmd.label}
                            </h5>
                            <p className="text-xs text-neutral-700 font-bold mt-0.5 leading-relaxed line-clamp-2">
                              {cmd.prompt}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-black shrink-0 mt-1 rtl:rotate-180 stroke-[2.5]" />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── SMART CONTEXT WINDOW / DRAWER (NEUBRUTALISM) ─── */}
        <AnimatePresence>
          {isContextDrawerOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, x: isRtl ? -450 : 450 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRtl ? -450 : 450 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md sm:max-w-xl bg-white border-s-2 border-black h-full flex flex-col shadow-[6px_0px_0px_0px_#000] text-black"
              >
                {/* Context Drawer Header */}
                <div className="p-4 bg-[#FFFDF9] border-b-2 border-black flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-2xl bg-[#06D6A0] border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                      <Database className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="font-black text-black text-sm sm:text-base">
                        {isRtl ? 'سياق غرفة التحكم وقاعدة البيانات' : 'Control Room Live Context'}
                      </h3>
                      <p className="text-xs text-neutral-800 font-bold">
                        {isRtl ? 'بيانات Supabase المتاحة لـ Copilot' : 'Supabase entities accessible by Copilot'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsContextDrawerOpen(false)}
                    className="p-1.5 rounded-xl bg-white hover:bg-[#FF6B6B] border-2 border-black text-black transition-colors cursor-pointer shadow-[1.5px_1.5px_0px_0px_#000]"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Context Category Tabs */}
                <div className="flex items-center gap-1.5 p-2.5 bg-neutral-100 border-b-2 border-black text-xs font-mono overflow-x-auto">
                  {[
                    { id: 'overview', label: isRtl ? 'نظرة عامة' : 'Overview', icon: Layers },
                    { id: 'products', label: `${isRtl ? 'المنتجات' : 'Products'} (${products.length})`, icon: Package },
                    { id: 'orders', label: `${isRtl ? 'الطلبات' : 'Orders'} (${orders.length})`, icon: ShoppingCart },
                    { id: 'users', label: `${isRtl ? 'المستخدمين' : 'Users'} (${profiles.length})`, icon: Users },
                  ].map((tab) => {
                    const IconComp = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setContextTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all font-black text-xs cursor-pointer shrink-0 border-2 border-black ${
                          contextTab === tab.id
                            ? 'bg-[#FFE600] text-black shadow-[2px_2px_0px_0px_#000]'
                            : 'bg-white text-neutral-700 hover:text-black'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Context Drawer Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 font-sans text-xs bg-[#F8F9FA] scrollbar-thin">
                  {/* Overview Tab */}
                  {contextTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 font-mono">
                        <div className="p-3.5 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000]">
                          <span className="text-xs text-neutral-700 uppercase font-black block">{isRtl ? 'المنتجات' : 'Products'}</span>
                          <span className="text-2xl font-black text-black mt-1 block">{products.length}</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000]">
                          <span className="text-xs text-neutral-700 uppercase font-black block">{isRtl ? 'الطلبات' : 'Orders'}</span>
                          <span className="text-2xl font-black text-black mt-1 block">{orders.length}</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000]">
                          <span className="text-xs text-neutral-700 uppercase font-black block">{isRtl ? 'المستخدمين' : 'Users'}</span>
                          <span className="text-2xl font-black text-black mt-1 block">{profiles.length}</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000]">
                          <span className="text-xs text-neutral-700 uppercase font-black block">{isRtl ? 'المحرك' : 'AI Engine'}</span>
                          <span className="text-sm font-black text-black mt-1.5 block truncate">DeepSeek V4</span>
                        </div>
                      </div>

                      {/* Exemption Status */}
                      <div className="p-4 rounded-2xl bg-[#FFFDF9] border-2 border-black shadow-[3px_3px_0px_0px_#000] space-y-2">
                        <div className="flex items-center gap-2 text-black font-black text-sm">
                          <ShieldAlert className="w-4 h-4 text-black stroke-[2.5]" />
                          <span>{isRtl ? 'درع حماية الاستثناءات مفعل' : 'Exemption Shield Active'}</span>
                        </div>
                        <p className="text-xs text-neutral-800 font-bold leading-relaxed">
                          {isRtl
                            ? 'يتم عزل المنتجات المعفاة تلقائياً (مثل Netflix و Gemini) وطلب الموافقة الصريحة قبل أي عملية حذف جماعي أو تعديل جذري.'
                            : 'Protected entities are automatically isolated before mass deletions or major modifications.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Products Tab */}
                  {contextTab === 'products' && (
                    <div className="space-y-3 font-mono">
                      <input
                        type="text"
                        value={contextSearchQuery}
                        onChange={(e) => setContextSearchQuery(e.target.value)}
                        placeholder={isRtl ? 'تصفية المنتجات...' : 'Filter products...'}
                        className="w-full px-3.5 py-2 bg-white border-2 border-black rounded-xl text-black font-bold text-xs outline-none shadow-[2px_2px_0px_0px_#000]"
                      />
                      <div className="space-y-2 max-h-[420px] overflow-y-auto">
                        {products
                          .filter((p) =>
                            !contextSearchQuery ||
                            p.name.toLowerCase().includes(contextSearchQuery.toLowerCase()) ||
                            (p.name_ar && p.name_ar.includes(contextSearchQuery))
                          )
                          .map((p) => (
                            <div key={p.id} className="p-3 rounded-2xl bg-white border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] flex items-center justify-between gap-2 text-xs">
                              <div className="truncate">
                                <p className="text-black font-black truncate">{p.name}</p>
                                <p className="text-xs text-neutral-700 font-bold mt-0.5">${p.our_price} • {p.stock} units in stock</p>
                              </div>
                              <span className="text-[10px] text-neutral-600 font-mono truncate max-w-[90px] font-bold">{p.slug}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Orders Tab */}
                  {contextTab === 'orders' && (
                    <div className="space-y-2 max-h-[450px] overflow-y-auto font-mono">
                      {orders.slice(0, 30).map((o) => (
                        <div key={o.id} className="p-3 rounded-2xl bg-white border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] flex items-center justify-between gap-2 text-xs">
                          <div>
                            <p className="text-black font-black">${o.amount} • {o.products?.name || 'Order'}</p>
                            <p className="text-xs text-neutral-700 font-bold truncate max-w-[170px] mt-0.5">{o.profiles?.email || o.user_id}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-xl border border-black text-[10px] font-black shadow-[1px_1px_0px_0px_#000] ${
                            o.status === 'completed' ? 'bg-[#06D6A0] text-black' : 'bg-[#FFE600] text-black'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Users Tab */}
                  {contextTab === 'users' && (
                    <div className="space-y-2 max-h-[450px] overflow-y-auto font-mono">
                      {profiles.slice(0, 35).map((u) => (
                        <div key={u.id} className="p-3 rounded-2xl bg-white border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] flex items-center justify-between gap-2 text-xs">
                          <div className="truncate">
                            <p className="text-black font-black truncate">{u.email}</p>
                            <p className="text-xs text-neutral-700 font-bold mt-0.5">{u.display_name || 'User'} • Wallet: ${u.wallet_balance || 0}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-xl bg-[#FFFDF9] border border-black text-[10px] text-black font-black shadow-[1px_1px_0px_0px_#000]">
                            {u.role || 'customer'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Context Drawer Footer */}
                <div className="p-3.5 bg-[#FFFDF9] border-t-2 border-black flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await loadData();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#06D6A0] active:translate-x-[1px] active:translate-y-[1px] border-2 border-black text-black text-xs font-mono font-black transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isRtl ? 'تحديث البيانات' : 'Sync Live'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const contextPayload = {
                        productsCount: products.length,
                        ordersCount: orders.length,
                        usersCount: profiles.length,
                        settings: siteSettings,
                      };
                      navigator.clipboard.writeText(JSON.stringify(contextPayload, null, 2));
                      setCopiedContext(true);
                      setTimeout(() => setCopiedContext(false), 2000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#FFE600] hover:bg-[#ffe100] active:translate-x-[1px] active:translate-y-[1px] border-2 border-black text-black text-xs font-mono font-black transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                  >
                    {copiedContext ? <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{copiedContext ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ JSON' : 'Copy JSON')}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Serper Image Picker Modal for Copilot Plan Custom Selection */}
        <SerperImagePickerModal
          isOpen={copilotSerperModalOpen}
          onClose={() => {
            setCopilotSerperModalOpen(false);
            setActivePlanTargetMessageId(null);
          }}
          onSelectImage={(importedUrl) => {
            if (activePlanTargetMessageId) {
              handleSelectImageForPlan(activePlanTargetMessageId, importedUrl);
            }
          }}
          initialQuery={serperCustomSearchQuery}
          isRtl={isRtl}
        />
      </div>
    </div>
  );
};

