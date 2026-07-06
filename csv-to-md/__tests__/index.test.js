/**
 * Integration tests for csv-to-md
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const toolPath = path.join(__dirname, '..', 'index.js');

function runConvert(csv, delimiter = '') {
  const inFile = `/tmp/csv-to-md-test-${Date.now()}.csv`;
  const outFile = `/tmp/csv-to-md-test-${Date.now()}.md`;
  fs.writeFileSync(inFile, csv);
  const delimArg = delimiter ? `-d "${delimiter}"` : '';
  execSync(`node "${toolPath}" convert -i "${inFile}" -o "${outFile}" ${delimArg}`, { encoding: 'utf8' });
  const result = fs.readFileSync(outFile, 'utf8');
  fs.unlinkSync(inFile);
  fs.unlinkSync(outFile);
  return result;
}

describe('csv-to-md', () => {
  it('should convert simple CSV', () => {
    const md = runConvert('a,b\n1,2');
    assert.ok(md.includes('| a | b |'));
    assert.ok(md.includes('| 1 | 2 |'));
  });

  it('should handle BOM (P0-7)', () => {
    const md = runConvert('﻿a,b\n1,2');
    assert.ok(md.includes('| a | b |'));
    assert.ok(!md.includes('﻿'));
  });

  it('should handle quoted fields with commas (P0-4)', () => {
    const md = runConvert('"Hello, World",b\n1,2');
    assert.ok(md.includes('Hello, World'));
  });

  it('should handle quoted fields with newlines (P0-4)', () => {
    const csv = '"line1\nline2",b\n1,2';
    const md = runConvert(csv);
    assert.ok(md.includes('line1'));
    assert.ok(md.includes('line2'));
  });

  it('should auto-detect tab delimiter', () => {
    const md = runConvert('a\tb\n1\t2');
    assert.ok(md.includes('| a | b |'));
  });

  it('should skip separators inside quotes for auto-detection (P0-5)', () => {
    const md = runConvert('"a,b";c\n1;2');
    assert.ok(md.includes('a,b'));
  });
});
