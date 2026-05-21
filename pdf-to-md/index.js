#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

program
  .name('pdf-to-md')
  .description('Extract text from PDF to Markdown')
  .version(pkg.version);

program.command('convert')
  .description('Convert a PDF file to Markdown')
  .requiredOption('-i, --input <file>', 'Input PDF file')
  .requiredOption('-o, --output <file>', 'Output Markdown file')
  .action(async (opts) => {
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    if (!fs.existsSync(input)) { console.error('Input file not found'); process.exit(1); }
    if (!input.toLowerCase().endsWith('.pdf')) { console.error('Input must be a .pdf file'); process.exit(1); }
    try {
      const pdfParse = require('pdf-parse');
      const buf = fs.readFileSync(input);
      const data = await pdfParse(buf);
      const text = data.text || '';
      if (!text.trim()) { console.log('No text could be extracted from this PDF'); process.exit(0); }
      fs.writeFileSync(output, text, 'utf-8');
      console.log(`Done: ${output} (${text.length} chars, ${data.numpages} pages)`);
    } catch (e) {
      console.error('Error:', e.message);
      process.exit(1);
    }
  });

program.parse();
