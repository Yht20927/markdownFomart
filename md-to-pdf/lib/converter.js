const { withPage } = require('../../shared/browser-pool');
const path = require('path');

async function htmlToPdf(html, outputPath, margin = { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }) {
  await withPage(async (page) => {
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin,
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: false,
    });
  });
}

async function htmlToPreview(html, outputPath) {
  const fs = require('fs');
  fs.writeFileSync(outputPath, html, 'utf-8');
}

async function convertFile(inputPath, outputPath, templateId) {
  const fs = require('fs');
  const { renderHtml } = require('./renderer');

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const md = fs.readFileSync(inputPath, 'utf-8');
  const { html, template } = renderHtml(md, templateId);

  const ext = path.extname(outputPath).toLowerCase();
  if (ext === '.html') {
    await htmlToPreview(html, outputPath);
  } else {
    // F-5: Use pageMargin from theme if available, otherwise default
    const margin = template.pageMargin || { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' };
    await htmlToPdf(html, outputPath, margin);
  }

  return { template };
}

module.exports = { convertFile, htmlToPdf, htmlToPreview };
