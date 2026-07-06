/**
 * RFC 4180 compliant CSV parser and writer.
 *
 * Features:
 * - Handles quoted fields with embedded commas, newlines, and double-quotes
 * - Automatic delimiter detection (comma, tab, semicolon)
 * - BOM stripping
 * - Quote-aware delimiter counting
 * - Proper escaping for output
 */

/**
 * Count delimiters in a row, respecting quoted sections.
 * Used for automatic delimiter detection.
 */
function countDelimiter(row, delim) {
  let count = 0, inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"' && !inQuotes) { inQuotes = true; continue; }
    if (ch === '"' && inQuotes) {
      if (i + 1 < row.length && row[i + 1] === '"') { i++; continue; }
      inQuotes = false; continue;
    }
    if (ch === delim && !inQuotes) count++;
  }
  return count;
}

/**
 * Auto-detect the most likely delimiter in CSV text.
 * @param {string} csv - Full CSV text
 * @returns {string} Detected delimiter
 */
function detectDelimiter(csv) {
  const firstLine = csv.split('\n')[0] || '';
  const commas = countDelimiter(firstLine, ',');
  const tabs = countDelimiter(firstLine, '\t');
  const semicolons = countDelimiter(firstLine, ';');
  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

/**
 * Parse a single CSV row into cells using a character-level state machine.
 * Handles quoted fields, "" escape sequences, and embedded delimiters.
 */
function parseCsvRow(row, delimiter) {
  const cells = [];
  let cell = '', inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"' && !inQuotes) { inQuotes = true; continue; }
    if (ch === '"' && inQuotes) {
      if (i + 1 < row.length && row[i + 1] === '"') { cell += '"'; i++; continue; }
      inQuotes = false; continue;
    }
    if (ch === delimiter && !inQuotes) { cells.push(cell); cell = ''; continue; }
    cell += ch;
  }
  cells.push(cell);
  return cells;
}

/**
 * Parse CSV text into a 2D array of strings.
 * Handles multi-line quoted fields, BOM, and quote-aware parsing.
 *
 * @param {string} text - Raw CSV text
 * @param {Object} [options]
 * @param {string} [options.delimiter] - Delimiter character (auto-detected if omitted)
 * @returns {string[][]} Parsed rows
 */
function parseCsv(text, { delimiter } = {}) {
  // Strip BOM if present
  text = text.replace(/^﻿/, '');

  if (!delimiter) {
    delimiter = detectDelimiter(text);
  }

  // Row-level state machine: handle quoted newlines
  const allRows = [];
  let currentRow = '', inQuotes = false;
  const lines = text.split('\n');
  for (const line of lines) {
    if (!inQuotes) {
      if (currentRow) {
        allRows.push(currentRow);
        currentRow = '';
      }
      currentRow = line;
    } else {
      currentRow += '\n' + line;
    }
    // Toggle quote state based on unescaped quotes in this line
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { i++; continue; }
        inQuotes = !inQuotes;
      }
    }
  }
  if (currentRow) allRows.push(currentRow);

  return allRows
    .map(r => r.trim())
    .filter(r => r.length > 0)
    .map(r => parseCsvRow(r, delimiter));
}

/**
 * Escape a cell value for CSV output following RFC 4180.
 * Wraps in double-quotes if the cell contains comma, double-quote, or newline.
 * @param {string} cell
 * @returns {string}
 */
function escapeCsvCell(cell) {
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
    return '"' + cell.replace(/"/g, '""') + '"';
  }
  return cell;
}

/**
 * Write a 2D array as CSV text.
 * @param {string[][]} rows
 * @returns {string}
 */
function writeCsv(rows) {
  return rows.map(r => r.map(escapeCsvCell).join(',')).join('\n');
}

module.exports = { parseCsv, writeCsv, escapeCsvCell, detectDelimiter, parseCsvRow, countDelimiter };
