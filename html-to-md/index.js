#!/usr/bin/env node
const { program } = require('commander');
const TurndownService = require('turndown');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

// Same config as md-to.com: atx headings, fenced code blocks
const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

// Custom table rule — turndown doesn't support GFM tables natively
turndown.addRule('table', {
  filter: 'table',
  replacement: function (_content, node) {
    const rows = [];
    const thead = node.querySelector('thead');
    const tbody = node.querySelector('tbody');
    let headers = [];

    if (thead) {
      const headerRow = thead.querySelector('tr');
      if (headerRow) {
        headers = Array.from(headerRow.querySelectorAll('th, td')).map(th =>
          (th.textContent || '').trim()
        );
      }
    }

    // Build header
    if (headers.length > 0) {
      rows.push('| ' + headers.join(' | ') + ' |');
      rows.push('| ' + headers.map(() => '---').join(' | ') + ' |');
    }

    // Build body rows
    if (tbody) {
      const dataRows = Array.from(tbody.querySelectorAll('tr'));
      for (const tr of dataRows) {
        const cells = Array.from(tr.querySelectorAll('td, th')).map(td =>
          (td.textContent || '').trim()
        );
        if (cells.length > 0) rows.push('| ' + cells.join(' | ') + ' |');
      }
    }

    return rows.length > 0 ? '\n' + rows.join('\n') + '\n' : '';
  }
});

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
