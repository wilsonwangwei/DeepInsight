---
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

# AI 软件开发工程中的skill关键工程技术与治理技术

**skill，AI for 工程 · 提示工程 · 检索增强 · 代码治理 · 智能体 · 代码生成 · 安全合规 · 静态分析**

---

## TL;DR

AI 软件开发正从"辅助补全"迈向"自主 Agent 工程"阶段，Prompt Engineering、RAG、Code Agent 构成了当前技能栈的三大支柱。治理层面，代码溯源（Code Provenance）、幻觉检测与许可证合规正成为企业落地 AI 开发的硬性门槛。未来 1-2 年，具备规划-执行-验证闭环能力的多 Agent 协作系统将重新定义软件工程的工作流与组织形态。

---

---

## 关键发现

### 发现 1：Prompt Engineering 正在分化为"对话式"与"结构化"两条技术路线

早期的 Prompt Engineering 以自然语言对话为主，开发者通过 few-shot、chain-of-thought 等技巧引导模型生成代码。但在工程实践中，这种方式的可复现性差、版本管理困难。2024 年以来，结构化 Prompt 工程快速崛起——以 Cursor Rules、GitHub Copilot Instructions、`.clinerules` 等为代表，开发团队将 Prompt 以配置文件形式纳入版本控制，实现了 Prompt 的工程化管理。

更深层的变化在于 Prompt 的"编程化"。Anthropic 的 Tool Use 协议、OpenAI 的 Function Calling、以及 Google 的 Structured Output，本质上是将 Prompt 从自然语言描述转化为带有类型约束的 API 调用契约。这使得 AI 生成的代码可以被静态校验，大幅降低了幻觉风险。结构化路线的核心优势在于：可测试、可审计、可组合——这恰恰是软件工程对"技能"（Skill）的基本要求。

---

### 发现 2：RAG + Code Context 是当前 AI 开发工具的核心竞争壁垒

大语言模型的上下文窗口虽然在持续扩大（从 4K 到 200K+），但"把整个代码库塞进 Context"既不经济也不高效。真正的工程挑战在于：如何在有限的 Token 预算内，精准检索到与当前任务最相关的代码片段、文档和历史变更。

当前主流方案形成了三层架构：第一层是基于 AST（抽象语法树）的结构化索引，如 Tree-sitter 解析后的符号表；第二层是基于 Embedding 的语义检索，将代码块向量化后存入向量数据库（如 Qdrant、Pinecone）；第三层是基于依赖图的上下文扩展，沿着 import/call graph 自动拉取关联文件。Cursor 的成功很大程度上归功于其在第一层和第三层的深度优化——它不只是"搜索相似代码"，而是"理解代码结构后精准定位"。这一能力直接决定了 AI 生成代码的准确率和可用性。

---

### 发现 3：AI 代码治理正从"事后审计"转向"内嵌式护栏"

早期的 AI 代码治理主要依赖事后 Code Review——人工检查 AI 生成的代码是否存在安全漏洞、许可证污染或逻辑错误。但随着 AI 生成代码占比快速上升（部分团队已超过 40%），事后审计的成本和延迟变得不可接受。

行业正在转向"Guardrails-as-Code"模式：在生成阶段就嵌入约束。具体技术包括：（1）输出过滤器——对生成的代码实时运行 SAST（静态应用安全测试）扫描，如 Semgrep、CodeQL 规则；（2）许可证检测——通过代码指纹比对（如 Software Heritage 数据库）识别生成内容是否与 GPL/AGPL 等 Copyleft 代码高度相似；（3）沙箱执行验证——在隔离环境中自动运行生成的代码并检查行为是否符合预期。Amazon CodeWhisperer 的 Reference Tracker 和 GitHub Copilot 的 Code Referencing 功能是这一趋势的早期实现。更前沿的方向是将形式化验证（Formal Verification）与 LLM 结合，用数学证明而非测试用例来保障生成代码的正确性。

---

---

## 技术对比

### AI 代码生成与辅助工具对比

| 维度 | GitHub Copilot | Cursor | Amazon CodeWhisperer (Q Developer) | Cline / Roo Code | Devin |
|------|---------------|--------|-------------------------------------|-------------------|-------|
| 核心特点 | IDE 内联补全 + Chat，深度集成 GitHub 生态 | 基于 VS Code 的 AI-native IDE，强调全仓库上下文理解 | AWS 生态深度集成，内置安全扫描与许可证检测 | 开源 Agent 框架，支持自主规划与执行多步任务 | 全自主 AI 软件工程师，端到端完成开发任务 |
| 优势 | 用户基数最大，模型选择丰富（GPT-4o/Claude），Workspace 索引能力持续增强 | 上下文检索精准度领先，多文件编辑体验流畅，支持 `.cursorrules` 工程化配置 | 企业级安全合规能力突出，与 AWS 服务无缝对接，Reference Tracker 可追溯代码来源 | 完全开源可审计，支持多模型切换，社区活跃迭代快，MCP 协议支持 | 可独立完成复杂任务（部署、调试），减少人工干预 |
| 劣势

*(...)*

---

### AI 代码治理框架对比

| 维度 | Semgrep + LLM Rules | GitHub Advanced Security | Snyk Code AI | FOSSA + AI Policy |
|------|---------------------|--------------------------|--------------|-------------------|
| 核心特点 | 可编程的静态分析规则引擎，支持自定义 AI 代码检测规则 | 原生集成 CodeQL，覆盖 Secret Scanning、Dependabot | AI 驱动的实时漏洞检测，IDE 内即时反馈 | 开源许可证合规自动化，AI 生成代码的许可证风险评估 |
| 优势 | 规则灵活可定制，社区规则库丰富，支持 CI/CD 集成 | 与 GitHub 工作流深度集成，企业级支持 | 检测速度快，误报率低，开发者体验好 | 许可证数据库全面，策略引擎可配置 |
| 劣势 | 需要安全工程师编写和维护规则 | 仅限 GitHub 平台 | 对自托管代码库支持有限 | 聚焦许可证，安全漏洞检测能力较弱 |
| 适用场景 | 需要精细化控制 AI 代码质量的工程团队 | GitHub 企业用户 | 快速集成安全扫描的开发团队 | 对开源合规有严格要求的企业 |

---

---

## 发展时间线

- **2021-06** GitHub Copilot 技术预览版发布，基于 OpenAI Codex，首次将 LLM 代码补全带入主流 IDE，标志着 AI 辅助编程从学术走向工程实践。
- **2022-11** ChatGPT 发布，开发者开始大规模使用对话式 AI 进行代码生成、调试和解释，"Prompt Engineering"作为一项开发技能被广泛认知。
- **2023-03** GPT-4 发布，代码生成能力大幅跃升；同月 GitHub Copilot X 公布，引入 Chat、Pull Request 摘要、文档生成等 Agent 化功能。
- **2023-04** Amazon CodeWhisperer 正式 GA 并宣布个人版免费，内置 Reference Tracker 实现代码溯源，首次将许可证合规检测嵌入 AI 代码生成流程。
- **2023-11** Cursor 0.1 版本发布，以"AI-native IDE"定位切入市场，其基于 AST 的上下文检索和多文件编辑能力引发行业关注。
- **2024-03** Devin 由 Cognition Labs 发布，号称"首个 AI 软件工程师"，展示了 Agent 自主完成端到端开发任务的可能性，引发关于 AI Agent 工程化的广泛讨论。

*(...)*

---

## 趋势与展望

**1. 多 Agent 协作将成为复杂软件工程的默认范式**
单一 Agent 在处理跨模块、跨服务的复杂任务时存在上下文瓶颈和决策质量下降的问题。2025-2026 年，我们将看到"架构师 Agent + 编码 Agent + 测试 Agent + 审查 Agent"的多角色协作模式成熟化。每个 Agent 专注于特定职责，通过结构化消息协议（如 MCP 的扩展）进行协调。这类似于微服务架构对单体应用的替代——分而治之。

**2. "Spec-Driven Development"将取代传统的需求文档流程**
AI Agent 需要精确的、可机器解析的规格说明（Spec）来驱动开发。自然语言需求 → 结构化 Spec → AI 生成代码 → 自动验证的流水线正在形成。Kiro 的 Spec 驱动开发、Cursor 的 `.cursorrules`、以及各类 Agent 框架中的 Task Description Schema 都是这一趋势的早期信号。未来的"产品经理"可能需要掌握 Spec 编写而非传统 PRD。

**3.

*(...)*

---

## 可行动建议

**1. 立即建立团队级的 Prompt 工程规范和版本管理体系**
将 AI 交互的 Prompt、System Instructions、Tool Definitions 纳入 Git 版本控制。创建 `.ai/` 目录存放 Cursor Rules、Copilot Instructions 等配置文件，并在 Code Review 流程中加入对这些文件变更的审查。这是成本最低、收益最快的治理措施。

**2. 构建 AI 代码的自动化评估管道（Eval Pipeline）**
不要仅依赖开发者的主观判断来评估 AI 工具的效果。建立量化指标体系：代码采纳率（Acceptance Rate）、生成代码的缺陷密度（Defect Density）、首次通过测试率（First-Pass Test Rate）、安全漏洞引入率。使用 A/B 测试比较不同模型、不同 Prompt 策略的效果。数据驱动的优化远比直觉可靠。

**3. 在 CI/CD 管道中嵌入 AI 代码专项安全扫描**
在现有的 SAST/DAST 基础上，增加针对 AI 生成代码特征的检测规则。重点关注：（1）硬编码凭证（AI 模型容易在示例代码中生成占位符密钥）；（2）不安全的依赖引入（AI 可能推荐已知有漏洞的库版本）；（3）许可证合规（使用 FOSSA 或 ScanCode 检测生成代码的许可证风险）。

*(...)*

---

## 来源与参考

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot) — GitHub Copilot 官方文档，涵盖 Agent Mode、Workspace 索引等最新功能说明。
- [Cursor Documentation](https://docs.cursor.com/) — Cursor IDE 官方文档，详细说明了 Rules、Context 检索、Multi-file Edit 等核心机制。
- [Model Context Protocol Specification](https://modelcontextprotocol.io/) — Anthropic 主导的 MCP 开放协议规范，定义了 AI Agent 与外部工具交互的标准。
- [SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](https://arxiv.org/abs/2310.06770) — Princeton 大学发布的 AI 代码能力基准测试，被广泛用于评估 Agent 的软件工程能力。

*(...)*