#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

// Replicates md-to.com's table-converters JSON→Markdown logic
function jsonToMarkdownTable(jsonStr) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    throw new Error('Invalid JSON input');
  }

  // Normalize to array
  let records = Array.isArray(data) ? data : data.data || data.rows || data.items || [data];
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('Input must be a non-empty JSON array or object with array property');
  }
  if (typeof records[0] !== 'object') {
    throw new Error('Array elements must be objects');
  }

  // Get all keys from first object
  const keys = Object.keys(records[0]);
  if (keys.length === 0) throw new Error('Objects cannot be empty');

  // Build header and separator
  const header = '| ' + keys.join(' | ') + ' |';
  const separator = '| ' + keys.map(() => '---').join(' | ') + ' |';

  // Build rows (escape pipe chars in cells)
  const dataRows = records.map(rec =>
    '| ' + keys.map(k => {
      const v = rec[k] !== undefined && rec[k] !== null ? String(rec[k]) : '';
      return v.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
    }).join(' | ') + ' |'
  );

  return [header, separator, ...dataRows].join('\n');
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
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    if (!fs.existsSync(input)) { console.error('Input file not found'); process.exit(1); }
    try {
      const jsonStr = fs.readFileSync(input, 'utf-8');
      const result = jsonToMarkdownTable(jsonStr);
      fs.writeFileSync(output, result, 'utf-8');
      console.log(`Done: ${output} (${result.length} chars)`);
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  });

program.parse();
