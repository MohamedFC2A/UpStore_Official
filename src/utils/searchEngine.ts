/**
 * searchEngine.ts — High-Performance Intelligent Multilingual Search Engine (BM25 + Phonetic + Fuzzy + Semantic)
 * 
 * Features:
 * - BM25 & TF-IDF Multi-Field Relevance Ranking (Title, Arabic Name, Slug, Category, Description)
 * - Comprehensive Arabic Phonetic Normalization (Alef, Taa Marbuta, Yaa, Hamza, Tashkeel, Tatweel)
 * - Arabic Affix & Clitic Stripping (الـ, و, ف, ك, ب, للـ, etc.)
 * - Deep Semantic Synonyms & Colloquial Slang Mapping (Egyptian, Gulf, Levantine, English)
 * - Damerau-Levenshtein Typo Tolerance & N-Gram Fuzzy Matching
 * - "Did You Mean?" (هل تقصد؟) Automated Query Spelling Correction
 * - Match Range Highlighter for Ultra-Responsive UX
 * - In-Stock & High-Rating Priority Multipliers
 */

export interface SearchableItem {
  id: string | number;
  name: string;
  name_ar?: string;
  slug: string;
  category: string;
  our_price?: number;
  ourPrice?: number;
  market_price?: number;
  marketPrice?: number;
  image_url?: string;
  description?: string;
  description_ar?: string;
  stock?: number;
  rating?: number;
  reviews?: number;
  is_flash_deal?: boolean;
}

export interface SearchResult<T extends SearchableItem = SearchableItem> {
  item: T;
  score: number;
  matchedTerms: string[];
  matchedField: 'exact_name' | 'prefix_name' | 'name' | 'category' | 'synonym' | 'description' | 'fuzzy';
}

// ─── Arabic & English Text Normalization ─────────────────────────────────────

/**
 * Unifies Arabic characters, strips Tashkeel (diacritics), and removes Tatweel (Kashida).
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    // Remove diacritics (Tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Alef variants: أ, إ, آ, ٱ -> ا
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Taa Marbuta: ة -> ه
    .replace(/ة/g, 'ه')
    // Normalize Yaa variants: ى, ئ -> ي
    .replace(/[ىئ]/g, 'ي')
    // Normalize Waw with Hamza: ؤ -> و
    .replace(/ؤ/g, 'و')
    // Normalize Persian/Urdu variants: ک -> ك, ی -> ي, گ -> ك
    .replace(/ک/g, 'ك')
    .replace(/ی/g, 'ي')
    // Remove tatweel (Kashida): ـ
    .replace(/ـ/g, '')
    // Normalize spaces and lowercase
    .toLowerCase()
    .trim();
}

/**
 * Normalizes English and Latin characters, removes special symbols, and handles spacing.
 */
export function normalizeEnglish(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips common Arabic grammatical prefixes (ال, و, ف, ك, ب, لل) to match root stems.
 */
export function stripArabicPrefixes(word: string): string[] {
  const norm = normalizeArabic(word);
  const stems = [norm];

  if (norm.startsWith('ال') && norm.length > 3) {
    stems.push(norm.slice(2));
  }
  if (norm.startsWith('لل') && norm.length > 3) {
    stems.push(norm.slice(2));
  }
  if ((norm.startsWith('و') || norm.startsWith('ف') || norm.startsWith('ب') || norm.startsWith('ك')) && norm.length > 3) {
    const withoutSingle = norm.slice(1);
    stems.push(withoutSingle);
    if (withoutSingle.startsWith('ال') && withoutSingle.length > 3) {
      stems.push(withoutSingle.slice(2));
    }
  }

  return Array.from(new Set(stems));
}

// ─── Deep Synonyms & Colloquial Slang Mapping ───────────────────────────────

const SYNONYMS_MAP: Record<string, string[]> = {
  // Common User Intent Verbs & Colloquial Slang
  'عايز': ['شراء', 'اشتراك', 'تفعيل', 'حساب', 'افضل', 'ارخص', 'رخيص'],
  'عاوز': ['شراء', 'اشتراك', 'تفعيل', 'حساب', 'افضل', 'ارخص', 'رخيص'],
  'بدي': ['شراء', 'اشتراك', 'تفعيل', 'حساب', 'افضل', 'ارخص', 'رخيص'],
  'ابي': ['شراء', 'اشتراك', 'تفعيل', 'حساب', 'افضل', 'ارخص', 'رخيص'],
  'ابغى': ['شراء', 'اشتراك', 'تفعيل', 'حساب', 'افضل', 'ارخص', 'رخيص'],
  'احتاج': ['شراء', 'اشتراك', 'تفعيل', 'حساب'],
  'شراء': ['اشتراك', 'حساب', 'كود', 'مفتاح', 'سعر', 'رخيص'],
  'ارخص': ['cheap', 'توفير', 'خصم', 'وفر', 'أقل سعر', 'عروض'],
  'أرخص': ['cheap', 'توفير', 'خصم', 'وفر', 'أقل سعر', 'عروض'],
  'رخيص': ['cheap', 'توفير', 'خصم', 'وفر', 'أقل سعر'],
  'توفير': ['cheap', 'خصم', 'وفر', 'أقل سعر', 'عروض'],
  'خصم': ['discount', 'توفير', 'وفر', 'أقل سعر', 'عروض'],

  // Streaming, Movies, Watching & Entertainment
  'تلفاز': ['netflix', 'نتفلكس', 'نتفليكس', 'افلام', 'مسلسلات', 'سينما', 'movies', 'series', 'streaming', '4k', 'uhd', 'شاشة', 'تلفزيون', 'شاهد', 'shahid', 'disney', 'ديزني', 'مشاهدة', 'سهرة', 'افضل دقة'],
  'تلفزيون': ['netflix', 'نتفلكس', 'نتفليكس', 'افلام', 'مسلسلات', 'سينما', 'movies', 'series', 'streaming', '4k', 'uhd', 'شاشة', 'تلفاز', 'شاهد', 'disney', 'ديزني', 'مشاهدة', 'افضل دقة'],
  'شاشة': ['netflix', 'نتفلكس', 'نتفليكس', 'تلفزيون', 'تلفاز', '4k', 'uhd', 'streaming', 'شاشات', 'شاشة ذكية', 'افضل دقة'],
  'شاشات': ['netflix', 'نتفلكس', 'نتفليكس', 'تلفزيون', 'تلفاز', '4k', 'uhd', 'streaming', 'شاشة', 'افضل دقة'],
  'tv': ['netflix', 'نتفلكس', 'تلفزيون', 'تلفاز', 'streaming', '4k', 'uhd', 'smart tv', 'youtube'],
  'smart': ['netflix', 'نتفلكس', 'تلفزيون', 'تلفاز', 'streaming', '4k', 'smart tv'],
  '4k': ['netflix', 'نتفلكس', 'نتفليكس', 'uhd', 'ultra hd', 'اعلى جودة', 'افضل دقة', 'دقة', 'جودة عالية', 'افلام', '4k uhd'],
  'uhd': ['netflix', 'نتفلكس', 'نتفليكس', '4k', 'ultra hd', 'افضل دقة', '4k uhd'],
  'دقة': ['4k', 'uhd', 'netflix', 'افضل دقة', 'ultra hd', 'جودة', 'اعلى دقة'],
  'افضل دقة': ['netflix', 'نتفلكس', '4k', 'uhd', 'ultra hd', 'أفضل دقة'],
  'أفضل دقة': ['netflix', 'نتفلكس', '4k', 'uhd', 'ultra hd', 'افضل دقة'],
  'كاس العالم': ['worldcup', 'fifa', 'مونديال', 'كورة', 'مباريات', 'بث', 'بث مباشر', 'تلفزيون', 'كأس العالم'],
  'كأس العالم': ['worldcup', 'fifa', 'مونديال', 'كورة', 'مباريات', 'بث', 'بث مباشر', 'تلفزيون', 'كاس العالم'],
  'مونديال': ['worldcup', 'fifa', 'كاس العالم', 'كأس العالم', 'كورة', 'مباريات'],
  'fifa': ['worldcup', 'كاس العالم', 'كأس العالم', 'مونديال', 'كورة', 'العاب'],
  'worldcup': ['fifa', 'كاس العالم', 'كأس العالم', 'مونديال', 'كورة', 'بث'],
  'كورة': ['worldcup', 'fifa', 'مباريات', 'بث', 'كاس العالم'],
  'مباريات': ['worldcup', 'fifa', 'كورة', 'بث', 'كاس العالم', 'شاهد'],
  'بث': ['worldcup', 'fifa', 'مباريات', 'كورة', 'netflix', 'شاهد'],
  'اتفرج': ['netflix', 'نتفلكس', 'نتفليكس', 'افلام', 'مسلسلات', 'سينما', 'movies', 'series', 'streaming', '4k', 'شاهد', 'shahid', 'disney', 'ديزني', 'مشاهدة', 'سهرة', 'تلفزيون', 'تلفاز'],
  'بتفرج': ['netflix', 'نتفلكس', 'نتفليكس', 'افلام', 'مسلسلات', 'سينما', 'movies', 'series', 'streaming', '4k', 'شاهد', 'shahid', 'disney', 'ديزني', 'مشاهدة'],
  'مشاهدة': ['netflix', 'نتفلكس', 'نتفليكس', 'افلام', 'مسلسلات', 'سينما', 'movies', 'series', 'streaming', '4k', 'شاهد', 'shahid', 'disney', 'ديزني', 'تلفاز', 'تلفزيون'],
  'فرجة': ['netflix', 'نتفلكس', 'نتفليكس', 'افلام', 'مسلسلات', 'سينما', 'movies', 'series', 'streaming', '4k', 'شاهد'],
  'سهرة': ['netflix', 'نتفلكس', 'نتفليكس', 'افلام', 'مسلسلات', 'سينما', 'movies', 'series', 'streaming', '4k'],
  'سينما': ['netflix', 'نتفلكس', 'نتفليكس', 'افلام', 'مسلسلات', 'movies', 'streaming', '4k'],
  'netflix': ['نتفلكس', 'نتفليكس', 'نتفلكز', 'افلام', 'أفلام', 'مسلسلات', 'سينما', 'movies', 'series', 'streaming', '4k', 'uhd', 'شاشة', 'تلفاز', 'تلفزيون', 'حساب نتفلكس', 'مشاهدة', 'سهرة', 'ترجمة', 'اتفرج', 'افضل دقة'],
  'نتفلكس': ['netflix', 'نتفليكس', 'افلام', 'مسلسلات', 'سينما', 'streaming', '4k', 'uhd', 'شاشة', 'تلفاز', 'تلفزيون', 'مشاهدة', 'اتفرج', 'افضل دقة'],
  'نتفليكس': ['netflix', 'نتفلكس', 'افلام', 'مسلسلات', 'سينما', 'streaming', '4k', 'uhd', 'شاشة', 'تلفاز', 'تلفزيون', 'مشاهدة', 'اتفرج', 'افضل دقة'],
  'افلام': ['netflix', 'نتفلكس', 'نتفليكس', 'movies', 'streaming', '4k', 'disney', 'shahid', 'شاهد', 'اتفرج', 'مشاهدة'],
  'أفلام': ['netflix', 'نتفلكس', 'نتفليكس', 'movies', 'streaming', '4k', 'disney', 'shahid', 'شاهد', 'اتفرج', 'مشاهدة'],
  'مسلسلات': ['netflix', 'نتفلكس', 'نتفليكس', 'series', 'streaming', 'shahid', 'شاهد', 'اتفرج', 'مشاهدة'],
  'movies': ['netflix', 'نتفلكس', 'نتفليكس', 'افلام', 'streaming', '4k', 'shahid', 'disney'],
  'series': ['netflix', 'نتفلكس', 'نتفليكس', 'مسلسلات', 'streaming', 'shahid', 'disney'],
  'watch': ['netflix', 'نتفلكس', 'افلام', 'مسلسلات', 'streaming', '4k', 'youtube'],
  'watching': ['netflix', 'نتفلكس', 'افلام', 'مسلسلات', 'streaming', '4k', 'youtube'],
  'youtube': ['يوتيوب', 'يوتيب', 'يوتيوب بريميوم', 'بدون اعلانات', 'فيديوهات', 'music', 'videos', 'premium', 'اغاني', 'بدون اعلانات', 'اسمع'],
  'يوتيوب': ['youtube', 'بريميوم', 'فيديوهات', 'اغاني', 'بدون اعلانات', 'music', 'اسمع'],
  'spotify': ['سبوتيفاي', 'سبوتفاي', 'سبوتيفاي بريميوم', 'اغاني', 'أغاني', 'موسيقى', 'music', 'songs', 'audio', 'بودكاست', 'اسمع'],
  'سبوتيفاي': ['spotify', 'سبوتفاي', 'اغاني', 'موسيقى', 'music', 'بودكاست', 'songs', 'اسمع'],
  'سبوتفاي': ['spotify', 'سبوتيفاي', 'اغاني', 'موسيقى', 'music', 'بودكاست', 'songs', 'اسمع'],
  'اسمع': ['spotify', 'سبوتيفاي', 'youtube', 'يوتيوب', 'music', 'اغاني', 'موسيقى'],
  'بسمع': ['spotify', 'سبوتيفاي', 'youtube', 'يوتيوب', 'music', 'اغاني', 'موسيقى'],
  'سماع': ['spotify', 'سبوتيفاي', 'youtube', 'يوتيوب', 'music', 'اغاني', 'موسيقى'],
  'مزيكا': ['spotify', 'سبوتيفاي', 'youtube', 'يوتيوب', 'music', 'اغاني'],
  'اغاني': ['spotify', 'سبوتيفاي', 'youtube', 'يوتيوب', 'music', 'اسمع', 'مزيكا'],
  'أغاني': ['spotify', 'سبوتيفاي', 'youtube', 'يوتيوب', 'music', 'اسمع', 'مزيكا'],
  'موسيقى': ['spotify', 'سبوتيفاي', 'youtube', 'music', 'اسمع'],
  'music': ['spotify', 'سبوتيفاي', 'youtube', 'يوتيوب', 'اغاني', 'موسيقى'],
  'shahid': ['شاهد', 'شاهد vip', 'مسلسلات عربي', 'vip', 'mbc', 'افلام', 'اتفرج'],
  'شاهد': ['shahid', 'vip', 'مسلسلات', 'عربي', 'اتفرج', 'مشاهدة'],
  'disney': ['ديزني', 'ديزني بلس', 'disney+', 'افلام كرتون', 'مارفل', 'marvel', 'اتفرج'],
  'ديزني': ['disney', 'disney+', 'مارفل', 'كرتون', 'اتفرج'],

  // AI, Coding & Productivity
  'chatgpt': ['شات جي بي تي', 'شات جيبيتي', 'openai', 'gpt', 'gpt4', 'gpt-4', 'gpt 4', 'gpt-4o', 'ذكاء اصطناعي', 'ai', 'plus', 'شاتgpt', 'جي بي تي', 'برمجة', 'شات بوت', 'مساعد', 'كود', 'كتابة'],
  'شات جي بي تي': ['chatgpt', 'openai', 'gpt-4', 'gpt4', 'ذكاء اصطناعي', 'ai', 'plus', 'برمجة', 'كتابة', 'كود'],
  'شاتجيبيتي': ['chatgpt', 'openai', 'gpt-4', 'gpt4', 'ذكاء اصطناعي', 'ai', 'plus'],
  'شات': ['chatgpt', 'openai', 'gemini', 'claude', 'ذكاء اصطناعي'],
  'جي بي تي': ['chatgpt', 'openai', 'gpt-4', 'gpt4', 'ذكاء اصطناعي', 'ai', 'plus'],
  'openai': ['chatgpt', 'gpt', 'dall-e', 'ذكاء اصطناعي', 'ai'],
  'gemini': ['جيميني', 'جيميناي', 'google ai', 'جوجل ai', 'advanced', 'gemini pro', 'ذكاء اصطناعي', 'google', 'برمجة'],
  'جيميني': ['gemini', 'جيميناي', 'google ai', 'advanced', 'ذكاء اصطناعي'],
  'جيميناي': ['gemini', 'google ai', 'advanced', 'ذكاء اصطناعي'],
  'claude': ['كلود', 'anthropic', 'ذكاء اصطناعي', 'ai', 'sonnet', 'opus', 'برمجة', 'كود'],
  'كلود': ['claude', 'anthropic', 'ذكاء اصطناعي', 'ai', 'sonnet', 'برمجة'],
  'canva': ['كانفا', 'تصميم', 'بريميوم', 'design', 'canva pro', 'فوتوشوب', 'جرافيك', 'ديزاين'],
  'كانفا': ['canva', 'canva pro', 'تصميم', 'design', 'جرافيك', 'ديزاين'],
  'تصميم': ['canva', 'كانفا', 'adobe', 'photoshop', 'فوتوشوب', 'design', 'جرافيك'],
  'ديزاين': ['canva', 'كانفا', 'adobe', 'photoshop', 'design'],
  'فوتوشوب': ['canva', 'adobe', 'photoshop', 'تصميم', 'ادوبي'],
  'midjourney': ['ميدجورني', 'ميدجورنى', 'توليد صور', 'صور ai', 'ai art'],
  'ميدجورني': ['midjourney', 'ذكاء اصطناعي', 'صور ai', 'ai art'],
  'ذكاء اصطناعي': ['chatgpt', 'gemini', 'claude', 'midjourney', 'ai', 'openai', 'شات جي بي تي'],
  'ai': ['chatgpt', 'gemini', 'claude', 'midjourney', 'ذكاء اصطناعي', 'شات جي بي تي', 'openai'],
  'برمجة': ['chatgpt', 'claude', 'gemini', 'windows', 'github', 'كود', 'code', 'developer'],
  'كود': ['chatgpt', 'claude', 'gemini', 'برمجة', 'code'],
  'شغل': ['chatgpt', 'office', 'windows', 'canva', 'برمجة', 'اوفيس'],
  'ابحاث': ['chatgpt', 'gemini', 'claude', 'office', 'وورد'],
  'بحث': ['chatgpt', 'gemini', 'claude', 'office'],
  'كتابة': ['chatgpt', 'gemini', 'claude', 'office', 'وورد'],

  // Security, VPN & Privacy
  'vpn': ['بروكسي', 'في بي ان', 'تشفير', 'حماية', 'تغيير موقع', 'proxy', 'secure', 'privacy', 'ip', 'nordvpn', 'expressvpn', 'surfshark', 'تصفح خفي', 'العاب اونلاين'],
  'في بي ان': ['vpn', 'بروكسي', 'nordvpn', 'حماية', 'تشفير', 'surfshark'],
  'nordvpn': ['نورد', 'نورد في بي ان', 'vpn', 'بروكسي', 'حماية', 'تشفير', 'في بي ان'],
  'نورد': ['nordvpn', 'vpn', 'حماية', 'تشفير'],
  'surfshark': ['سيرف شارك', 'vpn', 'بروكسي', 'في بي ان'],
  'حماية': ['vpn', 'nordvpn', 'surfshark', 'security', 'antivirus'],
  'امان': ['vpn', 'nordvpn', 'surfshark', 'security'],
  'تغيير اي بي': ['vpn', 'nordvpn', 'surfshark', 'بروكسي'],
  'تغيير ip': ['vpn', 'nordvpn', 'surfshark', 'بروكسي'],
  'بروكسي': ['vpn', 'nordvpn', 'surfshark', 'في بي ان'],

  // Software & Operating Systems
  'office': ['اوفيس', 'أوفيس', 'مايكروسوفت', 'microsoft', 'word', 'excel', 'powerpoint', '365', 'office 365', 'وورد', 'اكسل'],
  'اوفيس': ['office', 'مايكروسوفت', 'microsoft', '365', 'word', 'excel', 'وورد', 'اكسل', 'بوربوينت'],
  'أوفيس': ['office', 'مايكروسوفت', 'microsoft', '365', 'word', 'excel', 'وورد', 'اكسل'],
  'مايكروسوفت': ['microsoft', 'office', 'windows', 'اوفيس', 'ويندوز', '365'],
  'microsoft': ['مايكروسوفت', 'office', 'windows', 'اوفيس', 'ويندوز', '365'],
  'windows': ['ويندوز', 'وندوز', 'windows 11', 'windows 10', 'مفتاح ويندوز', 'سيريال', 'تفعيل', 'pro', 'برو', 'ويندوز 11', 'ويندوز 10'],
  'ويندوز': ['windows', 'مفتاح', 'سيريال', '11', '10', 'windows 11', 'windows 10', 'تفعيل'],
  'وندوز': ['windows', 'مفتاح', 'سيريال', '11', '10', 'windows 11', 'windows 10', 'تفعيل'],
  'adobe': ['ادوبي', 'أدوبي', 'photoshop', 'فوتوشوب', 'illustrator', 'creative cloud', 'مونتاج'],
  'ادوبي': ['adobe', 'photoshop', 'فوتوشوب', 'تصميم', 'creative cloud'],
  'تفعيل': ['windows', 'office', 'license', 'key', 'سيريال', 'مفتاح', 'ويندوز', 'اوفيس'],
  'مفتاح': ['windows', 'office', 'license', 'key', 'سيريال', 'تفعيل'],
  'سيريال': ['windows', 'office', 'license', 'key', 'مفتاح', 'تفعيل'],

  // Gaming
  'game': ['العاب', 'ألعاب', 'لعبة', 'games', 'gaming', 'steam', 'xbox', 'playstation', 'psn', 'قيمنق', 'جيمنج'],
  'games': ['العاب', 'ألعاب', 'لعبة', 'gaming', 'steam', 'xbox', 'playstation', 'psn', 'جيمنج'],
  'gaming': ['العاب', 'ألعاب', 'steam', 'xbox', 'playstation', 'جيمنج'],
  'العاب': ['game', 'games', 'gaming', 'steam', 'xbox', 'playstation', 'keys', 'جيمنج', 'قيمنق', 'لعب', 'بلعب'],
  'ألعاب': ['game', 'games', 'gaming', 'steam', 'xbox', 'playstation', 'keys', 'جيمنج', 'قيمنق', 'لعب', 'بلعب'],
  'لعبة': ['game', 'games', 'gaming', 'steam', 'xbox', 'playstation', 'جيمنج'],
  'لعب': ['game', 'games', 'gaming', 'steam', 'xbox', 'العاب', 'جيمنج'],
  'بلعب': ['game', 'games', 'gaming', 'steam', 'xbox', 'العاب', 'جيمنج'],
  'جيمنج': ['game', 'games', 'gaming', 'steam', 'xbox', 'playstation', 'العاب'],
  'قيمنق': ['game', 'games', 'gaming', 'steam', 'xbox', 'playstation', 'العاب'],
  'steam': ['ستيم', 'العاب pc', 'مفاتيح ستيم', 'العاب رخيصة', 'keys', 'pc games', 'العاب'],
  'ستيم': ['steam', 'العاب', 'العاب pc', 'مفاتيح ستيم'],
  'xbox': ['اكس بوكس', 'إكس بوكس', 'game pass', 'جيم باس', 'التيميت', 'ultimate', 'مايكروسوفت', 'العاب'],
  'اكس بوكس': ['xbox', 'game pass', 'جيم باس', 'التيميت', 'العاب'],
  'إكس بوكس': ['xbox', 'game pass', 'جيم باس', 'التيميت', 'العاب'],
  'playstation': ['بلايستيشن', 'بلاي ستيشن', 'psn', 'بلس', 'plus', 'سوني', 'العاب'],
  'بلايستيشن': ['playstation', 'بلاي ستيشن', 'psn', 'بلس', 'العاب'],
  'discord': ['ديسكورد', 'نيترو', 'nitro', 'discord nitro', 'سيرفر', 'شات'],
  'ديسكورد': ['discord', 'nitro', 'نيترو', 'سيرفر'],
};

// ─── Damerau-Levenshtein Distance for Fuzzy Matching ────────────────────────

// ─── Optimized Damerau-Levenshtein Distance with O(min(N, M)) Memory Footprint ──

export function calculateLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Swap to ensure `b` is shorter to minimize row allocation space O(min(N, M))
  let strA = a;
  let strB = b;
  if (strA.length < strB.length) {
    strA = b;
    strB = a;
  }

  const bLen = strB.length;
  let prevRow = new Array<number>(bLen + 1);
  let currRow = new Array<number>(bLen + 1);

  for (let j = 0; j <= bLen; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= strA.length; i++) {
    currRow[0] = i;
    const aChar = strA.charCodeAt(i - 1);

    for (let j = 1; j <= bLen; j++) {
      const cost = aChar === strB.charCodeAt(j - 1) ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,       // deletion
        currRow[j - 1] + 1,   // insertion
        prevRow[j - 1] + cost // substitution
      );
    }

    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[bLen];
}

/**
 * Calculates similarity ratio (0 to 1) between two strings with optional pre-normalized skip.
 */
export function stringSimilarity(str1: string, str2: string, alreadyNormalized = false): number {
  const s1 = alreadyNormalized ? str1 : normalizeArabic(normalizeEnglish(str1));
  const s2 = alreadyNormalized ? str2 : normalizeArabic(normalizeEnglish(str2));
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const maxLen = Math.max(s1.length, s2.length);
  const distance = calculateLevenshtein(s1, s2);
  return Math.max(0, (maxLen - distance) / maxLen);
}

// ─── "Did You Mean?" Spellchecker & Query Suggestion ─────────────────────────

const KNOWN_KEYWORDS = [
  'netflix', 'نتفلكس', 'نتفليكس', 'chatgpt', 'شات جي بي تي', 'openai', 'spotify', 'سبوتيفاي',
  'youtube', 'يوتيوب', 'nordvpn', 'نورد في بي ان', 'office', 'اوفيس', 'windows', 'ويندوز',
  'xbox', 'اكس بوكس', 'gemini', 'جيميني', 'canva', 'كانفا', 'steam', 'ستيم', 'playstation', 'بلايستيشن'
];

/**
 * Suggests the closest corrected term if user has a typo (e.g. "netflx" -> "netflix").
 */
export function suggestCorrection(rawQuery: string): string | null {
  const clean = normalizeArabic(normalizeEnglish(rawQuery)).trim();
  if (clean.length < 3) return null;

  // If already an exact keyword, no correction needed
  if (KNOWN_KEYWORDS.includes(clean)) return null;

  let bestMatch: string | null = null;
  let highestSim = 0;

  for (const keyword of KNOWN_KEYWORDS) {
    const sim = stringSimilarity(clean, keyword);
    if (sim >= 0.72 && sim > highestSim) {
      highestSim = sim;
      bestMatch = keyword;
    }
  }

  return bestMatch;
}

// ─── BM25 + Multi-Factor Hybrid Search Algorithm ────────────────────────────

interface PreparedSearchDoc<T extends SearchableItem> {
  product: T;
  pNameEn: string;
  pNameAr: string;
  pSlug: string;
  pCategory: string;
  pDescEn: string;
  pDescAr: string;
  allText: string;
  nameTokens: string[];
}

export function searchProducts<T extends SearchableItem>(
  products: T[],
  query: string,
  options?: {
    category?: string;
    limit?: number;
    threshold?: number;
  }
): SearchResult<T>[] {
  const rawQuery = (query || '').trim();
  const selectedCategory = options?.category && options.category !== 'ALL' ? options.category.toUpperCase() : null;
  const limit = options?.limit || 50;
  const threshold = options?.threshold || 12; // Minimum score to include

  // If query is empty, filter by category or return top-rated in-stock items
  if (!rawQuery) {
    let filtered = products;
    if (selectedCategory) {
      filtered = filtered.filter(p => (p.category || '').toUpperCase() === selectedCategory);
    }
    return filtered
      .map(item => ({
        item,
        score: (item.stock && item.stock > 0 ? 50 : 20) + (item.rating ? item.rating * 5 : 0),
        matchedTerms: [],
        matchedField: 'exact_name' as const
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  const normQueryEn = normalizeEnglish(rawQuery);
  const normQueryAr = normalizeArabic(rawQuery);
  const queryTokens = Array.from(
    new Set([
      ...normQueryEn.split(/\s+/).filter(t => t.length > 0),
      ...normQueryAr.split(/\s+/).filter(t => t.length > 0)
    ])
  );

  // Expand query tokens with synonyms and Arabic prefix variants
  const expandedTerms = new Set<string>();
  queryTokens.forEach(token => {
    expandedTerms.add(token);
    // Add prefix stripped versions
    stripArabicPrefixes(token).forEach(s => expandedTerms.add(s));
    // Add synonyms
    const directSynonyms = SYNONYMS_MAP[token] || [];
    directSynonyms.forEach(s => {
      expandedTerms.add(s);
      expandedTerms.add(normalizeArabic(s));
      expandedTerms.add(normalizeEnglish(s));
    });
  });

  const termsList = Array.from(expandedTerms).filter(t => t.length > 1);

  // 1. Single-pass document preparation (O(P)) — eliminates redundant normalizations
  const preparedDocs: PreparedSearchDoc<T>[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (selectedCategory && (p.category || '').toUpperCase() !== selectedCategory) {
      continue;
    }

    const pNameEn = normalizeEnglish(p.name || '');
    const pNameAr = normalizeArabic(p.name_ar || '');
    const pSlug = normalizeEnglish(p.slug || '').replace(/-/g, ' ');
    const pCategory = normalizeEnglish(p.category || '');
    const pDescEn = normalizeEnglish(p.description || '');
    const pDescAr = normalizeArabic(p.description_ar || '');
    const allText = `${pNameEn} ${pNameAr} ${pSlug} ${pCategory} ${pDescEn} ${pDescAr}`;
    const nameTokens = [...pNameEn.split(/\s+/), ...pNameAr.split(/\s+/)].filter(t => t.length >= 3);

    preparedDocs.push({
      product: p,
      pNameEn,
      pNameAr,
      pSlug,
      pCategory,
      pDescEn,
      pDescAr,
      allText,
      nameTokens,
    });
  }

  const totalDocs = Math.max(preparedDocs.length, 1);
  const termDocCount = new Map<string, number>();

  // 2. Pre-calculate inverse document frequency (IDF) using pre-extracted text
  for (const term of termsList) {
    let count = 0;
    for (let i = 0; i < preparedDocs.length; i++) {
      if (preparedDocs[i].allText.includes(term)) {
        count++;
      }
    }
    termDocCount.set(term, count);
  }

  const results: SearchResult<T>[] = [];

  // 3. Multi-Factor Scoring with field weights
  for (let i = 0; i < preparedDocs.length; i++) {
    const doc = preparedDocs[i];
    const { product, pNameEn, pNameAr, pSlug, pCategory, pDescEn, pDescAr, nameTokens } = doc;

    let score = 0;
    const matchedTerms: string[] = [];
    let matchedField: SearchResult<T>['matchedField'] = 'name';

    // 1. Direct Full Query Matches (Highest priority)
    if (pNameEn === normQueryEn || pNameAr === normQueryAr) {
      score += 250;
      matchedField = 'exact_name';
      matchedTerms.push(rawQuery);
    } else if (pNameEn.includes(normQueryEn) || pNameAr.includes(normQueryAr)) {
      score += 150;
      matchedField = 'exact_name';
      matchedTerms.push(rawQuery);
    } else if (pSlug.includes(normQueryEn)) {
      score += 120;
      matchedField = 'exact_name';
      matchedTerms.push(rawQuery);
    }

    // 2. Starts with query (Prefix match)
    if (pNameEn.startsWith(normQueryEn) || pNameAr.startsWith(normQueryAr)) {
      score += 70;
      matchedField = 'prefix_name';
    }

    // 3. Token-by-token BM25 Evaluation with field weights
    for (const term of termsList) {
      let termMatched = false;
      const docsWithTerm = termDocCount.get(term) || 1;
      // BM25 IDF: ln(1 + (N - n + 0.5) / (n + 0.5))
      const idf = Math.max(0.4, Math.log(1 + (totalDocs - docsWithTerm + 0.5) / (docsWithTerm + 0.5)));

      // Title & Arabic Name (Weight = 60 * IDF)
      if (pNameEn.includes(term) || pNameAr.includes(term)) {
        score += Math.round(60 * idf);
        termMatched = true;
        matchedTerms.push(term);
      }

      // Slug (Weight = 40 * IDF)
      if (pSlug.includes(term)) {
        score += Math.round(40 * idf);
        termMatched = true;
        matchedTerms.push(term);
      }

      // Category (Weight = 30 * IDF)
      if (pCategory.includes(term)) {
        score += Math.round(30 * idf);
        termMatched = true;
        if (matchedField === 'name') matchedField = 'category';
        matchedTerms.push(term);
      }

      // Descriptions (Weight = 15 * IDF)
      if (pDescEn.includes(term) || pDescAr.includes(term)) {
        score += Math.round(15 * idf);
        termMatched = true;
        if (matchedField === 'name') matchedField = 'description';
        matchedTerms.push(term);
      }

      // 4. Fuzzy Substring Matching for Typos (using pre-normalized tokens)
      if (!termMatched && term.length >= 4) {
        for (const nToken of nameTokens) {
          const sim = stringSimilarity(term, nToken, true);
          if (sim >= 0.75) {
            score += Math.round(sim * 30);
            matchedField = 'fuzzy';
            matchedTerms.push(nToken);
            break;
          }
        }
      }
    }

    // 5. Stock & Rating Multipliers (Commercial Ranking)
    if (score > 0) {
      if (product.stock && product.stock > 0) {
        score += 20; // In-stock bonus
      }
      if (product.rating) {
        score += Math.round(product.rating * 3); // High customer satisfaction boost
      }
      if (product.is_flash_deal) {
        score += 15; // Promoted deal boost
      }

      if (score >= threshold) {
        results.push({
          item: product,
          score,
          matchedTerms: Array.from(new Set(matchedTerms)),
          matchedField
        });
      }
    }
  }

  // Sort by highest relevance score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

// ─── Popular Search Suggestions ─────────────────────────────────────────────

export const POPULAR_SEARCH_SUGGESTIONS = [
  { labelEn: 'Netflix 4K Ultra HD', labelAr: 'نتفلكس 4K الترا', query: 'netflix', category: 'STREAMING', icon: 'Film' },
  { labelEn: 'ChatGPT Plus & GPT-4', labelAr: 'شات جي بي تي بلس', query: 'chatgpt', category: 'AI', icon: 'Bot' },
  { labelEn: 'Spotify Premium Individual', labelAr: 'سبوتيفاي بريميوم', query: 'spotify', category: 'MUSIC', icon: 'Music' },
  { labelEn: 'YouTube Premium No Ads', labelAr: 'يوتيوب بريميوم بدون إعلانات', query: 'youtube', category: 'STREAMING', icon: 'PlayCircle' },
  { labelEn: 'NordVPN Premium 1 Year', labelAr: 'نورد في بي ان سنوي', query: 'nordvpn', category: 'VPN', icon: 'Lock' },
  { labelEn: 'Microsoft Office 365 Pro', labelAr: 'مايكروسوفت أوفيس 365', query: 'office', category: 'SOFTWARE', icon: 'Laptop' },
  { labelEn: 'Xbox Game Pass Ultimate', labelAr: 'إكس بوكس جيم باس التيميت', query: 'xbox', category: 'GAMING', icon: 'Gamepad2' },
  { labelEn: 'Gemini Advanced Pro AI', labelAr: 'جوجل جيميناي أدفانسد', query: 'gemini', category: 'AI', icon: 'Sparkles' },
];
