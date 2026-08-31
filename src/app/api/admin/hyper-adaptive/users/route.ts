import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdminUser } from '@/utils/security';

export interface UnifiedUserBehavioralRecord {
  id: string; // user_id or session_id
  userId: string | null;
  sessionId: string;
  email: string | null;
  displayName: string | null;
  isRegistered: boolean;
  role: string;
  walletBalance: number;
  ordersCount: number;
  totalSpent: number;
  persona: string;
  personaConfidence: number;
  profileCompleteness: number;
  cognitiveLoad: number;
  confusionScore: number;
  hesitationLevel: string;
  priceSensitivity: string;
  topCategory: string;
  categoryScores: Record<string, number>;
  viewedSlugs: string[];
  searchHistory: string[];
  cartCount: number;
  cartSlugs: string[];
  rageClicksCount: number;
  deviceInfo: Record<string, any>;
  aiReport: any | null;
  lastSeenAt: string;
  createdAt: string;
}

function computeUserCompleteness(params: {
  isRegistered: boolean;
  email: string | null;
  displayName: string | null;
  ordersCount: number;
  viewedSlugs: string[];
  searchHistory: string[];
  categoryScores: Record<string, number>;
  cartCount: number;
  persona: string;
  hesitationLevel: string;
}): number {
  let identity = 5;
  if (params.isRegistered || (params.email && params.email.includes('@'))) identity += 10;
  if (params.displayName && params.displayName !== 'Guest Visitor' && params.displayName !== 'User') identity += 5;
  identity = Math.min(20, identity);

  const viewed = params.viewedSlugs || [];
  let exploration = 0;
  if (viewed.length >= 5) exploration = 25;
  else if (viewed.length >= 3) exploration = 18;
  else if (viewed.length >= 2) exploration = 12;
  else if (viewed.length >= 1) exploration = 6;

  const searches = params.searchHistory || [];
  let search = 0;
  if (searches.length >= 3) search = 20;
  else if (searches.length >= 2) search = 14;
  else if (searches.length >= 1) search = 8;

  const dwellCats = Object.keys(params.categoryScores || {});
  let dwell = 0;
  if (dwellCats.length >= 3) dwell = 15;
  else if (dwellCats.length >= 2) dwell = 10;
  else if (dwellCats.length >= 1) dwell = 5;

  let engagement = 0;
  if (params.ordersCount > 0) engagement += 12;
  if (params.cartCount > 0) engagement += 5;
  if (params.persona && params.persona !== 'balanced') engagement += 3;
  engagement = Math.min(20, engagement);

  return Math.min(100, Math.max(10, identity + exploration + search + dwell + engagement));
}

export async function GET() {
  try {
    const auth = await requireAdminUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Fetch profiles
    const { data: profiles, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, wallet_balance, created_at')
      .order('created_at', { ascending: false });

    if (profilesErr) {
      console.warn('[Admin Hyper-Adaptive Users] Profiles query warning:', profilesErr.message);
    }

    // 2. Fetch orders summary & telemetry
    const { data: orders } = await supabase
      .from('orders')
      .select('id, user_id, amount, status, created_at, client_telemetry')
      .order('created_at', { ascending: false });

    const ordersByUser = new Map<string, { count: number; totalSpent: number }>();
    const deviceByUserId = new Map<string, any>();
    if (orders && Array.isArray(orders)) {
      for (const ord of orders) {
        if (ord.user_id) {
          const curr = ordersByUser.get(ord.user_id) || { count: 0, totalSpent: 0 };
          curr.count += 1;
          if (ord.status === 'completed' || ord.status === 'fulfilled') {
            curr.totalSpent += Number(ord.amount || 0);
          }
          ordersByUser.set(ord.user_id, curr);

          if (ord.client_telemetry && Object.keys(ord.client_telemetry).length > 0 && !deviceByUserId.has(ord.user_id)) {
            deviceByUserId.set(ord.user_id, ord.client_telemetry);
          }
        }
      }
    }

    // 3. Fetch telemetry records
    const { data: telemetryList } = await supabase
      .from('user_behavioral_telemetry')
      .select('*')
      .order('last_seen_at', { ascending: false })
      .limit(200);

    const telemetryByUserId = new Map<string, any>();
    const telemetryBySessionId = new Map<string, any>();

    if (telemetryList && Array.isArray(telemetryList)) {
      for (const t of telemetryList) {
        if (t.user_id) telemetryByUserId.set(t.user_id, t);
        if (t.session_id) telemetryBySessionId.set(t.session_id, t);
      }
    }

    // 4. Construct unified list starting with all registered profiles
    const unifiedList: UnifiedUserBehavioralRecord[] = [];
    const seenUserIds = new Set<string>();
    const seenSessionIds = new Set<string>();

    const registeredProfiles = profiles || [];
    for (const p of registeredProfiles) {
      seenUserIds.add(p.id);
      const userOrd = ordersByUser.get(p.id) || { count: 0, totalSpent: 0 };
      const userTel = telemetryByUserId.get(p.id);

      if (userTel?.session_id) {
        seenSessionIds.add(userTel.session_id);
      }

      const viewedSlugs: string[] = userTel?.viewed_slugs || [];
      const searchHistory: string[] = userTel?.search_history || [];
      const categoryScores: Record<string, number> = userTel?.category_dwell_times || { Subscriptions: 1 };
      const cartCount = userTel?.cart_actions?.cartCount || 0;
      const cartSlugs = userTel?.cart_actions?.cartSlugs || [];

      // Calculate completeness using multi-dimensional formula
      const completeness = computeUserCompleteness({
        isRegistered: true,
        email: p.email,
        displayName: p.display_name,
        ordersCount: userOrd.count,
        viewedSlugs,
        searchHistory,
        categoryScores,
        cartCount,
        persona: userTel?.persona || (userOrd.count > 2 ? 'power' : 'balanced'),
        hesitationLevel: userTel?.hesitation_level || 'none',
      });

      unifiedList.push({
        id: p.id,
        userId: p.id,
        sessionId: userTel?.session_id || `reg_${p.id.slice(0, 8)}`,
        email: p.email,
        displayName: p.display_name,
        isRegistered: true,
        role: p.role || 'customer',
        walletBalance: Number(p.wallet_balance || 0),
        ordersCount: userOrd.count,
        totalSpent: userOrd.totalSpent,
        persona: userTel?.persona || (userOrd.count > 2 ? 'power' : 'balanced'),
        personaConfidence: userTel?.persona_confidence || 95,
        profileCompleteness: completeness,
        cognitiveLoad: userTel?.cognitive_load || 0,
        confusionScore: userTel?.confusion_score || 0,
        hesitationLevel: userTel?.hesitation_level || 'none',
        priceSensitivity: userTel?.price_sensitivity || (userOrd.totalSpent > 50 ? 'low' : 'medium'),
        topCategory: userTel?.top_category || 'Subscriptions',
        categoryScores,
        viewedSlugs,
        searchHistory,
        cartCount,
        cartSlugs,
        rageClicksCount: userTel?.rage_clicks_count || 0,
        deviceInfo: userTel?.device_info && Object.keys(userTel.device_info).length > 0 ? userTel.device_info : (deviceByUserId.get(p.id) || {}),
        aiReport: userTel?.ai_report || null,
        lastSeenAt: userTel?.last_seen_at || p.created_at,
        createdAt: p.created_at,
      });
    }

    // 5. Add active anonymous guest sessions from telemetry that aren't mapped to registered profiles
    if (telemetryList && Array.isArray(telemetryList)) {
      for (const t of telemetryList) {
        if (!t.user_id || !seenUserIds.has(t.user_id)) {
          if (!seenSessionIds.has(t.session_id)) {
            seenSessionIds.add(t.session_id);
            const viewedSlugs = t.viewed_slugs || [];
            const searchHistory = t.search_history || [];
            const categoryScores = t.category_dwell_times || {};
            const cartCount = t.cart_actions?.cartCount || 0;
            const cartSlugs = t.cart_actions?.cartSlugs || [];

            const guestCompleteness = computeUserCompleteness({
              isRegistered: false,
              email: t.user_email || null,
              displayName: t.display_name || null,
              ordersCount: 0,
              viewedSlugs,
              searchHistory,
              categoryScores,
              cartCount,
              persona: t.persona || 'balanced',
              hesitationLevel: t.hesitation_level || 'none',
            });

            unifiedList.push({
              id: t.session_id,
              userId: null,
              sessionId: t.session_id,
              email: t.user_email || null,
              displayName: t.display_name || 'Guest Visitor',
              isRegistered: false,
              role: 'guest',
              walletBalance: 0,
              ordersCount: 0,
              totalSpent: 0,
              persona: t.persona || 'balanced',
              personaConfidence: t.persona_confidence || 85,
              profileCompleteness: guestCompleteness,
              cognitiveLoad: t.cognitive_load || 0,
              confusionScore: t.confusion_score || 0,
              hesitationLevel: t.hesitation_level || 'none',
              priceSensitivity: t.price_sensitivity || 'medium',
              topCategory: t.top_category || 'Subscriptions',
              categoryScores,
              viewedSlugs,
              searchHistory,
              cartCount,
              cartSlugs,
              rageClicksCount: t.rage_clicks_count || 0,
              deviceInfo: t.device_info || {},
              aiReport: t.ai_report || null,
              lastSeenAt: t.last_seen_at || t.created_at,
              createdAt: t.created_at,
            });
          }
        }
      }
    }

    // Sort by last seen / completeness
    unifiedList.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());

    return NextResponse.json({
      success: true,
      users: unifiedList,
      totalCount: unifiedList.length,
      registeredCount: registeredProfiles.length,
      guestCount: unifiedList.length - registeredProfiles.length,
    });
  } catch (err: any) {
    console.error('[Admin Hyper-Adaptive Users API Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch users behavioral data' },
      { status: 500 }
    );
  }
}
