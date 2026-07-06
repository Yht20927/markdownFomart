/**
 * Round-trip invariant tests: csv → md → csv and md → csv → md
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseCsv, writeCsv } = require('../csv');
const { buildTable } = require('../gfm-table');
const { parseTables } = require('../md-table-parser');

describe('CSV → Markdown → CSV round-trip', () => {
  it('should preserve simple data', () => {
    const original = 'Name,Age,City\nAlice,30,NYC\nBob,25,LA';
    const parsed = parseCsv(original);
    const md = buildTable({ headers: parsed[0], rows: parsed.slice(1) });
    const tables = parseTables(md);
    const reconstructed = writeCsv([tables[0].headers, ...tables[0].rows]);
    // Normalize line endings
    assert.strictEqual(reconstructed.replace(/\r\n/g, '\n'), original);
  });

  it('should preserve empty cells', () => {
    const original = 'a,,c\n1,,3';
    const parsed = parseCsv(original);
    const md = buildTable({ headers: parsed[0], rows: parsed.slice(1) });
    const tables = parseTables(md);
    const reconstructed = writeCsv([tables[0].headers, ...tables[0].rows]);
    // Empty cells preserved
    assert.ok(reconstructed.includes(',,'));
  });

  it('should preserve comma-containing cells via quoting', () => {
    const data = [['Greeting', 'Target'], ['Hello, World', 'Everyone']];
    const csv = writeCsv(data);
    const parsed = parseCsv(csv);
    assert.strictEqual(parsed[1][0], 'Hello, World');
  });

  it('should preserve quote-containing cells', () => {
    const data = [['Quote'], ['Say "hi"']];
    const csv = writeCsv(data);
    const parsed = parseCsv(csv);
    assert.strictEqual(parsed[1][0], 'Say "hi"');
  });
});

describe('Markdown table → CSV → Markdown table', () => {
  it('should preserve table structure', () => {
    const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |';
    const tables = parseTables(md);
    const csv = writeCsv([tables[0].headers, ...tables[0].rows]);
    const parsed = parseCsv(csv);
    const reconstructed = buildTable({ headers: parsed[0], rows: parsed.slice(1) });
    // Verify headers match
    const reTables = parseTables(reconstructed);
    assert.deepStrictEqual(reTables[0].headers, ['Name', 'Age']);
    assert.deepStrictEqual(reTables[0].rows, [['Alice', '30'], ['Bob', '25']]);
  });
});
