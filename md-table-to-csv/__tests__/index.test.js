/**
 * Integration tests for md-table-to-csv
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const toolPath = path.join(__dirname, '..', 'index.js');

function runConvert(inputMd) {
  const inFile = `/tmp/md-table-to-csv-test-${Date.now()}.md`;
  const outFile = `/tmp/md-table-to-csv-test-${Date.now()}.csv`;
  fs.writeFileSync(inFile, inputMd);
  execSync(`node "${toolPath}" convert -i "${inFile}" -o "${outFile}"`, { encoding: 'utf8' });
  const result = fs.readFileSync(outFile, 'utf8');
  fs.unlinkSync(inFile);
  fs.unlinkSync(outFile);
  return result;
}

describe('md-table-to-csv', () => {
  it('should convert a simple table to CSV', () => {
    const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |';
    const csv = runConvert(md);
    assert.ok(csv.includes('Name,Age'));
    assert.ok(csv.includes('Alice,30'));
  });

  it('should preserve empty cells (P0-1)', () => {
    const md = '| a |  | c |\n| --- | --- | --- |\n| d |  | f |';
    const csv = runConvert(md);
    assert.ok(csv.includes(',,'));
  });

  it('should handle escaped pipes (P0-2)', () => {
    const md = '| a\\|b | c |\n| --- | --- |\n| x\\|y | z |';
    const csv = runConvert(md);
    assert.ok(csv.includes('a|b'));
  });

  it('should quote CSV cells with commas (P0-3)', () => {
    const md = '| Text |\n| --- |\n| Hello, World |';
    const csv = runConvert(md);
    assert.ok(csv.includes('"Hello, World"'));
  });
});
