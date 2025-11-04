/**
 * FlashDocusaurus - Completion providers for slash commands and components
 */
import * as vscode from 'vscode';
import { ImportManager, ImportInfo } from '../utils/ImportManager';
import { getStyleForLanguage as getStyleForLanguageUtil } from '../utils/CommentStyles';
import { Analytics } from '../utils/analytics';


function labelToFeature(label: string): string {
  const norm = label.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return `slash.${norm}`;
}




// Comment styles for different languages (used for QuickPick fallback)
const COMMENT_STYLES = {
  'c-style': { label: 'C-style (//)', value: '//' },
  'bash-style': { label: 'Hash (#)', value: '#' },
  'dash-style': { label: 'Dash (--)', value: '--' },
  'percent-style': { label: 'Percent (%)', value: '%' },
  'semicolon-style': { label: 'Semicolon (;)', value: ';' },
  'apostrophe-style': { label: "Apostrophe (')", value: "'" },
  'bang-style': { label: 'Bang (!)', value: '!' },
  'html-style': { label: 'HTML (<!-- -->)', value: '<!-- -->' },
  'ocaml-style': { label: 'OCaml (* ... *)', value: '(* *)' },
  'pascal-style': { label: 'Pascal { ... }', value: '{ }' },
  'jsx-style': { label: 'JSX ({/* */})', value: '{/* */}' }
};

// Language to comment style mapping
const LANGUAGE_COMMENT_MAP: { [key: string]: string } = {
  // C-style languages
  'javascript': 'c-style', 'typescript': 'c-style', 'java': 'c-style', 'c': 'c-style',
  'cpp': 'c-style', 'csharp': 'c-style', 'go': 'c-style', 'rust': 'c-style',
  'swift': 'c-style', 'kotlin': 'c-style', 'php': 'c-style', 'scala': 'c-style',
  'objective-c': 'c-style', 'objc': 'c-style', 'groovy': 'c-style',
  'css': 'c-style', 'scss': 'c-style', 'sass': 'c-style', 'less': 'c-style',

  // JSX in MDX (outside code blocks it would be jsx-style, but in fenced blocks we coerce to c-style)
  'jsx': 'jsx-style', 'tsx': 'jsx-style',

  // Hash-style languages
  'python': 'bash-style', 'ruby': 'bash-style', 'shell': 'bash-style', 'bash': 'bash-style',
  'yaml': 'bash-style', 'yml': 'bash-style', 'perl': 'bash-style', 'r': 'bash-style',
  'powershell': 'bash-style', 'ps1': 'bash-style', 'dockerfile': 'bash-style', 'graphql': 'bash-style',
  'ini': 'bash-style', 'toml': 'bash-style',

  // HTML-like
  'html': 'html-style', 'xml': 'html-style', 'markdown': 'html-style', 'md': 'html-style'
};


// Determine if the cursor is inside a fenced code block and return its language (from ```lang)
function getFencedCodeContext(
  document: vscode.TextDocument,
  position: vscode.Position
): { inside: boolean; language?: string } {
  let inside = false;
  let language: string | undefined = undefined;
  let fenceTicks = 0;

  for (let i = 0; i <= position.line; i++) {
    const text = document.lineAt(i).text;
    const m = text.match(/^\s*(```+)([^`]*)$/);
    if (m) {
      const ticks = m[1].length;
      const info = (m[2] || '').trim();
      if (!inside) {
        inside = true;
        fenceTicks = ticks;
        const token = (info.split(/\s+/)[0] || '').toLowerCase();
        language = token || undefined;
      } else {
        // Closing fence: same or more backticks and no info string
        if (ticks >= fenceTicks && info === '') {
          inside = false;
          fenceTicks = 0;
          language = undefined;
        }
      }
    }
  }

  return { inside, language };
}

// CompletionItemProvider for slash commands
class SlashCommandCompletionItemProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[]> {
    const line = document.lineAt(position.line);
    const prefix = line.text.substring(0, position.character);

    // Only trigger slash commands at line start or after whitespace
    if (!prefix.trim().endsWith('/')) {
      return [];
    }

    // Check if inside parentheses or quotes
    const fullLineText = line.text;
    let inParentheses = false;
    let inDoubleQuotes = false;
    let inSingleQuotes = false;

    for (let i = 0; i < position.character; i++) {
      const char = fullLineText[i];
      const prevChar = i > 0 ? fullLineText[i - 1] : '';

      if (char === '(' && prevChar !== '\\') {
        inParentheses = true;
      } else if (char === ')' && prevChar !== '\\') {
        inParentheses = false;
      }

      if (char === '"' && prevChar !== '\\') {
        inDoubleQuotes = !inDoubleQuotes;
      }

      if (char === "'" && prevChar !== '\\') {
        inSingleQuotes = !inSingleQuotes;
      }
    }

    if (inParentheses || inDoubleQuotes || inSingleQuotes) {
      return [];
    }

    const completionItems: vscode.CompletionItem[] = [];

    // Docusaurus Components
    let componentCommands = [
      {
        label: '✨ Write with AI',
        detail: 'Let AI help you write (coming soon)',
        description: 'Generate content with AI',
        command: 'flashDocusaurus.writeWithAI'
      },
      {
        label: '⚙️ Set Page Options',
        detail: 'Edit frontmatter visually',
        description: 'Open Page Options editor for docs/blog/pages',
        command: 'flashDocusaurus.basic.frontmatter'
      },

      {
        label: '🧩 Tabs',
        detail: 'Insert tabs component',
        description: 'Toggle content using tabs',
        insertText: this.createTabsSnippet(),
        kind: vscode.CompletionItemKind.Snippet,
        needsImport: true,
        imports: [
          { source: '@theme/Tabs', default: 'Tabs' },
          { source: '@theme/TabItem', default: 'TabItem' }
        ]
      },
      {
        label: '🧩 TabItem',
        detail: 'Insert tab item',
        description: 'Single tab item (use inside Tabs)',
        insertText: '<TabItem value="${1:tab}" label="${2:Tab Label}"${3: default}>\n  ${4:Content}\n</TabItem>',
        kind: vscode.CompletionItemKind.Snippet,
        needsImport: true,
        imports: [
          { source: '@theme/TabItem', default: 'TabItem' }
        ]
      },
      {
        label: '📝 Admonition - Note',
        detail: 'Insert note admonition',
        description: 'Add a note callout',
        command: 'flashDocusaurus.insertAdmonition',
        admonitionType: 'note'
      },
      {
        label: '📝 Admonition - Tip',
        detail: 'Insert tip admonition',
        description: 'Add a tip callout',
        command: 'flashDocusaurus.insertAdmonition',
        admonitionType: 'tip'
      },
      {
        label: '📝 Admonition - Info',
        detail: 'Insert info admonition',
        description: 'Add an info callout',
        command: 'flashDocusaurus.insertAdmonition',
        admonitionType: 'info'
      },
      {
        label: '📝 Admonition - Warning',
        detail: 'Insert warning admonition',
        description: 'Add a warning callout',
        command: 'flashDocusaurus.insertAdmonition',
        admonitionType: 'warning'
      },
      {
        label: '📝 Admonition - Danger',
        detail: 'Insert danger admonition',
        description: 'Add a danger callout',
        command: 'flashDocusaurus.insertAdmonition',
        admonitionType: 'danger'
      },
      {
        label: '📑 TOC Inline',
        detail: 'Insert inline table of contents',
        description: 'Display inline TOC',
        insertText: '<TOCInline toc={toc} minHeadingLevel={${1:2}} maxHeadingLevel={${2:3}} />',
        kind: vscode.CompletionItemKind.Snippet,
        needsImport: true,
        imports: [{ source: '@theme/TOCInline', default: 'TOCInline' }]
      },
      {
        label: '📊 Mermaid - Flowchart',
        detail: 'Insert Mermaid flowchart',
        description: 'Create flowchart diagram',
        insertText: this.createMermaidSnippet('flowchart'),
        kind: vscode.CompletionItemKind.Snippet
      },
      {

        label: '📊 Mermaid - Sequence',
        detail: 'Insert Mermaid sequence diagram',
        description: 'Create sequence diagram',
        insertText: this.createMermaidSnippet('sequence'),
        kind: vscode.CompletionItemKind.Snippet
      },
      {
        label: '📊 Mermaid - Class',
        detail: 'Insert Mermaid class diagram',
        description: 'Create class diagram',
        insertText: this.createMermaidSnippet('class'),
        kind: vscode.CompletionItemKind.Snippet
      },
      {
        label: '📊 Mermaid - State',
        detail: 'Insert Mermaid state diagram',
        description: 'Create state diagram',
        insertText: this.createMermaidSnippet('state'),
        kind: vscode.CompletionItemKind.Snippet
      },
      {
        label: '📊 Mermaid - ER Diagram',
        detail: 'Insert Mermaid ER diagram',
        description: 'Create entity relationship diagram',
        insertText: this.createMermaidSnippet('er'),
        kind: vscode.CompletionItemKind.Snippet
      },
      {
        label: '💡 Code Highlight',
        detail: 'Highlight code lines',
        description: 'Add line highlighting to code',
        command: 'flashDocusaurus.insertCodeHighlight',
        insertText: ''
      }
    ];

    componentCommands; // retain for backward compatibility


	    // Categorized commands
	    const aiCommands = [
	      {
	        label: '✨ Write with AI',
	        detail: 'Let AI help you write (coming soon)',
	        description: 'Generate content with AI',
	        command: 'flashDocusaurus.writeWithAI'
	      }
	    ];

	    const basicCommands = [
	      {
	        label: '⚙️ Set Page Options',
	        detail: 'Edit frontmatter visually',
	        description: 'Open Page Options editor for docs/blog/pages',
	        command: 'flashDocusaurus.basic.frontmatter'
	      }
,
		      {
		        label: '📊 Insert Table',
		        detail: 'Insert Markdown table',
		        description: 'Insert a Markdown table scaffold',
		        insertText: '| ${1:Column 1} | ${2:Column 2} |\n| --- | --- |\n| ${3:Cell 1} | ${4:Cell 2} |',
		        kind: vscode.CompletionItemKind.Snippet
		      }
	    ];

	    const docusaurusComponentCommands = [
	      {
	        label: '🧩 Tabs',
	        detail: 'Insert tabs component',
	        description: 'Toggle content using tabs',
	        insertText: this.createTabsSnippet(),
	        kind: vscode.CompletionItemKind.Snippet,
	        needsImport: true,
	        imports: [
	          { source: '@theme/Tabs', default: 'Tabs' },
	          { source: '@theme/TabItem', default: 'TabItem' }
	        ]
	      },
	      {
	        label: '🧩 TabItem',
	        detail: 'Insert tab item',
	        description: 'Single tab item (use inside Tabs)',
	        insertText: '<TabItem value="${1:tab}" label="${2:Tab Label}"${3: default}>\n  ${4:Content}\n</TabItem>',
	        kind: vscode.CompletionItemKind.Snippet,
	        needsImport: true,
	        imports: [ { source: '@theme/TabItem', default: 'TabItem' } ]
	      },
	      {
	        label: '📑 TOC Inline',
	        detail: 'Insert inline table of contents',
	        description: 'Display inline TOC',
	        insertText: '<TOCInline toc={toc} minHeadingLevel={${1:2}} maxHeadingLevel={${2:3}} />',
	        kind: vscode.CompletionItemKind.Snippet,
	        needsImport: true,
	        imports: [{ source: '@theme/TOCInline', default: 'TOCInline' }]
	      }
	    ];

	    const admonitionCommands = [
	      { label: '📝 Admonition - Note', detail: 'Insert note admonition', description: 'Add a note callout', command: 'flashDocusaurus.insertAdmonition', admonitionType: 'note' },
	      { label: '📝 Admonition - Tip', detail: 'Insert tip admonition', description: 'Add a tip callout', command: 'flashDocusaurus.insertAdmonition', admonitionType: 'tip' },
	      { label: '📝 Admonition - Info', detail: 'Insert info admonition', description: 'Add an info callout', command: 'flashDocusaurus.insertAdmonition', admonitionType: 'info' },
	      { label: '📝 Admonition - Warning', detail: 'Insert warning admonition', description: 'Add a warning callout', command: 'flashDocusaurus.insertAdmonition', admonitionType: 'warning' },
	      { label: '📝 Admonition - Danger', detail: 'Insert danger admonition', description: 'Add a danger callout', command: 'flashDocusaurus.insertAdmonition', admonitionType: 'danger' }
	    ];

	    const diagramCommands = [
	      { label: '📊 Mermaid - Flowchart', detail: 'Insert Mermaid flowchart', description: 'Create flowchart diagram', insertText: this.createMermaidSnippet('flowchart'), kind: vscode.CompletionItemKind.Snippet },
	      { label: '📊 Mermaid - Sequence', detail: 'Insert Mermaid sequence diagram', description: 'Create sequence diagram', insertText: this.createMermaidSnippet('sequence'), kind: vscode.CompletionItemKind.Snippet },
	      { label: '📊 Mermaid - Class', detail: 'Insert Mermaid class diagram', description: 'Create class diagram', insertText: this.createMermaidSnippet('class'), kind: vscode.CompletionItemKind.Snippet },
	      { label: '📊 Mermaid - State', detail: 'Insert Mermaid state diagram', description: 'Create state diagram', insertText: this.createMermaidSnippet('state'), kind: vscode.CompletionItemKind.Snippet },
	      { label: '📊 Mermaid - ER Diagram', detail: 'Insert Mermaid ER diagram', description: 'Create entity relationship diagram', insertText: this.createMermaidSnippet('er'), kind: vscode.CompletionItemKind.Snippet }
	    ];

	    const utilityCommands = [
	      { label: '💡 Code Highlight', detail: 'Highlight code lines', description: 'Add line highlighting to code', command: 'flashDocusaurus.insertCodeHighlight', insertText: '' }
	    ];

    // Create category items
    const createCategoryItems = (commands: any[], categoryPrefix: string, categoryName: string) => {
      const items: vscode.CompletionItem[] = [];

      // Category separator (non-insertable)
      const separator = new vscode.CompletionItem(`────────── ${categoryName} ──────────`, vscode.CompletionItemKind.Text);
      separator.detail = '';
      separator.documentation = new vscode.MarkdownString(`**${categoryName}**`);
      separator.insertText = '';
      separator.sortText = `${categoryPrefix}000`;
      items.push(separator);

      // Add command items
      commands.forEach((cmd, index) => {
        const item = new vscode.CompletionItem(cmd.label, cmd.kind || vscode.CompletionItemKind.Function);
        item.detail = cmd.detail;
        item.documentation = new vscode.MarkdownString(cmd.description);

        if ('command' in cmd && cmd.command) {
          // Use command for special handling
          item.insertText = '';
          const args = cmd.admonitionType ? [position, cmd.admonitionType] : [position, cmd];
          item.command = { command: cmd.command, title: cmd.label, arguments: args };
        } else if (cmd.needsImport && cmd.imports) {
          // Handle imports for components that need them
          item.insertText = '';
          item.command = {
            command: 'flashDocusaurus.insertWithImports',
            title: 'Insert with imports',
            arguments: [position, cmd.insertText, cmd.imports, labelToFeature(cmd.label)]
          };
        } else {
          // Regular snippet without imports -> use command to also track feature
          item.insertText = '' as any;
          item.command = {
            command: 'flashDocusaurus.insertSnippetAndTrack',
            title: 'Insert snippet',
            arguments: [position, cmd.insertText, labelToFeature(cmd.label)]
          };
        }

        const paddedIndex = String(index + 1).padStart(3, '0');
        item.sortText = `${categoryPrefix}${paddedIndex}`;
        items.push(item);
      });

      return items;
    };




    const aiItems = createCategoryItems(aiCommands, '1', 'AI');
    const basicItems = createCategoryItems(basicCommands, '2', 'Basic');
    const compItems = createCategoryItems(docusaurusComponentCommands, '3', 'Components');
    const admonItems = createCategoryItems(admonitionCommands, '4', 'Admonitions');
    const diagItems = createCategoryItems(diagramCommands, '5', 'Diagrams');
    const utilItems = createCategoryItems(utilityCommands, '6', 'Utilities');

    completionItems.push(
      ...aiItems,
      ...basicItems,
      ...compItems,
      ...admonItems,
      ...diagItems,
      ...utilItems
    );

    return completionItems;
  }


  private createTabsSnippet(): string {
    return `<Tabs>\n  <TabItem value="\${1:tab1}" label="\${2:Tab 1}" default>\n    \${3:Content for tab 1}\n  </TabItem>\n  <TabItem value="\${4:tab2}" label="\${5:Tab 2}">\n    \${6:Content for tab 2}\n  </TabItem>\n</Tabs>`;
  }

  private createAdmonitionSnippet(type: string): string {
    // Will be replaced with dynamic nesting detection in resolveCompletionItem
    const colons = ':::';
    return `${colons}${type}[\${1:Title}]\n\${2:Content goes here}\n${colons}`;
  }

  async resolveCompletionItem(
    item: vscode.CompletionItem,
    token: vscode.CancellationToken
  ): Promise<vscode.CompletionItem> {
    // No-op: insertion handled entirely in command handlers to avoid duplicates/position drift
    return item;
  }

  private detectAdmonitionNesting(document: vscode.TextDocument, position: vscode.Position): number {
    const text = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
    const lines = text.split('\n');

    // Stack to track open admonitions with their colon counts
    const stack: number[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for admonition start
      const startMatch = trimmed.match(/^(:+)(note|tip|info|warning|danger)/);
      if (startMatch) {
        const colons = startMatch[1].length;
        stack.push(colons);
        continue;
      }

      // Check for admonition end
      const endMatch = trimmed.match(/^(:+)$/);
      if (endMatch) {
        const colons = endMatch[1].length;
        // Find and remove the matching opening from stack
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i] === colons) {
            stack.splice(i, 1);
            break;
          }
        }
      }
    }

    // If we're inside admonitions, return the deepest level + 1
    if (stack.length > 0) {
      return Math.max(...stack) + 1;
    }

    return 3; // Default
  }

  private createMermaidSnippet(type: string = 'flowchart'): string {
    const templates: { [key: string]: string } = {
      'flowchart': '```mermaid\ngraph TD;\n    A[\${1:Start}] --> B[\${2:Process}];\n    B --> C[\${3:End}];\n```',
      'sequence': '```mermaid\nsequenceDiagram\n    participant \${1:Alice}\n    participant \${2:Bob}\n    \${1:Alice}->>+\${2:Bob}: \${3:Hello Bob, how are you?}\n    \${2:Bob}-->>-\${1:Alice}: \${4:Great!}\n```',
      'class': '```mermaid\nclassDiagram\n    class \${1:Animal} {\n        +\${2:String} name\n        +\${3:int} age\n        +\${4:makeSound()}\n    }\n    class \${5:Dog} {\n        +\${6:bark()}\n    }\n    \${1:Animal} <|-- \${5:Dog}\n```',
      'state': '```mermaid\nstateDiagram-v2\n    [\${1:*}] --> \${2:State1}\n    \${2:State1} --> \${3:State2}\n    \${3:State2} --> [\${4:*}]\n```',
      'er': '```mermaid\nerDiagram\n    \${1:CUSTOMER} ||--o{ \${2:ORDER} : places\n    \${2:ORDER} ||--|{ \${3:LINE-ITEM} : contains\n    \${1:CUSTOMER} {\n        string \${4:name}\n        string \${5:custNumber}\n    }\n```'
    };
    return templates[type] || templates['flowchart'];
  }
}

// Command to insert admonition with automatic parent nesting adjustment
async function insertAdmonition(
  position: vscode.Position,
  admonitionType: string
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;

  // 1) Ensure parents are updated based on current doc state
  //    (we do this before touching the slash so caret tracking isn't broken)
  const caretBefore = editor.selection.active;
  const parentRanges = findParentAdmonitions(document, caretBefore);

  // Compute desired colon counts per parent: innermost parent should be 4, next 5, etc.
  const edits: vscode.TextEdit[] = [];
  for (let i = 0; i < parentRanges.length; i++) {
    const parent = parentRanges[i];
    const distanceFromInnermost = parentRanges.length - 1 - i; // 0 for innermost
    const required = 4 + distanceFromInnermost; // innermost=4, next=5, ...
    const targetCount = Math.max(parent.colonCount, required);

    if (targetCount !== parent.colonCount) {
      // Update opening tag
      const openLine = document.lineAt(parent.openLine);
      const openMatch = openLine.text.match(/^(\s*)(:+)(note|tip|info|warning|danger)(.*)$/);
      if (openMatch) {
        const indent = openMatch[1];
        const type = openMatch[3];
        const rest = openMatch[4] ?? '';
        const newOpenText = `${indent}${':'.repeat(targetCount)}${type}${rest}`;
        edits.push(vscode.TextEdit.replace(openLine.range, newOpenText));
      }

      // Update closing tag
      const closeLine = document.lineAt(parent.closeLine);
      const closeMatch = closeLine.text.match(/^(\s*)(:+)\s*$/);
      if (closeMatch) {
        const indent = closeMatch[1];
        const newCloseText = `${indent}${':'.repeat(targetCount)}`;
        edits.push(vscode.TextEdit.replace(closeLine.range, newCloseText));
      }
    }
  }

  if (edits.length > 0) {
    const ws = new vscode.WorkspaceEdit();
    ws.set(document.uri, edits);
    await vscode.workspace.applyEdit(ws);
  }

  // 2) Recalculate caret, delete slash if present, and insert at caret
  let caret = editor.selection.active;
  const lineText = document.lineAt(caret.line).text;
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

  // Insert new child admonition at base 3-colon level
  const snippet = `:::${admonitionType}[\${1:Title}]\n\${2:Content goes here}\n:::`;
  await editor.insertSnippet(new vscode.SnippetString(snippet), caret);

  Analytics.track(`slash.admonition.${admonitionType}`);
}

// Helper function to find parent admonitions
interface ParentAdmonition {
  openLine: number;
  closeLine: number;
  colonCount: number;
}

function findParentAdmonitions(document: vscode.TextDocument, position: vscode.Position): ParentAdmonition[] {
  const parents: ParentAdmonition[] = [];
  const stack: { line: number; colonCount: number }[] = [];

  // Scan from start to current position
  for (let i = 0; i < position.line; i++) {
    const line = document.lineAt(i);
    const trimmed = line.text.trim();

    // Check for admonition start
    const startMatch = trimmed.match(/^(:+)(note|tip|info|warning|danger)/);
    if (startMatch) {
      const colonCount = startMatch[1].length;
      stack.push({ line: i, colonCount });
      continue;
    }

    // Check for admonition end
    const endMatch = trimmed.match(/^(:+)$/);
    if (endMatch) {
      const colonCount = endMatch[1].length;
      // Find matching opening
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j].colonCount === colonCount) {
          stack.splice(j, 1);
          break;
        }
      }
    }
  }

  // Now scan forward to find closing tags for open admonitions
  for (const open of stack) {
    let depth = 0;
    let closeLine = -1;

    for (let i = open.line + 1; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const trimmed = line.text.trim();

      // Check for nested admonition start
      const startMatch = trimmed.match(/^(:+)(note|tip|info|warning|danger)/);
      if (startMatch && startMatch[1].length === open.colonCount) {
        depth++;
        continue;
      }

      // Check for admonition end
      const endMatch = trimmed.match(/^(:+)$/);
      if (endMatch && endMatch[1].length === open.colonCount) {
        if (depth === 0) {
          closeLine = i;
          break;
        } else {
          depth--;
        }
      }
    }

    if (closeLine !== -1) {
      parents.push({
        openLine: open.line,

        closeLine: closeLine,
        colonCount: open.colonCount
      });
    }
  }

  return parents;
}

// Command to insert component with imports
async function insertWithImports(
  position: vscode.Position,
  insertText: string,
  imports: ImportInfo[],
  featureName?: string
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;

  // 1) Ensure imports first (this may shift lines at the top)
  await ImportManager.ensureImports(document, editor, imports);

  // 2) Recalculate current caret, then remove the triggering slash safely
  let caret = editor.selection.active;

  // Prefer deleting the char before caret if it's '/', otherwise if current char is '/', delete it
  const lineText = document.lineAt(caret.line).text;
  let deleteRange: vscode.Range | null = null;
  if (caret.character > 0 && lineText[caret.character - 1] === '/') {
    deleteRange = new vscode.Range(caret.line, caret.character - 1, caret.line, caret.character);
    caret = new vscode.Position(caret.line, caret.character - 1);
  } else if (caret.character < lineText.length && lineText[caret.character] === '/') {
    deleteRange = new vscode.Range(caret.line, caret.character, caret.line, caret.character + 1);
  }
  if (deleteRange) {
    await editor.edit(editBuilder => editBuilder.delete(deleteRange));
  }

  // 3) Insert snippet at the updated caret position
  await editor.insertSnippet(new vscode.SnippetString(insertText), caret);

  // 4) Track feature if provided
  if (featureName) {
    Analytics.track(featureName);
  }
}

// Command to insert a plain snippet and track a feature
async function insertSnippetAndTrack(
  position: vscode.Position,
  insertText: string,
  featureName: string
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const document = editor.document;

  // Remove triggering slash
  let caret = editor.selection.active;
  const lineText = document.lineAt(caret.line).text;
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

  if (typeof insertText === 'string' && insertText.includes('$')) {
    await editor.insertSnippet(new vscode.SnippetString(insertText), caret);
  } else {
    await editor.insertSnippet(new vscode.SnippetString(String(insertText)), caret);
  }

  Analytics.track(featureName);
}

// Command: placeholder for Write with AI
async function writeWithAI(position: vscode.Position): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  // Remove the triggering slash if present
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
  Analytics.track('slash.write.with.ai');
  vscode.window.showInformationMessage('Coming soon');
}

// Command to insert code highlighting
async function insertCodeHighlight(
  position: vscode.Position,
  cmd: any
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const document = editor.document;

  // Recalculate caret and delete slash if present
  let caret = editor.selection.active;
  const lineText = document.lineAt(caret.line).text;
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

  const ctx = getFencedCodeContext(document, caret);
  if (!ctx.inside) {
    vscode.window.showWarningMessage('Code highlighting is only available inside fenced code blocks (```).');
    return;
  }

  // Auto-detect comment style from fenced language (Prism)
  let styleKey = getStyleForLanguageUtil(ctx.language);

  // In code blocks, treat jsx/tsx like c-style comments
  if (styleKey === 'jsx-style') {
    styleKey = 'c-style';
  }

  if (!styleKey) {
    const picked = await vscode.window.showQuickPick(
      Object.keys(COMMENT_STYLES).map(k => ({ label: COMMENT_STYLES[k as keyof typeof COMMENT_STYLES].label, key: k })),
      { placeHolder: 'Select a comment style for highlighting' }
    );
    if (!picked) return;
    styleKey = picked.key as any;
  }

  // Ask the user which highlight type
  const highlightType = await vscode.window.showQuickPick(
    [
      { label: 'Highlight next line', value: 'next-line' },
      { label: 'Highlight range (start/end)', value: 'range' }
    ],
    { placeHolder: 'Select highlighting type', title: 'Code Highlighting Type' }
  );
  if (!highlightType) return;

  const makeLine = (text: string) => {
    if (styleKey === 'html-style') return `<!-- ${text} -->`;
    if (styleKey === 'jsx-style') return `// ${text}`;
    if (styleKey === 'ocaml-style') return `(* ${text} *)`;
    if (styleKey === 'pascal-style') return `{ ${text} }`;
    const style = COMMENT_STYLES[styleKey as keyof typeof COMMENT_STYLES];
    const prefix = (style as any).value || '//';
    const space = prefix.endsWith(' ') ? '' : ' ';
    return `${prefix}${space}${text}`;
  };

  let commentText = '';
  if (highlightType.value === 'next-line') {
    commentText = makeLine('highlight-next-line');
  } else {
    commentText = `${makeLine('highlight-start')}\n\${1:// Code to highlight}\n${makeLine('highlight-end')}`;
  }

  await editor.insertSnippet(new vscode.SnippetString(commentText), caret);
  const feat = highlightType.value === 'next-line' ? 'slash.code.highlight.nextLine' : 'slash.code.highlight.range';
  Analytics.track(feat);
}

// Export function to create completion providers
export function createCompletionProviders(): vscode.Disposable[] {
  const slashCommandProvider = vscode.languages.registerCompletionItemProvider(
    [{ language: 'mdx', scheme: 'file' }, { language: 'markdown', scheme: 'file' }],
    new SlashCommandCompletionItemProvider(),
    '/'
  );

  // Register command for code highlighting
  // Register command for Write with AI (placeholder)
  const writeWithAICommand = vscode.commands.registerCommand(
    'flashDocusaurus.writeWithAI',
    writeWithAI
  );

  const codeHighlightCommand = vscode.commands.registerCommand(
    'flashDocusaurus.insertCodeHighlight',
    insertCodeHighlight
  );

  // Register command for inserting with imports
  const insertWithImportsCommand = vscode.commands.registerCommand(
    'flashDocusaurus.insertWithImports',
    insertWithImports
  );

  // Register command for inserting admonitions
  const insertAdmonitionCommand = vscode.commands.registerCommand(
    'flashDocusaurus.insertAdmonition',
    insertAdmonition
  );

  // Register command for plain snippet + tracking
  const insertSnippetAndTrackCommand = vscode.commands.registerCommand(
    'flashDocusaurus.insertSnippetAndTrack',
    insertSnippetAndTrack
  );

  return [slashCommandProvider, writeWithAICommand, codeHighlightCommand, insertWithImportsCommand, insertAdmonitionCommand, insertSnippetAndTrackCommand];
}

