import { marked } from 'marked';

const CSS = `
:root {
  --ink: #18181b;
  --muted: #71717a;
  --muted-2: #a1a1aa;
  --border: #e4e4e7;
  --bg: #ffffff;
  --bg-2: #fafafa;
  --accent: #2563eb;
}
@media (prefers-color-scheme: dark) {
  :root {
    --ink: #fafafa;
    --muted: #a1a1aa;
    --muted-2: #71717a;
    --border: #27272a;
    --bg: #09090b;
    --bg-2: #18181b;
    --accent: #60a5fa;
  }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
  color: var(--ink);
  background: var(--bg);
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}
h1 { font-size: 2.5rem; margin: 2rem 0 1rem; font-weight: 700; }
h2 { font-size: 1.75rem; margin: 2rem 0 1rem; font-weight: 600; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; }
h3 { font-size: 1.25rem; margin: 1.5rem 0 0.75rem; font-weight: 600; }
p { margin: 1rem 0; }
ul, ol { margin: 1rem 0; padding-left: 2rem; }
li { margin: 0.5rem 0; }
table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
th, td { border: 1px solid var(--border); padding: 0.75rem; text-align: left; }
th { background: var(--bg-2); font-weight: 600; }
code { background: var(--bg-2); padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.9em; font-family: "Courier New", monospace; }
pre { background: var(--bg-2); padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 1rem 0; }
pre code { background: none; padding: 0; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
.meta { color: var(--muted); font-size: 0.9rem; margin: 1rem 0; }
`;

export function markdownToHTML(markdown, title, metadata = {}) {
  const html = marked(markdown);
  const { createdAt, tags = {}, cost = 0, llmProvider = 'claude' } = metadata;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — DeepInsight</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="meta">
    生成时间：${createdAt || new Date().toISOString().slice(0, 10)} ·
    模型：${llmProvider} ·
    成本：$${cost.toFixed(4)} ·
    标签：${[...(tags.user || []), ...(tags.auto || [])].join(', ')}
  </div>
  ${html}
  <hr>
  <div class="meta">
    本报告由 DeepInsight 洞察 Agent 生成 ·
    <a href="https://github.com/Boris-hbx/DeepInsight" target="_blank">GitHub</a>
  </div>
</body>
</html>`;
}
