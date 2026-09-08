---
"@ai-flight-recorder/sdk": minor
---

Improve span tracking and event batching during replay

- Add parentSpanId to all adapter events (Anthropic, OpenAI, Gemini) for proper OTLP span hierarchy
- Batch token event updates in replay store using requestAnimationFrame for better performance
