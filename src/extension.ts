/**
 * FlashDocusaurus - Fast and powerful Docusaurus documentation development
 *
 * @author Match-Yang(OliverYeung)
 * @license MIT
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { registerCommands, setupEditorChangeListener } from './functions/commands';
import { createCompletionProviders } from './functions/Completion';
import { createPlaceholderProvider } from './functions/PlaceholderProvider';

/**
 * Check if the workspace root contains a docusaurus.config.js or docusaurus.config.ts file
 */
function checkDocusaurusConfigExists(): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return false;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const configFiles = [
    'docusaurus.config.js',
    'docusaurus.config.ts',
    'docusaurus.config.mjs'
  ];

  try {
    return configFiles.some(file => fs.existsSync(path.join(rootPath, file)));
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

  // Register all commands
  registerCommands(context);

  // Setup editor change listener
  setupEditorChangeListener(context);

  // Register completion providers
  const completionProviders = createCompletionProviders();
  completionProviders.forEach(provider => context.subscriptions.push(provider));

  // Register placeholder provider
  context.subscriptions.push(createPlaceholderProvider());
}

export function deactivate() {
  console.log('FlashDocusaurus extension is now deactivated');
}

