# Rust 异步运行时演进

## TL;DR

Rust 异步生态从 green thread 模型演进到基于 `Future` trait + `Pin` + `Waker` 的零成本抽象方案，经历了三代设计迭代。Tokio 已成为事实标准，但 async-std、smol、monoio 等运行时在不同场景下各有优势，生态呈现多运行时共存格局。当前核心痛点在于运行时不可互换、`async fn in trait` 刚刚稳定、以及 `AsyncRead`/`AsyncWrite` 等基础 trait 尚未进入标准库，社区正通过 keyword generics、async drop 等提案逐步解决。

## 关键发现

### 发现 1：从 green thread 到零成本 Future — 三代异步模型的根本性转变

Rust 异步的演进并非线性改良，而是经历了三次范式级别的重构。第一代（2014 年前）采用 libgreen 提供的 green thread（M:N 线程模型），直接内置于标准库，但因隐式的运行时开销与 Rust "零成本抽象"哲学冲突，在 RFC 230 中被移除。第二代（2016-2018）以 `futures 0.1` 为核心，引入了基于 `poll` 的 `Future` trait，但采用 task-notify 模型，要求手动处理 `NotReady` 返回值，回调嵌套严重，组合子链（`.and_then().map()...`）导致类型签名爆炸。第三代（2019 至今）通过 RFC 2592 将 `Future` trait 纳入标准库，引入 `async/await` 语法糖、`Pin<T>` 解决自引用问题、`Waker` 替代旧的通知机制，实现了真正的零成本状态机编译。编译器将 `async fn` 转换为匿名枚举状态机，每个 `.await` 点对应一个状态变体，无需堆分配，这是 Rust 异步区别于 Go goroutine 和 Erlang process 的根本技术优势。

### 发现 2：运行时碎片化 — 生态最大的结构性挑战

Rust 标准库只定义了 `Future` trait，不提供执行器（executor）和反应器（reactor），这一设计决策导致了运行时碎片化问题。具体表现为：Tokio 的 `tokio::io::AsyncRead` 与 `futures::AsyncRead` 签名不同（前者要求 `ReadBuf`，后者使用 `&mut [u8]`）；`tokio::spawn` 要求 future 为 `Send + 'static`，而单线程运行时如 `monoio` 无此约束；`tokio::net::TcpStream` 与 `async-std::net::TcpStream` 不可互换。这意味着库作者要么绑定特定运行时，要么通过 feature flag 做条件编译（如 `reqwest` 同时支持 Tokio 和 async-std），增加了大量维护负担。`async-compat` crate 和 `agnostic` 等项目试图提供适配层，但本质上是 shim 而非解决方案。真正的出路在于将 `AsyncRead`、`AsyncWrite`、`AsyncIterator` 等核心 trait 标准化进 `std`，这一工作由 async working group 推进中，但进展缓慢。

### 发现 3：io_uring 驱动的新一代运行时正在重塑性能边界

传统异步运行时（Tokio、async-std）基于 epoll/kqueue 的就绪模型（readiness-based），即先查询 fd 是否就绪再执行 I/O。而 Linux 5.1 引入的 io_uring 采用完成模型（completion-based），用户提交 I/O 请求到 submission queue，内核完成后放入 completion queue，减少系统调用次数并支持批量提交。这催生了 `monoio`（字节跳动）、`glommio`（Datadog/ScyllaDB 团队）、`tokio-uring` 等新运行时。但 completion-based 模型与 Rust 现有借用语义存在根本张力：提交 I/O 后 buffer 的所有权必须转移给内核，直到完成才能归还，这与 `AsyncRead::poll_read(&mut buf)` 的借用模式不兼容。因此 monoio 和 tokio-uring 采用了 buf-ownership 模式（如 `IoBuf` trait），要求用户传递 owned buffer。这一设计差异使得基于 io_uring 的运行时难以与现有生态兼容，形成了新的碎片化维度。

## 技术对比

| 维度 | Tokio | async-std | smol | monoio | glommio |
|------|-------|-----------|------|--------|---------|
| 核心特点 | 多线程 work-stealing 调度器 + epoll/kqueue reactor | 类标准库 API 设计，基于 async-task | 极简设计，~1500 行核心代码，基于 polling + async-executor | 基于 io_uring 的 thread-per-core 模型 | 基于 io_uring 的 thread-per-core + 合作式调度 |
| I/O 模型 | Readiness-based | Readiness-based | Readiness-based | Completion-based | Completion-based |
| 调度策略 | 多线程 work-stealing（可选 `current_thread`） | 自适应线程池 | 可插拔 executor，默认多线程 | 单线程 per core，无锁 | 单线程 per core，合作式 task budgeting |
| 生态成熟度 | 极高，事实标准（hyper、tonic、axum 等） | 中等，社区活跃度下降 | 较低，适合嵌入式使用 | 较低，字节内部大规模使用 | 较低，专注存储/数据库场景 |
| 优势 | 生态最完善、文档最全、性能均衡、久经生产验证 | API 直觉友好、学习曲线低 | 极轻量、编译快、易于理解和定制 | io_uring 原生支持、极致 I/O 性能、无跨线程开销 | 高级 I/O 调度（DMA、直接 I/O）、存储场景优化 |
| 劣势 | 二进制体积较大、编译时间长、API 复杂度高 | 维护节奏放缓、部分 API 与 Tokio 不兼容 | 功能较少、缺乏高级特性（如 tracing 集成） | 仅支持 Linux、生态小、buffer 所有权模型学习成本高 | 仅支持 Linux、API 不稳定、文档不足 |
| 适用场景 | Web 服务、微服务、通用网络应用 | 教学、小型项目、偏好标准库风格的团队 | 嵌入式异步、库内部使用、需要轻量运行时 | 高性能代理/网关、存储引擎、字节级 I/O 密集 | 数据库引擎、分布式存储、需要精细 I/O 控制 |

## 发展时间线

- **2014-11** RFC 230 通过，从标准库移除 libgreen 和 green thread 运行时，确立了 Rust "无隐式运行时"的设计原则
- **2016-08** `futures 0.1` 发布（Alex Crichton），引入基于 `poll` 的 `Future` trait 和 `Task` 通知机制，奠定异步编程基础模型
- **2018-04** Tokio 0.1 正式发布，基于 `futures 0.1` + mio，提供完整的多线程异步运行时，迅速成为生态中心
- **2018-05** `Pin<T>` RFC（RFC 2349）被合并，解决了 async 生成器中自引用结构的安全性问题，为 async/await 扫清了最后的类型系统障碍
- **2019-07** `async-std 0.99` 发布，定位为异步版标准库，试图提供比 Tokio 更友好的 API，引发社区关于"运行时之争"的广泛讨论
- **2019-11** Rust 1.39 稳定 `async/await` 语法，`Future` trait 正式进入 `std::future`，标志着第三代异步模型的确立
- **2020-12** Tokio 1.0 发布，承诺 API 稳定性（至少 5 年不破坏兼容性），work-stealing 调度器成熟，成为生产环境事实标准
- **2021-04** `monoio` 在字节跳动内部启动开发，探索基于 io_uring 的 thread-per-core 异步运行时模型
- **2021-09** `tokio-uring` 项目启动，尝试在 Tokio 生态内集成 io_uring 支持，采用 owned buffer 模式
- **2022-11** Rust 1.65 稳定 GAT（Generic Associated Types），为 async trait 和 lending iterator 等高级异步模式提供类型系统支持
- **2023-12** Rust 1.75 稳定 `async fn in trait`（AFIT），允许在 trait 中直接定义 async 方法，极大简化了异步接口抽象
- **2024-02** `async-wg`（Async Working Group）发布路线图更新，明确 async closure、async drop、async iteration 为下一阶段优先事项
- **2024-10** Rust 1.82 稳定 `AsyncFn` trait 相关能力，async closure 进入可用状态，进一步完善异步编程体验

## 趋势与展望

1. **async trait 生态重构加速**：`async fn in trait` 稳定后，大量库（tower、http、hyper）正在或即将迁移到原生 async trait，摆脱对 `async-trait` proc macro 的依赖。但 `dyn async trait`（动态分发）仍需 `trait_variant` 等辅助 crate，预计 2025 年内会有标准化方案落地。

2. **completion-based I/O 的标准化探索**：io_uring 的 buffer ownership 模型与现有 `AsyncRead/AsyncWrite` 不兼容的问题已被广泛认知。社区正在探索统一的 `CompletionRead`/`CompletionWrite` trait 或通过 keyword generics（`async<A>`）实现 readiness 与 completion 模型的泛化。这是未来 1-2 年最具技术挑战性的方向。

3. **structured concurrency 进入视野**：受 Kotlin coroutine scope 和 Java Loom 的 structured concurrency 影响，Rust 社区开始讨论 `TaskGroup`/`Scope` 等结构化并发原语。`moro`（Niko Matsakis 的实验项目）和 `async-scoped` 是早期探索，目标是解决 `spawn` 导致的生命周期断裂和错误传播问题。

4. **async drop 的渐进式推进**：当前 async 代码中资源清理（如关闭数据库连接）只能通过显式 `close().await` 完成，`Drop` trait 无法执行异步操作。`async drop` 提案已讨论多年，技术难点在于 drop 的隐式调用点和 panic 时的行为。预计会以 opt-in 的 `AsyncDrop` trait 形式逐步引入。

5. **WebAssembly 异步运行时适配**：随着 WASI Preview 2 引入 component model 和 async 支持，Rust 异步运行时需要适配 WASM 环境。`wasm-bindgen-futures` 已提供浏览器环境桥接，而 `wasmtime` 正在实现基于 component model 的异步 host function 调用，这将拓展 Rust 异步的应用边界。

## 可行动建议

1. **新项目默认选择 Tokio，除非有明确的特殊需求**：Tokio 的生态优势（hyper、tonic、sqlx、reqwest 等）和 1.0 稳定性承诺使其成为最安全的选择。只有在 thread-per-core 架构（如高性能代理）或 io_uring 强需求场景下，才考虑 monoio/glommio。

2. **库开发者应尽量保持运行时无关**：使用 `std::future::Future` 而非 Tokio 特定类型；I/O 操作通过泛型参数（`T: AsyncRead`）抽象；避免直接调用 `tokio::spawn`，改为接受 executor 参数或使用 `futures::executor` 中的通用原语。

3. **迁移到原生 async fn in trait**：如果项目最低支持 Rust 1.75+，开始将 `#[async_trait]` 宏替换为原生 `async fn in trait`。注意：需要动态分发的场景仍需 `async-trait` 或 `trait-variant` crate，可分阶段迁移。

4. **关注 io_uring 但不要过早押注**：在非 Linux 平台（macOS、Windows）上 io_uring 不可用，且其 buffer ownership 模型会侵入整个 API 设计。建议在性能关键路径上通过 `tokio-uring` 做局部实验，而非全面重构。

5. **投资可观测性基础设施**：异步代码的调试天然困难（堆栈跟踪碎片化、任务调度不确定性）。集成 `tokio-console`（实时任务监控）、`tracing`（结构化日志 + span 跟踪）和 `coredump` 分析工具，在开发早期就建立异步代码的可观测性能力。

## 来源与参考

- [RFC 230: Remove runtime](https://github.com/rust-lang/rfcs/blob/master/text/0230-remove-runtime.md) — 移除 green thread 的历史性 RFC，奠定 Rust 无隐式运行时原则
- [RFC 2592: futures-api](https://github.com/rust-lang/rfcs/blob/master/text/2592-futures.md) — 将 Future trait 引入标准库的 RFC
- [Tokio 官方文档](https://tokio.rs/tokio/tutorial) — Tokio 运行时教程与 API 参考
- [Async: What is blocking?](https://ryhl.io/blog/async-what-is-blocking/) — Alice Ryhl（Tokio 维护者）关于异步阻塞问题的深度解析
- [monoio GitHub](https://github.com/bytedance/monoio) — 字节跳动开源的 io_uring 异步运行时
- [glommio GitHub](https://github.com/DataDog/glommio) — Datadog 维护的 thread-per-core 异步运行时
- [Rust Async Working Group](https://rust-lang.github.io/async-fundamentals-initiative/) — Rust 官方异步基础设施工作组进展追踪
- [Without Boats: Pin](https://without.boats/blog/pin/) — `Pin<T>` 设计者关于 Pin 机制的系列博文
- [Async fn in trait stabilization](https://blog.rust-lang.org/2023/12/21/async-fn-rpit-in-traits.html) — Rust 官方博客关于 AFIT 稳定化的公告
- [tokio-console GitHub](https://github.com/tokio-rs/console) — Tokio 异步任务诊断工具