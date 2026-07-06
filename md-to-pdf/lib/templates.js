const fs = require('fs');
const path = require('path');

const templatesPath = path.join(__dirname, '..', 'templates.json');

// F-2: Module-level cache — load templates once, reuse across calls
let _cache = null;

function loadTemplates() {
  if (_cache) return _cache;
  if (!fs.existsSync(templatesPath)) {
    throw new Error(`templates.json not found at ${templatesPath}`);
  }
  _cache = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
  return _cache;
}

function listTemplates() {
  const templates = loadTemplates();
  const baseIds = new Set();
  const unique = [];

  for (const t of templates) {
    // F-3: Also strip -standard suffix, not just -compact/-relaxed
    const baseId = t.id.replace(/-(compact|relaxed|standard)$/, '');
    if (!baseIds.has(baseId)) {
      baseIds.add(baseId);
      unique.push({
        id: baseId,
        name: t.name.en,
        category: t.category,
        fonts: t.fonts,
        hasVariants: templates.some(
          (v) => v.id === baseId + '-compact' || v.id === baseId + '-relaxed'
        ),
      });
    }
  }
  return unique;
}

function getTemplate(id) {
  const templates = loadTemplates();
  let template = templates.find((t) => t.id === id);
  if (!template) {
    template = templates.find((t) => t.id === id + '-standard');
  }
  if (!template) {
    template = templates.find((t) => t.id.replace(/-(compact|relaxed|standard)$/, '') === id.replace(/-(compact|relaxed|standard)$/, ''));
  }
  if (!template) {
    const available = templates.map((t) => t.id).join(', ');
    throw new Error(`Template "${id}" not found. Available: ${available}`);
  }
  return template;
}

function listAllTemplateIds() {
  return loadTemplates().map((t) => t.id);
}

function getCategories() {
  return [...new Set(loadTemplates().map((t) => t.category))];
}

module.exports = { loadTemplates, listTemplates, getTemplate, listAllTemplateIds, getCategories };
