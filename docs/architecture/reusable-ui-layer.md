# XZ / BA-Pointer 可复用 UI 底座规范

| 项 | 内容 |
| --- | --- |
| 文档编号 | B3 / D1 |
| 标题 | 可复用 UI 底座规范（跨场景） |
| 作者 | 林绘澄（art-director）· 游戏美术与视觉表现指导 |
| 调度 | 游承峰（team-lead） |
| 日期 | 2026-11-05 |
| 状态 | 只读分析 + 规范产出；**本次不修改任何既有代码** |
| 适用 | `E:\XIEMI\xiemi\BA-Pointer\`（参考工程，只读）与 `E:\XIEMI\XsureZrcnmve\`（XZ 3.0，只读抽样） |
| 平台裁定 | Windows 桌面为主；lean 评审 |
| 用户裁定 | BA-Pointer.sln 的 UI「可以用作多个方面的 UI，例如游戏、XZ .vzc 等」→ 抽象为跨场景可复用 UI 底座 |

---

## 0. 阅读约定与证据边界

本文严格区分四类表述，全篇通用：

- **【事实】**：已在参考工程 / XZ 工程中通过 Read、Grep、Glob、ls 核实的既有内容，均附 `文件:行号` 或目录证据。
- **【建议】**：本文新提出的规范、命名、映射或修法，**非既有实现**。
- **【观察】**：核实时发现的现状或不一致，只登记、不判定成败、不修改。
- **【缺口】**：未核查或需后续确认的部分。

> **证据边界（诚实声明）**：本次以 `E:\XIEMI\xiemi\BA-Pointer\` 为主要核查对象并做了全文读取；对 `E:\XIEMI\XsureZrcnmve\` 仅做**只读抽样**核实（`Core_Dimension/index.html`、`VZC/VzcHost.cs`、`MainWindow.xaml.cs` 及消息类型的 Grep）。XZ 侧正由其他成员（B1 统一架构 / B2 数据模型）并行改造，本文对 XZ 的描述是**某一时刻的只读快照**，可能随其改造产生时序差异。本文未读取、未改动 `xz-project-plan/index.html`（见第 9 节）。

> **本次动作范围**：仅创建本文件 `docs\architecture\reusable-ui-layer.md`。`E:\XIEMI\xiemi\BA-Pointer\` 下任何文件均未修改（用户只要求把它当 UI 参考，未授权修 bug）；XZ 下除本文件外任何文件均未修改；未删除文件、未提交 git、未新建 .csproj/.sln、未构建 BA-Pointer。

---

## 1. 背景与目标

用户明确指出 `BA-Pointer.sln` 的 UI 底座应当可复用于「游戏、XZ .vzc 等多个场景」，而非只修它自身缺陷。因此本文不把 BA-Pointer 当成「待修的设置窗口」，而是抽取其中**可跨场景复用的结构**，并回答：哪些层能直接搬、哪些层必须换、消息协议如何收敛、两套视觉体系如何共存、可访问性如何分级。

参考工程的架构模式（【事实】）：`BAPointer.Settings\WebBridge.cs` 用 WebView2 把本地 `ui/` 目录映射成 `https://bapointer.local` 虚拟站点，通过 `WebMessageReceived` / `PostWebMessageAsJson` 与 HTML 双向通信；XZ 侧 `VZC\VzcHost.cs` 同样用 `SetVirtualHostNameToFolderMapping` 把 `core.local` / `vzcs.local` 映射成虚拟站点。**两者是同一种架构模式**（`WebBridge.cs:44-47` 与 `VzcHost.cs:58-69`），这是「可复用 UI 底座」成立的物理基础。

---

## 2. 底座三层模型

把现有实现抽象为三层。分层依据：宿主能力与运行环境相关，表现层与品牌/场景相关，契约层是两层之间唯一的、可标准化的接缝。

```
┌──────────────────────────────────────────────────────────┐
│ 表现层 Presentation                                        │
│   HTML UI / CSS 变量 / 动态几何背景 / clip-path 切角        │
│   → 与「场景品牌」强相关，可整体换肤                        │
├──────────────────────────────────────────────────────────┤
│ 契约层 Contract                                            │
│   消息 DTO {type,payload} / 来源校验 / 配置读写 / 握手时序  │
│   → 与「业务」弱相关，是最该统一、最该复用的一层            │
├──────────────────────────────────────────────────────────┤
│ 宿主层 Host                                                │
│   WebView2 虚拟主机映射 / 消息桥注册 / 进程拉起 / 生命周期  │
│   → 与「OS / 进程」相关，Windows 桌面下高度稳定             │
└──────────────────────────────────────────────────────────┘
```

### 2.1 宿主层（Host）

**既有实现【事实】**

- `WebBridge.cs:41` `EnsureCoreWebView2Async()`；`:44-47` `SetVirtualHostNameToFolderMapping(VirtualHost, _uiFolder, CoreWebView2HostResourceAccessKind.Allow)`，把 `ui/` 暴露为 `https://bapointer.local`（`:21-22` 常量）。
- `WebBridge.cs:50` 在 `Navigate` **之前**注册 `WebMessageReceived`（`:49` 注释：「消息接收器必须在 Navigate 之前注册，否则 uiReady 可能漏掉」）——这是底座最关键的时序约束。
- `WebBridge.cs:53` `Navigate($"{TrustedOrigin}/bapointer.html")`。
- `MainWindow.xaml.cs:36-37` 构造 `WebBridge(Browser, uiFolder, configPath)` 并 `InitializeAsync()`；`:42-67` `EnsureOverlayRunning()` 拉起 `BAPointer.Overlay.exe`。
- `MainWindow.xaml:9-11` 窗口内容即单个 `WebView2 x:Name="Browser"`。
- XZ 侧同构：`VzcHost.cs:58-69` `MapHosts()` 映射 `core.local`（`:27`）/ `vzcs.local`（`:28`）；`MainWindow.xaml.cs:22-29` 初始化并调用 `MapHosts`。

**为何可跨场景复用【事实 + 建议】**

虚拟主机映射把「本地磁盘目录」变成「同源 https 站点」，解决 `file:///` 被拦截、ES Module / importmap / fetch 的跨域限制（`Core_Dimension/index.html:60-69` 的 importmap 依赖本地化 three.js 正是受益于此）。这一机制与 UI 内容完全解耦：只要换掉映射的目录与主机名，游戏内 HUD、XZ 配置终端、VZC 编辑器都能复用同一套宿主代码。【事实】两工程已各自独立实现了该机制；【建议】把它下沉为单一 `UiHost` 组件，参数化为 `(hostName, folder, entry, configPath)`，避免每个场景重写一遍。

### 2.2 契约层（Contract）

**既有实现【事实】**

- DTO：`WebBridge.cs:129-133` `WebMessage { Type, Payload(JsonElement?) }`，即 `{type, payload}`。
- 来源校验：`WebBridge.cs:79` `if (!args.Source.StartsWith(TrustedOrigin, OrdinalIgnoreCase)) return;`，防止导航到外部页面后仍调用宿主逻辑。
- 握手与配置读写：`uiReady` → `PushConfigToWebAsync()`（`:93-96`）；后者（`:59-70`）读 `_configPath`，文件不存在回退 `"{}"`，反序列化失败再回退 `"{}"`，推 `configLoaded`；`applyConfig` → 写盘 + 回 `configSaved`（`:98-109`）。
- 配置路径：`MainWindow.xaml.cs:18-23` `%LOCALAPPDATA%\BAPointer\config.json`；`:27-33` 首次运行从内置 `config.json` 复制默认值。

**为何可跨场景复用【建议】**

「来源校验 + `{type,payload}` DTO + uiReady 握手 + 配置读/写/回执」这四件事与具体业务无关，只与「宿主和网页如何安全、可靠、有序地交换数据」有关。把它标准化后，三场景只需在 `type` 命名空间里扩展业务消息（见第 3.3 节），无需重造通信管道。这层是「跨场景复用」收益最高、也最应优先统一的部分。

**当前不统一的现状【事实·重要】**（直接决定复用矩阵中「需替换的层」）

| 维度 | BA-Pointer（`WebBridge.cs`） | XZ（`MainWindow.xaml.cs` / `VzcHost.cs`） |
| --- | --- | --- |
| Web → 宿主 | JSON DTO `{type,payload}`（`:82` `WebMessageAsJson`） | **裸字符串**（`:37` `TryGetWebMessageAsString()`）：`"exit"`/`"vzc:reload"`/`"vzc:activate:<id>"`（`:38-41`） |
| 宿主 → Web | `PostWebMessageAsJson`（`:123`） | `PostWebMessageAsJson`（`VzcHost.cs:268,282`） |
| 就绪握手 | `uiReady`（`:93`）触发推配置 | **无**，用 `NavigationCompleted`（`:45-48`）触发推注册表 |
| 来源校验 | 有（`:79`） | **未见** |
| 注册表消息 | 无 | `vzc:registry`（`VzcHost.cs:263`）、`vzc:activate`（`:284`） |

> 结论【事实】：两工程「架构模式同构、契约层异构」。把它们抽象成一个底座，**主要工作量在收敛契约层**，而不在宿主层与表现层。此项收敛归属 B1（engineering-lead-3），本文只登记差异、不越界给整改代码。

### 2.3 表现层（Presentation）

**既有实现【事实】**（`ui/ba-pointer-ui.html`，27994 字节，`ui/` 下唯一入口）

- `:root` 变量（`:10-20`）：`--bg-color` / `--text-color` / `--accent-color` / `--wedge-color` / `--line-color` / `--panel-bg` / `--panel-border` / `--fx-main` / `--fx-grey`。
- `body.light-mode`（`:21-31`）提供完整浅色反转。
- 动态几何背景（`:43-68`）：`.bg-layer`（`:44` `pointer-events:none`）内 `.block-wedge`（clip-path 斜楔，`:45-52`）、`.block-grey`（旋转三角，`:53-59`）、`.line-rule`（斜线，`:60-66`），配 `slideWedge 8s` / `rotateTriangle 6s` 无限交替动画。
- 切角 `clip-path`：`.app-window`（`:79`）、`.theme-toggle`（`:123`）、`.switch-btn`（`:233`）、`.opt-btn`（`:250`）、`.action-btn`（`:288`）、`#toast`（`:306`）、range 滑块拇指（`:198`）。
- `pointer-events:none` 分层：`.bg-layer`（`:44`）、`#fx-canvas`（`:312`）、`#toast`（`:307`）。
- 全局 `* { user-select:none }`（`:8`）、`font-family:'Arial Black','Microsoft YaHei',sans-serif`（`:36`）、`cursor:crosshair`（`:40`）。

**为何可跨场景复用【建议】**

表现层是**换肤点**：CSS 变量名、切角形状、几何背景、pointer-events 分层是「结构」，色值与品牌文案是「皮肤」。把结构固定、把色值收敛到 `:root`，即可让同一套 HTML 骨架在 BA-Pointer 中性黑白体系与 XZ 深蓝观测终端体系之间切换（见第 5 节）。

---

## 3. 双向消息协议

方向定义：以 **WebView2 网页**为参照，「Web → 宿主」= 网页 `postMessage`，「宿主 → Web」= `PostWebMessageAsJson`。

### 3.1 既有协议表（BA-Pointer）【事实】

| 消息 | 方向 | payload / 结构 | 触发时机 | 事实来源 |
| --- | --- | --- | --- | --- |
| `uiReady` | Web → 宿主 | 仅 `{type:'uiReady'}`，无 payload | HTML 脚本就绪，`bridge.init()` 末尾立即发 | `ui/ba-pointer-ui.html:546`；`WebBridge.cs:93-96` |
| `configLoaded` | 宿主 → Web | `{type:'configLoaded', payload}`，`payload` = `config.json` 全文（JsonElement）或 `{}` | 宿主收到 `uiReady` → `PushConfigToWebAsync()` | `WebBridge.cs:59-70,95`；`ui/ba-pointer-ui.html:538` |
| `applyConfig` | Web → 宿主 | `{type:'applyConfig', payload}`，`payload` = 配置对象 JSON | 用户在配置终端保存 / 改配置时 | `ui/ba-pointer-ui.html:557-560`；`WebBridge.cs:98-109` |
| `configSaved` | 宿主 → Web | `{type:'configSaved', timestamp:'HH:mm:ss'}` —— **注意：此处为 `{type,timestamp}`，并非 `{type,payload}` 结构** | 宿主写完 `config.json` 后回执 | `WebBridge.cs:102-106`；`ui/ba-pointer-ui.html:540-542` |

**时序要点【事实】**：`WebBridge.cs:50` 先注册 `WebMessageReceived`、`:53` 后 `Navigate`，保证 `uiReady` 不丢；`configLoaded` 是「拉模型」（网页就绪后主动向宿主索取），这是底座应保留的握手范式。

**协议细节观察【观察·只登记】**：`configSaved` 的宿主回执与入站 DTO 的 `{type,payload}` 结构不一致（多了 `timestamp`、无 `payload`）；`PushConfigToWebAsync` 在文件缺失与 JSON 解析失败两种情况下都静默回退 `{}`（`WebBridge.cs:61-67`），网页端无法区分「首次运行」与「配置损坏」。建议统一 DTO 时一并规整（【建议】）。

### 3.2 XZ 侧既有协议【事实】

| 消息 | 方向 | 结构 | 事实来源 |
| --- | --- | --- | --- |
| `vzc:registry` | 宿主 → Web | `{type:'vzc:registry', root, mods, warnings}` | `VZC/VzcHost.cs:258-269`（`:263`）；前端消费 `Core_Dimension/vzc-runtime.js:70` |
| `vzc:activate` | 宿主 → Web | `{type:'vzc:activate', mod}` | `VZC/VzcHost.cs:275-287`（`:284`）；前端消费 `Core_Dimension/vzc-runtime.js:71` |
| `vzc:reload` / `vzc:activate:<id>` / `exit` | Web → 宿主 | **裸字符串** | `MainWindow.xaml.cs:38-41`；`Core_Dimension/vzc-runtime.js:111`、`main.js:201` |

前端监听：`vzc-runtime.js:62` `addEventListener('message')`；`main.js:231` 监听 DOM 自定义事件 `vzc:activate`。【事实】

### 3.3 新增消息建议（建议，非既有实现）

> **知识诚实修正**：任务清单将 `vzc:registry` / `vzc:activate` / `story:node` / `xto:select` 四条一并标为「建议，非既有实现」。经只读核查，**`vzc:registry` 与 `vzc:activate` 在 XZ 侧已是既有实现**（见 3.2 行号），故本文据实把它们登记为【事实】，**不列入建议清单**。仅 `story:node` / `xto:select` 经全工程 Grep 无匹配，确为建议。

| 建议消息 | 方向 | 建议 payload | 建议用途 | 状态 |
| --- | --- | --- | --- | --- |
| `story:node` | 宿主 ↔ Web（双向） | `{type:'story:node', payload:{nodeId, action}}` | 剧情 / 对话节点跳转与状态同步（游戏内 UI、XZ 剧情预览） | **【建议·非既有实现】** 全工程 Grep `story:node` 无匹配 |
| `xto:select` | Web → 宿主 | `{type:'xto:select', payload:{id, kind}}` | XTO 对象 / 资源选中事件上抛 | **【建议·非既有实现】** 全工程 Grep `xto:select` 无匹配 |

**命名空间约定【建议】**：统一采用 `场景:动作`（既有 `vzc:*`，建议 `story:*` / `xto:*` / 未来 `theme:*` / `a11y:*`），全小写、冒号分隔；承载数据一律放 `payload`，状态/时间戳等元数据放顶层，避免 3.1 中 `configSaved` 那种结构漂移。所有新增消息必须沿用「来源校验 + uiReady 握手」前提，裸字符串消息（XZ 现状）建议逐步迁移到 JSON DTO。

---

## 4. 三场景复用矩阵（核心）

三场景定义：`游戏内 UI`（《邪冥的日常》运行时 HUD / 菜单）、`XZ 引擎配置终端`（引擎参数与开关设置）、`VZC 编辑器或管理面板`（.vzc 扩展的浏览、启用、编辑）。虚拟主机命名与配置位置中，凡 XZ 侧现状均标【事实】，凡新场景命名均标【建议】。

| 维度 | ① 游戏内 UI | ② XZ 引擎配置终端 | ③ VZC 编辑器 / 管理面板 |
| --- | --- | --- | --- |
| **复用的层** | 宿主层（虚拟主机映射、消息桥）+ 契约层（DTO、来源校验、握手）+ 表现层结构（CSS 变量骨架、clip-path 切角、pointer-events 分层） | 三层几乎全复用；此场景最接近 BA-Pointer 现状 | 宿主层 + 契约层 + 表现层结构；`vzc:registry`/`vzc:activate` 既有消息直接复用 |
| **需替换的层** | 表现层皮肤（换深蓝观测终端 / 剧情主题）、动态几何背景须关闭或极弱化（避免遮挡 3D 场景）、去掉设置类表单 | 表现层皮肤（收敛到 XZ 品牌）、配置 DTO 对齐（见 7.3）、外接引擎真实配置源 | 表现层皮肤 + 列表/表单组件；新增 `story:node`/`xto:select` 类扩展点；契约层需把 XZ 裸字符串消息迁到 JSON DTO |
| **虚拟主机命名** | 【建议】`game.local` / `hud.local`；若与观测终端共存可复用 `core.local`【事实 XZ 现有】 | 【建议】`xz-config.local`；沿用 BA-Pointer 的 `*.local` 同源范式【事实】 | 【事实】`vzcs.local`（`VzcHost.cs:28`）、`core.local`（`:27`）；【建议】编辑器独立站点 `vzc-editor.local` |
| **配置文件位置** | 【建议】`%LOCALAPPDATA%\XsureZrcnmve\game-ui.json` | 【事实 BA-Pointer 参照】`%LOCALAPPDATA%\BAPointer\config.json`（`MainWindow.xaml.cs:18-23`）；【建议】XZ 侧收敛到 XZ 根目录下的统一配置，具体路径由 A1 根目录契约裁定 | 【事实】`XZ根目录\vzcs\VZC名称\版本号\manifest.json`（`VzcHost.cs:14-15,137`），同名只启用最高版本（`:104-131`） |
| **消息扩展点** | 【建议】`story:node`（节点跳转）、`xto:select`（对象选中）、`hud:toggle`；保留 `uiReady`/`configLoaded` 握手 | 既有 `uiReady`/`configLoaded`/`applyConfig`/`configSaved`【事实】；【建议】扩 `theme:set`、`config:reset`、`a11y:prefs` | 【事实】`vzc:registry`/`vzc:activate`/`vzc:reload`/`exit`；【建议】把 `vzc:activate:<id>` 裸字符串改为 `{type:'vzc:activate',payload:{id}}` |
| **可访问性要求** | **Standard**：动效降级（`prefers-reduced-motion`）、键盘可达（ESC 退出等既有 `main.js:201`）、HUD 不遮挡关键信息、文本对比度 ≥4.5:1 | **Comprehensive**：表单密集、文本多，需文本可选中、高对比度模式、焦点可见、字号可缩放、屏幕阅读器语义 | **Comprehensive**：长时间阅读与列表操作，需文本可选中、行高/字号可调、键盘全可达、状态变更可播报 |
| **动效策略** | 【建议】粒子/几何动效默认降级，尊重减少动效偏好 | 【建议】几何背景动画可关闭 | 【建议】列表过渡精简，禁止无限循环装饰动画 |

**矩阵结论【建议】**：宿主层与表现层结构在三场景可「整体复用」；契约层是收敛重点——BA-Pointer 的 `uiReady` + 来源校验 + JSON DTO 更完整，建议作为底座默认范式，XZ 侧的裸字符串消息与 `NavigationCompleted` 推注册表向其对齐；配置源与皮肤是「按场景替换」的两个主要变量。

---

## 5. 视觉身份统一方案

### 5.1 两套体系（【事实】）

| | BA-Pointer 设置终端 | XZ 观测终端（`Core_Dimension/index.html`） |
| --- | --- | --- |
| 气质 | 中性、黑白、几何、硬切角 | 深蓝、观测仪器、HUD、等宽字 |
| 背景 | `--bg-color:#050505` 纯黑（`:11`）+ 动态几何楔形/三角/斜线（`:43-68`） | 径向渐变 `circle at 50% 45%, #1A1C23 0%, #0A0C10 70%, #050608 100%`（`:11`） |
| 主文本 | `--text-color:#FFFFFF`（`:12`） | `#E0E5FF`（`:12`） |
| 强调 | `--fx-main:#5bb5ff`（`:18`）、`--fx-grey:#9aa0a8`（`:19`） | `#3A5FBC`（`:39,54`）、`#8FA8E8`（`:27,51`）、`#A0B8F0`（`:32`） |
| 字体 | `'Arial Black','Microsoft YaHei',sans-serif`（`:36`）；标题栏/状态栏 `'Courier New'`（`:92` 等） | `'Courier New','Microsoft YaHei',monospace`（`:12`） |
| 切角 | 多处 `clip-path` polygon（见 2.3） | `.btn` `clip-path` polygon（`:35`） |
| 分层 | `.bg-layer`/`#fx-canvas`/`#toast` `pointer-events:none` | `#hud{pointer-events:none}` + `#hud > *{pointer-events:auto}`（`:17-18`） |
| 主题 | `body.light-mode` 完整浅色反转（`:21-31`） | 仅深色 + `body.transparent`（`:14`，用于叠加到 3D 场景），**无浅色主题** |

**共存策略【建议】**：不强制二选一，而是「同一结构、两套皮肤、一个变量层」。以 BA-Pointer 的 `:root` 变量骨架作为**结构契约**，把 XZ 深蓝色值作为另一套皮肤注入同一批变量名；场景通过根元素属性（如 `<html data-skin="neutral|observatory">`）切换。字体统一为「等宽优先 + 中文回退」`'Courier New','Microsoft YaHei',monospace`（XZ 现状），标题可用 `'Arial Black'` 作展示字（BA-Pointer 现状），避免两套字体体系混用导致基线不齐。

> **诚实声明【事实】**：XZ 侧 `Core_Dimension/index.html` **未定义任何 `:root` CSS 变量**，色值全部硬编码。因此下表的「XZ 侧」列是**语义等价的硬编码色值**（事实），而「建议统一变量名」列是**建议**，不是既有映射。

### 5.2 CSS 变量映射表（BA-Pointer → XZ）

| 语义角色 | BA-Pointer 变量【事实】 | BA-Pointer 值【事实】 | XZ 侧语义等价硬编码色【事实】 | 建议统一变量名【建议】 |
| --- | --- | --- | --- | --- |
| 页面底色 | `--bg-color`（`:11`） | `#050505` | `#050608` / `#0A0C10` / `#1A1C23`（渐变，`:11`） | `--xz-bg` |
| 主文本 | `--text-color`（`:12`） | `#FFFFFF` | `#E0E5FF`（`:12`） | `--xz-text` |
| 次级文本 | `--accent-color`（`:13`） | `#888888` | `#66759B`（`:43`）、`#55637F`（`:28`） | `--xz-text-muted` |
| 几何块（楔形/三角） | `--wedge-color`（`:14`） | `#FFFFFF` | 无直接对应（XZ 为渐变+3D 画布） | `--xz-geo-wedge` |
| 分隔线 / 边框基线 | `--line-color`（`:15`） | `#222222` | `rgba(100,150,255,0.18)`（`:23` 顶栏边框） | `--xz-line` |
| 面板底 | `--panel-bg`（`:16`） | `rgba(10,10,12,.78)` | `rgba(5,7,12,0.75)`（`:24` 顶栏渐变） | `--xz-panel-bg` |
| 面板边框 | `--panel-border`（`:17`） | `rgba(255,255,255,.14)` | `rgba(100,150,255,0.35)`（`:33` `.btn` 边框） | `--xz-panel-border` |
| 主强调 / 激活 | `--fx-main`（`:18`） | `#5bb5ff` | `#3A5FBC`（`:39,54`）、`#6B8FF0`（`:39`） | `--xz-accent` |
| 辅助强调 | `--fx-grey`（`:19`） | `#9aa0a8` | `#8FA8E8`（`:27,51`）、`#A0B8F0`（`:32`） | `--xz-accent-soft` |
| 成功态（独立色，非变量） | `.win-status .dot` `#36c98f`（`:115`） | — | 无 | `--xz-success`（建议新增） |
| 错误态（XZ） | 无 | — | `#FF7A7A`（`:57` `.error`） | `--xz-danger`（建议新增） |

**明暗双主题策略【建议】**

1. 以 `:root` 定义 `dark` 全套变量；`[data-theme="light"]` 覆盖全套（复用 BA-Pointer `body.light-mode` 的反转思路，但改用属性选择器以便跨场景）。
2. 保留 XZ 特有 `[data-theme="transparent"]`（对应 `body.transparent`，`:14`）——观测终端需透明背景叠加 3D 场景，这是 BA-Pointer 没有的第三态，必须显式保留。
3. 三态下均要求 `--xz-text` 对 `--xz-bg` / `--xz-panel-bg` 达 WCAG AA（见第 6 节）；`data-theme="transparent"` 因背景不可控，需为 HUD 文本加半透明底板或描边兜底。
4. 主题选择建议通过契约层消息 `theme:set` 持久化，避免各场景各自写 localStorage（BA-Pointer 现状 `ui/ba-pointer-ui.html:566-570` 用 `localStorage('theme')`）。

### 5.3 可直接复用的表现元素（【事实】+【建议】）

| 元素 | 事实（两工程现状） | 复用判定【建议】 |
| --- | --- | --- |
| `clip-path` 切角 | BA-Pointer `.app-window`/`.theme-toggle`/`.switch-btn`/`.opt-btn`/`.action-btn`/`#toast`/range thumb；XZ `.btn`（`:35`）——两套都用同款右下切角 | **可直接复用**：语义与形状天然一致，作为底座按钮/面板的标准形状，建议抽成共用 class |
| 动态几何背景 | BA-Pointer `.block-wedge`/`.block-grey`/`.line-rule` + 无限动画（`:43-68`）；XZ 为径向渐变 + 3D 画布 | **有条件复用**：仅用于「XZ 配置终端 / VZC 管理面板」等 2D 界面；**游戏内 UI 与观测终端 HUD 不宜使用**（会遮挡 3D/剧情画面），且必须受 `prefers-reduced-motion` 约束 |
| `pointer-events` 分层 | BA-Pointer 装饰层全 `none`（`:44,307,312`）；XZ `#hud{none}` + `#hud>*{auto}`（`:17-18`） | **以 XZ 模式为底座默认**：装饰/画布层 `none`、可交互子元素 `auto`，既保证穿透点击又保留控件响应；BA-Pointer 的整体 `none` 过粗 |
| 毛玻璃面板 `backdrop-filter` | BA-Pointer `.app-window` `blur(24px) saturate(140%)`（`:76-77`） | 可复用，但透明主题下需评估性能与可读性 |
| 等宽字体栈 | XZ `'Courier New','Microsoft YaHei',monospace`（`:12`）；BA-Pointer 标题栏/状态栏亦用 `'Courier New'` | **可直接复用**为全底座的「数据/状态」字体 |

---

## 6. 可访问性分级

### 6.1 分级定义【建议】

| 级别 | 要求 | 适用信号 |
| --- | --- | --- |
| **Basic** | 正文对比度 ≥4.5:1（大字 ≥3:1）、焦点可见、无自动播放的无限装饰动效、控件有可访问名 | 瞬时信息、低交互的展示界面 |
| **Standard** | Basic + `prefers-reduced-motion` 降级、键盘全可达、语义化标签、字号可缩放、文本可选中 | 含按钮/表单的常规交互界面 |
| **Comprehensive** | Standard + 高对比度模式、屏幕阅读器完整语义（ARIA）、动效可完全关闭、状态变更可播报、长文本行高/字距可调 | 表单密集、长时间阅读、专业工具 |

### 6.2 三场景对应建议【建议】

| 场景 | 建议级别 | 理由 |
| --- | --- | --- |
| ① 游戏内 UI | **Standard** | 有按钮交互且叠加于 3D/剧情画面，重点是动效降级与键盘可达（ESC 退出既有 `main.js:201`）；不做屏幕阅读器全语义 |
| ② XZ 引擎配置终端 | **Comprehensive** | 表单与说明文本密集，用户需长时间阅读、复制参数值 |
| ③ VZC 编辑器 / 管理面板 | **Comprehensive** | 列表/描述/状态信息多，需文本复制、键盘导航、状态播报 |

### 6.3 具体条款与现状核查

**对比度【事实 + 建议】**
- BA-Pointer 暗色：`--text-color:#FFFFFF` on `--bg-color:#050505` ≈ 20:1，达标；`--accent-color:#888888` on `#050505` ≈ 5.7:1，作为 12px 次级文本勉强达 AA；`--line-color:#222222` 仅作装饰分隔线，对比度极低属可接受（非文本）。
- XZ：主文本 `#E0E5FF` on 深渐变达标；但次级文本 `#66759B`（`Core_Dimension/index.html:43` `#status`）在 `#0A0C10`/`#1A1C23` 背景上约 3.7~4.2:1，**低于 WCAG AA 4.5:1**（估算）【事实·估值】。【建议】把次级文本提升到 `#8FA8E8`/`#A0B8F0` 级别，或在 Comprehensive 场景提供高对比度覆盖。
- `body.light-mode` 的 `--accent-color:#555555` on `#FFFFFF`（`:22-24`）约 7:1，达标。

**`prefers-reduced-motion`【事实 + 建议】**
- BA-Pointer 存在持续动效：`slideWedge 8s infinite alternate`（`:49`）、`rotateTriangle 6s infinite alternate`（`:57`）、粒子 `requestAnimationFrame` 循环（`:743-791`）；全文**未见** `prefers-reduced-motion` 媒体查询（Grep 核实）。
- XZ `Core_Dimension/index.html` 亦未见动效降级处理。
- 【建议】底座统一下发：
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: .001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .001ms !important;
    }
  }
  ```
  并在 JS 侧停掉粒子循环 / 3D 装饰动画（Comprehensive 级别要求「动效可完全关闭」）。

**`user-select:none` 对文本可读性的影响【事实 + 建议】**
- 两工程均全局禁用：BA-Pointer `ui/ba-pointer-ui.html:8` `* { ... user-select:none }`；XZ `Core_Dimension/index.html:8` 同样全局。
- 影响【事实】：配置说明、VZC 描述、版本号、错误诊断、状态数值均无法选中复制；对 Comprehensive 场景（②③）尤其不利，也妨碍视障用户选取文本。
- 【建议】仅对**纯装饰层与交互控件**（背景、按钮、导航、画布）设 `user-select:none`；正文、代码块、状态数值、错误文本显式设 `user-select:text`。这是把两工程提升为可复用底座时**必须修正**的一处表现层契约。

**`cursor:crosshair` 的适用边界【事实 + 建议】**
- BA-Pointer `body { cursor:crosshair }`（`:40`）全局生效，配合「窗口外点击预览粒子爆散」（`:724-728`）与全屏粒子画布有语义；但 `.action-btn`/`.opt-btn` 等控件另设 `cursor:pointer`（`:284,249` 等），全局与局部存在语义冲突。
- XZ `.btn` 用 `cursor:pointer`（`:34`），未用 crosshair。
- 【建议】`crosshair` **仅用于画布 / 预览区 / 瞄准类交互**；配置终端、表单、列表、管理面板用 `default` / `pointer` / `text`。全局 crosshair 不应作为底座默认值。

---

## 7. 缺陷登记（本次只登记不修改）

> **明确声明：本节所有条目本次只登记、不修改、不删除、不构建。** 用户仅授权把 BA-Pointer 当 UI 参考，未授权修 bug；修复归属由 team-lead 另行裁定。

### 7.1 【缺陷·阻断】入口文件名不匹配
- **文件与行号**：`BAPointer.Settings\WebBridge.cs:53` 导航到 `https://bapointer.local/bapointer.html`；但 `BAPointer.Settings\ui\` 下实际只有 `ba-pointer-ui.html`（27994 字节，Glob / ls 核实），**不存在 `bapointer.html`**。
- **影响**：设置界面 404 白屏；`uiReady`（`ui/ba-pointer-ui.html:546`）永不上报 → `configLoaded` 不会推送，配置终端整体不可用。这是 team-lead 已确认缺陷，本文复核无误。
- **建议修法（仅登记）**：二选一 —— ①把 `WebBridge.cs:53` 导航目标改为 `ba-pointer-ui.html`（推荐，保留语义化文件名）；②把 HTML 重命名为 `bapointer.html`。另建议把入口名抽为常量/配置，避免再次漂移。

### 7.2 【观察】配置闭环未接通（本次核查新发现）
- `ui/ba-pointer-ui.html:539` 在 `configLoaded` 分支调用 `applyConfigFromHost(msg.payload)`，但**全文未定义该函数** → 收到配置会抛 `ReferenceError`。
- `bridge.sendConfig()`（`:550-561`）已定义但**从未被调用**；`saveConfig()`（`:641-644`）仅 `console.log` + `toast`，未 `postMessage({type:'applyConfig'})`。
- **影响**：即便 7.1 修好，配置「回填」与「保存」两条链路都不生效，宿主侧 `applyConfig`（`WebBridge.cs:98-109`）收不到数据。
- **建议（仅登记）**：实现 `applyConfigFromHost`，并让 `saveConfig()` 调用 `bridge.sendConfig(cfg)`。

### 7.3 【观察】配置 DTO 结构未对齐（本次核查新发现）
- `config.json`（`BAPointer.Settings\config.json:1-23`）为**嵌套分组**：`trail{width,particleSize,decay,density,bloom}` / `burst{count,force,gravity}` / `behavior{persistentTrail,pauseOnFullscreen,hideInCapture}` / `display{mixedDpi,scope}`。
- HTML 侧 `cfg`（`ui/ba-pointer-ui.html:582-587`）为**扁平键**：`trail,size,decay,density,bloom,burst,force,grav,persistent,pauseFull,hideCapture,dpi,scope`，且键名不一致（`particleSize`↔`size`、`pauseOnFullscreen`↔`pauseFull`、`hideInCapture`↔`hideCapture`、`mixedDpi`↔`dpi`、`count`↔`burst`）。
- **影响**：`configLoaded` 回填与 `applyConfig` 写出的数据契约不对齐，跨场景复用契约层前必须先定「配置的唯一 schema」。
- **建议（仅登记）**：以 `config.json` 嵌套结构为准，HTML 侧做一层 `_mapFromHost/_mapToHost` 适配；该 schema 亦应作为第 4 节「统一配置源」的候选。

### 7.4 【观察】`src\` 空目录
- `E:\XIEMI\xiemi\BA-Pointer\src\` 存在但为空（`ls -la` 核实，仅 `.`/`..`）。用途未核查，列入缺口（第 8 节）。

### 7.5 【观察】`vcxproj.xml` 与 `.vcxproj` 并存
- `BAPointer.Overlay\` 下同时存在 `vcxproj.xml` 与 `BAPointer.Overlay.vcxproj`（Glob 核实）。两者关系/生成方式未核查，仅登记。

### 7.6 【观察】x:Class 命名空间不一致
- `MainWindow.xaml:2` `x:Class="BAPointer.MainWindow"`、`App.xaml:2` `x:Class="BAPointer.Settings.App"`，而 `MainWindow.xaml.cs:7` / `App.xaml.cs` 的命名空间为 `BAPointer.Settings`。潜在编译期不一致，需工程侧确认，本文不展开。

### 7.7 【事实·协议差异】跨工程契约不统一（非单工程缺陷，但影响底座统一）
- 见 2.2 / 3.2：BA-Pointer 用 JSON DTO + `uiReady` + 来源校验；XZ 用裸字符串 + `NavigationCompleted` + 无来源校验。
- **影响**：这是把两工程抽象成「一个可复用 UI 底座」时**必须收敛的核心点**，否则三场景复用矩阵中「契约层复用」不成立。
- **归属（仅登记）**：契约统一与代码整改属 B1（engineering-lead-3），本文只提供差异事实与建议方向，不越界改动。

---

## 8. 知识缺口与后续确认

以下部分**本次未完整核查**，需后续确认，不影响本文已标注为【事实】的结论：

1. **`MainWindow.xaml`（BA-Pointer）**：仅核查控件树（唯一 `WebView2`，`:9-11`）；窗口尺寸、标题栏/系统栏样式、DPI 缩放与 WebView2 的耦合未核查。
2. **`App.xaml` / `App.xaml.cs`（BA-Pointer）**：仅核查 `App.xaml:1-12`（MergedDictionaries 含 `XamlControlsResources`）；Application 生命周期、异常处理、单实例逻辑、WebView2 运行环境初始化顺序未核查。
3. **C++ Overlay 与 UI 底座的耦合边界（重点缺口）**：`MouseHook.cpp/.h`、`ParticleSystem.cpp/.h`、`D3D11Renderer.h`、`OverlayWindow.cpp/.h`、`Config.cpp/.h`、`Main.cpp` 与 UI 底座的关系**完全未核查**。尤其：`config.json` 如何被 Overlay 读取、是否支持热重载、`applyConfig` 写盘后 Overlay 的同步时机、进程间是否存在 IPC。这些直接决定「XZ 引擎配置终端」场景的契约层设计（配置是否实时生效），**优先级最高**。
4. **`vcxproj.xml` 用途**及其与 `BAPointer.Overlay.vcxproj` 的生成关系未核查。
5. **`src\` 空目录**的设计意图未核查。
6. **可访问性运行时验证缺口**：`prefers-reduced-motion`、高对比度模式在两工程的既有支持情况仅做文本检索，未做浏览器/运行时验证；第 6.3 节对比度为色值估算，非实测。
7. **XZ 侧时序差异**：XZ 工程由 B1 / B2 成员并行改造中，本文对 XZ 的描述为只读抽样快照（见第 0 节），改造落地后需复核 `MainWindow.xaml.cs`、`VzcHost.cs`、`Core_Dimension/index.html` 的相应行号与协议结论。
8. **配置 schema 归属**：`config.json` 的最终唯一 schema、以及 XZ 根目录配置契约，由 A1（engineering-lead）裁定，本文未预设。

---

## 9.（D2，可选）规划页视觉一致性检查清单

> 用途：作为 `xz-project-plan/index.html`（B2 / design-strategist 产出）的**评审输入**。**本文未读取、未改动该文件**，以下为通用检查项，不针对其具体内容。

- [ ] 是否用 `:root` CSS 变量集中定义色值，而非硬编码 hex（对应 5.2）
- [ ] 变量名是否对齐建议的统一命名 `--xz-*`，或明确标注所用皮肤 `data-skin`
- [ ] 是否提供 `dark` / `light` 双主题（或至少 dark + 高对比度覆盖）（对应 5.3）
- [ ] 按钮/面板切角 `clip-path` 是否与 BA-Pointer 与 XZ `.btn`（`Core_Dimension/index.html:35`）同款
- [ ] 是否**误用全局** `user-select:none`（正文/代码块/状态数值应 `user-select:text`，对应 6.3）
- [ ] 是否**误用全局** `cursor:crosshair`（仅画布/瞄准区适用，对应 6.3）
- [ ] 是否提供 `@media (prefers-reduced-motion: reduce)` 降级（对应 6.3）
- [ ] 正文对比度是否 ≥4.5:1；次级文本是否避开 `#66759B` 一类低对比色（对应 6.3）
- [ ] 装饰层 / 画布是否 `pointer-events:none`，交互子元素是否 `pointer-events:auto`（对应 5.3）
- [ ] 字体栈是否含中文回退（`'Microsoft YaHei'`），等宽与展示字是否分工明确
- [ ] 承载数据的消息是否统一 `{type,payload}` 结构（对应 3.1 / 3.3）
- [ ] 是否区分「事实 / 规划 / 建议」三类表述，避免把未落地项写成既有实现（知识诚实）
- [ ] 引用的文件名、行号、变量名是否可在工程内核实（避免 7.1 式入口漂移）

---

## 10. 自查

**引用可追溯性核对**（所有条目均可在参考工程 / XZ 只读核查中找到）：

- 文件名：`WebBridge.cs`、`MainWindow.xaml.cs`、`MainWindow.xaml`、`App.xaml`、`config.json`、`ui/ba-pointer-ui.html`、`VZC/VzcHost.cs`、`Core_Dimension/index.html`、`Core_Dimension/vzc-runtime.js`、`Core_Dimension/main.js`、`BAPointer.Overlay.vcxproj`、`vcxproj.xml` —— 全部经 Glob / ls / Read 核实存在。
- 行号：`WebBridge.cs:21,22,41,44-47,49,50,53,59-70,79,82,93-96,98-109,102-106,123,129-133`；`ui/ba-pointer-ui.html:8,10-20,21-31,36,40,43-68,79,115,198,233,250,288,306,307,312,539,546,550-561,557-560,566-570,582-587,641-644,724-728,743-791`；`config.json:1-23`；`VzcHost.cs:14-15,27,28,58-69,104-131,137,258-269,263,275-287,284`；`XZ MainWindow.xaml.cs:22-29,35-48,38-41,45-48`；`Core_Dimension/index.html:8,11,12,14,17-18,23,24,27,28,32,33,35,39,43,51,54,57,60-69` —— 均为实读行号。
- CSS 变量名：`--bg-color` `--text-color` `--accent-color` `--wedge-color` `--line-color` `--panel-bg` `--panel-border` `--fx-main` `--fx-grey` 及 `body.light-mode` —— 与 `ui/ba-pointer-ui.html:10-31` 逐一对应。
- 消息类型：`uiReady` / `configLoaded` / `applyConfig` / `configSaved`（WebBridge.cs + HTML）、`vzc:registry` / `vzc:activate` / `vzc:reload` / `exit`（VzcHost.cs + XZ MainWindow.xaml.cs + vzc-runtime.js）—— 全部核实为【事实·既有】；`story:node` / `xto:select` 全工程 Grep 无匹配，标为【建议·非既有实现】。

**事实 / 建议区分**：全篇用【事实】【建议】【观察】【缺口】标注；对任务清单中「4 条均建议」的假设做了**知识诚实修正**（`vzc:registry`/`vzc:activate` 实为既有实现，见 3.3）；对 XZ 侧「无 CSS 变量」「协议不一致」等如实登记，未把规划/建议写成既有。

**约束复核**：仅写入本文件；BA-Pointer 全程只读；XZ 除本文件外全程只读；未删除、未提交、未新建工程文件、未构建；未读取 `xz-project-plan/index.html`。

```
IS_PASS: YES
```
