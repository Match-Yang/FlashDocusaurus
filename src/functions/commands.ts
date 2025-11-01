import * as vscode from 'vscode';
import { PreviewPanel } from '../webview/PreviewPanel';
import { getDocusaurusUrlPath } from '../utils/urlMapper';

/**
 * Register all extension commands
 */
export function registerCommands(context: vscode.ExtensionContext): void {
  // Command: Open Preview
  const openPreviewCommand = vscode.commands.registerCommand(
    'flashDocusaurus.preview.open',
    async () => {
      await handleOpenPreview(context);
    }
  );

  // Command: Set Preview Port
  const setPortCommand = vscode.commands.registerCommand(
    'flashDocusaurus.preview.setPort',
    async () => {
      await handleSetPort();
    }
  );

  context.subscriptions.push(openPreviewCommand, setPortCommand);
}

/**
 * Setup editor change listener to update preview when switching files
 */
export function setupEditorChangeListener(context: vscode.ExtensionContext): void {
  const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (!editor || !PreviewPanel.currentPanel) {
      return;
    }

    const document = editor.document;
    const fileName = document.fileName;

    // Only handle .md and .mdx files
    if (!fileName.endsWith('.md') && !fileName.endsWith('.mdx')) {
      return;
    }

    // If the active editor is in the preview panel's view column, move focus to the first text editor
    await ensureEditorFocusForPreview(editor);

    // Get configured port
    const config = vscode.workspace.getConfiguration('flashDocusaurus.preview');
    const configuredPort = config.get<number>('port', 3000);

    // Calculate URL path for the file
    const urlPath = await getDocusaurusUrlPath(fileName);

    // Update preview panel
    PreviewPanel.currentPanel.updateUrl(configuredPort, urlPath);
  });

  context.subscriptions.push(editorChangeListener);
}

/**
 * Ensure that when preview panel is open, new files open in the left editor group
 */
async function ensureEditorFocusForPreview(editor: vscode.TextEditor): Promise<void> {
  if (!PreviewPanel.currentPanel) {
    return;
  }

  // Get all visible text editors
  const visibleEditors = vscode.window.visibleTextEditors;

  // Find the preview panel's view column
  const previewColumn = PreviewPanel.currentPanel.getViewColumn();

  // If the current editor is in the same column as the preview panel
  if (editor.viewColumn === previewColumn) {
    const document = editor.document;

    // Find the first text editor that is not in the preview column
    const targetEditor = visibleEditors.find(e =>
      e.viewColumn !== previewColumn &&
      e.viewColumn !== undefined
    );

    // Determine target column
    const targetColumn = targetEditor ? targetEditor.viewColumn : vscode.ViewColumn.One;

    // Close the tab in the preview column first
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

    // Wait a bit for the close operation to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Open the document in the correct column
    await vscode.window.showTextDocument(document, {
      viewColumn: targetColumn,
      preserveFocus: false,
      preview: false
    });
  }
}

/**
 * Handle open preview command
 */
async function handleOpenPreview(context: vscode.ExtensionContext): Promise<void> {
  // Get configured port
  const config = vscode.workspace.getConfiguration('flashDocusaurus.preview');
  const configuredPort = config.get<number>('port', 3000);

  // Get current active editor
  const editor = vscode.window.activeTextEditor;
  let urlPath = '/';

  if (editor) {
    const fileName = editor.document.fileName;
    // Only calculate URL path for .md and .mdx files
    if (fileName.endsWith('.md') || fileName.endsWith('.mdx')) {
      urlPath = await getDocusaurusUrlPath(fileName);
    }
  }

  // Create or show preview panel
  PreviewPanel.createOrShow(context.extensionUri, configuredPort, urlPath);
}

/**
 * Handle set port command
 */
async function handleSetPort(): Promise<void> {
  // Get current port
  const config = vscode.workspace.getConfiguration('flashDocusaurus.preview');
  const currentPort = config.get<number>('port', 3000);

  // Show input box
  const input = await vscode.window.showInputBox({
    prompt: 'Enter preview server port',
    value: currentPort.toString(),
    validateInput: (value) => {
      const port = parseInt(value);
      if (isNaN(port) || port < 1 || port > 65535) {
        return 'Please enter a valid port number (1-65535)';
      }
      return null;
    }
  });

  if (!input) {
    return; // User cancelled
  }

  const newPort = parseInt(input);

  // Save to workspace configuration
  await config.update('port', newPort, vscode.ConfigurationTarget.Workspace);

  // Update preview panel if it's open
  if (PreviewPanel.currentPanel) {
    PreviewPanel.currentPanel.updatePort(newPort);
  }

  vscode.window.showInformationMessage(`Preview port set to ${newPort}`);
}

