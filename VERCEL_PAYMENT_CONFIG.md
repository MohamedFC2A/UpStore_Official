# دليل تهيئة وتفعيل بوابات الدفع الذكية على Vercel و Bybit V5
# UpStore Smart Multi-Gateway Payment Configuration for Vercel

يقدم هذا المستند دليلاً شاملاً لكيفية ضبط وتفعيل جميع بوابات الدفع الإلكترونية، المشفرة، والمحلية في **مصر** و**السعودية** و**العالمية** على منصة **Vercel** بأعلى درجات الأمان والسرعة.

---

## 1. التعامل مع قيود عنوان IP في منصة بايبت (Bybit IP Whitelist: `156.204.227.116`)

### المشكلة التقنية:
عند تشغيل التطبيق على **Vercel**، تنفذ دوال الـ Serverless Functions على عناوين IP ديناميكية تابعة لسحابة AWS Lambda، بينما مفتاح Bybit API محدد بعنوان IP واحد فقط هو `156.204.227.116`. إذا تم إرسال الطلب مباشرة من سيرفرات Vercel بدون وسيط، سترفض Bybit الاتصال بكود خطأ `10003` أو `10004` (IP not whitelisted).

### الحل الذكي المدمج في UpStore:
1. **دعم الوكيل المباشر (Proxy Forwarding)**:
   تم برمجة عميل Bybit (`src/utils/bybit.ts`) ليدعم متغير البيئة `BYBIT_PROXY_URL`. عند تعيينه إلى خادم بروكسي أو SSH Tunnel يعمل على خادمك (`http://156.204.227.116:PORT`)، يتم توجيه جميع طلبات التوقيع والاستعلام عبر IP خادمك المصرح به تلقائياً.
2. **الوضع الاحتياطي الذكي والتحويل الداخلي (P2P / UID Transfer)**:
   في حال عدم تشغيل بروكسي، يدعم النظام التحويل الداخلي الفوري بدون رسوم (0% Fee) عبر **Bybit UID** وإيداع **USDT** المباشر على شبكات (TRC20 / BEP20 / TON) مع التحقق الفوري من رقم المعاملة (TXID) وتأكيد الطلب آلياً بدون أي توقف أو أخطاء للمستخدمين.

---

## 2. المتغيرات البيئية المطلوبة على Vercel (Environment Variables)

يمكنك إضافة هذه المتغيرات في لوحة تحكم Vercel عبر:
**Project Settings > Environment Variables** أو عبر سطر أوامر Vercel CLI (`vercel env add`).

### أ) إعدادات قاعدة البيانات والنظام:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_URL=https://upstore.vercel.app
```

### ب) بوابات بايبت والعملات المشفرة (Bybit V5 & Crypto):
```env
BYBIT_API_KEY=your_bybit_api_key
BYBIT_API_SECRET=your_bybit_api_secret
BYBIT_UID=47183921
BYBIT_TESTNET=false
BYBIT_PROXY_URL=http://156.204.227.116:8080   # اختياري لتوجيه الـ IP
BYBIT_USDT_TRC20=TW4z3c4PZ2Gk5YQ7nN9x8vK1mB5qP9R2e1
BYBIT_USDT_BEP20=0x71C836e520023a1B3a0279612301A949826a7C10
BYBIT_USDT_TON=EQBvW8m53GoU_jPAIp7LwY8Gj044kX_613p_dC6lQ1_y9Z1X
BINANCE_PAY_ID=382910482
```

### ج) بوابات الدفع في مصر (Egypt Wallets & InstaPay):
```env
INSTAPAY_ADDRESS=upstore@instapay
VODAFONE_CASH_NUMBER=01098765432
ORANGE_CASH_NUMBER=01234567890
ETISALAT_CASH_NUMBER=01123456789
FAWRY_MERCHANT_CODE=984120
```

### د) بوابات الدفع في السعودية (Saudi Arabia STC Pay & Banks):
```env
STC_PAY_NUMBER=0551234567
URPAY_NUMBER=0551234567
ALRAJHI_IBAN=SA0380000000608010167519
SNB_IBAN=SA4410000001234567890123
```

### هـ) بوابات البطاقات البنكية والعملات الرقمية العالمية (NOWPayments, Stripe, BTCPay, Cryptomus):
```env
NOWPAYMENTS_API_KEY=your_nowpayments_api_key
NOWPAYMENTS_IPN_SECRET=your_nowpayments_ipn_secret
NOWPAYMENTS_SANDBOX=false

CRYPTOMUS_MERCHANT_UUID=your_cryptomus_merchant_uuid
CRYPTOMUS_API_KEY=your_cryptomus_api_key

STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

BTCPAY_SERVER_URL=https://btcpay.yourdomain.com
BTCPAY_API_KEY=your_btcpay_key
BTCPAY_STORE_ID=your_store_id

TELEGRAM_BOT_TOKEN=1234567890:AA...
TELEGRAM_CHAT_ID=-1001234567890
```

---

## 3. مميزات البوابات وكيفية عملها

1. **نافذة الدفع الذكية (`SmartPaymentModal`)**:
   - تكتشف دولة العميل تلقائياً (مصر 🇪🇬، السعودية 🇸🇦، أو عالمي 🌐).
   - توفر أزرار نسخ فورية للحسابات والآيبان مع إشعارات تأكيد Toast.
   - تحسب المبالغ تلقائياً بالجنيه المصري، الريال السعودي، والدولار / USDT.
2. **التحقق الفوري والتسليم الآلي (`Fulfillment Engine`)**:
   - بمجرد تأكيد الدفع (عبر Bybit TXID، Stripe Webhook، أو اعتماد الأدمن)، تنفذ دالة `fulfillOrderSession` تسليم المفاتيح الرقمية المخزنة أو استدعاء Zelenka API آلياً في خلال 0-30 ثانية.
3. **لوحة تحكم المشرف (Admin Settings)**:
   - تمكين الأدمن من فحص اتصال Bybit API بضغطة زر مع فحص الـ IP والـ Latency.
   - تعديل جميع أرقام المحافظ والحسابات البنكية وحفظها فوراً في قاعدة بيانات `site_settings`.

---

## 4. فحص واختبار الاتصال بعد الرفع

1. توجه إلى لوحة الإدارة في موقعك: `/admin`.
2. افتح تبويب **الإعدادات (Settings)**.
3. اضغط على زر **Test Bybit Connection (فحص بايبت)** للتحقق من سلامة المفاتيح وصلاحية الاتصال.
