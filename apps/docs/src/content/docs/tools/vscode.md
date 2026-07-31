---
title: VS Code Extension
description: Open .flight files directly in VS Code.
---

The VS Code extension adds a custom editor for `.flight` files, letting you inspect recorded sessions without leaving your editor.

## Installation

The extension is not yet published to the VS Code Marketplace. Build it from source and install the `.vsix` manually:

```bash
cd apps/vscode
pnpm install
pnpm run vscode:prepublish
npx @vscode/vsce package   # produces flight-recorder-<version>.vsix
code --install-extension flight-recorder-<version>.vsix
```

Or use the **Extensions: Install from VSIX...** command in VS Code after building.

## Usage

Once installed, any `.flight` file you open in VS Code will display the custom timeline editor instead of raw JSON. The editor shows:

- Session metadata (label, duration, status)
- Chronological event list with type badges and timing
- Event detail panel on click
