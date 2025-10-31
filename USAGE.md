# FlashDocusaurus 使用指南

## 快速开始

### 1. 安装依赖并编译
```bash
cd FlashDocusaurus
npm install
npm run compile
```

### 2. 调试插件
1. 在 VS Code 中打开 FlashDocusaurus 文件夹
2. 按 `F5` 启动调试
3. 会打开一个新的 VS Code 窗口（Extension Development Host）

### 3. 测试预览功能
1. 在新窗口中打开一个 Docusaurus 项目
2. 确保项目根目录有 `docusaurus.config.js` 或 `docusaurus.config.ts`
3. 在终端运行 `npm start` 启动 Docusaurus 开发服务器（默认端口 3000）
4. 打开任意 `.md` 或 `.mdx` 文件
5. 点击编辑器右上角的地球图标 🌐 打开预览

## 预览功能特性

### 地址栏
- 显示当前预览的 URL
- 可以手动修改 URL
- 按 `Enter` 键导航到新地址

### 刷新按钮
- 点击刷新按钮重新加载当前页面
- 快捷方式：修改地址栏后按 `Enter`

### Side-by-side 预览
- 预览面板会在编辑器旁边打开
- 可以同时编辑和查看效果

## 配置

在 VS Code 设置中可以配置：

```json
{
  "flashDocusaurus.preview.port": 3000  // Docusaurus 开发服务器端口
}
```

## 开发模式

### 监听文件变化
```bash
npm run watch
```

这会自动编译 TypeScript 文件的变化。

### 调试技巧
1. 在代码中设置断点
2. 按 `F5` 启动调试
3. 在 Extension Development Host 窗口中触发功能
4. 断点会在原窗口中命中

## 项目结构

```
FlashDocusaurus/
├── src/
│   ├── extension.ts          # 主入口文件
│   └── webview/
│       └── PreviewPanel.ts   # 预览面板实现
├── out/                       # 编译输出目录
├── package.json              # 插件配置
├── tsconfig.json             # TypeScript 配置
└── README.md                 # 说明文档
```

## 下一步计划

- [ ] 添加更多智能补全功能
- [ ] 添加 Docusaurus 组件的代码片段
- [ ] 添加文档链接验证
- [ ] 添加 frontmatter 编辑器

