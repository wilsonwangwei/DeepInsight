---
title: 洞察 Agent MVP — 课题综述 CLI
summary: Node.js CLI 工具，输入技术课题，调用 Claude 生成 Markdown + HTML 综述报告，支持标签过滤
tags: [insight-agent, CLI, LLM, survey, mock-demo]
screenshot: screenshot.png
---

# 阿伟的前期探索 · 洞察 Agent MVP

> Spec 001 的 MVP 实现：能力 1（指定课题综述）。CLI 工具 + HTML 报告查看器。

## 思路

验证"用户输入课题 → Agent 自动生成结构化综述报告"的核心流程。MVP 阶段用 Claude API 基于训练数据生成综述（不调外部信息源），输出 Markdown + HTML 双格式，按日期归档，支持标签过滤。

## 怎么用

```bash
cd explorations/阿伟

# 设置 API Key
export ANTHROPIC_API_KEY=sk-ant-...

# 生成报告
node insight-cli.mjs --topic "Rust 异步运行时演进"
node insight-cli.mjs --topic "LLM Agent 架构" --tags "LLM,Agent" --time "2025-2026"

# 查看报告列表
start index.html    # Windows
open index.html     # macOS
```

## 文件结构

```
├── index.html              # 报告查看器（标签过滤）
├── insight-cli.mjs         # CLI 入口
├── lib/
│   ├── llm-provider.mjs    # LLM 抽象层（Claude）
│   ├── report-generator.mjs # 报告生成 pipeline
│   ├── markdown-to-html.mjs # Markdown → HTML
│   ├── storage.mjs          # 报告存储 + 索引
│   └── prompts.mjs          # Prompt 模板
├── reports/                 # 生成的报告（按日期）
│   └── index.json           # 全局索引
└── config.json              # 配置
```

## 我借鉴了

- `explorations/阿宝-test1/` — HTML 报告设计风格参考

## 自检

- [x] `index.html` 存在且能本地打开
- [x] `README.md` frontmatter 已填
- [ ] 截图 `screenshot.png`（可后补）
- [x] 没改 `/web` 或其他同事目录

## 变更记录

- 2026-04-25 初始化（新人入职）
- 2026-04-25 MVP 实现：CLI + LLM Provider + Pipeline + HTML 查看器
