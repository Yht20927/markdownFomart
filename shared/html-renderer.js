function createRenderer({ Marked, katex, hljs }) {
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderKatex(tex, displayMode) {
    try {
      return katex.renderToString(tex.trim(), { displayMode, throwOnError: false });
    } catch {
      return displayMode
        ? `<pre class="katex-error">${escapeHtml(tex)}</pre>`
        : `<code class="katex-error">${escapeHtml(tex)}</code>`;
    }
  }

  function processMath(md) {
    const codeBlocks = [];
    let processed = md.replace(/```[\s\S]*?```/g, (m) => {
      codeBlocks.push(m);
      return `__CB_${codeBlocks.length - 1}__`;
    });

    const inlineMath = [];
    processed = processed.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (_m, tex) => {
      inlineMath.push(renderKatex(tex, false));
      return `__IM_${inlineMath.length - 1}__`;
    });

    const blockMath = [];
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_m, tex) => {
      blockMath.push(renderKatex(tex, true));
      return `__BM_${blockMath.length - 1}__`;
    });

    return { text: processed, codeBlocks, inlineMath, blockMath };
  }

  function restorePlaceholders(html, codeBlocks, inlineMath, blockMath) {
    let result = html;
    for (let i = 0; i < inlineMath.length; i++) {
      result = result.replace(`__IM_${i}__`, inlineMath[i]);
    }
    for (let i = 0; i < blockMath.length; i++) {
      result = result.replace(`__BM_${i}__`, blockMath[i]);
    }
    for (let i = 0; i < codeBlocks.length; i++) {
      result = result.replace(`__CB_${i}__`, codeBlocks[i]);
    }
    return result;
  }

  function renderMarkdown(md) {
    const { text, codeBlocks, inlineMath, blockMath } = processMath(md);
    const marked = new Marked();
    marked.setOptions({
      highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try { return hljs.highlight(code, { language: lang }).value; } catch {}
        }
        return escapeHtml(code);
      },
      breaks: true,
      gfm: true,
    });
    const html = marked.parse(text);
    return restorePlaceholders(html, codeBlocks, inlineMath, blockMath);
  }

  return { escapeHtml, processMath, restorePlaceholders, renderMarkdown, renderKatex };
}

module.exports = { createRenderer };
