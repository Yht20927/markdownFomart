#!/usr/bin/env node
const { program } = require('commander');
const TurndownService = require('turndown');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

// Same config as md-to.com: atx headings, fenced code blocks
const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

program
  .name('html-to-md')
  .description('Convert HTML to Markdown (powered by turndown)')
  .version(pkg.version);

program.command('convert')
  .description('Convert an HTML file to Markdown')
  .requiredOption('-i, --input <file>', 'Input HTML file')
  .requiredOption('-o, --output <file>', 'Output Markdown file')
  .action(async (opts) => {
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    if (!fs.existsSync(input)) { console.error('Input file not found'); process.exit(1); }
    const html = fs.readFileSync(input, 'utf-8');
    const md = turndown.turndown(html);
    fs.writeFileSync(output, md, 'utf-8');
    console.log(`Done: ${output} (${md.length} chars)`);
  });

program.parse();
