import * as vscode from 'vscode';

export type CommentStyleKey =
  | 'c-style'
  | 'bash-style'
  | 'html-style'
  | 'dash-style'
  | 'percent-style'
  | 'semicolon-style'
  | 'apostrophe-style'
  | 'bang-style'
  | 'ocaml-style'
  | 'pascal-style'
  | 'jsx-style';

export interface CommentStyleDef {
  label: string;
  kind: 'line' | 'wrapped';
  prefix?: string; // for kind === 'line'
  open?: string; // for kind === 'wrapped'
  close?: string; // for kind === 'wrapped'
}

export const COMMENT_STYLES: Record<CommentStyleKey, CommentStyleDef> = {
  'c-style': { label: 'C-style (//)', kind: 'line', prefix: '//' },
  'bash-style': { label: 'Hash (#)', kind: 'line', prefix: '#' },
  'html-style': { label: 'HTML (<!-- -->)', kind: 'wrapped', open: '<!--', close: '-->' },
  'dash-style': { label: 'Dash (--)', kind: 'line', prefix: '--' },
  'percent-style': { label: 'Percent (%)', kind: 'line', prefix: '%' },
  'semicolon-style': { label: 'Semicolon (;)', kind: 'line', prefix: ';' },
  'apostrophe-style': { label: "Apostrophe (')", kind: 'line', prefix: "'" },
  'bang-style': { label: 'Bang (!)', kind: 'line', prefix: '!' },
  'ocaml-style': { label: 'OCaml (* ... *)', kind: 'wrapped', open: '(*', close: '*)' },
  'pascal-style': { label: 'Pascal { ... }', kind: 'wrapped', open: '{', close: '}' },
  'jsx-style': { label: 'JSX ({/* */})', kind: 'wrapped', open: '{/*', close: '*/}' }
};

export function renderComment(styleKey: CommentStyleKey, text: string): string {
  const style = COMMENT_STYLES[styleKey];
  if (!style) {
    return `// ${text}`;
  }
  if (style.kind === 'line') {
    const space = style.prefix!.endsWith(' ') ? '' : ' ';
    return `${style.prefix}${space}${text}`;
  }
  // wrapped
  const open = style.open!.endsWith(' ') ? style.open! : `${style.open} `;
  const close = style.close!.startsWith(' ') ? style.close! : ` ${style.close}`;
  return `${open}${text}${close}`;
}

// Try to normalize common aliases to canonical Prism ids (lowercased)
export function normalizeLang(lang?: string): string | undefined {
  if (!lang) return undefined;
  const l = lang.toLowerCase();
  const map: { [k: string]: string } = {
    js: 'javascript', mjs: 'javascript', cjs: 'javascript',
    jsx: 'jsx', tsx: 'tsx', ts: 'typescript',
    'c#': 'csharp', cs: 'csharp', 'c++': 'cpp', cc: 'cpp', cxx: 'cpp',
    sh: 'bash', shell: 'bash', zsh: 'bash', fish: 'bash',
    yml: 'yaml', rb: 'ruby', py: 'python', golang: 'go', md: 'markdown',
    rs: 'rust', kt: 'kotlin', ps: 'powershell', ps1: 'powershell',
    tex: 'latex', htm: 'html', xhtml: 'html'
  };
  return map[l] || l;
}

// Heuristic fallback when a language is not explicitly mapped
export function guessStyleForLanguage(lang: string): CommentStyleKey {
  const l = lang.toLowerCase();
  // Markup-like
  if (/(^|-)html$|^xml$|^svg$|^mathml$|^markup$|^xquery$|^xaml$|^xsd$|^plist$/.test(l)) return 'html-style';
  if (/handlebars|mustache|liquid|erb|ejs|haml|pug|jade|twig|smarty/.test(l)) return 'html-style';

  // Hash style families
  if (/^bash$|^shell$|^sh$|^powershell$|^ps1$|^makefile$|^docker(file)?$|^nginx$|^ini$|^toml$|^properties$|^yaml$|^yml$|^graphql$|^hcl$|^dotenv$|^editorconfig$|^git$|^tap$|^systemd$|^r$|^perl$|^ruby$|^python$|^nim$|^crystal$|^julia$|^octave$|^matlab$/.test(l)) return 'bash-style';

  // Double dash families
  if (/^sql$|^plsql$|^pgsql$|^postgresql$|^lua$|^ada$|^haskell$|^elm$/.test(l)) return 'dash-style';

  // Percent families
  if (/^erlang$|^prolog$|^latex$/.test(l)) return 'percent-style';

  // Semicolon families
  if (/lisp|scheme|racket|clojure/.test(l)) return 'semicolon-style';

  // Apostrophe families
  if (/^vb$|^vbnet$|^vba$|visual-basic/.test(l)) return 'apostrophe-style';

  // Bang families
  if (/fortran/.test(l)) return 'bang-style';

  // OCaml / Pascal
  if (/^ocaml$/.test(l)) return 'ocaml-style';
  if (/^pascal$|^delphi$/.test(l)) return 'pascal-style';

  // Default C-like
  return 'c-style';
}

// Curated mapping for many common Prism languages
export const LANGUAGE_COMMENT_MAP: { [key: string]: CommentStyleKey } = {
  // Markup
  'markup': 'html-style', 'html': 'html-style', 'xml': 'html-style', 'svg': 'html-style', 'mathml': 'html-style', 'markdown': 'html-style', 'md': 'html-style',

  // C-like family
  'c': 'c-style', 'cpp': 'c-style', 'arduino': 'c-style', 'java': 'c-style', 'csharp': 'c-style', 'objectivec': 'c-style', 'objc': 'c-style', 'swift': 'c-style',
  'kotlin': 'c-style', 'scala': 'c-style', 'groovy': 'c-style', 'd': 'c-style', 'go': 'c-style', 'rust': 'c-style', 'zig': 'c-style', 'glsl': 'c-style',
  'css': 'c-style', 'scss': 'c-style', 'sass': 'c-style', 'less': 'c-style',
  'javascript': 'c-style', 'typescript': 'c-style', 'jsx': 'jsx-style', 'tsx': 'jsx-style',
  'php': 'c-style', 'verilog': 'c-style', 'vhdl': 'c-style', 'wasm': 'c-style',

  // Hash style
  'python': 'bash-style', 'ruby': 'bash-style', 'bash': 'bash-style', 'shell-session': 'bash-style', 'shell': 'bash-style', 'powershell': 'bash-style',
  'yaml': 'bash-style', 'yml': 'bash-style', 'perl': 'bash-style', 'r': 'bash-style', 'makefile': 'bash-style', 'ini': 'bash-style', 'toml': 'bash-style',
  'dockerfile': 'bash-style', 'nginx': 'bash-style', 'graphql': 'bash-style', 'hcl': 'bash-style', 'properties': 'bash-style', 'editorconfig': 'bash-style',

  // Double dash
  'sql': 'dash-style', 'plsql': 'dash-style', 'lua': 'dash-style', 'ada': 'dash-style', 'haskell': 'dash-style', 'elm': 'dash-style',

  // Percent
  'erlang': 'percent-style', 'prolog': 'percent-style', 'latex': 'percent-style',

  // Semicolon
  'lisp': 'semicolon-style', 'scheme': 'semicolon-style', 'racket': 'semicolon-style', 'clojure': 'semicolon-style',

  // Apostrophe
  'vb': 'apostrophe-style', 'vbnet': 'apostrophe-style', 'visual-basic': 'apostrophe-style',

  // Bang
  'fortran': 'bang-style',

  // Others
  'matlab': 'percent-style', 'octave': 'percent-style', 'nim': 'bash-style', 'crystal': 'bash-style', 'julia': 'bash-style'
};

export function getStyleForLanguage(lang?: string): CommentStyleKey | undefined {
  const n = normalizeLang(lang);
  if (!n) return undefined;
  return LANGUAGE_COMMENT_MAP[n] || guessStyleForLanguage(n);
}

