# Contribution Guidelines

Please note that this project is released with a Contributor Code of Conduct. By participating in this project, you agree to abide by its terms.

## Contents

- [Getting Started](#getting-started)
- [Ways to Contribute](#ways-to-contribute)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Updating Your Pull Request](#updating-your-pull-request)

## Getting Started

This project uses [pnpm](https://pnpm.io/) workspaces and [Turborepo](https://turbo.build/). Node 22 is required.

```bash
pnpm install
pnpm build
pnpm test        # unit tests (vitest)
pnpm smoke       # end-to-end smoke test
```

The monorepo is organized as follows:

- `packages/core` — pure domain logic (events, Session, Recorder, ReplayEngine, serialization)
- `packages/sdk` — FlightRecorder wrapper, provider adapters, plugins, transports
- `apps/devtools` — Next.js 15 DevTools UI
- `apps/vscode` — VS Code extension for `.flight` files
- `examples/` — reference implementations (nextjs-chat, node-anthropic, node-gemini)

## Ways to Contribute

### Bug Fixes

Search open and closed issues before submitting a bug report or fix to avoid duplicates. Include a minimal reproduction when reporting a bug.

### New Provider Adapters

Adapters live in `packages/sdk/src/adapters/`. When adding support for a new AI provider:

- Use `import type` only — no hard runtime dependency on the provider SDK.
- Handle both streaming and non-streaming responses.
- Record `prompt`, `token`, `tool-call`, `tool-result`, and `completion` events as appropriate.
- Add pricing entries to the pricing table in `packages/sdk/src/adapters/pricing.ts`.
- Cover the adapter in `scripts/smoke.ts`.

### New Event Types

New event types are defined in `packages/core/src/events.ts`. When proposing a new event:

- Explain the use case (e.g., MCP, RAG, agent actions).
- Extend `BaseEvent` and add the type to the `AIEvent` union.
- Update serialization and the `ReplayEngine` as needed.
- Open an issue first for discussion before implementing substantial changes.

### New Examples

Examples live in `examples/`. A good example:

- Demonstrates a real-world integration pattern.
- Is self-contained with its own `package.json`.
- Includes a brief `README.md` explaining what it shows and how to run it.
- Uses the public SDK API — no reaching into package internals.

### DevTools UI

The DevTools app is in `apps/devtools/`. It uses Next.js 15, React 19, Tailwind CSS v3, and Zustand 5. Contributions should maintain the existing dark theme and three-tab layout (Timeline, Waterfall, Cost).

## Pull Request Guidelines

- Search open and closed PRs to avoid duplicate submissions.
- Keep changes focused — one feature or fix per PR.
- Run `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm smoke` before submitting.
- Add a changeset (`pnpm changeset`) if your PR changes `packages/core` or `packages/sdk`.
- The PR title should be clear and descriptive.
- Check your spelling and grammar.
- Make sure your editor is configured to remove trailing whitespace.

## Updating Your Pull Request

Sometimes a maintainer will ask you to update your pull request before it can be merged. This is usually due to missing tests, lint errors, scope creep, or because the contribution does not follow the guidelines above.

If you're asked to make changes, simply update your branch and push the new commits to the same pull request.

Thank you for your contribution!
