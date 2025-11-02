# FlashDocusaurus

> Life is hard, writing should be easy!

A VS Code extension that supercharges your Docusaurus writing workflow. It brings intelligent slash commands, correct component imports, auto‑detected code highlighting comments, and productivity upgrades for MD/MDX.

🌟 Like this tool? Your star is my biggest motivation to keep improving!
👉 [Click here to give FlashDocusaurus a star!](https://github.com/Match-Yang/FlashDocusaurus)
Let more people discover and use the more efficient Docusaurus writing experience!


## ✨ Key Features

### Preview in editor

See Docusaurus pages rendered live inside VS Code with a side-by-side preview. No browser switching required.

- Real-time, side-by-side preview of the rendered page
- Defaults to port 3000; configurable to other ports
- Preview automatically follows when switching between MD/MDX files

- Supports cross-version preview for versioned docs

![preview_in_editor](https://raw.githubusercontent.com/Match-Yang/FlashDocusaurus/main/images/preview_in_editor.gif)

### 🔥 Slash Commands

Just type "/" to trigger the slash commands and get the following features:

![slash_commands](https://raw.githubusercontent.com/Match-Yang/FlashDocusaurus/main/images/slash_command.gif)

- Quickly launch actions, insert components and content snippets
- Automatically adds the correct MDX import statements when inserting components
- Organized by categories (AI, Basic, Components, Admonitions, Diagrams, Utilities) for quick scanning


### 🖼️ Visual Page Options Editor

Edit page frontmatter visually with zero YAML memorization.

- Fields are organized by logical groups (Identity & URL, Sidebar, TOC & Visibility, Pagination, Editing & Source, Drafting, Advanced)
- Supports all default Docusaurus frontmatter options (docs/blog/pages)
- Open the panel, adjust options, and save — FlashDocusaurus writes the frontmatter for you

![frontmatter_visual_editor](https://raw.githubusercontent.com/Match-Yang/FlashDocusaurus/main/images/set_frontmatter.gif)



### 🧩 [Coming soon] Visual Component Property Editor

Coming soon: configure MDX components via a visual editor.

- Support for all default Docusaurus components
- Set component props visually — no need to remember complex properties
- Automatically handles required imports and updates MDX markup


### 🔗 [Coming soon] Smart Link Management & Validation
Real-time link validation and automatic updates:

- **Internal Link Validation**: Validates Docusaurus internal links (`/path/to/page`)
- **Absolute Link Validation**: Checks file existence for absolute paths (`/images/logo.png`)
- **CodeLens Integration**: Shows "Open file" buttons for valid internal links
- **Status Bar Indicators**: Real-time count of invalid links in current file
- **Auto-Resolution**: Automatically tries `.mdx`, `.md`, `index.mdx`, `index.md` extensions


### 📁 [Coming soon] Advanced File Reference Tracking
Intelligent language service that automatically maintains file references:

- **Auto-Update Imports**: Updates MDX imports when files are moved or renamed
- **Auto-Update Links**: Updates internal links when files are moved or renamed
- **Bulk Operations**: Handles folder renames with automatic reference updates
- **Navigation Sync**: Updates `sidebars.js` navigation when files are moved
- **Real-time Analysis**: Tracks file dependencies across your documentation

### 🎯 [Coming soon] Efficient Context Menu Actions



### 🪄 [Coming soon] Efficient CodeLens Actions

- **Open File**: Open the file that the internal link points to.
- **Generate and copy heading anchor**:  Using fixed anchor can avoid the failure to jump through the anchor after modifying the heading.

## 🛠️ System Requirements
- VS Code: 1.73.0 or higher
- File types: .md, .mdx


## 📦 Installation
- VS Code Marketplace — Coming soon
- From source (development):
  1. Clone this repo
  2. `npm install`
  3. `npm run compile`
  4. Press F5 in VS Code to launch the Extension Development Host


## 🤝 Contributing

We welcome contributions! This extension is open source and available on GitHub.

- 🐛 [**Report Issues**](https://github.com/Match-Yang/FlashDocusaurus/issues/new): Found a bug? Let us know!
- 💡 [**Feature Requests**](https://github.com/Match-Yang/FlashDocusaurus/issues/new): Have an idea? We'd love to hear it!
- 🔧 [**Pull Requests**](https://github.com/Match-Yang/FlashDocusaurus/pulls): Want to contribute code? Awesome!

## Support & Feedback

If you have any questions or feedback, please feel free to reach out to me.

- Email: oliver.yeung.me@gmail.com
- X: [@FlashDocssss](https://x.com/FlashDocssss)
- Discord: [FlashDocs](https://discord.gg/JCbDKFPKH3)

## 📄 License

MIT License - see LICENSE file for details.

---

**Made with ❤️ for the Docusaurus community**