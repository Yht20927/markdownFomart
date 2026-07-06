#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const { resolveInOut, readInput, writeOutput, handleError } = require('../shared/cli');
const { buildTable } = require('../shared/gfm-table');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

function jsonToMarkdownTable(jsonStr) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    throw new Error('Invalid JSON input');
  }

  let records = Array.isArray(data) ? data : data.data || data.rows || data.items || [data];
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('Input must be a non-empty JSON array or object with array property');
  }
  if (typeof records[0] !== 'object') {
    throw new Error('Array elements must be objects');
  }

  // P0-8: Union all keys from all records
  const keyOrder = [];
  const keySet = new Set();
  for (const rec of records) {
    for (const k of Object.keys(rec)) {
      if (!keySet.has(k)) {
        keySet.add(k);
        keyOrder.push(k);
      }
    }
  }
  if (keyOrder.length === 0) throw new Error('Objects cannot be empty');

  // P0-9: Properly serialize object/array values as JSON strings
  const dataRows = records.map(rec =>
    keyOrder.map(k => {
      const v = rec[k];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    })
  );

  return buildTable({ headers: keyOrder, rows: dataRows });
}

program
  .name('json-to-md')
  .description('Convert JSON arrays to Markdown tables')
  .version(pkg.version);

program.command('convert')
  .description('Convert a JSON file to Markdown table')
  .requiredOption('-i, --input <file>', 'Input JSON file')
  .requiredOption('-o, --output <file>', 'Output Markdown file')
  .action(async (opts) => {
    try {
      const { input, output } = resolveInOut(opts);
      const jsonStr = readInput(input);
      const result = jsonToMarkdownTable(jsonStr);
      writeOutput(output, result);
    } catch (e) { handleError(e); }
  });

program.parse();
