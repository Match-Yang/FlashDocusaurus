# FlashDocusaurus

A VS Code extension for Docusaurus documentation development with intelligent features.

## Features

- **Automatic Docusaurus project detection** - Detects `docusaurus.config.js` or `docusaurus.config.ts`
- **Side-by-side preview** - Preview your documentation alongside your editor
- **Interactive preview panel** - Address bar and refresh button for easy navigation

## Requirements

- VS Code 1.73.0 or higher
- A Docusaurus project (with `docusaurus.config.js` or `docusaurus.config.ts`)
- Running Docusaurus dev server (`npm start` or `yarn start`)

## Getting Started

1. Open a Docusaurus project in VS Code
2. Start your Docusaurus dev server: `npm start` (default port: 3000)
3. Open any `.md` or `.mdx` file
4. Click the globe icon (🌐) in the editor title bar to open preview
5. Use the address bar in the preview panel to navigate to different pages
6. Click the refresh button to reload the current page

## Configuration

- `flashDocusaurus.preview.port` - Port of the running Docusaurus dev server (default: 3000)

## Development

```bash
# Install dependencies
npm install

# Compile the extension
npm run compile

# Watch for changes
npm run watch

# Press F5 in VS Code to start debugging
```

## License

MIT

