function createRenderer({ Marked, katex, hljs }) {
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
    // Match fenced code blocks at line start (allow leading whitespace).
    // Require closing ``` on its own line to skip inline triple backticks.
    // Blockquote code blocks (> ```) are excluded (Marked handles them natively).
    let processed = md.replace(/^[^\S\n]*```(\w*)\n([\s\S]*?)\n[^\S\n]*```/gm, (_m, lang, code) => {
      let highlighted;
      if (lang && hljs && hljs.getLanguage(lang)) {
        try { highlighted = hljs.highlight(code, { language: lang }).value; } catch { highlighted = escapeHtml(code); }
      } else {
        highlighted = escapeHtml(code);
      }
      const langClass = lang ? ` class="language-${lang}"` : '';
      codeBlocks.push(`<pre><code${langClass}>${highlighted}</code></pre>`);
      return `<!--CB:${codeBlocks.length - 1}-->`;
    });

    const inlineMath = [];
    processed = processed.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (_m, tex) => {
      inlineMath.push(renderKatex(tex, false));
      return `<!--IM:${inlineMath.length - 1}-->`;
    });

    const blockMath = [];
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_m, tex) => {
      blockMath.push(renderKatex(tex, true));
      return `<!--BM:${blockMath.length - 1}-->`;
    });

    return { text: processed, codeBlocks, inlineMath, blockMath };
  }

  function restorePlaceholders(html, codeBlocks, inlineMath, blockMath) {
    let result = html;
    for (let i = 0; i < inlineMath.length; i++) {
      result = result.replace(`<!--IM:${i}-->`, inlineMath[i]);
    }
    for (let i = 0; i < blockMath.length; i++) {
      result = result.replace(`<!--BM:${i}-->`, blockMath[i]);
    }
    for (let i = 0; i < codeBlocks.length; i++) {
      result = result.replace(`<!--CB:${i}-->`, codeBlocks[i]);
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
      async: false,
    });
    const html = marked.parse(text, { async: false });
    return restorePlaceholders(html, codeBlocks, inlineMath, blockMath);
  }

  return { escapeHtml, processMath, restorePlaceholders, renderMarkdown, renderKatex };
}

module.exports = { createRenderer };
