/**
 * Tests for shared/csv.js — RFC 4180 CSV parser and writer
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseCsv, writeCsv, escapeCsvCell, detectDelimiter, parseCsvRow } = require('../csv');

describe('CSV parser', () => {
  it('should parse simple CSV', () => {
    const result = parseCsv('a,b,c\n1,2,3');
    assert.deepStrictEqual(result, [['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('should handle quoted fields with commas', () => {
    const result = parseCsv('"Hello, World",b\n1,2');
    assert.strictEqual(result[0][0], 'Hello, World');
    assert.strictEqual(result[0][1], 'b');
  });

  it('should handle quoted fields with newlines (P0-4)', () => {
    const result = parseCsv('"a\nb",c\n1,2');
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0][0], 'a\nb');
    assert.strictEqual(result[0][1], 'c');
  });

  it('should handle escaped double-quotes', () => {
    const result = parseCsv('"Say ""hi""",b\n1,2');
    assert.strictEqual(result[0][0], 'Say "hi"');
  });

  it('should preserve spaces in quoted cells (P0-6)', () => {
    const result = parseCsv('"  pad  ",b\n1,2');
    assert.strictEqual(result[0][0], '  pad  ');
  });

  it('should strip BOM (P0-7)', () => {
    const result = parseCsv('﻿a,b\n1,2');
    assert.strictEqual(result[0][0], 'a');
  });
});

describe('CSV writer', () => {
  it('should write simple rows', () => {
    const result = writeCsv([['a', 'b'], ['1', '2']]);
    assert.strictEqual(result, 'a,b\n1,2');
  });

  it('should quote cells with commas (P0-3)', () => {
    const result = writeCsv([['Hello, World', 'b']]);
    assert.strictEqual(result, '"Hello, World",b');
  });

  it('should escape double-quotes in cells', () => {
    const result = writeCsv([['Say "hi"', 'b']]);
    assert.strictEqual(result, '"Say ""hi""",b');
  });

  it('should quote cells with newlines', () => {
    const result = writeCsv([['line1\nline2', 'b']]);
    assert.strictEqual(result, '"line1\nline2",b');
  });
});

describe('detectDelimiter', () => {
  it('should detect comma as most common', () => {
    assert.strictEqual(detectDelimiter('a,b,c,d\n1,2,3,4'), ',');
  });

  it('should detect tab', () => {
    assert.strictEqual(detectDelimiter('a\tb\tc\n1\t2\t3'), '\t');
  });

  it('should detect semicolon', () => {
    assert.strictEqual(detectDelimiter('a;b;c\n1;2;3'), ';');
  });

  it('should skip delimiters inside quotes (P0-5)', () => {
    // "a,b" has a comma inside quotes — should pick semicolon
    assert.strictEqual(detectDelimiter('"a,b";c\n1;2'), ';');
  });
});
