imports/ — 剑匣收件箱（二创导入区 / 运行态唯一入口）

剑匣收件箱：放入 .xzs / .mo 包，由引擎扫描解包。

  .xzs  二创完整故事包   -> 解包到 stories/{id}/{manifest.json, story.xzc, assets/}
  .mo   额外 VZC 扩展 / 数据块 / 自定义模型视频特效包
                          -> 按 kind 落到 vzcs/{VZC名称}/{版本号}/ 或 assets/

导入状态机：收到包 -> 校验（清单 / 签名 / 引擎版本相容） -> 解包到临时区
            -> 分流落位 -> 标记已激活；失败则回滚，原包移入 imports/_failed/ 并写 warning。
忽略以 "_" 或 "." 开头的子目录（_failed/、_done/ 等内部状态目录）。

说明：本次仅落地目录与本说明，未创建任何 .xzs / .mo 占位包（禁止伪造容器包）。
      导入器实现为后续 Story S1-03；状态机契约见
      docs/architecture/xz-unified-architecture.md 第 6 节。
