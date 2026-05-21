#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

function mdToRst(md) {
  let result = md;

  // Code blocks (extract first)
  const codeBlocks = [];
  result = result.replace(/^[^\S\n]*```(\w*)\n([\s\S]*?)\n[^\S\n]*```/gm, (_m, lang, code) => {
    codeBlocks.push({ lang, code: code.trim() });
    return `<<CODEBLOCK_${codeBlocks.length - 1}>>`;
  });

  // Also extract code blocks inside blockquotes
  result = result.replace(/^> ```(\w*)\n((?:^> [^\n]*\n?)*?)^> ```/gm, (_m, lang, code) => {
    const cleaned = code.split('\n').map(l => l.replace(/^> ?/, '')).join('\n').trim();
    codeBlocks.push({ lang, code: cleaned });
    return `> <<CODEBLOCK_${codeBlocks.length - 1}>>`;
  });

  // Protect footnote definitions [^label]: from link regex
  const footnotes = [];
  result = result.replace(/^\[\^(.+?)\]:\s*(.*)$/gm, (_m, label, content) => {
    footnotes.push({ label, content });
    return `<<FN_${footnotes.length - 1}>>`;
  });

  // Headers — RST uses underline adornments
  // Use underline-only (simpler, more compatible)
  result = result.replace(/^######\s+(.+)$/gm, '$1\n""""\n');
  result = result.replace(/^#####\s+(.+)$/gm, '$1\n^^^^^\n');
  result = result.replace(/^####\s+(.+)$/gm, '$1\n~~~~~\n');
  result = result.replace(/^###\s+(.+)$/gm, '$1\n-----\n');
  result = result.replace(/^##\s+(.+)$/gm, '$1\n=====\n');
  result = result.replace(/^#\s+(.+)$/gm, '$1\n=====\n');

  // Bold: **text** → **text**
  // Italic: *text* → *text*  (same in RST)

  // Inline code: `code` → ``code``
  result = result.replace(/`([^`]+)`/g, '``$1``');

  // Images: ![alt](url) → .. image:: url\n   :alt: alt  (BEFORE links!)
  result = result.replace(/!\[(.+?)\]\((.+?)\)/g, '.. image:: $2\n   :alt: $1\n');

  // Links: [text](url) → `text <url>`_
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '`$1 <$2>`_');

  // Footnote references [^label] → RST [#label]_
  result = result.replace(/\[\^(.+?)\]/g, '[#$1]_');

  // Footnote refs [^label] → preserve
  // (already handled by not matching link pattern since ^ is in brackets)

  // Blockquotes → handle multi-line blocks
  result = result.replace(/((?:^>[^\n]*\n?)+)/gm, (match) => {
    const lines = match.split('\n').map(l => l.replace(/^>\s?/, ''));
    return lines.map(l => '    ' + l).join('\n') + '\n';
  });

  // Unordered lists: preserve indentation for nested lists
  result = result.replace(/^(\s*)[-*+]\s+/gm, '$1* ');

  // Ordered lists: use #. for auto-numbering, preserve indentation
  result = result.replace(/^(\s*)\d+\.\s+/gm, '$1#. ');

  // Horizontal rule: --- → ----
  result = result.replace(/^[-*]{3,}$/gm, '----');

  // Restore code blocks (RST uses :: then indented block)
  for (let i = 0; i < codeBlocks.length; i++) {
    const cb = codeBlocks[i];
    const langOpt = cb.lang ? `\n   :language: ${cb.lang}` : '';
    const indented = cb.code.split('\n').map(l => '   ' + l).join('\n');
    const restored = `.. code::${langOpt}\n\n${indented}`;
    result = result.replace(`> <<CODEBLOCK_${i}>>`, restored);
    result = result.replace(`<<CODEBLOCK_${i}>>`, restored);
  }

  // Restore footnotes
  for (let i = 0; i < footnotes.length; i++) {
    const fn = footnotes[i];
    // Process markdown in footnote content
    let content = fn.content
      .replace(/\*\*(.+?)\*\*/g, '**$1**')
      .replace(/\[(.+?)\]\((.+?)\)/g, '`$1 <$2>`_');
    result = result.replace(`<<FN_${i}>>`, `.. [${fn.label}] ${content}`);
  }

  result = result.replace(/\n{3,}/g, '\n\n').trim();
  return result;
}

program
  .name('md-to-rst')
  .description('Convert Markdown to reStructuredText')
  .version(pkg.version);

program.command('convert')
  .description('Convert a Markdown file to RST')
  .requiredOption('-i, --input <file>', 'Input Markdown file')
  .requiredOption('-o, --output <file>', 'Output .rst file')
  .action(async (opts) => {
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    if (!fs.existsSync(input)) { console.error('Input file not found'); process.exit(1); }
    const md = fs.readFileSync(input, 'utf-8');
    const result = mdToRst(md);
    fs.writeFileSync(output, result, 'utf-8');
    console.log(`Done: ${output} (${result.length} chars)`);
  });

program.parse();
