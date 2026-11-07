stories/ — 解包/安装后的故事区

用途：由 imports/ 剑匣收件箱导入 .xzs 后生成，每个作品一个子目录：
      stories/{id}/manifest.json
      stories/{id}/story.xzc          （编译后的剧情逻辑，含 XTO 节点属性）
      stories/{id}/assets/            （作品包自带资源）

说明：作品包资源优先于引擎根 assets/；本目录由导入管线写入，玩家不直接手改。
      本次仅落地目录，未创建任何 story.xzc / manifest.json / assets 占位文件
      （禁止伪造编译产物与容器内容）。
