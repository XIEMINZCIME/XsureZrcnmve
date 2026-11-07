# 邪冥 (Xie Ming) 模型交付说明

> 三阶段交付文档：A) VRChat 就绪精确版 VRM · B) 几何主角精修版 GLB · C) 本地查看器 + 渲染图。
> 生成时间：2026-11-03。所有文件位于 `E:\XIEMI\moxien\`。

---

## 1. 交付物清单

| 文件 | 类型 | 大小 | 用途 |
|---|---|---|---|
| `xieming_xie_vrc_final.vrm` | VRM 1.0 | ≈43.5 MB | **Phase A**：VRChat 精确版，含 12 根 SpringBone |
| `xieming_geo_v2.glb` | glTF/GLB | ≈241 KB | **Phase B**：几何主角精修版，21 标准骨、低面五官 |
| `xieming_geo_v2.blend` | Blender | ≈125 KB | Phase B 源工程（含骨骼与五官几何） |
| `xieming_xie_vrc_final_viewer.html` | HTML | — | **Phase C**：精确版在线/本地查看器（three-vrm） |
| `xieming_geo_v2_viewer.html` | HTML | — | **Phase C**：几何版查看器（three-vrm） |
| `geo_v2_front.png` / `geo_v2_side.png` / `geo_v2_back.png` / `geo_v2_face.png` | PNG | — | **Phase C**：几何版多视角渲染 |
| `final_front.png` / `final_side.png` / `final_back.png` / `final_face.png` | PNG | — | **Phase C**：精确版多视角渲染 |

---

## 2. Phase A — VRChat 精确版 (`xieming_xie_vrc_final.vrm`)

### 技术规格
- **基础**：由原始精确模型 `xieming_vrm.vrm` 注入生成，保留全部原几何（10 个网格、约 36 万顶点、9 套 PBR 材质，未使用 MToon）。
- **骨骼**：原 21 根标准人形骨 → 注入 **12 根 SpringBone**，skin 关节总数 **21 → 33**。
- **SpringBone 链（5 条）**：
  - 围巾左 `spring_scarf_FL`（3 骨，挂 `chest`）
  - 围巾右 `spring_scarf_FR`（3 骨，挂 `chest`）
  - 头发左 `spring_hair_L`（2 骨，挂 `head`）
  - 头发右 `spring_hair_R`（2 骨，挂 `head`）
  - 头发后 `spring_hair_B`（2 骨，挂 `head`）
- **碰撞体（2 个）**：`chest` 球（半径 0.14）、`head` 球（半径 0.14，偏移 [0,0,0.1]），防止头发/围巾穿插身体。
- **物理参数**：重力 `{x:0, y:-1, z:0}`，dragForce 0.5，stiffness 0.5，length `auto`。
- **校验**：`extensionsUsed` 含 `VRMC_springBone`；5 条 spring、33 个 skin 关节；围巾/头发顶点权重索引全部在合法范围（max joint 32 / 26）。
- **体积决策**：用户选「不减面，保真优先」，保留全精度 43.5 MB（PC 端 VRChat 无硬性体积上限，可直接上传）。

> 注：Blender 自带 glTF 导入器会报 `Extension VRMC_springBone is not available` 并中止——这是**预期行为**（Blender 不识别 VRM 扩展），VRChat / Unity + VRM 插件可正常识别。已通过「剥离 VRM 扩展后字节级重导入」验证全部 33 骨与 10 网格几何完好。

### VRChat 上传步骤
1. 安装 [VRCFury](https://vrcfury.com/) 或直接用 VRChat SDK 的 Avatar 3.0 流程。
2. 在 Unity 中通过 **VRM Importer**（UniVRM）导入 `xieming_xie_vrc_final.vrm`。
3. 导入后检查：Humanoid 骨骼映射自动完成（21 标准骨）；SpringBone 在 Unity 中以 `VRMC_springBone` 组件形式存在，可直接在 Scene 中预览摆动。
4. 如需上传，按 VRChat SDK 流程打包（Build & Publish）。PC 端可直接使用；Quest/移动端需另做轻量版（见 §5）。

### Unity 导入步骤
1. 安装 UniVRM（建议 v0.112+，支持 VRM 1.0 与 `VRMC_springBone`）。
2. `Assets > VRM > Import` 选择 `xieming_xie_vrc_final.vrm`。
3. 生成的 Prefab 已含 SpringBone 组件；在 Inspector 中可调 gravity / stiffness / dragForce。
4. 若需转 Humanoid 动画：选中模型 → Rig → Animation Type = `Humanoid` → Apply。

---

## 3. Phase B — 几何主角精修版 (`xieming_geo_v2.glb`)

### 技术规格
- **来源**：在 `xieming_geo.blend`（原 1178 顶点 / 19 骨）基础上精修。
- **骨骼**：补齐 `leftEye` / `rightEye` → **21 标准人形骨**（Unity Humanoid 可一键识别）。
- **顶点**：1178 → **1242**（新增 64 顶点，全部用于低面五官），远低于 3k 上限。
- **五官几何（切割/几何风，8 个低面盒子）**：
  - 青色自发光虹膜 `iris`（双眼）
  - 白色高光 `hi`（双眼，前最层）
  - 倾斜眉 `brow`（双眼上方，营造疏离感）
  - 鼻梁 `nose`（居中）
  - 嘴 `mouth`（居中小块，含蓄表情）
- **材质**：复用原模型既有材质（`iris` `hair` `dark` `skin` `shirt`），风格统一。
- **权重**：新增几何全部绑定到 `head` 骨，随头部运动。

### Unity Humanoid 设置
1. 导入 `xieming_geo_v2.glb` → 选中模型 → Rig → `Humanoid` → `Apply`。
2. 因已含 21 标准骨，骨骼映射自动完成；可立即套用 Humanoid 动画（Idle / Walk 等）。
3. 适合做游戏 NPC、二次元风格主角或低面演示。

---

## 4. Phase C — 本地查看器使用方法

两个 HTML 查看器基于 [three-vrm](https://github.com/pixiv/three-vrm)（通过 CDN 加载，需联网首次加载库）：

1. 将 `.html` 与对应模型文件（`.vrm` / `.glb`）放在**同一目录**。
2. 用浏览器打开 HTML（推荐 Chrome / Edge）。
3. 默认自动载入同名模型；也可用顶部「选择模型文件」按钮加载本地任意文件。
4. 交互：**鼠标左键拖拽旋转**、**滚轮缩放**、**右键平移**。
5. 精确版查看器会启用 VRM SpringBone，可看到头发/围巾自然摆动。

> 若浏览器因安全策略禁止 `file://` 加载，可在该目录起一个本地服务：
> `python -m http.server 8080`，访问 `http://localhost:8080/xieming_xie_vrc_final_viewer.html`。

---

## 5. 已知缺口与后续建议

- **移动端轻量版**：精确版 43.5 MB 为保真体积；如有 Quest/移动端需求，建议另出 <20 MB 减面副本（对服饰/头发适当减面）。
- **五官保真度**：几何版为低面盒子风格，非高保真雕刻；如需更细腻表情可加 blendshape（当前未做）。
- **表情系统**：精确版沿用原 VRM 的 lookAt 元数据，未扩展额外表情 blendshape。
- **材质风格**：精确版使用标准 PBR 材质（非 MToon）；如需典型 VRM 卡通渲染观感，可在 Unity 中替换为 MToon 材质。
- **几何版骨骼偏移**：原 `xieming_geo` 工程存在骨骼与网格 world transform 不一致的历史问题，已通过 mesh-local 坐标放置五官规避，不影响最终 GLB 显示与 Humanoid 识别。

---

## 6. 复现脚本索引（位于 WorkBuddy 工程目录）

| 脚本 | 作用 |
|---|---|
| `inject_springbone.py` | 向原 VRM 注入 12 根 SpringBone + 2 碰撞体，输出最终 VRM |
| `build_vrc_final.py` | Blender 端加 SpringBone 骨链并重蒙皮围巾/头发，导中间 GLB |
| `build_geo_v2.py` | 在几何工程补眼/眉/鼻/嘴几何 + leftEye/rightEye 骨，导出 v2 |
| `render_multi.py` | 多视角（前/侧/后/正脸）渲染 |
| `verify_strip_import.py` / `compare_verts.py` | 几何完整性字节级校验 |
