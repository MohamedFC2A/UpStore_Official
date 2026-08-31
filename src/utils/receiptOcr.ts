export interface ReceiptOcrResult {
  success: boolean;
  platform: 'instapay' | 'vodafone_cash' | 'orange_cash' | 'etisalat_cash' | 'stc_pay' | 'alrajhi' | 'snb' | 'bybit' | 'binance' | 'unknown';
  amount: number | null;
  currency: 'EGP' | 'SAR' | 'USD' | null;
  senderName: string | null;
  senderPhone: string | null;
  senderAccount: string | null;
  recipient: string | null;
  isApprovedRecipient: boolean;
  recipientStatus: 'verified_approved' | 'wrong_recipient' | 'recipient_missing';
  isFraud: boolean;
  fraudType?: 'wrong_recipient' | 'fake_image' | 'edited_receipt' | 'recycled_ref' | null;
  fraudReason?: string | null;
  referenceNumber: string | null;
  transactionDate: string | null;
  transactionTime: string | null;
  status: 'successful' | 'strict_review' | 'failed' | 'fraud_rejected';
  confidence: number; // 0 to 100
  rawTextSummary: string;
  notes?: string;
  isMatchingAmount?: boolean;
  amountDiff?: number; // ocrAmount - expectedAmount
}

/**
 * List of authorized official recipient handles for UpStore Egypt
 */
export const APPROVED_RECIPIENT_PATTERNS = [
  'mo_matany',
  'momatany',
  'mo.matany',
  'mo_matany@instapay',
  'momatany@instapay',
  'mo_matany@ipn',
  'momatany@ipn',
  '01041140422',
  '010 4114 0422',
  '010-4114-0422',
  '+201041140422',
  '201041140422',
  '1041140422',
  '01021469502',
  '01000000000',
  '764476139',
  '382910482',
  '47183921',
  'upstore',
  'uversionstore',
  'mohamed matany',
  'mohamedmatany',
  'mohamed_matany',
  'mohamed',
  'matany',
  'محمد مطاوع',
  'محمد متاني',
  'محمد مطاوع متاني',
  'محمد متانى',
] as const;

// Pre-compute normalized lookup structures for O(1) set matching
const CLEAN_APPROVED_SET = new Set<string>(
  APPROVED_RECIPIENT_PATTERNS.map((p) => p.toLowerCase().replace(/[@._\-\s+]/g, ''))
);
const CLEAN_APPROVED_LIST = Array.from(CLEAN_APPROVED_SET);

/**
 * Checks whether the extracted recipient string matches the approved store owner account (mo_matany / 01041140422)
 * Optimized to O(1) set lookup + single pass substring test
 */
export function isApprovedRecipientHandle(recipient: string | null | undefined): boolean {
  if (!recipient || typeof recipient !== 'string') return false;
  const clean = recipient.trim().toLowerCase().replace(/[@._\-\s+]/g, '');
  if (!clean) return false;

  // 1. Direct O(1) set match
  if (CLEAN_APPROVED_SET.has(clean)) {
    return true;
  }

  // 2. Substring match against pre-cleaned handles
  for (let i = 0; i < CLEAN_APPROVED_LIST.length; i++) {
    const pat = CLEAN_APPROVED_LIST[i];
    if (clean.includes(pat) || pat.includes(clean)) {
      return true;
    }
  }

  // 3. Check 01041140422 phone number variations
  const digitsOnly = recipient.replace(/\D/g, '');
  if (digitsOnly.endsWith('1041140422') || digitsOnly === '01041140422') {
    return true;
  }

  // 4. Check Arabic names
  const arabicClean = recipient.replace(/[ًٌٍَُِّْ]/g, '').trim();
  if (
    arabicClean.includes('محمد مطاوع') ||
    arabicClean.includes('محمد متاني') ||
    arabicClean.includes('محمد متانى') ||
    arabicClean.includes('مطاوع') ||
    arabicClean.includes('متاني') ||
    arabicClean.includes('متانى')
  ) {
    return true;
  }

  return false;
}

// In-memory TTL cache (60 seconds) for AI settings
let cachedOpenRouterConfig: { apiKey: string; model: string; baseUrl: string; expiry: number } | null = null;

/**
 * Resolves OpenRouter configuration dynamically from database or env variables with TTL caching
 */
async function getOpenRouterConfig(): Promise<{ apiKey: string; model: string; baseUrl: string }> {
  const now = Date.now();
  if (cachedOpenRouterConfig && cachedOpenRouterConfig.expiry > now) {
    return cachedOpenRouterConfig;
  }

  let apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
  let model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-lite';
  let baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

  try {
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['openrouter_api_key', 'openrouter_model', 'openrouter_base_url']);

    if (data && Array.isArray(data)) {
      data.forEach((row) => {
        if (row.key === 'openrouter_api_key' && row.value) apiKey = String(row.value).trim();
        if (row.key === 'openrouter_model' && row.value) model = String(row.value).trim();
        if (row.key === 'openrouter_base_url' && row.value) baseUrl = String(row.value).trim();
      });
    }
  } catch (err) {
    console.warn('[Receipt OCR] Admin client lookup failed, using env values:', err);
  }

  const resolved = { apiKey, model, baseUrl, expiry: now + 60000 };
  cachedOpenRouterConfig = resolved;
  return resolved;
}

/**
 * High-precision regex extractor specifically for Egyptian InstaPay & Vodafone Cash receipts
 */
export function extractInstapayPatterns(rawText: string, _expectedAmount?: number): Partial<ReceiptOcrResult> {
  if (!rawText) return {};
  const normalized = rawText.replace(/\r/g, '\n');
  const result: Partial<ReceiptOcrResult> = {};

  // 1. Amount matching
  const amountMatch =
    normalized.match(/(?:المبلغ|المبلغ المحول|القيمة|Amount)\s*[:：]?\s*([\d,]+(?:\.\d{1,2})?)/i) ||
    normalized.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:EGP|جم|ج\.م|جنيه|SAR|ر\.س|USD)/i) ||
    normalized.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:EGP|جم|ج\.م)/i);

  if (amountMatch && amountMatch[1]) {
    const cleanNum = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (!isNaN(cleanNum) && cleanNum > 0) {
      result.amount = cleanNum;
      result.currency = normalized.includes('SAR') || normalized.includes('ر.س') ? 'SAR' : 'EGP';
    }
  }

  // 2. Reference number / Transaction ID
  const refMatch =
    normalized.match(/(?:الرقم المرجعي|رقم العملية|كود العملية|المرجع|Ref(?:erence)?\s*(?:No\.?|Number|ID)?)\s*[:：]?\s*([A-Za-z0-9_-]{6,30})/i) ||
    normalized.match(/\b(IPN[0-9]{8,24})\b/i) ||
    normalized.match(/\b([0-9]{10,20})\b/);

  if (refMatch && refMatch[1]) {
    result.referenceNumber = refMatch[1].trim();
  }

  // 3. Sender Name / Account / Phone
  const senderMatch = normalized.match(/(?:من حساب|من|اسم المحول|حساب المحول|From)\s*[:：]?\s*([^\n\r]+)/i);
  if (senderMatch && senderMatch[1]) {
    const senderText = senderMatch[1].trim();
    if (senderText.includes('@') || senderText.includes('instapay')) {
      result.senderAccount = senderText;
      result.senderName = senderText.split('@')[0];
    } else if (/^01[0125]\d{8}$/.test(senderText.replace(/\s+/g, ''))) {
      result.senderPhone = senderText.replace(/\s+/g, '');
    } else {
      result.senderName = senderText.replace(/[()]/g, '').trim();
    }
  }

  // Look for InstaPay IPA handle anywhere (e.g. user@instapay or mo_matany@...)
  const ipaMatch = normalized.match(/([a-zA-Z0-9._-]+@instapay|[a-zA-Z0-9._-]+@ipn)/i);
  if (ipaMatch && ipaMatch[1]) {
    result.senderAccount = ipaMatch[1];
    if (!result.senderName) {
      result.senderName = ipaMatch[1].split('@')[0];
    }
  }

  // 4. Recipient extraction
  const recipientMatch = normalized.match(/(?:إلى حساب|إلى|المستفيد|المحول إليه|To)\s*[:：]?\s*([^\n\r]+)/i);
  if (recipientMatch && recipientMatch[1]) {
    result.recipient = recipientMatch[1].trim();
  }

  // 5. Status
  if (
    normalized.includes('تم التحويل بنجاح') ||
    normalized.includes('تمت العملية بنجاح') ||
    normalized.includes('ناجح') ||
    normalized.includes('Successful') ||
    normalized.includes('Completed')
  ) {
    result.status = 'successful';
  } else if (normalized.includes('فشل') || normalized.includes('Failed')) {
    result.status = 'failed';
  }

  return result;
}

/**
 * Executes OpenRouter vision request with Google Gemini 2.5 Flash
 */
async function executeOpenRouterVision(
  model: string,
  dataUrl: string,
  apiKey: string,
  baseUrl: string,
  timeoutMs: number = 25000
): Promise<ReceiptOcrResult | null> {
  const prompt = `
You are the CHIEF FORENSIC PAYMENT AUDITOR & FRAUD INVESTIGATOR for UpStore.
Inspect this image with extreme scrutiny and return a strict JSON report.

MANDATORY FRAUD RULES:
1. Is this image an authentic financial transfer receipt screenshot (from InstaPay, Bank App, or Mobile Wallet)?
   - If the image contains a person, human face, selfie, animal, food, scenery, meme, casual chat, random object, or photo of numbers/calculator:
     Set "is_valid_receipt": false, "fraud_type": "fake_image", "fraud_reason": "الصورة المرفوعة صورة شخصية أو عنصر غير ذي صلة وليست إيصال تحويل مالي حقيقي".
2. Recipient Inspection:
   - Official Store Approved Recipients:
     * For InstaPay / IPN: "mo_matany" or "mo_matany@instapay" or "mo_matany@ipn"
     * For Vodafone Cash / Mobile Wallets: "01041140422" (or "010 4114 0422" / "201041140422")
     * For Binance Pay: "764476139" (or "382910482")
     * For Bybit: "47183921"
   - If recipient field is visible and matches ANY of the official store accounts ("mo_matany", "01041140422", "764476139", "47183921"):
     Set "recipient_matches_mo_matany": true, "wrong_recipient_detected": false.
   - If recipient field clearly belongs to ANY OTHER PERSON, DIFFERENT PHONE NUMBER, OR DIFFERENT WALLET (e.g. "01012345678", "011...", "012...", "ahmed...", "queenz..."):
     Set "recipient_matches_mo_matany": false, "wrong_recipient_detected": true, "fraud_type": "wrong_recipient", "fraud_reason": "تم تحويل الإيصال لرقم أو شخص آخر وليس لحساب المتجر الرسمي المعتمد".
   - If recipient is not visible or cut off in a real bank or wallet receipt:
     Set "is_recipient_visible": false, "recipient": null, "wrong_recipient_detected": false.
3. Extract Amount, Sender, Reference Number (IPN...), Date.

Return ONLY this JSON format:
{
  "is_valid_receipt": boolean,
  "fake_or_unrelated_reason": string or null,
  "amount": number or null,
  "currency": "EGP",
  "senderName": string or null,
  "senderAccount": string or null,
  "senderPhone": string or null,
  "recipient": string or null,
  "is_recipient_visible": boolean,
  "recipient_matches_mo_matany": boolean,
  "wrong_recipient_detected": boolean,
  "fraud_type": "wrong_recipient" | "fake_image" | null,
  "fraud_reason": string or null,
  "referenceNumber": string or null,
  "transactionDate": string or null,
  "transactionTime": string or null,
  "status": "successful" | "failed" | "pending",
  "confidence": number,
  "rawTextSummary": string
}
`.trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://upstore.one',
        'X-Title': 'UpStore Egypt Forensic AI',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '';
      return parseOcrJsonResponse(content);
    } else {
      const errText = await res.text().catch(() => '');
      console.warn(`[Receipt OCR] OpenRouter ${model} status ${res.status}:`, errText);
    }
  } catch (err: any) {
    clearTimeout(timer);
    console.warn(`[Receipt OCR] OpenRouter ${model} notice:`, err.message);
  }
  return null;
}

/**
 * Multi-Layered Forensic Receipt OCR Pipeline with Multi-Model Fallbacks
 */
export async function analyzeReceiptWithOcr(
  imageInput: Buffer | Uint8Array | string,
  mimeType: string = 'image/jpeg',
  expectedAmount?: number
): Promise<ReceiptOcrResult> {
  const t0 = Date.now();
  let base64Data = '';
  let imageBuffer: Buffer | null = null;

  if (typeof imageInput === 'string') {
    if (imageInput.startsWith('data:')) {
      const parts = imageInput.split(',');
      base64Data = parts[1] || '';
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
      try {
        const fetchRes = await fetch(imageInput);
        if (fetchRes.ok) {
          const arrBuffer = await fetchRes.arrayBuffer();
          imageBuffer = Buffer.from(arrBuffer);
          base64Data = imageBuffer.toString('base64');
        }
      } catch (err) {
        console.warn('[Receipt OCR] Failed to fetch image URL:', err);
      }
    } else {
      base64Data = imageInput;
      imageBuffer = Buffer.from(imageInput, 'base64');
    }
  } else {
    imageBuffer = Buffer.from(imageInput);
    base64Data = imageBuffer.toString('base64');
  }

  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;

  // ── Layer 1: Google Gemini 2.5 Flash Lite Vision (Primary Engine) ──
  const openRouterConfig = await getOpenRouterConfig();
  if (base64Data && openRouterConfig.apiKey) {
    const geminiResult = await executeOpenRouterVision(
      'google/gemini-2.5-flash-lite',
      dataUrl,
      openRouterConfig.apiKey,
      openRouterConfig.baseUrl,
      25000
    );

    if (geminiResult) {
      if (expectedAmount && geminiResult.amount) {
        const diff = geminiResult.amount - expectedAmount;
        geminiResult.amountDiff = diff;
        geminiResult.isMatchingAmount = Math.abs(diff) < 1.0;
      }
      console.info(
        `[Receipt OCR] Layer 1 (Gemini 2.5 Flash Lite) extracted in ${Date.now() - t0}ms: Recipient=${geminiResult.recipient}, isFraud=${geminiResult.isFraud}, Type=${geminiResult.fraudType}`
      );
      return geminiResult;
    }
  }

  // ── Layer 2: Google Gemini 2.5 Flash Lite Vision (Backup & Alternate Route) ──
  if (base64Data && openRouterConfig.apiKey) {
    const geminiBackupResult = await executeOpenRouterVision(
      'google/gemini-2.5-flash-lite',
      dataUrl,
      openRouterConfig.apiKey,
      'https://openrouter.ai/api/v1',
      25000
    );

    if (geminiBackupResult) {
      if (expectedAmount && geminiBackupResult.amount) {
        const diff = geminiBackupResult.amount - expectedAmount;
        geminiBackupResult.amountDiff = diff;
        geminiBackupResult.isMatchingAmount = Math.abs(diff) < 1.0;
      }
      console.info(
        `[Receipt OCR] Layer 2 (Gemini 2.5 Flash Lite Backup) extracted in ${Date.now() - t0}ms: isFraud=${geminiBackupResult.isFraud}`
      );
      return geminiBackupResult;
    }
  }

  // ── Layer 3: Optical Character Recognition (Tesseract eng+ara) ──
  let extractedRawText = '';
  if (imageBuffer && imageBuffer.length > 0) {
    try {
      const { default: Tesseract } = await import('tesseract.js');
      const tessPromise = Tesseract.recognize(imageBuffer, 'eng+ara', {
        logger: () => {},
      });

      const timeoutPromise = new Promise<{ data: { text: string } }>((_, reject) =>
        setTimeout(() => reject(new Error('Tesseract timeout')), 4000)
      );

      const ocrResult = await Promise.race([tessPromise, timeoutPromise]);
      extractedRawText = ocrResult?.data?.text || '';
    } catch {
      // Continue to pattern checks
    }
  }

  // ── Layer 4: Strict Financial Document Verification ──
  const isFinancialDocument =
    /(\b(IPN[0-9]{6,24}|instapay|انستاباي|تحويل|المحول|المستفيد|رقم العملية|المرجع|EGP|جم|ج\.م|SAR|USDT|بنك|فودافون)\b)/i.test(
      extractedRawText
    );

  const patternData = extractInstapayPatterns(extractedRawText, expectedAmount);

  // If the image contains zero financial keywords and no receipt patterns -> 100% FAKE IMAGE FRAUD
  if (!isFinancialDocument && !patternData.amount && !patternData.referenceNumber && !patternData.recipient) {
    return {
      success: false,
      platform: 'unknown',
      amount: null,
      currency: null,
      senderName: null,
      senderPhone: null,
      senderAccount: null,
      recipient: null,
      isApprovedRecipient: false,
      recipientStatus: 'recipient_missing',
      isFraud: true,
      fraudType: 'fake_image',
      fraudReason: 'الصورة المرفوعة ليست إيصال تحويل مالي بل صورة شخصية أو عنصر غير ذي صلة.',
      referenceNumber: null,
      transactionDate: null,
      transactionTime: null,
      status: 'fraud_rejected',
      confidence: 95,
      rawTextSummary: 'لم يتم العثور على أي بيانات أو نصوص تحويل مالي في الصورة المرفوعة.',
      isMatchingAmount: false,
      amountDiff: 0,
    };
  }

  // If pattern matching found receipt elements
  if (patternData.amount || patternData.referenceNumber || patternData.senderName || patternData.recipient) {
    const parsedAmount = patternData.amount ?? (expectedAmount ?? null);
    const diff = parsedAmount && expectedAmount ? parsedAmount - expectedAmount : 0;
    const detectedRecipient = patternData.recipient || null;
    const isApproved = isApprovedRecipientHandle(detectedRecipient);
    const isWrongRecipient = detectedRecipient !== null && !isApproved;
    const isMissingRecipient = detectedRecipient === null;

    let finalStatus: 'successful' | 'strict_review' | 'fraud_rejected' = 'successful';
    let isFraud = false;
    let fraudType: 'wrong_recipient' | 'fake_image' | null = null;
    let fraudReason: string | null = null;

    if (isWrongRecipient) {
      isFraud = true;
      fraudType = 'wrong_recipient';
      fraudReason = `تم التحويل لحساب آخر (${detectedRecipient}) وليس للحساب الرسمي المعتمد (mo_matany).`;
      finalStatus = 'fraud_rejected';
    } else if (isMissingRecipient) {
      finalStatus = 'strict_review';
    }

    return {
      success: !isFraud,
      platform: 'instapay',
      amount: parsedAmount,
      currency: (patternData.currency as any) || 'EGP',
      senderName: patternData.senderName || patternData.senderAccount || null,
      senderPhone: patternData.senderPhone || null,
      senderAccount: patternData.senderAccount || null,
      recipient: detectedRecipient,
      isApprovedRecipient: isApproved,
      recipientStatus: isApproved ? 'verified_approved' : isWrongRecipient ? 'wrong_recipient' : 'recipient_missing',
      isFraud,
      fraudType,
      fraudReason,
      referenceNumber: patternData.referenceNumber || null,
      transactionDate: new Date().toISOString().split('T')[0],
      transactionTime: new Date().toLocaleTimeString('ar-EG'),
      status: finalStatus,
      confidence: isApproved ? 90 : 80,
      rawTextSummary: extractedRawText.slice(0, 150),
      isMatchingAmount: expectedAmount && parsedAmount ? Math.abs(parsedAmount - expectedAmount) < 1.0 : true,
      amountDiff: diff,
    };
  }

  // ── Layer 5: Fallback if ambiguous -> Strict Review (Only if marked as financial document) ──
  return {
    success: true,
    platform: 'instapay',
    amount: expectedAmount ?? null,
    currency: 'EGP',
    senderName: null,
    senderPhone: null,
    senderAccount: null,
    recipient: null,
    isApprovedRecipient: false,
    recipientStatus: 'recipient_missing',
    isFraud: false,
    fraudType: null,
    fraudReason: null,
    referenceNumber: null,
    transactionDate: new Date().toISOString().split('T')[0],
    transactionTime: new Date().toLocaleTimeString('ar-EG'),
    status: 'strict_review',
    confidence: 60,
    rawTextSummary: 'بيانات المستفيد غير مكتملة في الصورة - تم تحويل الطلب للمراجعة المشددة.',
    isMatchingAmount: true,
    amountDiff: 0,
  };
}

interface RawOcrPayload {
  is_valid_receipt?: boolean;
  isValidReceipt?: boolean;
  fake_or_unrelated_reason?: string | null;
  fakeReason?: string | null;
  amount?: number | string | null;
  currency?: 'EGP' | 'SAR' | 'USD' | null;
  senderName?: string | null;
  senderAccount?: string | null;
  senderPhone?: string | null;
  recipient?: string | null;
  is_recipient_visible?: boolean;
  recipient_matches_mo_matany?: boolean;
  isApprovedRecipient?: boolean;
  wrong_recipient_detected?: boolean;
  fraud_type?: 'wrong_recipient' | 'fake_image' | 'edited_receipt' | 'recycled_ref' | null;
  fraud_reason?: string | null;
  referenceNumber?: string | number | null;
  transactionDate?: string | null;
  transactionTime?: string | null;
  status?: 'successful' | 'strict_review' | 'failed' | 'fraud_rejected' | 'pending';
  confidence?: number;
  rawTextSummary?: string;
  platform?: ReceiptOcrResult['platform'];
  notes?: string;
}

/**
 * Safely parses structured JSON response from LLM output into typed ReceiptOcrResult
 */
function parseOcrJsonResponse(text: string): ReceiptOcrResult | null {
  if (!text) return null;
  const clean = text
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();

  let rawObj: RawOcrPayload | null = null;
  try {
    rawObj = JSON.parse(clean) as RawOcrPayload;
  } catch {
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        rawObj = JSON.parse(clean.slice(firstBrace, lastBrace + 1)) as RawOcrPayload;
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  if (!rawObj || typeof rawObj !== 'object') return null;

  const parsedAmount =
    typeof rawObj.amount === 'number'
      ? rawObj.amount
      : parseFloat(String(rawObj.amount || '0')) || null;

  const isValidReceipt = rawObj.is_valid_receipt !== false && rawObj.isValidReceipt !== false;
  const fakeReason = rawObj.fake_or_unrelated_reason || rawObj.fakeReason || null;

  const extractedRecipient = rawObj.recipient ? String(rawObj.recipient).trim() : null;
  const isRecipientVisible = Boolean(rawObj.is_recipient_visible ?? (extractedRecipient !== null));
  const isApproved =
    Boolean(rawObj.recipient_matches_mo_matany || rawObj.isApprovedRecipient) ||
    isApprovedRecipientHandle(extractedRecipient);

  const isWrongRecipient =
    Boolean(rawObj.wrong_recipient_detected) ||
    (isRecipientVisible && extractedRecipient !== null && !isApproved);

  let isFraud = false;
  let fraudType: 'wrong_recipient' | 'fake_image' | 'edited_receipt' | null = null;
  let fraudReason: string | null = null;
  let status: 'successful' | 'strict_review' | 'failed' | 'fraud_rejected' = 'successful';

  if (!isValidReceipt) {
    isFraud = true;
    fraudType = 'fake_image';
    fraudReason = fakeReason || 'الصورة المرفوعة ليست إيصال تحويل مالي بل صورة شخصية أو عنصر غير ذي صلة.';
    status = 'fraud_rejected';
  } else if (isWrongRecipient) {
    isFraud = true;
    fraudType = 'wrong_recipient';
    fraudReason =
      rawObj.fraud_reason ||
      `تم تحويل الإيصال لشخص آخر (${extractedRecipient || 'حساب غير معتمد'}) وليس إلى حساب المتجر المعتمد (mo_matany).`;
    status = 'fraud_rejected';
  } else if (!isRecipientVisible || !extractedRecipient) {
    isFraud = false;
    status = 'strict_review';
  } else if (isApproved) {
    isFraud = false;
    status = rawObj.status === 'failed' ? 'failed' : 'successful';
  }

  return {
    success: !isFraud,
    platform: rawObj.platform || 'instapay',
    amount: parsedAmount,
    currency: rawObj.currency || 'EGP',
    senderName: rawObj.senderName || null,
    senderPhone: rawObj.senderPhone || null,
    senderAccount: rawObj.senderAccount || null,
    recipient: extractedRecipient,
    isApprovedRecipient: isApproved,
    recipientStatus: isApproved ? 'verified_approved' : isWrongRecipient ? 'wrong_recipient' : 'recipient_missing',
    isFraud,
    fraudType,
    fraudReason,
    referenceNumber: rawObj.referenceNumber ? String(rawObj.referenceNumber).trim() : null,
    transactionDate: rawObj.transactionDate || new Date().toISOString().split('T')[0],
    transactionTime: rawObj.transactionTime || new Date().toLocaleTimeString('ar-EG'),
    status,
    confidence: typeof rawObj.confidence === 'number' ? Math.round(rawObj.confidence <= 1 ? rawObj.confidence * 100 : rawObj.confidence) : 95,
    rawTextSummary:
      rawObj.rawTextSummary ||
      (status === 'strict_review'
        ? 'بيانات المستفيد غير واضحة - تم تحويل الطلب للمراجعة المشددة.'
        : 'تم فحص الإيصال بالذكاء الاصطناعي بدقة.'),
    notes: rawObj.notes || '',
  };
}

export const runClientSideOcr = analyzeReceiptWithOcr;
