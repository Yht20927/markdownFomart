#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

// Replicates md-to.com's table-converters Markdown→CSV logic
function markdownTableToCSV(md) {
  // Find all markdown tables in the text
  const tableRegex = /^\|.+\|\s*$(?:\n^\|[- :|]+\|\s*$(?:\n^\|.+\|\s*$)*)?/gm;
  const tables = md.match(tableRegex);
  if (!tables || tables.length === 0) return '';

  const results = [];
  for (const table of tables) {
    const lines = table.trim().split('\n');
    // Filter out separator line (| --- | --- |)
    const dataLines = lines.filter(l => !/^\|[\s\-:]+\|$/.test(l));

    const rows = dataLines.map(line => {
      const cells = line.split('|')
        .map(c => c.trim())
        .filter(c => c.length > 0);
      return cells;
    });

    if (rows.length > 0) {
      results.push(rows.map(r => r.join(',')).join('\n'));
    }
  }

  return results.join('\n\n');
}

program
  .name('md-table-to-csv')
  .description('Extract Markdown tables to CSV format')
  .version(pkg.version);

program.command('convert')
  .description('Extract tables from Markdown to CSV')
  .requiredOption('-i, --input <file>', 'Input Markdown file')
  .requiredOption('-o, --output <file>', 'Output CSV file')
  .action(async (opts) => {
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    if (!fs.existsSync(input)) { console.error('Input file not found'); process.exit(1); }
    const md = fs.readFileSync(input, 'utf-8');
    const result = markdownTableToCSV(md);
    fs.writeFileSync(output, result, 'utf-8');
    console.log(`Done: ${output} (${result.length} chars)`);
  });

program.parse();
