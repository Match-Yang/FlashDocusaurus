import * as vscode from 'vscode';
import * as path from 'path';
import { parseDocusaurusConfig, DocusaurusConfig } from './configParser';

/**
 * Extract slug from frontmatter in markdown/mdx content
 * @param content File content
 * @returns Slug value or null if not found
 */
export function extractSlugFromFrontmatter(content: string): string | null {
  // Match YAML frontmatter (between --- markers)
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  
  // Match slug field (supports various formats)
  // slug: /my-path
  // slug: '/my-path'
  // slug: "/my-path"
  const slugMatch = frontmatter.match(/^\s*slug:\s*['"]?([^\s'"]+)['"]?\s*$/m);
  if (slugMatch) {
    return slugMatch[1];
  }

  return null;
}

/**
 * Convert file path to Docusaurus URL path
 * @param filePath Absolute file path
 * @returns URL path for the file
 */
export async function getDocusaurusUrlPath(filePath: string): Promise<string> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return '/';
  }

  // Parse Docusaurus config
  const config = await parseDocusaurusConfig();
  const docsRouteBasePath = config.docs.routeBasePath || 'docs';
  const blogRouteBasePath = config.blog.routeBasePath || 'blog';
  const currentVersionPath = config.docs.versions?.current?.path;
  const lastVersion = config.docs.lastVersion;

  // Get relative path from workspace root
  let relativePath = path.relative(workspaceRoot, filePath).replace(/\\/g, '/');
  
  // Determine the routeBasePath based on file location
  let routeBasePath = '/';
  let isCurrentVersion = false;
  let versionName: string | null = null;
  
  if (relativePath.startsWith('docs/')) {
    routeBasePath = docsRouteBasePath === '/' ? '' : '/' + docsRouteBasePath;
    isCurrentVersion = true;
  } else if (relativePath.startsWith('blog/')) {
    routeBasePath = blogRouteBasePath === '/' ? '' : '/' + blogRouteBasePath;
  } else if (relativePath.startsWith('versioned_docs/')) {
    routeBasePath = docsRouteBasePath === '/' ? '' : '/' + docsRouteBasePath;
    // Extract version from path
    const versionMatch = relativePath.match(/^versioned_docs\/version-([^/]+)\//);
    if (versionMatch) {
      versionName = versionMatch[1];
    }
  } else if (relativePath.startsWith('src/pages/')) {
    routeBasePath = '';
  }

  // Read file content to check for custom slug in frontmatter
  const customSlug = await extractSlugFromFile(filePath);
  if (customSlug) {
    return buildUrlWithSlug(routeBasePath, customSlug);
  }

  // Remove file extension
  relativePath = relativePath.replace(/\.(md|mdx)$/i, '');

  // Handle different Docusaurus directory structures
  if (relativePath.startsWith('docs/')) {
    return buildDocsUrl(relativePath, routeBasePath, currentVersionPath, lastVersion);
  }

  if (relativePath.startsWith('blog/')) {
    return buildBlogUrl(relativePath, routeBasePath);
  }

  if (relativePath.startsWith('versioned_docs/')) {
    return buildVersionedDocsUrl(relativePath, routeBasePath, lastVersion);
  }

  if (relativePath.startsWith('src/pages/')) {
    return buildPagesUrl(relativePath);
  }

  return '/';
}

/**
 * Extract slug from file content
 */
async function extractSlugFromFile(filePath: string): Promise<string | null> {
  try {
    const fileUri = vscode.Uri.file(filePath);
    const fileContent = await vscode.workspace.fs.readFile(fileUri);
    const content = Buffer.from(fileContent).toString('utf8');
    return extractSlugFromFrontmatter(content);
  } catch (error) {
    console.error('Error reading file for frontmatter:', error);
    return null;
  }
}

/**
 * Build URL with custom slug
 */
function buildUrlWithSlug(routeBasePath: string, slug: string): string {
  // Slug is relative to routeBasePath
  // If slug is '/', it means the root of routeBasePath
  if (slug === '/') {
    return routeBasePath || '/';
  }
  // If slug starts with /, it's relative to routeBasePath
  if (slug.startsWith('/')) {
    return routeBasePath + slug;
  }
  // If slug doesn't start with /, add / and append to routeBasePath
  return routeBasePath + '/' + slug;
}

/**
 * Build URL for docs/ directory (current version)
 */
function buildDocsUrl(
  relativePath: string,
  routeBasePath: string,
  currentVersionPath: string | undefined,
  lastVersion: string | undefined
): string {
  const docPath = relativePath.substring(5); // Remove 'docs/'
  
  // Determine the path for current version
  let versionPath = '';
  if (currentVersionPath) {
    // Custom path configured for current version
    versionPath = '/' + currentVersionPath;
  } else if (lastVersion === 'current') {
    // Current version is the latest, no version prefix
    versionPath = '';
  } else {
    // Default: current version is at /next
    versionPath = '/next';
  }
  
  // Handle index files
  if (docPath === 'index' || docPath === 'README' || docPath === '') {
    return routeBasePath + versionPath || '/';
  }
  // Remove trailing /index or /README
  const cleanPath = docPath.replace(/\/(index|README)$/i, '');
  return routeBasePath + versionPath + '/' + cleanPath;
}

/**
 * Build URL for blog/ directory
 */
function buildBlogUrl(relativePath: string, routeBasePath: string): string {
  const blogPath = relativePath.substring(5); // Remove 'blog/'

  // Check if it's a folder with index.md
  if (blogPath.endsWith('/index')) {
    const folderName = blogPath.substring(0, blogPath.length - 6);
    // Extract date from folder name (format: YYYY-MM-DD-name)
    const dateMatch = folderName.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
    if (dateMatch) {
      return `${routeBasePath}/${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}/${dateMatch[4]}`;
    }
    return routeBasePath + '/' + folderName;
  }

  // Extract date from filename (format: YYYY-MM-DD-name.md)
  const dateMatch = blogPath.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
  if (dateMatch) {
    return `${routeBasePath}/${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}/${dateMatch[4]}`;
  }

  return routeBasePath + '/' + blogPath;
}

/**
 * Build URL for versioned_docs/ directory
 */
function buildVersionedDocsUrl(
  relativePath: string,
  routeBasePath: string,
  lastVersion: string | undefined
): string {
  const versionedPath = relativePath.substring(15); // Remove 'versioned_docs/'
  const versionMatch = versionedPath.match(/^version-([^/]+)\/(.*)$/);
  if (versionMatch) {
    const version = versionMatch[1];
    const docPath = versionMatch[2];
    const cleanPath = docPath.replace(/\/(index|README)$/i, '');
    
    // Check if this is the latest version
    const isLatestVersion = !lastVersion || lastVersion === version;
    const versionPrefix = isLatestVersion ? '' : '/' + version;
    
    if (cleanPath === '') {
      return routeBasePath + versionPrefix || '/';
    }
    return routeBasePath + versionPrefix + '/' + cleanPath;
  }
  
  return '/';
}

/**
 * Build URL for src/pages/ directory
 */
function buildPagesUrl(relativePath: string): string {
  const pagePath = relativePath.substring(10); // Remove 'src/pages/'
  if (pagePath === 'index' || pagePath === '') {
    return '/';
  }
  const cleanPath = pagePath.replace(/\/(index|README)$/i, '');
  return '/' + cleanPath;
}

