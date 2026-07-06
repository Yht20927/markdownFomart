#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const { resolveInOut, readInput, writeOutput, handleError } = require('../shared/cli');
const { parseCsv, detectDelimiter } = require('../shared/csv');
const { buildTable } = require('../shared/gfm-table');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

function csvToMarkdownTable(csv, delimiter) {
  csv = csv.replace(/^﻿/, ''); // P0-7: Strip BOM

  if (!delimiter) {
    delimiter = detectDelimiter(csv);
  }

  const rows = parseCsv(csv, { delimiter });
  if (rows.length === 0) return '';

  // Ensure all rows have same column count
  const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const normalized = rows.map(r => {
    while (r.length < maxCols) r.push('');
    return r;
  });

  const header = normalized[0];
  const dataRows = normalized.slice(1);

  return buildTable({ headers: header, rows: dataRows });
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
    try {
      const { input, output } = resolveInOut(opts);
      const csv = readInput(input);
      const result = csvToMarkdownTable(csv, opts.delimiter);
      writeOutput(output, result);
    } catch (e) { handleError(e); }
  });

program.parse();
