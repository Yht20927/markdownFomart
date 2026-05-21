#!/usr/bin/env node
const { program } = require('commander');
const { Marked } = require('marked');
const katex = require('katex');
const hljs = require('highlight.js');
const { createRenderer } = require('../shared/html-renderer');
const fs = require('fs');
const path = require('path');

const { renderMarkdown } = createRenderer({ Marked, katex, hljs });

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

function markdownToHtml(md) {
  const body = renderMarkdown(md);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>Markdown to HTML</title></head>
<body>
${body}
</body>
</html>`;
}

program
  .name('md-to-html')
  .description('Convert Markdown to clean HTML5')
  .version(pkg.version);

program.command('convert')
  .description('Convert a Markdown file to HTML')
  .requiredOption('-i, --input <file>', 'Input Markdown file')
  .requiredOption('-o, --output <file>', 'Output HTML file')
  .action(async (opts) => {
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    if (!fs.existsSync(input)) { console.error('Input file not found'); process.exit(1); }
    const md = fs.readFileSync(input, 'utf-8');
    const html = markdownToHtml(md);
    fs.writeFileSync(output, html, 'utf-8');
    console.log(`Done: ${output} (${Buffer.byteLength(html)} bytes)`);
  });

program.parse();
