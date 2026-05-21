const { Marked } = require('marked');
const katex = require('katex');
const hljs = require('highlight.js');
const { createRenderer } = require('../../shared/html-renderer');
const { getTemplate } = require('./templates');

const { escapeHtml, processMath, restorePlaceholders } = createRenderer({ Marked, katex, hljs });

function buildCss(template) {
  const { colors, fonts, fontSizes, spacing } = template;

  return `
    :root {
      --t-heading: ${colors.heading};
      --t-text: ${colors.text};
      --t-link: ${colors.link};
      --t-code-bg: ${colors.codeBackground};
      --t-code-border: ${colors.codeBorder};
      --t-code-text: ${colors.codeText};
      --t-quote-text: ${colors.quoteText};
      --t-quote-border: ${colors.quoteBorder};
      --t-quote-bg: ${colors.quoteBackground};
      --t-table-header-bg: ${colors.tableHeaderBg};
      --t-table-header-text: ${colors.tableHeaderText};
      --t-table-border: ${colors.tableBorder};
      --t-table-row-odd: ${colors.tableRowOdd};
      --t-table-row-even: ${colors.tableRowEven};
      --t-font-heading: "${fonts.heading}", serif;
      --t-font-body: "${fonts.body}", sans-serif;
      --t-font-code: "${fonts.code}", monospace;
      --t-h1: ${fontSizes.h1}pt;
      --t-h2: ${fontSizes.h2}pt;
      --t-h3: ${fontSizes.h3}pt;
      --t-h4: ${fontSizes.h4}pt;
      --t-h5: ${fontSizes.h5}pt;
      --t-h6: ${fontSizes.h6}pt;
      --t-body: ${fontSizes.body}pt;
      --t-code-size: ${fontSizes.code}pt;
      --t-heading-before: ${spacing.headingBefore}pt;
      --t-heading-after: ${spacing.headingAfter}pt;
      --t-para-before: ${spacing.paragraphBefore}pt;
      --t-para-after: ${spacing.paragraphAfter}pt;
      --t-line-height: ${spacing.lineHeight};
    }

    body {
      font-family: var(--t-font-body);
      font-size: var(--t-body);
      color: var(--t-text);
      line-height: var(--t-line-height);
      margin: 0;
      padding: 0;
    }

    .content {
      max-width: 100%;
      padding: 0;
    }

    h1 { font-family: var(--t-font-heading); font-size: var(--t-h1); color: var(--t-heading); margin-top: var(--t-heading-before); margin-bottom: var(--t-heading-after); page-break-after: avoid; }
    h2 { font-family: var(--t-font-heading); font-size: var(--t-h2); color: var(--t-heading); margin-top: var(--t-heading-before); margin-bottom: var(--t-heading-after); page-break-after: avoid; }
    h3 { font-family: var(--t-font-heading); font-size: var(--t-h3); color: var(--t-heading); margin-top: var(--t-heading-before); margin-bottom: var(--t-heading-after); page-break-after: avoid; }
    h4 { font-family: var(--t-font-heading); font-size: var(--t-h4); color: var(--t-heading); margin-top: var(--t-heading-before); margin-bottom: var(--t-heading-after); page-break-after: avoid; }
    h5 { font-family: var(--t-font-heading); font-size: var(--t-h5); color: var(--t-heading); margin-top: var(--t-heading-before); margin-bottom: var(--t-heading-after); page-break-after: avoid; }
    h6 { font-family: var(--t-font-heading); font-size: var(--t-h6); color: var(--t-heading); margin-top: var(--t-heading-before); margin-bottom: var(--t-heading-after); page-break-after: avoid; }

    p { margin-top: var(--t-para-before); margin-bottom: var(--t-para-after); }

    a { color: var(--t-link); }

    pre {
      background: var(--t-code-bg);
      border: 1px solid var(--t-code-border);
      border-radius: 4px;
      padding: 10px 12px;
      overflow-x: auto;
      font-family: var(--t-font-code);
      font-size: var(--t-code-size);
      page-break-inside: avoid;
    }

    pre code {
      color: var(--t-code-text);
      font-family: var(--t-font-code);
      font-size: var(--t-code-size);
    }

    code {
      font-family: var(--t-font-code);
      font-size: var(--t-code-size);
      background: var(--t-code-bg);
      padding: 1px 4px;
      border-radius: 3px;
    }

    pre code {
      padding: 0;
      background: none;
    }

    blockquote {
      color: var(--t-quote-text);
      background: var(--t-quote-bg);
      border-left: 4px solid var(--t-quote-border);
      padding: 8px 16px;
      margin: 8px 0;
      font-style: italic;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
    }

    thead { display: table-header-group; }

    th {
      background: var(--t-table-header-bg);
      color: var(--t-table-header-text);
      font-weight: 600;
      padding: 8px 12px;
      border: 1px solid var(--t-table-border);
      text-align: left;
    }

    td {
      padding: 6px 12px;
      border: 1px solid var(--t-table-border);
    }

    tr:nth-child(odd) td { background: var(--t-table-row-odd); }
    tr:nth-child(even) td { background: var(--t-table-row-even); }

    img { max-width: 100%; height: auto; }

    ul, ol { margin-top: var(--t-para-before); margin-bottom: var(--t-para-after); padding-left: 1.5em; }
    li { margin-bottom: 2pt; }

    hr { border: none; border-top: 1px solid var(--t-table-border); margin: 16px 0; }

    .katex-display { margin: 12px 0; page-break-inside: avoid; }
    .katex { font-size: 1.1em; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;
}

function renderHtml(md, templateId) {
  const template = getTemplate(templateId);
  const { text, codeBlocks, inlineMath, blockMath } = processMath(md);

  const marked = new Marked();
  marked.setOptions({
    highlight: (code, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch {}
      }
      return escapeHtml(code);
    },
    breaks: true,
    gfm: true,
  });

  let html = marked.parse(text);
  html = restorePlaceholders(html, codeBlocks, inlineMath, blockMath);

  const css = buildCss(template);
  const fullPage = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Markdown to PDF</title>
  <style>${css}</style>
</head>
<body>
  <div class="content">
    ${html}
  </div>
</body>
</html>`;

  return { html: fullPage, template };
}

module.exports = { renderHtml };
