import * as vscode from "vscode";
import { FlightEditorProvider } from "./FlightEditorProvider";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(FlightEditorProvider.register(context));
}

export function deactivate(): void {}
