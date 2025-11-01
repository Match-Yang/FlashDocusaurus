/**
 * FlashDocusaurus - Import Manager
 * Manages MDX imports in Docusaurus documents
 */
import * as vscode from 'vscode';

export interface ImportInfo {
  source: string;
  // Named imports, e.g. import { A, B } from '...'
  imports?: string[];
  // Default import identifier, e.g. import Default from '...'
  default?: string;
}

export class ImportManager {
  /**
   * Check if a specific import exists in the document
   */
  static hasImport(document: vscode.TextDocument, importName: string, source: string): boolean {
    const text = document.getText();
    const lines = text.split('\n');

    for (const line of lines) {
      // Stop checking after frontmatter and initial imports
      if (line.trim() && !line.startsWith('---') && !line.startsWith('import') && !line.startsWith('//')) {
        break;
      }

      // Check for the import
      if (line.includes('import') && line.includes(source)) {
        // Check if the specific import name is in this line
        if (line.includes(importName)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get all existing imports from a source
   */
  static getExistingImports(document: vscode.TextDocument, source: string): string[] {
    const text = document.getText();
    const lines = text.split('\n');
    const imports: string[] = [];

    for (const line of lines) {
      if (line.trim() && !line.startsWith('---') && !line.startsWith('import') && !line.startsWith('//')) {
        break;
      }

      // Use regex to match import statement more precisely
      const escapedSource = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const importRegex = new RegExp(`import\\s+\\{([^}]+)\\}\\s+from\\s+['"]${escapedSource}['"]`);
      const match = line.match(importRegex);
      if (match) {
        const importList = match[1].split(',').map(i => i.trim());
        imports.push(...importList);
      } else {
        // Check for default import
        const defaultRegex = new RegExp(`import\\s+(\\w+)\\s+from\\s+['"]${escapedSource}['"]`);
        const defaultMatch = line.match(defaultRegex);
        if (defaultMatch) {
          imports.push(defaultMatch[1]);
        }
      }
    }

    return imports;
  }

  /**
   * Find the line number of an existing import from a source
   */
  static findImportLine(document: vscode.TextDocument, source: string): number {
    const text = document.getText();
    const lines = text.split('\n');

    const escapedSource = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const importRegex = new RegExp(`import\\s+.*from\\s+['"]${escapedSource}['"]`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() && !line.startsWith('---') && !line.startsWith('import') && !line.startsWith('//')) {
        break;
      }

      if (importRegex.test(line)) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Add imports to the document
   */
  static async addImports(
    document: vscode.TextDocument,
    importsToAdd: ImportInfo[]
  ): Promise<vscode.TextEdit[]> {
    const edits: vscode.TextEdit[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // Find the position to insert imports (after frontmatter, before content)
    let insertLine = 0;
    let inFrontmatter = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for frontmatter
      if (line === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
        } else {
          inFrontmatter = false;
          insertLine = i + 1;
        }
        continue;
      }

      // Skip existing imports and comments
      if (!inFrontmatter && line && !line.startsWith('import') && !line.startsWith('//')) {
        break;
      }

      if (!inFrontmatter && (line.startsWith('import') || line.startsWith('//'))) {
        insertLine = i + 1;
      }
    }

    // Process each import source
    for (const importInfo of importsToAdd) {
      const existing = this.getExistingImports(document, importInfo.source);
      const newImports = (importInfo.imports || []).filter(imp => !existing.includes(imp));

      // Collect all existing import lines for this source (to coalesce duplicates)
      const textAll = document.getText();
      const linesAll = textAll.split('\n');
      const escapedSource = importInfo.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const importRegex = new RegExp(`^\\s*import\\s+\\{([^}]+)\\}\\s+from\\s+['"]${escapedSource}['"];?\\s*$`);
      const existingLines: { index: number; names: string[] }[] = [];
      for (let i = 0; i < linesAll.length; i++) {
        const m = linesAll[i].match(importRegex);
        if (m) {
          const names = m[1].split(',').map(s => s.trim()).filter(Boolean);
          existingLines.push({ index: i, names });
        }
      }

      // Handle default import style if requested (e.g., import Tabs from '@theme/Tabs')
      if (importInfo.default) {
        const defaultOnlyRegex = new RegExp(`^\\s*import\\s+([A-Za-z_$][\\w$]*)\\s+from\\s+['\"]${escapedSource}['\"];?\\s*$`);
        const mixedRegex = new RegExp(`^\\s*import\\s+([A-Za-z_$][\\w$]*)\\s*,\\s*\\{([^}]+)\\}\\s*from\\s*['\"]${escapedSource}['\"];?\\s*$`);

        const defaultOrMixedIdx: number[] = [];
        for (let i = 0; i < linesAll.length; i++) {
          const line = linesAll[i];
          if (defaultOnlyRegex.test(line) || mixedRegex.test(line)) {
            defaultOrMixedIdx.push(i);
          }
        }

        if (defaultOrMixedIdx.length > 0) {
          // Keep first, delete other duplicate default/mixed lines for this source
          for (let j = defaultOrMixedIdx.length - 1; j >= 1; j--) {
            edits.push(vscode.TextEdit.delete(document.lineAt(defaultOrMixedIdx[j]).rangeIncludingLineBreak));
          }
        } else if (existingLines.length > 0) {
          // Replace first named-only import with default-only import line
          const first = existingLines[0].index;
          const newLineText = `import ${importInfo.default} from '${importInfo.source}';`;
          edits.push(vscode.TextEdit.replace(document.lineAt(first).range, newLineText));
          for (let k = 1; k < existingLines.length; k++) {
            edits.push(vscode.TextEdit.delete(document.lineAt(existingLines[k].index).rangeIncludingLineBreak));
          }
        } else {
          // Insert new default-only import line
          const insertPosition = new vscode.Position(insertLine, 0);
          edits.push(vscode.TextEdit.insert(insertPosition, `import ${importInfo.default} from '${importInfo.source}';\n`));
        }
      }


      if (existingLines.length > 0) {
        // Merge all existing names with new ones and dedupe
        const nameSet = new Set<string>();
        existingLines.forEach(l => l.names.forEach(n => nameSet.add(n)));
        newImports.forEach(n => nameSet.add(n));
        const merged = Array.from(nameSet);
        const newLineText = `import {${merged.join(', ')}} from '${importInfo.source}';`;

        // Replace first occurrence, delete the rest
        const first = existingLines[0].index;
        edits.push(vscode.TextEdit.replace(document.lineAt(first).range, newLineText));
        for (let k = 1; k < existingLines.length; k++) {
          edits.push(vscode.TextEdit.delete(document.lineAt(existingLines[k].index).rangeIncludingLineBreak));
        }
      } else if (newImports.length > 0) {
        // Create new import statement
        const importList = newImports.join(', ');
        const importStatement = `import {${importList}} from '${importInfo.source}';\n`;
        const insertPosition = new vscode.Position(insertLine, 0);
        edits.push(vscode.TextEdit.insert(insertPosition, importStatement));
      }
    }

    return edits;
  }

  /**
   * Ensure imports exist and add them if necessary
   */
  static async ensureImports(
    document: vscode.TextDocument,
    editor: vscode.TextEditor,
    importsToAdd: ImportInfo[]
  ): Promise<void> {
    const edits = await this.addImports(document, importsToAdd);

    if (edits.length > 0) {
      const workspaceEdit = new vscode.WorkspaceEdit();
      workspaceEdit.set(document.uri, edits);
      await vscode.workspace.applyEdit(workspaceEdit);
    }
  }
}

