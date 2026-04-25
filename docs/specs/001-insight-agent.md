---
id: 001
title: 洞察 Agent（Insight Agent）
author: 阿伟
reviewers: []
status: approved
created: 2026-04-25
updated: 2026-04-25
related_adrs: []
related_tasks: []
---

# 001 · 洞察 Agent（Insight Agent）

> DeepInsight 核心产品能力：技术趋势洞察、业界实践分析、关键技术综述。

## 1. 问题 / 动机

当前团队跟踪技术趋势的方式是**零散的人工阅读** —— 每人订阅几个博客、偶尔刷 Twitter、看到论文随手存书签。这导致：

1. **信息孤岛**：每人看到的内容不同，团队缺乏共识
2. **时效性差**：重要技术突破（如 DeepSeek V4 发布）可能几天后才被注意到
3. **深度不足**：碎片化阅读难以形成系统性理解
4. **无法追溯**：看过的内容没有结构化存档，事后难以查找

我们需要一个 **Agent 驱动的洞察系统**，自动完成信息采集、结构化分析、报告生成，让团队从"被动阅读"变为"主动洞察"。

## 2. 目标（Goals）

**MVP 阶段（P0）**：
- [ ] **能力 1 · 指定课题综述**：用户输入技术课题（如"Rust 异步运行时演进"），Agent 在 5 分钟内输出综述报告
- [ ] **多格式输出**：
  - Markdown 文件（可文本展示、可导出 PPT）
  - HTML 静态报告（类似 `explorations/阿宝/` demo，双击可看，可分享）
- [ ] **报告归档与标签**：
  - 按日期存放（`reports/YYYY/MM/DD/`）
  - 用户可指定技术专题标签（如 `#LLM` `#Rust` `#分布式`）
  - Agent 自动补充标签（基于内容分析）
  - 查看系统支持按标签过滤、搜索历史报告
- [ ] **多 LLM 后端**：默认 Claude，可配置切换 DeepSeek V4 / GPT-4o 等

**后续迭代（P1/P2）**：
- [ ] **能力 2 · 定时扫描**：每天 22:00 自动扫描配置的信息源（X 技术大拿、微信公众号、智库网站），按权威性/热度排序，每分类输出 TOP3，生成每日摘要
- [ ] **能力 3 · PDF/链接分析**：用户上传 PDF 或粘贴链接，Agent 输出结构化洞察（摘要、关键技术点、与现有知识的关联、可行动建议）
- [ ] **可配置信息源**：支持插件式扩展，每个分类（X、微信、智库、arXiv 预印论文、GitHub 开源项目）可独立配置账号/关键词/过滤规则

## 3. 非目标（Non-Goals）

- **不做实时推送**：定时扫描已足够，不做 WebSocket 实时通知（推迟到用户反馈后再评估）
- **不做社交功能**：不做评论、点赞、分享到社交网络（DeepInsight 是分析工具，不是社区）
- **不做自动决策**：Agent 只输出洞察报告，不自动执行"基于洞察的行动"（如自动提 issue、自动调整技术栈）
- **不做多语言翻译**：MVP 阶段只支持中英文混合输入输出，其他语言推迟
- **暂不做协作功能**：不做多人共享报告、批注、讨论（推迟到 spec 002）

## 4. 方案 / 设计

### 4.1 用户视角

#### 能力 1：指定课题综述

**用户流程**：
1. 打开 DeepInsight 主应用（`/web`），点"新建洞察"
2. 选择"课题综述"模式，输入课题（如"Rust 异步运行时演进"）
3. 可选：指定时间范围（如"2024-2026"）、信息源偏好（学术论文 vs 工程博客）
4. 点"开始分析"，进度条显示"采集中 → 分析中 → 生成报告"
5. 5 分钟后，看到结构化报告：
   - TL;DR（3 句话摘要）
   - 时间线（关键里程碑）
   - 技术对比表（Tokio vs async-std vs Smol）
   - 引用来源（每条结论可追溯到原文）
   - 可行动建议（"如果你在做 X，建议关注 Y"）

#### 能力 2：定时扫描

**用户流程**：
1. 进入"设置 → 信息源配置"
2. 添加信息源：
   - X (Twitter)：输入要关注的技术大拿账号列表（如 @antirez, @graydon_pub）
   - 微信公众号：输入公众号名称（如"阮一峰的网络日志"）
   - 智库网站：输入 URL + CSS 选择器（如 ThoughtWorks Tech Radar）
3. 设置分类标签（如"编程语言"、"数据库"、"AI"）
4. 每天 22:00，Agent 自动扫描，次日早上看到"昨日洞察"：
   - 每个分类 TOP3 信息（按权威性 × 热度排序）
   - 每条信息：标题、摘要、来源、为什么重要
   - 全局摘要："昨天最值得关注的 3 件事"

#### 能力 3：PDF/链接分析

**用户流程**：
1. 点"新建洞察" → "上传资料"
2. 上传 PDF（如论文）或粘贴 URL（如博客链接）
3. Agent 输出：
   - 摘要（200 字）
   - 关键技术点（bullet list）
   - 与现有知识的关联（"这篇论文的 X 技术与我们之前分析的 Y 相关"）
   - 可行动建议（"如果你在做 Z 项目，可以借鉴这篇的 W 方法"）
   - 引用追溯（每个结论标注来源段落）

### 4.2 技术设计

#### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     用户界面 (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │课题综述  │  │定时扫描  │  │PDF分析   │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Insight Agent Core                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Pipeline: 采集 → 分析 → 报告生成                │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ LLM Provider │  │Source Provider│  │Report Schema│  │
│  │  抽象层      │  │   插件系统    │  │  (JSON)     │  │
│  └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   外部依赖                               │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐    │
│  │Claude│  │DeepSeek│ │X API │  │微信  │  │智库  │    │
│  │ API  │  │  V4   │  │      │  │公众号│  │网站  │    │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘    │
└─────────────────────────────────────────────────────────┘
```

#### 核心模块

**1. LLM Provider 抽象层**

```typescript
// web/src/lib/llm/provider.ts
interface LLMProvider {
  name: string;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateStructured<T>(prompt: string, schema: JSONSchema): Promise<T>;
  estimateCost(inputTokens: number, outputTokens: number): number;
}

class ClaudeProvider implements LLMProvider { /* ... */ }
class DeepSeekProvider implements LLMProvider { /* ... */ }

// 配置文件：web/.env.local
// LLM_PROVIDER=claude  # 或 deepseek, gpt4o
// ANTHROPIC_API_KEY=sk-ant-...
// DEEPSEEK_API_KEY=sk-...
```

**2. Source Provider 插件系统**

```typescript
// web/src/lib/sources/provider.ts
interface SourceProvider {
  type: 'x' | 'wechat' | 'thinktank' | 'arxiv' | 'github' | 'pdf' | 'url';
  fetch(config: SourceConfig): Promise<RawContent[]>;
  rank(contents: RawContent[]): RankedContent[];
}

interface RawContent {
  title: string;
  body: string;
  url: string;
  author: string;
  publishedAt: Date;
  metadata: Record<string, any>;
}

interface RankedContent extends RawContent {
  score: number;  // 权威性 × 热度
  reason: string; // 为什么排这个分数
}

// 插件实现
class XProvider implements SourceProvider { /* X API 调用 */ }
class WechatProvider implements SourceProvider { /* 微信公众号爬虫 */ }
class ThinktankProvider implements SourceProvider { /* 智库网站 scraper */ }
class ArxivProvider implements SourceProvider { /* arXiv API 调用 */ }
class GitHubProvider implements SourceProvider { /* GitHub API 调用，搜索 trending/stars */ }
class PDFProvider implements SourceProvider { /* PDF 解析 */ }
```

**3. Pipeline（采集 → 分析 → 报告）**

```typescript
// web/src/lib/insight/pipeline.ts
class InsightPipeline {
  async run(task: InsightTask): Promise<InsightReport> {
    // 1. 采集
    const rawContents = await this.collect(task.sources);
    
    // 2. 排序 & 过滤
    const ranked = await this.rank(rawContents, task.category);
    const top = ranked.slice(0, task.topN || 3);
    
    // 3. LLM 分析
    const analysis = await this.analyze(top, task.prompt);
    
    // 4. 生成报告
    const report = await this.generateReport(analysis, task.format);
    
    return report;
  }
}
```

**4. Report Schema（输出格式）**

报告输出为 Markdown 文件，支持三种消费方式：
- **文本展示**：直接渲染 Markdown（前端或 CLI）
- **HTML 报告**：将 Markdown 渲染为自包含 HTML 页面（内联 CSS/JS，双击可看，可分享），复用 `explorations/阿宝/` 的设计系统（左 TOC + 中正文 + 右元信息）
- **PPT 导出**：通过 Marp 将 Markdown 转换为演示文稿

```typescript
// web/src/lib/insight/schema.ts
interface InsightReport {
  id: string;
  title: string;
  createdAt: Date;
  type: 'survey' | 'daily-scan' | 'pdf-analysis';
  
  // 标签系统
  tags: {
    user: string[];      // 用户指定标签（如 ["LLM", "Rust"]）
    auto: string[];      // Agent 自动生成标签（如 ["异步编程", "性能优化"]）
    categories: string[]; // 技术分类（如 ["编程语言", "系统架构"]）
  };
  
  // Markdown 正文（含 Marp frontmatter，可直接导出 PPT）
  markdown: string;
  
  // HTML 版本（自包含，可分享）
  html: string;
  
  summary: {
    tldr: string[];  // 3 句话摘要
    keyTakeaways: string[];
  };
  
  sources: Source[];
  
  metadata: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    llmProvider: string;
    confidence: number;  // 0-1
  };
  
  // 文件路径（按日期归档）
  filePath: string;  // 如 "reports/2026/04/25/rust-async-runtime-evolution.md"
}
```

**报告存储结构**：
```
reports/
├── 2026/
│   ├── 04/
│   │   ├── 25/
│   │   │   ├── rust-async-runtime-evolution.md
│   │   │   ├── rust-async-runtime-evolution.html
│   │   │   └── rust-async-runtime-evolution.meta.json  # 元数据（标签、来源、成本）
│   │   └── 26/
│   │       └── deepseek-v4-analysis.md
│   └── 05/
│       └── ...
└── index.json  # 全局索引（按标签、日期、类型快速查询）
```

**Markdown 报告结构**：
```markdown
---
marp: true
theme: deepinsight
paginate: true
---

# {课题标题}

> 生成时间：{date} · 模型：{llm_provider} · 来源：{source_count} 份

---

## TL;DR
1. ...
2. ...
3. ...

---

## 关键发现
### 发现 1：{标题}
{内容} [^1]

---

## 对比分析
| 维度 | A | B | C |
|---|---|---|---|
| ... | ... | ... | ... |

---

## 时间线
- **2024-01** {事件}
- **2025-06** {事件}

---

## 来源
[^1]: {title} — {url}
```

**PPT 导出**：使用 `@marp-team/marp-cli` 将 Markdown 转为 PPTX/PDF。

**5. Cron Scheduler（定时扫描）**

```typescript
// web/src/lib/cron/scheduler.ts
// 使用 node-cron 或 Vercel Cron Jobs
import cron from 'node-cron';

cron.schedule('0 22 * * *', async () => {
  const config = await loadScanConfig();
  const pipeline = new InsightPipeline();
  
  for (const category of config.categories) {
    const report = await pipeline.run({
      type: 'daily-scan',
      sources: category.sources,
      category: category.name,
      topN: 3,
    });
    
    await saveReport(report);
  }
});
```

#### 数据流

**能力 1（课题综述）**：
```
用户输入课题
  ↓
Pipeline.collect() → 调用 Web 搜索 API（Tavily/SearXNG）
  ↓
Pipeline.rank() → LLM 评估每条结果的相关性
  ↓
Pipeline.analyze() → LLM 生成综述（含时间线、对比表、引用）
  ↓
Pipeline.generateReport() → 输出 JSON + 前端渲染
```

**能力 2（定时扫描）**：
```
Cron 22:00 触发
  ↓
遍历配置的分类（编程语言、数据库、AI...）
  ↓
每个分类：调用对应 SourceProvider.fetch()
  ↓
SourceProvider.rank() → 按权威性 × 热度排序
  ↓
取 TOP3 → LLM 生成摘要
  ↓
所有分类汇总 → 生成"昨日洞察"报告
  ↓
存数据库，次日用户打开即看
```

**能力 3（PDF 分析）**：
```
用户上传 PDF
  ↓
PDFProvider.fetch() → 解析 PDF（pdf-parse 或 Claude Files API）
  ↓
LLM 分析 → 输出结构化洞察
  ↓
前端渲染（含引用追溯）
```

#### 依赖

**新增依赖**：
- `@anthropic-ai/sdk`（已有）
- `@marp-team/marp-cli`（Markdown → PPT/PDF 导出）
- `marked` 或 `markdown-it`（Markdown → HTML 渲染）
- `@octokit/rest`（GitHub API 客户端）
- `pdf-parse` 或直接用 Claude Files API（P1 阶段）
- `node-cron`（定时任务，P2 阶段）
- `zod`（schema 验证）
- `cheerio`（网页解析，P1 阶段）
- `axios`（HTTP 请求）

**外部 API**：
- Anthropic Claude API（默认）
- DeepSeek API（可选）
- X (Twitter) API（需申请 Developer Account）
- arXiv API（公开，无需认证）
- GitHub API（需 Personal Access Token，rate limit 5000/hour）
- 微信公众号：无官方 API，需爬虫（法律风险，MVP 可能先跳过）
- 智库网站：通用 scraper

### 4.3 备选方案

**方案 A（被淘汰）：纯 Web 搜索 + LLM**
- 不做信息源插件，只用 Google/Bing API + LLM 分析
- **淘汰理由**：无法覆盖 X、微信公众号等封闭平台，信息源单一

**方案 B（被淘汰）：RSS 订阅 + 本地存储**
- 用 RSS feed 采集，存本地数据库，不调 LLM
- **淘汰理由**：无法做结构化分析、排序、摘要，只是"RSS 阅读器"

**方案 C（被淘汰）：实时流式推送**
- WebSocket 实时推送新信息
- **淘汰理由**：MVP 阶段用户需求不明确，定时扫描已足够，实时推送增加复杂度

## 5. 测试策略 ⚠ 必填

### 5.1 Test checklist

- [ ] **单元测试**：LLM Provider 抽象层、Source Provider 插件、Pipeline 各阶段（目标覆盖率：80%）
- [ ] **集成测试**：端到端流程（用户输入课题 → 输出报告），mock 外部 API
- [ ] **Eval**：
  - Golden cases ≥ 20 条（10 条课题综述 + 5 条 PDF 分析 + 5 条定时扫描）
  - Citation 准确率 ≥ 90%（引用的原文片段与报告结论匹配）
  - Hallucination 率 ≤ 5%（LLM 生成的"事实"必须有来源支撑）
- [ ] **对抗性测试**：
  - Prompt injection（PDF 内嵌"忽略之前指令"）
  - 恶意上传（超大 PDF、病毒文件）
  - 边界输入（空课题、超长课题、特殊字符）
- [ ] **回归影响**：无（首个 spec，无既有特性）

### 5.2 Reliability checklist

- [ ] **故障模式**：
  - LLM API 超时 → 用户看到"分析超时，请重试"
  - 信息源不可达 → 跳过该源，用其他源继续
  - PDF 解析失败 → 提示"文件格式不支持"
- [ ] **超时 / 重试策略**：
  - LLM 调用：60s 超时，指数退避重试 3 次（1s, 2s, 4s）
  - 信息源抓取：30s 超时，失败直接跳过（不阻塞其他源）
- [ ] **成本 / 限流**：
  - 每用户每天最多 10 次课题综述（防滥用）
  - Token budget：单次综述 ≤ 100K tokens（输入 + 输出）
  - 定时扫描：每分类 ≤ 50 条信息（防爆炸）
- [ ] **观测**：
  - 关键指标：`insight.generate.duration`、`insight.generate.cost`、`insight.generate.error_rate`
  - Tag：`user_id`、`type`（survey/scan/pdf）、`llm_provider`、`source_type`
- [ ] **错误文案**：
  - 对外统一："分析失败，请稍后重试"
  - 内部日志记录原始错误（含 provider 报错）

## 6. 验收标准

从用户视角列可验证条件：

- [ ] 用户输入课题"Rust 异步运行时演进"，5 分钟内看到结构化报告（含时间线、对比表、≥5 条引用）
- [ ] 用户配置 X 信息源（输入 3 个技术大拿账号），次日早上看到"昨日洞察"（每分类 TOP3）
- [ ] 用户上传 20 页 PDF，3 分钟内看到摘要 + 关键技术点 + 引用追溯
- [ ] 用户切换 LLM 后端（Claude → DeepSeek V4），功能正常，成本降低 70%
- [ ] 定时扫描每天 22:00 准时执行，次日 8:00 前报告生成完毕
- [ ] 性能：课题综述 P95 < 300s，PDF 分析 P95 < 180s

## 7. Agent 参与度（预估）

- **预估主要模式**：`[pair]`（人类设计架构 + Agent 实现细节）
- **会用 subagent 的子任务**：
  - Source Provider 插件实现（每个插件一个 subagent）
  - 前端组件开发（报告渲染、图表可视化）
  - Eval golden cases 生成
- **是否新增 / 修改 skill**：
  - 新增 `.claude/skills/insight-dev.md`（洞察 Agent 开发最佳实践）
  - 修改 `.claude/skills/explore-mode.md`（探索期结束后移除）

## 8. 风险 & 缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| X API 申请被拒 | 中 | 能力 2 无法覆盖 X 信息源 | 备选：用 nitter 镜像站或手动 RSS |
| 微信公众号爬虫违反 ToS | 高 | 法律风险 | MVP 先跳过微信，只做 X + 智库 + PDF |
| LLM 成本爆炸 | 中 | 单次综述 >$5 | Token budget 限制 + 用户配额 |
| 定时扫描信息过载 | 中 | 每天 1000+ 条信息，排序失效 | 每分类限制 50 条 + 提前过滤低质量源 |
| Citation 不准确 | 中 | 用户不信任报告 | Eval 持续监控 + 人工抽查 |

## 9. 开放问题

- [ ] **LLM 后端优先级**：MVP 先只做 Claude，还是同时支持 DeepSeek V4？（建议：先 Claude，V4 作为 P1）
- [ ] **微信公众号爬虫**：法律风险如何规避？是否需要律师 review？（建议：MVP 跳过，等用户反馈）
- [ ] **报告存储**：用数据库（PostgreSQL）还是文件系统（JSON）？（建议：MVP 用文件，后续迁移数据库）
- [ ] **前端框架**：用 Next.js App Router 还是 Pages Router？（建议：App Router，项目已选型）
- [ ] **定时任务部署**：Vercel Cron Jobs 还是自建服务器？（建议：Vercel，简单）

---

## Changelog
- 2026-04-25 初稿（阿伟 + Claude Opus 4.7）
