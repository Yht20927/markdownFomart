/**
 * Markdown table parser — extracts and parses all GFM tables from markdown text.
 *
 * Handles:
 * - Escaped pipes (\|)
 * - Empty cells
 * - Alignment detection (:---, :---:, ---:)
 * - Multiple tables in one document
 */

/**
 * Split a table row string into cells, respecting escaped pipes.
 * Strips leading/trailing pipe delimiters.
 * @param {string} row - A single table row like '| a | b | c |'
 * @returns {string[]} Array of cell values
 */
function splitTableCells(row) {
  const trimmed = row.replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let current = '';
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '\\' && i + 1 < trimmed.length && trimmed[i + 1] === '|') {
      current += '|'; // unescape \| → |
      i++;
    } else if (trimmed[i] === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += trimmed[i];
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Parse alignment from a separator cell.
 * @param {string} cell - e.g. ':---', ':---:', '---:', '---'
 * @returns {'left'|'center'|'right'|null}
 */
function parseAlignment(cell) {
  const s = cell.trim();
  const left = s.startsWith(':');
  const right = s.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return null;
}

/**
 * Check if a line is a GFM table separator row.
 * @param {string} line
 * @returns {boolean}
 */
function isSeparatorRow(line) {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

/**
 * Parse all markdown tables from text.
 *
 * @param {string} md - Markdown text
 * @returns {Array<{headers: string[], aligns: Array<string|null>, rows: string[][]}>}
 */
function parseTables(md) {
  const tableRegex = /^\|.+\|\s*$(?:\n^\|[- :|]+\|\s*$(?:\n^\|.+\|\s*$)*)?/gm;
  const tables = md.match(tableRegex);
  if (!tables || tables.length === 0) return [];

  const results = [];

  for (const table of tables) {
    const lines = table.trim().split('\n');
    if (lines.length < 2) continue;

    // Filter out separator rows
    const dataLines = [];
    let alignLine = null;

    for (const line of lines) {
      if (isSeparatorRow(line)) {
        alignLine = line;
      } else {
        dataLines.push(line);
      }
    }

    if (dataLines.length === 0) continue;

    // Parse headers from first data line
    const headers = splitTableCells(dataLines[0]);

    // Parse alignments from separator row
    let aligns = [];
    if (alignLine) {
      const sepCells = splitTableCells(alignLine);
      aligns = sepCells.map(parseAlignment);
    }
    // Pad aligns to match header count
    while (aligns.length < headers.length) aligns.push(null);

    // Parse data rows (skip header)
    const rows = dataLines.slice(1).map(splitTableCells);

    results.push({ headers, aligns, rows });
  }

  return results;
}

module.exports = { parseTables, splitTableCells, parseAlignment, isSeparatorRow };
