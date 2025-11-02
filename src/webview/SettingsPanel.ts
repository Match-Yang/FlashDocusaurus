/**
 * FlashDocusaurus - Generic Settings panel base class
 */
import * as vscode from 'vscode';

export interface SettingsField {
  name: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'searchable';
  label?: string;
  description?: string;
  options?: string[];
  defaultValue?: string;
  currentValue?: string;
  placeholder?: string;
}

export interface SettingsData {
  [key: string]: {
    value: string;
    type: string;
  };
}

export abstract class SettingsPanel {
  protected readonly _panel: vscode.WebviewPanel;
  protected readonly _extensionUri: vscode.Uri;
  protected _disposables: vscode.Disposable[] = [];
  protected _documentUri?: vscode.Uri;

  constructor(
    extensionUri: vscode.Uri,
    panelType: string,
    title: string,
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.Two
  ) {
    this._extensionUri = extensionUri;

    this._panel = vscode.window.createWebviewPanel(
      panelType,
      title,
      { viewColumn, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true }
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      null,
      this._disposables
    );
  }

  protected handleMessage(message: any) {
    switch (message.command) {
      case 'save':
        this.handleSave(message.data);
        break;
      case 'close':
        this.dispose();
        break;
    }
  }

  protected abstract handleSave(data: SettingsData): Promise<void>;
  protected abstract getFields(): SettingsField[];
  protected abstract getTitle(): string;
  protected abstract getWebviewScript(): string;

  public dispose() {
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }

  protected updateContent(fields: SettingsField[]) {
    this._panel.webview.html = this.getHtmlForWebview(fields);
  }

  protected getHtmlForWebview(fields: SettingsField[]): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.getTitle()}</title>
  <style>
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; padding: 12px; }
    h2 { margin: 0 0 12px 0; }
    .field { border: 1px solid var(--vscode-widget-border); background: var(--vscode-input-background); border-radius: 4px; padding: 10px; margin-bottom: 10px; }
    .label { font-weight: 600; margin-bottom: 4px; }
    .desc { color: var(--vscode-descriptionForeground); font-size: 0.9em; margin-bottom: 6px; }
    .input { width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 3px; }
    .row { display: flex; gap: 8px; }
    .buttons { margin-top: 14px; display: flex; gap: 10px; }
    .btn { padding: 8px 14px; border: none; border-radius: 3px; cursor: pointer; }
    .primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .primary:hover { background: var(--vscode-button-hoverBackground); }
    .secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  </style>
</head>
<body>
  <h2>${this.getTitle()}</h2>
  <div id="fields">
    ${fields.map(f => this.generateFieldHtml(f)).join('')}
  </div>
  <div class="buttons">
    <button class="btn primary" onclick="saveSettings()">Save</button>
    <button class="btn secondary" onclick="closePanel()">Close</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    function saveSettings() {
      const data = {};
      document.querySelectorAll('.field').forEach(el => {
        const name = el.getAttribute('data-name');
        const input = el.querySelector('input, select');
        if (name && input) {
          const val = input.value.trim();
          if (val !== '') {
            let t = 'text';
            if (input.type === 'number') t = 'number';
            if (input.tagName === 'SELECT') t = 'select';
            data[name] = { value: val, type: t };
          }
        }
      });
      vscode.postMessage({ command: 'save', data });
    }
    function closePanel() { vscode.postMessage({ command: 'close' }); }
    ${this.getWebviewScript()}
  </script>
</body>
</html>`;
  }

  protected generateFieldHtml(field: SettingsField): string {
    const current = field.currentValue ? `<div class=\"desc\">Current: ${field.currentValue}</div>` : '';
    let inputHtml = '';
    if (field.type === 'select') {
      const opts = (field.options || []).map(o => `<option value=\"${o}\" ${field.currentValue === o ? 'selected' : ''}>${o}</option>`).join('');
      inputHtml = `<select class=\"input\" id=\"${field.name}\">${opts}</select>`;
    } else if (field.type === 'number') {
      const placeholder = field.placeholder ? `placeholder=\"${field.placeholder}\"` : '';
      inputHtml = `<input class=\"input\" type=\"number\" id=\"${field.name}\" value=\"${field.currentValue || field.defaultValue || ''}\" ${placeholder}/>`;
    } else if (field.type === 'boolean') {
      const val = field.currentValue ?? field.defaultValue ?? '';
      inputHtml = `<select class=\"input\" id=\"${field.name}\"><option value=\"true\" ${val==='true'?'selected':''}>true</option><option value=\"false\" ${val==='false'?'selected':''}>false</option></select>`;
    } else {
      const placeholder = field.placeholder ? `placeholder=\"${field.placeholder}\"` : '';
      inputHtml = `<input class=\"input\" type=\"text\" id=\"${field.name}\" value=\"${field.currentValue || field.defaultValue || ''}\" ${placeholder}/>`;
    }
    const titleAttr = field.description ? ` title=\"${field.description.replace(/\"/g, '&quot;')}\"` : '';
    return `<div class=\"field\" data-name=\"${field.name}\"${titleAttr}><div class=\"label\">${field.label || field.name}</div>${field.description?`<div class=\"desc\">${field.description}</div>`:''}${current}${inputHtml}</div>`;
  }
}

