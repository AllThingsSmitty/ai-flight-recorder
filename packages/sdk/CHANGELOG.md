# @ai-flight-recorder/sdk

## 0.1.2

### Patch Changes

- Fix stale gpt-4o pricing ($5/$15 → $2.50/$10 per 1M tokens, updated Nov 2024) and add missing claude-opus-4-5 pricing entry. Add `PricingOverrides` support: pass custom per-model rates via `new FlightRecorder({ pricing: {...} })` and they are applied automatically across all provider adapters (OpenAI, Anthropic, Gemini).
