# XsureZrcnmve

> 邪冥 · XIEMINZCIME 的个人作品引擎 / XZ 游戏引擎
> 主仓库：https://github.com/XIEMINZCIME/XsureZrcnmve

---

## 当前发行版本：V1.168

本仓库同时承载两部分内容：

1. **HTA 单文件引擎**（`XsureZrcnmve.hta`）—— 可直接运行的 Windows 桌面作品程序。
2. **Visual Studio 工程源码**（`XM-Pointer/`，即 `xm-Pointer.sln`）—— 用于构建配套的 `XsureZrcnmve.exe` 启动器 / 覆盖层。

---

## 一、V1.164 – V1.168 更新历史

### V1.168（本版）
- **全屏 ↔ 无边框全屏 双模式**：设置终端新增「显示模式」三选一（窗口 / 全屏 / 无边框全屏），F4 按当前模式开关；无边框模式把窗口外框偏移到屏幕外、客户区铺满，边框与标题栏不可见，不动 HTA 静态 `BORDER`/`CAPTION`。
- **Project Archive 全面更新**：`capture` / `restore` 可挂接钩子（等主界面代码覆盖）、覆盖指定槽位、`Delete`(46) 删除、容量上限 12（满时可见提示不静默丢弃）、完整时间戳；面板外观对齐黑白等宽终端风格。
- **Project Archive 预告区块**：存档列表新增「新手地图 / NOVICE MAP」即将推出预告（引用 `novice-map.jpg` 预告图）；后续主界面代码可经 `XZArchive.renderMaps(html)` 把预告区块替换为真实地图列表（非侵入扩展点）。
- 修复退出全屏的边界缺陷：自校准被拒时用保存尺寸精确还原，避免窗口尺寸错乱。
- 版本号统一升 V1.168。

### V1.167
- **F3 改派**：在主界面（moxin）闪现「作者模型」预览浮层（作者形象图 `xieminzcime.jpg`），约 4 秒后自动隐藏。
  - 原「F3 查看所有存档」改为经主菜单「列表 → Project Archive」进入（XZArchive 不再拦截 `114` 键码）。
- **右下角 xzc 徽标**：固定定位在窗口右下角，点击经 `Shell.Application` 外部拉起默认浏览器，跳转至刚上传的 GitHub 个人主页：
  `https://github.com/XIEMINZCIME/XsureZrcnmve`
- **`.exe` 来源说明**：`XsureZrcnmve.exe` 由 XM-Pointer 的 Visual Studio 工程构建（可用 VS 打开 `xm-Pointer.sln` 重新编译）。
- 版本号统一升 V1.167。

### V1.166
- **XZArchive 存档系统内联**进 `XsureZrcnmve.hta` 单文件（去掉外部 `<script src>` 依赖，便于单文件分发）；`xz-archive.js` 保留为开发备份副本。
- **设置终端状态持久化**：用 `FileSystemObject` 在 HTA 同目录写入 `XsureSettings.dat`（JSON），重启后自动恢复主题 / 安全模式 / 全屏 / 噪点 / 更新横幅等开关。
- 已推送至 GitHub 仓库，保留远程 LICENSE / README。

### V1.165
- 新增主菜单「列表」导航页（控制终端风格），聚合 PROJECT ARCHIVE / SETTINGS / FULLSCREEN / RETURN TO REALITY。
- 设置终端与 XZArchive 存档列表统一为黑白等宽「终端列表」观感。

### V1.164
- 主界面 Settings 开放为全局设置终端（XM-Pointer 风格 UI），黑白灰阶为主。
- 视觉安全模式：开启后关闭 CRT 闪烁 / 扫描线抖动 / 信号丢行，面向光敏性用户。
- 设置导航：←/→ 选择、Z 确认、X 关闭。

---

## 二、运行方式

### 方式 A：双击 HTA（推荐）
直接双击 `XsureZrcnmve.hta`。该文件已内联全部脚本，仅需同目录附带以下图片资源即可完整显示：
`xz.jpg`、`ga.jpg`、`xieminzcime.jpg`、`qidoy.jpg`、`xzc.ico`。

### 方式 B：启动器
运行 `XsureZrcnmve.launcher.cmd`，它会以 `mshta.exe` 拉起 HTA。

### 方式 C：EXE 启动器（XM-Pointer 构建）
`XsureZrcnmve.exe` 为预构建的 Windows 桌面启动器（Web 视图外壳）。
> 注：本仓库不随附编译工具链；`*.exe` 已被 `.gitignore` 排除，仅作为发行包本地产物分发。

---

## 三、操作说明

| 按键 / 元素 | 功能 |
|---|---|
| **F3** | 主界面闪现作者模型预览（约 4 秒自动隐藏） |
| **右下角 `xzc` 徽标** | 点击外部浏览器跳转 GitHub 个人主页 |
| **F4** | 全屏 / 无边框全屏 切换（按设置终端「显示模式」所选模式） |
| **← / →**（或 ↑/↓） | 设置 / 列表项左右选择 |
| **Z** | 确认 / 进入 |
| **X** | 关闭浮层 |
| **Esc** | 预留（暂未绑定） |
| **F5** | 无功能 |
| 列表 → Project Archive | 查看 / 读取存档（原 F3 存档列表入口） |

### 设置持久化
主题、视觉安全模式、全屏、噪点、更新横幅等开关会通过 `XsureSettings.dat` 自动落盘，重启后恢复。

---

## 四、发行包文件清单（XsureZrcnmve-V1.168-release.zip）

| 文件 | 说明 |
|---|---|
| `XsureZrcnmve.hta` | V1.168 单文件引擎（主程序） |
| `XsureZrcnmve.exe` | 预构建 Windows 启动器（XM-Pointer VS 工程产物） |
| `xiemi-pc.exe` | PC 版连冥游戏启动器（WebView2 外壳，双击即玩） |
| `xiemi-pc/` | PC 游戏本体（五视图页面 + 3D 场景逻辑） |
| `XsureZrcnmve.launcher.cmd` | 一键拉起 HTA 的启动器 |
| `manifest.json` | 引擎清单（入口 / 版本 / 运行时声明） |
| `xzc.ico` | HTA 窗口图标 |
| `xz.jpg` / `ga.jpg` / `xieminzcime.jpg` / `qidoy.jpg` | HTA 引用的图片资源 |
| `novice-map.jpg` | Project Archive「新手地图 / NOVICE MAP」预告图 |
| `xz.txt` | 逐版本更新日志（V1.164 – V1.168） |
| `README.md` | 本说明 |

> 运行 HTA 时，上述图片与 `xzc.ico` 必须与 `.hta` 处于同一目录。

---

## 五、从源码构建 `.exe`（Visual Studio）

1. 用 **Visual Studio 2022（含 .NET 桌面开发 / C++ 桌面开发负载）** 打开：
   `XM-Pointer/xm-Pointer.sln`
2. 解决方案包含两个工程：
   - `xmPointer.Overlay.vcxproj`（C++ 覆盖层）
   - `xmPointer.Settings.csproj`（C# 设置外壳）
3. 选择 **Release / x64**（或目标平台），生成解决方案。
4. 产物 `XsureZrcnmve.exe` 输出到对应 `bin/` 目录，可拷回仓库根目录与 HTA 一同分发。

> 当前发行包内附的 `XsureZrcnmve.exe` 即以此工程预构建（Nov 5 构建版本）。

---

## 六、PC 连冥游戏（xiemi-pc.exe）

与 Android APK 对应的 **Windows PC 版连冥游戏**：WebView2 外壳 + 本地网页，双击 `xiemi-pc.exe` 即可运行，无需安装。

### 文件布局
- `xiemi-pc.exe` — 自包含启动器（内含 .NET 运行时 + WebView2 绑定，单文件可分发）
- `xiemi-pc/index.html` `xiemi-pc/app.js` `xiemi-pc/viewer.js` — 游戏本体（五视图：启动页 / 连冥认证 / 主界面 / 大厅 / 场景）
- `Core_Dimension/` — 复用引擎已有的 three.js / three-vrm 与邪冥模型（`xiemosheng.vrm` 精确版、`xieming_geo.glb` 几何版）

> 启动器会把虚拟主机 `xiemi.pc.local` 映射到 `XsureZrcnmve` 根目录，因此无需复制 27MB 的 VRM 模型，运行时会按需读取 `Core_Dimension/`。

### 与 APK 的关系
- 共用同一套「连冥」账号契约：默认 `https://api.nzcime.eu.cc/api`，接口 `/login`、`/register`、`/posts`，返回 `{code:200, data:{username,role,token}}`。
- 认证页提供「演示模式」开关：后端不可达时本地 mock 登录，可离线体验完整流程（与 APK 的 `?a=` 协议 / 社区 API 双兼容逻辑一致）。
- 五个视图与 APK 的启动页、连冥认证、主界面、大厅、场景一一对应；场景视图内嵌 3D 邪冥模型（含 SpringBone，实测 7 条链、360K 顶点）。

### 运行
直接双击 `xiemi-pc.exe`（需本机已装 WebView2 运行库，Win10/11 通常自带）。若提示未找到 `xiemi-pc` 目录，请将 exe 放在含 `xiemi-pc/` 与 `Core_Dimension/` 的 `XsureZrcnmve` 根目录或其子目录内。

### 重新构建启动器（可选）
```bash
cd xiemi-pc-launcher
dotnet publish -c Release
# 产物：bin/Release/net10.0-windows/win-x64/publish/xiemi-pc.exe
# 复制到 XsureZrcnmve 根目录即可
```

## 七、许可

本仓库以 **BSL-1.0（Boost Software License 1.0）** 发行。详见 `LICENSE`。
