import * as vscode from 'vscode';
import { SettingsData, SettingsField, SettingsPanel } from './SettingsPanel';
import { ContentType, ExistingValues, getFieldsForContentType, groupFields } from './DocusaurusFrontmatterFieldGroups';
import * as path from 'path';

import { Analytics } from '../utils/analytics';

export class FrontmatterSetterPanel extends SettingsPanel {
  public static currentPanel: FrontmatterSetterPanel | undefined;
  private _frontmatterRange: vscode.Range | undefined;
  private _contentType: ContentType = 'unknown';

  public static createOrShow(extensionUri: vscode.Uri): void {
    const column = vscode.ViewColumn.Two;
    if (FrontmatterSetterPanel.currentPanel) {
      FrontmatterSetterPanel.currentPanel._panel.reveal(column);
      FrontmatterSetterPanel.currentPanel.refresh();
      return;
    }

    const panel = new FrontmatterSetterPanel(extensionUri);
    FrontmatterSetterPanel.currentPanel = panel;
    panel.refresh();
  }

  private constructor(extensionUri: vscode.Uri) {
    super(extensionUri, 'flashDocusaurus.frontmatter', 'Page Options (Frontmatter)', vscode.ViewColumn.Two);
  }

  protected getTitle(): string { return 'Page Options (Frontmatter)'; }

  // Override: grouped UI with sticky topbar
  protected getHtmlForWebview(fields: SettingsField[]): string {
    const groups = groupFields(this._contentType, fields);
    const groupHtml = Object.entries(groups)
      .map(([name, fs]) => this.generateGroupHtml(name, fs))
      .join('');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.getTitle()}</title>
  <style>
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; }
    * { box-sizing: border-box; }
    .topbar { position: sticky; top: 0; z-index: 10; background: var(--vscode-editor-background); border-bottom: 1px solid var(--vscode-widget-border); padding: 10px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-weight: 600; }
    .buttons { display: flex; gap: 8px; }
    .btn { padding: 6px 12px; border: none; border-radius: 3px; cursor: pointer; }
    .primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .primary:hover { background: var(--vscode-button-hoverBackground); }
    .secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }

    .content { padding: 12px; }
    .field-group { margin-bottom: 16px; border: 1px solid var(--vscode-widget-border); border-radius: 4px; background: var(--vscode-input-background); }
    .group-header { padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: var(--vscode-button-secondaryBackground); border-bottom: 1px solid var(--vscode-widget-border); font-weight: 600; }
    .group-toggle { font-size: 12px; }
    .group-content { padding: 12px; }
    .group-content.collapsed { display: none; }

    .property-group { border: 1px solid var(--vscode-widget-border); background: var(--vscode-editor-background); border-radius: 4px; padding: 10px; margin-bottom: 10px; }
    .property-label { font-weight: 600; margin-bottom: 4px; }
    .property-description { color: var(--vscode-descriptionForeground); font-size: 0.9em; margin-bottom: 6px; }
    .current { color: var(--vscode-descriptionForeground); font-size: 0.85em; margin-bottom: 6px; }
    .input { width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 3px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="buttons">
      <button class="btn primary" onclick="saveSettings()">Save</button>
      <button class="btn secondary" onclick="closePanel()">Close</button>
    </div>
  </div>
  <div class="content">
    ${groupHtml}
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    function toggleGroup(header) {
      const content = header.nextElementSibling;
      const toggle = header.querySelector('.group-toggle');
      const collapsed = content.classList.toggle('collapsed');
      toggle.textContent = collapsed ? '▶' : '▼';
    }
    function saveSettings() {
      const data = {};
      document.querySelectorAll('.property-group').forEach(el => {
        const name = el.getAttribute('data-field');
        const ftype = el.getAttribute('data-type');
        const input = el.querySelector('input, select');
        if (name && input) {
          const val = (input.value || '').trim();
          let t = 'text';
          if (input.type === 'number') t = 'number';
          if (input.tagName === 'SELECT') t = 'select';

          // For text fields: include even when empty (empty means delete)
          if (ftype === 'text') {
            data[name] = { value: val, type: t };
            return;
          }

          // For boolean/select: always include
          if (t === 'select') {
            data[name] = { value: val, type: t };
            return;
          }

          // For number/text non-text fields: include only when non-empty
          if (val !== '') {
            data[name] = { value: val, type: t };
          }
        }
      });
      vscode.postMessage({ command: 'save', data });
    }
    function closePanel() { vscode.postMessage({ command: 'close' }); }
  </script>
</body>
</html>`;
  }

  private generateGroupHtml(groupName: string, fields: SettingsField[]): string {
    // First group expanded by default
    const isFirst = true; // caller iterates in insertion order; we can leave all expanded initially
    const headerCollapsedClass = isFirst ? '' : 'collapsed';
    const contentCollapsedClass = isFirst ? '' : 'collapsed';
    return `
      <div class="field-group">
        <div class="group-header ${headerCollapsedClass}" onclick="toggleGroup(this)">
          <span>${groupName}</span>
          <span class="group-toggle">${contentCollapsedClass ? '▶' : '▼'}</span>
        </div>
        <div class="group-content ${contentCollapsedClass}">
          ${fields.map(f => this.generatePropertyHtml(f)).join('')}
        </div>
      </div>`;
  }

  private generatePropertyHtml(field: SettingsField): string {
    const titleAttr = field.description ? ` title="${field.description.replace(/\"/g, '&quot;')}"` : '';
    const current = field.currentValue ? `<div class=\"current\">Current: ${field.currentValue}</div>` : '';
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
    return `<div class=\"property-group\" data-field=\"${field.name}\" data-type=\"${field.type}\"${titleAttr}><div class=\"property-label\">${field.label || field.name}</div>${field.description?`<div class=\\\"property-description\\\">${field.description}</div>`:''}${current}${inputHtml}</div>`;
  }

  protected getWebviewScript(): string { return ''; }

  private detectContentType(filePath: string): ContentType {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const rel = path.relative(ws, filePath).replace(/\\/g, '/');
    if (rel.startsWith('docs/') || rel.startsWith('versioned_docs/')) return 'docs';
    if (rel.startsWith('blog/')) return 'blog';
    if (rel.startsWith('src/pages/')) return 'page';
    return 'unknown';
  }

  private getDefaultTitle(editor: vscode.TextEditor): string {
    const fileName = path.basename(editor.document.fileName).replace(/\.(md|mdx)$/i, '');
    // Title-case simple default
    return fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
  }

  public async refresh() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.updateContent([{ name: 'info', type: 'text', label: 'No editor', description: 'Open a Markdown/MDX file to edit frontmatter.' }]);
      return;
    }
    this._documentUri = editor.document.uri;
    this._contentType = this.detectContentType(editor.document.fileName);
    this.analyzeFrontmatter(editor);
    const existing = this.getExistingFrontmatterValues(editor);
    const fields = getFieldsForContentType(this._contentType, existing, this.getDefaultTitle(editor));
    this.updateContent(fields);
  }

  protected async handleSave(data: SettingsData): Promise<void> {
    if (!this._documentUri) {
      vscode.window.showWarningMessage('No target document. Please reopen Page Options.');
      return;
    }

    // Open the target document directly by URI (do not rely on active editor)
    const doc = await vscode.workspace.openTextDocument(this._documentUri);
    const fullRange = new vscode.Range(new vscode.Position(0, 0), doc.lineAt(Math.max(doc.lineCount - 1, 0)).range.end);
    const text = doc.getText(fullRange);

    const newText = this.applyFrontmatterUpdate(text, data);

    // Diff frontmatter (old vs new) to determine actually changed keys that exist in the final frontmatter
    const oldFmMatch = text.match(/^---\s*\n([\s\S]*?)\n---/);
    const newFmMatch = newText.match(/^---\s*\n([\s\S]*?)\n---/);
    const oldMap = oldFmMatch ? this.parseFrontmatterLines(oldFmMatch[1]) : {};
    const newMap = newFmMatch ? this.parseFrontmatterLines(newFmMatch[1]) : {};
    const changedKeys: string[] = [];
    for (const k of Object.keys(newMap)) {
      if (!Object.prototype.hasOwnProperty.call(oldMap, k) || newMap[k] !== oldMap[k]) {
        changedKeys.push(k);
      }
    }

    const wsEdit = new vscode.WorkspaceEdit();
    wsEdit.replace(doc.uri, fullRange, newText);
    const applied = await vscode.workspace.applyEdit(wsEdit);
    if (!applied) {
      vscode.window.showErrorMessage('Failed to apply frontmatter edits.');
      return;
    }
    // Only track keys that actually changed and are present in the resulting frontmatter
    if (changedKeys.length > 0) {
      try { changedKeys.forEach(k => Analytics.track(`set.page.option.${k}`)); } catch {}
    }

    await doc.save();
    vscode.window.showInformationMessage('Frontmatter saved.');
  }

  protected getFields(): SettingsField[] { return []; }

  private analyzeFrontmatter(editor: vscode.TextEditor) {
    const text = editor.document.getText();
    const fmStart = text.indexOf('---');
    if (fmStart !== 0) {
      this._frontmatterRange = undefined;
      return;
    }
    // Find closing ---
    const rest = text.slice(3);
    const endIdx = rest.indexOf('\n---');
    if (endIdx === -1) {
      this._frontmatterRange = undefined; // malformed
      return;
    }
    const endPos = editor.document.positionAt(endIdx + 3 + 4); // include leading and trailing markers
    const startPos = new vscode.Position(0, 0);
    this._frontmatterRange = new vscode.Range(startPos, endPos);
  }

  private getExistingFrontmatterValues(editor: vscode.TextEditor): ExistingValues {
    const values: ExistingValues = {};
    const text = editor.document.getText();
    if (!text.trim().startsWith('---')) return values;

    const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return values;
    const fm = match[1];
    // Simple key: value parser (one line entries only)
    const lines = fm.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*('?"?[^'"\s:]+'?"?)\s*:\s*(.+)$/);
      if (m) {
        const key = m[1].replace(/^['"]|['"]$/g, '');
        const val = m[2].trim();
        values[key] = val.replace(/^['"]|['"]$/g, '');
      }
    }
    return values;
  }

  private applyFrontmatterUpdate(fileText: string, data: SettingsData): string {
    const hasFrontmatter = /^---\s*\n/.test(fileText);

    // Build defaults map based on current content type and existing values
    const existingForDefaults: Record<string, string> = {};
    if (hasFrontmatter) {
      const fmMatch0 = fileText.match(/^---\s*\n([\s\S]*?)\n---/);
      if (fmMatch0) Object.assign(existingForDefaults, this.parseFrontmatterLines(fmMatch0[1]));
    }
    const defaults = this.getDefaultsMap(existingForDefaults);

    if (!hasFrontmatter) {
      // Insert new frontmatter at top. If everything is default and not previously present, skip writing block.
      const fm = this.buildFrontmatterBlock({}, data, defaults);
      if (!fm.trim()) return fileText;
      return `---\n${fm}\n---\n\n${fileText}`;
    }

    // Replace existing block
    const fmMatch = fileText.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!fmMatch) return fileText; // malformed, bail
    const existing = this.parseFrontmatterLines(fmMatch[1]);
    const updatedBlock = this.buildFrontmatterBlock(existing, data, defaults);
    return fileText.replace(/^---\s*\n([\s\S]*?)\n---/, `---\n${updatedBlock}\n---`);
  }

  private parseFrontmatterLines(block: string): Record<string, string> {
    const map: Record<string,string> = {};
    const lines = block.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*('?"?[^'"\s:]+'?"?)\s*:\s*(.+)$/);
      if (m) {
        const k = m[1].replace(/^['"]|['"]$/g, '');
        map[k] = m[2];
      }
    }
    return map;
  }

  private buildFrontmatterBlock(
    existing: Record<string, string>,
    data: SettingsData,
    defaults?: Record<string, string>
  ): string {
    // Merge: keep existing keys; new inputs overwrite
    const result: Record<string, string> = { ...existing };

    Object.entries(data).forEach(([k, v]) => {
      // Deletion: empty text means remove the key from frontmatter
      if (v.type === 'text' && v.value === '') {
        if (Object.prototype.hasOwnProperty.call(result, k)) {
          delete result[k];
        }
        return;
      }

      // If matches default and key didn't previously exist, skip writing it
      const defaultForKey = defaults ? defaults[k] : undefined;
      const isDefault = defaultForKey !== undefined && v.value === defaultForKey;
      const existedBefore = Object.prototype.hasOwnProperty.call(existing, k);
      if (isDefault && !existedBefore) {
        return; // do not write default when not present before
      }

      // boolean normalization
      if (v.type === 'select' && (v.value === 'true' || v.value === 'false')) {
        result[k] = v.value;
      } else if (v.type === 'number' && v.value !== '') {
        result[k] = v.value;
      } else {
        // quote if value contains colon
        const needsQuotes = /:/.test(v.value);
        if (needsQuotes) result[k] = `'${v.value.replace(/'/g, "''")}'`;
        else result[k] = v.value;
      }
    });

    const keys = Object.keys(result);
    keys.sort();
    const lines = keys.map(k => `${this.maybeQuoteKey(k)}: ${result[k]}`);
    return lines.join('\n');
  }


  private getDefaultsMap(existing: Record<string, string>): Record<string, string> {
    const fields = getFieldsForContentType(this._contentType, existing, this.getDefaultTitleFromUri());
    const map: Record<string, string> = {};
    for (const f of fields) {
      if (typeof f.defaultValue !== 'undefined') {
        map[f.name] = String(f.defaultValue);
      }
    }
    return map;
  }

  private getDefaultTitleFromUri(): string {
    const filePath = this._documentUri?.fsPath || '';
    const fileName = path.basename(filePath).replace(/\.(md|mdx)$/i, '');
    return fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
  }

  private maybeQuoteKey(key: string): string {
    return /[:\s]/.test(key) ? `'${key}'` : key;
  }

  // Ensure singleton reference cleared when panel is disposed
  public dispose(): void {
    FrontmatterSetterPanel.currentPanel = undefined;
    super.dispose();
  }
}

