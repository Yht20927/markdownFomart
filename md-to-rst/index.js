#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

function mdToRst(md) {
  let result = md;

  // Code blocks (extract first)
  const codeBlocks = [];
  result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    codeBlocks.push({ lang, code: code.trim() });
    return `<<CODEBLOCK_${codeBlocks.length - 1}>>`;
  });

  // Headers — RST uses underline adornments
  // # H1 → H1\n=====
  result = result.replace(/^#\s+(.+)$/gm, '=====\n$1\n=====');
  result = result.replace(/^##\s+(.+)$/gm, '$1\n=====');
  result = result.replace(/^###\s+(.+)$/gm, '$1\n-----');
  result = result.replace(/^####\s+(.+)$/gm, '$1\n~~~~~');
  result = result.replace(/^#####\s+(.+)$/gm, '$1\n^^^^^');
  result = result.replace(/^######\s+(.+)$/gm, '$1\n""""');

  // Bold: **text** → **text**
  // Italic: *text* → *text*  (same in RST)

  // Inline code: `code` → ``code``
  result = result.replace(/`(.+?)`/g, '``$1``');

  // Links: [text](url) → `text <url>`_
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '`$1 <$2>`_');

  // Images: ![alt](url) → .. image:: url\n   :alt: alt
  result = result.replace(/!\[(.+?)\]\((.+?)\)/g, '.. image:: $2\n   :alt: $1');

  // Blockquotes → indented (simplified)
  result = result.replace(/^>\s+(.+)$/gm, '    $1');

  // Unordered lists: - → *
  result = result.replace(/^[-+]\s+/gm, '* ');

  // Ordered lists: 1. → 1.  or use #. auto-numbering
  // RST uses #. for auto-numbering
  result = result.replace(/^\d+\.\s+/gm, '#. ');

  // Horizontal rule: --- → ----
  result = result.replace(/^[-*]{3,}$/gm, '----');

  // Restore code blocks (RST uses :: then indented block)
  for (let i = 0; i < codeBlocks.length; i++) {
    const cb = codeBlocks[i];
    const langOpt = cb.lang ? `\n   :language: ${cb.lang}` : '';
    const indented = cb.code.split('\n').map(l => '   ' + l).join('\n');
    result = result.replace(`<<CODEBLOCK_${i}>>`, `.. code::${langOpt}\n\n${indented}`);
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
