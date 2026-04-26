#!/usr/bin/env node
import { generateSurvey } from './lib/report-generator.mjs';

const args = process.argv.slice(2);

function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

const topic = getArg('topic');
const timeRange = getArg('time');
const tagsRaw = getArg('tags');
const provider = getArg('provider') || 'claude';

if (!topic) {
  console.log(`
DeepInsight 洞察 Agent CLI (MVP)

用法：
  node insight-cli.mjs --topic "课题名称" [选项]

选项：
  --topic    技术课题（必填）
  --time     时间范围，如 "2024-2026"
  --tags     用户标签，逗号分隔，如 "LLM,Rust"
  --provider LLM 后端，默认 claude

示例：
  node insight-cli.mjs --topic "Rust 异步运行时演进"
  node insight-cli.mjs --topic "LLM Agent 架构" --tags "LLM,Agent" --time "2025-2026"
`);
  process.exit(0);
}

const userTags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];

console.log('');
console.log('🔍 DeepInsight 洞察 Agent');
console.log('─'.repeat(40));
console.log(`  课题: ${topic}`);
if (timeRange) console.log(`  时间: ${timeRange}`);
if (userTags.length) console.log(`  标签: ${userTags.join(', ')}`);
console.log(`  模型: ${provider}`);
console.log('');

generateSurvey({ topic, timeRange, userTags, provider }).catch(err => {
  console.error('✗ 生成失败:', err.message || err);
  process.exit(1);
});
