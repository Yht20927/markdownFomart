#!/usr/bin/env node
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const { resolveInOut, readInput, writeOutput, handleError } = require('../shared/cli');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

function mdToRst(md) {
  let result = md;

  // Code blocks (extract first)
  const codeBlocks = [];
  result = result.replace(/^[^\S\n]*```(\w*)\n([\s\S]*?)\n[^\S\n]*```/gm, (_m, lang, code) => {
    codeBlocks.push({ lang, code: code.trim() });
    return `<<CODEBLOCK_${codeBlocks.length - 1}>>`;
  });

  // Also extract code blocks inside blockquotes
  result = result.replace(/^> ```(\w*)\n((?:^> [^\n]*\n?)*?)^> ```/gm, (_m, lang, code) => {
    const cleaned = code.split('\n').map(l => l.replace(/^> ?/, '')).join('\n').trim();
    codeBlocks.push({ lang, code: cleaned });
    return `> <<CODEBLOCK_${codeBlocks.length - 1}>>`;
  });

  // Protect footnote definitions
  const footnotes = [];
  result = result.replace(/^\[\^(.+?)\]:\s*(.*)$/gm, (_m, label, content) => {
    footnotes.push({ label, content });
    return `<<FN_${footnotes.length - 1}>>`;
  });

  // P0-13: Match underline length to heading text length
  result = result.replace(/^######\s+(.+)$/gm, (_m, title) => title + '\n' + '"'.repeat(title.trim().length) + '\n');
  result = result.replace(/^#####\s+(.+)$/gm, (_m, title) => title + '\n' + '^'.repeat(title.trim().length) + '\n');
  result = result.replace(/^####\s+(.+)$/gm, (_m, title) => title + '\n' + '~'.repeat(title.trim().length) + '\n');
  result = result.replace(/^###\s+(.+)$/gm, (_m, title) => title + '\n' + '-'.repeat(title.trim().length) + '\n');
  result = result.replace(/^##\s+(.+)$/gm, (_m, title) => title + '\n' + '='.repeat(title.trim().length) + '\n');
  result = result.replace(/^#\s+(.+)$/gm, (_m, title) => title + '\n' + '='.repeat(title.trim().length) + '\n');

  result = result.replace(/`([^`]+)`/g, '``$1``');
  result = result.replace(/!\[(.+?)\]\((.+?)\)/g, '.. image:: $2\n   :alt: $1\n');
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '`$1 <$2>`_');
  result = result.replace(/\[\^(.+?)\]/g, '[#$1]_');

  result = result.replace(/((?:^>[^\n]*\n?)+)/gm, (match) => {
    const lines = match.split('\n').map(l => l.replace(/^>\s?/, ''));
    return lines.map(l => '    ' + l).join('\n') + '\n';
  });

  result = result.replace(/^(\s*)[-*+]\s+/gm, '$1* ');
  result = result.replace(/^(\s*)\d+\.\s+/gm, '$1#. ');
  result = result.replace(/^[-*]{3,}$/gm, '----');

  for (let i = 0; i < codeBlocks.length; i++) {
    const cb = codeBlocks[i];
    const langOpt = cb.lang ? `\n   :language: ${cb.lang}` : '';
    const indented = cb.code.split('\n').map(l => '   ' + l).join('\n');
    const restored = `.. code::${langOpt}\n\n${indented}`;
    result = result.replace(`> <<CODEBLOCK_${i}>>`, restored);
    result = result.replace(`<<CODEBLOCK_${i}>>`, restored);
  }

  for (let i = 0; i < footnotes.length; i++) {
    const fn = footnotes[i];
    let content = fn.content
      .replace(/\*\*(.+?)\*\*/g, '**$1**')
      .replace(/\[(.+?)\]\((.+?)\)/g, '`$1 <$2>`_');
    // P0-14: Add # prefix to match [#label]_ reference format
    result = result.replace(`<<FN_${i}>>`, `.. [#${fn.label}] ${content}`);
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

program
  .name('md-to-rst')
  .description('Convert Markdown to reStructuredText')
  .version(pkg.version);

program.command('convert')
  .description('Convert a Markdown file to RST')
  .requiredOption('-i, --input <file>', 'Input Markdown file')
  .requiredOption('-o, --output <file>', 'Output .rst file')
  .action(async (opts) => {
    try {
      const { input, output } = resolveInOut(opts);
      const md = readInput(input);
      const result = mdToRst(md);
      writeOutput(output, result);
    } catch (e) { handleError(e); }
  });

program.parse();
