import { createProvider } from './llm-provider.mjs';
import { getSurveyPrompt, getAutoTagPrompt } from './prompts.mjs';
import { markdownToHTML } from './markdown-to-html.mjs';
import { saveReport } from './storage.mjs';
import { getSkillsForTopic } from './feedback.mjs';
import crypto from 'crypto';

function generateMarpMarkdown(markdown, topic, tags) {
  const allTags = [...new Set([...(tags.user || []), ...(tags.auto || [])])];
  const frontmatter = `---
marp: true
theme: default
paginate: true
backgroundColor: #fff
style: |
  section { font-size: 22px; }
  h1 { font-size: 36px; }
  h2 { font-size: 28px; color: #2563eb; }
  h3 { font-size: 22px; }
  table { font-size: 16px; }
  ul, ol { font-size: 20px; }
  p { font-size: 20px; }
  .small { font-size: 16px; }
---

<!-- _class: lead -->

# ${topic}

**${allTags.join(' · ')}**

---

`;

  const sections = markdown.split(/\n## /).slice(1);
  const slides = [];

  for (const section of sections) {
    const lines = section.split('\n');
    const title = lines[0].trim();
    const body = lines.slice(1).join('\n').trim();

    if (body.includes('### ')) {
      const subs = body.split(/\n### /);
      const intro = subs[0].trim();
      if (intro) {
        slides.push(`## ${title}\n\n${truncate(intro)}`);
      }
      for (let i = 1; i < subs.length; i++) {
        const subLines = subs[i].split('\n');
        const subTitle = subLines[0].trim();
        const subBody = subLines.slice(1).join('\n').trim();
        slides.push(`### ${subTitle}\n\n${truncate(subBody)}`);
      }
    } else if (body.includes('|')) {
      const tableSlides = splitTable(title, body);
      slides.push(...tableSlides);
    } else {
      slides.push(`## ${title}\n\n${truncate(body)}`);
    }
  }

  return frontmatter + slides.join('\n\n---\n\n');
}

function truncate(text, maxChars = 600) {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSentence = cut.lastIndexOf('。');
  const lastPeriod = cut.lastIndexOf('. ');
  const breakAt = Math.max(lastSentence, lastPeriod);
  return (breakAt > maxChars * 0.3 ? cut.slice(0, breakAt + 1) : cut) + '\n\n*(...)*';
}

function splitTable(title, body) {
  const lines = body.split('\n');
  const tableStart = lines.findIndex(l => l.trim().startsWith('|'));
  if (tableStart < 0) return [`## ${title}\n\n${truncate(body, 10)}`];

  const before = lines.slice(0, tableStart).join('\n').trim();
  const tableLines = [];
  for (let i = tableStart; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|')) tableLines.push(lines[i]);
    else break;
  }

  if (tableLines.length <= 2) return [`## ${title}\n\n${body}`];

  const header = tableLines[0];
  const sep = tableLines[1];
  const rows = tableLines.slice(2);
  const slides = [];

  if (before) slides.push(`## ${title}\n\n${truncate(before)}`);

  const ROWS_PER_SLIDE = 3;
  for (let i = 0; i < rows.length; i += ROWS_PER_SLIDE) {
    const chunk = rows.slice(i, i + ROWS_PER_SLIDE);
    const pageNum = rows.length > ROWS_PER_SLIDE ? ` (${Math.floor(i / ROWS_PER_SLIDE) + 1}/${Math.ceil(rows.length / ROWS_PER_SLIDE)})` : '';
    slides.push(`## ${title}${pageNum}\n\n${header}\n${sep}\n${chunk.join('\n')}`);
  }

  const afterStart = tableStart + tableLines.length;
  const after = lines.slice(afterStart).join('\n').trim();
  if (after) slides.push(`## ${title}\n\n${truncate(after)}`);

  return slides;
}

export async function generateSurvey({ topic, timeRange, userTags = [], provider = 'claude' }) {
  const llm = createProvider(provider);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  console.log(`[1/3] 生成综述报告：${topic} ...`);

  // 加载匹配的 Skills（来自历史反馈）
  const skills = getSkillsForTopic(topic);
  let skillHint = '';
  if (skills.length > 0) {
    console.log(`  发现 ${skills.length} 个相关 Skill，注入 prompt`);
    skillHint = '\n\n请特别注意以下来自历史反馈的要求：\n' +
      skills.map(s => `- [${s.type}] ${s.content}`).join('\n');
  }

  const prompt = getSurveyPrompt(topic, timeRange) + skillHint;
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
  const html = markdownToHTML(markdown, topic, { createdAt, tags, cost, llmProvider: provider, reportId: id });
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
