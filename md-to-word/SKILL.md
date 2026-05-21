---
name: md-to-word
description: Convert Markdown to Word (.doc) via MSO-compatible HTML with code highlighting
triggers:
  - Convert Markdown to Word
  - Export markdown as doc
  - Markdown 转 Word
  - Generate Word document from md
  - md to docx
---

# md-to-word Skill

Convert Markdown to Word (.doc). Uses mso-compatible HTML with code highlighting and math rendering — same approach as md-to.com.

## Usage

```bash
node index.js convert -i input.md -o output.doc
```

Open the .doc file in Microsoft Word — it renders with proper heading styles, code blocks, tables, and formatting.
