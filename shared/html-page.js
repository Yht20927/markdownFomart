/**
 * Unified HTML document shell builder.
 *
 * Provides a consistent HTML page wrapper used by:
 * md-to-html, md-to-word, md-to-image, md-table-to-image, md-table-to-pdf
 */

/**
 * Build a complete HTML5 document string.
 *
 * @param {Object} options
 * @param {string} options.body - Inner HTML body content
 * @param {string} [options.css=''] - CSS styles to inject
 * @param {string} [options.title=''] - Page title
 * @param {string} [options.lang='zh-CN'] - Document language
 * @param {string} [options.headExtra=''] - Additional head elements
 * @param {Object} [options.bodyAttrs] - Extra body attributes (for Word namespace etc.)
 * @returns {string} Complete HTML document
 */
function buildHtmlPage({ body, css = '', title = '', lang = 'zh-CN', headExtra = '', bodyAttrs = '' }) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${css}</style>
${headExtra}
</head>
<body${bodyAttrs ? ' ' + bodyAttrs : ''}>${body}</body>
</html>`;
}

module.exports = { buildHtmlPage };
