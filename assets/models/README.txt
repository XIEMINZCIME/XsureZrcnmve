assets/models/ — 3.0「模型作背景」的规范位置

现状：VRM/GLB 模型实际位于 Core_Dimension/xiemosheng.vrm 与
      Core_Dimension/xieming_geo.glb，由 Core_Dimension/main.js 的 MODELS 表直接加载。
过渡策略（本次不迁移）：
  1. 保留 Core_Dimension/ 为模型实际位置，不改动、不复制、不软链任何模型文件；
  2. 本目录作为规范位置先落地空目录 + 本说明；
  3. 后续由 Story S3-01 实现资源解析器：先查 assets/models/，未命中回退 Core_Dimension/；
  4. 触发迁移条件：解析器落地 + 回归用例覆盖 + 主理人批准。
详见 docs/architecture/xz-unified-architecture.md 第 8 节 / ADR-004。
本次仅落地目录，未创建任何模型占位文件。
