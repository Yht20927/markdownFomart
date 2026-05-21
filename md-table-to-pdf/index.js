#!/usr/bin/env node
const { program } = require('commander');
const { Marked } = require('marked');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

const pageCss = `
  body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 12pt; color: #1F2937; line-height: 1.5; margin: 0; padding: 20mm; }
  table { border-collapse: collapse; width: auto; margin: 12pt 0; }
  th { background: #2E74B5; color: #fff; font-weight: 600; padding: 6pt 12pt; border: 1px solid #CBD5E1; }
  td { padding: 4pt 12pt; border: 1px solid #CBD5E1; }
  tr:nth-child(even) td { background: #F8FAFC; }
  h1,h2,h3 { color: #1E3A5F; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

let _browser = null;
async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  return _browser;
}

program
  .name('md-table-to-pdf')
  .description('Render Markdown tables as PDF')
  .version(pkg.version);

program.command('convert')
  .description('Convert Markdown table(s) to PDF')
  .requiredOption('-i, --input <file>', 'Input Markdown file')
  .requiredOption('-o, --output <file>', 'Output PDF file')
  .action(async (opts) => {
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    if (!fs.existsSync(input)) { console.error('Input file not found'); process.exit(1); }

    const md = fs.readFileSync(input, 'utf-8');
    const marked = new Marked();
    marked.setOptions({ breaks: true, gfm: true });
    const bodyHtml = marked.parse(md);
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${pageCss}</style></head><body>${bodyHtml}</body></html>`;

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: output,
        format: 'A4',
        margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
        printBackground: true,
        displayHeaderFooter: false,
      });
      await page.close();
      console.log(`Done: ${output}`);
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  });

program.parse();
