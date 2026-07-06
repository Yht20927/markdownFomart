/**
 * Tests for md-to-text P0 fixes
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const toolPath = path.join(__dirname, '..', 'index.js');

function runConvert(md) {
  const inFile = `/tmp/md-to-text-test-${Date.now()}.md`;
  const outFile = `/tmp/md-to-text-test-${Date.now()}.txt`;
  fs.writeFileSync(inFile, md);
  execSync(`node "${toolPath}" convert -i "${inFile}" -o "${outFile}"`, { encoding: 'utf8' });
  const result = fs.readFileSync(outFile, 'utf8');
  fs.unlinkSync(inFile);
  fs.unlinkSync(outFile);
  return result;
}

describe('md-to-text P0 fixes', () => {
  it('should not leave ! residue from images (P0-11)', () => {
    const text = runConvert('![x](u.png) [link](url)');
    assert.ok(!text.includes('!'), `Output should not contain '!': ${text}`);
    assert.ok(text.includes('link'));
  });

  it('should protect code block content from formatting strips (P0-12)', () => {
    const md = '```\n**not bold**\n```';
    const text = runConvert(md);
    assert.ok(text.includes('**not bold**'), `Code block content should be preserved: ${text}`);
  });

  it('should protect inline code from formatting strips (P0-12)', () => {
    const text = runConvert('This `**not bold**` is code');
    assert.ok(text.includes('**not bold**'), `Inline code content should be preserved: ${text}`);
  });

  it('should handle images before links correctly', () => {
    const text = runConvert('![img](a.png) [link](url)');
    assert.ok(text.includes('link'));
    assert.ok(!text.includes('!'));
    assert.ok(!text.includes('img'));
    assert.ok(!text.includes('a.png'));
  });
});
