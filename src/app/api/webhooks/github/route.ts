import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateStructuredAIResponse } from '@/utils/ai';
import { calculateNextVersion, sortChangelogs } from '@/utils/semver';

// Initialize Supabase Admin client with service role key to bypass RLS for webhook insertion
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface GitHubCommit {
  id: string;
  message: string;
  timestamp: string;
  author: {
    name: string;
    email: string;
  };
  added?: string[];
  removed?: string[];
  modified?: string[];
}

interface AIChangelogOutput {
  version: string;
  title: string;
  description: string;
  category: 'feature' | 'fix' | 'improvement' | 'announcement';
  features: string[];
  fixes: string[];
}

export async function POST(req: Request) {
  try {
    const event = req.headers.get('x-github-event') || 'push';
    const payload = await req.json();

    // Check if this is a push or release event
    let commits: GitHubCommit[] = [];
    let branch = '';
    let releaseTag = '';

    if (event === 'push') {
      commits = (payload.commits || []).filter((c: any) => {
        const msg = (c.message || '').toLowerCase();
        const author = (c.author?.name || '').toLowerCase();
        return (
          !author.includes('bot') &&
          !author.includes('dependabot') &&
          !msg.includes('[skip ci]') &&
          !msg.includes('auto-update ai release notes') &&
          !msg.includes('chore(changelog)') &&
          !msg.startsWith('merge branch') &&
          !msg.startsWith('merge pull request') &&
          !msg.startsWith('chore:') &&
          !msg.startsWith('ci:')
        );
      });
      branch = (payload.ref || '').replace('refs/heads/', '');
      
      // If no meaningful commits, acknowledge gracefully
      if (commits.length === 0) {
        return NextResponse.json({ message: 'No user-facing commits in push event. Ignored.' });
      }
    } else if (event === 'release') {
      releaseTag = payload.release?.tag_name || 'V2.2.0';
      const releaseBody = payload.release?.body || payload.release?.name || '';
      commits = [
        {
          id: payload.release?.id?.toString() || 'rel',
          message: `${payload.release?.name || releaseTag}\n\n${releaseBody}`,
          timestamp: payload.release?.published_at || new Date().toISOString(),
          author: {
            name: payload.release?.author?.login || 'UpStore GitHub Release',
            email: 'admin@upstore.one',
          },
        },
      ];
    } else {
      return NextResponse.json({ message: `GitHub event '${event}' received but not processed.` });
    }

    // Format commit summary for AI
    const commitSummaries = commits
      .map((c) => {
        const filesChanged = [
          ...(c.added ? c.added.map((f) => `+ ${f}`) : []),
          ...(c.modified ? c.modified.map((f) => `~ ${f}`) : []),
          ...(c.removed ? c.removed.map((f) => `- ${f}`) : []),
        ].slice(0, 15).join(', ');

        return `- Commit [${c.id.slice(0, 7)}]: "${c.message.trim()}" | Files: [${filesChanged}]`;
      })
      .join('\n');

    // Query existing latest version from Supabase to compute next version
    let latestVersion = 'V2.2.0';
    const dbClient = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;
    
    if (dbClient) {
      try {
        const { data: allLogs } = await dbClient
          .from('changelogs')
          .select('id, version, created_at');
        if (allLogs && allLogs.length > 0) {
          const sorted = sortChangelogs(allLogs);
          latestVersion = sorted[0].version;
        }
      } catch {
        // Fallback
      }
    }

    const commitMessages = commits.map((c) => c.message);
    const nextVerCalc = calculateNextVersion(latestVersion, 'auto', commitMessages);

    // System prompt for smart AI Changelog Categorization
    const systemPrompt = `
You are an expert AI Systems Architect & Release Engineer for UpStore (upstore.one) - the premier digital marketplace.
Analyze the following Git commits pushed to the repository and produce a structured, high-quality changelog entry in Arabic.

PREVIOUS LATEST VERSION: "${latestVersion}"
RECOMMENDED NEXT VERSION: "${releaseTag || nextVerCalc.version}" (${nextVerCalc.bump.toUpperCase()} bump)

SEMANTIC VERSIONING 2.0.0 RULES:
- "major": For breaking changes or massive platform overhauls.
- "minor": For substantial new features, pages, 3D animations, payment methods, or AI tools.
- "patch": For bug fixes, performance optimizations, RTL adjustments, SEO, styling, or maintenance.

CATEGORIZATION RULES:
- "feature": If commits introduce brand-new features, pages, payment gateways, or integrations.
- "fix": If commits primarily fix bugs, crashes, security issues, broken links, or visual glitches.
- "improvement": If commits enhance performance, polish UI/UX, optimize SEO/sitemaps, refactor code, or update dependencies.
- "announcement": If this is a major milestone release or system maintenance announcement.

SCHEMA TO RETURN (strictly valid JSON):
{
  "version": "${releaseTag || nextVerCalc.version}",
  "title": "A concise, engaging, professional title in Arabic",
  "description": "A clear 2-3 sentence summary in Arabic explaining what was added or improved for users/admins.",
  "category": "feature" | "fix" | "improvement" | "announcement",
  "features": ["Itemized list of 1-4 key features or improvements in Arabic"],
  "fixes": ["Itemized list of 0-3 resolved issues or fixes in Arabic, empty array if none"]
}
`.trim();

    const userPrompt = `Branch: ${branch || 'main'}\nRelease Tag: ${releaseTag || 'N/A'}\n\nCommits to analyze:\n${commitSummaries}`;

    let aiChangelog: AIChangelogOutput;

    try {
      const { data } = await generateStructuredAIResponse<AIChangelogOutput>(systemPrompt, userPrompt, {
        temperature: 0.25,
        max_tokens: 600,
        timeoutMs: 15000,
      });
      aiChangelog = data;
    } catch (aiErr: any) {
      console.warn('[GitHub Webhook AI] AI analysis fallback:', aiErr?.message);
      const firstMsg = commits[0]?.message.split('\n')[0] || 'تحديث أداء المنصة والتحسينات';
      const cleanFirstMsg = firstMsg.replace(/^(feat|fix|style|perf|refactor|chore)(\([^)]+\))?:\s*/i, '').trim();
      const isFix = nextVerCalc.bump === 'patch';
      const isFeat = nextVerCalc.bump === 'minor';
      const isMajor = nextVerCalc.bump === 'major';

      aiChangelog = {
        version: releaseTag || nextVerCalc.version,
        title: isMajor ? 'إطلاق الإصدار الرئيسي الشامل للمنصة' : `تحديث وتحسينات ${nextVerCalc.version}`,
        description: 'تم نشر تحديث جديد للمنصة يتضمن تحسينات على الأداء والاستقرار وتجربة المستخدم.',
        category: isFeat ? 'feature' : isFix ? 'fix' : 'improvement',
        features: commits.map((c) => c.message.split('\n')[0].replace(/^(feat|fix|style|perf|refactor|chore)(\([^)]+\))?:\s*/i, '').trim()).slice(0, 3),
        fixes: isFix ? [cleanFirstMsg] : [],
      };
    }

    // Save changelog entry to Supabase
    if (dbClient) {
      const targetVersion = aiChangelog.version || releaseTag || nextVerCalc.version;

      const { data: existingRow } = await dbClient
        .from('changelogs')
        .select('id')
        .eq('version', targetVersion)
        .maybeSingle();

      let resultRecord: any = null;
      if (existingRow?.id) {
        const { data: updated, error: updateError } = await dbClient
          .from('changelogs')
          .update({
            title: aiChangelog.title || 'تحديث المنصة',
            description: aiChangelog.description || 'تم تحديث النظام.',
            category: aiChangelog.category || 'improvement',
            features: aiChangelog.features || [],
            fixes: aiChangelog.fixes || [],
            created_at: new Date().toISOString(),
          })
          .eq('id', existingRow.id)
          .select()
          .single();

        if (updateError) throw updateError;
        resultRecord = updated;
      } else {
        const { data: inserted, error: insertError } = await dbClient
          .from('changelogs')
          .insert({
            version: targetVersion,
            title: aiChangelog.title || 'تحديث المنصة',
            description: aiChangelog.description || 'تم تحديث النظام.',
            category: aiChangelog.category || 'improvement',
            features: aiChangelog.features || [],
            fixes: aiChangelog.fixes || [],
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
        resultRecord = inserted;
      }

      return NextResponse.json({
        success: true,
        message: 'Changelog generated and stored successfully via AI.',
        changelog: resultRecord,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Changelog generated via AI (DB key not configured).',
      changelog: aiChangelog,
    });
  } catch (error: any) {
    console.error('[GitHub Webhook Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
