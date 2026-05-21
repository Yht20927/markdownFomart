# Markdown Format Converter Suite

> [md-to.com](https://md-to.com) 的本地 CLI 复刻版 — 16 个工具，100% 本地运行，隐私安全、无需联网。

md-to.com 是一个极简好用的在线 Markdown 格式转换工具，所有转换在浏览器本地完成。本项目将其核心功能复刻为命令行工具，方便批量处理、脚本集成和本地自动化。

## 工具概览

### Markdown → 其他格式

| 工具 | 输出 | 核心库 | 速度 |
|------|------|--------|------|
| **md-to-pdf** | PDF (29 主题) | marked + puppeteer + katex | ~3s |
| **md-to-word** | Word .doc | marked + katex + hljs | <0.5s |
| **md-to-html** | HTML5 | marked + katex + hljs | <0.5s |
| **md-to-image** | PNG / JPG | marked + puppeteer | ~2s |
| **md-to-text** | 纯文本 | regex | <0.1s |
| **md-to-latex** | LaTeX .tex | marked | <0.3s |
| **md-to-rst** | reStructuredText | marked | <0.3s |
| **md-to-confluence** | Confluence wiki | regex | <0.2s |

### 其他格式 → Markdown

| 工具 | 输入 | 核心库 | 速度 |
|------|------|--------|------|
| **html-to-md** | HTML → MD | turndown | <0.3s |
| **word-to-md** | .docx → MD | mammoth + turndown | <1s |
| **pdf-to-md** | PDF → MD | pdf-parse | <1s |

### 表格工具

| 工具 | 方向 | 核心库 | 速度 |
|------|------|--------|------|
| **csv-to-md** | CSV → MD Table | 纯 JS | <0.1s |
| **md-table-to-csv** | MD Table → CSV | 纯 JS | <0.1s |
| **json-to-md** | JSON → MD Table | 纯 JS | <0.1s |
| **md-table-to-image** | MD Table → PNG | marked + puppeteer | ~2s |
| **md-table-to-pdf** | MD Table → PDF | marked + puppeteer | ~2s |

## 安装

```bash
cd <tool-dir> && npm install
```

## 使用

所有工具遵循统一 CLI：

```bash
node <tool-dir>/index.js convert -i <input> -o <output>
```

### md-to-pdf

```bash
node md-to-pdf/index.js list              # 列出 29 个 PDF 主题
node md-to-pdf/index.js info <theme-id>   # 查看主题颜色/字体
node md-to-pdf/index.js convert -i in.md -o out.pdf -t <theme>
```

### csv-to-md

```bash
node csv-to-md/index.js convert -i in.csv -o out.md -d ','   # 指定分隔符
```

## 与原版对比

| | md-to.com | 本工具 |
|------|-----------|---------|
| 运行方式 | 浏览器在线 | 命令行本地 |
| 编辑器 | 分屏实时预览 | — |
| 隐私 | 浏览器本地处理 | 完全本地，无网络依赖 |
| 批量处理 | 单个文件 | 支持脚本批量 |
| 集成 | 手动操作 | 可嵌入 CI/脚本 |
| 收费 | 免费 | 开源 MIT |

## 项目结构

```
md-to-format/
├── README.md              ← 本文件
├── SKILL.md               ← 技能定义
├── md-to-pdf/             ← Markdown → PDF (29 主题)
├── md-to-word/            ← Markdown → Word .doc
├── md-to-html/            ← Markdown → HTML5
├── md-to-image/           ← Markdown → PNG/JPG
├── md-to-text/            ← Markdown → 纯文本
├── md-to-latex/           ← Markdown → LaTeX .tex
├── md-to-rst/             ← Markdown → reStructuredText
├── md-to-confluence/      ← Markdown → Confluence wiki
├── html-to-md/            ← HTML → Markdown
├── word-to-md/            ← Word .docx → Markdown
├── pdf-to-md/             ← PDF → Markdown
├── csv-to-md/             ← CSV → Markdown Table
├── md-table-to-csv/       ← Markdown Table → CSV
├── json-to-md/            ← JSON → Markdown Table
├── md-table-to-image/     ← Markdown Table → PNG/JPG
├── md-table-to-pdf/       ← Markdown Table → PDF
└── shared/                ← 共享工具
```

## License

MIT
