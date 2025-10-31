/**
 * FlashDocusaurus - Fast and powerful Docusaurus documentation development
 *
 * @author Match-Yang(OliverYeung)
 * @license MIT
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PreviewPanel } from './webview/PreviewPanel';

/**
 * Check if the workspace root contains a docusaurus.config.js or docusaurus.config.ts file
 */
function checkDocusaurusConfigExists(): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return false;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const configJsPath = path.join(rootPath, 'docusaurus.config.js');
  const configTsPath = path.join(rootPath, 'docusaurus.config.ts');

  try {
    return fs.existsSync(configJsPath) || fs.existsSync(configTsPath);
  } catch (error) {
    console.error('Error checking Docusaurus config existence:', error);
    return false;
  }
}

/**
 * Set the context key to indicate if this is a Docusaurus project
 */
async function setDocusaurusProjectContext(isDocusaurusProject: boolean): Promise<void> {
  await vscode.commands.executeCommand('setContext', 'flashDocusaurus.isDocusaurusProject', isDocusaurusProject);
}

export async function activate(context: vscode.ExtensionContext) {
  // Check if the workspace root contains a Docusaurus config file
  const isDocusaurusProject = checkDocusaurusConfigExists();

  // Set the context key to control UI visibility
  await setDocusaurusProjectContext(isDocusaurusProject);

  // Watch for Docusaurus config changes to dynamically enable/disable features
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const rootPath = workspaceFolders[0].uri.fsPath;
    const configPattern = new vscode.RelativePattern(rootPath, 'docusaurus.config.{js,ts}');
    const watcher = vscode.workspace.createFileSystemWatcher(configPattern);

    watcher.onDidCreate(async () => {
      console.log('FlashDocusaurus: config file created, enabling extension features');
      await setDocusaurusProjectContext(true);
      vscode.window.showInformationMessage('FlashDocusaurus: Docusaurus project detected, extension features enabled');
    });

    watcher.onDidDelete(async () => {
      console.log('FlashDocusaurus: config file deleted, disabling extension features');
      await setDocusaurusProjectContext(false);
      vscode.window.showWarningMessage('FlashDocusaurus: Docusaurus config not found, extension features disabled');
    });

    context.subscriptions.push(watcher);
  }

  // If not a Docusaurus project, do not activate the plugin features
  if (!isDocusaurusProject) {
    console.log('FlashDocusaurus: Docusaurus config not found in workspace root, extension features disabled');
    return;
  }

  console.log('FlashDocusaurus: Docusaurus config found, activating extension features');

  // Register preview command
  const openPreviewCommand = vscode.commands.registerCommand('flashDocusaurus.preview.open', async () => {
    // Get configured port
    const cfg = vscode.workspace.getConfiguration('flashDocusaurus');
    const configuredPort = cfg.get<number>('preview.port', 3000);

    PreviewPanel.createOrShow(context.extensionUri, configuredPort);
  });

  // Register set preview port command
  const setPreviewPortCommand = vscode.commands.registerCommand('flashDocusaurus.preview.setPort', async () => {
    const cfg = vscode.workspace.getConfiguration('flashDocusaurus');
    const currentPort = cfg.get<number>('preview.port', 3000);

    const input = await vscode.window.showInputBox({
      prompt: 'Enter the preview server port',
      value: currentPort.toString(),
      validateInput: (value) => {
        const port = parseInt(value);
        if (isNaN(port) || port < 1 || port > 65535) {
          return 'Please enter a valid port number (1-65535)';
        }
        return null;
      }
    });

    if (input) {
      const newPort = parseInt(input);
      await cfg.update('preview.port', newPort, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage(`Preview port set to ${newPort}`);

      // Update existing preview panel if open
      if (PreviewPanel.currentPanel) {
        PreviewPanel.currentPanel.updatePort(newPort);
      }
    }
  });

  context.subscriptions.push(
    openPreviewCommand,
    setPreviewPortCommand
  );
}

export function deactivate() {
  console.log('FlashDocusaurus extension is now deactivated');
}

