export/ — 二创导出区（引擎本体态为空）

两种形态并存，按第二份契约保留目录名不改写：
  1. 创作/打包态：展开的作品目录，例如
     export/邪冥的日常_第一章/{manifest.json, story.xzc}
  2. 运行态：玩家（手机端）导出的 .xzs 容器包，例如 export/邪冥的日常_第一章.xzs

导入管线优先识别 .xzs 容器；展开目录供创作态直接取用。
边界：本目录只放「作品内容」，禁止放入 .mixz / .vzc 引擎扩展（那属于 vzcs/）。

说明：本次仅落地目录，未创建任何占位包或作品目录（禁止伪造编译/容器产物）。
      边界定义见 docs/architecture/xz-unified-architecture.md 第 7 节。
