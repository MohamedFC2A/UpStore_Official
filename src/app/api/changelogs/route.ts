import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import staticChangelogs from '@/data/changelogs.json';
import { sortChangelogs, type ChangelogItem } from '@/utils/semver';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let dbLogs: any[] | null = null;

    // 1. Try Supabase Service Role client if configured
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase
          .from('changelogs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          dbLogs = data;
        }
      } catch (dbErr) {
        console.warn('[Changelogs API] Supabase service query notice:', dbErr);
      }
    }

    // 2. Try Server Client
    if (!dbLogs || dbLogs.length === 0) {
      try {
        const serverSupabase = await createServerClient();
        const { data, error } = await serverSupabase
          .from('changelogs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          dbLogs = data;
        }
      } catch {
        // Fallback
      }
    }

    // 3. Merge DB logs and static logs, deduplicating strictly by Version and Title
    const staticList = (staticChangelogs as ChangelogItem[]) || [];
    const mergedMap = new Map<string, ChangelogItem>();

    // Add static items first
    staticList.forEach((item) => {
      if (item && item.version) {
        const normKey = item.version.trim().toUpperCase();
        mergedMap.set(normKey, item);
      }
    });

    // Merge or override with DB items (DB is source of truth for updated/managed releases)
    if (dbLogs && dbLogs.length > 0) {
      dbLogs.forEach((item) => {
        if (item && item.version) {
          const normKey = item.version.trim().toUpperCase();
          mergedMap.set(normKey, {
            id: item.id || `rel-${normKey.toLowerCase()}`,
            version: item.version,
            title: item.title,
            description: item.description,
            category: item.category || 'feature',
            features: Array.isArray(item.features) ? item.features : [],
            fixes: Array.isArray(item.fixes) ? item.fixes : [],
            created_at: item.created_at,
          });
        }
      });
    }

    // 4. Strictly sort all logs by Semantic Versioning & Date and filter out upcoming items
    const releasedList = Array.from(mergedMap.values()).filter((item: any) => item.status !== 'upcoming' && item.version !== 'V2.3.0');
    const sortedLogs = sortChangelogs(releasedList);

    return NextResponse.json({
      success: true,
      source: dbLogs && dbLogs.length > 0 ? 'database' : 'static_source',
      changelogs: sortedLogs,
      total: sortedLogs.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('[Changelogs API Error]:', error);
    const sortedStatic = sortChangelogs((staticChangelogs as ChangelogItem[]) || []);
    return NextResponse.json({
      success: true,
      source: 'static_fallback',
      changelogs: sortedStatic,
      total: sortedStatic.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }
}
