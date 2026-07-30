---
title: VS Code Extension
description: Open .flight files directly in VS Code.
---

The VS Code extension adds a custom editor for `.flight` files, letting you inspect recorded sessions without leaving your editor.

## Installation

The extension is not yet published to the VS Code Marketplace. Install it manually by downloading the `.vsix` from the [GitHub releases page](https://github.com/AllThingsSmitty/ai-flight-recorder/releases) and running:

```bash
code --install-extension ai-flight-recorder-<version>.vsix
```

Or use the **Extensions: Install from VSIX...** command in VS Code.

## Usage

Once installed, any `.flight` file you open in VS Code will display the custom timeline editor instead of raw JSON. The editor shows:

- Session metadata (label, duration, status)
- Chronological event list with type badges and timing
- Event detail panel on click

## Building from source

```bash
cd apps/vscode
pnpm install
pnpm build
pnpm package   # produces ai-flight-recorder-<version>.vsix
```
