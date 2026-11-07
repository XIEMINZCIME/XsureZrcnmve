# XsureZrcnmve 3.0 · Phase 4 工程化路线（已批准的规格 · 本轮不落地）

> 文档编号：C5-交付B　|　交付角色：工程技术与引擎工程师（程基岩 / engineering-lead-3）
> 状态：**规格（已批准、待参数拍板后派发）**；本轮 C5 **不落地任何工程文件**
> 适用范围：Windows 桌面（ADR-001）；与 `xz-unified-architecture.md` 第 12 节工程形态风险行、ADR-005、
> 第 13 节「D3 代码整改 ↔ 可构建性」审查行配套阅读
> 根路径：`E:\XIEMI\XsureZrcnmve`（下称「XZ 根目录」）
>
> 知识诚实声明：本文件只登记**已核实的事实**与**已批准的后续任务规格**。WebView2 NuGet 包内程序集清单、
> 目标框架最终版本、包版本、`App.xaml` 启动行为、真实 exe 运行结果均**未经实机确认**，
> 所有不确定处显式标注「待定 / 需验证 / 未验证」，不臆造版本、API 与构建结果。

---

## 0. 本轮动作边界（`123` 三视角合成为一份连贯决策）

用户对本轮「工程形态 / 授权边界」问题裁定 `123`。按本项目一贯做法，解读为**同一决策的三个观察面**，
不是同时执行互斥动作：

| 视角 | 观察面 | 本轮落点 |
| --- | --- | --- |
| ① 事实层 | 现状是什么 | **确认 HTA 为既有运行形态**（HTML/HTA 文本被命名为 `.exe`）；WPF + WebView2 仅为目标形态、未完成工程化 |
| ② 本轮动作层 | 现在做什么 | **只登记风险、不改工程**：在 `xz-unified-architecture.md` 第 12 节增补风险行、ADR-005、第 13 节 BLOCKED 审查行；本文件即「规格」本身 |
| ③ 后续任务层 | 以后做什么 | 把「补 WPF 骨架」写成**已批准的完整规格**（§3），但**本轮不落地**；需「用户拍板 §5 三个参数 + 主理人单独派发」后方可执行 |

**本轮 C5 硬边界**：不新建 `.csproj` / `App.xaml` / `App.xaml.cs`，不联网还原 NuGet，不改 `.exe`，
不 commit，不发布。工程目录路径集合保持 45=45 无增删。

---

## 1. 事实基线（来源：主理人只读核实 + C3 / e2e-runner 报告）

下列证据由主理人只读核实与 C3 真机冒烟报告给出，本文直接引用、不重新推断：

| # | 事实 | 来源 |
| --- | --- | --- |
| F1 | 全树 `.sln/.slnx/.csproj/.vcxproj/.props/.targets` 均为 0；`.vs/` 只有 `slnx.sqlite` + 一个空 launch 任务，VS 18 为「打开文件夹」模式 | 主理人只读核实 |
| F2 | `.xaml` 仅 `MainWindow.xaml`，无 `App.xaml` / `App.xaml.cs`（无 `Application` / `Main` / `StartupUri`） | 主理人只读核实 |
| F3 | `XsureZrcnmve.exe` 5584 B，首 2 字节 `b'<!'`、`is_MZ_PE=False`；头为 `<!DOCTYPE html>` + `<HTA:APPLICATION ID="oHTA">`，全文无 `WebView2` 字样 → HTML/HTA 文本被命名为 `.exe` | 主理人只读核实 + C3 |
| F4 | 工程目录内 `dotnet restore` / `dotnet build` 均 `MSB1003` 退出码 1，MSBuild 评估期失败、**未进包解析** | C3 报告 |
| F5 | SDK `10.0.403`、`Microsoft.WindowsDesktop.App.Ref 10.0.14`、WebView2 Runtime `156.0.4314.58` 可用；`.nuget\packages` 全局缓存不存在；nuget.org HTTP 302 可达 | C3 报告 |
| F6 | 此前编译验证均为 **stub 级**：`C:\tmp\xz-b1-verify` 只桩了 `CoreWebView2` 两个方法与一个枚举，仅够编译 `VZC/VzcHost.cs`；**本工程源码从未真实构建运行** | C3 报告 + B1 stub 工程 |

**由 F1~F6 推出的唯一结论**：`core.local` 映射、`EnsureCoreWebView2Async`、
`NavigationCompleted→PostRegistry`、`window.VZC` 契约**只存在于源码文本中，未经运行时验证**。
B1 的 `node --check` / stub `dotnet build` / JSON 实证 / XTO 冒烟结论**仍成立**，但作用域限于
「语法正确 + stub 可编译 + 纯逻辑正确」，不等于「真机可构建运行」。

---

## 2. 双形态定位（既有 HTA / 目标 WPF）

| 维度 | 既有运行形态（事实，已确认） | 目标形态（未完成工程化） |
| --- | --- | --- |
| 载体 | `mshta.exe` / Trident（HTML Application，F3） | WPF + WebView2（`Microsoft.Web.WebView2.Wpf` + `.Core`） |
| 入口 | `<HTA:APPLICATION>` + HTML/脚本 | `App.xaml`（`Application` + `StartupUri`）→ `MainWindow.xaml` |
| 工程外壳 | 无（F1/F2） | `XsureZrcnmve.csproj`（`net10.0-windows` / `UseWPF`） |
| 宿主 API | **不具备** WebView2 `CoreWebView2` 宿主 API（见 §4） | 具备（**未经实机确认，需验证**） |
| 与本轮关系 | 事实层确认，不改、不删、不替用户处置 | 只写成 §3 规格，本轮不落地 |

二者**不互斥、不互相冒充**：HTA 是磁盘上真实存在的现状，WPF 是主理人裁定的目标方向。
C5 的动作是「把两者定位写清楚 + 登记风险」，而非「把 HTA 伪装成 WPF 工程」或「立即删除 HTA」。

---

## 3. 路线 (a) · 补 WPF 骨架 · 完整任务规格（已批准、待派发、本轮不落地）

> 本节是**规格**，不是已执行动作。仅当 §5 三个参数经用户拍板、且主理人单独派发 Phase 4 任务后，
> 才按下述清单落地；届时按 §6 解除「不擅自新建项目文件」约束。

### 3.1 需新增的工程文件清单

| 文件 | 用途 | 关键要素 |
| --- | --- | --- |
| `XsureZrcnmve.csproj` | WPF 项目外壳 | 见 §3.2 |
| `App.xaml` | `Application` 定义 + `StartupUri` | 见 §3.3 |
| `App.xaml.cs` | `Application` 代码后置（partial） | 见 §3.3 |

**只新增以上 3 个文件**；`MainWindow.xaml(.cs)`、`VZC/VzcHost.cs` 为既有文件，由 csproj 纳入编译，不改其内容。

### 3.2 `XsureZrcnmve.csproj` 要素

- `TargetFramework`：`net10.0-windows`（**版本待用户拍板，见 §5 参数①**；F5 显示 SDK `10.0.403` 可用）。
- `UseWPF=true`：启用 WPF 目标，`MainWindow.xaml` / `App.xaml` 才能作为 `Page`/`Application` 参与构建。
- `PackageReference Include="Microsoft.Web.WebView2"`：**版本待定（§5 参数②）**，须联网还原
  （F5：`.nuget\packages` 缓存不存在，nuget.org 可达）。
- 纳入编译的既有源码：`MainWindow.xaml`、`MainWindow.xaml.cs`、`VZC/VzcHost.cs`。
- 不纳入 / 不改：`Core_Dimension/`（模型、vendor、JS）、`VZC/scan_vzcs.py`、`vzcs/index.json`、
  `manifest.json`、`data/config.ini`、BA-Pointer、`.vs/`、`Archive_XM/`、`Heresy_VZC/`、`.exe`、`xzc.ico`。

### 3.3 `App.xaml` + `App.xaml.cs`

- `App.xaml`：声明 `Application`，设 `StartupUri="MainWindow.xaml"`，提供应用级资源（如需）。
- `App.xaml.cs`：`Application` 的 partial 代码后置；不在此处臆造启动逻辑。
- 二者共同补上 F2 指出的缺口（现状无 `Application` / `Main` / `StartupUri`，WPF 无启动入口）。

### 3.4 技术前提与待验证项（不臆断）

- `MainWindow.xaml:4` 引用 `clr-namespace:Microsoft.Web.WebView2.Wpf;assembly=Microsoft.Web.WebView2.Wpf`，
  即需要 WebView2 的 **Wpf** 程序集；`VZC/VzcHost.cs` 使用 `CoreWebView2` 等 **Core** 类型。
- 因此还原后须核对 `Microsoft.Web.WebView2` 包内 **`Wpf.dll` 与 `Core.dll` 同时存在**。
  > **未实机确认，需验证**：本轮未联网还原、未检查包内容，不臆断包内程序集清单与版本布局；
  > 该核对列为 Phase 4 任务的**验收前置**，未通过则不继续。
- `Microsoft.WindowsDesktop.App.Ref 10.0.14`、WebView2 Runtime `156.0.4314.58` 为 F5 已核实可用项，
  但「可用」不等于「已在本工程还原成功」，构建前仍需实跑 `dotnet restore`。

### 3.5 `MainWindow.xaml.cs` 的 API 依赖面（只读核对，来源 C3）

补外壳后，以下依赖才可能进入真实编译 / 运行（现状均未验证）：

`EnsureCoreWebView2Async`、`WebMessageReceived`、`NavigationCompleted`、`Source`、`NavigateToString`，
以及 `VZC/VzcHost.cs` 的 `SetVirtualHostNameToFolderMapping(core.local, …)` / `PostWebMessageAsJson`。
补骨架只解决「有项目可编译」，**不保证**这些 API 在目标包版本下签名一致或运行时可用。

### 3.6 `C:\tmp\xz-b1-verify` stub 不可直接升级为真机外壳

- 该临时工程只桩了 `CoreWebView2` 两个方法与一个枚举，仅够编译 `VZC/VzcHost.cs`（F6）。
- 它**不能**编译 `MainWindow.xaml.cs`（缺 Wpf 控件、`Application`、XAML 生成代码），**不能**运行。
- 真机外壳必须换成**真实 NuGet 包 + `UseWPF=true` + `App.xaml`**，即 §3.2 / §3.3 全套；
  stub 只能作为「最小骨架参考」，不可复用为真机工程。

### 3.7 建议验证口径（建议，非既成事实）

Phase 4 任务建议以「真实 `dotnet restore` → `dotnet build` 0 错误 → 桌面会话启动 exe → §7 清单逐项验收」
为真机通过口径；此为**建议**，尚未经主理人采纳，不写成已知结论。C3 的 `dotnet build` 失败（F4）
在补外壳前不构成对 C# 源码正确性的否定。

---

## 4. 路线 (b) · HTA 形态重定位

- HTA 由 `mshta.exe` / Trident 承载（F3），**无法提供** WebView2 的 `CoreWebView2` 宿主 API：
  `EnsureCoreWebView2Async`、`SetVirtualHostNameToFolderMapping(core.local, …)`、
  `WebMessageReceived`、`NavigationCompleted`。
- 故现有 VZC 注册表推送链路（`VzcHost.PostRegistry` / `Activate` → `window.VZC`）在 HTA 形态下**不可运行**：
  没有 `CoreWebView2` 就没有虚拟主机映射与 `PostWebMessageAsJson` 的承载对象。
- 若用户选此形态作为正式目标，需**整体重做宿主逻辑**（换用 HTA 可承载的通信机制，或放弃 WebView2 注册表链路），
  且 C3 的 `dotnet build` 验证口径需**重新定义**（HTA 不依赖 .csproj，原口径不适用）。
- 本轮**不选择、不排除**任一路线：路线 (a)/(b) 的最终取舍取决于 §5 参数③对现有 HTA `.exe` 的处置，
  由用户拍板，不替用户决定。

---

## 5. 待拍板的三个参数（明确列出，不替用户决定）

| 参数 | 内容 | 现状 / 可选 | 拍板方 |
| --- | --- | --- | --- |
| ① 目标框架版本 | `XsureZrcnmve.csproj` 的 `TargetFramework` | 候选 `net10.0-windows`（F5：SDK `10.0.403` / Ref `10.0.14` 可用）；是否最终采用、是否需 `UseWindowsForms` 等，待定 | 用户 |
| ② `Microsoft.Web.WebView2` 包版本 | `PackageReference` 的 `Version` | **版本待定**；本机缓存无该包（F5），须联网还原；与 Runtime `156.0.4314.58` 的对应关系待验证 | 用户 |
| ③ 现有 HTA 命名的 `.exe` 处置 | 5584 B 的 HTML/HTA 文本（F3） | 替换 / 保留 / 更名，三选一；本轮**不改、不删、不替用户决定** | 用户 |

**派发条件**：仅当上述三项经用户拍板、且主理人**单独派发** Phase 4 工程化任务后，路线 (a) 才可执行（§6）。

---

## 6. 授权边界裁定

- **对 C5（本轮）**：B1 / C1 的「不擅自新建项目文件」约束**仍然有效**。本轮只写
  `xz-unified-architecture.md` 的增补 + 本 `phase4-engineering-route.md` 一个 md；
  未新建 `.csproj` / `App.xaml` / `App.xaml.cs`，未联网还原，未改 `.exe`，未 commit，未发布。
- **对后续 Phase 4 工程化任务**：解除该约束，**但仅在**「用户拍板 §5 三个参数 + 主理人单独派发」同时满足后。
  即便解除，仍**禁止改动**：BA-Pointer（`E:\XIEMI\xiemi\BA-Pointer\`）、模型（`xiemosheng.vrm` /
  `xieming_geo.glb`）、`Core_Dimension/vendor/`、`.exe`、`xzc.ico`、`.vs/`、`Archive_XM/`、`Heresy_VZC/`；
  **禁止 git commit**；改 `.exe` / 发布须另行授权。
- **C3 边界回顾**：C3（e2e-runner）全程只读，未新建工程文件、未联网还原、未真机构建、未改 `.exe`、未 commit，
  结论保持 BLOCKED；本文不改写 C3 报告，也不回改 `quality-gate-lean.md`（18:15 历史 QA 快照，一字节不动）。

---

## 7. C3 未覆盖面清单（全部标注「未验证」）

C3 因工程缺构建外壳而止步于只读核实（F1~F6）。下列运行时面**全部未验证**，
Phase 4 真机任务须逐项补验；本轮不得据源码文本推断为「已通过」：

| # | 未覆盖面 | 状态 |
| --- | --- | --- |
| 1 | 真实 exe 编译运行 | **未验证** |
| 2 | `CoreWebView2` 初始化（`EnsureCoreWebView2Async`） | **未验证** |
| 3 | `core.local` 虚拟主机映射（`SetVirtualHostNameToFolderMapping`） | **未验证** |
| 4 | 导航完成（`NavigationCompleted` 触发） | **未验证** |
| 5 | `NavigationCompleted → PostRegistry` 链路 | **未验证** |
| 6 | `WebMessageReceived` 双向通信 | **未验证** |
| 7 | VZC 注册表推送（`PostRegistry` / `Activate` → `window.VZC`） | **未验证** |
| 8 | 3D 场景渲染（three.js + three-vrm） | **未验证** |
| 9 | 无未处理异常退出 | **未验证** |
| 10 | WebView2 NuGet 实际还原 | **未验证** |
| 11 | 桌面会话 GUI 启动 | **未验证** |

---

> 结论：事实层已确认 HTA 为既有形态；本轮 C5 只登记风险、不改工程；
> 「补 WPF 骨架」已写成上方**已批准的规格**但**未落地**。Phase 4 待用户拍板 §5 三参数 + 主理人单独派发。
> 配套：`xz-unified-architecture.md` 第 12 节工程形态风险行、ADR-005、第 13 节 BLOCKED 审查行；C3 报告。
