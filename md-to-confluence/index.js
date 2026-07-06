#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const { resolveInOut, readInput, writeOutput, handleError } = require('../shared/cli');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

function mdToConfluence(md) {
  let result = md;

  const codeBlocks = [];
  result = result.replace(/^[^\S\n]*```(\w*)\n([\s\S]*?)\n[^\S\n]*```/gm, (_m, lang, code) => {
    codeBlocks.push({ lang, code: code.trim() });
    return `__FENCED_${codeBlocks.length - 1}__`;
  });

  result = result.replace(/^> ```(\w*)\n((?:^> [^\n]*\n?)*?)^> ```/gm, (_m, lang, code) => {
    const cleaned = code.split('\n').map(l => l.replace(/^> ?/, '')).join('\n').trim();
    codeBlocks.push({ lang, code: cleaned });
    return `> __FENCED_${codeBlocks.length - 1}__`;
  });

  const footnotes = [];
  result = result.replace(/^\[\^(.+?)\]:\s*(.*)$/gm, (_m, label, content) => {
    footnotes.push({ label, content });
    return `__FN_${footnotes.length - 1}__`;
  });

  result = result.replace(/^######\s+(.+)$/gm, 'h6. $1');
  result = result.replace(/^#####\s+(.+)$/gm, 'h5. $1');
  result = result.replace(/^####\s+(.+)$/gm, 'h4. $1');
  result = result.replace(/^###\s+(.+)$/gm, 'h3. $1');
  result = result.replace(/^##\s+(.+)$/gm, 'h2. $1');
  result = result.replace(/^#\s+(.+)$/gm, 'h1. $1');

  // P0-18: Handle ***bold italic*** first
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '__BOLDITALIC_$1_BOLDITALIC__');
  result = result.replace(/\*\*(.+?)\*\*/g, '__BOLD_$1_BOLD__');
  result = result.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '_$1_');
  result = result.replace(/__BOLDITALIC_(.+?)_BOLDITALIC__/g, '*_$1_*');
  result = result.replace(/__BOLD_(.+?)_BOLD__/g, '*$1*');

  result = result.replace(/`([^\n`]+)`/g, '{{$1}}');
  result = result.replace(/!\[(.+?)\]\((.+?)\)/g, '!$2!');
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '[$1|$2]');
  result = result.replace(/\[\^(.+?)\]/g, '[fn:$1]');

  result = result.replace(/((?:^>[^\n]*\n?)+)/gm, (match) => {
    const lines = match.trim().split('\n').map(l => l.replace(/^>\s?/, '').trim()).filter(l => l);
    return lines.map(l => 'bq. ' + l).join('\n') + '\n';
  });

  result = result.replace(/^[-*]{3,}$/gm, '----');

  result = result.replace(/^(\s*)[-*+]\s+/gm, (_m, indent) => {
    const level = Math.floor(indent.length / 2) + 1;
    return '*'.repeat(level) + ' ';
  });

  result = result.replace(/^(\s*)\d+\.\s+/gm, (_m, indent) => {
    const level = Math.floor(indent.length / 2) + 1;
    return '#'.repeat(level) + ' ';
  });

  for (let i = 0; i < footnotes.length; i++) {
    const fn = footnotes[i];
    let content = fn.content
      .replace(/\*\*(.+?)\*\*/g, '*$1*')
      .replace(/\[(.+?)\]\((.+?)\)/g, '[$1|$2]');
    result = result.replace(`__FN_${i}__`, '\n[fn:' + fn.label + '] ' + content);
  }

  for (let i = 0; i < codeBlocks.length; i++) {
    const cb = codeBlocks[i];
    const langAttr = cb.lang ? `:language=${cb.lang}` : '';
    const restored = `{code${langAttr}}\n${cb.code}\n{code}`;
    result = result.replace(`> __FENCED_${i}__`, restored);
    result = result.replace(`__FENCED_${i}__`, restored);
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

program
  .name('md-to-confluence')
  .description('Convert Markdown to Confluence wiki markup')
  .version(pkg.version);

program.command('convert')
  .description('Convert a Markdown file to Confluence markup')
  .requiredOption('-i, --input <file>', 'Input Markdown file')
  .requiredOption('-o, --output <file>', 'Output file')
  .action(async (opts) => {
    try {
      const { input, output } = resolveInOut(opts);
      const md = readInput(input);
      const result = mdToConfluence(md);
      writeOutput(output, result);
    } catch (e) { handleError(e); }
  });

program.parse();
