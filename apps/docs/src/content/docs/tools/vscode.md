---
title: VS Code Extension
description: Open .flight files directly in VS Code.
---

The VS Code extension adds a custom editor for `.flight` files, letting you inspect recorded sessions without leaving your editor.

## Installation

Install from the VS Code Marketplace by searching for **AI Flight Recorder** or by running:

```bash
code --install-extension AllThingsSmitty.ai-flight-recorder
```

Alternatively, install manually from source:

```bash
cd apps/vscode
pnpm install
pnpm run vscode:prepublish
npx @vscode/vsce package   # produces ai-flight-recorder-<version>.vsix
code --install-extension ai-flight-recorder-<version>.vsix
```

Or use the **Extensions: Install from VSIX...** command in VS Code after building.

## Usage

Once installed, any `.flight` file you open in VS Code will display the custom timeline editor instead of raw JSON. The editor shows:

- Session metadata (label, duration, status)
- Chronological event list with type badges and timing
- Event detail panel on click
