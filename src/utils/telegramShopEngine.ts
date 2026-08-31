import {
  sendTelegramMessage,
  sendTelegramPhoto,
  editTelegramMessageText,
  deleteTelegramMessage,
  answerTelegramCallbackQuery,
  TelegramInlineKeyboardButton,
  STORE_PERSISTENT_KEYBOARD,
} from './telegram';
import { createAdminClient } from './supabase/admin';
import {
  STORE_CATEGORIES,
  STORE_BRANDS,
  STORE_CATALOG,
  getCategoryById,
  getBrandsByCategory,
  getBrandById,
  getProductsByBrand,
  getProductByShortIdOrSlug,
  StoreProduct,
  StoreBrand,
  StoreCategory,
} from './storeCatalog';

export {
  STORE_CATEGORIES,
  STORE_BRANDS,
  STORE_CATALOG,
  getCategoryById,
  getBrandsByCategory,
  getBrandById,
  getProductsByBrand,
  getProductByShortIdOrSlug,
};
export const renderCategoryProducts = renderCategoryBrands;

const userReferrals = new Map<string, { invitedCount: number; referredBy: string | null; referrals: string[] }>();

export async function getUserReferralStats(chatId: number | string): Promise<{ invitedCount: number; referredBy: string | null; referrals: string[] }> {
  const key = String(chatId);
  let stats = userReferrals.get(key);
  if (!stats) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', `tg_ref_${chatId}`)
        .single();
      if (data && data.value) {
        stats = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      }
    } catch {}
  }
  if (!stats) {
    stats = { invitedCount: 0, referredBy: null, referrals: [] };
  }
  userReferrals.set(key, stats);
  return stats;
}

export async function saveUserReferralStats(chatId: number | string, stats: { invitedCount: number; referredBy: string | null; referrals: string[] }): Promise<void> {
  const key = String(chatId);
  userReferrals.set(key, stats);
  try {
    const supabase = createAdminClient();
    await supabase.from('site_settings').upsert({
      key: `tg_ref_${chatId}`,
      value: JSON.stringify(stats),
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

export async function recordReferral(newChatId: number | string, referrerId: number | string) {
  if (!referrerId || String(newChatId) === String(referrerId)) return null;

  try {
    const userStats = await getUserReferralStats(newChatId);
    if (userStats.referredBy) {
      return null;
    }

    userStats.referredBy = String(referrerId);
    await saveUserReferralStats(newChatId, userStats);

    const referrerStats = await getUserReferralStats(referrerId);
    if (!referrerStats.referrals) referrerStats.referrals = [];
    if (!referrerStats.referrals.includes(String(newChatId))) {
      referrerStats.referrals.push(String(newChatId));
      referrerStats.invitedCount = referrerStats.referrals.length;
      await saveUserReferralStats(referrerId, referrerStats);

      const points = referrerStats.invitedCount;
      const earnedDollars = Math.floor(points / 5) * 1.0;
      const nextMilestone = (Math.floor(points / 5) + 1) * 5;
      const remainingForNext = nextMilestone - points;

      try {
        const notifyText = [
          '🎉 <b>مبروك! انضم مستخدم جديد عبر رابط دعوتك! 🔥</b>',
          '━━━━━━━━━━━━━━━━━━━━━━',
          '💎 <b>المكافأة:</b> <code>+1 نقطة فورية</code> ⭐',
          `📊 <b>إجمالي نقاطك:</b> <code>${points} نقطة</code>`,
          `💵 <b>رصيدك المكتسب للمشتريات:</b> <code>$${earnedDollars.toFixed(2)} USDT</code>`,
          `🎯 <i>متبقي لك <b>${remainingForNext} نقاط</b> للحصول على <b>+$1.00 دولار رصيد محفظة إضافي</b> لشراء أي اشتراك مجاناً! 🚀</i>`,
        ].join('\n');

        await sendTelegramMessage(referrerId, notifyText, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎁 عرض لوحة المكافآت', callback_data: 'referral' }],
              [{ text: '🛍️ تصفح المنتجات والشراء بالرصيد', callback_data: 'catalog' }],
            ],
          },
        });
      } catch (err) {
        console.warn('[Referral Notification Exception]:', err);
      }
    }

    return referrerStats;
  } catch (err) {
    console.error('[Record Referral Error]:', err);
    return null;
  }
}

// ── 1. MAIN MENU SCREEN ──
export async function renderMainMenu(
  chatId: number | string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  const text = [
    '👑 <b>متجر UpStore الرقمي الرسمي</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '⚡ <b>اشتراكات الذكاء الاصطناعي والخدمات الرقمية</b>',
    '🛡️ <b>تسليم فوري ومباشر مع ضمان استبدال ذهبي 100%</b>',
    '',
    'اختر من القائمة أدناه للبدء:',
  ].join('\n');

  const keyboard: { inline_keyboard: TelegramInlineKeyboardButton[][] } = {
    inline_keyboard: [
      [{ text: '🛍️ تصفح الأقسام والمنتجات', callback_data: 'catalog' }],
      [{ text: '🔥 نظام الأرباح ($1 لكل 5 أصدقاء 💸)', callback_data: 'referral' }],
      [{ text: '💳 شحن المحفظة (+بونص إضافي)', callback_data: 'payment_methods' }],
      [{ text: '👨‍💻 الدعم الفني المباشر', callback_data: 'support' }],
    ],
  };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    if (!res || !res.ok) {
      await sendTelegramMessage(chatId, text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard.inline_keyboard,
          keyboard: STORE_PERSISTENT_KEYBOARD.keyboard,
          resize_keyboard: true,
          is_persistent: true,
        },
      });
    }
  } else {
    await sendTelegramMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: keyboard.inline_keyboard,
        keyboard: STORE_PERSISTENT_KEYBOARD.keyboard,
        resize_keyboard: true,
        is_persistent: true,
      },
    });
  }
}

// ── 2. CATALOG SCREEN (MAIN CATEGORIES) ──
export async function renderCatalog(
  chatId: number | string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  const text = [
    '🛍️ <b>أقسام وعروض متجر UpStore الرقمي</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    'اختر القسم المطلوب لتصفح أشهر الخدمات والاشتراكات:',
  ].join('\n');

  const buttons: TelegramInlineKeyboardButton[][] = STORE_CATEGORIES.map((cat) => [
    { text: cat.name_ar, callback_data: `cat_${cat.id}` },
  ]);

  buttons.push([{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }]);

  const keyboard = { inline_keyboard: buttons };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    if (!res || !res.ok) {
      await deleteTelegramMessage(chatId, messageId);
      await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

// ── 3. CATEGORY BRANDS SCREEN (SERVICES & MARKS) ──
export async function renderCategoryBrands(
  chatId: number | string,
  categoryId: string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  const category = getCategoryById(categoryId);
  const brands = getBrandsByCategory(categoryId);

  if (!category || brands.length === 0) {
    await renderCatalog(chatId, messageId);
    return;
  }

  const text = [
    `<b>${category.name_ar}</b>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    'اختر الخدمة أو الماركة المطلوبة لعرض باقاتها والأسعار:',
  ].join('\n');

  const buttons: TelegramInlineKeyboardButton[][] = brands.map((b) => [
    { text: b.name_ar, callback_data: `brand_${b.id}` },
  ]);

  buttons.push([
    { text: '🔙 رجوع للأقسام', callback_data: 'catalog' },
    { text: '🏠 الرئيسية', callback_data: 'main_menu' },
  ]);

  const keyboard = { inline_keyboard: buttons };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    if (!res || !res.ok) {
      await deleteTelegramMessage(chatId, messageId);
      await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

// ── 4. BRAND TIERS SCREEN (DURATIONS & PLANS) ──
export async function renderBrandTiers(
  chatId: number | string,
  brandId: string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  const brand = getBrandById(brandId);
  const products = getProductsByBrand(brandId);

  if (!brand || products.length === 0) {
    await renderCatalog(chatId, messageId);
    return;
  }

  const text = [
    `💎 <b>${brand.name_ar}</b>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `ℹ️ <i>${brand.desc}</i>`,
    '',
    'اختر فئة الاشتراك والمدة المناسبة لك للشراء الفوري:',
  ].join('\n');

  const buttons: TelegramInlineKeyboardButton[][] = products.map((p) => [
    { text: p.button_title, callback_data: `prod_${p.short_id}` },
  ]);

  buttons.push([
    { text: '🔙 رجوع للخدمات', callback_data: `cat_${brand.category_id}` },
    { text: '🏠 الرئيسية', callback_data: 'main_menu' },
  ]);

  const keyboard = { inline_keyboard: buttons };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    if (!res || !res.ok) {
      await deleteTelegramMessage(chatId, messageId);
      await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

// ── 5. PRODUCT DETAILS SCREEN ──
export async function renderProductDetails(
  chatId: number | string,
  shortId: string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  const product = getProductByShortIdOrSlug(shortId);

  if (!product) {
    await renderCatalog(chatId, messageId);
    return;
  }

  const discountPct =
    product.market_price > product.our_price
      ? Math.round(((product.market_price - product.our_price) / product.market_price) * 100)
      : 0;

  const advantagesList = (product.advantages_ar || []).slice(0, 4).map((adv) => `• ${adv}`).join('\n');

  const text = [
    `💎 ${product.icon_symbol} <b>${product.name_ar}</b>`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    `💰 <b>السعر:</b> <code>$${product.our_price.toFixed(2)} USDT</code> 🔥${discountPct > 0 ? ` <i>(خصم ${discountPct}%)</i>` : ''}`,
    `💵 <code>${product.price_egp} ج.م</code> | <code>${product.price_sar} ر.س</code>`,
    `⏳ <b>المدة:</b> ${product.subscription_duration} | 🛡️ <b>الضمان:</b> ${product.warranty_duration}`,
    '⚡ <b>التسليم:</b> فوري وتلقائي داخل المحادثة',
    '',
    '<b>المزايا:</b>',
    advantagesList,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    'اختر وسيلة الدفع للشراء الفوري:',
  ].join('\n');

  const keyboard: { inline_keyboard: TelegramInlineKeyboardButton[][] } = {
    inline_keyboard: [
      [
        {
          text: `⚡ Bybit Pay ($${product.our_price.toFixed(2)} USDT)`,
          callback_data: `buy_bybit_${product.short_id}`,
        },
      ],
      [
        {
          text: `🟡 Binance Pay ($${product.our_price.toFixed(2)} USDT)`,
          callback_data: `buy_binance_${product.short_id}`,
        },
      ],
      [
        {
          text: `📱 انستاباي / كاش (${product.price_egp} ج.م)`,
          callback_data: `buy_local_${product.short_id}`,
        },
      ],
      [
        { text: '🔙 رجوع للباقات', callback_data: `brand_${product.brand_id}` },
        { text: '🏠 الرئيسية', callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    if (!res || !res.ok) {
      await deleteTelegramMessage(chatId, messageId);
      await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

// ── 5. DIRECT BYBIT CHECKOUT SCREEN ──
export async function renderDirectBybitCheckout(
  chatId: number | string,
  shortId: string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  const product = getProductByShortIdOrSlug(shortId) || STORE_CATALOG[0];
  const orderRef = `UP-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    const supabase = createAdminClient();
    await supabase.from('orders').insert({
      amount: product.our_price,
      status: 'pending_manual_payment',
      product_id: product.id,
      product_key: 'PENDING_TELEGRAM_FULFILLMENT',
      session_id: `tg_${chatId}_${orderRef}`,
      payment_sender: `Telegram @${chatId} (Bybit Crypto)`,
    });
  } catch (err) {
    console.error('[Supabase Order Insert Exception]:', err);
  }

  const text = [
    '⚡ <b>دفع مباشر عبر Bybit Pay</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `📦 <b>المنتج:</b> ${product.name_ar}`,
    `🆔 <b>رقم الطلب:</b> <code>#${orderRef}</code>`,
    '',
    '💵 <b>المبلغ المطلوب (USDT):</b>',
    `<code>${product.our_price.toFixed(2)}</code> <i>(اضغط على الرقم للنسخ)</i>`,
    '',
    '🆔 <b>Bybit UID (معرف الحساب):</b>',
    '<code>47183921</code> <i>(اضغط على الرقم للنسخ)</i>',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '📌 <b>طريقة الدفع والتفعيل:</b>',
    '1. افتح Bybit ➔ <b>تحويل (Transfer)</b> ➔ <b>تحويل داخلي</b>.',
    `2. أدخل الـ UID: <code>47183921</code> والمبلغ <code>${product.our_price.toFixed(2)}</code> وحوّل (رسوم 0%).`,
    '3. بعد التحويل، <b>أرسل معرف العملية (TXID / Transfer ID) هنا في الشات</b>.',
    '4. يتم فحص المعرف تلقائياً وتسليم الحساب فوراً ⚡.',
  ].join('\n');

  const keyboard: { inline_keyboard: TelegramInlineKeyboardButton[][] } = {
    inline_keyboard: [
      [
        {
          text: '🔍 فحص وتأكيد الدفع التلقائي ⚡',
          callback_data: `check_bybit_${product.short_id}_${orderRef}`,
        },
      ],
      [
        { text: '👨‍💻 مساعدة من الدعم الفني', callback_data: 'support' },
      ],
      [
        { text: '🔙 رجوع للمنتج', callback_data: `prod_${product.short_id}` },
        { text: '🏠 الرئيسية', callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    if (!res || !res.ok) {
      await deleteTelegramMessage(chatId, messageId);
      await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

// ── 5.1 DIRECT BINANCE CHECKOUT SCREEN ──
export async function renderDirectBinanceCheckout(
  chatId: number | string,
  shortId: string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  const product = getProductByShortIdOrSlug(shortId) || STORE_CATALOG[0];
  const orderRef = `UP-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    const supabase = createAdminClient();
    await supabase.from('orders').insert({
      amount: product.our_price,
      status: 'pending_manual_payment',
      product_id: product.id,
      product_key: 'PENDING_TELEGRAM_FULFILLMENT',
      session_id: `tg_${chatId}_${orderRef}`,
      payment_sender: `Telegram @${chatId} (Binance Pay)`,
    });
  } catch (err) {
    console.error('[Supabase Order Insert Exception]:', err);
  }

  const text = [
    '🟡 <b>دفع مباشر عبر Binance Pay</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `📦 <b>المنتج:</b> ${product.name_ar}`,
    `🆔 <b>رقم الطلب:</b> <code>#${orderRef}</code>`,
    '',
    '💵 <b>المبلغ المطلوب (USDT):</b>',
    `<code>${product.our_price.toFixed(2)}</code> <i>(اضغط على الرقم للنسخ)</i>`,
    '',
    '🆔 <b>Binance Pay / UID:</b>',
    '<code>764476139</code> <i>(اضغط على الرقم للنسخ)</i>',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '📌 <b>طريقة الدفع والتفعيل:</b>',
    '1. افتح تطبيق Binance ➔ <b>Pay (إرسال)</b> أو <b>تحويل داخلي</b>.',
    `2. أدخل الـ Binance ID: <code>764476139</code> والمبلغ <code>${product.our_price.toFixed(2)}</code> (رسوم 0%).`,
    '3. بعد التحويل، <b>أرسل معرف العملية (Order ID / Pay ID) هنا في الشات</b>.',
    '4. يتم التحقق والتسليم الفوري للحساب والمفتاح ⚡.',
  ].join('\n');

  const keyboard: { inline_keyboard: TelegramInlineKeyboardButton[][] } = {
    inline_keyboard: [
      [
        {
          text: '🔍 تأكيد الدفع مع الدعم ⚡',
          callback_data: `check_binance_${product.short_id}_${orderRef}`,
        },
      ],
      [
        { text: '👨‍💻 مساعدة من الدعم الفني', callback_data: 'support' },
      ],
      [
        { text: '🔙 رجوع للمنتج', callback_data: `prod_${product.short_id}` },
        { text: '🏠 الرئيسية', callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    if (!res || !res.ok) {
      await deleteTelegramMessage(chatId, messageId);
      await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

// ── 6. DIRECT LOCAL (INSTAPAY / CASH) CHECKOUT SCREEN ──
export async function renderDirectLocalCheckout(
  chatId: number | string,
  shortId: string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  const product = getProductByShortIdOrSlug(shortId) || STORE_CATALOG[0];
  const orderRef = `UP-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    const supabase = createAdminClient();
    await supabase.from('orders').insert({
      amount: product.our_price,
      status: 'pending_manual_payment',
      product_id: product.id,
      product_key: 'PENDING_TELEGRAM_FULFILLMENT',
      session_id: `tg_${chatId}_${orderRef}`,
      payment_sender: `Telegram @${chatId} (Local Pay)`,
    });
  } catch (err) {
    console.error('[Supabase Order Insert Exception]:', err);
  }

  const text = [
    '📱 <b>فاتورة الدفع المحلي (InstaPay & كاش)</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `📦 <b>المنتج:</b> ${product.name_ar}`,
    `🆔 <b>رقم الطلب:</b> <code>#${orderRef}</code>`,
    '',
    '💵 <b>المبلغ المطلوب:</b>',
    `<code>${product.price_egp}</code> ج.م <i>(اضغط على الرقم للنسخ)</i>`,
    `أو <code>${product.price_sar}</code> ر.س <i>(اضغط على الرقم للنسخ)</i>`,
    '',
    '💳 <b>عنوان انستاباي (InstaPay Username):</b>',
    '<code>mo_matany@instapay</code> <i>(اضغط للنسخ)</i>',
    '',
    '📱 <b>محافظ كاش مصر (فودافون / اتصالات / أورنج / WE):</b>',
    '<code>01041140422</code> <i>(اضغط على الرقم للنسخ)</i>',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '📌 <b>بعد التحويل:</b>',
    'أرسل صورة الإشعار أو رقم المحفظة المحول منها هنا في الشات للتسليم الفوري ⚡.',
  ].join('\n');

  const keyboard: { inline_keyboard: TelegramInlineKeyboardButton[][] } = {
    inline_keyboard: [
      [
        { text: '👨‍💻 تأكيد الإيصال للدعم', callback_data: 'support' },
      ],
      [
        { text: '🔙 رجوع للمنتج', callback_data: `prod_${product.short_id}` },
        { text: '🏠 الرئيسية', callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    if (!res || !res.ok) {
      await deleteTelegramMessage(chatId, messageId);
      await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

// ── 7. MY ORDERS & KEYS SCREEN ──
export async function renderMyOrders(
  chatId: number | string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  let ordersText = '';
  try {
    const supabase = createAdminClient();

    const { data: orders } = await supabase
      .from('orders')
      .select('id, amount, status, product_key, session_id, created_at, products(name, name_ar, subscription_duration)')
      .or(`session_id.ilike.%tg_${chatId}%,payment_sender.ilike.%@${chatId}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (orders && orders.length > 0) {
      orders.forEach((o: any, i: number) => {
        const title = o.products?.name_ar || o.products?.name || 'منتج رقمي';
        const shortId = o.id.slice(0, 8).toUpperCase();
        let statusBadge = '⏳ قيد المراجعة';
        if (o.status === 'completed' || o.status === 'fulfilled') {
          statusBadge = '✅ مكتمل ومُسلّم';
        }

        ordersText += `<b>${i + 1}. طلب #${shortId} — ${title}</b>\n`;
        ordersText += `• الحالة: <code>${statusBadge}</code> | المبلغ: <code>$${Number(o.amount).toFixed(2)}</code>\n`;
        
        if ((o.status === 'completed' || o.status === 'fulfilled') && o.product_key && o.product_key !== 'PENDING_TELEGRAM_FULFILLMENT') {
          ordersText += `• المفتاح / البيانات:\n<code>${o.product_key}</code>\n`;
        }
        ordersText += '━━━━━━━━━━━━━━━━━━\n';
      });
    }
  } catch (err) {}

  if (!ordersText) {
    ordersText = 'لا توجد طلبات مسجلة لهذا الحساب حالياً.\nيمكنك طلب منتجك الآن واستلام المفتاح فوراً ⚡.';
  }

  const text = [
    '📦 <b>لوحة تتبع الطلبات والمفاتيح الرقمية:</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    ordersText,
    '',
    '🛡️ <i>كافة طلباتك مضمونة 100% طوال فترة الاشتراك.</i>',
  ].join('\n');

  const keyboard: { inline_keyboard: TelegramInlineKeyboardButton[][] } = {
    inline_keyboard: [
      [
        { text: '🔄 تحديث الطلبات', callback_data: 'my_orders' },
        { text: '👨‍💻 مساعدة في طلب (@UPSTORE_HELP)', url: 'https://t.me/UPSTORE_HELP' },
      ],
    ],
  };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    if (!res || !res.ok) {
      await deleteTelegramMessage(chatId, messageId);
      await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

// ── 8. PAYMENT METHODS & WALLET SCREEN ──
export async function renderPaymentMethodsScreen(
  chatId: number | string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  const text = [
    '💳 <b>محفظة UpStore وبونص الشحن الإضافي</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '🎁 <b>عرض مضاعفة الرصيد الحصري:</b>',
    '• اشحن <b>$15</b> ➔ احصل على <b>+$1.5 مجاناً</b> <i>(الرصيد: $16.5)</i>',
    '• اشحن <b>$30</b> ➔ احصل على <b>+$3.0 مجاناً</b> <i>(الرصيد: $33.0)</i>',
    '• اشحن <b>$45</b> ➔ احصل على <b>+$4.5 مجاناً</b> <i>(الرصيد: $49.5)</i>',
    '• اشحن <b>$60</b> ➔ احصل على <b>+$6.0 مجاناً</b> <i>(الرصيد: $66.0)</i>',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '⚡ <b>بيانات التحويل المعتمدة (رسوم 0%):</b>',
    '• <b>Bybit UID:</b>',
    '<code>47183921</code> <i>(اضغط على الرقم للنسخ)</i>',
    '',
    '• <b>Binance Pay / UID:</b>',
    '<code>764476139</code> <i>(اضغط على الرقم للنسخ)</i>',
    '',
    '• <b>InstaPay:</b>',
    '<code>mo_matany@instapay</code> <i>(اضغط للنسخ)</i>',
    '',
    '• <b>محافظ كاش مصر:</b>',
    '<code>01041140422</code> <i>(اضغط على الرقم للنسخ)</i>',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '📌 بعد التحويل، أرسل <b>معرف العملية</b> هنا لشحن الرصيد مع البونص فوراً 🚀.',
  ].join('\n');

  const keyboard: { inline_keyboard: TelegramInlineKeyboardButton[][] } = {
    inline_keyboard: [
      [{ text: '⚡ شحن Bybit (+بونص تلقائي)', callback_data: 'buy_bybit_643361f7' }],
      [{ text: '🟡 شحن Binance (+بونص تلقائي)', callback_data: 'buy_binance_643361f7' }],
      [{ text: '👨‍💻 شحن كاش وإنستاباي مع الدعم', callback_data: 'support' }],
      [{ text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' }],
    ],
  };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    if (!res || !res.ok) {
      await deleteTelegramMessage(chatId, messageId);
      await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

// ── 9. WARRANTY POLICY SCREEN ──
export async function renderWarrantyPolicyScreen(
  chatId: number | string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  const text = [
    '🛡️ <b>سياسة الضمان الذهبي والاستبدال 100%</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '<b>نلتزم بتقديم أعلى مستويات الأمان والضمان لعملائنا:</b>',
    '',
    '1. <b>ضمان استبدال فوري:</b> يغطي كامل مدة الاشتراك، وفي حال أي توقف يتم الاستبدال فوراً ⚡.',
    '2. <b>حسابات وتراخيص رسمية:</b> معتمدة ومضمونة وخالية من أي إغلاقات مفاجئة 💎.',
    '3. <b>دعم فني متواصل:</b> متواجدون على مدار الساعة لحل أي عطل فوراً 👨‍💻.',
    '4. <b>استرداد كامل:</b> في حال تعذر حل أي مشكلة، يحق لك استرداد المبلغ بالكامل فوراً 💰.',
  ].join('\n');

  const keyboard: { inline_keyboard: TelegramInlineKeyboardButton[][] } = {
    inline_keyboard: [
      [
        { text: '👨‍💻 التحدث مع الدعم الفني', callback_data: 'support' },
      ],
      [
        { text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    if (!res || !res.ok) {
      await deleteTelegramMessage(chatId, messageId);
      await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

// ── 10. REFERRAL & REWARDS SCREEN ──
export async function renderReferralScreen(
  chatId: number | string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  const stats = await getUserReferralStats(chatId);
  const invitedCount = stats.invitedCount || (stats.referrals ? stats.referrals.length : 0);
  const points = invitedCount;
  const earnedDollars = Math.floor(points / 5) * 1.0;
  const nextMilestonePoints = (Math.floor(points / 5) + 1) * 5;
  const remainingPoints = nextMilestonePoints - points;
  const refLink = `https://t.me/upstore_one_bot?start=ref_${chatId}`;

  const shareTextTelegram = encodeURIComponent(
    '🔥 متجر UpStore الرقمي 🚀\n\n' +
    'أقوى وأرخص اشتراكات الذكاء الاصطناعي والتطبيقات الرسمية (ChatGPT, Gemini, Cursor, Canva, Netflix) بأسعار تبدأ من $0.19 مع ضمان ذهبي 100%!\n\n' +
    'ادخل واكتشف العروض الحصرية من هنا 👇\n' + refLink
  );

  const shareTextWhatsApp = encodeURIComponent(
    '🔥 متجر UpStore الرقمي — اشتراكات ذكاء اصطناعي وتطبيقات رسمية بأسعار تبدأ من $0.19 فقط وضمان استبدال ذهبي!\n\nتصفح المتجر من هنا: ' + refLink
  );

  const text = [
    '🔥 <b>نظام المكافآت ورصيد المحفظة المجاني — UpStore</b> 🎁',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '⚡ <b>شارك رابط دعوتك واكسب رصيد محفظة لشراء أي اشتراك مجاناً!</b>',
    '',
    '💎 <b>معادلة المكافآت النارية:</b>',
    '• كل صديق ينضم عبر رابطك = <b>⭐ 1 نقطة فورية</b>',
    '• كل <b>5 نقاط</b> = <b>💵 $1.00 دولار</b> يضاف تلقائياً لرصيد محفظتك!',
    '• <i>استخدم رصيدك في شراء وتجديد أي اشتراك داخل البوت بـ $0.00! 🚀</i>',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '📊 <b>إحصائيات رصيدك ومكافآتك الحالية:</b>',
    `👥 <b>الأصدقاء المدعوون:</b> <code>${invitedCount}</code> صديق`,
    `⭐ <b>مجموع النقاط:</b> <code>${points}</code> نقطة`,
    `💵 <b>رصيدك المكتسب للمشتريات:</b> <code>$${earnedDollars.toFixed(2)} USDT</code>`,
    `🎯 <b>للدولار القادم:</b> متبقي <code>${remainingPoints}</code> نقاط فقط`,
    '━━━━━━━━━━━━━━━━━━━━━━',
    '🔗 <b>رابط الدعوة الخاص بك (اضغط للنسخ):</b>',
    `<code>${refLink}</code>`,
    '',
    '📢 <b>انشر الرابط الآن في جروبات تليجرام وواتساب واجمع نقاطك لشراء حساباتك مجاناً! 💎</b>',
  ].join('\n');

  const keyboard: { inline_keyboard: TelegramInlineKeyboardButton[][] } = {
    inline_keyboard: [
      [
        { text: '🚀 مشاركة فورية على تليجرام', url: `https://t.me/share/url?url=${refLink}&text=${shareTextTelegram}` },
      ],
      [
        { text: '💬 مشاركة عبر واتساب', url: `https://api.whatsapp.com/send?text=${shareTextWhatsApp}` },
      ],
      [
        { text: '🛍️ تصفح المنتجات والشراء بالرصيد', callback_data: 'catalog' },
        { text: '🔄 تحديث الرصيد', callback_data: 'referral' },
      ],
      [
        { text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    if (!res || !res.ok) {
      await deleteTelegramMessage(chatId, messageId);
      await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

// ── 11. SUPPORT SCREEN ──
export async function renderSupportScreen(
  chatId: number | string,
  messageId?: number,
  callbackQueryId?: string
): Promise<void> {
  if (callbackQueryId) await answerTelegramCallbackQuery(callbackQueryId);

  const text = [
    '👨‍💻 <b>خدمة العملاء والدعم الفني المباشر</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    'نحن هنا لمساعدتك وخدمتك على مدار الساعة ⚡:',
    '',
    '• <b>الدعم الفني البشري:</b> تواصل مباشرة مع فريق الدعم لحل أي عطل أو استبدال فوري 🛡️.',
    '• <b>المساعد الذكي:</b> يمكنك كتابة أي استفسار أو إرسال معرف التحويل / صورة الإيصال في هذه المحادثة وسنخدمك فوراً!',
  ].join('\n');

  const keyboard: { inline_keyboard: TelegramInlineKeyboardButton[][] } = {
    inline_keyboard: [
      [
        { text: '🛡️ الضمان الذهبي 100%', callback_data: 'warranty_policy' },
      ],
      [
        { text: '🏠 القائمة الرئيسية', callback_data: 'main_menu' },
      ],
    ],
  };

  if (messageId) {
    const res = await editTelegramMessageText(chatId, messageId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    if (!res || !res.ok) {
      await deleteTelegramMessage(chatId, messageId);
      await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await sendTelegramMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}
