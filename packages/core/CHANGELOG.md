# @ai-flight-recorder/core

## 0.1.1

### Patch Changes

- Add MCP event types and interfaces (`mcp-tool-call`, `mcp-tool-result`) with full test coverage.
- Add retrieval event types (`retrieval-query`, `retrieval-result`) with metadata support and tests.
- Add agent event types (`agent-start`, `agent-end`, `agent-handoff`) with tests.

## 0.1.0

### Minor Changes

- Initial release of `@ai-flight-recorder/core`. Defines the `.flight` format: session schema, event types (`llm-start`, `llm-end`, `tool-call`, `tool-result`, `error`), and shared TypeScript interfaces used by `@ai-flight-recorder/sdk`.
