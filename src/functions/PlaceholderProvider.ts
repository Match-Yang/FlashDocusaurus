/**
 * FlashDocusaurus - Placeholder provider for editor decorations
 */
import * as vscode from 'vscode';

export class PlaceholderProvider {
  private decorationType: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    // Create decoration type to mimic VSCode's built-in placeholder style
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: 'Press "/" for command, or just start typing.',
        color: '#888888', // Gray text
        fontStyle: 'italic',
        margin: '0 0 0 0'
      },
      // Ensure placeholder cannot be selected
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });

    // Listen for editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
          this.updatePlaceholder(editor);
        }
      }),
      vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
          this.updatePlaceholder(editor);
        }
      }),
      vscode.window.onDidChangeTextEditorSelection(event => {
        this.updatePlaceholder(event.textEditor);
      })
    );

    // Initialize placeholder for currently active editor
    if (vscode.window.activeTextEditor) {
      this.updatePlaceholder(vscode.window.activeTextEditor);
    }
  }

  private updatePlaceholder(editor: vscode.TextEditor) {
    // Only show placeholder in markdown and mdx files
    if (editor.document.languageId !== 'markdown' && editor.document.languageId !== 'mdx') {
      editor.setDecorations(this.decorationType, []);
      return;
    }

    const position = editor.selection.active;
    const line = editor.document.lineAt(position.line);
    
    // Check if current line is empty and cursor is at end of line
    if (line.text.trim() === '' && position.character === line.text.length) {
      // Show placeholder
      const decoration: vscode.DecorationOptions = {
        range: new vscode.Range(position.line, line.text.length, position.line, line.text.length)
      };
      editor.setDecorations(this.decorationType, [decoration]);
    } else {
      // Hide placeholder
      editor.setDecorations(this.decorationType, []);
    }
  }

  dispose() {
    this.decorationType.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}

export function createPlaceholderProvider(): vscode.Disposable {
  const provider = new PlaceholderProvider();
  return {
    dispose: () => provider.dispose()
  };
}

