// Per-token pricing in USD. Approximate — verify against provider pricing pages.
// Values are per single token (not per 1M).
export type PricingOverrides = Record<string, { input: number; output: number }>;

const PRICING: PricingOverrides = {
  // ── OpenAI ──────────────────────────────────────────────────────────────
  "gpt-4o":                   { input: 2.50 / 1_000_000, output: 10    / 1_000_000 },
  "gpt-4o-mini":              { input: 0.15 / 1_000_000, output: 0.6   / 1_000_000 },
  "gpt-4-turbo":              { input: 10   / 1_000_000, output: 30    / 1_000_000 },
  "gpt-4":                    { input: 30   / 1_000_000, output: 60    / 1_000_000 },
  "gpt-3.5-turbo":            { input: 0.5  / 1_000_000, output: 1.5   / 1_000_000 },
  "o1":                       { input: 15   / 1_000_000, output: 60    / 1_000_000 },
  "o1-mini":                  { input: 3    / 1_000_000, output: 12    / 1_000_000 },
  // ── Anthropic ────────────────────────────────────────────────────────────
  "claude-opus-4-8":                  { input: 15   / 1_000_000, output: 75   / 1_000_000 },
  "claude-opus-4-5":                  { input: 15   / 1_000_000, output: 75   / 1_000_000 },
  "claude-sonnet-4-5":                { input: 3    / 1_000_000, output: 15   / 1_000_000 },
  "claude-haiku-4-5":                 { input: 0.8  / 1_000_000, output: 4    / 1_000_000 },
  "claude-3-5-sonnet-20241022":       { input: 3    / 1_000_000, output: 15   / 1_000_000 },
  "claude-3-5-haiku-20241022":        { input: 0.8  / 1_000_000, output: 4    / 1_000_000 },
  "claude-3-opus-20240229":           { input: 15   / 1_000_000, output: 75   / 1_000_000 },
  "claude-3-sonnet-20240229":         { input: 3    / 1_000_000, output: 15   / 1_000_000 },
  "claude-3-haiku-20240307":          { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
  // ── Google Gemini ─────────────────────────────────────────────────────────
  "gemini-2.0-flash":         { input: 0.1   / 1_000_000, output: 0.4   / 1_000_000 },
  "gemini-2.0-flash-lite":    { input: 0.075 / 1_000_000, output: 0.3   / 1_000_000 },
  "gemini-1.5-pro":           { input: 1.25  / 1_000_000, output: 5     / 1_000_000 },
  "gemini-1.5-flash":         { input: 0.075 / 1_000_000, output: 0.3   / 1_000_000 },
  "gemini-1.5-flash-8b":      { input: 0.0375/ 1_000_000, output: 0.15  / 1_000_000 },
};

/**
 * Returns estimated cost in USD, or undefined if the model is not in the
 * pricing table. Uses prefix matching so "gpt-4o-2024-11-20" maps to "gpt-4o".
 */
export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  overrides?: PricingOverrides
): number | undefined {
  const table = overrides ? { ...PRICING, ...overrides } : PRICING;
  const pricing = table[model] ?? prefixMatch(model, table);
  if (!pricing) return undefined;
  return promptTokens * pricing.input + completionTokens * pricing.output;
}

function prefixMatch(
  model: string,
  table: PricingOverrides
): { input: number; output: number } | undefined {
  // Longest key that is a prefix of `model` wins
  let best: string | undefined;
  for (const key of Object.keys(table)) {
    if (model.startsWith(key) && (!best || key.length > best.length)) best = key;
  }
  return best ? table[best] : undefined;
}
