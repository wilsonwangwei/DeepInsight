import { createProvider } from './llm-provider.mjs';
import { getSurveyPrompt, getAutoTagPrompt } from './prompts.mjs';
import { markdownToHTML } from './markdown-to-html.mjs';
import { saveReport } from './storage.mjs';
import crypto from 'crypto';

function generateMarpMarkdown(markdown, topic, tags) {
  const allTags = [...(tags.user || []), ...(tags.auto || [])];
  const frontmatter = `---
marp: true
theme: default
paginate: true
backgroundColor: #fff
---

<!-- _class: lead -->

# ${topic}

**标签**: ${allTags.join(' · ')}

---

`;

  // 将 ## 标题转为分页
  const slides = markdown.split(/\n## /).map((section, i) => {
    if (i === 0) return section.replace(/^# .*\n/, ''); // 移除第一个 h1
    return `## ${section}`;
  }).filter(s => s.trim());

  return frontmatter + slides.join('\n\n---\n\n');
}

export async function generateSurvey({ topic, timeRange, userTags = [], provider = 'claude' }) {
  const llm = createProvider(provider);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  console.log(`[1/3] 生成综述报告：${topic} ...`);
  const prompt = getSurveyPrompt(topic, timeRange);
  const result = await llm.generate(prompt);
  let markdown = result.text;

  // 清理 LLM 输出中的 XML 标签（thinking、reflection 等）
  markdown = markdown.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  markdown = markdown.replace(/<reflection>[\s\S]*?<\/reflection>/gi, '');
  markdown = markdown.replace(/<search_quality_reflection>[\s\S]*?<\/search_quality_reflection>/gi, '');
  markdown = markdown.trim();

  console.log(`[2/3] 自动提取标签 ...`);
  let autoTags = [];
  try {
    const tagResult = await llm.generate(getAutoTagPrompt(markdown), { maxTokens: 256 });
    const match = tagResult.text.match(/\[[\s\S]*?\]/);
    if (match) autoTags = JSON.parse(match[0]);
  } catch (_) {
    console.log('  标签提取失败，跳过');
  }

  const tags = { user: userTags, auto: autoTags, categories: [] };
  const inputCost = (result.usage.input / 1_000_000) * 3;
  const outputCost = (result.usage.output / 1_000_000) * 15;
  const cost = inputCost + outputCost;

  const metadata = {
    inputTokens: result.usage.input,
    outputTokens: result.usage.output,
    cost,
    llmProvider: provider,
    confidence: 0.85,
  };

  console.log(`[3/3] 生成 HTML + Marp Markdown + 存储 ...`);
  const html = markdownToHTML(markdown, topic, { createdAt, tags, cost, llmProvider: provider });
  const marpMarkdown = generateMarpMarkdown(markdown, topic, tags);

  const report = { id, title: topic, createdAt, type: 'survey', tags, markdown, html, marpMarkdown, metadata };
  const { dir, slug } = saveReport(report);

  console.log(`\n✓ 报告生成完成！`);
  console.log(`  Markdown: ${dir}/${slug}.md`);
  console.log(`  HTML:     ${dir}/${slug}.html`);
  console.log(`  Marp PPT: ${dir}/${slug}.marp.md`);
  console.log(`  元数据:   ${dir}/${slug}.meta.json`);
  console.log(`  标签:     [${[...userTags, ...autoTags].join(', ')}]`);
  console.log(`  Token:    ${result.usage.input} in / ${result.usage.output} out`);
  console.log(`  成本:     $${cost.toFixed(4)}`);

  return report;
}
