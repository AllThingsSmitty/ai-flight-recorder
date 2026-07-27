import * as fs from "fs";
import * as vscode from "vscode";
import { deserializeSession } from "@ai-flight-recorder/core";

export class FlightEditorProvider
  implements vscode.CustomReadonlyEditorProvider
{
  static readonly viewType = "flightRecorder.flightEditor";

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      FlightEditorProvider.viewType,
      new FlightEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } },
    );
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose() {} };
  }

  async resolveCustomEditor(
    document: vscode.CustomDocument,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "out"),
      ],
    };

    const raw = fs.readFileSync(document.uri.fsPath, "utf-8");
    let session: unknown;
    try {
      session = deserializeSession(raw);
    } catch (err) {
      panel.webview.html = errorHtml(String(err));
      return;
    }

    const scriptUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "out", "webview.js"),
    );
    panel.webview.html = buildHtml(panel.webview, scriptUri, session);
  }
}

function buildHtml(
  webview: vscode.Webview,
  scriptUri: vscode.Uri,
  session: unknown,
): string {
  const nonce = genNonce();
  const csp = `default-src 'none'; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src 'unsafe-inline';`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flight Recorder</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0d0d0e; color: #e8e8ea; font-family: var(--vscode-font-family, ui-monospace, monospace); font-size: 13px; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    #header { padding: 12px 16px; border-bottom: 1px solid #27272a; flex-shrink: 0; }
    #header h1 { font-size: 14px; font-weight: 600; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #stats { display: flex; gap: 24px; }
    .stat { display: flex; flex-direction: column; gap: 2px; }
    .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #52525b; }
    .stat-value { font-size: 12px; color: #a1a1aa; }
    #events { flex: 1; overflow-y: auto; }
    .row { display: flex; align-items: center; gap: 10px; padding: 5px 16px; border-bottom: 1px solid #18181a; cursor: pointer; user-select: none; }
    .row:hover { background: #111113; }
    .row.expanded { background: #111113; border-bottom-color: transparent; }
    .chevron { font-size: 9px; color: #3f3f46; width: 12px; flex-shrink: 0; transition: transform 0.15s; }
    .row.expanded .chevron { transform: rotate(90deg); color: #71717a; }
    .time { font-size: 11px; color: #3f3f46; min-width: 58px; text-align: right; font-variant-numeric: tabular-nums; flex-shrink: 0; }
    .badge { font-size: 10px; font-weight: 600; padding: 1px 7px; border-radius: 3px; white-space: nowrap; min-width: 86px; text-align: center; flex-shrink: 0; }
    .summary { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #71717a; font-size: 12px; }
    .detail { display: none; padding: 8px 16px 10px calc(16px + 12px + 10px + 58px + 10px + 86px + 10px); border-bottom: 1px solid #18181a; background: #0a0a0b; }
    .detail.open { display: block; }
    .detail pre { font-size: 11px; line-height: 1.6; color: #a1a1aa; white-space: pre-wrap; word-break: break-all; }
    .jk { color: #34d399; }
    .js { color: #d4d4d8; }
    .jn { color: #93c5fd; }
    .jb { color: #7dd3fc; }
    .jz { color: #71717a; }
    .jp { color: #a1a1aa; }
    #empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #3f3f46; font-size: 13px; }
  </style>
</head>
<body>
  <div id="header">
    <h1 id="label">—</h1>
    <div id="stats">
      <div class="stat"><span class="stat-label">Duration</span><span class="stat-value" id="s-dur">—</span></div>
      <div class="stat"><span class="stat-label">Events</span><span class="stat-value" id="s-ev">—</span></div>
      <div class="stat"><span class="stat-label">Tokens</span><span class="stat-value" id="s-tok">—</span></div>
      <div class="stat"><span class="stat-label">Est. Cost</span><span class="stat-value" id="s-cost">—</span></div>
    </div>
  </div>
  <div id="events"></div>
  <script nonce="${nonce}">window.__SESSION__=${JSON.stringify({ session })};</script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html><html><body style="background:#0d0d0e;color:#f87171;font-family:monospace;padding:16px">
    <p style="margin-bottom:8px">Failed to load .flight file</p>
    <pre style="font-size:11px;color:#52525b">${escHtml(message)}</pre>
  </body></html>`;
}

function genNonce(): string {
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
