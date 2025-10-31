/**
 * FlashDocusaurus - Preview panel webview functionality
 */
import * as vscode from 'vscode';

export class PreviewPanel {
  public static currentPanel: PreviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _currentPort: number;

  public static createOrShow(extensionUri: vscode.Uri, port: number) {
    if (PreviewPanel.currentPanel) {
      PreviewPanel.currentPanel.updatePort(port);
      PreviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }
    PreviewPanel.currentPanel = new PreviewPanel(extensionUri, port);
  }

  private constructor(extensionUri: vscode.Uri, port: number) {
    this._currentPort = port;
    this._panel = vscode.window.createWebviewPanel(
      'flashDocusaurusPreview',
      'Docusaurus Preview',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true }
    );
    this._panel.onDidDispose(() => this.dispose());
    this.updatePort(port);
  }

  public dispose() {
    PreviewPanel.currentPanel = undefined;
    this._panel.dispose();
  }

  public updatePort(port: number) {
    this._currentPort = port;
    this._panel.webview.html = this.getHtml();
  }

  private getHtml(): string {
    const nonce = Date.now().toString();
    const url = `http://localhost:${this._currentPort}/`;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; frame-src http: https:;">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%;overflow:hidden}
    iframe{width:100%;height:100%;border:0;background:#fff}
  </style>
</head>
<body>
  <iframe src="${url}" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"></iframe>
</body>
</html>`;
  }
}
