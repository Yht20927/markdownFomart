#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

// Markdown to Confluence wiki markup converter
// Replicates md-to.com's confluence-converter logic
function mdToConfluence(md) {
  let result = md;

  // Protect fenced code blocks before any other transforms
  const codeBlocks = [];
  result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    codeBlocks.push({ lang, code: code.trim() });
    return `__FENCED_${codeBlocks.length - 1}__`;
  });

  // Headers
  result = result.replace(/^######\s+(.+)$/gm, 'h6. $1');
  result = result.replace(/^#####\s+(.+)$/gm, 'h5. $1');
  result = result.replace(/^####\s+(.+)$/gm, 'h4. $1');
  result = result.replace(/^###\s+(.+)$/gm, 'h3. $1');
  result = result.replace(/^##\s+(.+)$/gm, 'h2. $1');
  result = result.replace(/^#\s+(.+)$/gm, 'h1. $1');

  // Bold: **text** → *text* (use temp marker to protect from italic pass)
  result = result.replace(/\*\*(.+?)\*\*/g, '__BOLD_$1_BOLD__');

  // Italic: *text* → _text_
  result = result.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '_$1_');

  // Restore bold
  result = result.replace(/__BOLD_(.+?)_BOLD__/g, '*$1*');

  // Inline code: `code` → {{code}}
  result = result.replace(/`([^\n`]+)`/g, '{{$1}}');

  // Links: [text](url) → [text|url]
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '[$1|$2]');

  // Images: ![alt](url) → !url!
  result = result.replace(/!\[(.+?)\]\((.+?)\)/g, '!$2!');

  // Blockquotes: > → bq.
  result = result.replace(/^>\s+(.+)$/gm, 'bq. $1');

  // Horizontal rules: --- or *** → ----
  result = result.replace(/^[-*]{3,}$/gm, '----');

  // Unordered lists
  result = result.replace(/^[-*+]\s+/gm, '* ');

  // Ordered lists: 1. → #
  result = result.replace(/^\d+\.\s+/gm, '# ');

  // Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    const cb = codeBlocks[i];
    const langAttr = cb.lang ? `:language=${cb.lang}` : '';
    result = result.replace(`__FENCED_${i}__`, `{code${langAttr}}\n${cb.code}\n{code}`);
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

program
  .name('md-to-confluence')
  .description('Convert Markdown to Confluence wiki markup')
  .version(pkg.version);

program.command('convert')
  .description('Convert a Markdown file to Confluence markup')
  .requiredOption('-i, --input <file>', 'Input Markdown file')
  .requiredOption('-o, --output <file>', 'Output file')
  .action(async (opts) => {
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    if (!fs.existsSync(input)) { console.error('Input file not found'); process.exit(1); }
    const md = fs.readFileSync(input, 'utf-8');
    const result = mdToConfluence(md);
    fs.writeFileSync(output, result, 'utf-8');
    console.log(`Done: ${output} (${result.length} chars)`);
  });

program.parse();
