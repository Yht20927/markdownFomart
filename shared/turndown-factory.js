/**
 * Shared turndown factory for HTML→Markdown and Word→Markdown converters.
 *
 * Provides a unified turndown instance with GFM table support,
 * consistent heading/code-block styles, and optional GFM extensions.
 */

const TurndownService = require('turndown');

/**
 * Create a configured turndown instance with GFM table rule.
 *
 * @param {Object} [options]
 * @param {boolean} [options.gfmTables=true] - Enable GFM table conversion
 * @param {boolean} [options.headingStyle='atx'] - Heading style
 * @param {boolean} [options.codeBlockStyle='fenced'] - Code block style
 * @returns {TurndownService}
 */
function createTurndown({ gfmTables = true, headingStyle = 'atx', codeBlockStyle = 'fenced' } = {}) {
  const td = new TurndownService({ headingStyle, codeBlockStyle });

  if (gfmTables) {
    td.addRule('table', {
      filter: 'table',
      replacement: function (_content, node) {
        const rows = [];
        const thead = node.querySelector('thead');
        const tbody = node.querySelector('tbody');
        let headers = [];

        if (thead) {
          const headerRow = thead.querySelector('tr');
          if (headerRow) {
            headers = Array.from(headerRow.querySelectorAll('th, td')).map(th =>
              (th.textContent || '').trim()
            );
          }
        }

        // Handle tables without <thead> — use first row of <tbody> as header
        // if it contains <th> elements or no thead exists
        if (headers.length === 0 && tbody) {
          const firstRow = tbody.querySelector('tr');
          if (firstRow) {
            const hasTh = firstRow.querySelector('th');
            const firstRowCells = Array.from(firstRow.querySelectorAll('th, td'));
            if (hasTh || firstRowCells.length > 0) {
              headers = firstRowCells.map(cell => (cell.textContent || '').trim());
            }
          }
        }

        // Build header
        if (headers.length > 0) {
          rows.push('| ' + headers.join(' | ') + ' |');
          rows.push('| ' + headers.map(() => '---').join(' | ') + ' |');
        }

        // Build body rows — skip first row if it was used as header
        const dataRows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
        let skipFirst = headers.length > 0 && !thead;
        for (const tr of dataRows) {
          if (skipFirst) { skipFirst = false; continue; }
          const cells = Array.from(tr.querySelectorAll('td, th')).map(td =>
            (td.textContent || '').trim()
          );
          if (cells.length > 0) rows.push('| ' + cells.join(' | ') + ' |');
        }

        return rows.length > 0 ? '\n' + rows.join('\n') + '\n' : '';
      }
    });
  }

  return td;
}

module.exports = { createTurndown };
