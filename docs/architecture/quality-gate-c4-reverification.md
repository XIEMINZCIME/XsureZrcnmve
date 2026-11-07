# C4 · 独立复跑 lean 质量门（最终验收）· XsureZrcnmve 3.0

> 执行人：严守真（quality-lead）｜任务：C4（任务 #14）｜性质：**按当前最终磁盘状态独立复跑**，验证 C1/C2/C2续/C3/C5 变更闭环
> 本报告**能独立读懂，不依赖** `quality-gate-lean.md`；历史快照（18:15 交付）**保持原样、一字节不改**。
> 验证日期：2026-11-05｜工具链：dotnet 10.0.403 / node v22.22.2 / Python 3.13.14 / PowerShell 5.1
> 硬约束：只读验证 + **仅新建本报告一个文件**；未改任何既有文件、未新建工程文件、未联网还原、未发布、未 commit、未改规划页；临时脚本/stub/样本全部落系统临时目录（`%TEMP%` / `/tmp`），用 Python `shutil.rmtree(..., ignore_errors=True)` 或 `os.remove` 清理，**未使用 `rm -rf`**。

---

## 0. 结论速览

| 项 | 结论 |
| --- | --- |
| **GATE** | **PASS** |
| **ROUTE** | **NoOne** |
| **通过率** | **41 / 41 = 100%**（8 类验证逐项拆解为 41 个检查项，全部通过） |
| **CONCERNS 登记** | **0 项**；**R9 已清零**（C1 修复 + 本报告验证 1 运行实证 + 文档 `:459` 已同步） |
| **阻塞项** | **无**（无需转交 Engineer） |
| **IS_PASS** | **YES** |

> **判定适用范围**：PASS 覆盖「本轮五组变更闭环、CONCERNS 清零、无新文档漂移、无越界写入、规划页与线上一致性」。**不覆盖真机运行时行为** —— C3 判 BLOCKED（非 FAIL），工程缺构建外壳、源码从未真实构建运行，11 项运行时面「未验证」，属 Phase 4 待派发范围（见 §7）。此限制已由 ADR-005 / R13 / `:478` 显式登记，非本轮引入，不改变 GATE。

### 0.1 历史快照 18:15 与本次复验的关系（不靠篡改历史结论消除表面矛盾）

| 维度 | 历史快照 `quality-gate-lean.md` | 本次 C4 复验 |
| --- | --- | --- |
| 时点 | 2026-11-05 18:15:37 | 2026-11-05 当前最终磁盘 |
| 状态 | B4 时刻：R9 为唯一 CONCERNS；入口 `entry_pending_confirmation=true` 待用户确认；规划页「本地预览态，尚未发布」 | C1 修复 R9；C2/C2续 固化入口并同步 6 处文档 + 规划页三处；C3 真机 E2E BLOCKED；C5 落地 ADR-005 / R13 / Phase 4 路线 |
| 结论 | PASS (with CONCERNS) / NoOne / 45-45 | **PASS / NoOne / 41-41 / CONCERNS 0** |
| 文件状态 | **29146 B / md5 `f9f772e8f616ba03dfa0eab582a6a8b9` / mtime 18:15:37，前后复算一致，一字节未改** | 本报告为**新建**文件，不修改、不覆盖、不重写历史结论 |

两份报告结论不同是**状态随时序演进的自然结果，不是矛盾**：历史快照按「当时磁盘状态」正确，本报告按「当前磁盘状态」正确。表面差异由「C1~C5 已发生」解释，**未通过篡改历史结论消除**。历史快照中残留的 `entry_pending_confirmation`（6 行）等旧表述，作为**唯一允许的历史命中**被明确豁免（见验证 2）；其它文件必须 0。

---

## 1. 本轮待验变更（按磁盘实证，不采信自报）与验证方法

### 1.1 变更清单（实测 size / mtime）

| 组 | 对象 | 实测当前状态 |
| --- | --- | --- |
| C1 | `VZC/scan_vzcs.py` | **9319 B / 18:21:02**（B4 时 4842 B）；新增 `read_vzc()`、`engine_3x_compatible()`、22+9 字段契约 |
| C1 | `vzcs/index.json` | **108 B / 18:21:09**，`type/root/mods/warnings` 四键空注册表 |
| C2 | `manifest.json` | **338 B / 18:21:05**，9 顶层字段，删 `entry_pending_confirmation`，`notes` = 「入口已由主理人确认并固化为 3.0 正式入口」 |
| C2续 | `xz-unified-architecture.md` | **39204 B / 482 行 / 18:54:37**（B4 时 36217 B / 455 行）；纯新增 27 行 |
| C2续 | 规划页 `index.html` | **28922 B / 18:32:06**（B4 时 29011 B） |
| C3 | 真机 E2E | **BLOCKED（非 FAIL）**：无构建外壳；`XsureZrcnmve.exe` 为 5584 B HTA 文本 |
| C5 | `phase4-engineering-route.md` | **新建 13336 B / 193 行 / 18:55:23**，`docs/architecture/` 现 5 个 md |
| 发布 | 线上 | `https://xz-architecture-plan.app.workbuddy.host/?sharecode=QSRKSWK77B`（首次发布） |

`VZC/VzcHost.cs` **19382 B / 17:52:59 未变**（本轮未改宿主源码，R9 修复仅在离线扫描器侧）。`data/config.ini` **1010 B / 17:42:55 未变**。

### 1.2 验证方法

- **静态**：Read 全量源码/配置/文档；Grep 精确行号；`python -m json.tool`；UTF-8/BOM/LF 字节检查。
- **运行实证**（核心，非「确认文件存在」）：
  1. 在 `%TEMP%` 构造**完整临时 XZ 根**（含 `VZC/scan_vzcs.py` 副本 + `vzcs/` 两个样本目录），**无参运行** `python VZC/scan_vzcs.py` —— 脚本 `ROOT` 基于 `__file__`，输出落到临时目录的 `vzcs/index.json`，**工程内零写入**；用 Python 断言逐字段比对宿主 C# 源码属性集。
  2. `python -m py_compile`（`PYTHONPYCACHEPREFIX` 重定向到临时目录）、`node --check`、`dotnet build`（只读复核 MSB1003）、`cmp`/`md5sum` 线上本地字节比对。
  3. PowerShell 实测 `System.Uri.EscapeDataString`、Python 实测 `urllib.parse.quote`（验证 8）。
- **禁改核查**：全树 `find -printf '%T@ %s %p'` 在**开工前**存基线快照 `/tmp/xz-c4-before.txt`（46 文件），报告落盘前 `diff` 比对，最后再比对确认只新增本报告。
- **线上**：WebFetch 取正文 + curl 直取 HTML 源码补齐 badge/footer。

---

## 2. 逐项验证结果（命令 / 退出码 / 关键输出 / 判定）

### 验证 1 · R9 消除实证 — **PASS**

命令（`%TEMP%` 临时根，样本自动清理）：
```bash
TMPROOT=$(mktemp -d); export PYTHONPYCACHEPREFIX="$TMPROOT/pycache"
python -m py_compile "E:/XIEMI/XsureZrcnmve/VZC/scan_vzcs.py"
mkdir -p "$TMPROOT/root/VZC" "$TMPROOT/root/vzcs/GoodMod/1.0.0" "$TMPROOT/root/vzcs/BadMod/1.0.0"
cp "E:/XIEMI/XsureZrcnmve/VZC/scan_vzcs.py" "$TMPROOT/root/VZC/scan_vzcs.py"
# GoodMod: 合法 .vzc (NepInRx-13 / ">=3.0.0 <4.0.0") + main.mixz + manifest{CustomFlag}
# BadMod : .vzc runtime=OtherRuntime（latest、含 main.mixz，确保非 awaiting）
(cd "$TMPROOT/root" && python VZC/scan_vzcs.py)
python -m json.tool "E:/XIEMI/XsureZrcnmve/vzcs/index.json" >/dev/null
python -c "import shutil,sys; shutil.rmtree(sys.argv[1], ignore_errors=True)" "$TMPROOT"
```

输出与退出码：
```
[1a] py_compile                       exit=0
[1c] 无参运行  [VZC] 扫描完成：1 个生效版本 / 共 2 条 → ...\root\vzcs\index.json   exit=0
     ! BadMod/1.0.0: .vzc 不相容 — loader.runtime='OtherRuntime'，要求 'NepInRx-13'
[1d] [宿主] VzcMod camelCase 键数 = 22 | VzcDefinition camelCase 键数 = 9
     [注册表] 顶层键 = ['mods','root','type','warnings'] | mods 条数 = 2
     [GoodMod] 22 键字段集 == 宿主 : True (实际 22 键)
     [BadMod]  22 键字段集 == 宿主 : True (实际 22 键)
     [GoodMod] hasVzc = True | vzc 键数 = 9 | == 宿主 9 键 = True
     [GoodMod] status = active | vzcCompatibility = compatible
     [GoodMod] extra.CustomFlag = keep-me (原始键不改名)
     [GoodMod] entryUrl = https://vzcs.local/GoodMod/1.0.0/main.mixz
     [BadMod]  status = incompatible | vzcCompatibility = incompatible | hasMixz = True
     [warnings] 条数 = 1
     [断言] 全部通过
[1e] [json.tool] PASS（工程内 108 B 四键空注册表）
[1f] 工程内 __pycache__ / *.pyc 残留 = 0
```

**逐项比对结论**（宿主 `VzcHost.cs` ↔ `scan_vzcs.py`）：

| 比对项 | 宿主 | 离线扫描器 | 判定 |
| --- | --- | --- | --- |
| Mod camelCase 键集 | `VzcMod` 22 属性（`VzcHost.cs:79-103`） | `scan_vzcs.py:185-209` 输出 22 键 | **一致**（从 C# 源码正则提取属性名 → camelCase → 与运行时输出集合比对） |
| vzc 子对象键集 | `VzcDefinition` 9 属性（`:112-120`） | `:79-89` 9 键 | **一致** |
| 相容判定 | `:254` `NepInRx-13`（忽略大小写）、`:259` `IsEngine3xCompatible` 主版本 3 | `:92` / `:96` + `engine_3x_compatible()` (`:39-49`) 同保守正则 | **一致** |
| 状态优先级 | `:156-161` `incompatible > awaiting-mixz-spec > active/inactive` | `:178-183` 同序 | **一致**，且 BadMod 为 latest 且 `hasMixz=True` 仍判 `incompatible`（**未被 active 覆盖**） |
| 无 `.vzc` 默认值 | `:102-103` `HasVzc=false` / `Vzc=null` / `VzcCompatibility="unknown"` | `:144-146` `has_vzc=False` / `vzc_def=None` / `vzc_compat="unknown"` | **一致** |
| `extra` 原始键 | 不设 `DictionaryKeyPolicy`（`:361/364`） | `:204-205` 原样保留 | **一致**（`CustomFlag=keep-me` 实测） |
| 多 `.vzc` 处理 | `:228-229` 仅解析首个 + warning | `:149-151` 同 | **一致** |

**R9 清零判定：成立。** C1 已补齐字段集、相容判定、状态优先级、默认值与 `extra` 保留；运行实证通过；工程内 `vzcs/index.json` 合法且为四键空注册表。

### 验证 2 · 入口固化跨文档一致性 — **PASS（含统计口径偏差的独立追查）**

命令：`python -m json.tool manifest.json`；Python 全库逐文件逐行统计 9 个关键词；`Grep` 精确定位规划页命中行。

输出：
```
[json.tool] PASS
manifest: BOM=False | 顶层字段数=9 | keys=[schema_version,engine,engine_version,entry,
         base_resolution,platform,runtime,default_story,notes]
         notes=入口已由主理人确认并固化为 3.0 正式入口
         entry_pending_confirmation 存在 = False
全库关键词命中（文件:行数）：
  'entry_pending_confirmation'       total= 6  {'docs/architecture/quality-gate-lean.md': 6}
  '待确认'                            total= 3  {'docs/architecture/quality-gate-lean.md': 2, 'PLAN/index.html': 1}
  '尚未发布'                          total= 2  {'docs/architecture/quality-gate-lean.md': 2}
  '未修 · 后续 P1'                    total= 3  {'docs/architecture/quality-gate-lean.md': 3}
  '10 个顶层字段'                     total= 0  {}
  '9 个顶层字段'                      total= 1  {'docs/architecture/xz-unified-architecture.md': 1}
  '已修复（C1）'                      total= 1  {'docs/architecture/xz-unified-architecture.md': 1}
  '本地预览态'                        total= 5  {'docs/architecture/quality-gate-lean.md': 2, 'PLAN/index.html': 3}
  'ONLINE // XSUREZRCNMVE 3.0'       total= 1  {'PLAN/index.html': 1}
XZ 工程内（排除历史快照）5 词命中 = 0（无任何输出）
```

**口径偏差追查（不以「无关」轻率略过）**：派发要求「允许且**仅允许** `quality-gate-lean.md` 6 行历史快照命中，其他文件必须 0」。实测 `entry_pending_confirmation` 恰为历史快照 **6 行** ✓，XZ 工程内其它文件 **0** ✓。但按「全库含规划页」的宽口径，存在 2 处字面偏差，逐行定位如下：

| 命中 | 精确行 | 实际文本 | 性质判定 |
| --- | --- | --- | --- |
| 规划页 `待确认` ×1 | `index.html:426` | 「…观测终端侧职责由工程契约澄清（**推导，待确认**）」 | R4 模型双位置风险的既有知识诚实标注，**与入口固化无关**，B4 时即存在，非本轮残留 |
| 规划页 `本地预览态` ×3 | `index.html:362` / `:389` / `:419` | 六角色表「本地预览态 / 发布态区分」、G2「本地预览态与发布态分离」、R3「…/ 本地预览态的路径分隔」 | **产品术语**（一对状态概念），非「本页尚未发布」的自我声明；与派发明示的「正文 3 处产品术语保留」吻合 |
| 历史快照 `待确认` ×2 / `尚未发布` ×2 / `未修 · 后续 P1` ×3 | — | 旧结论文本 | 同一历史快照，未改动，属**明确豁免**对象 |

规划页 `尚未发布` = **0**、`entry_pending_confirmation` = **0**、`10 个顶层字段` = **0**；title / badge / footer 三处已去除预览态声明（验证 6/7 复核）。

**独立判定**：以「XZ 工程内」为统计范围，派发要求**完全满足**（其它文件 0，`entry_pending_confirmation` 恰 6 行）。以「全库含规划页」为范围，2 处字面偏差经逐行定位均**不构成残留文档漂移**、不判 FAIL、不登记 CONCERNS；**统计口径请主理人确认（不替主理人拍板）**。历史快照 6 行 `entry_pending_confirmation` 未改动、未掩盖。

### 验证 3 · C5 架构决策一致性 — **PASS**

命令：Python 解析 `xz-unified-architecture.md` / `phase4-engineering-route.md` 结构、锚点计数、BOM；Grep `未验证` 定位。

输出：
```
[3a] xz-unified-architecture.md  size=39204 B | 行数=482 | BOM=False
[3b] 二级章节 §0..§13 共 14 个（§9 ADR :312、§12 风险 :447、§13 审查 :467）
[3c] ADR 标题连续：:314 ADR-001 / :328 ADR-002 / :342 ADR-003 / :361 ADR-004 / :371 ADR-005
[3d] 风险表 R1~R13 行号 451..463；R9=已修复(C1)、R11/R12=已修复(B1续)
[3e] 'ADR-005'=1 | 'R13'=1 | 'D3 代码整改'=2 | 'BLOCKED（非 FAIL）'=2
     'IS_PASS: YES'=1 | '9 个顶层字段'=1 | '已修复（C1）'=1
     '未修 · 后续 P1'=0 | '10 个顶层字段'=0
[3f] :478「D3 代码整改 ↔ 可构建性 → **BLOCKED（非 FAIL）**：无 .csproj/App.xaml、exe 为 HTA，编译验证仅 stub 级」
     :392-393 ADR-005「Phase 4 真机 E2E 保持 BLOCKED（非 FAIL）；所有 C# 结论仍限定为 stub 级」
[3g] phase4-engineering-route.md size=13336 B | 行数=193 | BOM=False | §0~§7 共 8 个二级标题
     '未验证' 字符串出现 15 次 = 4 次叙述性文字(:11/:109/:170/:172) + 11 项表格条目(:177-187，编号 1~11)
     'IS_PASS: YES' = False（新文档未误写 PASS）
```

**核对结论**：
- R1~R8、R10 原文未变；R9 由「未修 · 后续 P1」改为「**已修复（C1）**」（`:459`），与 C1 事实一致；R11/R12 仍「已修复（B1 续）」；R13 新增（`:463`）。
- §13 新增 `:478` 行明确记为 **BLOCKED（非 FAIL）**，**未误写 PASS**；既有 `IS_PASS: YES`（`:482`）保留。§13 C1 行已由「10 个顶层字段」改为「**9 个顶层字段**」（`:474`）。
- ADR 编号 ADR-001~005 连续；新增 ADR-005（`:371-394`）明确「HTA = 既有运行形态（事实），WPF + WebView2 = 目标形态（未完成）」、三项参数待用户拍板、不替用户决定。
- `phase4-engineering-route.md` §0~§7 齐全、193 行、UTF-8 无 BOM；「11 项未验证」计数**正确**（15 次字符串 = 4 次叙述 + 11 个清单条目，非矛盾）。
- 新文档未写 `IS_PASS: YES`，避免把 BLOCKED 伪装成通过。

### 验证 4 · C3 BLOCKED 证据独立复核 — **PASS（BLOCKED 非 FAIL）**

命令：Python 只读枚举构建文件 / xaml / exe 头字节；`dotnet build` 独立复核。

输出：
```
[4a] *.sln=0  *.slnx=0  *.csproj=0  *.vcxproj=0  *.props=0  *.targets=0
[4b] App.xaml* = []（无 App.xaml / App.xaml.cs）
[4c] *.xaml 全量 = ['MainWindow.xaml']
[4d] exe size=5584 | head2=b'<!' | is_MZ_PE=False
     head120 = b'<!DOCTYPE html>\r\n<html>\r\n<head>\r\n    <title>XsureZrcnmve</title>\r\n    <HTA:APPLICATION \r\n        ID="oHTA"\r\n        APPL'
     DOCTYPE=True | HTA:APPLICATION=True
[4e] 文件=46 目录=28（pathlib.rglob 不含根；开工前 find 计数 46/29 含根，等价，无增删）
[4f] dotnet build → MSBUILD : error MSB1003: 请指定项目或解决方案文件。当前工作目录中未包含项目或解决方案文件。
     exit=1
```

**判定**：C3 结论独立复现 —— 无构建外壳、无 `App.xaml`、`.exe` 非 PE 而是 HTML/HTA 文本，`dotnet build` 在 MSBuild 评估期即 `MSB1003` 退出 1（未进包解析）。**未发现任何成员偷建 `.csproj` / `App.xaml` / `App.xaml.cs`**（全树 0 命中）。`dotnet build` 未生成任何文件（写报告前全树 diff = 0 佐证）。判 **BLOCKED（非 FAIL）**，与 ADR-005 / R13 / `:478` 登记一致。

### 验证 5 · 禁改区核查 — **PASS**

方法：开工前基线快照 `/tmp/xz-c4-before.txt`（46 文件，`%T@ %s %p`），报告落盘前 `diff`。

```
[5a] diff /tmp/xz-c4-before.txt /tmp/xz-c4-mid.txt → exit=0（零差异）
```

关键禁改对象（基线 mtime / size，均早于本轮 C1~C5 写入窗口 18:21+）：

| 对象 | mtime | size | 判定 |
| --- | --- | --- | --- |
| **`docs/architecture/quality-gate-lean.md`** | **18:15:37** | **29146 B** | **一字节未改**；md5 开工 `f9f772e8f616ba03dfa0eab582a6a8b9` = 复核时一致 |
| `docs/architecture/vzc-data-model.md` | 17:47:02 | 32188 B | 未改 |
| `docs/architecture/reusable-ui-layer.md` | 17:42:33 | 37541 B | 未改 |
| `data/config.ini`（manifest 之外的配置） | 17:42:55 | 1010 B | 未改 |
| `MainWindow.xaml` / `MainWindow.xaml.cs` | 11-03 03:14 / 11-05 17:15 | 544 / 3071 B | 未改 |
| **`E:\XIEMI\xiemi\BA-Pointer\` 全部 24 文件** | 11-05 02:48–03:31 | — | `find -newermt "2026-11-05 18:15"` = **0 命中**，全程只读 |
| `Core_Dimension/xiemosheng.vrm` / `xieming_geo.glb` | 11-05 16:56 / 11-02 23:50 | 27683888 / 247328 B | 未改 |
| `Core_Dimension/vendor/*`（4 个） | 11-05 16:34–16:35 | — | 未改 |
| `XsureZrcnmve.exe` / `xzc.ico` | 11-03 03:06 / 02:39 | 5584 / 173909 B | 未改 |
| `.vs/*`、`Archive_XM/story.json`、`Heresy_VZC/test.vzc` | 11-02 / 11-03 | — | 未改 |

**判定**：C1~C5 只改动了获准对象（scan_vzcs.py / vzcs/index.json / manifest.json / xz-unified-architecture.md / 规划页 / 新增 phase4 md），禁改区零越界；本轮 C4 验证自身亦零写入（diff=0）。

> 方法局限：无「修改前基线哈希」，结论基于 epoch 秒级 mtime + size + 全树集合 diff 三重证据；未做密码学意义的未改证明。

### 验证 6 · 规划页结构 — **PASS**

命令：字节检查 + `HTMLParser` 标签栈 + 外部资源扫描 + 内联脚本落 `%TEMP%` 后 `node --check`。

```
[6a] size=28922 B | BOM=False | 含CR=False | 纯LF=True
[6b] 未闭合栈=[] | 错配=[] | 外部资源=[]
     src/href 全量=[('href','#arch'),('#formats'),('#roles'),('#roadmap'),('#risks')]  ← 5 个 # 锚点
     内联 script 段数=1
[6c] title=XZ 项目架构与任务分工规划
     ONLINE badge=True | 尚未发布=False | 本地预览态计数=3（正文产品术语，见验证 2）
[6d] node --check s0.js → 语法 PASS
```

**判定**：纯静态、零外部依赖、UTF-8 无 BOM、纯 LF、标签闭合、内联脚本语法通过；title / badge / footer 三处预览态声明已去除（footer 内容见验证 7）。

### 验证 7 · 线上一致性 — **PASS（双通道取证）**

| 通道 | 命令 | 结果 |
| --- | --- | --- |
| WebFetch | `WebFetch("https://xz-architecture-plan.app.workbuddy.host/?sharecode=QSRKSWK77B")` | 取到完整正文：`<title>` = XZ 项目架构与任务分工规划；五种格式 5 行清单、导入流向、六角色、Phase 3、R1~R6 与本地一致；**无「尚未发布」**。HTML→markdown 转换**未包含 topbar badge / footer** |
| curl 补齐 | `curl -sS -L --compressed --max-time 25 <URL> -o $TMPF` | 取到 **28922 B** HTML 源码；`ONLINE // XSUREZRCNMVE 3.0` badge = True；`尚未发布` = False；`本地预览态` = 3；`entry_pending_confirmation` = False；footer = 「XIEMINZCIME // XSUREZRCNMVE · 2017 · 3.0 正式版 / 让冥想，奔向现实，书写我们的现实物语。 / 单文件静态站，无外部依赖，可直接由浏览器或静态服务打开。」（无预览态声明） |
| 字节比对 | `md5sum` + `cmp -s` | 线上 `34aa8f6eb95bb4bfadcb35f7f84c8725` = 本地 `34aa8f6eb95bb4bfadcb35f7f84c8725`；**[cmp] 线上与本地字节完全一致** |

**判定**：WebFetch 的渲染限制（未含 badge/footer）已由 curl 直取源码**完全补齐**，不存在未决的方法局限；线上与本地 28922 B 版本**字节级一致**，title / `ONLINE` badge / footer 三项均核对通过，无「尚未发布」。临时下载文件用 `os.remove` 清理。

### 验证 8 · 已知非阻断差异独立评估（URL 编码） — **PASS（附独立结论）**

**实证**（PowerShell + Python）：
```
.NET  System.Uri.EscapeDataString :
  "main.mixz"       -> main.mixz
  "sub/a.mixz"      -> sub%2Fa.mixz
  "dir/sub/a.mixz"  -> dir%2Fsub%2Fa.mixz
Python urllib.parse.quote (默认 safe='/'):
  "main.mixz"       -> main.mixz
  "sub/a.mixz"      -> sub/a.mixz
  "dir/sub/a.mixz"  -> dir/sub/a.mixz
Python quote(safe='') → sub%2Fa.mixz（与 .NET 一致）
```
代码位置：`VzcHost.cs:293` `mod.EntryUrl = baseUrl + "/" + Uri.EscapeDataString(mod.Entry.Replace('\\','/'))`；`scan_vzcs.py:195` `quote(entry.replace("\\","/"))`。`baseUrl` 两侧分别用 `EscapeDataString` / `quote` 编码 `name`、`version`，但目录名/版本名不含 `/`，无差异；`webEntryUrl` 两侧均不做转义，一致。

**独立结论（不替主理人拍板）**：
1. **是否构成 R9 意义上的「残留不一致」：否。** R9 的定义是「离线扫描器未识别 `.vzc` → 注册表字段集（`hasVzc`/`vzc`/`vzcCompatibility`）与状态逻辑不一致」。验证 1 已实证 22+9 字段集、相容判定、状态优先级、默认值、`extra` 全部逐项对齐；本差异属**URL 编码策略**范畴，不在 R9 定义内，且 C1 之前（B4 时）两侧就已如此，非本轮引入的回归。
2. **当前影响 = 0。** `vzcs/index.json` 为空注册表（`mods: []`），两条链路均无实际 Mod 与 `entryUrl` 消费者；现有约定下 `manifest.entry` 通常为单个文件名（`main.mixz`），此时两侧输出一致（实测）。
3. **潜在风险**：若未来 `manifest.entry` 声明子目录路径（如 `bin/main.mixz`），宿主模式产出 `.../bin%2Fmain.mixz`、离线模式产出 `.../bin/main.mixz`，前端按 URL 取资源时可能解析不一致甚至 404（取决于 WebView2 虚拟站点对 `%2F` 的处理）。
4. **是否需要对齐：建议后续统一，但不阻断本轮。** 两个可选方向：(a) Python 侧改 `quote(entry, safe='')` 以匹配 .NET 全编码；(b) C# 侧改成分段编码、保留路径分隔符 `/` 以匹配 Python 与 URL 路径语义。**不替主理人拍板**，建议列入 Phase 4 backlog（建议级 / P2），与 `phase4-engineering-route.md` 的路线规格一并处置。
5. **判定**：**已知差异、当前空注册表无影响、建议后续统一** —— 不判 FAIL、不登记 CONCERNS、不影响 GATE 与通过率。

---

## 3. CONCERNS 清零论证

| 历史 CONCERNS / 待确认项 | 本轮处置 | 当前登记 |
| --- | --- | --- |
| **R9**（`scan_vzcs.py` 未识别 `.vzc`） | C1 修复；验证 1 运行实证 22+9 字段集/相容/状态/默认值/`extra` 全对齐；`xz-unified-architecture.md:459` 改「已修复（C1）」；`未修 · 后续 P1` 全库 0 命中 | **已清零** |
| 入口 `entry_pending_confirmation=true`（待用户确认） | C2/C2续 由主理人确认并固化；manifest 9 字段、notes 明示固化；文档 6 处同步、`:474` 改「9 个顶层字段」 | **已闭环，非 CONCERNS** |
| 文档漂移（B4 派发时的时序问题） | 本轮无新漂移：全库旧表述仅存于**明确豁免**的历史快照；其它文件 0 | **无** |
| C3 真机 E2E BLOCKED | ADR-005 / R13 / `:478` 显式登记为 **BLOCKED（非 FAIL）**；Phase 4 路线文档 11 项「未验证」留痕 | **非 FAIL、非 CONCERNS**（既有工程限制，见 §7） |
| 验证 8 URL 编码差异 | 已知差异、当前影响 0、建议后续统一 | **不登记** |

**CONCERNS 登记 = 0 项。**

---

## 4. 智能路由判定 — **NoOne**

| 触发条件 | 实测 | 判定 |
| --- | --- | --- |
| 源码/配置有 Bug → `Engineer`（文件:行号 + 错误 + 复现） | 未发现：R9 修复运行实证通过；入口/C5/规划页/线上一致性通过；`dotnet build` 的 `MSB1003` 是**工程缺构建外壳的既有事实**，已由 ADR-005 登记为 BLOCKED，非本轮回归缺陷 | 不触发 |
| 仅验证脚本自身问题 → `QA` | 本轮无脚本失败；`py_compile` 用 `PYTHONPYCACHEPREFIX` 规避工程内残留、临时样本用 `shutil.rmtree` 清理，均一次通过 | 不触发 |
| 全部通过 → `NoOne` | 8 类 / 41 项全通过，CONCERNS 0，阻塞项 0 | **NoOne** |

**无需回传工程师的阻塞项。**

---

## 5. 总体判定 / 通过率 / 阻塞项

- **GATE：`PASS`**
- **通过率：41 / 41 = 100%** — 检查项分布：验证 1（R9）11 项、验证 2（入口）7 项、验证 3（C5）5 项、验证 4（C3）5 项、验证 5（禁改）4 项、验证 6（规划页）3 项、验证 7（线上）3 项、验证 8（差异评估）3 项 = 41，全部通过。
- **CONCERNS 登记：0 项（R9 已清零）**
- **阻塞项：无**
- **发布**：规划页已由主理人首次发布，本轮 C4 **未执行任何发布动作**；线上与本地字节级一致。

```
IS_PASS: YES
GATE: PASS
ROUTE: NoOne
PASS_RATE: 41/41 (100%)
CONCERNS: 0 (R9 cleared)
BLOCKERS: none
```

---

## 6. 已知限制与方法局限（不隐瞒）

1. **真机 E2E 未覆盖（BLOCKED，非 FAIL）**：工程无 `.sln/.csproj/App.xaml`，`XsureZrcnmve.exe` 为 HTA 文本，`dotnet build` = MSB1003。此前所有 C# 编译/功能验证均为**临时 stub 工程级**（只桩 `CoreWebView2` 两个方法与一个枚举，仅够编译 `VzcHost.cs`），**本工程源码从未真实构建运行**。`phase4-engineering-route.md §7` 列出 11 项运行时面「未验证」（真实 exe 编译运行、`EnsureCoreWebView2Async`、`core.local` 映射、`NavigationCompleted→PostRegistry`、`WebMessageReceived`、VZC 注册表推送、3D 渲染、无未处理异常、WebView2 NuGet 还原、GUI 启动等）。这些不改变 GATE，但必须在 Phase 4 补工程骨架后重新验证。
2. **禁改核查方法局限**：无修改前基线哈希，依据 epoch mtime + size + 全树集合 diff 三重证据。
3. **验证 2 统计口径**：派发「其他文件必须 0」在「XZ 工程内」范围完全满足；「全库含规划页」宽口径下 2 处字面偏差已逐行定位并说明性质，**请主理人确认口径**（不替主理人拍板）。
4. **验证 8 编码差异**：见 §2 验证 8 独立结论，建议后续统一，不阻断本轮。
5. **线上取证**：WebFetch 的 HTML→markdown 转换未含 topbar/footer，已用 curl 直取源码 + md5/cmp 字节比对补齐，无未决局限。

---

## 7. 硬约束遵守与副作用核查

- **仅新建本报告一个文件**：`docs/architecture/quality-gate-c4-reverification.md`；`docs/architecture/` 由 5 个 md 变为 6 个 md。
- **历史快照一字节未改**：`quality-gate-lean.md` 29146 B / 18:15:37 / md5 `f9f772e8f616ba03dfa0eab582a6a8b9`，开工与复核两次一致。
- **零越界写入**：开工前全树快照 46 文件，报告落盘前 `diff` = 0；`dotnet build`、`py_compile`、临时样本运行、curl 下载均未在工程内留下任何文件（`__pycache__`/`*.pyc` = 0，临时根/临时文件已清理）。
- 未改任何源码 / 配置 / 其它 md / 规划页 / 模型 / BA-Pointer；未删除、未 commit、未新建工程文件、未联网还原、未发布；未联系其他成员。
- 临时产物全部在系统临时目录，清理使用 Python `shutil.rmtree(..., ignore_errors=True)` / `os.remove`，**未使用 `rm -rf`**。

---

> 报告完 · 严守真（quality-lead）· 独立验证，按当前最终磁盘状态出具，不采信自报、不橡皮图章、不篡改历史结论
