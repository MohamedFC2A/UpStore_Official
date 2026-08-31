import { NextResponse } from 'next/server';
import { requireAdminUser, enforceSameOriginRequest, buildSafeStorageObjectName } from '@/utils/security';
import { generateChatCompletion, extractJSONFromAIResponse, AIMessage } from '@/utils/ai';
import { generateSmartProductAdvantages, generateSmartProductAttributes } from '@/utils/products';

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

export interface AdminCopilotRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    actions?: any[];
    plan?: ExecutionPlan | null;
  }>;
  context?: {
    products?: Array<{
      id: string;
      name: string;
      name_ar?: string;
      slug: string;
      category: string;
      our_price: number;
      market_price: number;
      price_egp?: number;
      price_sar?: number;
      stock: number;
      is_flash_deal?: boolean;
      flash_deal_price?: number;
      warranty_duration?: string;
      delivery_time?: string;
      image_url?: string;
    }>;
    orders?: Array<{
      id: string;
      amount: number;
      status: string;
      user_id: string;
      created_at: string;
      session_id?: string;
      product_key?: string | null;
      profiles?: { email?: string; display_name?: string } | null;
      products?: { name?: string } | null;
    }>;
    users?: Array<{
      id: string;
      email: string;
      display_name?: string;
      role: string;
      wallet_balance?: number;
    }>;
    settings?: {
      announcement_text?: string;
      maintenance_mode?: boolean;
      referral_bonus?: number;
      flash_deal_urgency_text_ar?: string;
      flash_deal_urgency_text_en?: string;
    };
    totalProducts?: number;
    totalOrders?: number;
    pendingManualOrders?: number;
    totalUsers?: number;
    activeTab?: string;
  };
  confirmed_actions?: CopilotAction[];
  confirmed_plan?: ExecutionPlan;
  task?: 'chat' | 'announcement' | 'telegram_post' | 'support_reply' | 'discount_campaign';
}

export interface CopilotAction {
  tool: string;
  params: Record<string, any>;
  description: string;
  status?: 'success' | 'failed' | 'client_dispatched';
  result?: any;
  diff?: Record<string, { before: any; after: any }>;
  error?: string;
}

interface CopilotAIResponse {
  reply: string;
  actions?: CopilotAction[];
  plan?: ExecutionPlan | null;
  requires_confirmation?: boolean;
  suggestedPrompts?: string[];
}

function cleanReplyString(reply: string): string {
  if (!reply || typeof reply !== 'string') return '';
  let cleaned = reply.trim();

  // If the reply itself is a JSON string, extract the text
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.reply && typeof parsed.reply === 'string') {
        return cleanReplyString(parsed.reply);
      }
    } catch {}
  }

  // Remove stray markdown code fences with json if present
  cleaned = cleaned.replace(/```(?:json)?s*[sS]*?```/gi, '').trim();

  // If cleaned still starts with {"actions": or {"reply":, strip the leading JSON fragment
  if (cleaned.startsWith('{"actions"') || cleaned.startsWith('{"reply"')) {
    const firstBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && firstBrace < cleaned.length - 1) {
      cleaned = cleaned.slice(firstBrace + 1).trim();
    }
  }

  return cleaned;
}

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) {
      return originError;
    }

    const auth = await requireAdminUser();
    if (auth.error || !auth.supabase) {
      return auth.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = auth.supabase;
    const body: AdminCopilotRequest = await req.json();
    const { messages, context, confirmed_actions, confirmed_plan } = body;

    // Helper: Find product in DB with enhanced fuzzy alias matching
    const findProduct = async (identifier: string) => {
      if (!identifier) return null;
      const clean = identifier.trim().toLowerCase();

      // 1. Direct UUID/slug match
      const { data: exact } = await supabase
        .from('products')
        .select('*')
        .or(`id.eq.${identifier},slug.eq.${clean}`)
        .limit(1);

      if (exact && exact.length > 0) return exact[0];

      // 2. Query all products to perform fuzzy name / Arabic name / alias match
      const { data: allProds } = await supabase.from('products').select('*');
      if (!allProds || allProds.length === 0) return null;

      // Common aliases mapping
      const aliases: Record<string, string[]> = {
        netflix: ['نتفلكس', 'نتفليكس', 'netflix'],
        discord: ['ديسكورد', 'دسكورد', 'نيترو', 'discord', 'nitro'],
        spotify: ['سبوتيفاي', 'سبوتفاي', 'spotify'],
        youtube: ['يوتيوب', 'youtube'],
        chatgpt: ['شات جي بي تي', 'شات جبت', 'chatgpt', 'openai', 'gpt'],
        gemini: ['جيميناي', 'جيمناي', 'gemini'],
        nordvpn: ['نورد', 'nordvpn', 'nord', 'vpn'],
        canva: ['كانفا', 'canva'],
        crunchyroll: ['كرانشي', 'crunchyroll'],
        windows: ['ويندوز', 'windows'],
        office: ['اوفيس', 'أوفيس', 'office'],
      };

      const matched = allProds.find((p: any) => {
        const pName = (p.name || '').toLowerCase();
        const pNameAr = (p.name_ar || '').toLowerCase();
        const pSlug = (p.slug || '').toLowerCase();

        if (p.id === identifier || pSlug === clean || pName === clean || pNameAr === clean) return true;
        if (pName.includes(clean) || clean.includes(pName)) return true;
        if (pNameAr && (pNameAr.includes(clean) || clean.includes(pNameAr))) return true;

        // Check aliases
        for (const [key, aliasList] of Object.entries(aliases)) {
          if (aliasList.some((al) => clean.includes(al))) {
            if (pName.includes(key) || pSlug.includes(key) || (pNameAr && aliasList.some((al) => pNameAr.includes(al)))) {
              return true;
            }
          }
        }

        return false;
      });

      return matched || allProds[0];
    };

    // Helper: Find user profile
    const findProfile = async (identifier: string) => {
      if (!identifier) return null;
      const clean = identifier.trim().toLowerCase();

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      if (!profiles || profiles.length === 0) return null;

      return profiles.find((p: any) => {
        const email = (p.email || '').toLowerCase();
        const name = (p.display_name || '').toLowerCase();
        return p.id === identifier || email === clean || email.includes(clean) || name.includes(clean);
      });
    };

    // Helper: Execute a list of CopilotAction tools on DB
    const executeActionList = async (actionsToRun: CopilotAction[]): Promise<CopilotAction[]> => {
      const executed: CopilotAction[] = [];

      for (const action of actionsToRun) {
        const { tool, params, description } = action;
        const currentAction: CopilotAction = {
          tool,
          params: params || {},
          description: description || `Executed ${tool}`,
          status: 'success',
        };

        try {
          switch (tool) {
            case 'create_product': {
              const baseSlug =
                params.slug ||
                (params.name || 'product')
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '');
              const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

              const ourPrice = Number(params.our_price) || 0;
              const marketPrice = Number(params.market_price) || Math.round(ourPrice * 1.6 * 100) / 100;
              const priceEgp = Number(params.price_egp) || Math.ceil(ourPrice * 53);
              const priceSar = Number(params.price_sar) || Math.ceil(ourPrice * 4);
              const stock = Number(params.stock) || 50;
              const maxStock = Number(params.max_stock) || 100;

              const hexColor = params.brand_color || '#10b981';
              const formattedBrandColor = hexColor.startsWith('#')
                ? `hover:border-[${hexColor}]/40 hover:bg-[${hexColor}]/5`
                : hexColor;

              const sDur = params.subscription_duration || '1 Month';
              const wDur = params.warranty_duration || sDur;

              const smartAdv = generateSmartProductAdvantages({
                name: params.name,
                name_ar: params.name_ar,
                category: params.category,
                description: params.description,
                description_ar: params.description_ar,
                subscription_duration: sDur,
                warranty_duration: wDur,
              });

              const smartAttrs = Array.isArray(params.attributes) && params.attributes.length > 0
                ? params.attributes
                : generateSmartProductAttributes({
                    name: params.name,
                    name_ar: params.name_ar,
                    category: params.category,
                    description: params.description,
                    subscription_duration: sDur,
                    warranty_duration: wDur,
                  });

              const newProductPayload = {
                name: params.name || 'Untitled Product',
                name_ar: params.name_ar || params.name || 'منتج جديد',
                slug: uniqueSlug,
                category: params.category || 'Subscriptions',
                market_price: marketPrice,
                our_price: ourPrice,
                price_egp: priceEgp,
                price_sar: priceSar,
                stock: stock,
                max_stock: maxStock,
                brand_color: formattedBrandColor,
                icon_name: params.icon_name || 'sparkles',
                image_url: params.image_url || '',
                description: params.description || '',
                description_ar: params.description_ar || '',
                advantages: Array.isArray(params.advantages) && params.advantages.length > 0
                  ? params.advantages
                  : smartAdv.advantages,
                advantages_ar: Array.isArray(params.advantages_ar) && params.advantages_ar.length > 0
                  ? params.advantages_ar
                  : smartAdv.advantages_ar,
                attributes: smartAttrs,
                warranty_duration: wDur,
                delivery_time: params.delivery_time || 'Instant',
                subscription_duration: sDur,
                is_flash_deal: !!params.is_flash_deal,
                flash_deal_price: params.flash_deal_price ? Number(params.flash_deal_price) : null,
                flash_deal_duration_hours: Number(params.flash_deal_duration_hours) || 12,
                delivery_mode: params.delivery_mode || 'key',
                rating: 5.0,
                reviews: 1,
              };

              const { data: createdProd, error: createErr } = await supabase
                .from('products')
                .insert(newProductPayload)
                .select('*')
                .single();

              if (createErr) throw createErr;
              currentAction.status = 'success';
              currentAction.result = createdProd;
              currentAction.diff = {
                product: { before: null, after: `${createdProd.name} (${createdProd.our_price})` },
                stock: { before: null, after: `${stock} units` },
                category: { before: null, after: createdProd.category },
              };
              break;
            }

            case 'update_product': {
              const product = await findProduct(params.product_id || params.name || params.slug);
              if (!product) {
                throw new Error(`Product "${params.product_id || params.name}" not found in database.`);
              }

              const updates: Record<string, any> = {};
              const diff: Record<string, { before: any; after: any }> = {};

              if (params.name && params.name !== product.name) {
                diff.name = { before: product.name, after: params.name };
                updates.name = params.name;
              }
              if (params.name_ar && params.name_ar !== product.name_ar) {
                diff.name_ar = { before: product.name_ar, after: params.name_ar };
                updates.name_ar = params.name_ar;
              }
              if (params.category && params.category !== product.category) {
                diff.category = { before: product.category, after: params.category };
                updates.category = params.category;
              }

              let newPrice = product.our_price;
              if (params.our_price !== undefined) {
                newPrice = Number(params.our_price);
              } else if (params.price_delta !== undefined) {
                newPrice = Math.max(0.1, Number(product.our_price) + Number(params.price_delta));
              } else if (params.price_percentage_discount !== undefined) {
                const discountFactor = (100 - Number(params.price_percentage_discount)) / 100;
                newPrice = Math.max(0.1, Math.round(Number(product.our_price) * discountFactor * 100) / 100);
              }

              if (newPrice !== product.our_price) {
                diff.our_price = { before: `${product.our_price}`, after: `${newPrice}` };
                updates.our_price = newPrice;
                updates.price_egp = params.price_egp !== undefined ? Number(params.price_egp) : Math.ceil(newPrice * 53);
                updates.price_sar = params.price_sar !== undefined ? Number(params.price_sar) : Math.ceil(newPrice * 4);
              }

              let newStock = product.stock;
              if (params.stock !== undefined) {
                newStock = Number(params.stock);
              } else if (params.stock_delta !== undefined) {
                newStock = Math.max(0, Number(product.stock) + Number(params.stock_delta));
              }
              if (newStock !== product.stock) {
                diff.stock = { before: `${product.stock} units`, after: `${newStock} units` };
                updates.stock = newStock;
              }

              if (params.is_flash_deal !== undefined) {
                diff.is_flash_deal = { before: product.is_flash_deal ? 'Active' : 'Inactive', after: params.is_flash_deal ? 'Active' : 'Inactive' };
                updates.is_flash_deal = !!params.is_flash_deal;
                if (params.flash_deal_price !== undefined) {
                  updates.flash_deal_price = Number(params.flash_deal_price);
                }
                if (params.flash_deal_duration_hours !== undefined) {
                  updates.flash_deal_duration_hours = Number(params.flash_deal_duration_hours);
                }
              }

              if (params.description !== undefined) updates.description = params.description;
              if (params.description_ar !== undefined) updates.description_ar = params.description_ar;
              if (params.advantages !== undefined) updates.advantages = params.advantages;
              if (params.advantages_ar !== undefined) updates.advantages_ar = params.advantages_ar;

              if (params.brand_color) {
                const hexColor = params.brand_color;
                updates.brand_color = hexColor.startsWith('#')
                  ? `hover:border-[${hexColor}]/40 hover:bg-[${hexColor}]/5`
                  : hexColor;
              }
              if (params.icon_name) updates.icon_name = params.icon_name;

              const { data: updatedProd, error: updateErr } = await supabase
                .from('products')
                .update(updates)
                .eq('id', product.id)
                .select('*')
                .single();

              if (updateErr) throw updateErr;
              currentAction.status = 'success';
              currentAction.result = updatedProd;
              currentAction.diff = diff;
              break;
            }

            case 'delete_product': {
              const product = await findProduct(params.product_id || params.name || params.slug);
              if (!product) {
                throw new Error(`Product "${params.product_id || params.name}" not found.`);
              }

              // 1. Clean up child relations safely to prevent foreign key constraint violations
              try {
                await supabase.from('product_credentials').delete().eq('product_id', product.id);
              } catch (e) {
                console.warn('[Copilot Delete]: product_credentials cleanup:', e);
              }
              try {
                await supabase.from('product_variants').delete().eq('product_id', product.id);
              } catch (e) {
                console.warn('[Copilot Delete]: product_variants cleanup:', e);
              }
              try {
                await supabase.from('reviews').delete().eq('product_id', product.id);
              } catch (e) {
                console.warn('[Copilot Delete]: reviews cleanup:', e);
              }

              // 2. Delete the product itself
              const { error: delErr } = await supabase
                .from('products')
                .delete()
                .eq('id', product.id);

              if (delErr) throw delErr;
              currentAction.status = 'success';
              currentAction.result = { id: product.id, name: product.name };
              currentAction.diff = {
                product: { before: product.name, after: 'DELETED (تم الحذف بنجاح)' },
              };
              break;
            }

            case 'bulk_delete_products': {
              const { data: allProds } = await supabase.from('products').select('*');
              if (!allProds || allProds.length === 0) {
                currentAction.status = 'success';
                currentAction.result = { deletedCount: 0 };
                currentAction.diff = { products: { before: '0 items', after: '0 items deleted' } };
                break;
              }

              let targetProds = allProds;
              const exemptIdentifiers = Array.isArray(params.exempt_identifiers)
                ? params.exempt_identifiers.map((i: string) => i.toLowerCase().trim())
                : [];

              if (exemptIdentifiers.length > 0) {
                targetProds = targetProds.filter((p: any) => {
                  const pName = (p.name || '').toLowerCase();
                  const pNameAr = (p.name_ar || '').toLowerCase();
                  const pSlug = (p.slug || '').toLowerCase();
                  const isExempt = exemptIdentifiers.some((ex) =>
                    p.id === ex || pSlug === ex || pName.includes(ex) || (pNameAr && pNameAr.includes(ex))
                  );
                  return !isExempt;
                });
              }

              if (Array.isArray(params.product_ids) && params.product_ids.length > 0) {
                targetProds = targetProds.filter((p: any) => params.product_ids.includes(p.id));
              }

              let deletedCount = 0;
              for (const p of targetProds) {
                try {
                  await supabase.from('product_credentials').delete().eq('product_id', p.id);
                  await supabase.from('product_variants').delete().eq('product_id', p.id);
                  await supabase.from('reviews').delete().eq('product_id', p.id);
                  await supabase.from('products').delete().eq('id', p.id);
                  deletedCount++;
                } catch (delErr) {
                  console.error(`[Copilot Bulk Delete Error on ${p.name}]:`, delErr);
                }
              }

              currentAction.status = 'success';
              currentAction.result = { deletedCount, targetsCount: targetProds.length };
              currentAction.diff = {
                bulk_delete: {
                  before: `${targetProds.length} products selected for deletion`,
                  after: `${deletedCount} products deleted from store`,
                },
              };
              break;
            }

            case 'duplicate_product': {
              const source = await findProduct(params.source_product_id);
              if (!source) throw new Error(`Source product "${params.source_product_id}" not found.`);

              const newName = params.new_name || `${source.name} (Copy)`;
              const newNameAr = params.new_name_ar || `${source.name_ar || source.name} (نسخة)`;
              const newPrice = Number(params.new_price) || source.our_price;
              const newDuration = params.subscription_duration || source.subscription_duration || '1 Month';

              const cleanBase = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              const newSlug = `${cleanBase}-${Date.now().toString().slice(-4)}`;

              const clonePayload = {
                ...source,
                id: undefined,
                name: newName,
                name_ar: newNameAr,
                slug: newSlug,
                our_price: newPrice,
                market_price: Math.round(newPrice * 1.5 * 100) / 100,
                price_egp: Math.ceil(newPrice * 53),
                price_sar: Math.ceil(newPrice * 4),
                subscription_duration: newDuration,
              };

              const { data: cloned, error: cloneErr } = await supabase
                .from('products')
                .insert(clonePayload)
                .select('*')
                .single();

              if (cloneErr) throw cloneErr;
              currentAction.status = 'success';
              currentAction.result = cloned;
              currentAction.diff = {
                cloned: { before: source.name, after: `${cloned.name} (Slug: ${cloned.slug})` },
              };
              break;
            }

            case 'bulk_update_products': {
              const { data: allProds } = await supabase.from('products').select('*');
              if (!allProds) throw new Error('No products found in store');

              let targetProds = allProds;
              const filter = params.filter || {};

              if (filter.category && filter.category !== 'all') {
                targetProds = targetProds.filter((p: any) => p.category?.toLowerCase() === filter.category.toLowerCase());
              }
              if (filter.out_of_stock_only) {
                targetProds = targetProds.filter((p: any) => p.stock === 0);
              }
              if (Array.isArray(filter.product_names) && filter.product_names.length > 0) {
                const namesLower = filter.product_names.map((n: string) => n.toLowerCase());
                targetProds = targetProds.filter((p: any) =>
                  namesLower.some((n: string) => (p.name || '').toLowerCase().includes(n) || (p.name_ar || '').toLowerCase().includes(n))
                );
              }

              const updates = params.updates || {};
              let updatedCount = 0;

              for (const p of targetProds) {
                const pUpdates: Record<string, any> = {};

                if (updates.price_percentage_discount) {
                  const factor = (100 - Number(updates.price_percentage_discount)) / 100;
                  const newP = Math.max(0.1, Math.round(Number(p.our_price) * factor * 100) / 100);
                  pUpdates.our_price = newP;
                  pUpdates.price_egp = Math.ceil(newP * 53);
                  pUpdates.price_sar = Math.ceil(newP * 4);
                }
                if (updates.set_stock !== undefined) {
                  pUpdates.stock = Number(updates.set_stock);
                } else if (updates.add_stock !== undefined) {
                  pUpdates.stock = Math.max(0, Number(p.stock) + Number(updates.add_stock));
                }
                if (updates.is_flash_deal !== undefined) {
                  pUpdates.is_flash_deal = !!updates.is_flash_deal;
                  if (updates.flash_deal_duration_hours) {
                    pUpdates.flash_deal_duration_hours = Number(updates.flash_deal_duration_hours);
                  }
                }

                if (Object.keys(pUpdates).length > 0) {
                  await supabase.from('products').update(pUpdates).eq('id', p.id);
                  updatedCount++;
                }
              }

              currentAction.status = 'success';
              currentAction.result = { updatedCount, totalMatched: targetProds.length };
              currentAction.diff = {
                bulk_update: { before: `${targetProds.length} products selected`, after: `${updatedCount} products updated` },
              };
              break;
            }

            case 'restock_low_stock_products': {
              const threshold = Number(params.threshold) || 5;
              const targetStock = Number(params.target_stock) || 50;

              const { data: lowProds } = await supabase
                .from('products')
                .select('*')
                .lte('stock', threshold);

              let restockedCount = 0;
              if (lowProds && lowProds.length > 0) {
                for (const p of lowProds) {
                  await supabase.from('products').update({ stock: targetStock }).eq('id', p.id);
                  restockedCount++;
                }
              }

              currentAction.status = 'success';
              currentAction.result = { restockedCount, threshold, targetStock };
              currentAction.diff = {
                restock: { before: `${restockedCount} items (stock <= ${threshold})`, after: `Stock set to ${targetStock} units each` },
              };
              break;
            }

            case 'apply_flash_deal': {
              const { data: allProds } = await supabase.from('products').select('*');
              if (!allProds) throw new Error('No products found');

              const discount = Number(params.discount_percentage) || 20;
              const durationHours = Number(params.duration_hours) || 24;
              const enabled = params.enabled !== false;
              const identifiers: string[] = Array.isArray(params.product_identifiers) ? params.product_identifiers : ['all'];

              let targetList = allProds;
              if (!identifiers.includes('all')) {
                const idLower = identifiers.map((i) => i.toLowerCase());
                targetList = allProds.filter((p: any) =>
                  idLower.some((id) => p.id === id || p.slug === id || (p.name || '').toLowerCase().includes(id) || (p.name_ar || '').toLowerCase().includes(id))
                );
              }

              let count = 0;
              for (const p of targetList) {
                const baseMkt = Number(p.market_price) || (Number(p.our_price) * 3);
                const flashPrice = enabled ? Math.max(0.1, Math.round(baseMkt * 0.30 * 100) / 100) : null;
                await supabase
                  .from('products')
                  .update({
                    is_flash_deal: enabled,
                    flash_deal_price: flashPrice,
                    flash_deal_duration_hours: durationHours,
                  })
                  .eq('id', p.id);
                count++;
              }

              currentAction.status = 'success';
              currentAction.result = { count, enabled, discount };
              currentAction.diff = {
                flash_deal: { before: enabled ? 'Regular Price' : 'Flash Deal Active', after: enabled ? `${count} items on ${discount}% Flash Sale` : 'Flash Deals Disabled' },
              };
              break;
            }

            case 'update_order_status': {
              const { data: ord } = await supabase.from('orders').select('*').eq('id', params.order_id).single();
              if (!ord) throw new Error(`Order "${params.order_id}" not found`);

              const updates: Record<string, any> = { status: params.status };
              if (params.product_key) updates.product_key = params.product_key;

              await supabase.from('orders').update(updates).eq('id', ord.id);
              currentAction.status = 'success';
              currentAction.result = { id: ord.id, status: params.status };
              currentAction.diff = {
                order_status: { before: ord.status, after: params.status },
              };
              break;
            }

            case 'approve_manual_order': {
              let query = supabase.from('orders').select('*');
              if (params.session_id) query = query.eq('session_id', params.session_id);
              else if (params.order_id) query = query.eq('id', params.order_id);

              const { data: ords } = await query;
              if (!ords || ords.length === 0) throw new Error('No matching order found to approve');

              for (const o of ords) {
                await supabase.from('orders').update({ status: 'completed' }).eq('id', o.id);
              }

              currentAction.status = 'success';
              currentAction.result = { approvedCount: ords.length };
              currentAction.diff = {
                manual_order: { before: 'pending', after: 'completed (Approved)' },
              };
              break;
            }

            case 'bulk_approve_orders': {
              const { data: pendingOrds } = await supabase.from('orders').select('*').eq('status', 'pending');
              const count = pendingOrds?.length || 0;

              if (count > 0) {
                await supabase.from('orders').update({ status: 'completed' }).eq('status', 'pending');
              }

              currentAction.status = 'success';
              currentAction.result = { approvedCount: count };
              currentAction.diff = {
                bulk_approve: { before: `${count} pending orders`, after: 'All approved to completed' },
              };
              break;
            }

            case 'reject_manual_order': {
              let query = supabase.from('orders').select('*');
              if (params.session_id) query = query.eq('session_id', params.session_id);
              else if (params.order_id) query = query.eq('id', params.order_id);

              const { data: ords } = await query;
              if (!ords || ords.length === 0) throw new Error('No matching order found to reject');

              for (const o of ords) {
                await supabase.from('orders').update({ status: 'cancelled' }).eq('id', o.id);
              }

              currentAction.status = 'success';
              currentAction.result = { rejectedCount: ords.length };
              currentAction.diff = {
                manual_order: { before: 'pending', after: 'cancelled (Rejected)' },
              };
              break;
            }

            case 'assign_order_key': {
              const { data: ord } = await supabase.from('orders').select('*').eq('id', params.order_id).single();
              if (!ord) throw new Error(`Order "${params.order_id}" not found`);

              const updates: Record<string, any> = { product_key: params.product_key };
              if (params.mark_completed !== false) updates.status = 'completed';

              await supabase.from('orders').update(updates).eq('id', ord.id);
              currentAction.status = 'success';
              currentAction.result = { id: ord.id, product_key: params.product_key };
              currentAction.diff = {
                product_key: { before: ord.product_key || 'Empty', after: params.product_key },
                status: { before: ord.status, after: updates.status || ord.status },
              };
              break;
            }

            case 'create_product_credential': {
              const product = await findProduct(params.product_id || params.product_identifier);
              if (!product) throw new Error(`Product "${params.product_id}" not found`);

              const credPayload = {
                product_id: product.id,
                credentials_text: params.credentials_text || params.key,
                variant_id: params.variant_id || null,
                is_sold: false,
              };

              const { data: cred, error: credErr } = await supabase
                .from('product_credentials')
                .insert(credPayload)
                .select('*')
                .single();

              if (credErr) throw credErr;

              await supabase.from('products').update({ stock: Number(product.stock || 0) + 1 }).eq('id', product.id);

              currentAction.status = 'success';
              currentAction.result = cred;
              currentAction.diff = {
                credentials: { before: 'Stock: ' + product.stock, after: `Added 1 Key for ${product.name} (New stock: ${product.stock + 1})` },
              };
              break;
            }

            case 'refund_order_to_wallet': {
              const { data: ord } = await supabase.from('orders').select('*, profiles(*)').eq('id', params.order_id).single();
              if (!ord) throw new Error(`Order "${params.order_id}" not found`);

              const refundAmount = Number(params.amount || ord.amount || 0);
              const userId = ord.user_id;

              if (!userId) throw new Error('Order does not have an associated user profile');

              await supabase.from('orders').update({ status: 'cancelled' }).eq('id', ord.id);

              const currentBal = Number(ord.profiles?.wallet_balance || 0);
              const newBal = currentBal + refundAmount;
              await supabase.from('profiles').update({ wallet_balance: newBal }).eq('id', userId);

              await supabase.from('transactions').insert({
                user_id: userId,
                label: `Order Refund #${ord.id.slice(0, 8)}`,
                amount: refundAmount,
                type: 'credit_refund',
                status: 'completed',
              });

              currentAction.status = 'success';
              currentAction.result = { order_id: ord.id, refundAmount, newBal };
              currentAction.diff = {
                order_status: { before: ord.status, after: 'cancelled (Refunded)' },
                wallet_refund: { before: `$${currentBal.toFixed(2)}`, after: `$${newBal.toFixed(2)} (+$${refundAmount.toFixed(2)})` },
              };
              break;
            }

            case 'update_user_balance': {
              const profile = await findProfile(params.user_identifier);
              if (!profile) throw new Error(`User "${params.user_identifier}" not found`);

              const currentBal = Number(profile.wallet_balance || 0);
              let newBal = currentBal;

              if (params.new_balance !== undefined) {
                newBal = Math.max(0, Number(params.new_balance));
              } else if (params.amount_delta !== undefined) {
                newBal = Math.max(0, currentBal + Number(params.amount_delta));
              }

              await supabase.from('profiles').update({ wallet_balance: newBal }).eq('id', profile.id);

              // Auto record transaction ledger
              try {
                await supabase.from('transactions').insert({
                  user_id: profile.id,
                  amount: params.amount_delta || (newBal - currentBal),
                  type: (params.amount_delta || 0) >= 0 ? 'admin_credit' : 'admin_debit',
                  status: 'completed',
                  label: params.reason || 'Balance adjustment via Copilot',
                });
              } catch {}

              currentAction.status = 'success';
              currentAction.result = { email: profile.email, new_balance: newBal };
              currentAction.diff = {
                wallet_balance: { before: `$${currentBal.toFixed(2)}`, after: `$${newBal.toFixed(2)}` },
              };
              break;
            }

            case 'update_user_role': {
              const profile = await findProfile(params.user_identifier);
              if (!profile) throw new Error(`User "${params.user_identifier}" not found`);

              const targetRole = params.role === 'admin' ? 'admin' : 'customer';
              await supabase.from('profiles').update({ role: targetRole }).eq('id', profile.id);

              currentAction.status = 'success';
              currentAction.result = { email: profile.email, role: targetRole };
              currentAction.diff = {
                user_role: { before: profile.role || 'customer', after: targetRole },
              };
              break;
            }

            case 'send_notification': {
              let targetUserId = null;
              if (params.audience === 'single' && params.target_user_identifier) {
                const p = await findProfile(params.target_user_identifier);
                targetUserId = p?.id || null;
              }

              const newNotif = {
                user_id: targetUserId || auth.user.id,
                title: params.title || 'UpStore Notification',
                message: params.message || '',
                type: params.type || 'info',
                is_read: false,
                created_at: new Date().toISOString(),
              };

              if (params.audience === 'all' || !targetUserId) {
                const { data: allProfs } = await supabase.from('profiles').select('id');
                if (allProfs && allProfs.length > 0) {
                  const bulkNotifs = allProfs.slice(0, 100).map((prof: any) => ({
                    user_id: prof.id,
                    title: newNotif.title,
                    message: newNotif.message,
                    type: newNotif.type,
                    is_read: false,
                  }));
                  await supabase.from('notifications').insert(bulkNotifs);
                }
              } else {
                await supabase.from('notifications').insert(newNotif);
              }

              currentAction.status = 'success';
              currentAction.result = newNotif;
              currentAction.diff = {
                notification: { before: null, after: `Sent to ${params.audience}: "${newNotif.title}"` },
              };
              break;
            }

            case 'update_site_settings': {
              const updates: Array<{ key: string; value: any }> = [];

              if (params.announcement_text !== undefined) updates.push({ key: 'announcement_text', value: params.announcement_text });
              if (params.maintenance_mode !== undefined) updates.push({ key: 'maintenance_mode', value: !!params.maintenance_mode });
              if (params.referral_bonus !== undefined) updates.push({ key: 'referral_bonus', value: Number(params.referral_bonus) });
              if (params.flash_deal_urgency_text_ar !== undefined) updates.push({ key: 'flash_deal_urgency_text_ar', value: params.flash_deal_urgency_text_ar });
              if (params.flash_deal_urgency_text_en !== undefined) updates.push({ key: 'flash_deal_urgency_text_en', value: params.flash_deal_urgency_text_en });
              if (params.deepseek_model !== undefined) updates.push({ key: 'deepseek_model', value: params.deepseek_model });

              for (const u of updates) {
                await supabase.from('site_settings').upsert({ key: u.key, value: u.value });
              }

              currentAction.status = 'success';
              currentAction.result = updates;
              currentAction.diff = {
                site_settings: { before: 'Previous Settings', after: `Applied ${updates.length} site settings` },
              };
              break;
            }

            case 'create_changelog': {
              const newChangelog = {
                version: params.version || 'v2.5.0',
                title: params.title || 'Platform Update',
                title_ar: params.title_ar || 'تحديث منصة UpStore',
                category: params.category || 'feature',
                description: params.description || '',
                description_ar: params.description_ar || '',
                features: Array.isArray(params.features) ? params.features : [],
                fixes: Array.isArray(params.fixes) ? params.fixes : [],
                created_at: new Date().toISOString(),
              };

              const { data: createdLog } = await supabase.from('changelogs').insert(newChangelog).select('*').single();
              currentAction.status = 'success';
              currentAction.result = createdLog;
              currentAction.diff = {
                changelog: { before: null, after: `Published ${newChangelog.version}: ${newChangelog.title_ar}` },
              };
              break;
            }

            case 'search_and_set_product_image': {
              const targetProd = await findProduct(params.product_identifier);
              if (!targetProd) throw new Error(`Product "${params.product_identifier}" not found`);

              // 1. Multi-tier API Key Resolution (Env -> Supabase Site Settings -> Embedded Default Key)
              let serperApiKey = process.env.SERPER_API_KEY || '';
              if (!serperApiKey) {
                try {
                  const { data: setting } = await supabase
                    .from('site_settings')
                    .select('value')
                    .eq('key', 'serper_api_key')
                    .single();
                  if (setting?.value && typeof setting.value === 'string') {
                    serperApiKey = setting.value.trim();
                  }
                } catch {}
              }
              if (!serperApiKey) {
                serperApiKey = 'dc82cdef2e35868541939cf3616311cca0e758e6';
              }

              // Clean search query to find high quality transparent 3D icons & logos
              const cleanProdName = (targetProd.name || '')
                .replace(/\b(1|3|6|12)\s*(month|months|year|years|شهر|أشهر|سنة|حساب|اشتراك|بريميوم|اشتراكات|shared|private|account)\b/gi, '')
                .replace(/[—–\-:()]/g, ' ')
                .trim();

              const query = params.custom_query || `${cleanProdName || targetProd.name} 3d app icon transparent png pinterest`;

              let selectedImageUrl = '';

              try {
                const serperRes = await fetch('https://google.serper.dev/images', {
                  method: 'POST',
                  headers: {
                    'X-API-KEY': serperApiKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    q: query,
                    gl: 'us',
                    hl: 'en',
                    num: 8,
                  }),
                });

                if (serperRes.ok) {
                  const serperData = await serperRes.json();
                  const images = (serperData.images || []) as Array<{ imageUrl: string; title?: string }>;
                  if (images.length > 0) {
                    // Prefer PNG / transparent images
                    const pngMatch = images.find(
                      (img) => img.imageUrl.toLowerCase().includes('.png') || img.title?.toLowerCase().includes('png')
                    );
                    selectedImageUrl = pngMatch?.imageUrl || images[0].imageUrl;
                  }
                }
              } catch (searchErr) {
                console.warn('[Copilot Image Search Warning]:', searchErr);
              }

              // Fallback default image URLs based on brand if Serper returns nothing
              if (!selectedImageUrl) {
                const lower = (targetProd.name || '').toLowerCase();
                if (lower.includes('netflix')) {
                  selectedImageUrl = 'https://cdn3d.iconscout.com/3d/free/preview/free-netflix-3d-icon-png-download-2447898.png';
                } else if (lower.includes('gemini') || lower.includes('google')) {
                  selectedImageUrl = 'https://cdn3d.iconscout.com/3d/premium/thumb/gemini-ai-3d-icon-png-download-10702678.png';
                } else if (lower.includes('spotify')) {
                  selectedImageUrl = 'https://cdn3d.iconscout.com/3d/free/preview/free-spotify-3d-icon-png-download-2447915.png';
                } else if (lower.includes('youtube')) {
                  selectedImageUrl = 'https://cdn3d.iconscout.com/3d/free/preview/free-youtube-3d-icon-png-download-2447926.png';
                } else if (lower.includes('chatgpt') || lower.includes('openai')) {
                  selectedImageUrl = 'https://cdn3d.iconscout.com/3d/premium/thumb/chatgpt-3d-icon-png-download-8889417.png';
                } else if (lower.includes('discord')) {
                  selectedImageUrl = 'https://cdn3d.iconscout.com/3d/free/preview/free-discord-3d-icon-png-download-2447900.png';
                } else {
                  selectedImageUrl = `https://api.dicebear.com/7.x/shapes/png?seed=${encodeURIComponent(targetProd.slug || targetProd.name)}`;
                }
              }

              let finalPublicUrl = selectedImageUrl;

              // Attempt to cache image in Supabase storage for permanence
              try {
                const imgFetch = await fetch(selectedImageUrl, { signal: AbortSignal.timeout(5000) });
                if (imgFetch.ok) {
                  const arrayBuffer = await imgFetch.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  const safePath = buildSafeStorageObjectName(targetProd.slug || 'product', 'png');

                  const { error: storageErr } = await supabase.storage
                    .from('products')
                    .upload(safePath, buffer, { contentType: 'image/png', upsert: true });

                  if (!storageErr) {
                    const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(safePath);
                    if (publicUrlData?.publicUrl) {
                      finalPublicUrl = publicUrlData.publicUrl;
                    }
                  }
                }
              } catch (cacheErr) {
                console.warn('[Copilot Storage Cache Fallback]: Using direct image URL', cacheErr);
              }

              // Update product in database
              const { error: updateErr } = await supabase
                .from('products')
                .update({ image_url: finalPublicUrl })
                .eq('id', targetProd.id);

              if (updateErr) throw updateErr;

              currentAction.status = 'success';
              currentAction.result = { id: targetProd.id, image_url: finalPublicUrl, name: targetProd.name };
              currentAction.diff = {
                image_url: { before: targetProd.image_url || 'No Image', after: finalPublicUrl },
              };
              break;
            }

            case 'auto_assign_attributes': {
              const targetProd = await findProduct(params.product_identifier);
              if (!targetProd) throw new Error(`Product "${params.product_identifier}" not found`);

              const defaultBadges = ['ضمان ذهبي شامل', 'دفع عالمي موثوق', 'حساب رسمي'];
              const { error: updateErr } = await supabase
                .from('products')
                .update({ attributes: defaultBadges })
                .eq('id', targetProd.id);

              if (updateErr) throw updateErr;

              currentAction.status = 'success';
              currentAction.result = { id: targetProd.id, name: targetProd.name, attributes: defaultBadges };
              currentAction.diff = {
                attributes: { before: `${targetProd.attributes?.length || 0} badges`, after: `${defaultBadges.length} smart badges` },
              };
              break;
            }

            case 'auto_generate_product_variants': {
              const targetProd = await findProduct(params.product_identifier);
              if (!targetProd) throw new Error(`Product "${params.product_identifier}" not found`);

              const basePrice = Number(targetProd.our_price) || 5;
              const tiers = [
                {
                  name: '1 Month UHD',
                  name_ar: 'شهر كامل 4K UHD',
                  subscription_duration: '1 Month',
                  quality: '4K Ultra HD',
                  our_price: basePrice,
                  market_price: Number(targetProd.market_price) || basePrice * 2.5,
                  price_egp: Math.ceil(basePrice * 53),
                  price_sar: Math.ceil(basePrice * 4),
                  stock: 50,
                  max_stock: 100,
                  status: 'active',
                  sort_order: 1,
                },
                {
                  name: '3 Months UHD',
                  name_ar: '3 أشهر 4K UHD',
                  subscription_duration: '3 Months',
                  quality: '4K Ultra HD',
                  our_price: Math.round(basePrice * 2.7 * 100) / 100,
                  market_price: Math.round((Number(targetProd.market_price) || basePrice * 2.5) * 3),
                  price_egp: Math.ceil(basePrice * 2.7 * 53),
                  price_sar: Math.ceil(basePrice * 2.7 * 4),
                  stock: 40,
                  max_stock: 100,
                  status: 'active',
                  sort_order: 2,
                },
                {
                  name: '6 Months UHD',
                  name_ar: '6 أشهر 4K UHD',
                  subscription_duration: '6 Months',
                  quality: '4K Ultra HD',
                  our_price: Math.round(basePrice * 5.0 * 100) / 100,
                  market_price: Math.round((Number(targetProd.market_price) || basePrice * 2.5) * 6),
                  price_egp: Math.ceil(basePrice * 5.0 * 53),
                  price_sar: Math.ceil(basePrice * 5.0 * 4),
                  stock: 35,
                  max_stock: 100,
                  status: 'active',
                  sort_order: 3,
                },
                {
                  name: '12 Months (1 Year)',
                  name_ar: 'سنة كاملة (12 شهر)',
                  subscription_duration: '12 Months',
                  quality: '4K Ultra HD',
                  our_price: Math.round(basePrice * 9.0 * 100) / 100,
                  market_price: Math.round((Number(targetProd.market_price) || basePrice * 2.5) * 12),
                  price_egp: Math.ceil(basePrice * 9.0 * 53),
                  price_sar: Math.ceil(basePrice * 9.0 * 4),
                  stock: 25,
                  max_stock: 100,
                  status: 'active',
                  sort_order: 4,
                },
              ];

              const variantsToInsert = tiers.map((t) => ({
                product_id: targetProd.id,
                ...t,
                image_url: targetProd.image_url || null,
              }));

              const { data: inserted, error: insertErr } = await supabase
                .from('product_variants')
                .insert(variantsToInsert)
                .select('*');

              if (insertErr) throw insertErr;

              const totalStock = tiers.reduce((sum, item) => sum + item.stock, 0);
              await supabase
                .from('products')
                .update({ stock: totalStock, our_price: basePrice })
                .eq('id', targetProd.id);

              currentAction.status = 'success';
              currentAction.result = { id: targetProd.id, name: targetProd.name, variantsCreated: inserted?.length || 4 };
              currentAction.diff = {
                variants: { before: '0 Packages', after: `${inserted?.length || 4} AI Packages (1M, 3M, 6M, 1Y)` },
                stock: { before: targetProd.stock, after: totalStock },
              };
              break;
            }

            case 'store_health_audit': {
              const { data: prods } = await supabase.from('products').select('*');
              const { data: ords } = await supabase.from('orders').select('*');
              const { data: profs } = await supabase.from('profiles').select('*');

              const outOfStock = (prods || []).filter((p) => p.stock === 0).length;
              const lowStock = (prods || []).filter((p) => p.stock > 0 && p.stock <= 5).length;
              const pendingOrders = (ords || []).filter((o) => o.status === 'pending').length;
              const completedOrders = (ords || []).filter((o) => o.status === 'completed').length;
              const totalRevenue = (ords || []).filter((o) => o.status === 'completed').reduce((sum, o) => sum + Number(o.amount || 0), 0);

              currentAction.status = 'success';
              currentAction.result = {
                totalProducts: prods?.length || 0,
                outOfStock,
                lowStock,
                pendingOrders,
                completedOrders,
                totalRevenue,
                totalUsers: profs?.length || 0,
              };
              currentAction.diff = {
                health_audit: {
                  before: 'Store Diagnostic Run',
                  after: `Revenue: ${totalRevenue.toFixed(2)} | OutOfStock: ${outOfStock} | PendingOrders: ${pendingOrders}`,
                },
              };
              break;
            }

            case 'navigate_tab':
            case 'open_modal': {
              currentAction.status = 'client_dispatched';
              currentAction.result = params;
              break;
            }

            default:
              currentAction.status = 'client_dispatched';
              break;
          }
        } catch (actionErr: any) {
          console.error(`[Admin Copilot] Error executing action ${tool}:`, actionErr);
          currentAction.status = 'failed';
          currentAction.error = actionErr.message || 'Action execution failed';
        }

        executed.push(currentAction);
      }

      return executed;
    };

    // ─── CASE A: DIRECT CONFIRMED PLAN EXECUTION ──────────────────────────────
    if (Array.isArray(confirmed_actions) && confirmed_actions.length > 0) {
      const executed = await executeActionList(confirmed_actions);
      const successfulCount = executed.filter((a) => a.status === 'success').length;

      const completedSteps = (confirmed_plan?.steps || [
        { name: 'Review Plan & Exemptions', isCompleted: true },
        { name: 'Isolate Target Entities', isCompleted: true },
        { name: 'Execute Database Operations', isCompleted: true },
      ]).map((step) => ({
        ...step,
        isCompleted: true,
        isActive: false,
      }));

      const isRtl = messages[messages.length - 1]?.content ? /[؀-ۿ]/.test(messages[messages.length - 1].content) : true;

      return NextResponse.json({
        reply: isRtl
          ? `**تم تنفيذ الخطة بنجاح:**\n- تم تنفيذ **${successfulCount} عملية** في قاعدة البيانات بنجاح.\n- تم تحديث جدول المنتجات والبيانات المرتبطة فوراً.`
          : `**Plan Executed Successfully:**\n- Completed **${successfulCount} operations** in the database.\n- Store catalog and records refreshed immediately.`,
        actions: executed,
        plan: confirmed_plan
          ? {
              ...confirmed_plan,
              status: 'completed',
              steps: completedSteps,
            }
          : null,
        suggestedPrompts: isRtl
          ? ['عرض قائمة المنتجات المتبقية', 'فحص تقرير المخزون', 'تحديث إعدادات الموقع']
          : ['View remaining products', 'Run store health audit', 'Update site settings'],
        modelUsed: 'Copilot',
        reloadRequired: true,
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required.' }, { status: 400 });
    }

    // Prepare compact context representations
    let productsListContext = '';
    if (context?.products && context.products.length > 0) {
      productsListContext = `
CURRENT STORE PRODUCTS (Total: ${context.products.length}):
${context.products
  .slice(0, 60)
  .map(
    (p) =>
      `- ID: "${p.id}" | Name: "${p.name}" ${p.name_ar ? `("${p.name_ar}")` : ''} | Price: ${p.our_price} (EGP: ${p.price_egp || Math.round(p.our_price * 52)}, SAR: ${p.price_sar || Math.round(p.our_price * 3.85 * 100) / 100}) | Stock: ${p.stock} | ImageSet: ${p.image_url ? 'YES (Valid 3D Image)' : 'NO (Missing)'} | FlashDeal: ${p.is_flash_deal ? `Yes (${p.flash_deal_price})` : 'No'}`
  )
  .join('\n')}
`.trim();
    }

    let ordersContext = '';
    if (context?.orders && context.orders.length > 0) {
      ordersContext = `
RECENT STORE ORDERS (Total: ${context.orders.length}):
${context.orders
  .slice(0, 25)
  .map(
    (o) =>
      `- OrderID: "${o.id}" | Status: ${o.status} | Amount: ${o.amount} | User: ${o.profiles?.email || o.user_id} | Product: "${o.products?.name || 'N/A'}" | SessionID: "${o.session_id || 'N/A'}"`
  )
  .join('\n')}
`.trim();
    }

    let usersContext = '';
    if (context?.users && context.users.length > 0) {
      usersContext = `
REGISTERED USERS (Total: ${context.users.length}):
${context.users
  .slice(0, 35)
  .map(
    (u) =>
      `- UserID: "${u.id}" | Email: "${u.email}" | Name: "${u.display_name || ''}" | Role: ${u.role} | Wallet: ${u.wallet_balance || 0}`
  )
  .join('\n')}
`.trim();
    }

    let settingsContext = '';
    if (context?.settings) {
      settingsContext = `
CURRENT SITE SETTINGS:
- Announcement Bar: "${context.settings.announcement_text || ''}"
- Maintenance Mode: ${context.settings.maintenance_mode ? 'Enabled' : 'Disabled'}
- Referral Bonus: ${context.settings.referral_bonus || 0}
- Flash Urgency Text (AR/EN): "${context.settings.flash_deal_urgency_text_ar || ''}" / "${context.settings.flash_deal_urgency_text_en || ''}"
`.trim();
    }

    const systemPrompt = `
You are Copilot, the AI assistant with direct execution authority over the UpStore database, store catalog, orders, wallets, notifications, and settings.
You have FULL ROOT CONTROL and direct execution authority over the UpStore database, store catalog, orders, wallets, notifications, and settings.

YOUR MISSION:
When the administrator gives an order, command, or question:
1. ALWAYS execute actions immediately using the tools system.
2. NEVER be passive or merely describe how the user could do it themselves. You DO it!
3. Multiple commands in a single prompt must be executed as multiple actions in the "actions" array.
4. Your text response ("reply") MUST be ultra-smart, crystal-clear, executive, specific, concise, and structured.

============================================================
CRITICAL: MULTI-TURN CONVERSATION MEMORY & CONTINUITY:
- You have FULL CONVERSATIONAL RECALL across the chat history.
- When the user uses pronouns, relative references, or follow-ups like:
  - "احذفهم" / "احذف تلك المنتجات" (Delete the previously identified items)
  - "تراجع عن ذلك" (Undo the previous change)
  - "أكد الخطة" / "نفذ" (Confirm and proceed with the proposed plan)
  - "نفس الشيء على فئة كذا" (Repeat the same logic on another category)
  - "المنتج اللي اتكلمنا عليه" (The product discussed in recent turns)
  - "ليه عملت كده؟" / "اشرح لي" (Explain the rationale of previous actions)
- ALWAYS resolve the exact target entities, product IDs, and parameters from previous conversation turns without asking the user to repeat themselves.
- Maintain continuity with previous plans and executed actions seamlessly.

============================================================
CRITICAL: SAFETY, CONFIRMATION & EXCLUSION RULES
============================================================
1. DESTRUCTIVE ACTIONS & MASS CHANGES REQUIRE PROPOSED PLANS (ZERO ACCIDENTAL DELETION):
   - When the user asks to delete products (tool: "delete_product"), mass delete, or apply destructive changes:
     You MUST NOT delete immediately without asking for confirmation.
     Instead, set "requires_confirmation": true and construct a structured "plan" object in your JSON output.
     Structure of "plan":
     {
       "id": "plan-${Date.now()}",
       "title": "Delete Products (Excluding specified exceptions)",
       "title_ar": "خطة حذف المنتجات مع استثناء المنتجات المحددة",
       "warning_ar": "هل تريد بالتأكيد حذف هذه المنتجات نهائياً من المتجر؟",
       "affected_count": number,
       "items": [
         { "id": "<uuid>", "name": "<product name>", "name_ar": "<اسم المنتج>", "action": "delete", "action_ar": "حذف نهائي" }
       ],
       "steps": [
         { "name": "Verify Exemptions", "name_ar": "فحص واستثناء المنتجات المحددة (مثل Netflix, Gemini)", "isCompleted": true },
         { "name": "Isolate Target Products", "name_ar": "تحديد وعزل المنتجات المستهدفة للحذف", "isCompleted": true },
         { "name": "Execute in Database upon Admin Confirmation", "name_ar": "التنفيذ النهائي في قاعدة البيانات بعد التأكيد", "isCompleted": false, "isActive": true }
       ],
       "actions": [
         { "tool": "delete_product", "params": { "product_id": "<uuid>" }, "description": "حذف <product name>" }
       ]
     }
   - When "requires_confirmation" is true, the "actions" array at root level MUST be empty [] because they will be executed upon 1-click confirmation.
   - In "reply", write a concise, clean executive summary asking the admin to review the plan and confirm via the 1-click confirmation button below.

2. EXCLUSION & EXEMPTION PARSING ("عدا", "ما عدا", "إلا", "باستثناء", "غير", "except", "exclude", "without"):
   - When user says "احذف كل المنتجات عدا جيمناي وعدا نيتفليكس":
     - Find products matching Gemini and Netflix in the catalog -> KEEP THEM (DO NOT INCLUDE IN PLAN ACTIONS).
     - Find all other products -> INCLUDE ONLY THE OTHER PRODUCTS in the deletion plan.
     - NEVER delete the exempted products!

3. SMART PRODUCT CREATION & MISSING INFO CLARIFICATION (PRICE IN USD, IMAGES, DURATION, ETC.):
   - When the user asks to add, design, or create a product (e.g. "صمم منتج جديد جيمناي اشتراك 18 شهر", "ضيف منتج كانفا", "أنشئ منتج جديد..."):
   - If critical information was not specified by the user (such as: explicit USD price "our_price", or specific product image):
     - You MUST NOT insert incomplete dummy products immediately.
     - Instead, construct a Proposed Product Design Plan ("plan") with "requires_confirmation": true:
       1. Analyze the product brand/service and duration (e.g. Gemini Advanced 18 Months).
       2. Calculate a smart market price (e.g. $360.00) and an ultra-competitive UpStore price in USD (e.g. $24.99), with automatic EGP (~1,325 ج.م) and SAR (~94 ر.س) conversions.
       3. Generate complete, persuasive Arabic & English titles, descriptions, feature badges/advantages, duration, warranty, brand color, and lucide icon.
       4. Include the proposed "create_product" action in "plan.actions" with all pre-filled parameters.
       5. In your "reply", clearly, politely, and smartly ask the admin:
          "لقد قمت بتجهيز مسودة تصميم المنتج بالكامل:\n- **الاسم**: اشتراك جوجل جيمناي المتقدم (18 شهر)\n- **السعر المقترح**: **24.99$** (حوالي 1,325 ج.م / 94 ر.س)\n- **المخزون والضمان**: 50 حساب | ضمان ذهبي طوال المدة | تسليم سريع\n\nيرجى مراجعة وتأكيد السعر والصورة: هل تعتمد هذا السعر وتلك الصورة، أم ترغب في تعديل السعر أو اختيار صورة أخرى من صور PNG المقترحة أدناه؟ يمكنك تأكيد الإضافة بضغطة زر واحدة أدناه أو كتابة السعر المطلوب."
   - If the user provides a specific price or confirms ("تمام ضيفه", "أكد الخطة", "خليه بـ 20$"), proceed with "create_product" immediately.

4. CLEAN TEXT FORMATTING (NO CODE BLOCKS OR RAW JSON IN REPLY):
   - NEVER output markdown \`\`\`json fences or raw JSON inside the "reply" string.
   - The "reply" string must be purely human-readable formatted text (bolding, bullet points, concise Arabic/English).

============================================================
REPLY COMMUNICATION STYLE GUIDELINES (MANDATORY):
============================================================
- Respond in the language of the prompt (Arabic by default, or English if asked in English).
- Zero fluff, zero unnecessary conversational filler or generic greetings.
- Structure your response cleanly using this layout:
  1. **ملخص الإجراء (Executive Summary)**: 1-2 sharp, conclusive sentences stating what was performed or proposed.
  2. **التفاصيل المحددة (Specific Operations / Metrics)**: Bulleted list or markdown table with exact before/after values, product names, price deltas, or order IDs.
  3. **الخطوة التالية الموصى بها (Strategic Next Action)**: 1 proactive, high-value suggestion.

${productsListContext}

${ordersContext}

${usersContext}

${settingsContext}

Store Summary Stats:
- Total Products: ${context?.totalProducts ?? context?.products?.length ?? 0}
- Total Orders: ${context?.totalOrders ?? context?.orders?.length ?? 0}
- Pending Manual Orders: ${context?.pendingManualOrders ?? 0}
- Total Users: ${context?.totalUsers ?? context?.users?.length ?? 0}
- Current Active Tab: ${context?.activeTab || 'overview'}

============================================================
AVAILABLE TOOLS / ACTIONS YOU CAN INVOKE:
============================================================
1. "create_product":
   Params:
   - "name": string (English name, e.g. "Discord Nitro - 3 Months")
   - "name_ar": string (Arabic title, e.g. "اشتراك ديسكورد نيترو - 3 أشهر")
   - "slug": string (optional, auto-generated if omitted)
   - "category": string ("Subscriptions" | "Accounts" | "Software" | "VPNs & Security" | "Game Keys")
   - "our_price": number (USD price)
   - "market_price": number (optional, e.g. our_price * 1.5)
   - "price_egp": number (optional, default our_price * 50)
   - "price_sar": number (optional, default our_price * 3.75)
   - "stock": number (default 50)
   - "max_stock": number (default 100)
   - "brand_color": string (Hex code, e.g. "#5865F2")
   - "icon_name": string (e.g. "discord", "netflix", "spotify", "youtube", "chatgpt", "gemini", "vpn", "software", "xbox")
   - "description": string (English description)
   - "description_ar": string (Arabic description)
   - "advantages": string[]
   - "advantages_ar": string[]
   - "warranty_duration": string (e.g. "30 Days", "1 Year")
   - "delivery_time": string (e.g. "Instant")
   - "subscription_duration": string (e.g. "3 Months")
   - "is_flash_deal": boolean (optional)
   - "flash_deal_price": number (optional)
   - "delivery_mode": "key" | "pre_assigned" | "zelenka_api" | "telegram"

2. "update_product":
   Params:
   - "product_id": string (Product UUID, slug, or matching name)
   - "name": string (optional)
   - "name_ar": string (optional)
   - "category": string (optional)
   - "our_price": number (optional exact new price)
   - "price_delta": number (optional, e.g. -1 to subtract $1)
   - "price_percentage_discount": number (optional, e.g. 15 for 15% discount)
   - "price_egp": number (optional)
   - "price_sar": number (optional)
   - "stock": number (optional exact new stock)
   - "stock_delta": number (optional, e.g. +50 to add 50 units)
   - "is_flash_deal": boolean (optional)
   - "flash_deal_price": number (optional)
   - "flash_deal_duration_hours": number (optional)
   - "description": string (optional)
   - "description_ar": string (optional)
   - "advantages": string[] (optional)
   - "advantages_ar": string[] (optional)
   - "brand_color": string (optional)
   - "icon_name": string (optional)

3. "delete_product":
   Params:
   - "product_id": string (UUID, slug, or matching name)

4. "duplicate_product":
   Params:
   - "source_product_id": string (UUID, slug, or matching name)
   - "new_name": string (e.g. "Netflix Premium - 3 Months")
   - "new_name_ar": string (e.g. "نتفلكس بريميوم - 3 أشهر")
   - "new_price": number
   - "subscription_duration": string (e.g. "3 Months")

5. "bulk_update_products":
   Params:
   - "filter": { "category"?: string, "out_of_stock_only"?: boolean, "all"?: boolean, "product_names"?: string[] }
   - "updates": { "price_percentage_discount"?: number, "set_stock"?: number, "add_stock"?: number, "is_flash_deal"?: boolean, "flash_deal_duration_hours"?: number }

6. "restock_low_stock_products":
   Params:
   - "threshold": number (default 5; restocks all items with stock <= threshold)
   - "target_stock": number (default 50; sets new stock to this value)

7. "apply_flash_deal":
   Params:
   - "product_identifiers": string[] (array of IDs, slugs, or names; or ["all"])
   - "discount_percentage": number (e.g. 25 for 25% discount)
   - "duration_hours": number (default 24)
   - "enabled": boolean (default true)

8. "update_order_status":
   Params:
   - "order_id": string (UUID or order ID)
   - "status": "completed" | "pending" | "fulfilled" | "cancelled" | "refunded"
   - "product_key": string (optional)

9. "approve_manual_order":
   Params:
   - "session_id": string (or "order_id")

10. "bulk_approve_orders":
    Params:
    - "confirm": boolean (true)

11. "reject_manual_order":
    Params:
    - "session_id": string (or "order_id")
    - "reason": string (optional)

12. "assign_order_key":
    Params:
    - "order_id": string
    - "product_key": string
    - "mark_completed": boolean (default true)

13. "update_user_balance":
    Params:
    - "user_identifier": string (email, UUID, or display name)
    - "amount_delta": number (e.g. 10 to add $10, -5 to deduct $5)
    - "new_balance": number (optional absolute value)
    - "reason": string

14. "update_user_role":
    Params:
    - "user_identifier": string (email or UUID)
    - "role": "admin" | "customer"

15. "send_notification":
    Params:
    - "audience": "all" | "single"
    - "target_user_identifier": string (if single)
    - "title": string
    - "message": string
    - "type": "info" | "promo" | "alert" | "success"

16. "update_site_settings":
    Params:
    - "announcement_text": string (optional)
    - "maintenance_mode": boolean (optional)
    - "referral_bonus": number (optional)
    - "flash_deal_urgency_text_ar": string (optional)
    - "flash_deal_urgency_text_en": string (optional)

17. "create_changelog":
    Params:
    - "version": string (e.g. "v2.5.0")
    - "title": string
    - "title_ar": string
    - "category": "feature" | "fix" | "improvement" | "announcement"
    - "description": string
    - "description_ar": string
    - "features": string[]
    - "fixes": string[]

18. "search_and_set_product_image":
    Params:
    - "product_identifier": string (Product ID, slug, or name)
    - "custom_query": string (optional)

19. "auto_assign_attributes":
    Params:
    - "product_identifier": string (Product ID, slug, or name)

20. "store_health_audit":
    Params:
    - "scope": "full" | "inventory" | "orders"

21. "navigate_tab":
    Params:
    - "tab": "overview" | "products" | "orders" | "users" | "settings" | "notifications" | "manual-orders" | "ai-copilot"
    - "search_query": string (optional)

22. "open_modal":
    Params:
    - "modal": "add_product" | "edit_product" | "ai_generate_product" | "variants"
    - "product_id": string (optional)

============================================================
STRICT JSON OUTPUT FORMAT (NO MARKDOWN WRAPPERS):
============================================================
{
  "reply": "ملخص تنفيذي مباشر ومحدد...",
  "requires_confirmation": false,
  "plan": null,
  "actions": [
    {
      "tool": "update_product",
      "params": { "product_id": "netflix-premium-4k-1-month", "our_price": 2.50 },
      "description": "تعديل سعر Netflix Premium 4K إلى 2.50$"
    }
  ],
  "suggestedPrompts": [
    "إرسال إشعار ترويجي بالتخفيض الجديد",
    "تفعيل الفلاش ديل لنفس المنتج",
    "فحص نواقص المخزون"
  ]
}
`.trim();

    // Build rich multi-turn conversational context (1M Token Window Context)
    const enrichedMessages: AIMessage[] = messages
      .filter((m: any) => m && ((typeof m.content === 'string' && m.content.trim().length > 0) || m.plan || (Array.isArray(m.actions) && m.actions.length > 0)))
      .slice(-30)
      .map((m: any) => {
        let content = (m.content || '').trim();
        
        // If previous assistant message had an execution plan or executed actions, enrich context
        if (m.role === 'assistant' && (m.plan || (m.actions && m.actions.length > 0))) {
          const extraContext: string[] = [];
          if (m.plan) {
            extraContext.push(`[PREVIOUS PROPOSED PLAN: ID="${m.plan.id}", Title="${m.plan.title_ar || m.plan.title}", AffectedCount=${m.plan.affected_count || m.plan.actions?.length || 0}, Status="${m.plan.status || 'pending'}"]`);
          }
          if (m.actions && m.actions.length > 0) {
            const actSummary = m.actions.map((a: any) => `${a.tool}(${JSON.stringify(a.params)})`).join(', ');
            extraContext.push(`[EXECUTED ACTIONS: ${actSummary}]`);
          }
          if (extraContext.length > 0) {
            content = content ? `${content}\n\n${extraContext.join('\n')}` : extraContext.join('\n');
          }
        }

        return {
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: content || (m.role === 'assistant' ? 'Done' : 'Update status'),
        };
      });

    // Clean alternating messages to prevent LLM errors on consecutive same-role messages
    const sanitizedMessages: AIMessage[] = [];
    for (const msg of enrichedMessages) {
      if (sanitizedMessages.length > 0 && sanitizedMessages[sanitizedMessages.length - 1].role === msg.role) {
        sanitizedMessages[sanitizedMessages.length - 1].content += `\n${msg.content}`;
      } else {
        sanitizedMessages.push({ ...msg });
      }
    }

    const formattedMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...sanitizedMessages,
    ];

    // Helper: Search Serper for high-quality transparent PNG product images
    const fetchSerperImages = async (query: string) => {
      const DEFAULT_SERPER_KEY = 'dc82cdef2e35868541939cf3616311cca0e758e6';
      let serperApiKey = process.env.SERPER_API_KEY || '';
      if (!serperApiKey) {
        try {
          const { data: setting } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'serper_api_key')
            .single();
          if (setting?.value && typeof setting.value === 'string') {
            serperApiKey = setting.value.trim();
          }
        } catch {}
      }
      if (!serperApiKey) serperApiKey = DEFAULT_SERPER_KEY;

      const cleanTitle = query
        .replace(/\b(1|3|6|12|18|24)\s*(month|months|year|years|شهر|أشهر|سنة|حساب|اشتراك|بريميوم|اشتراكات)\b/gi, '')
        .replace(/[—–\-:()]/g, ' ')
        .trim();

      try {
        const res = await fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: `${cleanTitle} official 3d app icon transparent png logo`,
            gl: 'us',
            hl: 'en',
            num: 8,
          }),
          signal: AbortSignal.timeout(4500),
        });

        if (res.ok) {
          const data = await res.json();
          const list = (data.images || []) as Array<{ imageUrl: string; title?: string; thumbnailUrl?: string }>;
          return list.map((img) => ({
            title: img.title || cleanTitle,
            imageUrl: img.imageUrl,
            thumbnailUrl: img.thumbnailUrl || img.imageUrl,
            isPng: img.imageUrl?.toLowerCase().includes('.png') || img.title?.toLowerCase().includes('png'),
          }));
        }
      } catch (searchErr) {
        console.warn('[Copilot Serper Fetch Warning]:', searchErr);
      }
      return [];
    };

    let aiResult: { text: string; modelUsed: string };
    try {
      aiResult = await generateChatCompletion(formattedMessages, {
        temperature: 0.15,
        timeoutMs: 40000,
        response_format: { type: 'json_object' },
      });
    } catch (aiErr: any) {
      console.warn('[Copilot Fast Fallback Engine Triggered]:', aiErr.message);
      const latestUserMsg = messages[messages.length - 1]?.content || '';
      const isArabic = /[؀-ۿ]/.test(latestUserMsg);
      const lowerMsg = latestUserMsg.toLowerCase();

      // Check if user is asking to create/design a product
      const isAddProductIntent =
        lowerMsg.includes('ضيف') ||
        lowerMsg.includes('صمم') ||
        lowerMsg.includes('أنشئ') ||
        lowerMsg.includes('انشئ') ||
        lowerMsg.includes('منتج جديد') ||
        lowerMsg.includes('create product') ||
        lowerMsg.includes('add product');

      if (isAddProductIntent) {
        const prodRawName = latestUserMsg
          .replace(/^(ضيف|صمم|أنشئ|انشئ|اعمل|سوي)\s*(منتج|خدمة|اشتراك)?\s*(جديد)?\s*/gi, '')
          .trim();

        const cleanName = prodRawName || 'منتج رقمي جديد';
        const isGemini = lowerMsg.includes('جيمناي') || lowerMsg.includes('جيميناي') || lowerMsg.includes('gemini');
        const isNetflix = lowerMsg.includes('نتفلكس') || lowerMsg.includes('netflix');
        const isDiscord = lowerMsg.includes('ديسكورد') || lowerMsg.includes('discord');
        const isSpotify = lowerMsg.includes('سبوتيفاي') || lowerMsg.includes('spotify');
        const isCanva = lowerMsg.includes('كانفا') || lowerMsg.includes('canva');

        let nameEn = 'Digital Subscription Premium';
        let nameAr = cleanName;
        let suggestedPrice = 14.99;
        let marketPrice = 49.99;
        let duration = '1 Month';
        let iconName = 'Sparkles';
        let brandColor = '#10b981';

        if (isGemini) {
          nameEn = 'Google Gemini Advanced — 18 Months';
          nameAr = 'اشتراك جوجل جيمناي المتقدم (18 شهر)';
          suggestedPrice = 24.99;
          marketPrice = 360.0;
          duration = '18 Months';
          iconName = 'Bot';
          brandColor = '#4285F4';
        } else if (isNetflix) {
          nameEn = 'Netflix Premium 4K UHD — 1 Month';
          nameAr = 'اشتراك نتفلكس بريميوم 4K (شهر كامل)';
          suggestedPrice = 3.49;
          marketPrice = 19.99;
          duration = '1 Month';
          iconName = 'Film';
          brandColor = '#E50914';
        } else if (isDiscord) {
          nameEn = 'Discord Nitro — 3 Months';
          nameAr = 'اشتراك ديسكورد نيترو (3 أشهر)';
          suggestedPrice = 9.99;
          marketPrice = 29.99;
          duration = '3 Months';
          iconName = 'Zap';
          brandColor = '#5865F2';
        } else if (isCanva) {
          nameEn = 'Canva Pro Premium — 1 Year';
          nameAr = 'اشتراك كانفا برو بريميوم (سنة كاملة)';
          suggestedPrice = 12.99;
          marketPrice = 119.99;
          duration = '1 Year';
          iconName = 'Sparkles';
          brandColor = '#00C4CC';
        }

        const priceEgp = Math.ceil(suggestedPrice * 53);
        const priceSar = Math.ceil(suggestedPrice * 4);
        const serperImages = await fetchSerperImages(cleanName);
        const bestImage = serperImages[0]?.imageUrl || '';

        const draftPlan: ExecutionPlan = {
          id: `plan-create-${Date.now()}`,
          title: `Create Product: ${nameEn}`,
          title_ar: `إنشاء وتصميم: ${nameAr}`,
          warning_ar: `يرجى مراجعة السعر المقترح ($${suggestedPrice}) واختيار صورة PNG قبل الاعتماد النهائي في المتجر.`,
          affected_count: 1,
          items: [
            {
              id: 'item-1',
              name: nameEn,
              name_ar: nameAr,
              action: 'create',
              action_ar: 'إنشاء منتج رسمي',
              details: `السعر: $${suggestedPrice} (${priceEgp} ج.م / ${priceSar} ر.س) | المخزون: 50 | المدة: ${duration}`,
            },
          ],
          steps: [
            { name: 'Analyze Product & Duration', name_ar: 'تحليل مواصفات ومدة الاشتراك', isCompleted: true },
            { name: 'Search High-Res Serper PNGs', name_ar: 'جلب أفضل صور PNG عالية الدقة عبر Serper', isCompleted: true },
            { name: 'Confirm Price & Official Catalog Insert', name_ar: 'تأكيد السعر والإدراج الرسمي في قاعدة البيانات', isCompleted: false, isActive: true },
          ],
          actions: [
            {
              tool: 'create_product',
              params: {
                name: nameEn,
                name_ar: nameAr,
                category: 'Subscriptions',
                our_price: suggestedPrice,
                market_price: marketPrice,
                price_egp: priceEgp,
                price_sar: priceSar,
                stock: 50,
                max_stock: 100,
                subscription_duration: duration,
                warranty_duration: '365 Days',
                delivery_time: 'Fast',
                brand_color: brandColor,
                icon_name: iconName,
                image_url: bestImage,
                description: `Full access to ${nameEn} with global secure checkout and replacement warranty.`,
                description_ar: `اشتراك رسمي مفعل بالكامل في ${nameAr} مع دفع عالمي معتمد وضمان ذهبي طوال مدة الاشتراك.`,
                advantages: ['Global Secure Checkout', 'Full-Term Replacement Warranty', 'Full Official Features'],
                advantages_ar: ['دفع عالمي موثوق', 'ضمان استبدال ذهبي شامل', 'حساب رسمي مفعل بكافة المزايا'],
              },
              description: `إنشاء منتج ${nameAr} بسعر $${suggestedPrice}`,
            },
          ],
          suggested_images: serperImages,
          product_draft: {
            name: nameEn,
            name_ar: nameAr,
            our_price: suggestedPrice,
            market_price: marketPrice,
            price_egp: priceEgp,
            price_sar: priceSar,
            stock: 50,
            category: 'Subscriptions',
            image_url: bestImage,
            subscription_duration: duration,
            warranty_duration: '365 Days',
          },
        };

        aiResult = {
          text: JSON.stringify({
            reply: isArabic
              ? `**مسودة تصميم المنتج جاهزة للمراجعة:**\n\n- **المنتج**: ${nameAr}\n- **السعر المقترح بالدولار**: **${suggestedPrice}$** (${priceEgp} ج.م / ${priceSar} ر.س)\n- **مدة الاشتراك والضمان**: ${duration} | ضمان ذهبي شامل\n- **المخزون المقترح**: 50 وحدة\n\n**استفسار التأكيد:** هل تعتمد هذا السعر وتلك الصورة، أم ترغب في تعديل السعر أو اختيار صورة أخرى من المقترحات؟ اضغط على زر **تأكيد الإضافة** أدناه للموافقة الفورية.`
              : `**Product Design Draft Ready:**\n\n- **Product**: ${nameEn}\n- **Suggested Price**: **$${suggestedPrice}** (EGP: ${priceEgp} / SAR: ${priceSar})\n- **Duration & Warranty**: ${duration} | 100% Replacement Warranty\n\n**Confirmation Question:** Would you like to proceed with this price and image, or adjust the price/select another PNG? Click **Confirm & Create** below to insert officially.`,
            requires_confirmation: true,
            plan: draftPlan,
            actions: [],
            suggestedPrompts: isArabic
              ? ['تأكيد وإنشاء المنتج فوراً', 'تعديل السعر إلى 19.99$', 'تغيير صورة المنتج']
              : ['Confirm & create product now', 'Adjust price to $19.99', 'Change product image'],
          }),
          modelUsed: 'UpStore Copilot Engine',
        };
      } else {
        const prodCount = context?.products?.length || 0;
        const prodsList = (context?.products || []).slice(0, 10).map((p: any) => 
          `- **${p.name}**${p.name_ar ? ` (${p.name_ar})` : ''}: السعر $${p.our_price} (${p.price_egp || Math.ceil(p.our_price * 53)} ج.م / ${p.price_sar || Math.ceil(p.our_price * 4)} ر.س) • المخزون: ${p.stock} قطعة`
        ).join('\n');

        aiResult = {
          text: JSON.stringify({
            reply: isArabic
              ? `**ملخص بيانات غرفة التحكم الحالية:**\n${prodsList || `إجمالي المنتجات في المتجر: ${prodCount} منتج.`}`
              : `**Store Control Room Overview:**\n${prodsList || `Total products: ${prodCount}.`}`,
            actions: [],
            suggestedPrompts: isArabic
              ? ['تخفيض أسعار الاشتراكات 10%', 'تعبئة نواقص المخزون (+50)', 'إجراء فحص شامل للمتجر']
              : ['Apply 10% discount', 'Restock low inventory (+50)', 'Run store audit']
          }),
          modelUsed: 'DeepSeek Engine'
        };
      }
    }

    let parsedResponse: CopilotAIResponse;
    try {
      parsedResponse = extractJSONFromAIResponse<CopilotAIResponse>(aiResult.text);
    } catch (parseErr) {
      console.warn('[Admin Copilot] Failed to parse JSON response, fallback to text reply:', aiResult.text);
      parsedResponse = {
        reply: aiResult.text,
        actions: [],
        suggestedPrompts: [
          'عرض تقرير المخزون الحالي',
          'تخفيض أسعار الاشتراكات 10%',
          'تحديث البانر الإعلاني',
        ],
      };
    }

    // Clean up reply string from any code leaks
    parsedResponse.reply = cleanReplyString(parsedResponse.reply);

    // Enrich create_product actions or plans with Serper PNG images if needed
    const targetCreateAction =
      parsedResponse.plan?.actions?.find((a) => a.tool === 'create_product') ||
      parsedResponse.actions?.find((a) => a.tool === 'create_product');

    if (targetCreateAction) {
      const searchTarget =
        targetCreateAction.params?.name ||
        targetCreateAction.params?.name_ar ||
        messages[messages.length - 1]?.content ||
        '';

      if (parsedResponse.plan && (!parsedResponse.plan.suggested_images || parsedResponse.plan.suggested_images.length === 0)) {
        const serperImages = await fetchSerperImages(searchTarget);
        if (serperImages.length > 0) {
          parsedResponse.plan.suggested_images = serperImages;
          if (!targetCreateAction.params.image_url) {
            targetCreateAction.params.image_url = serperImages[0].imageUrl;
          }
        }
      }

      if (parsedResponse.plan && !parsedResponse.plan.product_draft) {
        parsedResponse.plan.product_draft = {
          name: targetCreateAction.params.name || 'Product',
          name_ar: targetCreateAction.params.name_ar || 'منتج',
          our_price: Number(targetCreateAction.params.our_price) || 0,
          market_price: Number(targetCreateAction.params.market_price) || 0,
          price_egp: Number(targetCreateAction.params.price_egp) || Math.ceil((targetCreateAction.params.our_price || 0) * 53),
          price_sar: Number(targetCreateAction.params.price_sar) || Math.ceil((targetCreateAction.params.our_price || 0) * 4),
          stock: Number(targetCreateAction.params.stock) || 50,
          category: targetCreateAction.params.category || 'Subscriptions',
          image_url: targetCreateAction.params.image_url,
          subscription_duration: targetCreateAction.params.subscription_duration || '1 Month',
          warranty_duration: targetCreateAction.params.warranty_duration || '30 Days',
        };
      }
    }

    // If confirmation is required, DO NOT execute actions yet
    let executedActions: CopilotAction[] = [];
    if (!parsedResponse.requires_confirmation && !parsedResponse.plan && Array.isArray(parsedResponse.actions) && parsedResponse.actions.length > 0) {
      executedActions = await executeActionList(parsedResponse.actions);
    }

    return NextResponse.json({
      reply: parsedResponse.reply,
      actions: executedActions,
      plan: parsedResponse.plan || null,
      requires_confirmation: !!parsedResponse.requires_confirmation,
      suggestedPrompts: parsedResponse.suggestedPrompts || [],
      modelUsed: aiResult.modelUsed,
      reloadRequired: executedActions.some((a) => a.status === 'success'),
    });
  } catch (error: any) {
    console.error('[Admin Copilot API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Admin Copilot failed to generate a response.' },
      { status: 500 }
    );
  }
}