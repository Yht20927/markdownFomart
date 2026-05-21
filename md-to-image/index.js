#!/usr/bin/env node
const { program } = require('commander');
const { Marked } = require('marked');
const katex = require('katex');
const hljs = require('highlight.js');
const { createRenderer } = require('../shared/html-renderer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const { renderMarkdown } = createRenderer({ Marked, katex, hljs });

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

const pageCss = `
  body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; color: #1F2937; line-height: 1.6; padding: 48px; margin: 0; max-width: 800px; background: #fff; }
  h1 { font-size: 28px; color: #111; margin-top: 24px; margin-bottom: 12px; }
  h2 { font-size: 22px; color: #222; margin-top: 20px; margin-bottom: 10px; }
  pre { background: #F6F8FA; border: 1px solid #D0D7DE; border-radius: 6px; padding: 16px; overflow-x: auto; font-size: 13px; }
  code { font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace; font-size: 13px; }
  blockquote { border-left: 4px solid #D0D7DE; padding: 8px 16px; color: #656D76; margin: 12px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th { background: #F6F8FA; font-weight: 600; padding: 8px 12px; border: 1px solid #D0D7DE; }
  td { padding: 8px 12px; border: 1px solid #D0D7DE; }
  img { max-width: 100%; }
  a { color: #0969DA; }
`;

let _browser = null;
async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  return _browser;
}

program
  .name('md-to-image')
  .description('Convert Markdown to PNG/JPEG image')
  .version(pkg.version);

program.command('convert')
  .description('Convert a Markdown file to image')
  .requiredOption('-i, --input <file>', 'Input Markdown file')
  .requiredOption('-o, --output <file>', 'Output image file (.png or .jpg)')
  .option('-w, --width <px>', 'Image width in pixels', '800')
  .action(async (opts) => {
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    if (!fs.existsSync(input)) { console.error('Input file not found'); process.exit(1); }
    const ext = path.extname(output).toLowerCase();
    if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
      console.error('Output must be .png or .jpg'); process.exit(1);
    }

    const md = fs.readFileSync(input, 'utf-8');
    const bodyHtml = renderMarkdown(md);
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${pageCss}</style></head><body>${bodyHtml}</body></html>`;

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.setViewport({ width: parseInt(opts.width), height: 100 });
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      await page.setViewport({ width: parseInt(opts.width), height: Math.ceil(bodyHeight) + 50 });

      const format = ext === '.png' ? 'png' : 'jpeg';
      await page.screenshot({ path: output, fullPage: true, type: format, omitBackground: false });
      await page.close();
      console.log(`Done: ${output}`);
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  });

program.parse();
