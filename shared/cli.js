/**
 * Shared CLI utilities for all 16 converter tools.
 *
 * Provides:
 * - resolveInOut: resolves input/output paths from commander options
 * - handleError: consistent error formatting and exit
 * - readInput: read and validate input file
 * - writeOutput: write output with logging
 */

const fs = require('fs');
const path = require('path');

/**
 * Resolve input and output paths from commander options.
 * @param {Object} opts - Commander options object
 * @returns {{ input: string, output: string }}
 */
function resolveInOut(opts) {
  const input = path.resolve(opts.input);
  const output = path.resolve(opts.output);
  return { input, output };
}

/**
 * Validate input file exists, exit with error if not.
 * @param {string} inputPath
 */
function validateInput(inputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }
}

/**
 * Read input file contents.
 * @param {string} inputPath
 * @returns {string}
 */
function readInput(inputPath) {
  validateInput(inputPath);
  return fs.readFileSync(inputPath, 'utf-8');
}

/**
 * Write output with logging.
 * @param {string} outputPath
 * @param {string} content
 */
function writeOutput(outputPath, content) {
  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`Done: ${outputPath} (${content.length} chars)`);
}

/**
 * Consistent error handling wrapper.
 * @param {Error} err
 */
function handleError(err) {
  console.error('Error:', err.message);
  process.exit(1);
}

module.exports = { resolveInOut, validateInput, readInput, writeOutput, handleError };
