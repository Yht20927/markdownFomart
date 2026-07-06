/**
 * GFM (GitHub Flavored Markdown) table construction utilities.
 *
 * Provides a unified way to build GFM-compliant markdown tables
 * with proper escaping, alignment, and formatting.
 */

/**
 * Escape a cell value for safe inclusion in a GFM table.
 * - Escapes pipe characters
 * - Converts newlines to <br> (GFM inline HTML)
 */
function escapeCell(val) {
  return String(val ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

/**
 * Map alignment string to GFM separator format.
 * @param {'left'|'center'|'right'|null} align
 * @returns {string} e.g. ':---', ':---:', '---:', '---'
 */
function alignToSeparator(align) {
  if (align === 'center') return ':---:';
  if (align === 'right') return '---:';
  if (align === 'left') return ':---';
  return '---';
}

/**
 * Format a row of cells as a GFM table row.
 * @param {string[]} cells
 * @returns {string} e.g. '| cell1 | cell2 |'
 */
function formatRow(cells) {
  return '| ' + cells.map(escapeCell).join(' | ') + ' |';
}

/**
 * Build a complete GFM table string.
 *
 * @param {Object} options
 * @param {string[]} options.headers - Column header texts
 * @param {string[][]} options.rows - Data rows (each is an array of cell values)
 * @param {Array<'left'|'center'|'right'|null>} [options.aligns] - Column alignments
 * @returns {string} Complete GFM table
 */
function buildTable({ headers, rows, aligns = [] }) {
  const sep = headers.map((_, i) => alignToSeparator(aligns[i] || null));
  return [
    formatRow(headers),
    '| ' + sep.join(' | ') + ' |',
    ...rows.map(formatRow),
  ].join('\n');
}

module.exports = { buildTable, formatRow, escapeCell, alignToSeparator };
