const fs = require('fs');
const path = require('path');

const templatesPath = path.join(__dirname, '..', 'templates.json');

function loadTemplates() {
  if (!fs.existsSync(templatesPath)) {
    throw new Error(`templates.json not found at ${templatesPath}`);
  }
  return JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));
}

function listTemplates() {
  const templates = loadTemplates();
  const baseIds = new Set();
  const unique = [];

  for (const t of templates) {
    const baseId = t.id.replace(/-(compact|relaxed)$/, '');
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
