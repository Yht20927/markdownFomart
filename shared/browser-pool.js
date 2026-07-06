/**
 * Shared Puppeteer browser pool — single reusable browser instance.
 *
 * Eliminates 4 duplicate getBrowser() implementations across:
 * md-to-image, md-to-pdf, md-table-to-image, md-table-to-pdf.
 */

const puppeteer = require('puppeteer');

let _browser = null;

/**
 * Get or create a shared browser instance.
 * @returns {Promise<import('puppeteer').Browser>}
 */
async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return _browser;
}

/**
 * Close the browser instance if open.
 */
async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

/**
 * Execute a function with a fresh page, auto-closing the page afterwards.
 * The browser instance is reused.
 *
 * @param {(page: import('puppeteer').Page) => Promise<T>} fn
 * @returns {Promise<T>}
 * @template T
 */
async function withPage(fn) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}

// Graceful shutdown hooks
process.on('SIGINT', async () => { await closeBrowser(); process.exit(0); });
process.on('beforeExit', () => { if (_browser) _browser.close(); });

module.exports = { getBrowser, closeBrowser, withPage };
