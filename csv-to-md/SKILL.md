---
name: csv-to-md
description: CSV data to Markdown table conversion with auto delimiter detection
triggers:
  - Convert CSV to Markdown table
  - CSV 转 Markdown 表格
  - Generate markdown table from CSV
  - csv to md table
---

# csv-to-md Skill

CSV data to Markdown tables. Auto-detects delimiter (comma, tab, semicolon). Same approach as md-to.com.

## Usage

```bash
node index.js convert -i input.csv -o output.md        # Auto-detect delimiter
node index.js convert -i input.csv -o output.md -d ';' # Specify delimiter
```
