---
title: DeepSeek V4 发布概况与关键技术
summary: 拆解 DeepSeek V4 的发布概况、Engram 架构创新、基准表现与定价策略，归纳对 DeepInsight 的 4 条启示
tags: [insight-report, LLM, deepseek, model-release, mock-demo]
screenshot: screenshot.png
---

# 阿宝的前期探索 · DeepSeek V4 洞察报告

> DeepInsight 应用最终产出形态的 demo：一份关于 DeepSeek V4 发布的结构化洞察报告。
> 内容基于 2026-04-25 ���开搜索结果归纳，部分基准数字为示意 mock，不调真 LLM API。

## 思路

DeepSeek V4 于 2026-04-24 发布，是开源阵营首次在 SWE-bench Verified 上逼近闭源前沿的模型。报告从四个维度拆解：

- **发布概况**：时间线、两个变体（V4-Pro / V4-Flash）、开源策略
- **架构创新**：Engram 条件记忆机制、MoE 拓扑、多模态生成
- **基准表现**：SWE-bench 81%、MMLU、HumanEval、MATH 横向对比
- **定价策略**：$0.30/MTok 输入，比 Claude Opus 4.6 便宜 87%

报告形态沿用 test1 的设计系统（左 TOC + 中正文 + 右元信息 + 图表 + 来源卡片），新增了柱状图组件。

## 怎么本地查看

```bash
cd explorations/阿宝
start index.html       # Windows
open index.html        # macOS
```

单文件 HTML（CSS/JS 内联），双击就能看，无构建依赖。

## 我借鉴了

- `explorations/阿宝-test1/` — 设计系统（CSS 变量、TOC scrollspy、组件样式）

## 自检

- [x] `index.html` 存在且能本地打开
- [x] `README.md` frontmatter 已填
- [ ] 截图 `screenshot.png`（可后补）
- [x] 没改 `/web` 或其他同事目录

## 变更记录

- 2026-04-25 初始化 + DeepSeek V4 洞察报告 demo
