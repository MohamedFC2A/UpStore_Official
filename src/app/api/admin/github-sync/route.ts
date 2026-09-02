import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAdminUser, enforceSameOriginRequest } from '@/utils/security';
import { generateStructuredAIResponse } from '@/utils/ai';
import { execSync } from 'child_process';
import { calculateNextVersion, sortChangelogs } from '@/utils/semver';

const DEFAULT_REPO = process.env.GITHUB_REPO || 'UpStore_Official/UpStore';

interface ParsedCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

interface AIChangelogOutput {
  version: string;
  title: string;
  description: string;
  category: 'feature' | 'fix' | 'improvement' | 'announcement';
  features: string[];
  fixes: string[];
}

function getLocalGitCommits(count: number = 6): ParsedCommit[] {
  try {
    const raw = execSync(`git log -n ${count} --pretty=format:"%h|%an|%ad|%s"`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });

    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [sha, author, date, ...rest] = line.split('|');
        return {
          sha: sha?.trim() || 'git',
          author: author?.trim() || 'Developer',
          date: date?.trim() || new Date().toISOString(),
          message: rest.join('|').trim(),
        };
      });
  } catch (err) {
    console.warn('[GitHub Sync] Local git log unavailable:', err);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const originError = await enforceSameOriginRequest(req);
    if (originError) return originError;

    const auth = await requireAdminUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }
    const serverSupabase = auth.supabase;

    const body = await req.json().catch(() => ({}));
    const repo = (body.repo || DEFAULT_REPO).trim();
    const customCommitCount = Number(body.commitCount) || 6;

    let parsedCommits: ParsedCommit[] = [];

    // 2. Try fetching from GitHub API
    try {
      const ghToken = process.env.GITHUB_TOKEN;
      const ghRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=${customCommitCount}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'UpStore-AI-Changelog-Sync',
          ...(ghToken ? { Authorization: `token ${ghToken}` } : {}),
        },
        next: { revalidate: 0 },
      });

      if (ghRes.ok) {
        const ghData = await ghRes.json();
        if (Array.isArray(ghData) && ghData.length > 0) {
          parsedCommits = ghData.map((c: any) => ({
            sha: c.sha?.slice(0, 7) || '',
            message: c.commit?.message?.trim() || '',
            author: c.commit?.author?.name || 'Developer',
            date: c.commit?.author?.date || '',
          }));
        }
      }
    } catch {
      // Ignore and fallback to local git
    }

    // If GitHub API didn't return, use local git log
    if (parsedCommits.length === 0) {
      parsedCommits = getLocalGitCommits(customCommitCount);
    }

    // Filter out bots, CI scripts, and chore commits
    parsedCommits = parsedCommits.filter((c) => {
      const msg = (c.message || '').toLowerCase();
      const author = (c.author || '').toLowerCase();
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

    if (parsedCommits.length === 0) {
      return NextResponse.json({ error: 'No recent user-facing commits found to analyze (only chores/bots).' }, { status: 400 });
    }

    // 3. Retrieve existing changelogs in DB to get current latest version
    const dbClient = createAdminClient();

    const { data: existingLogs } = await dbClient
      .from('changelogs')
      .select('id, version, title, created_at');

    const sortedExisting = sortChangelogs(existingLogs || []);
    const latestVersion = sortedExisting?.[0]?.version || 'V2.2.0';

    // Format commit summary for AI
    const commitSummaries = parsedCommits
      .map((c) => `- Commit [${c.sha}]: "${c.message}" (by ${c.author})`)
      .join('\n');

    const commitMessages = parsedCommits.map((c) => c.message);
    const nextVerCalc = calculateNextVersion(latestVersion, 'auto', commitMessages);

    // 4. Generate structured changelog using AI
    const systemPrompt = `
You are an expert AI Software Architect & Release Manager for UpStore (upstore.one) - the premier digital marketplace.
Analyze the following Git commit messages and create a high-impact, professional release changelog entry in Arabic.

CURRENT LATEST VERSION: "${latestVersion}"
CALCULATED NEXT VERSION: "${nextVerCalc.version}" (${nextVerCalc.bump.toUpperCase()} bump)

SEMANTIC VERSIONING 2.0.0 RULES:
- "major": For breaking changes or massive platform overhauls.
- "minor": For substantial new features, pages, 3D animations, payment methods, or AI tools.
- "patch": For bug fixes, performance optimizations, RTL adjustments, SEO, styling, or maintenance.

CATEGORIZATION RULES:
- "feature": If commits introduce new capabilities, UI modules, authentication mechanisms, or payment gateways.
- "fix": If commits resolve bugs, errors, XML/SEO glitches, or broken logic.
- "improvement": If commits enhance performance, polish UI/UX, optimize database queries, or refactor components.
- "announcement": If this is a milestone release or major announcement.

INSTRUCTIONS:
1. Output version string as "${nextVerCalc.version}".
2. Write a clear, attractive, descriptive title in Arabic.
3. Write a 2-3 sentence overview description in Arabic detailing the changes.
4. Extract 2-5 itemized feature/improvement points in Arabic.
5. Extract 0-3 itemized bug fixes in Arabic (empty array if no fixes).

Return strictly a single JSON object.
`.trim();

    const userPrompt = `Repository: ${repo}\nRecent Commits:\n${commitSummaries}`;
    let aiResult: AIChangelogOutput;

    try {
      const { data } = await generateStructuredAIResponse<AIChangelogOutput>(systemPrompt, userPrompt, {
        temperature: 0.25,
        max_tokens: 650,
        timeoutMs: 15000,
      });
      aiResult = data;
    } catch (aiErr: any) {
      console.warn('[Admin GitHub Sync AI] Fallback applied:', aiErr?.message);
      const topCommit = parsedCommits[0]?.message || 'تحديث أداء المنصة والتحسينات';
      const cleanTopCommit = topCommit.replace(/^(feat|fix|style|perf|refactor|chore)(\([^)]+\))?:\s*/i, '').trim();
      const isFix = nextVerCalc.bump === 'patch';
      const isFeat = nextVerCalc.bump === 'minor';
      const isMajor = nextVerCalc.bump === 'major';

      aiResult = {
        version: nextVerCalc.version,
        title: isMajor ? 'إطلاق الإصدار الرئيسي الجديد للمنصة' : `تحديث وتحسينات ${nextVerCalc.version}`,
        description: 'تحديث برمجي جديد يشمل تحسينات شاملة على الأداء وتجربة المستخدم واستقرار النظام.',
        category: isFeat ? 'feature' : isFix ? 'fix' : 'improvement',
        features: parsedCommits.map((c) => c.message.replace(/^(feat|fix|style|perf|refactor|chore)(\([^)]+\))?:\s*/i, '').trim()).slice(0, 4),
        fixes: isFix ? [cleanTopCommit] : [],
      };
    }

    // 5. Check if entry already exists by version
    const { data: existingEntry } = await dbClient
      .from('changelogs')
      .select('id')
      .eq('version', aiResult.version || nextVerCalc.version)
      .maybeSingle();

    let inserted: any = null;
    if (existingEntry?.id) {
      const { data: updated, error: updateError } = await dbClient
        .from('changelogs')
        .update({
          title: aiResult.title || 'تحديث برمجي جديد',
          description: aiResult.description || 'تحسينات جديدة على النظام.',
          category: aiResult.category || 'improvement',
          features: aiResult.features || [],
          fixes: aiResult.fixes || [],
          created_at: new Date().toISOString(),
        })
        .eq('id', existingEntry.id)
        .select()
        .single();

      if (updateError) throw updateError;
      inserted = updated;
    } else {
      const { data: created, error: insertError } = await dbClient
        .from('changelogs')
        .insert({
          version: aiResult.version || nextVerCalc.version,
          title: aiResult.title || 'تحديث برمجي جديد',
          description: aiResult.description || 'تحسينات جديدة على النظام.',
          category: aiResult.category || 'improvement',
          features: aiResult.features || [],
          fixes: aiResult.fixes || [],
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      inserted = created;
    }

    return NextResponse.json({
      success: true,
      message: 'تمت مزامنة التحديثات وتوليد سجل التغييرات بنجاح عبر الذكاء الاصطناعي.',
      changelog: inserted,
      analyzedCommitsCount: parsedCommits.length,
      analyzedCommits: parsedCommits,
    });
  } catch (error: any) {
    console.error('[Admin GitHub Sync Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdminUser();
    if (auth.error || !auth.user) {
      return auth.error || NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const repo = (searchParams.get('repo') || DEFAULT_REPO).trim();
    const count = Number(searchParams.get('count')) || 6;

    let commits: ParsedCommit[] = [];

    // Try GitHub API
    try {
      const ghToken = process.env.GITHUB_TOKEN;
      const ghRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=${count}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'UpStore-AI-Changelog-Sync',
          ...(ghToken ? { Authorization: `token ${ghToken}` } : {}),
        },
        next: { revalidate: 60 },
      });

      if (ghRes.ok) {
        const ghData = await ghRes.json();
        if (Array.isArray(ghData)) {
          commits = ghData.map((c: any) => ({
            sha: c.sha?.slice(0, 7) || '',
            message: c.commit?.message?.split('\n')[0] || '',
            author: c.commit?.author?.name || '',
            date: c.commit?.author?.date || '',
          }));
        }
      }
    } catch {
      // Fallback
    }

    if (commits.length === 0) {
      commits = getLocalGitCommits(count);
    }

    return NextResponse.json({
      repo,
      commits,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
