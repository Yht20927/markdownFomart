const puppeteer = require('puppeteer');
const path = require('path');

let _browser = null;

async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return _browser;
}

async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

async function htmlToPdf(html, outputPath) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: false,
    });
  } finally {
    await page.close();
  }
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
    await htmlToPdf(html, outputPath);
  }

  return { template };
}

module.exports = { convertFile, htmlToPdf, htmlToPreview, closeBrowser };
