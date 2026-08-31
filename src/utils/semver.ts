/**
 * UpStore Semantic Versioning (SemVer) & Changelog Sorting Utility
 * 
 * Implements strict SemVer 2.0.0 parsing, comparison, auto-bumping,
 * deduplication, and deterministic multi-criteria sorting for changelog entries.
 */

export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  raw: string;
}

export interface ChangelogItem {
  id?: string;
  version: string;
  title: string;
  description: string;
  category: 'feature' | 'fix' | 'improvement' | 'announcement';
  features: string[];
  fixes: string[];
  created_at: string;
}

/**
 * Extracts major, minor, patch numbers from any version string (e.g. "V2.2.0", "v3.0.0-beta", "1.0.4").
 */
export function parseSemver(versionStr: string): ParsedSemver {
  if (!versionStr || typeof versionStr !== 'string') {
    return { major: 0, minor: 0, patch: 0, raw: versionStr || 'V0.0.0' };
  }

  const clean = versionStr.trim().replace(/^[vV]/, '');
  const match = clean.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-(.+))?$/);

  if (!match) {
    // Fallback: extract any digits
    const digits = clean.match(/\d+/g);
    const major = digits && digits[0] ? parseInt(digits[0], 10) : 0;
    const minor = digits && digits[1] ? parseInt(digits[1], 10) : 0;
    const patch = digits && digits[2] ? parseInt(digits[2], 10) : 0;
    return { major, minor, patch, raw: versionStr };
  }

  return {
    major: parseInt(match[1] || '0', 10),
    minor: parseInt(match[2] || '0', 10),
    patch: parseInt(match[3] || '0', 10),
    prerelease: match[4],
    raw: versionStr,
  };
}

/**
 * Compares two semver versions.
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, and 0 if v1 === v2.
 */
export function compareSemver(v1Str: string, v2Str: string): number {
  const v1 = parseSemver(v1Str);
  const v2 = parseSemver(v2Str);

  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  if (v1.patch !== v2.patch) return v1.patch - v2.patch;

  return 0;
}

/**
 * Sorts and deduplicates an array of changelog items deterministically in descending order:
 * 1. Deduplicates entries by Version.
 * 2. Highest Semantic Version first (e.g. V3.0.0 > V2.2.0 > V2.1.1 > V2.1.0 > V2.0.0)
 * 3. If versions are identical, latest `created_at` timestamp first.
 */
export function sortChangelogs<T extends { version: string; created_at?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];

  // Deduplicate by version
  const map = new Map<string, T>();
  for (const item of items) {
    if (!item || !item.version) continue;
    const key = item.version.trim().toUpperCase();
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      // Keep the newer one if timestamps exist
      const existing = map.get(key)!;
      const timeExisting = existing.created_at ? new Date(existing.created_at).getTime() : 0;
      const timeNew = item.created_at ? new Date(item.created_at).getTime() : 0;
      if (timeNew > timeExisting) {
        map.set(key, item);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const semverDiff = compareSemver(b.version, a.version);
    if (semverDiff !== 0) return semverDiff;

    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Analyzes commit messages or explicit change level to calculate the next Semantic Version.
 * 
 * - Major (X.0.0): Breaking changes, complete platform redesign, major system rewrites.
 * - Minor (X.Y.0): New user features, pages, payment methods, AI integrations.
 * - Patch (X.Y.Z): Bug fixes, performance optimizations, styling, SEO, maintenance.
 */
export function calculateNextVersion(
  currentVersion: string,
  bumpType?: 'major' | 'minor' | 'patch' | 'auto',
  commits: string[] = []
): { version: string; bump: 'major' | 'minor' | 'patch' } {
  const current = parseSemver(currentVersion || 'V2.2.0');
  let detectedBump: 'major' | 'minor' | 'patch' = bumpType && bumpType !== 'auto' ? bumpType : 'patch';

  if (!bumpType || bumpType === 'auto') {
    const joined = commits.join(' ').toLowerCase();

    const isMajor =
      /breaking change|feat!:|fix!:|major release|platform overhaul|complete redesign|system rewrite/i.test(
        joined
      );
    const isMinor =
      /feat(\([^)]+\))?:|feature|add(\([^)]+\))?:|new page|integrate|launch|module|gateway/i.test(
        joined
      );

    if (isMajor) {
      detectedBump = 'major';
    } else if (isMinor) {
      detectedBump = 'minor';
    } else {
      detectedBump = 'patch';
    }
  }

  let nextMajor = current.major;
  let nextMinor = current.minor;
  let nextPatch = current.patch;

  if (detectedBump === 'major') {
    nextMajor += 1;
    nextMinor = 0;
    nextPatch = 0;
  } else if (detectedBump === 'minor') {
    nextMinor += 1;
    nextPatch = 0;
  } else {
    nextPatch += 1;
  }

  const prefix = current.raw.startsWith('v') ? 'v' : 'V';
  return {
    version: `${prefix}${nextMajor}.${nextMinor}.${nextPatch}`,
    bump: detectedBump,
  };
}
