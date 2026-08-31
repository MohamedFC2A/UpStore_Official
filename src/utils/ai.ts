import { createClient } from '@/utils/supabase/server';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  apiKey?: string;
  response_format?: { type: 'json_object' | 'text' };
  timeoutMs?: number;
  thinking?: { type: 'enabled' | 'disabled' };
  reasoning_effort?: 'low' | 'high' | 'max';
}

export const DEFAULT_AI_MODEL = 'deepseek-chat';

export const DEEPSEEK_MODELS = [
  'deepseek-chat',
  'deepseek-reasoner',
  'deepseek-v4-flash',
] as const;

export const DEEPSEEK_API_ENDPOINT = 'https://api.deepseek.com/chat/completions';

/**
 * Resolves the DeepSeek API key in order of priority:
 * 1. Explicitly passed key
 * 2. Process environment variable (DEEPSEEK_API_KEY)
 * 3. Database site_settings table (key: 'deepseek_api_key' or 'pollinations_api_key')
 * 4. Fallback process environment variable (POLLINATIONS_API_KEY)
 */
export async function getDeepSeekApiKey(explicitKey?: string): Promise<string> {
  if (explicitKey && explicitKey.trim()) {
    return explicitKey.trim();
  }

  const envKey = process.env.DEEPSEEK_API_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['deepseek_api_key', 'pollinations_api_key']);

    if (data && Array.isArray(data)) {
      const deepseekSetting = data.find((s) => s.key === 'deepseek_api_key');
      if (deepseekSetting?.value && typeof deepseekSetting.value === 'string' && deepseekSetting.value.trim()) {
        return deepseekSetting.value.trim();
      }
      const legacySetting = data.find((s) => s.key === 'pollinations_api_key');
      if (legacySetting?.value && typeof legacySetting.value === 'string' && legacySetting.value.trim()) {
        return legacySetting.value.trim();
      }
    }
  } catch {
    // Database or context not available; continue
  }

  const legacyEnv = process.env.POLLINATIONS_API_KEY || process.env.NEXT_PUBLIC_POLLINATIONS_API_KEY;
  if (legacyEnv && legacyEnv.trim()) {
    return legacyEnv.trim();
  }

  return '';
}

/**
 * Resolves the selected AI Model.
 * Supports deepseek-chat, deepseek-reasoner, deepseek-v4-flash, and custom overrides.
 */
export async function getDeepSeekModel(explicitModel?: string): Promise<string> {
  if (explicitModel && explicitModel.trim()) {
    return normalizeModelName(explicitModel.trim());
  }

  const envModel = process.env.DEEPSEEK_MODEL || process.env.NEXT_PUBLIC_DEEPSEEK_MODEL;
  if (envModel && envModel.trim()) {
    return normalizeModelName(envModel.trim());
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'deepseek_model')
      .single();

    if (data?.value && typeof data.value === 'string' && data.value.trim()) {
      return normalizeModelName(data.value.trim());
    }
  } catch {}

  return DEFAULT_AI_MODEL;
}

/**
 * Normalizes model names safely
 */
function normalizeModelName(modelName?: string): string {
  if (!modelName) return DEFAULT_AI_MODEL;
  const clean = modelName.trim().toLowerCase();
  if (clean.includes('reasoner') || clean.includes('r1')) return 'deepseek-reasoner';
  if (clean.includes('v4-flash') || clean.includes('flash')) return 'deepseek-v4-flash';
  if (clean.includes('chat') || clean.includes('v3')) return 'deepseek-chat';
  return clean;
}

// Backward compatibility alias functions
export const getPollinationsApiKey = getDeepSeekApiKey;
export const getPollinationsModel = getDeepSeekModel;

// ── In-Memory Response Cache (Zero-Cost & Instant Cache Hits) ────────────────
interface AICacheEntry {
  timestamp: number;
  text: string;
  modelUsed: string;
}

const aiResponseCache = new Map<string, AICacheEntry>();
const CACHE_MAX_ENTRIES = 1000;
const CACHE_DEFAULT_TTL_MS = 20 * 60 * 1000; // 20 minutes

function getCacheKey(model: string, messages: AIMessage[], format?: string): string {
  return `${model}:${format || 'text'}:${messages.map((m) => `${m.role}:${m.content}`).join('|')}`;
}

/**
 * Executes chat completion request against DeepSeek OpenAI-compatible endpoint.
 * Optimized for DeepSeek Prompt Caching and automatic retry.
 */
/**
 * Executes chat completion request against DeepSeek OpenAI-compatible endpoint with automatic Pollinations AI fallback.
 * Optimized for DeepSeek Prompt Caching and automatic retry.
 */
export async function generateChatCompletion(
  messages: AIMessage[],
  options: AIOptions = {}
): Promise<{ text: string; modelUsed: string }> {
  const apiKey = await getDeepSeekApiKey(options.apiKey);
  const targetModel = await getDeepSeekModel(options.model);

  // Optimize message list for DeepSeek Prompt Caching and filter out empty messages
  const validMessages = messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role || 'user',
      content: m.content.trim(),
    }));

  const normalizedMessages: AIMessage[] = validMessages.length > 0
    ? validMessages
    : [{ role: 'user', content: 'Hello' }];

  // 1. High-Performance Zero-Cost In-Memory Cache Check (for deterministic tasks)
  const isCacheable = (options.temperature ?? 0.7) <= 0.35;
  const cacheKey = isCacheable
    ? getCacheKey(targetModel, normalizedMessages, options.response_format?.type)
    : null;

  if (cacheKey) {
    const cached = aiResponseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DEFAULT_TTL_MS) {
      return {
        text: cached.text,
        modelUsed: cached.modelUsed,
      };
    }
  }

  const timeoutMs = options.timeoutMs || 35000;
  const maxRetries = 1;

  // ── ATTEMPT 1: DIRECT DEEPSEEK API (If API key exists) ──
  if (apiKey) {
    const candidateModels = targetModel !== 'deepseek-chat'
      ? [targetModel, 'deepseek-chat']
      : ['deepseek-chat'];

    for (const modelToUse of candidateModels) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          };

          const requestBody: Record<string, any> = {
            model: modelToUse,
            messages: normalizedMessages,
            temperature: options.temperature ?? 0.7,
          };

          if (options.max_tokens) {
            requestBody.max_tokens = options.max_tokens;
          }

          if (options.top_p !== undefined) {
            requestBody.top_p = options.top_p;
          }

          if (options.response_format) {
            requestBody.response_format = options.response_format;
          }

          if (options.thinking) {
            requestBody.extra_body = {
              thinking: options.thinking,
            };
          }

          if (options.reasoning_effort) {
            requestBody.reasoning_effort = options.reasoning_effort;
          }

          const res = await fetch(DEEPSEEK_API_ENDPOINT, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          clearTimeout(timer);

          if (res.ok) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content;

            if (typeof content === 'string' && content.trim()) {
              const cleanText = content.trim();
              const modelUsed = data.model || targetModel;

              if (cacheKey) {
                if (aiResponseCache.size >= CACHE_MAX_ENTRIES) {
                  const oldest = aiResponseCache.keys().next().value;
                  if (oldest) aiResponseCache.delete(oldest);
                }
                aiResponseCache.set(cacheKey, {
                  timestamp: Date.now(),
                  text: cleanText,
                  modelUsed,
                });
              }

              return {
                text: cleanText,
                modelUsed,
              };
            }
          } else {
            console.warn(`[DeepSeek AI] HTTP ${res.status} returned. Checking fallbacks...`);
          }
        } catch (err: any) {
          clearTimeout(timer);
          console.warn(`[DeepSeek AI] Attempt ${attempt + 1} failed: ${err.message}`);
        }
      }
    }
  }

  // ── ATTEMPT 2: POLLINATIONS OPENAI-COMPATIBLE FALLBACK ──
  console.info('[AI Router] Engaging Pollinations AI fallback endpoint...');
  const pollinationsEndpoints = [
    'https://text.pollinations.ai/openai/chat/completions',
    'https://text.pollinations.ai/',
  ];

  for (const endpoint of pollinationsEndpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 28000);

      const polHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        polHeaders['Authorization'] = `Bearer ${apiKey}`;
      }

      if (endpoint.includes('/openai/')) {
        const polBody = {
          model: 'openai',
          messages: normalizedMessages,
          temperature: options.temperature ?? 0.7,
          jsonMode: options.response_format?.type === 'json_object',
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: polHeaders,
          body: JSON.stringify(polBody),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (typeof content === 'string' && content.trim()) {
            return {
              text: content.trim(),
              modelUsed: 'Pollinations AI (OpenAI)',
            };
          }
        }
      } else {
        // Direct text prompt fallback
        const systemPrompt = normalizedMessages.find((m) => m.role === 'system')?.content || '';
        const userPrompts = normalizedMessages.filter((m) => m.role !== 'system').map((m) => `${m.role}: ${m.content}`).join('\n\n');
        const combined = `${systemPrompt}\n\n${userPrompts}`.trim();

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: polHeaders,
          body: JSON.stringify({
            messages: [{ role: 'user', content: combined }],
            model: 'openai',
            jsonMode: options.response_format?.type === 'json_object',
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const rawText = await res.text();
          if (rawText && rawText.trim()) {
            return {
              text: rawText.trim(),
              modelUsed: 'Pollinations AI (Text)',
            };
          }
        }
      }
    } catch (polErr: any) {
      console.warn('[Pollinations AI] Fallback endpoint attempt failed:', polErr.message);
    }
  }

  throw new Error('AI Services are currently unreachable. Please verify your internet connection or check DEEPSEEK_API_KEY in Admin Settings.');
}

/**
 * Extracts and parses clean JSON from AI responses (handles ```json fences, multi-block JSON, markdown, and raw strings).
 */
export function extractJSONFromAIResponse<T = any>(text: string): T {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty AI response');
  }

  const cleaned = text.trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(cleaned) as T;
  } catch {}

  // 2. Remove markdown code blocks if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    } catch {}
  }

  // 3. Scan for balanced top-level JSON objects { ... } or arrays [ ... ]
  const findBalancedBlocks = (str: string): string[] => {
    const blocks: string[] = [];
    let depth = 0;
    let inString = false;
    let escape = false;
    let start = -1;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (inString) {
        if (escape) {
          escape = false;
        } else if (char === '\\') {
          escape = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{' || char === '[') {
        if (depth === 0) {
          start = i;
        }
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
        if (depth === 0 && start !== -1) {
          blocks.push(str.substring(start, i + 1));
          start = -1;
        }
      }
    }
    return blocks;
  };

  const blocks = findBalancedBlocks(cleaned);
  if (blocks.length > 0) {
    const parsedObjects: any[] = [];
    for (const b of blocks) {
      try {
        const obj = JSON.parse(b);
        if (obj && typeof obj === 'object') {
          parsedObjects.push(obj);
        }
      } catch {}
    }

    if (parsedObjects.length > 0) {
      if (parsedObjects.length === 1) {
        const single = parsedObjects[0];
        if (typeof single.reply === 'string' && single.reply.trim().startsWith('{')) {
          try {
            const nested = JSON.parse(single.reply);
            return { ...single, ...nested } as T;
          } catch {}
        }
        return single as T;
      }

      const merged: any = {};
      for (const obj of parsedObjects) {
        if (Array.isArray(obj)) continue;
        if (obj.reply && (!merged.reply || merged.reply.length < obj.reply.length)) {
          merged.reply = obj.reply;
        }
        if (Array.isArray(obj.actions)) {
          merged.actions = [...(merged.actions || []), ...obj.actions];
        }
        if (Array.isArray(obj.suggestedPrompts)) {
          merged.suggestedPrompts = Array.from(new Set([...(merged.suggestedPrompts || []), ...obj.suggestedPrompts]));
        }
        if (obj.plan) {
          merged.plan = obj.plan;
        }
        if (obj.requires_confirmation !== undefined) {
          merged.requires_confirmation = obj.requires_confirmation;
        }
      }

      if (merged.reply || (merged.actions && merged.actions.length > 0) || merged.plan) {
        return merged as T;
      }

      return parsedObjects[0] as T;
    }
  }

  // 4. Fallback slice between first and last curly brace
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const sliced = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(sliced) as T;
    } catch {}
  }

  throw new Error('Failed to parse AI structured response: No valid JSON block found.');
}

/**
 * Generates a strictly typed JSON object from a prompt using DeepSeek V4 Flash.
 * Automatically enforces response_format json_object and prompt caching optimization.
 */
export async function generateStructuredAIResponse<T = any>(
  systemPrompt: string,
  userPrompt: string,
  options: AIOptions = {}
): Promise<{ data: T; modelUsed: string }> {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `${systemPrompt}\n\nCRITICAL INSTRUCTION: Output your answer strictly as a valid, well-formed JSON object. Do not include markdown fences, comments, or conversational text. Output pure JSON only.`,
    },
    {
      role: 'user',
      content: `${userPrompt}\n\nFormat: Return JSON object matching the required schema.`,
    },
  ];

  const response = await generateChatCompletion(messages, {
    ...options,
    response_format: { type: 'json_object' },
    temperature: options.temperature ?? 0.2,
  });

  const parsed = extractJSONFromAIResponse<T>(response.text);
  return {
    data: parsed,
    modelUsed: response.modelUsed,
  };
}
