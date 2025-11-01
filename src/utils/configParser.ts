import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Docusaurus configuration interface
 */
export interface DocusaurusConfig {
  docs: {
    routeBasePath: string;
    versions: {
      current?: {
        path?: string;
        label?: string;
      };
    };
    lastVersion?: string;
  };
  blog: {
    routeBasePath: string;
  };
}

/**
 * Parse Docusaurus configuration file (docusaurus.config.js/ts)
 * @returns Parsed configuration or default config if not found
 */
export async function parseDocusaurusConfig(): Promise<DocusaurusConfig> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return getDefaultConfig();
  }

  // Try to find docusaurus.config.js or docusaurus.config.ts
  const configFiles = ['docusaurus.config.js', 'docusaurus.config.ts', 'docusaurus.config.mjs'];
  
  for (const configFile of configFiles) {
    const configPath = path.join(workspaceRoot, configFile);
    try {
      const configUri = vscode.Uri.file(configPath);
      const configContent = await vscode.workspace.fs.readFile(configUri);
      const content = Buffer.from(configContent).toString('utf8');
      
      return parseConfigContent(content);
    } catch (error) {
      // Config file not found or error reading, try next
      continue;
    }
  }

  // Return default config if no config file found
  return getDefaultConfig();
}

/**
 * Parse configuration content using regex
 * This is a simple parser that works for most cases
 */
function parseConfigContent(content: string): DocusaurusConfig {
  const config: DocusaurusConfig = getDefaultConfig();

  // Extract docs routeBasePath
  const docsRouteMatch = content.match(/routeBasePath:\s*['"]([^'"]+)['"]/);
  if (docsRouteMatch) {
    config.docs.routeBasePath = docsRouteMatch[1];
  }

  // Extract blog routeBasePath
  const blogRouteMatch = content.match(/blog:\s*{[^}]*routeBasePath:\s*['"]([^'"]+)['"]/);
  if (blogRouteMatch) {
    config.blog.routeBasePath = blogRouteMatch[1];
  }

  // Extract lastVersion
  const lastVersionMatch = content.match(/lastVersion:\s*['"]([^'"]+)['"]/);
  if (lastVersionMatch) {
    config.docs.lastVersion = lastVersionMatch[1];
  }

  // Extract versions config (simplified)
  const versionsMatch = content.match(/versions:\s*{([^}]+)}/s);
  if (versionsMatch) {
    const versionsBlock = versionsMatch[1];
    // Extract current version config
    const currentMatch = versionsBlock.match(/current:\s*{([^}]+)}/s);
    if (currentMatch) {
      const currentBlock = currentMatch[1];
      const pathMatch = currentBlock.match(/path:\s*['"]([^'"]+)['"]/);
      const labelMatch = currentBlock.match(/label:\s*['"]([^'"]+)['"]/);
      
      if (pathMatch || labelMatch) {
        config.docs.versions.current = {
          path: pathMatch?.[1],
          label: labelMatch?.[1]
        };
      }
    }
  }

  return config;
}

/**
 * Get default Docusaurus configuration
 */
function getDefaultConfig(): DocusaurusConfig {
  return {
    docs: {
      routeBasePath: 'docs',
      versions: {},
      lastVersion: undefined
    },
    blog: {
      routeBasePath: 'blog'
    }
  };
}

/**
 * Read versions.json file to get list of available versions
 * @returns Array of version names, first one is the latest
 */
export async function readVersionsJson(): Promise<string[]> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return [];
  }

  try {
    const versionsPath = path.join(workspaceRoot, 'versions.json');
    const versionsUri = vscode.Uri.file(versionsPath);
    const versionsContent = await vscode.workspace.fs.readFile(versionsUri);
    const content = Buffer.from(versionsContent).toString('utf8');
    
    const versions = JSON.parse(content);
    return Array.isArray(versions) ? versions : [];
  } catch (error) {
    // versions.json not found or invalid
    return [];
  }
}

