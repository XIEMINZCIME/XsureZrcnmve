# VZC 内容数据模型规范 · XsureZrcnmve 3.0

> **文档状态**：草案 / 本地规范（基于唯一真实 `mod.vzc` 实例归纳）
> **适用范围**：XsureZrcnmve 3.0 正式版 · VZC 创作扩展（NepInRx 13 / ZC・X#・.NET 13）
> **依据**：用户提供真实实例「那尔克的复仇」`mod.vzc`（逐字为准）+ 3.0 正式版更新公告要点
> **归属**：XIEMINZCIME 组织 / xiemi 工作室（2017）·《邪冥的日常》二创引擎
> **编制**：文策渊 design-strategist（B2）

---

## 0. 阅读约定与知识诚实声明

- 本规范**以上方 `mod.vzc` 实例为逐字依据**；实例中未出现的字段一律不新增。
- 实例**未附带**官方 JSON Schema / 字段字典。因此：
  - 「必填」列 = **按实例必现性推断**：`✔` 实例必现（推断必填）、`△` 条件必现（仅特定节点类型/资源类型出现）、`—` 实例未出现。均**非官方事实**。
  - 「校验规则」列 = **由实例值形态归纳的建议校验**，用于一致性检查，**非官方定义**。
  - 凡由单实例或公告**推导**的语义，均显式标注「推导」；无资料处一律标注「**规范未定义，不作臆测**」。
- **顶层口径说明**：实例顶层共 **10 个键** = 6 个标量元数据字段 + 4 个对象块（`loader` / `integration` / `content` / `save`）。任务书描述的「顶层元数据 7 个字段」与实例逐字不符；本规范按实例列 **6 个标量元数据字段**，未臆造补齐第 7 个。四大块各见 §2.1–§2.4。
- 全文表格中每个「实例值」均可在上方 `mod.vzc` 中找到；§3.4 另列实例内可验证的引用关系。

---

## 1. 顶层元数据 schema（6 字段）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `vzc_version` | string | ✔ | `"1.0"` | VZC **数据格式**版本，区别于 `version` 的模组版本 | 非空字符串；形如 `主.次` |
| `mod_id` | string | ✔ | `"vzc_001_xiemi"` | 模组唯一标识；作为命名空间根（**推导**，见 §8） | 非空；应等于 `save.fingerprint` 的 `@` 前缀 |
| `mod_name` | string | ✔ | `"那尔克的复仇"` | 展示用名称 | 非空字符串 |
| `author` | string | ✔ | `"xiemi"` | 作者标识 | 非空字符串 |
| `version` | string | ✔ | `"1.0.0"` | 模组自身版本；参与 `fingerprint` 与 `migration` | 形如 `x.y.z` 语义化版本 |
| `kind` | string | ✔ | `"story_sidequest"` | 模组类别（本实例为支线剧情） | 非空字符串；其它取值**规范未定义** |

> 顶层另有 4 个对象块键 `loader` / `integration` / `content` / `save`，分别见 §2.1–§2.4。

---

## 2. 四大块 schema 表

### 2.1 `loader`（10 条唯一路径）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `loader` | object | ✔ | `{…}` | 运行时与沙箱声明块 | 对象，含下列字段 |
| `loader.runtime` | string | ✔ | `"NepInRx-13"` | 运行时标识；公告为 NepInRx 13（ZC・X#・.NET 13） | 非空字符串；与公告运行时一致 |
| `loader.engine_version` | string | ✔ | `">=3.0.0 <4.0.0"` | 兼容引擎版本区间 | 版本范围表达式；当前 3.0 落区间内 |
| `loader.entry` | string | ✔ | `"self"` | 入口声明 | 非空字符串；具体取值语义**规范未定义** |
| `loader.capabilities` | array[string] | ✔ | `["story.hook", "xto.provider", "assets.read", "bgm.favorite.hook"]` | 能力声明（4 项，映射见 §6） | 字符串数组；元素语义按命名推导 |
| `loader.hooks` | array[string] | ✔ | `["on_load", "on_story_node", "on_xto_select", "on_save", "on_load_save"]` | 生命周期钩子（5 项，时机见 §6） | 字符串数组 |
| `loader.sandbox` | object | ✔ | `{…}` | 沙箱资源上限 | 对象 |
| `loader.sandbox.timeout_ms` | number(int) | ✔ | `3000` | 单次执行超时（毫秒） | 正整数 |
| `loader.sandbox.memory_mb` | number(int) | ✔ | `128` | 内存上限（MB） | 正整数 |
| `loader.sandbox.allow_network` | boolean | ✔ | `false` | 是否允许网络访问（实例为离线） | 布尔值 |

### 2.2 `integration`（10 条唯一路径）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `integration` | object | ✔ | `{…}` | 挂载与冲突声明块 | 对象 |
| `integration.attach_to` | string | ✔ | `"main_story"` | 挂载目标：主线剧情 | 非空字符串；其它取值**规范未定义** |
| `integration.trigger` | object | ✔ | `{…}` | 触发条件 | 对象 |
| `integration.trigger.type` | string | ✔ | `"story_node"` | 触发类型：剧情节点 | 非空字符串；其它取值**规范未定义** |
| `integration.trigger.node_id` | string | ✔ | `"chapter_02_after_battle"` | 主线挂载点节点 id。**该 id 不在本模组 `nodes` 内，属外部主线节点** | 非空字符串；应引用主线节点 |
| `integration.priority` | number(int) | ✔ | `100` | 同挂载点多模组排序优先级 | 整数；排序方向**规范未定义** |
| `integration.conflict_policy` | string | ✔ | `"namespace"` | 冲突处理策略：命名空间隔离（**推导**出 §8 命名空间约定） | 非空字符串 |
| `integration.dependencies` | array | ✔ | `[]` | 依赖模组列表（实例为空） | 数组；元素结构**规范未定义**（实例为空） |
| `integration.load_after` | array | ✔ | `[]` | 排序：在其后加载（实例为空） | 数组 |
| `integration.load_before` | array | ✔ | `[]` | 排序：在其前加载（实例为空） | 数组 |

### 2.3 `content`（47 条唯一路径，分 3.1–3.9 子表）

#### 3.1 顶层容器（5）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `content` | object | ✔ | `{…}` | 内容总块 | 对象 |
| `content.assets` | array[object] | ✔ | 5 项（`nark_blade_icon` / `nark_bgm` / `nark_sfx` / `nark_cdf` / `nark_model`） | 资源声明表 | 数组；元素见 3.2 |
| `content.items` | array[object] | ✔ | 1 项（`"那尔克残刃"`） | 物品表 | 数组；元素见 3.3 |
| `content.story` | object | ✔ | `{…}` | 剧情图 | 对象 |
| `content.recipes` | array[object] | ✔ | 1 项（产出 `"那尔克残刃"`） | 配方表 | 数组；元素见 3.9 |

#### 3.2 `content.assets[]`（6）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `content.assets[].id` | string | ✔ | `nark_blade_icon` / `nark_bgm` / `nark_sfx` / `nark_cdf` / `nark_model` | 资源唯一 id；被 `icon` / `bgm` / `sfx` / `cdf_effect` 引用 | 非空；同模组内唯一（**推导**） |
| `content.assets[].type` | string | ✔ | `image` / `bgm` / `sound` / `video_effect` / `model` | 资源类型（5 种，映射见 §5） | 枚举；实例仅出现这 5 值，全集**规范未定义** |
| `content.assets[].path` | string | ✔ | `assets/images/items/nark_blade.png`、`assets/bgm/nark_theme.ogg`、`assets/sound/swing.ogg`、`assets/video/nark_rage.mp4`、`assets/models/nark_bg.glb` | 相对资源路径 | 相对路径；落在 `assets` 对应子目录 |
| `content.assets[].favorite` | boolean | △ | `true`（**仅** `nark_bgm`） | 收藏态，对应 3.0「BGM 与音效的收藏」 | 布尔；条件字段，仅 `bgm` 项出现 |
| `content.assets[].cdf_panel` | boolean | △ | `true`（**仅** `nark_cdf`） | 是否进入 CDF 面板可选 | 布尔；条件字段，仅 `video_effect` 项出现 |
| `content.assets[].as_background` | boolean | △ | `true`（**仅** `nark_model`） | 是否作为背景，对应「模型作为背景」 | 布尔；条件字段，仅 `model` 项出现 |

#### 3.3 `content.items[]`（7）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `content.items[].item_name` | string | ✔ | `"那尔克残刃"` | 物品名；被 `grant.item` / `recipes.output` 引用 | 非空；同模组内唯一（**推导**） |
| `content.items[].desc` | string | ✔ | `"蕴含着极度愤怒的刀刃。"` | 描述文本 | 字符串 |
| `content.items[].price` | number(int) | ✔ | `3000` | 价格 | 非负整数（归纳） |
| `content.items[].currency` | string | ✔ | `"nk"` | 货币单位 | 非空字符串；取值集合**规范未定义** |
| `content.items[].attack_power` | number(int) | ✔ | `999` | 攻击力 | 数值（归纳） |
| `content.items[].icon` | string | ✔ | `"nark_blade_icon"` | 图标资源 id | 必须命中同模组 `assets[].id` |
| `content.items[].tags` | array[string] | ✔ | `["weapon", "boss_drop", "sidequest"]` | 标签（3 项） | 字符串数组 |

#### 3.4 `content.story` 容器与 `nodes[]` 通用字段（4）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `content.story.entry_node` | string | ✔ | `"nark_intro"` | 剧情入口节点 id | 必须命中 `nodes[].id` |
| `content.story.nodes` | array[object] | ✔ | 5 项 | 剧情节点表 | 数组 |
| `content.story.nodes[].id` | string | ✔ | `nark_intro` / `nark_choice` / `nark_accept` / `nark_refuse` / `nark_end` | 节点唯一 id | 非空；同模组内唯一（**推导**） |
| `content.story.nodes[].type` | string | ✔ | `dialogue` / `branch` / `reward` / `end` | 节点类型（4 种，语义见 §3） | 枚举；实例仅出现这 4 值，全集**规范未定义** |

#### 3.5 `content.story.nodes[]` 类型专有字段（12，含容器行）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `…nodes[].speaker` | string | △ dialogue | `"那尔克"`（`nark_intro`）、`"那尔克"`（`nark_refuse`） | 说话者 | 字符串；`end` 节点无此字段 |
| `…nodes[].text` | string | △ dialogue | `"你终于来了……这把残刃，等它的主人等了太久。"`、`"……也罢。愤怒终会找到它的容器。"` | 对白文本 | 字符串 |
| `…nodes[].bg` | string | △ | `"assets/images/bg/ruins_night.png"`（**仅** `nark_intro`） | 背景图路径 | 相对路径；条件字段 |
| `…nodes[].bgm` | string | △ | `"nark_bgm"`（**仅** `nark_intro`） | 背景音乐资源 id | 命中 `assets[].id`；条件字段 |
| `…nodes[].next` | string | △ | `"nark_choice"`（`nark_intro`）、`"nark_end"`（`nark_accept`）、`"nark_end"`（`nark_refuse`） | 节点级下一节点 id（跳转语义见 §3.2） | 命中 `nodes[].id`（**推导**） |
| `…nodes[].prompt` | string | △ branch | `"是否接过残刃？"` | 分支提示文本 | 字符串 |
| `…nodes[].options` | array[object] | △ branch | 2 项（`accept` / `refuse`） | 选项表 | 数组；元素见 3.6 |
| `…nodes[].xto` | object | △ branch | `{…}` | **XTO 自动选择配置（数据节点属性，见 §4）** | 对象；见 3.7 |
| `…nodes[].grant` | object | △ reward | `{"item": "那尔克残刃", "count": 1}` | 奖励发放 | 对象；见 3.8 |
| `…nodes[].sfx` | string | △ reward | `"nark_sfx"` | 音效资源 id | 命中 `assets[].id` |
| `…nodes[].cdf_effect` | string | △ reward | `"nark_cdf"` | CDF 视频特效资源 id | 命中 `assets[].id` |
| `…nodes[].return_to` | string | △ end | `"main_story"` | 结束后返回目标（主线） | 非空字符串；与 `attach_to` 呼应（**推导**） |

#### 3.6 `…nodes[].options[]`（4）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `…options[].id` | string | ✔ | `"accept"` / `"refuse"` | 选项 id；被 `xto.fallback` 引用 | 非空；同节点内唯一（**推导**） |
| `…options[].text` | string | ✔ | `"接过残刃"` / `"拒绝"` | 选项显示文本 | 字符串 |
| `…options[].next` | string | ✔ | `"nark_accept"` / `"nark_refuse"` | 选中后跳转节点 id | 命中 `nodes[].id` |
| `…options[].xto_weight` | number | ✔ | `0.8`（accept）/ `0.2`（refuse） | XTO `weighted` 策略权重（见 §4.3） | 数值；实例和为 `1.0` |

#### 3.7 `…nodes[].xto`（4）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `…xto.auto_select` | boolean | ✔ | `true` | 进入该 `branch` 节点是否启用自动选择 | 布尔；`false` 行为**规范未定义** |
| `…xto.strategy` | string | ✔ | `"weighted"` | 自动选择策略（见 §4.3） | 实例仅此值；其它取值**规范未定义** |
| `…xto.fallback` | string | ✔ | `"accept"` | 兜底选项 id | 应命中 `options[].id`（**推导**） |
| `…xto.wait_ms` | number(int) | ✔ | `1500` | 自动选择生效前等待毫秒（见 §4.4） | 正整数 |

#### 3.8 `…nodes[].grant`（2）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `…grant.item` | string | ✔ | `"那尔克残刃"` | 发放物品名 | 命中 `items[].item_name` |
| `…grant.count` | number(int) | ✔ | `1` | 发放数量 | 正整数 |

#### 3.9 `content.recipes[]`（3）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `content.recipes[].output` | string | ✔ | `"那尔克残刃"` | 产出物品名 | 命中 `items[].item_name` |
| `content.recipes[].materials` | array[string] | ✔ | `["铁锭", "怒魂"]` | 材料名列表（2 项） | 字符串数组 |
| `content.recipes[].unlock_after` | string | ✔ | `"nark_accept"` | 解锁前置节点 id | 命中 `nodes[].id` |

### 2.4 `save`（6 条唯一路径）

| 路径 | 类型 | 必填(推断) | 实例值 | 语义 | 校验规则(归纳建议) |
| --- | --- | --- | --- | --- | --- |
| `save` | object | ✔ | `{…}` | 存档契约块 | 对象 |
| `save.fingerprint` | string | ✔ | `"vzc_001_xiemi@1.0.0"` | 存档指纹，格式 `mod_id@version`（**归纳**，见 §7） | 与顶层 `mod_id`、`version` 一致 |
| `save.state_keys` | array[string] | ✔ | `["nark_choice", "nark_accept"]` | 需持久化的状态键，对应节点 id（见 §7） | 命中 `nodes[].id` |
| `save.migration` | object | ✔ | `{…}` | 存档升级声明 | 对象 |
| `save.migration.from` | string | ✔ | `"0.9.x"` | 来源旧版本 | 版本表达式 |
| `save.migration.handler` | string | ✔ | `"builtin:rename_keys"` | 升级处理器 | 非空字符串；具体行为**规范未定义** |

---

## 3. 节点类型语义表

### 3.1 四种节点类型字段对照

| 类型 | 实例节点 id | 节点专有字段（实例出现） | 跳转字段 | 语义 |
| --- | --- | --- | --- | --- |
| `dialogue` | `nark_intro`、`nark_refuse` | `speaker`、`text`、`bg`（仅 intro）、`bgm`（仅 intro） | `next` | 展示对白后沿 `next` 前进 |
| `branch` | `nark_choice` | `prompt`、`options[]`、`xto` | **无节点级 `next`**；由 `options[].next` 决定 | 呈现选项；`xto.auto_select: true` 时由 XTO 自动选定（§4） |
| `reward` | `nark_accept` | `grant`、`sfx`、`cdf_effect` | `next` | 发放奖励并播放音效/特效后沿 `next` 前进 |
| `end` | `nark_end` | `return_to` | `return_to` | 结束本模组剧情并返回主线 |

### 3.2 `next` 与 `return_to` 的跳转语义

- **`next`（模组内跳转）**：目标必须是本 `content.story.nodes[].id`。实例链路：
  - `nark_intro.next → nark_choice`
  - `options.accept.next → nark_accept`；`options.refuse.next → nark_refuse`
  - `nark_accept.next → nark_end`；`nark_refuse.next → nark_end`
- **`return_to`（跨边界返回）**：实例值 `"main_story"`，**不是** `nodes` 内的 id；与 `integration.attach_to: "main_story"` 呼应。**推导**：剧情从主线挂载点切入，结束后回到主线，不在模组内继续寻址。
- **`branch` 的特殊性**：`nark_choice` 无节点级 `next`，跳转完全由 `options[].next` 决定；XTO 的作用正是替代观测者从 `options` 中产出这一跳转（§4）。

### 3.3 `entry_node` 约定

- `content.story.entry_node = "nark_intro"`，必须命中 `nodes[].id`。
- **推导**：`integration.trigger`（`story_node` / `chapter_02_after_battle`）命中后，本模组剧情从 `entry_node` 起跑；它是 VZC 剧情子图的唯一入口。实例未提供多入口或其它入口约定，标注**规范未定义**。

### 3.4 实例内可验证的引用关系（全部取自实例）

| 引用方 | 被引用方 | 实例值 |
| --- | --- | --- |
| `items[].icon` | `assets[].id` | `"nark_blade_icon"` |
| `nodes[].bgm` | `assets[].id` | `"nark_bgm"` |
| `nodes[].sfx` | `assets[].id` | `"nark_sfx"` |
| `nodes[].cdf_effect` | `assets[].id` | `"nark_cdf"` |
| `reward.grant.item` | `items[].item_name` | `"那尔克残刃"` |
| `recipes[].output` | `items[].item_name` | `"那尔克残刃"` |
| `recipes[].unlock_after` | `nodes[].id` | `"nark_accept"` |
| `xto.fallback` | `options[].id` | `"accept"` |
| `save.state_keys` | `nodes[].id` | `"nark_choice"`、`"nark_accept"` |
| `nodes[].next` / `options[].next` | `nodes[].id` | 见 §3.2 |
| `story.entry_node` | `nodes[].id` | `"nark_intro"` |
| `save.fingerprint` | `mod_id` + `version` | `"vzc_001_xiemi@1.0.0"` |

> `nodes[].bg` 直接写图片路径 `"assets/images/bg/ruins_night.png"`，但未在 `assets[]` 中登记对应 id —— 此为实例事实，如实记录，不引申为规则。

---

## 4. XTO 章节（重点）

### 4.1 归属定性：XTO 是剧情数据节点属性，不是前端运行时逻辑

- 实例中 XTO 配置的唯一落点是 **`content.story.nodes[].xto`**，挂在 `type: branch` 的 `nark_choice` 节点内，与 `prompt`、`options[]` 并列。它是**剧情数据**的一个属性对象。
- 3.0 公告「分支选项支持 XTO」是**特性名**（流程：进入剧情选择 → 自动选择 → 剧情继续）；数据层由 `xto` 对象与 `options[].xto_weight` 共同声明运行时行为。
- `loader.capabilities` 中的 `xto.provider` **推导**为「VZC 侧提供 XTO 数据」，进一步支持「数据在内容、解释在运行时」的划分。
- **工程含义**：运行时应**读取并解释** `xto`（`auto_select` / `strategy` / `fallback` / `wait_ms` + `options[].xto_weight`），**不得**把自动选择策略硬编码为前端 UI 开关或写死默认项。若既有实现把 XTO 当作运行时逻辑而非数据节点属性，即为需整改的归属问题（呼应规划页风险 R2）。

### 4.2 字段执行契约

| 字段 | 实例值 | 执行契约 |
| --- | --- | --- |
| `xto.auto_select` | `true` | 进入该 `branch` 节点即启用 XTO 自动选择流程。`false` 时的交互行为**规范未定义，不作臆测**（实例仅 `true`）。 |
| `xto.strategy` | `"weighted"` | 依据 `options[].xto_weight` 做加权选择（§4.3）。`strategy` 全集与其它取值**规范未定义，不作臆测**。 |
| `xto.fallback` | `"accept"` | 兜底选项，值对应 `options[].id`（**推导**）。当加权选择未能产出有效选项时采用；实例未给出触发条件，标注**规范未定义**。 |
| `xto.wait_ms` | `1500` | 从「进入选择」到「自动选择生效」的等待毫秒数，是**纯叙事节拍**（§4.4）。 |
| `options[].xto_weight` | `0.8` / `0.2` | 加权策略的权重输入（§4.3）；`wait_ms` 不依赖权重值。 |

### 4.3 `strategy: weighted` 加权语义

- 实例权重：`accept = 0.8`、`refuse = 0.2`，`Σw = 1.0`。
- **归一化**（由 `weighted` 语义**推导**）：`p_i = w_i / Σw`。实例恰好 `Σw = 1`，故 `p_accept = 0.8`、`p_refuse = 0.2`。当 `Σw ≠ 1` 时按 `Σw` 归一化（**推导**，实例未覆盖）。
- **未给权重时的行为**：**规范未定义，不作臆测**。实例中每个 `option` 都显式给了 `xto_weight`，无法推断缺权重时是均权、跳过还是报错。
- `Σw = 0`、`fallback` 的具体触发条件、随机源/种子/可复现性：**规范未定义，不作臆测**。
- `fallback` 与加权结果的关系：实例值 `"accept"` 与高权重选项一致，但实例未说明 fallback 是「加权结果无效时」还是「超时时」兜底，标注**规范未定义**。

### 4.4 两条 3.0 优化如何体现在 `wait_ms` 上（关联推导）

> **声明**：以下为「3.0 公告两条优化 + `xto.wait_ms` 字段」的**关联推导**；公告与实例均未给出内部实现，**不作事实断言**。

- **「XTO 模式等待时间修正」（优化 04）**：在数据层的体现即 `xto.wait_ms` **显式声明**等待时长（`1500` ms）——等待时长成为剧情数据的一部分，而非运行时硬编码或受加载状态牵动。**推导结论**：运行时应以 `wait_ms` 为唯一计时依据。
- **「配音缺失不再计为资源缺失」（优化 03）**：`wait_ms` 应被理解为与资源/配音加载状态**无关**的固定叙事节拍；配音缺失不应阻塞、延长或取消自动选择。**推导结论**：旧实现若把等待与「资源/配音就绪」耦合，配音缺失被误判为资源缺失就会拖长或卡住等待，正是「等待时间修正」要整改的对象。
- **合并结论**：`wait_ms` 是纯粹的「展示选项 → 自动接续」节拍计时，**不因配音或资源缺失判定而改变**；`auto_select` 计时到期后按 `strategy` 产出选择并沿 `next` 继续。此结论待质量门验收（见规划页 R2 / R6）。

### 4.5 执行时序（由数据推导）

1. 剧情运行到 `type: branch` 节点 `nark_choice`，读取 `xto.auto_select`（`true`）。
2. 呈现 `prompt`（"是否接过残刃？"）与 `options[]`（2 项），启动 `xto.wait_ms`（`1500`）计时；按公告，观测者**无需**手动选择。
3. 计时结束，按 `xto.strategy: "weighted"` 用 `options[].xto_weight` 归一化后选定一个 `option`；异常/无有效结果时取 `xto.fallback`（`"accept"`，**推导**）。
4. 沿该 `option` 的 `next` 跳转（`nark_accept` 或 `nark_refuse`），剧情继续。
5. 选择发生阶段与 `loader.hooks` 中的 `on_xto_select` 同名，**推导**为该阶段触发；实例未给出钩子绑定关系，标注**规范未定义**。
6. 后续 `reward` / `end` 按 §3 语义执行，`end.return_to` 返回 `"main_story"`。

### 4.6 `strategy` 其它可能值

- 实例仅出现 `"weighted"`。`strategy` 的**全集、其它取值（如均权随机、按序、固定首项等）一律标注「规范未定义，不作臆测」**。
- 同理：`auto_select: false` 的行为、缺 `xto_weight` 的行为、`fallback` 触发条件，均**规范未定义，不作臆测**。

---

## 5. `assets` 类型与 3.0 功能映射

| `assets[].type` | 实例 id → path | `assets` 子目录 | 对应 3.0 功能 / 优化 | 附加字段 |
| --- | --- | --- | --- | --- |
| `image` | `nark_blade_icon` → `assets/images/items/nark_blade.png` | `assets/images/` | 物品图标 / 背景图；**推导**关联优化「无效 PNG 目录导入不再崩溃」 | — |
| `bgm` | `nark_bgm` → `assets/bgm/nark_theme.ogg` | `assets/bgm/` | 「BGM 与音效的收藏」（爱心按钮） | `favorite: true` |
| `sound` | `nark_sfx` → `assets/sound/swing.ogg` | `assets/sound/` | 「BGM 与音效的收藏」的音效侧；被 `reward.sfx` 引用 | — |
| `video_effect` | `nark_cdf` → `assets/video/nark_rage.mp4` | `assets/video/` | 「CDF... 面板 / 自定义视频特效」；被 `reward.cdf_effect` 引用 | `cdf_panel: true` |
| `model` | `nark_model` → `assets/models/nark_bg.glb` | `assets/models/` | 「支持模型作为背景，加载速度优化」 | `as_background: true` |

> 3.0 公告手动导入路径：`XZ根目录\vzcs\VZC名称\版本号\` 内放「主程序 `.mixz` + `manifest.json`」，基于 NepInRx 13（ZC・X#・.NET 13）；启动 XZ 即自动加载。此为导入管线背景，`.mixz` / `manifest.json` 内部结构见 §10 知识缺口。

---

## 6. `integration` 挂载语义

### 6.1 挂载链（推导）

`attach_to: "main_story"` + `trigger: {type: "story_node", node_id: "chapter_02_after_battle"}` → 主线运行到 `chapter_02_after_battle` 节点时触发 → 载入本模组 → 从 `content.story.entry_node`（`"nark_intro"`）进入剧情子图 → `end.return_to: "main_story"` 回到主线。

- `chapter_02_after_battle` **不在本模组 `nodes[]` 内**，属外部主线节点（实例事实）。
- `priority: 100`：多模组挂载同一节点时用于排序；**数值大小与先后方向规范未定义，不作臆测**。
- `conflict_policy: "namespace"`：按命名空间隔离处理冲突；由此**推导**出 §8 的命名空间约定。其它策略取值**规范未定义**。
- `dependencies` / `load_after` / `load_before` 实例均为 `[]`；元素结构**规范未定义**。

### 6.2 `loader.hooks` 五个生命周期钩子触发时机

| 钩子 | 触发时机（按命名与 capabilities **推导**） | 关联 |
| --- | --- | --- |
| `on_load` | VZC 载入引擎 / 激活时 | `loader.capabilities`: `story.hook` |
| `on_story_node` | 进入剧情节点（含挂载点 `chapter_02_after_battle`）时 | `story.hook`、`integration.trigger` |
| `on_xto_select` | XTO 自动选择发生时（§4.5 第 3–5 步） | `xto.provider` |
| `on_save` | 写存档时 | `save.fingerprint` / `state_keys` |
| `on_load_save` | 读档 / 载入存档时（含 `migration` 升级） | `save.migration` |

> 实例**仅给出钩子名称**，未给出绑定关系与精确时序；上表为按命名与 `capabilities` 的合理**推导**，规范未定义精确时序。

### 6.3 `capabilities` 映射（推导）

| capability | 推导对应 |
| --- | --- |
| `story.hook` | 主线剧情节点钩子（`on_load` / `on_story_node`） |
| `xto.provider` | 提供 XTO 数据、参与 `on_xto_select`（§4.1） |
| `assets.read` | 读取 `content.assets[]` 资源 |
| `bgm.favorite.hook` | 3.0「BGM 与音效的收藏」，`assets[].favorite` |

---

## 7. `save` 契约

### 7.1 `fingerprint` 格式（归纳）

- 实例值 `"vzc_001_xiemi@1.0.0"` = `mod_id`（`vzc_001_xiemi`） + `@` + `version`（`1.0.0`）。
- **归纳格式**：`<mod_id>@<version>`。**规范未定义**官方格式、是否含校验和；此处仅按单实例归纳，不作事实断言。

### 7.2 `state_keys` 与节点 id 的对应

| `state_keys` 项 | 对应节点 id | 节点类型 | 推导用途 |
| --- | --- | --- | --- |
| `"nark_choice"` | `nark_choice` | `branch` | 记录分支选择结果 |
| `"nark_accept"` | `nark_accept` | `reward` | 记录奖励是否已发放 / 配方解锁前置 |

- 两项均**命中 `nodes[].id`**；`state_keys` 以**节点 id** 作为状态键（实例事实）。
- 5 个 `nodes` 中仅这 2 个被列入，**选择规则规范未定义**（未说明为何 `nark_intro` / `nark_refuse` / `nark_end` 不入库），不作臆测。
- `recipes[].unlock_after: "nark_accept"` 与 `state_keys` 中的 `nark_accept` 同名，构成「节点完成 → 状态记录 → 配方解锁」的可验证链（**推导**）。

### 7.3 `migration.from / handler` 升级路径

- `migration.from: "0.9.x"` → 当前 `version: "1.0.0"`：**推导**升级路径为 `0.9.x → 1.0.0`。
- `migration.handler: "builtin:rename_keys"`：内置处理器标识；由命名**推导**为「旧存档键重命名」。**`builtin:rename_keys` 的具体行为、映射表、失败回退均规范未定义，无资料，不臆造**（见 §10）。
- 与 `on_load_save` 钩子呼应：读档时执行升级（**推导**）。

---

## 8. ID 与命名空间约定

### 8.1 命名规则（由单实例归纳，非官方规范）

| 对象 | 实例值 | 归纳形态 |
| --- | --- | --- |
| `mod_id` | `vzc_001_xiemi` | `vzc_<序号>_<作者>` |
| asset `id` | `nark_blade_icon` / `nark_bgm` / `nark_sfx` / `nark_cdf` / `nark_model` | `<作品前缀>_<类型/用途>`，统一 `nark_` 前缀 |
| node `id` | `nark_intro` / `nark_choice` / `nark_accept` / `nark_refuse` / `nark_end` | `<作品前缀>_<语义>`，统一 `nark_` 前缀 |
| option `id` | `accept` / `refuse` | 语义短词（无前缀） |

> 上述均为**单实例归纳**，不是强制命名规范；官方命名规则**规范未定义**。

### 8.2 命名空间隔离（**由 `conflict_policy: "namespace"` 推导，非事实**）

- 由 `integration.conflict_policy: "namespace"` **推导**：不同 VZC 模组的同名 asset id / node id 通过 `mod_id` 作为命名空间根隔离，避免与主线的 `chapter_02_after_battle` 等节点及其它模组冲突。
- 实例内所有引用（§3.4）均在**同一模组内闭合**（`items.icon → assets.id`、`grant.item → items.item_name`、`next → nodes.id` 等），与「命名空间内解析」的推导一致。
- **明确标注**：实例**未给出**命名空间的实现方式（前缀拼接、作用域表等）；以上为推导，不作事实断言。

---

## 9. 字段统计（自查口径）

口径：按**唯一字段路径**计（数组元素以 `[]` 去重，含对象容器行）；与 §1 / §2 各表行数一一对应。

| 区块 | 唯一字段路径数 |
| --- | --- |
| 顶层标量元数据（§1） | 6 |
| `loader`（§2.1） | 10 |
| `integration`（§2.2） | 10 |
| `content`（§2.3，3.1–3.9 合计） | 47 |
| `save`（§2.4） | 6 |
| **合计** | **79** |

其它计数（取自实例）：节点类型 **4 种**（dialogue / branch / reward / end）；`hooks` 5 项；`capabilities` 4 项；`assets` 5 项；`nodes` 5 个；`options` 2 个；`state_keys` 2 个；`recipes` 1 项；`items` 1 项。

---

## 10. 知识缺口（明确无资料，不臆造）

1. **`.mixz` 二进制格式**：3.0 公告仅给出「主程序 `.mixz`」名称与导入路径，未给格式、打包结构、与 `mod.vzc` 的关系。
2. **`manifest.json` 字段结构**：公告仅给出文件名，未给任何字段。
3. **NepInRx 13 执行细节**：`loader.runtime: "NepInRx-13"`、`entry: "self"` 的运行机制、ZC・X#・.NET 13 的 API 与生命周期绑定，均无资料。
4. **`strategy` 全集 / 其它取值**：实例仅 `"weighted"`；其它策略及 `auto_select: false`、缺 `xto_weight` 的行为一律规范未定义。
5. **`builtin:rename_keys` 具体行为**：迁移映射表、失败回退、触发条件均无资料。
6. **官方必填性与校验规则**：实例未附 Schema；本文「必填」「校验规则」两列均为归纳/推断，非官方定义。
7. **`priority` 排序方向、`hooks` / `capabilities` 与运行时的精确绑定及时序**：仅有名称，无绑定资料。
8. **`type` 枚举全集**：`nodes[].type`（4 值）、`assets[].type`（5 值）、`kind`、`currency`、`trigger.type`、`conflict_policy` 的实例值之外取值，均规范未定义。
9. **五种文件 / 容器格式职责（由主理人裁定统一，来自 B1 架构任务书；非 `mod.vzc` 实例内容）**：`.vzc` 声明式 JSON 内容定义（即本规范对象）、`.mixz` NepInRx 13 编译后的扩展主程序（放 `XZ根目录\vzcs\VZC名称\版本号\`）、`.xzs` 二创完整故事包（由 `imports/` 解包到 `stories/<作品名>/{manifest.json, story.xzc, assets/}`）、`.mo` VZC 扩展 / 数据块（由 `imports/` 生成 `vzcs/<扩展名>/<版本号>/`）、`story.xzc` 编译后的剧情逻辑文件（内含 XTO 自动选择节点）。`manifest.json` 不在五种之列，属「全局 / 扩展级 manifest / .vzc 内容定义」三层分离的另一条线。**仍属知识缺口**：`.mixz` 二进制格式、`.xzs` / `.mo` 容器内部结构、`story.xzc` 内部结构、NepInRx 13 执行细节一律**规范未定义，不作臆测**。以上格式定义来自架构任务书，**不进入 §1 / §2 的实例 schema 表**。

---

> 本规范为 B2 产出，供 A1/A2/A3/B1 工程契约与 A4/B4 lean 质量门引用；所有「推导」「归纳」「规范未定义」标注均需在质量门复核，不得据单实例推断写死运行时实现。
