/**
 * Tests for shared/gfm-table.js — GFM table construction
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildTable, formatRow, escapeCell, alignToSeparator } = require('../gfm-table');

describe('escapeCell', () => {
  it('should escape pipe characters', () => {
    assert.strictEqual(escapeCell('a|b'), 'a\\|b');
  });

  it('should convert newlines to <br>', () => {
    assert.strictEqual(escapeCell('a\nb'), 'a<br>b');
  });

  it('should handle null/undefined as empty string', () => {
    assert.strictEqual(escapeCell(null), '');
    assert.strictEqual(escapeCell(undefined), '');
  });
});

describe('alignToSeparator', () => {
  it('should produce left alignment', () => {
    assert.strictEqual(alignToSeparator('left'), ':---');
  });

  it('should produce center alignment', () => {
    assert.strictEqual(alignToSeparator('center'), ':---:');
  });

  it('should produce right alignment', () => {
    assert.strictEqual(alignToSeparator('right'), '---:');
  });

  it('should produce default (no alignment)', () => {
    assert.strictEqual(alignToSeparator(null), '---');
  });
});

describe('formatRow', () => {
  it('should format a row with pipe delimiters', () => {
    assert.strictEqual(formatRow(['a', 'b', 'c']), '| a | b | c |');
  });

  it('should escape pipes in cells', () => {
    assert.strictEqual(formatRow(['x|y', 'z']), '| x\\|y | z |');
  });
});

describe('buildTable', () => {
  it('should build a complete GFM table', () => {
    const result = buildTable({
      headers: ['Name', 'Age'],
      rows: [['Alice', '30'], ['Bob', '25']],
    });
    const expected = '| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |';
    assert.strictEqual(result, expected);
  });

  it('should build a table with alignments', () => {
    const result = buildTable({
      headers: ['Left', 'Center', 'Right'],
      rows: [['a', 'b', 'c']],
      aligns: ['left', 'center', 'right'],
    });
    assert.ok(result.includes('| :--- |'));
    assert.ok(result.includes('| :---: |'));
    assert.ok(result.includes('| ---: |'));
  });

  it('should handle empty rows', () => {
    const result = buildTable({
      headers: ['H1', 'H2'],
      rows: [],
    });
    assert.strictEqual(result, '| H1 | H2 |\n| --- | --- |');
  });

  it('should handle rows with fewer columns than headers', () => {
    const result = buildTable({
      headers: ['H1', 'H2', 'H3'],
      rows: [['a'], ['b']],
    });
    const lines = result.split('\n');
    assert.strictEqual(lines[0], '| H1 | H2 | H3 |');
    // Each data row has only the cells provided
    assert.ok(lines[2].startsWith('| a |'));
  });
});
