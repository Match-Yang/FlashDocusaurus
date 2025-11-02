import * as vscode from 'vscode';
import { FrontmatterSetterPanel } from '../webview/FrontmatterSetterPanel';

export function registerFrontmatterCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('flashDocusaurus.basic.frontmatter', async (...args: any[]) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || (!editor.document.fileName.endsWith('.md') && !editor.document.fileName.endsWith('.mdx'))) {
      vscode.window.showWarningMessage('Open a Markdown/MDX file to edit Docusaurus frontmatter.');
      return;
    }

    // If invoked from slash command, remove the triggering '/'
    try {
      let caret = editor.selection.active;
      const lineText = editor.document.lineAt(caret.line).text;
      let deleteRange: vscode.Range | null = null;
      if (caret.character > 0 && lineText[caret.character - 1] === '/') {
        deleteRange = new vscode.Range(caret.line, caret.character - 1, caret.line, caret.character);
        caret = new vscode.Position(caret.line, caret.character - 1);
      } else if (caret.character < lineText.length && lineText[caret.character] === '/') {
        deleteRange = new vscode.Range(caret.line, caret.character, caret.line, caret.character + 1);
      }
      if (deleteRange) {
        await editor.edit(b => b.delete(deleteRange));
      }
    } catch (e) {
      // ignore deletion failure
    }

    FrontmatterSetterPanel.createOrShow(context.extensionUri);
  });

  context.subscriptions.push(disposable);
}

