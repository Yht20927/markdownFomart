# Markdown 转换套件重构方案

> **状态**：✅ 已完成（2026-07-06）
> **完成 commit**：待提交
> **基线 commit**：`c95cfb8`（fix: 全面修复转换质量 — 占位符冲突、嵌套列表、blockquote代码块、正则交叉匹配）
> **目标**：在保持「16 工具 / 100% 本地 / 统一 CLI」现状下，分三波消除数据正确性 bug、收敛架构债、补全功能与美化。

---

## 0. 文档导航

- [1. 架构现状速览](#1-架构现状速览)
- [2. 重构总原则](#2-重构总原则)
- [3. 第一波 · 止血（P0 数据正确性）](#3-第一波--止血p0-数据正确性)
- [4. 第二波 · 架构统一（共享抽取）](#4-第二波--架构统一共享抽取)
- [5. 第三波 · 功能增强与美化](#5-第三波--功能增强与美化)
- [6. 美化专题（转换效果增强）](#6-美化专题转换效果增强)
- [7. 测试策略](#7-测试策略)
- [8. 迁移与风险](#8-迁移与风险)
- [9. 里程碑与工作量估算](#9-里程碑与工作量估算)
- [10. 验收清单](#10-验收清单)

---

## 1. 架构现状速览

16 个独立 Node.js 包，无 monorepo workspace。统一 CLI：`node <tool>/index.js convert -i <in> -o <out>`（commander 解析）。唯一全局共享文件 `shared/html-renderer.js`（87 行）。

### 1.1 三条转换管线范式

| 范式 | 工具 | 引擎 | 用 shared? |
|---|---|---|---|
| marked → HTML | md-to-pdf / html / word / image | marked + katex + hljs | md-to-pdf 半用，其余三用 |
| 纯 regex 顺序替换 | md-to-latex / rst / confluence / text | 自写正则 + 占位符保护 | 否 |
| 反向转换 | html-to-md / word-to-md / pdf-to-md | turndown / mammoth / pdf-parse | 否 |
| 表格专用 | csv-to-md / md-table-to-csv / json-to-md / md-table-to-image / md-table-to-pdf | 手写解析 + marked | md-table-to-image/pdf 绕过 shared |

### 1.2 已知问题分层（按影响）

| 层 | 数量 | 性质 |
|---|---|---|
| 🔴 P0 数据正确性 | 12 | 静默出错，输入数据被破坏 |
| 🟠 P1 功能缺陷 | 6 | 宣称的功能不生效或文档误导 |
| 🟡 P2 架构债 | 7 | 重复代码、抽取不彻底、无测试 |

### 1.3 关键风险区：占位符模式

最近一次 commit `c95cfb8` 修了 `shared/html-renderer.js` 的占位符（`__CB_0__` → `<!--CB:0-->`，避免被 GFM 解析为加粗），但：

- `md-to-latex`/`rst`/`confluence` **未跟进**，仍用 `<<CODEBLOCK_N>>` / `__FENCED_N__`
- `restorePlaceholders` 用 `String.replace(needle,val)` 只替换单个匹配，未还原占位符**无断言**
- `md-to-text` **完全无占位符保护**

---

## 2. 重构总原则

1. **不破坏 CLI 契约**：`convert -i -o` 接口与退出码保持不变，新增能力只加可选 flag。
2. **先有测试再重构**：每个修复点先加回归测试（failing → passing），再动代码。
3. **共享抽取以「能被多个工具复用」为门槛**：单一消费者不抽取，避免过度抽象。
4. **美化与正确性分离**：美化（CSS / 排版）通过主题参数注入，不污染转换正确性逻辑。
5. **小步可验证**：每个 P0 修复独立成 commit，每波结束跑全量回归。

---

## 3. 第一波 · 止血（P0 数据正确性）

> 目标：消除 12 个静默数据破坏 bug，建立测试基线。预估 1.5 天。

### 3.1 表格工具数据正确性（最严重，双向转换有损）

| # | 位置 | 现状 | 方案 | 验收 |
|---|---|---|---|---|
| P0-1 | `md-table-to-csv/index.js:24` | `.filter(c=>c.length>0)` 丢空单元格，列错位 | 改 `split('\|').slice(1,-1).map(c=>c.trim())`，保留中间空 cell，只去 split 首尾空串 | `\| a \| \| c \|` → 3 列 `a,,c` |
| P0-2 | `md-table-to-csv/index.js:22` | 不识别 `\|` 转义 | 先按未转义管道符切分（`/(?<!\\)\|/`），再 `replace(/\\\|/g,'\|')` 还原 | `\| a\|b \| c \|` → `a\|b`, `c` |
| P0-3 | `md-table-to-csv/index.js:29` | `r.join(',')` 无引号转义 | 实现 RFC 4180：cell 含 `,`/`"`/`\n` 时双引号包裹并 `"` → `""` | `Hello, World` → `"Hello, World"` |
| P0-4 | `csv-to-md/index.js:21` | `split('\n')` 破坏引号内换行 | 状态机提升到行级：跨行维护 `inQuotes`，未闭合时拼接下一行 | `"a\nb",c` → 单行 2 cell |
| P0-5 | `csv-to-md/index.js:13` | 自动检测把引号内分隔符计入 | 检测循环在 `inQuotes` 状态下跳过计数 | `"a,b",c;d` → 选 `;` |
| P0-6 | `csv-to-md/index.js:40,43` | `cell.trim()` 丢引号内有意空格 | 仅在非引号段 trim，或加 `--preserve-spaces` | `"  pad  "` → `  pad  ` |
| P0-7 | `csv-to-md/index.js:21` | 不剥离 BOM | `csv.replace(/^﻿/,'')` | BOM 头不进表头 |
| P0-8 | `json-to-md/index.js:27` | 只取首对象 keys | `records.reduce((acc,r)=>union(acc,Object.keys(r)),[])` 按首次出现排序 | `[{a:1},{a:1,b:2}]` → 2 列 `a,b` |
| P0-9 | `json-to-md/index.js:37` | 数组/对象值 → `[object Object]` | 数组 `JSON.stringify` 后转义 `\|`；对象展平为 `k.v` 列或 JSON 字符串 | `{a:1}` → `{"a":1}` |
| P0-10 | `csv-to-md/index.js:50` | `Math.max(...rows.map(...))` 大文件栈溢出 | 改 `rows.reduce((m,r)=>Math.max(m,r.length),0)` | 万级行不崩 |

### 3.2 文本格式工具正则 bug

| # | 位置 | 现状 | 方案 | 验收 |
|---|---|---|---|---|
| P0-11 | `md-to-text/index.js:19-20` | 图片/链接顺序倒置 → 图片残留 `!alt`（c95cfb8 漏修） | 图片正则移到链接正则前，对齐其他三工具 | `![x](u)` → `x`（或删，按 md-to.com 行为） |
| P0-12 | `md-to-text/index.js:11-18` | 无占位符保护，代码块内 `**`/`*` 被先剥 | 先抽取围栏代码块到数组，inline 替换后再决定保留/删除 | ``` ``` **not bold** ``` ``` 内容不被剥 |
| P0-13 | `md-to-rst/index.js:34-39` | 标题下划线固定 5 字符，超长标题报错 | `'$1\n' + '='.repeat($1.trim().length) + '\n'` | 「答辩重点概念解释」（8 字）→ 8 个 `=` |
| P0-14 | `md-to-rst/index.js:91` | 脚注定义 `.. [label]` 缺 `#`，与引用失配 | 改 `.. [#${fn.label}]`，与 `:54` 的 `[#label]_` 配对 | RST 渲染器无未定义引用警告 |
| P0-15 | `md-to-latex/index.js:8-14` | `escapeLatex` 定义却从不调用 | 在标题(`:117-122`)、链接文本(`:139`)、列表项(`:158/161`)的 `$1`/`$2` 包 `escapeLatex()` | `## x_1` → `\section{x\_1}` 编译通过 |
| P0-16 | `md-to-latex/index.js:17-28` | `latexEscapeCell` 不转义 `& % $ # { }` | 补齐这 6 个字符转义 | 表格 cell 含 `&` 不破坏 tabular |
| P0-17 | `md-to-latex/index.js:142,233` | 脚注引用/定义失配，label 文本被当内容 | 引用改 `\footnotemark`，定义改 `\footnotetext{content}`，或合并为引用处 `\footnote{内容}` | 双栏编译脚注编号正确 |
| P0-18 | `md-to-confluence/index.js:43-49` | `***bold italic***` 未优先处理，嵌套破坏 | 在粗体前加 `***(.+?)***` → `*_*${1}*_*` 临时标记（对齐 latex `:128`） | `***x***` → `*_x_*`（粗斜体） |

### 3.3 反向转换 bug

| # | 位置 | 现状 | 方案 | 验收 |
|---|---|---|---|---|
| P0-19 | `word-to-md/index.js:11` | 缺 turndown `table` rule（html-to-md 有，复制漏抄） | 抽 `shared/turndown-factory.js`，两工具共用 | .docx 表格 → GFM `\|...\|` 表格 |
| P0-20 | `html-to-md/index.js:31-34` | 无 `<thead>` 时不输出分隔行，GFM 表格破裂 | 检测 `tbody` 首行 `th` 作表头，或无表头时用首行做表头 + 标准分隔行 | 无 thead 表格仍渲染为表格 |
| P0-21 | `pdf-to-md/index.js:27` | 空文本 `process.exit(0)`，CI 不报错 | 改 `exit(1)`，加 `--allow-empty` 开关 | 扫描版 PDF 退出码 1 |

---

## 4. 第二波 · 架构统一（共享抽取）

> 目标：收敛重复代码，让 P0 修复只写一遍。预估 2.5 天。**依赖第一波的测试基线。**

### 4.1 新增 shared 模块设计

```
shared/
├── html-renderer.js        （已有，增强）
├── gfm-table.js             （新）GFM 表格构造
├── md-table-parser.js       （新）MD 表格解析
├── csv.js                  （新）CSV parser + writer（RFC 4180）
├── turndown-factory.js      （新）反向转换共享配置
├── browser-pool.js          （新）puppeteer 单例池
├── html-page.js            （新）HTML 文档外壳
├── placeholders.js          （新）占位符统一工具
├── pkg.js                   （新）version 读取
└── cli.js                   （新）resolveInOut + 通用错误处理
```

#### 4.1.1 `shared/gfm-table.js`

```js
// 构造 GFM 表格，统一转义与对齐
function buildTable({ headers, rows, aligns }) {
  // aligns: ['left'|'center'|'right'|null, ...]
  const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  const sep = (a) => a === 'center' ? ':---:' : a === 'right' ? '---:' : a === 'left' ? ':---' : '---';
  const row = (cells) => '| ' + cells.map(esc).join(' | ') + ' |';
  return [row(headers), row(aligns.map(sep)), ...rows.map(row)].join('\n');
}
module.exports = { buildTable };
```

**消费者**：csv-to-md、json-to-md、md-table-to-csv（反向用 parser）。

#### 4.1.2 `shared/md-table-parser.js`

```js
// 解析 MD 中的所有表格，保留对齐信息，正确处理 \| 与空 cell
function parseTables(md) {
  // 返回 [{ headers, aligns, rows }, ...]
  // 用 /(?<!\\)\|/ 切分，slice(1,-1) 去首尾空串
  // 识别 :--:/---/--:/--- 对齐行
}
module.exports = { parseTables };
```

**消费者**：md-table-to-csv、md-table-to-image（仅渲染表格时）、md-table-to-pdf。

#### 4.1.3 `shared/csv.js`

```js
// RFC 4180 合规的 CSV parser + writer
function parseCsv(text, { delimiter = ',' } = {}) { /* 行级状态机，处理引号内换行、""、BOM */ }
function writeCsv(rows) { /* 自动引号转义：含 ,"/\n 时包裹 */ }
module.exports = { parseCsv, writeCsv };
```

**消费者**：csv-to-md（parse）、md-table-to-csv（write）。

#### 4.1.4 `shared/turndown-factory.js`

```js
const TurndownService = require('turndown');
function createTurndown({ gfmTables = true, taskLists = true, strikethrough = true } = {}) {
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  if (gfmTables) addTableRule(td);     // 统一 table rule，修 P0-19/P0-20
  if (taskLists) td.use(require('@turndown/plugin-gfm').taskListItems);
  if (strikethrough) td.use(require('@turndown/plugin-gfm').strikethrough);
  return td;
}
module.exports = { createTurndown };
```

**消费者**：html-to-md、word-to-md。

#### 4.1.5 `shared/browser-pool.js`

```js
const puppeteer = require('puppeteer');
let _browser = null;
async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return _browser;
}
async function closeBrowser() { if (_browser) { await _browser.close(); _browser = null; } }
async function withPage(fn) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try { return await fn(page); } finally { await page.close(); }
}
// 进程退出兜底
process.on('SIGINT', async () => { await closeBrowser(); process.exit(0); });
process.on('beforeExit', closeBrowser);
module.exports = { getBrowser, closeBrowser, withPage };
```

**消费者**：md-to-image、md-to-pdf、md-table-to-image、md-table-to-pdf。消除 4 处重复。

#### 4.1.6 `shared/html-page.js`

```js
// 统一 HTML 文档外壳，支持主题 CSS 注入
function buildHtmlPage({ body, css = '', title = '', lang = 'zh-CN', headExtra = '' }) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${css}</style>
${headExtra}
</head>
<body>${body}</body>
</html>`;
}
module.exports = { buildHtmlPage };
```

**消费者**：md-to-html、md-to-word、md-to-image、md-table-to-image/pdf。

#### 4.1.7 `shared/placeholders.js`（占位符统一升级）

```js
// 用极不可能碰撞的格式 + 还原断言
const PREFIX = ' ';  // NUL 字符，Markdown 不会出现
function make(tag, i) { return `${PREFIX}${tag}:${i}${PREFIX}`; }
const RE = / (CB|IM|BM|CODEBLOCK|TABLE|FN):\d+ /g;

function assertAllRestored(html) {
  const leak = html.match(RE);
  if (leak) throw new Error(`Placeholder leaked: ${leak.join(', ')}`);
}
module.exports = { PREFIX, make, RE, assertAllRestored };
```

**消费者**：shared/html-renderer.js、md-to-latex、md-to-rst、md-to-confluence。**消除占位符碰撞风险 + 加还原断言。**

### 4.2 第二波任务清单

| # | 任务 | 涉及文件 | 依赖 |
|---|---|---|---|
| A1 | 抽 `shared/gfm-table.js` + `csv-to-md`、`json-to-md` 改用 | csv-to-md, json-to-md | P0-8,9 |
| A2 | 抽 `shared/csv.js` + `csv-to-md`、`md-table-to-csv` 改用 | csv-to-md, md-table-to-csv | P0-3,4,5,6,7 |
| A3 | 抽 `shared/md-table-parser.js` + `md-table-to-csv` 改用 | md-table-to-csv | P0-1,2 |
| A4 | 抽 `shared/turndown-factory.js` + html-to-md/word-to-md 改用 | html-to-md, word-to-md | P0-19,20 |
| A5 | 抽 `shared/browser-pool.js` + 4 工具改用 | md-to-image, md-to-pdf, md-table-to-image, md-table-to-pdf | — |
| A6 | 抽 `shared/html-page.js` + 4 工具改用 | md-to-html, md-to-word, md-to-image, md-table-to-* | — |
| A7 | `md-to-pdf/lib/renderer.js:151-170` 改用 `renderMarkdown` | md-to-pdf | — |
| A8 | `md-table-to-image/pdf` 改用 `createRenderer`（恢复 katex/hljs） | md-table-to-image, md-table-to-pdf | A5 |
| A9 | 占位符全仓升级到 `shared/placeholders.js` + 加还原断言 | shared/html-renderer.js, md-to-latex/rst/confluence | — |
| A10 | 抽 `shared/cli.js`（resolveInOut + 通用 try/catch） | 全部 16 工具 | — |
| A11 | 引入 npm workspace，统一依赖版本 | 根 package.json + 各 tool | A1-A10 完成后 |

---

## 5. 第三波 · 功能增强与美化

> 目标：补全宣称但不生效的功能，并提升输出美观度。预估 2 天。详见 [§6 美化专题](#6-美化专题转换效果增强)。

| # | 位置 | 现状 | 方案 |
|---|---|---|---|
| F-1 | `md-to-pdf/lib/renderer.js` head | KaTeX CSS / hljs 主题 CSS 未引入 → 数学/高亮失效 | head 注入 `katex/dist/katex.min.css` + 选定 hljs 主题（按主题 dark/light 匹配） |
| F-2 | `md-to-pdf/lib/templates.js:6-11` | 每次调用重读 1480 行 JSON | 模块级缓存 `_cache ??= JSON.parse(...)` |
| F-3 | `md-to-pdf/lib/templates.js:19` | 去重不剥 `-standard`，25≠29 幻影重复 | 正则改 `-(compact\|relaxed\|standard)$`；`cli.js:29` 改动态计数 |
| F-4 | `md-to-pdf/lib/converter.js:28` | `networkidle0` 无外链时浪费 500ms | 改 `domcontentloaded` |
| F-5 | `md-to-pdf/lib/converter.js:35` | margin 硬编码，主题 spacing 不生效 | 主题加 `pageMargin` 字段覆盖 |
| F-6 | `md-to-pdf/lib/renderer.js:156` + `shared/html-renderer.js:69` | marked `highlight` 选项已废弃（v15） | 引入 `marked-highlight` 扩展 |
| F-7 | `shared/html-renderer.js:79` | `marked.parse` 未 await，async 扩展会炸 | 显式 `{ async: false }` 或改 async |
| F-8 | `shared/html-renderer.js:2-8` | `escapeHtml` 不转义单引号 | 补 `'` → `&#39;` |
| F-9 | `md-to-word/package.json:4` | 描述 `.docx` 实为 HTML-as-.doc | 改描述为 `.doc`，或换 docx 库做真 OOXML |
| F-10 | `md-to-pdf/lib/cli.js:74-99` | `info` 命令无 try/catch | 补齐，与 convert 一致 |
| F-11 | `md-to-latex/index.js` 文档外壳 | 无 CJK 支持，中文编译失败 | 检测 CJK 自动切 `\documentclass{ctexart}` + `geometry`/`listings` 配色 |
| F-12 | 反向转换 | 无 task list / strikethrough / 数学还原 | turndown-factory 启用 GFM 插件（A4 已含） |

---

## 6. 美化专题（转换效果增强）

> 用户特别要求。美化通过「主题/CSS 参数注入」实现，与转换正确性逻辑解耦。每个工具新增 `--theme` / `--style` 可选 flag，默认值保证向后兼容。

### 6.1 md-to-pdf（核心，29 主题已存在但渲染残缺）

**前提**：先做 F-1（补 KaTeX/hljs CSS），否则美化无意义。

| 美化项 | 实现 | 优先级 |
|---|---|---|
| **封面页** | 检测首个 H1，生成带标题/作者/日期的封面 `<div class="cover">`，`page-break-after: always` | 高 |
| **页码** | `@page { @bottom-right { content: counter(page) } }` + Puppeteer `displayHeaderFooter` | 高 |
| **目录页** | `--toc` flag：marked 解析后收集 H1-H3，生成带页码的 TOC（Puppeteer `getOutline`） | 中 |
| **Admonition 块** | 支持 `:::warning` / `:::info` GFM 扩展语法，渲染为彩色 callout 盒 | 中 |
| **代码块美化** | 圆角 + 阴影 + 行号 + 语言标签（右上角）+ 一键复制按钮（HTML 输出时） | 高 |
| **表格美化** | 斑马纹 + sticky 表头（`thead{display:table-header-group}`）+ 圆角边框 + hover 高亮 | 高 |
| **引用块美化** | 左侧彩色边条 + 浅底色 + 斜体 | 中 |
| **主题暗色匹配** | dark 主题自动选 `atom-one-dark` hljs CSS，light 选 `atom-one-light` | 中 |
| **字体调优** | CJK 用「思源黑体」，代码用 JetBrains Mono，正文行高 1.6-1.8 | 中 |

**主题 CSS 增量**（`md-to-pdf/lib/renderer.js` buildCss 末尾追加）：

```css
/* 封面 */
.cover { display: flex; flex-direction: column; justify-content: center;
  height: 100vh; text-align: center; page-break-after: always; }
.cover h1 { font-size: 2.4em; margin-bottom: .2em; }
.cover .meta { color: var(--t-muted); font-size: .9em; }

/* 代码块 */
pre { border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.08);
  position: relative; padding: 1em 1em 1em 0; }
pre code { counter-reset: line; display: block; }
pre code > .line { counter-increment: line; }
pre code > .line::before { content: counter(line); display: inline-block;
  width: 2em; color: var(--t-muted); text-align: right; padding-right: 1em; }
pre .lang-tag { position: absolute; top: 0; right: 0; font-size: .75em;
  color: var(--t-muted); padding: 2px 8px; }

/* 表格 */
table { border-collapse: collapse; width: 100%; border-radius: 6px; overflow: hidden; }
thead { display: table-header-group; }  /* 跨页重复 */
tr:nth-child(even) { background: var(--t-row-alt); }
tr:hover { background: var(--t-row-hover); }

/* 引用 */
blockquote { border-left: 4px solid var(--t-accent); background: var(--t-quote-bg);
  padding: .5em 1em; font-style: italic; border-radius: 0 4px 4px 0; }

/* Admonition */
.admonition { border-left: 4px solid; padding: .8em 1em; border-radius: 4px; margin: 1em 0; }
.admonition.warn { border-color: #d97706; background: #fef3c7; }
.admonition.info { border-color: #2563eb; background: #dbeafe; }
```

### 6.2 md-to-html

| 美化项 | 实现 |
|---|---|
| **默认主题** | 内置一套「GitHub Markdown 风格」精调 CSS，替代当前裸 HTML |
| **暗色模式** | `--theme dark` 或 `prefers-color-scheme` 自动切换，CSS 变量驱动 |
| **代码块** | 同 6.1，含复制按钮（HTML 可交互） |
| **目录侧栏** | `--toc-sidebar`：左侧 sticky TOC，滚动高亮当前章节 |
| **打印样式** | `@media print` 优化，可直接浏览器打印为 PDF |

### 6.3 md-to-word

| 美化项 | 实现 |
|---|---|
| **真 Word 样式** | 用 Word 命名空间样式（`Heading 1`/`Title`/`Quote`/`Source Code`），Word 能识别为原生样式而非直接格式 |
| **页面设置** | `@page Section1 { size: A4; margin: 2.54cm; }` mso 指令 |
| **表格样式** | 应用 `Table Grid` + 斑马纹底纹（`mso-pattern`） |
| **代码块** | 等宽字体 + 浅灰底 + 边框，语言标签 |
| **F-9 决策** | 若保持 HTML-as-.doc，描述改 `.doc`；若做真 `.docx`，换 `docx` 库（工作量 0.5 天，单列第三波后置） |

### 6.4 md-to-image

| 美化项 | 实现 |
|---|---|
| **padding/背景** | `--padding 40 --bg "#fff"` flag，默认浅色卡片 |
| **高 DPI** | `--scale 2` 传给 `page.screenshot`，retina 清晰 |
| **水印** | `--watermark "© 2026"` 右下角半透明 |
| **宽度自适应** | 已有 `-w`，补充自动测量内容宽度（`document.body.scrollWidth`） |

### 6.5 md-to-latex / rst（排版美化）

| 美化项 | 实现 |
|---|---|
| **CJK 支持** | latex 检测 CJK → `ctexart` 文档类 + `geometry` 页边距 + `xeCJK` 字体 |
| **代码高亮** | `listings` 配色方案（`lstdefinestyle`），行号，圆角框 |
| **超链接颜色** | `hyperref` 配 `colorlinks=true, linkcolor=..., urlcolor=...` |
| **表格美化** | `booktabs` 包（`\toprule/\midrule/\bottomrule`）替代默认横线 |
| **RST** | 默认 `.. default-role::` + 统一字符宽度处理 |

### 6.6 md-to-text

| 美化项 | 实现 |
|---|---|
| **结构保留** | 标题用大写 + 下划线分隔（`===`/`---`），列表保留缩进，表格用 ASCII 框线 |
| **宽度换行** | `--width 80` 软换行（可选） |

### 6.7 表格工具美化

| 工具 | 美化 |
|---|---|
| md-table-to-image | 专用表格主题（紧凑/舒适/极简），sticky 表头不适用（图片）但标题行加粗高亮 |
| md-table-to-pdf | A4 横向选项 `--landscape`，跨页表头重复（`thead{display:table-header-group}`），行内不断页（`tr{page-break-inside:avoid}`） |
| csv-to-md / json-to-md | 输出加对齐行（`:--:`）选项 `--align` |

---

## 7. 测试策略

### 7.1 框架

- 引入 `jest`（或 `node:test`，零依赖）作为根级 devDependency（workspace 后统一）。
- 每个工具目录加 `__tests__/index.test.js`，shared 模块加 `shared/__tests__/`。

### 7.2 测试矩阵（重点覆盖 P0 回归）

```
shared/__tests__/
├── gfm-table.test.js        # buildTable 转义、对齐、空值
├── csv.test.js              # RFC 4180：引号内换行/逗号/引号、BOM、"" 转义
├── md-table-parser.test.js  # \| 转义、空 cell、对齐行、多表、无表头
├── placeholders.test.js     # 占位符往返、碰撞、断言
└── html-renderer.test.js    # processMath 嵌套 $$、blockquote 代码块、还原无泄漏

各工具 __tests__/：
├── md-table-to-csv          # round-trip: csv-to-md 输出 → 还原，断言无损
├── csv-to-md                # 引号内换行、自动检测、BOM
├── md-to-latex              # escapeLatex 调用、脚注配对、CJK 文档
├── md-to-rst                # 标题下划线长度、脚注 # 配对
├── md-to-text               # 图片/链接顺序、代码块保护
├── html-to-md / word-to-md  # 表格 rule、无 thead
└── md-to-pdf                # 主题缓存、29≠25 去重、KaTeX/hljs CSS 注入
```

### 7.3 round-trip 不变量测试（关键）

```
csv → md → csv：assert 原始数据可还原（允许空 cell/逗号/引号）
md-table → csv → md-table：assert 表格结构等价
```

固化双向转换不变量，防止未来回归。

---

## 8. 迁移与风险

| 风险 | 缓解 |
|---|---|
| shared 抽取后旧工具行为微变 | 每抽一个模块，先加测试基线（第一波）再改 |
| 占位符升级（` ` 前缀）改变输出 | 仅影响含字面占位符的极端输入，正常输入无变化；加还原断言兜底 |
| md-to-word 改真 .docx 破坏现有用户依赖 | 默认仍输出 HTML-as-.doc，`--docx` flag 启用真 OOXML，作为可选 |
| npm workspace 迁移影响现有 `npm install` 流程 | 最后一步做，迁移后更新 README 安装说明；各目录 `node_modules` 可保留兼容 |
| 美化 CSS 改变默认输出外观 | 默认主题保持「接近原版」，美化效果通过新 flag 或新主题 id 提供，不修改现有主题 |

**回滚策略**：每波一个分支，合并前跑全量测试；第一波（止血）可独立合并，不依赖后续。

---

## 9. 里程碑与工作量估算

| 波次 | 内容 | 工作量 | 交付物 | 可合并 |
|---|---|---|---|---|
| **M1 止血** | P0-1~21 + 测试基线 | 1.5 天 | 12+ 回归测试通过，数据正确性 bug 清零 | ✅ 独立 |
| **M2 架构统一** | shared 8 模块 + 11 任务 + workspace | 2.5 天 | 重复代码消除，shared 复用率 > 80% | 依赖 M1 |
| **M3 功能增强** | F-1~12 | 1 天 | KaTeX/hljs 生效，缓存/去重修复 | 依赖 M2 |
| **M4 美化** | §6 全部 | 1.5 天 | 封面/页码/代码块/表格/暗色模式等 | 依赖 M3 的 CSS 注入 |
| **合计** | | **~6.5 天** | | |

**建议执行顺序**：M1 → M2 → M3 → M4，每波结束回归 + 合并。M3/M4 可并行（不同文件层）。

---

## 10. 验收清单

### 第一波完成标准
- [ ] P0-1~21 全部修复，每项有对应回归测试
- [ ] `csv → md → csv` round-trip 无损（空 cell / 逗号 / 引号 / 换行）
- [ ] `md-to-text` 图片不再残留 `!`
- [ ] `md-to-rst` 长标题无 RST 解析警告
- [ ] `md-to-latex` 含 `_` 标题编译通过
- [ ] `word-to-md` 表格输出为 GFM 语法
- [ ] `pdf-to-md` 空文本退出码为 1

### 第二波完成标准
- [ ] `shared/` 8 个新模块就位，各自有单测
- [ ] `getBrowser()` 仅 `shared/browser-pool.js` 一处实现
- [ ] `md-to-pdf/lib/renderer.js` 调用 `renderMarkdown`，不再重复
- [ ] `md-table-to-image/pdf` 使用 `createRenderer`（katex/hljs 生效）
- [ ] 占位符全仓用 ` ` 前缀 + 还原断言
- [ ] npm workspace 启用，依赖版本统一

### 第三波完成标准
- [ ] md-to-pdf 输出数学公式正确渲染（KaTeX CSS 注入）
- [ ] 代码块语法高亮可见（hljs 主题 CSS 注入）
- [ ] `listTemplates()` 返回真实数量，与 "29 total" 一致
- [ ] `loadTemplates` 缓存生效（二次调用不读盘）
- [ ] `escapeHtml` 转义单引号
- [ ] marked `highlight` 迁移到 `marked-highlight`

### 美化完成标准
- [ ] md-to-pdf 支持封面页 + 页码 + TOC（`--cover` / `--toc`）
- [ ] 代码块圆角 + 行号 + 语言标签
- [ ] 表格斑马纹 + 跨页表头重复
- [ ] md-to-html 支持暗色模式（`--theme dark`）
- [ ] md-to-image 支持高 DPI + 水印
- [ ] md-to-latex CJK 文档编译通过（`ctexart`）

---

## 附录：关键文件索引

| 文件 | 行数 | 角色 |
|---|---|---|
| `shared/html-renderer.js` | 87 | 共享渲染核心（marked+katex+hljs 工厂） |
| `md-to-latex/index.js` | 273 | 最大，正则管线 + 嵌套列表状态机 |
| `md-to-pdf/lib/renderer.js` | 191 | 主题 → CSS 生成器（独有核心） |
| `md-to-confluence/index.js` | 125 | 正则管线 |
| `md-to-rst/index.js` | 117 | 正则管线 |
| `md-to-pdf/templates.json` | 1480 | 29 主题数据 |
| `csv-to-md/index.js` | 90 | CSV 状态机解析 |
| `md-to-pdf/lib/converter.js` | 71 | Puppeteer 适配 |
| `md-to-image/index.js` | 78 | marked + puppeteer 截图 |

---

*本方案基于 commit `c95cfb8` 的代码全量阅读 + git 历史交叉验证生成。每项均带 file:line 引用，可直接据此开 issue / 切分支执行。*
