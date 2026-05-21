---
name: md-to-pdf
description: Convert Markdown to PDF with 29 professional templates, KaTeX math, and syntax highlighting
triggers:
  - Convert Markdown to PDF
  - Export markdown as PDF with theme
  - Markdown 转 PDF
  - List available PDF themes
  - Generate formatted PDF from markdown
  - md to pdf
---

# md-to-pdf Skill

Convert Markdown files to beautifully formatted PDF documents with 29 professional templates.

## Usage

### List all themes

```bash
node index.js list                  # All themes by category
node index.js list -c business      # Filter by category
```

### Convert Markdown to PDF

```bash
node index.js convert -i input.md -o output.pdf
node index.js convert -i input.md -o output.pdf -t ocean-blue-cjk-standard-standard
node index.js convert -i input.md -o output.html -t classic  # Preview as HTML
```

### Show theme details

```bash
node index.js info github-dark-sans-modern-standard
```

## Available Themes (29)

### Business (7)
| ID | Name | Font |
|---|---|---|
| `classic` | Classic | Microsoft YaHei |
| `modern` | Modern | Inter |
| `ocean-blue-cjk-standard-standard` | Ocean Blue | Noto Serif SC / Noto Sans SC |
| `corporate-gray-cjk-standard-standard` | Corporate Gray | Noto Serif SC / Noto Sans SC |
| `navy-gold-cjk-standard-standard` | Navy Gold | Noto Serif SC / Noto Sans SC |
| `sunset-orange-cjk-standard-standard` | Sunset Orange | Noto Serif SC / Noto Sans SC |

### Tech / Developer (5)
| ID | Name | Font |
|---|---|---|
| `github-dark-sans-modern-standard` | GitHub Style | Inter |
| `vscode-blue-sans-modern-standard` | VS Code Blue | Inter |
| `terminal-green-sans-modern-standard` | Terminal Green | Inter |
| `dracula-purple-sans-modern-standard` | Dracula Purple | Inter |

### Minimal / Clean (5)
| ID | Name | Font |
|---|---|---|
| `minimal` | Minimal | Noto Serif SC / Noto Sans SC |
| `pure-mono-cjk-standard-standard` | Pure Mono | Noto Serif SC / Noto Sans SC |
| `warm-gray-cjk-standard-standard` | Warm Gray | Noto Serif SC / Noto Sans SC |
| `soft-ink-cjk-standard-standard` | Soft Ink | Noto Serif SC / Noto Sans SC |

### Academic / Paper (3)
| ID | Name | Font |
|---|---|---|
| `academic-green-serif-classic-standard` | Academic Green | Georgia |
| `classic-sepia-serif-classic-standard` | Classic Sepia | Georgia |
| `scholarly-wine-serif-classic-standard` | Scholarly Wine | Georgia |

### Creative (5)
| ID | Name | Font |
|---|---|---|
| `sunset-orange-mixed-elegant-standard` | Sunset Orange | Playfair Display |
| `sakura-pink-mixed-elegant-standard` | Sakura Pink | Playfair Display |
| `ocean-teal-mixed-elegant-standard` | Ocean Teal | Playfair Display |
| `lavender-dream-mixed-elegant-standard` | Lavender Dream | Playfair Display |
| `forest-moss-mixed-elegant-standard` | Forest Moss | Playfair Display |

Each theme supports 3 spacing variants via suffix:
- `-standard` — Default spacing
- `-compact` — Denser layout, more content per page
- `-relaxed` — Extra whitespace for readability

## Features

- **29 professional templates** replicated from md-to.com
- **Smart pagination** — code blocks stay intact, table headers repeat, headings won't orphan
- **Math formulas** — Full KaTeX support (inline $...$ and block $$...$$)
- **Syntax highlighting** — Code blocks auto-detected and highlighted via highlight.js
- **CJK support** — Optimized Chinese/Japanese font stacks (Noto Sans/Serif SC)
- **100% local** — No network calls, no uploads, no registration
- **Fast** — Single browser instance reused across conversions

## Dependencies

- `marked` — Markdown parsing (GFM, tables, task lists)
- `katex` — LaTeX math rendering
- `highlight.js` — Code syntax highlighting
- `puppeteer` — HTML to PDF via Chromium print engine
- `commander` — CLI argument parsing

Install with:
```bash
npm install
```

Requires Node.js >= 18.
