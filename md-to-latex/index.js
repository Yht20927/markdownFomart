#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

function escapeLatex(str) {
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, (c) => '\\' + c)
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// P0-15: Apply escapeLatex to heading/link/list text to prevent LaTeX compilation errors
function escapeLatexText(str) {
  // Only escape if not already escaped (check for leading backslash before special chars)
  return str
    .replace(/(?<!\\)&/g, '\\&')
    .replace(/(?<!\\)%/g, '\\%')
    .replace(/(?<!\\)\$/g, '\\$')
    .replace(/(?<!\\)#/g, '\\#')
    .replace(/(?<!\\)_{1}(?!\{)/g, '\\_')
    .replace(/(?<!\\)\{/g, '\\{')
    .replace(/(?<!\\)\}/g, '\\}')
    .replace(/(?<!\\)~/g, '\\textasciitilde{}')
    .replace(/(?<!\\)\^/g, '\\textasciicircum{}');
}

// Escape LaTeX special chars, but protect against double-escaping math $...$
function latexEscapeCell(str) {
  return str
    .replace(/\\\|/g, '|')     // unescape MD pipe first
    .replace(/\\`/g, '`')
    .replace(/\\\*/g, '*')
    .replace(/\|/g, '\\textbar{}')
    // P0-16: Add missing LaTeX special chars for table cells
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/</g, '$<$')
    .replace(/>/g, '$>$');
}

// Split a markdown table row into cells, respecting escaped pipes
function splitTableRow(row) {
  const trimmed = row.replace(/^\||\|$/g, '');
  const cells = [];
  let current = '';
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '\\' && i + 1 < trimmed.length && trimmed[i + 1] === '|') {
      current += '\\|';
      i++;
    } else if (trimmed[i] === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += trimmed[i];
    }
  }
  cells.push(current.trim());
  return cells;
}

// Convert a markdown table to LaTeX tabular
function markdownTableToLatex(tableText) {
  const lines = tableText.trim().split('\n').map(l => l.trim());
  if (lines.length < 2) return tableText;

  // Parse header row
  const header = splitTableRow(lines[0]).map(c => latexEscapeCell(c));

  // Parse alignment from separator row
  const sep = splitTableRow(lines[1]);
  const alignSpec = sep.map(s => {
    const cell = s.trim();
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'c';
    if (right) return 'r';
    return 'l';
  });

  const fullSpec = '|' + alignSpec.join('|') + '|';

  let out = '\\begin{tabular}{' + fullSpec + '}\n\\hline\n';
  out += header.join(' & ') + ' \\\\\n\\hline\n';

  // Data rows
  for (let i = 2; i < lines.length; i++) {
    const cells = splitTableRow(lines[i]).map(c => latexEscapeCell(c));
    if (cells.length > 0 && cells.some(c => c.length > 0)) {
      out += cells.join(' & ') + ' \\\\\n';
    }
  }
  out += '\\hline\n\\end{tabular}\n';
  return out;
}

function mdToLatex(md) {
  let result = md;

  // 1. Code blocks (extract first to protect from other transforms)
  const codeBlocks = [];
  result = result.replace(/^[^\S\n]*```(\w*)\n([\s\S]*?)\n[^\S\n]*```/gm, (_m, lang, code) => {
    codeBlocks.push({ lang, code: code.trim() });
    return `<<CODEBLOCK_${codeBlocks.length - 1}>>`;
  });

  // Also extract code blocks inside blockquotes (> ```lang \n > code \n > ```)
  result = result.replace(/^> ```(\w*)\n((?:^> [^\n]*\n?)*?)^> ```/gm, (_m, lang, code) => {
    const cleaned = code.split('\n').map(l => l.replace(/^> ?/, '')).join('\n').trim();
    codeBlocks.push({ lang, code: cleaned });
    return `> <<CODEBLOCK_${codeBlocks.length - 1}>>`;
  });

  // 2. Protect markdown tables from inline processing (backticks/$ in cells)
  const tables = [];
  result = result.replace(/^\|.+\|\s*$(?:\n^\|[- :|]+\|\s*$(?:\n^\|.+\|\s*$)*)?/gm, (match) => {
    tables.push(match);
    return `<<TABLE_${tables.length - 1}>>`;
  });

  // 3. Protect footnote definitions [^label]: from link/image regex
  // P0-17: Track label→content mapping for proper \footnote{content} substitution
  const footnoteMap = new Map(); // label → content
  result = result.replace(/^\[\^(.+?)\]:\s*(.*)$/gm, (_m, label, content) => {
    footnoteMap.set(label, content);
    return `<<FNDEF_${label}>>`;
  });

  // 4. Headers (fix: \chapter → \section for article class)
  // P0-15: Escape LaTeX special chars in heading text
  result = result.replace(/^######\s+(.+)$/gm, (_m, title) => '\\subparagraph{' + escapeLatexText(title) + '}');
  result = result.replace(/^#####\s+(.+)$/gm, (_m, title) => '\\paragraph{' + escapeLatexText(title) + '}');
  result = result.replace(/^####\s+(.+)$/gm, (_m, title) => '\\subsubsection{' + escapeLatexText(title) + '}');
  result = result.replace(/^###\s+(.+)$/gm, (_m, title) => '\\subsection{' + escapeLatexText(title) + '}');
  result = result.replace(/^##\s+(.+)$/gm, (_m, title) => '\\section{' + escapeLatexText(title) + '}');
  result = result.replace(/^#\s+(.+)$/gm, (_m, title) => '\\section{' + escapeLatexText(title) + '}');  // was \chapter

  // 5. Strikethrough (add ulem package in preamble)
  result = result.replace(/~~(.+?)~~/g, '\\sout{$1}');

  // 6. Bold & italic (handle ***bold italic*** first)
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '\\textbf{\\textit{$1}}');
  result = result.replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}');
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '\\textit{$1}');

  // 7. Inline code
  result = result.replace(/`([^`\n]+)`/g, '\\texttt{$1}');

  // 8. Images — MUST be before links (![ has [ inside)
  result = result.replace(/!\[(.+?)\]\((.+?)\)/g, '\\includegraphics[width=\\linewidth]{$2}');

  // 10. Links — escape special chars in link text
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, (_m, text, url) => '\\href{' + url + '}{' + escapeLatexText(text) + '}');

  // 11. Footnote references [^label] — after links to avoid double-matching
  // P0-17: Replace with \footnote{actual content} using the label→content map
  result = result.replace(/\[\^(.+?)\]/g, (_m, label) => {
    const content = footnoteMap.get(label);
    if (content) {
      // Process inline markdown in footnote content
      let processed = content
        .replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}')
        .replace(/`(.+?)`/g, '\\texttt{$1}')
        .replace(/\[(.+?)\]\((.+?)\)/g, '\\href{$2}{$1}');
      return '\\footnote{' + processed + '}';
    }
    return '\\footnote{' + escapeLatexText(label) + '}';
  });

  // 12. Blockquotes — handle multi-line (consecutive > lines)
  result = result.replace(/((?:^>[^\n]*\n?)+)/gm, (match) => {
    const content = match.split('\n')
      .map(l => l.replace(/^>\s?/, ''))
      .filter(l => l.trim())
      .join('\n');
    return '\\begin{quote}\n' + content + '\n\\end{quote}\n';
  });

  // 13. Task list items — BEFORE regular unordered lists to avoid conflict
  result = result.replace(/^(\s*)[-*+]\s+\[x\]\s+(.+)$/gim, (_m, indent, text) => indent + '\\uitem ' + escapeLatexText(text) + ' $\\checkmark$');
  result = result.replace(/^(\s*)[-*+]\s+\[ \]\s+(.+)$/gim, (_m, indent, text) => indent + '\\uitem ' + escapeLatexText(text) + ' $\\square$');

  // 14. Ordered lists — match indented items too
  result = result.replace(/^(\s*)\d+\.\s+(.+)$/gm, (_m, indent, text) => indent + '\\oitem ' + escapeLatexText(text));

  // 15. Unordered lists — match indented items too
  result = result.replace(/^(\s*)[-*+]\s+(.+)$/gm, (_m, indent, text) => indent + '\\uitem ' + escapeLatexText(text));

  // 16. Nest lists via state machine (tracks indent depth for proper environment nesting)
  //     Replaces flat regex grouping with hierarchical nesting
  result = (function nestLatexLists(text) {
    const lines = text.split('\n');
    const out = [];
    const stack = []; // {indent, type}[]  type = 'itemize' | 'enumerate'

    for (const line of lines) {
      // Detect list item marker with indentation
      const itemMatch = line.match(/^(\s*)\\([ou]item)\s/);
      if (!itemMatch) {
        // Non-list line: close ALL open environments
        while (stack.length > 0) out.push('\\end{' + stack.pop().type + '}');
        out.push(line);
        continue;
      }

      const indent = itemMatch[1].length;
      const type = itemMatch[2] === 'oitem' ? 'enumerate' : 'itemize';

      // Close environments that are deeper OR at same depth but different type
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.indent < indent) break;                    // deeper nesting → keep open
        if (top.indent === indent && top.type === type) break; // same level/type → keep
        out.push('\\end{' + stack.pop().type + '}');      // close
      }

      // Open new environment if needed
      if (stack.length === 0 || stack[stack.length - 1].type !== type || stack[stack.length - 1].indent < indent) {
        out.push('\\begin{' + type + '}');
        stack.push({ indent, type });
      }

      out.push(line);
    }

    // Close all remaining environments
    while (stack.length > 0) out.push('\\end{' + stack.pop().type + '}');
    return out.join('\n');
  })(result);

  // 17. Normalize \uitem / \oitem → \item
  result = result.replace(/\\[ou]item /g, '\\item ');

  // 18. Horizontal rule
  result = result.replace(/^[-*]{3,}$/gm, '\\hrulefill');

  // 19. Restore and convert tables
  for (let i = 0; i < tables.length; i++) {
    result = result.replace(`<<TABLE_${i}>>`, markdownTableToLatex(tables[i]));
  }

  // 20. Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    const cb = codeBlocks[i];
    const langOpt = cb.lang ? `[${cb.lang}]` : '';
    const restored = `\\begin{lstlisting}${langOpt}\n${cb.code}\n\\end{lstlisting}`;
    result = result.replace(`> <<CODEBLOCK_${i}>>`, restored);
    result = result.replace(`<<CODEBLOCK_${i}>>`, restored);
  }

  // 21. Remove footnote definition placeholders (P0-17: content already inlined via \footnote{})
  for (const [label] of footnoteMap) {
    result = result.replace(`<<FNDEF_${label}>>`, '');
  }

  result = result.replace(/\n{3,}/g, '\n\n').trim();

  // F-11: Detect CJK characters and use ctexart for proper Chinese/Japanese/Korean support
  const hasCJK = /[一-鿿㐀-䶿豈-﫿぀-ゟ゠-ヿ가-힯]/.test(result);
  const docClass = hasCJK ? 'ctexart' : 'article';
  const cjkPackages = hasCJK ? `
\\usepackage{geometry}
\\geometry{a4paper, margin=2.5cm}` : '';

  return `\\documentclass{${docClass}}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{listings}
\\usepackage{xcolor}
\\usepackage[normalem]{ulem}
\\usepackage{amssymb}${cjkPackages}

\\begin{document}

${result}

\\end{document}
`;
}

program
  .name('md-to-latex')
  .description('Convert Markdown to LaTeX')
  .version(pkg.version);

program.command('convert')
  .description('Convert a Markdown file to LaTeX')
  .requiredOption('-i, --input <file>', 'Input Markdown file')
  .requiredOption('-o, --output <file>', 'Output .tex file')
  .action(async (opts) => {
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    if (!fs.existsSync(input)) { console.error('Input file not found'); process.exit(1); }
    const md = fs.readFileSync(input, 'utf-8');
    const result = mdToLatex(md);
    fs.writeFileSync(output, result, 'utf-8');
    console.log(`Done: ${output} (${result.length} chars)`);
  });

program.parse();
