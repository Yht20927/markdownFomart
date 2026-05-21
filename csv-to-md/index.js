#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

// Replicates md-to.com's table-converters CSV→Markdown logic
function csvToMarkdownTable(csv, delimiter) {
  if (!delimiter) {
    // Auto-detect: count commas vs tabs vs pipes in first line
    const firstLine = csv.split('\n')[0] || '';
    const commas = (firstLine.match(/,/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    delimiter = tabs > commas && tabs > semicolons ? '\t'
      : semicolons > commas ? ';'
      : ',';
  }

  const rows = csv.trim().split('\n')
    .map(r => r.trim())
    .filter(r => r.length > 0)
    // Skip visual separator rows (e.g. ---------,--------,--------,------ )
    .filter(r => {
      const stripped = r.split(delimiter).map(c => c.trim()).join('');
      return !/^[-=~^:]+$/.test(stripped);
    })
    .map(r => {
      // Parse CSV row respecting quotes
      const cells = [];
      let cell = '', inQuotes = false;
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === '"' && !inQuotes) { inQuotes = true; continue; }
        if (ch === '"' && inQuotes) {
          if (i + 1 < r.length && r[i + 1] === '"') { cell += '"'; i++; continue; }
          inQuotes = false; continue;
        }
        if (ch === delimiter && !inQuotes) { cells.push(cell.trim()); cell = ''; continue; }
        cell += ch;
      }
      cells.push(cell.trim());
      return cells;
    });

  if (rows.length === 0) return '';

  // Ensure all rows have same column count
  const maxCols = Math.max(...rows.map(r => r.length));
  const normalized = rows.map(r => {
    while (r.length < maxCols) r.push('');
    return r;
  });

  // Build markdown table
  const header = normalized[0];
  const alignRow = header.map(() => '---');
  const dataRows = normalized.slice(1);

  const formatRow = r => '| ' + r.join(' | ') + ' |';

  return [
    formatRow(header),
    '| ' + alignRow.join(' | ') + ' |',
    ...dataRows.map(formatRow),
  ].join('\n');
}

program
  .name('csv-to-md')
  .description('Convert CSV data to Markdown table')
  .version(pkg.version);

program.command('convert')
  .description('Convert a CSV file to Markdown table')
  .requiredOption('-i, --input <file>', 'Input CSV file')
  .requiredOption('-o, --output <file>', 'Output Markdown file')
  .option('-d, --delimiter <char>', 'CSV delimiter (auto-detect if omitted)')
  .action(async (opts) => {
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    if (!fs.existsSync(input)) { console.error('Input file not found'); process.exit(1); }
    const csv = fs.readFileSync(input, 'utf-8');
    const result = csvToMarkdownTable(csv, opts.delimiter);
    fs.writeFileSync(output, result, 'utf-8');
    console.log(`Done: ${output} (${result.length} chars)`);
  });

program.parse();
