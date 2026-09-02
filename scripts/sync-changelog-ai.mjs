import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const changelogsFilePath = path.join(rootDir, 'src', 'data', 'changelogs.json');

const DEFAULT_REPO = process.env.GITHUB_REPO || 'UpStore_Official/UpStore';

/**
 * Parses semver string into [major, minor, patch]
 */
function parseSemver(vStr) {
  if (!vStr || typeof vStr !== 'string') return { major: 0, minor: 0, patch: 0, raw: vStr || 'V0.0.0' };
  const clean = vStr.trim().replace(/^[vV]/, '');
  const match = clean.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) {
    const digits = clean.match(/\d+/g) || [];
    return {
      major: parseInt(digits[0] || '0', 10),
      minor: parseInt(digits[1] || '0', 10),
      patch: parseInt(digits[2] || '0', 10),
      raw: vStr,
    };
  }
  return {
    major: parseInt(match[1] || '0', 10),
    minor: parseInt(match[2] || '0', 10),
    patch: parseInt(match[3] || '0', 10),
    raw: vStr,
  };
}

/**
 * Compares two semver versions
 */
function compareSemver(v1Str, v2Str) {
  const v1 = parseSemver(v1Str);
  const v2 = parseSemver(v2Str);
  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  if (v1.patch !== v2.patch) return v1.patch - v2.patch;
  return 0;
}

/**
 * Sorts changelogs descending by SemVer, then by date, deduplicating by version
 */
function sortChangelogs(items) {
  if (!Array.isArray(items)) return [];
  const map = new Map();
  for (const item of items) {
    if (!item || !item.version) continue;
    const key = item.version.trim().toUpperCase();
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      const existing = map.get(key);
      const timeExisting = existing.created_at ? new Date(existing.created_at).getTime() : 0;
      const timeNew = item.created_at ? new Date(item.created_at).getTime() : 0;
      if (timeNew > timeExisting) {
        map.set(key, item);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const sDiff = compareSemver(b.version, a.version);
    if (sDiff !== 0) return sDiff;
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Checks if a commit is a bot/chore/internal commit that should NOT trigger a release note
 */
function isIgnoredCommit(message, author = '') {
  if (!message || typeof message !== 'string') return true;
  const lower = message.toLowerCase().trim();
  const authorLower = (author || '').toLowerCase();

  if (authorLower.includes('bot') || authorLower.includes('dependabot') || authorLower.includes('actions-user')) {
    return true;
  }

  if (
    lower.includes('[skip ci]') ||
    lower.includes('auto-update ai release notes') ||
    lower.includes('chore(changelog)') ||
    lower.startsWith('merge branch') ||
    lower.startsWith('merge pull request') ||
    lower.startsWith('chore:') ||
    lower.startsWith('ci:') ||
    lower.startsWith('test:')
  ) {
    return true;
  }

  return false;
}

/**
 * Calculates next version based ONLY on new unreleased commits
 */
function calculateNextVersion(currentVersion, commits = []) {
  const current = parseSemver(currentVersion || 'V2.2.0');
  const joined = commits.map((c) => c.message).join(' ').toLowerCase();

  const isMajor = /breaking change|feat!:|fix!:|major release|platform overhaul|complete redesign/i.test(joined);
  const isMinor = /feat(\([^)]+\))?:|feature|add(\([^)]+\))?:|new page|launch|gateway/i.test(joined);

  let nextMajor = current.major;
  let nextMinor = current.minor;
  let nextPatch = current.patch;

  let bumpType = 'patch';
  if (isMajor) {
    bumpType = 'major';
    nextMajor += 1;
    nextMinor = 0;
    nextPatch = 0;
  } else if (isMinor) {
    bumpType = 'minor';
    nextMinor += 1;
    nextPatch = 0;
  } else {
    bumpType = 'patch';
    nextPatch += 1;
  }

  const prefix = current.raw.startsWith('v') ? 'v' : 'V';
  return {
    version: `${prefix}${nextMajor}.${nextMinor}.${nextPatch}`,
    bump: bumpType,
  };
}

/**
 * Retrieves unreleased commits since last recorded commit SHA or recent range
 */
async function getUnreleasedCommits(sinceSha = '') {
  // 1. Try local git log since last sha if valid
  try {
    let gitCmd = 'git log -n 15 --pretty=format:"%h|%an|%ad|%s"';
    if (sinceSha && sinceSha.length >= 4) {
      try {
        // verify sha exists in history
        execSync(`git rev-parse --verify ${sinceSha}`, { cwd: rootDir, stdio: 'ignore' });
        gitCmd = `git log ${sinceSha}..HEAD --pretty=format:"%h|%an|%ad|%s"`;
      } catch {
        // sha not found, fallback to standard log
      }
    }

    const raw = execSync(gitCmd, {
      cwd: rootDir,
      encoding: 'utf-8',
    });
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((line) => {
      const [sha, author, date, ...rest] = line.split('|');
      return {
        sha: sha?.trim() || '',
        author: author?.trim() || '',
        date: date?.trim() || new Date().toISOString(),
        message: rest.join('|').trim(),
      };
    });
  } catch {
    console.warn('[AI Changelog Sync] Local git log unavailable, trying GitHub API...');
  }

  // 2. Try GitHub REST API
  try {
    const ghRes = await fetch(`https://api.github.com/repos/${DEFAULT_REPO}/commits?per_page=15`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'UpStore-AI-Changelog-Sync',
      },
    });
    if (ghRes.ok) {
      const data = await ghRes.json();
      if (Array.isArray(data)) {
        return data.map((c) => ({
          sha: c.sha?.slice(0, 7) || '',
          author: c.commit?.author?.name || 'Developer',
          date: c.commit?.author?.date || new Date().toISOString(),
          message: c.commit?.message?.split('\n')[0] || '',
        }));
      }
    }
  } catch (ghErr) {
    console.warn('[AI Changelog Sync] GitHub API fetch notice:', ghErr.message);
  }

  return [];
}

async function callAI(systemPrompt, userPrompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.POLLINATIONS_API_KEY;
  const models = ['deepseek-v4-flash'];

  // 1. Try official DeepSeek API first if API key is provided
  if (apiKey) {
    for (const model of models) {
      try {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawContent = data.choices?.[0]?.message?.content || '{}';
          const parsed = JSON.parse(rawContent.replace(/```json\n?|\n?```/g, '').trim());
          if (parsed && parsed.title && parsed.version) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn(`[AI Changelog Sync] DeepSeek ${model} attempt notice:`, err.message);
      }
    }
  }

  // 2. Fallback to open pollinations endpoint if no direct key
  for (const model of ['openai', 'openai-fast', 'deepseek', 'gpt-oss']) {
    try {
      const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawContent = data.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawContent.replace(/```json\n?|\n?```/g, '').trim());
        if (parsed && parsed.title && parsed.version) {
          return parsed;
        }
      }
    } catch {
      // Try next model
    }
  }
  return null;
}

function translateCommitMsgToArabic(msg) {
  const clean = msg.replace(/^(feat|fix|style|perf|refactor|chore)(\([^)]+\))?:\s*/i, '').trim();

  if (/parallax|3d/i.test(clean)) return 'تطوير وتحديث واجهة الـ Parallax ثلاثية الأبعاد التفاعلية';
  if (/card|store products/i.test(clean)) return 'ربط بطاقات المنتجات الحية وتحديث العرض التفاعلي';
  if (/remove.*fluff|clean/i.test(clean)) return 'تبسيط الواجهة وإزالة العناصر المزدحمة لتعزيز سرعة التصفح';
  if (/sitemap|robots|seo/i.test(clean)) return 'إصلاح وتحسين توافقية محركات البحث وخريطة الموقع SEO';
  if (/search|ai search/i.test(clean)) return 'تحديثات على محرك البحث الذكي بالذكاء الاصطناعي';
  if (/auth|google|login/i.test(clean)) return 'ترقية وتأمين تسجيل الدخول الموحد';
  if (/payment|stripe|btcpay|wallet/i.test(clean)) return 'ترقية بوابات الدفع الإلكتروني وتأمين المعاملات';
  if (/rtl|orientation/i.test(clean)) return 'تحسين وتصحيح اتجاهات الواجهة في اللغة العربية (RTL)';
  if (/mobile|responsive|gyroscope/i.test(clean)) return 'تحسين تجربة الهواتف الذكية والتجاوب ودعم مستشعرات الحركة';

  return clean.length > 5 ? clean : 'تحسينات عامة على استقرار وسرعة المنصة';
}

function computeFallbackChangelog(commits, latestVersion) {
  const nextVerObj = calculateNextVersion(latestVersion, commits);
  const isFix = nextVerObj.bump === 'patch';
  const isFeat = nextVerObj.bump === 'minor';
  const isMajor = nextVerObj.bump === 'major';

  const features = [];
  const fixes = [];

  commits.forEach((c) => {
    const arMsg = translateCommitMsgToArabic(c.message);
    if (/fix|bug|error|glitch|resolve|patch/i.test(c.message)) {
      if (!fixes.includes(arMsg)) fixes.push(arMsg);
    } else {
      if (!features.includes(arMsg)) features.push(arMsg);
    }
  });

  const primaryTopic = features[0] || fixes[0] || 'تحسينات الأداء واستقرار النظام';

  return {
    version: nextVerObj.version,
    title: isMajor
      ? 'إطلاق الإصدار الرئيسي الشامل للمنصة مع ترقيات بنيوية كبرى'
      : isFeat
      ? `إطلاق وتحديث: ${primaryTopic}`
      : `إصلاحات وتحديثات: ${primaryTopic}`,
    description: isMajor
      ? 'إصدار رئيسي جديد لمنصة UpStore يعيد هيكلة تجربة المستخدم ويضيف قدرات تفاعلية متطورة للمتجر الرقمي.'
      : `تم نشر تحديث جديد لمنصة UpStore (${nextVerObj.version}) يركز على ${primaryTopic} وتحسين تجربة التصفح.`,
    category: isMajor ? 'announcement' : isFeat ? 'feature' : isFix ? 'fix' : 'improvement',
    features: features.slice(0, 4),
    fixes: fixes.slice(0, 3),
  };
}

async function syncToSupabase(entry, supabaseUrl, supabaseKey) {
  if (!supabaseUrl || !supabaseKey) return;

  try {
    const checkRes = await fetch(
      `${supabaseUrl}/rest/v1/changelogs?version=eq.${encodeURIComponent(entry.version)}&select=id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    const dbRows = checkRes.ok ? await checkRes.json() : [];
    const payload = {
      version: entry.version,
      title: entry.title,
      description: entry.description,
      category: entry.category,
      features: entry.features || [],
      fixes: entry.fixes || [],
      created_at: entry.created_at || new Date().toISOString(),
    };

    if (Array.isArray(dbRows) && dbRows.length > 0) {
      const existingId = dbRows[0].id;
      await fetch(`${supabaseUrl}/rest/v1/changelogs?id=eq.${existingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
      console.log(`✅ Supabase changelog updated for version [${entry.version}].`);
    } else {
      await fetch(`${supabaseUrl}/rest/v1/changelogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
      console.log(`✅ Supabase changelog inserted for version [${entry.version}].`);
    }
  } catch (dbErr) {
    console.warn(`⚠️ Supabase sync error:`, dbErr.message);
  }
}

async function cleanAndSyncSupabase(allEntries, supabaseUrl, supabaseKey) {
  if (!supabaseUrl || !supabaseKey) return;
  try {
    // 1. Fetch current DB rows
    const fetchRes = await fetch(`${supabaseUrl}/rest/v1/changelogs?select=id,version`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (fetchRes.ok) {
      const dbRows = await fetchRes.json();
      const validVersions = new Set(allEntries.map((e) => e.version.trim().toUpperCase()));
      
      // Remove any DB entries that are not in valid current list
      for (const row of dbRows) {
        if (!validVersions.has(row.version.trim().toUpperCase())) {
          await fetch(`${supabaseUrl}/rest/v1/changelogs?id=eq.${row.id}`, {
            method: 'DELETE',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          });
          console.log(`🗑️ Removed stale DB changelog row: ${row.version}`);
        }
      }
    }

    // 2. Sync all valid entries
    for (const entry of allEntries) {
      await syncToSupabase(entry, supabaseUrl, supabaseKey);
    }
  } catch (err) {
    console.warn('⚠️ Supabase cleanup error:', err.message);
  }
}

async function sync() {
  console.log('🚀 Starting UpStore AI Changelog Synchronization & Semantic Versioning...');

  // 1. Read existing changelogs
  let existingLogs = [];
  try {
    if (fs.existsSync(changelogsFilePath)) {
      existingLogs = JSON.parse(fs.readFileSync(changelogsFilePath, 'utf-8'));
    }
  } catch (e) {
    console.warn('Could not read existing changelogs.json:', e);
    existingLogs = [];
  }

  // Ensure existing logs are properly sorted by SemVer and deduplicated
  existingLogs = sortChangelogs(existingLogs);

  const latestLog = existingLogs[0];
  const latestVersion = latestLog?.version || 'V2.2.0';
  const recordedSha = latestLog?.commit_sha || (latestLog?.id?.startsWith('rel-') ? latestLog.id.replace('rel-', '') : '');

  // Retrieve unreleased commits since the last release SHA
  const rawCommits = await getUnreleasedCommits(recordedSha);
  
  // Filter out bots, CI scripts, and chore commits
  const meaningfulCommits = rawCommits.filter((c) => !isIgnoredCommit(c.message, c.author));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (meaningfulCommits.length === 0) {
    console.log(`✅ No new user-facing commits since version ${latestVersion}. Skipping changelog creation.`);
    if (supabaseUrl && supabaseKey) {
      await cleanAndSyncSupabase(existingLogs, supabaseUrl, supabaseKey);
    }
    return;
  }

  const latestCommitSha = meaningfulCommits[0].sha;

  console.log(`🔍 Analyzing ${meaningfulCommits.length} new unreleased commits (Current Version: ${latestVersion})...`);

  // Calculate next version using only the new meaningful commits
  const nextVerCalculated = calculateNextVersion(latestVersion, meaningfulCommits);
  console.log(`💡 Suggested next SemVer: ${nextVerCalculated.version} (Bump Type: ${nextVerCalculated.bump.toUpperCase()})`);

  const commitSummaries = meaningfulCommits.slice(0, 8).map((c) => `- [${c.sha}]: "${c.message}" (by ${c.author})`).join('\n');

  const systemPrompt = `
You are the Lead AI Systems Architect & Release Manager for UpStore (upstore.one) - the premier digital marketplace.
Analyze the following Git commits and generate a structured, professional release changelog in Arabic.

CURRENT LATEST VERSION: "${latestVersion}"
RECOMMENDED NEXT VERSION: "${nextVerCalculated.version}" (${nextVerCalculated.bump} bump)

SEMANTIC VERSIONING 2.0.0 RULES:
- "major": For breaking changes or major full-platform overhauls.
- "minor": For substantial new features, pages, 3D animations, payment methods, or AI tools.
- "patch": For bug fixes, performance optimizations, RTL adjustments, SEO, styling, or maintenance.

CATEGORIZATION RULES:
- "feature": If introducing user-facing capabilities or new components.
- "fix": If resolving bugs, glitches, or broken logic.
- "improvement": If enhancing speed, UI styling, or code quality.
- "announcement": If a major milestone announcement.

JSON FORMAT TO RETURN (strictly valid JSON):
{
  "version": "${nextVerCalculated.version}",
  "title": "A concise, engaging title in Arabic detailing the primary feature or fix",
  "description": "A 2-3 sentence overview in Arabic explaining what was added or improved.",
  "category": "feature" | "fix" | "improvement" | "announcement",
  "features": ["1 to 4 bullet points in Arabic highlighting key improvements"],
  "fixes": ["0 to 3 bullet points in Arabic detailing resolved bugs, empty array if none"]
}
`.trim();

  const userPrompt = `Meaningful Commits:\n${commitSummaries}`;

  let aiResult = await callAI(systemPrompt, userPrompt);
  if (!aiResult) {
    console.log('⚡ Using smart heuristic fallback for changelog generation...');
    aiResult = computeFallbackChangelog(meaningfulCommits, latestVersion);
  }

  const newEntry = {
    id: `rel-${latestCommitSha || Date.now()}`,
    version: aiResult.version || nextVerCalculated.version,
    commit_sha: latestCommitSha,
    title: aiResult.title || `تحديث وتحسينات ${nextVerCalculated.version}`,
    description: aiResult.description || 'تم تحديث منصة UpStore لتحسين تجربة المستخدم وسرعة الأداء.',
    category: aiResult.category || (nextVerCalculated.bump === 'minor' ? 'feature' : nextVerCalculated.bump === 'patch' ? 'fix' : 'improvement'),
    features: Array.isArray(aiResult.features) ? aiResult.features : [],
    fixes: Array.isArray(aiResult.fixes) ? aiResult.fixes : [],
    created_at: new Date().toISOString(),
  };

  // Merge and sort all changelogs deterministically
  const updatedLogs = sortChangelogs([newEntry, ...existingLogs.filter((l) => l.version !== newEntry.version && l.id !== newEntry.id)]);

  // Write to src/data/changelogs.json
  fs.mkdirSync(path.dirname(changelogsFilePath), { recursive: true });
  fs.writeFileSync(changelogsFilePath, JSON.stringify(updatedLogs, null, 2), 'utf-8');

  console.log(`🎉 New changelog entry generated successfully: ${newEntry.version} — "${newEntry.title}"`);

  // Sync all entries to Supabase
  if (supabaseUrl && supabaseKey) {
    await cleanAndSyncSupabase(updatedLogs, supabaseUrl, supabaseKey);
  }
}

sync().catch((err) => {
  console.error('❌ Changelog sync failed:', err);
  process.exit(0); // Exit 0 to not block CI builds
});
