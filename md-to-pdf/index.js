#!/usr/bin/env node
const { program } = require('./lib/cli');

process.on('SIGINT', async () => {
  const { closeBrowser } = require('./lib/converter');
  await closeBrowser();
  process.exit(0);
});

program.parse();
