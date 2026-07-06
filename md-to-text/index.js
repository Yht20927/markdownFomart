#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const { resolveInOut, readInput, writeOutput, handleError } = require('../shared/cli');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

function markdownToText(md) {
  // Extract fenced code blocks first to protect their content (P0-12)
  const codeBlocks = [];
  let result = md.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `\x00CB:${codeBlocks.length - 1}\x00`;
  });

  // Also protect inline code
  const inlineCodes = [];
  result = result.replace(/`([^`\n]+)`/g, (_m, code) => {
    inlineCodes.push(code);
    return `\x00IC:${inlineCodes.length - 1}\x00`;
  });

  result = result.replace(/^#{1,6}\s+/gm, '');
  result = result.replace(/\*\*(.+?)\*\*/g, '$1');
  result = result.replace(/__(.+?)__/g, '$1');
  result = result.replace(/\*(.+?)\*/g, '$1');
  result = result.replace(/_(.+?)_/g, '$1');
  result = result.replace(/~~(.+?)~~/g, '$1');

  // P0-11: Images BEFORE links
  result = result.replace(/!\[.*?\]\(.+?\)/g, '');
  result = result.replace(/\[(.+?)\]\(.+?\)/g, '$1');

  result = result.replace(/^>\s+/gm, '');
  result = result.replace(/^[-*+]\s+/gm, '• ');
  result = result.replace(/^\d+\.\s+/gm, '');
  result = result.replace(/^---+$/gm, '');

  // Restore inline code
  for (let i = 0; i < inlineCodes.length; i++) {
    result = result.replace(`\x00IC:${i}\x00`, inlineCodes[i]);
  }
  // Restore code blocks (strip backticks but keep content)
  for (let i = 0; i < codeBlocks.length; i++) {
    const cleaned = codeBlocks[i].replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
    result = result.replace(`\x00CB:${i}\x00`, '\n' + cleaned + '\n');
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

program
  .name('md-to-text')
  .description('Convert Markdown to clean plain text')
  .version(pkg.version);

program.command('convert')
  .description('Convert a Markdown file to plain text')
  .requiredOption('-i, --input <file>', 'Input Markdown file')
  .requiredOption('-o, --output <file>', 'Output text file')
  .action(async (opts) => {
    try {
      const { input, output } = resolveInOut(opts);
      const md = readInput(input);
      const text = markdownToText(md);
      writeOutput(output, text);
    } catch (e) { handleError(e); }
  });

program.parse();
