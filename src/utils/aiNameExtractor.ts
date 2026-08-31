import 'server-only';
import { generateStructuredAIResponse } from '@/utils/ai';
import { heuristicExtractFirstName } from '@/utils/nameUtils';

/**
 * AI-powered smart extractor to determine the single cleanest first name from an email address once in backend.
 */
export async function smartExtractFirstName(
  email?: string | null,
  rawName?: string | null
): Promise<string> {
  const target = (email || rawName || '').trim();
  if (!target) return 'User';

  // Instant heuristic check
  const fallbackName = heuristicExtractFirstName(rawName || email || '');

  // If already a recognized name, return fast
  if (fallbackName && fallbackName !== 'User') {
    return fallbackName;
  }

  try {
    const systemPrompt = `You are an expert name extractor. Your job is to extract the single cleanest, most natural first name (in Latin alphabet, properly capitalized, e.g. "Mohamed", "Ahmed", "Sarah", "Alex") from a user's email address or username string. Return ONLY a single JSON object adhering to this schema: {"firstName": string}.`;
    const userPrompt = `Extract first name from: "${target}". Return valid JSON only.`;

    const { data } = await generateStructuredAIResponse<{ firstName?: string }>(
      systemPrompt,
      userPrompt,
      {
        model: 'deepseek-v4-flash',
        temperature: 0.1,
        max_tokens: 40,
        timeoutMs: 2500,
      }
    );

    if (data?.firstName && typeof data.firstName === 'string' && data.firstName.trim().length >= 2) {
      const cleanAiName = data.firstName.trim().replace(/[^a-zA-Z\u0600-\u06FF]/g, '');
      if (cleanAiName.length >= 2) {
        return cleanAiName.charAt(0).toUpperCase() + cleanAiName.slice(1);
      }
    }
  } catch {
    // Fail softly to heuristic
  }

  return fallbackName;
}
