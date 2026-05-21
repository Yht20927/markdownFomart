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

function mdToLatex(md) {
  let result = md;

  // Code blocks (extract first to protect from other transforms)
  const codeBlocks = [];
  result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    codeBlocks.push({ lang, code: code.trim() });
    return `<<CODEBLOCK_${codeBlocks.length - 1}>>`;
  });

  // Headers
  result = result.replace(/^######\s+(.+)$/gm, '\\subparagraph{$1}');
  result = result.replace(/^#####\s+(.+)$/gm, '\\paragraph{$1}');
  result = result.replace(/^####\s+(.+)$/gm, '\\subsubsection{$1}');
  result = result.replace(/^###\s+(.+)$/gm, '\\subsection{$1}');
  result = result.replace(/^##\s+(.+)$/gm, '\\section{$1}');
  result = result.replace(/^#\s+(.+)$/gm, '\\chapter{$1}');

  // Bold and italic
  result = result.replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}');
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '\\textit{$1}');

  // Inline code
  result = result.replace(/`(.+?)`/g, '\\texttt{$1}');

  // Links
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '\\href{$2}{$1}');

  // Images
  result = result.replace(/!\[(.+?)\]\((.+?)\)/g, '\\includegraphics[width=\\linewidth]{$2}');

  // Blockquotes
  result = result.replace(/^>\s+(.+)$/gm, '\\begin{quote}$1\\end{quote}');

  // Ordered lists (process first, use temp marker to avoid double-wrap)
  result = result.replace(/^\d+\.\s+(.+)$/gm, '\\oitem $1');
  result = result.replace(/((?:\\oitem .+\n?)+)/g, '\\begin{enumerate}\n$1\\end{enumerate}\n');
  result = result.replace(/\\oitem /g, '\\item ');

  // Unordered lists (use temp marker)
  result = result.replace(/^[-*+]\s+(.+)$/gm, '\\uitem $1');
  result = result.replace(/((?:\\uitem .+\n?)+)/g, '\\begin{itemize}\n$1\\end{itemize}\n');
  result = result.replace(/\\uitem /g, '\\item ');

  // Horizontal rule
  result = result.replace(/^[-*]{3,}$/gm, '\\hrulefill');

  // Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    const cb = codeBlocks[i];
    const langOpt = cb.lang ? `[${cb.lang}]` : '';
    result = result.replace(`<<CODEBLOCK_${i}>>`, `\\begin{lstlisting}${langOpt}\n${cb.code}\n\\end{lstlisting}`);
  }

  // Math stays as-is (already LaTeX compatible)

  result = result.replace(/\n{3,}/g, '\n\n').trim();

  // Wrap in document
  return `\\documentclass{article}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{listings}
\\usepackage{xcolor}

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
