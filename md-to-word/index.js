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

const msoCss = `
  body { font-family: 'Calibri', sans-serif; font-size: 11pt; color: #000; line-height: 1.5; margin: 0; }
  h1 { font-size: 16pt; color: #2E74B5; mso-style-parent: ""; margin-bottom: 6pt; }
  h2 { font-size: 14pt; color: #2E74B5; margin-bottom: 4pt; }
  h3 { font-size: 12pt; color: #1F3864; margin-bottom: 3pt; }
  pre { background: #F2F2F2; border: 1px solid #D4D4D4; padding: 8pt; font-family: Consolas, monospace; font-size: 9pt; }
  code { font-family: Consolas, monospace; font-size: 9pt; background: #F2F2F2; padding: 1pt 3pt; }
  pre code { padding: 0; background: none; }
  blockquote { border-left: 4px solid #CCC; padding: 4pt 12pt; color: #666; font-style: italic; margin: 6pt 0; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th { background: #F2F2F2; font-weight: bold; padding: 4pt 8pt; border: 1px solid #BFBFBF; }
  td { padding: 3pt 8pt; border: 1px solid #BFBFBF; }
  img { max-width: 100%; }
  a { color: #0563C1; }
`;

program
  .name('md-to-word')
  .description('Convert Markdown to Word (.doc)')
  .version(pkg.version);

program.command('convert')
  .description('Convert a Markdown file to Word .doc')
  .requiredOption('-i, --input <file>', 'Input Markdown file')
  .requiredOption('-o, --output <file>', 'Output .doc file')
  .action(async (opts) => {
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    if (!fs.existsSync(input)) { console.error('Input file not found'); process.exit(1); }
    const md = fs.readFileSync(input, 'utf-8');
    const bodyHtml = renderMarkdown(md);
    const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>${msoCss}</style></head>
<body>${bodyHtml}</body></html>`;
    fs.writeFileSync(output, docHtml, 'utf-8');
    console.log(`Done: ${output} (${Buffer.byteLength(docHtml)} bytes)`);
  });

program.parse();
