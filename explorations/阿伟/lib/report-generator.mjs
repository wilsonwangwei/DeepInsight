import { createProvider } from './llm-provider.mjs';
import { getSurveyPrompt, getAutoTagPrompt } from './prompts.mjs';
import { markdownToHTML } from './markdown-to-html.mjs';
import { saveReport } from './storage.mjs';
import crypto from 'crypto';

export async function generateSurvey({ topic, timeRange, userTags = [], provider = 'claude' }) {
  const llm = createProvider(provider);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  console.log(`[1/3] 生成综述报告：${topic} ...`);
  const prompt = getSurveyPrompt(topic, timeRange);
  const result = await llm.generate(prompt);
  const markdown = result.text;

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

  console.log(`[3/3] 生成 HTML + 存储 ...`);
  const html = markdownToHTML(markdown, topic, { createdAt, tags, cost, llmProvider: provider });

  const report = { id, title: topic, createdAt, type: 'survey', tags, markdown, html, metadata };
  const { dir, slug } = saveReport(report);

  console.log(`\n✓ 报告生成完成！`);
  console.log(`  Markdown: ${dir}/${slug}.md`);
  console.log(`  HTML:     ${dir}/${slug}.html`);
  console.log(`  元数据:   ${dir}/${slug}.meta.json`);
  console.log(`  标签:     [${[...userTags, ...autoTags].join(', ')}]`);
  console.log(`  Token:    ${result.usage.input} in / ${result.usage.output} out`);
  console.log(`  成本:     $${cost.toFixed(4)}`);

  return report;
}
