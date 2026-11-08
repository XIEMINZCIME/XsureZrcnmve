/* =====================================================================
 * XZArchive — Project Archive 编号槽位存档系统（适配 XsureZrcnmve / HTA）
 * ---------------------------------------------------------------------
 * 借鉴对象：RPG Maker MV 游戏「我所向往的美好结局2.0 序章」的 Zzy.ASL 自定义存档
 *   - 元数据文件 + 编号槽位（对应 Zzy.ASL.StartFileId=40 的思路）
 *   - C(67) 存档 / F3(114) 打开存档列表 / ←→(37/39) 选择 / Z(90) 读取 / X(88) 关闭
 *   - 黑白色面板（与 V1.164 设置终端一致）
 * 持久化：用 FileSystemObject 写到 HTA 同目录的 ProjectArchive.dat（JSON）
 * 全屏：HTA 环境用 window.moveTo+resizeTo（原生 API 在 HTA 不可用），
 *       浏览器环境用原生 requestFullscreen / msRequestFullscreen。
 * 集成：V1.168 起已内联进 XsureZrcnmve.hta 单文件；本文件保留为开发备份副本，
 *       不再被 <script src> 引用（如需外部引用，将本文件放到 HTA 同目录并取消下行注释）：
 *        <script src="xz-archive.js"></script>
 * ===================================================================== */
(function () {
    "use strict";
    var XZArchive = {};
    window.XZArchive = XZArchive;

    /* ---------- 配置 ---------- */
    var START_SLOT = 1;                 // 槽位从 1 开始编号
    var META_FILE  = "ProjectArchive.dat";

    /* ---------- 运行状态 ---------- */
    var fsObj  = null;
    var open   = false;                 // 存档列表面板是否打开
    var slots  = [];                    // [{ id, name, ts, data }]
    var cursor = 0;                     // 当前选中槽位

    /* ---------- 持久化（fso，仅 HTA/IE 可用；不可用则降级内存） ---------- */
    function fsoReady() {
        try {
            if (!fsObj) { fsObj = new ActiveXObject("Scripting.FileSystemObject"); }
            return !!fsObj;
        } catch (e) { return false; }
    }
    function baseDir() {
        try {
            if (fsoReady()) {
                var p = location.pathname;            // HTA 下为本地路径
                var folder = fsObj.GetParentFolderName(p);
                return folder || ".";
            }
        } catch (e) {}
        return ".";
    }
    function metaPath() {
        var d = baseDir();
        return (d && d !== ".") ? (d + "\\" + META_FILE) : META_FILE;
    }
    function load() {
        slots = [];
        if (!fsoReady()) return;
        try {
            var p = metaPath();
            if (fsObj.FileExists(p)) {
                var ts = fsObj.OpenTextFile(p, 1, false);
                var txt = ts.ReadAll(); ts.Close();
                var obj = JSON.parse(txt || "[]");
                if (Array.isArray(obj)) slots = obj;
            }
        } catch (e) { slots = []; }
    }
    function persist() {
        if (!fsoReady()) return;
        try {
            var p = metaPath();
            var ts = fsObj.CreateTextFile(p, true);
            ts.Write(JSON.stringify(slots)); ts.Close();
        } catch (e) {}
    }

    /* ---------- 取当前要存档的快照（演示数据；接真实进度请替换 snapshot） ---------- */
    function snapshot() {
        return {
            menu:  (typeof MENU_ITEMS !== "undefined")  ? MENU_ITEMS.slice()          : [],
            until: (typeof archiveSubtitleUntil !== "undefined") ? archiveSubtitleUntil : 0,
            savedAt: new Date().toISOString()
        };
    }

    /* ---------- 对外操作 ---------- */
    XZArchive.save = function (name, data) {
        load();
        var id = slots.length ? (slots[slots.length - 1].id + 1) : START_SLOT;
        var label = name || ("存档 " + id + "  " + new Date().toLocaleString());
        slots.push({ id: id, name: label, ts: Date.now(), data: (data || snapshot()) });
        persist();
        if (typeof archiveSubtitleUntil !== "undefined") { archiveSubtitleUntil = Date.now() + 3000; }
        return id;
    };
    XZArchive.getSlots = function () { return slots.slice(); };
    XZArchive.openList  = function () { load(); cursor = slots.length ? 0 : 0; open = true;  render(); };
    XZArchive.closeList = function () { open = false; hide(); };
    XZArchive.loadSlot  = function (idx) {
        var s = slots[idx]; if (!s) return false;
        // 读取：演示中仅回放副标题提示；真实进度回放按你项目的数据结构扩展
        if (typeof archiveSubtitleUntil !== "undefined") { archiveSubtitleUntil = Date.now() + 3000; }
        return true;
    };

    /* ---------- 完整全屏助手（适配 HTA 与浏览器） ---------- */
    XZArchive.toggleFullscreen = function () {
        var doc = document;
        var el  = doc.documentElement || doc.body;
        var req = el.requestFullscreen || el.msRequestFullscreen || el.webkitRequestFullScreen;
        var exit = doc.exitFullscreen || doc.msExitFullscreen || doc.webkitCancelFullScreen;
        var isFs = doc.fullscreenElement || doc.msFullscreenElement || doc.webkitFullscreenElement;
        var isHta = (typeof window.external !== "undefined") &&
                    /HTA/i.test(navigator.userAgent || "");
        try {
            if (!isFs) {
                if (isHta) {                      // HTA：窗口式完整全屏（与现有 F4 等价）
                    window.moveTo(0, 0);
                    window.resizeTo(screen.width, screen.height);
                } else if (req) {
                    req.call(el, Element && Element.ALLOW_KEYBOARD_INPUT);
                }
            } else if (isHta) {
                // 还原交给原 F4 逻辑；此处仅占位，不重复实现
            } else if (exit) {
                exit.call(doc);
            }
        } catch (e) {}
    };

    /* ---------- 面板 UI（黑/白，绝对定位，兼容 IE9 无 flex/transform 前缀） ---------- */
    function ensureLayer() {
        var el = document.getElementById("xz-archive-layer");
        if (el) return el;
        el = document.createElement("div");
        el.id = "xz-archive-layer";
        el.style.cssText = "position:absolute;left:0;top:0;right:0;bottom:0;z-index:9000;display:none;"
            + "background:rgba(8,8,8,0.94);color:#f0f0f0;font-family:'Microsoft YaHei',sans-serif;";
        el.innerHTML =
            '<div id="xz-archive-box" style="position:absolute;left:50%;top:50%;width:600px;'
            + '-ms-transform:translate(-50%,-50%);transform:translate(-50%,-50%);'
            + 'border:1px solid rgba(255,255,255,0.20);padding:18px 20px;font-family:\'Microsoft YaHei\',sans-serif;">'
            +   '<div style="font-family:\'Courier New\',monospace;font-size:13px;font-weight:900;letter-spacing:2px;margin-bottom:4px;">[ SYSTEM_MENU ] <span style="font-size:10px;color:#aaa;">V1.168</span></div>'
            +   '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#888;margin-bottom:12px;">PROJECT ARCHIVE &middot; 存档列表 &middot; <span style="color:#888;">BGM: Narvik Snow</span></div>'
            +   '<div id="xz-archive-list" style="min-height:160px;"></div>'
            +   '<div id="xz-archive-maps" style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.16);padding-top:10px;">'
            +     '<div style="font-family:\'Courier New\',monospace;font-size:11px;color:#7fd0a0;letter-spacing:1px;margin-bottom:6px;">&#9679; 即将推出 &middot; COMING SOON</div>'
            +     '<div style="font-family:\'Courier New\',monospace;font-size:12px;color:#e0e0e0;line-height:1.6;">'
            +       '<img src="novice-map.jpg" alt="NOVICE MAP" style="float:left;width:160px;height:90px;margin-right:12px;border:1px solid rgba(255,255,255,0.25);" onerror="this.style.display=\'none\'">'
            +       '<div style="overflow:hidden;">'
            +         '<b style="color:#ffffff;">新手地图 / NOVICE MAP</b><br>'
            +         '后续版本将加入可探索的地图模型。<br>'
            +         '第一人称摄像机 &middot; 山谷坡地场景。'
            +       '</div>'
            +       '<div style="clear:both;"></div>'
            +     '</div>'
            +   '</div>'
            +   '<div style="margin-top:12px;font-family:\'Courier New\',monospace;font-size:10px;color:#999;">&larr;/&rarr; 选择 &middot; Z 读取 &middot; X 关闭 &middot; C 新存档</div>'
            + '</div>';
        document.body.appendChild(el);
        return el;
    }
    function pad2(n) { n = String(n); return n.length >= 2 ? n : ("0" + n); }
    function escapeHtml(t) {
        return String(t).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }
    function render() {
        var layer = ensureLayer();
        var list  = document.getElementById("xz-archive-list");
        if (!list) return;
        if (!slots.length) {
            list.innerHTML = '<div style="color:#999;padding:20px 0;text-align:center;">NO SAVE DATA</div>';
        } else {
            var html = "";
            for (var i = 0; i < slots.length; i++) {
                var s = slots[i];
                var active = (i === cursor)
                    ? "background:rgba(255,255,255,0.14);border-color:rgba(255,255,255,0.6);color:#fff;"
                    : "border-color:transparent;color:#cfcfcf;";
                html += '<div style="padding:8px 12px;border:1px solid;' + active + 'border-radius:6px;margin-bottom:6px;">'
                    +   '<span style="font-family:\'Courier New\',monospace;font-size:12px;color:#888;margin-right:12px;">[ ' + pad2(s.id) + ' ]</span>'
                    +   '<span style="font-size:14px;color:#f0f0f0;">' + escapeHtml(s.name) + '</span>'
                    +   '<span style="float:right;font-family:\'Courier New\',monospace;font-size:10px;color:#888;">'
                    +     (s.data && s.data.savedAt ? s.data.savedAt.slice(0,10) : '') + '</span></div>';
            }
            list.innerHTML = html;
        }
        layer.style.display = "block";
    }
    function hide() { var el = document.getElementById("xz-archive-layer"); if (el) el.style.display = "none"; }

    /* ---------- 键盘接入：包裹已有的 document.onkeydown（不破坏原逻辑） ---------- */
    function handle(code, e) {
        if (open) {
            e.returnValue = false;
            if (code === 37 || code === 39) {                 // ← / → 选择
                if (slots.length) {
                    cursor += (code === 39) ? 1 : -1;
                    if (cursor < 0) cursor = slots.length - 1;
                    if (cursor >= slots.length) cursor = 0;
                    render();
                }
                return true;
            }
            if (code === 90) { XZArchive.loadSlot(cursor); return true; }   // Z 读取
            if (code === 88) { XZArchive.closeList(); return true; }        // X 关闭
            if (code === 67) { XZArchive.save(); render(); return true; }   // C 在列表内也能新存
            return true;
        }
        // 未打开时：C 新存档、F3 打开列表
        if (code === 67)  { XZArchive.save(); return true; }       // C 存档
        // V1.168：F3 已改派给主界面作者模型预览（见主 HTA 脚本 onkeydown），此处不再拦截 114
        return false;                                              // 未消费，交给原 handler
    }

    function install() {
        var prev = document.onkeydown;
        document.onkeydown = function (e) {
            e = e || window.event;
            var code = (typeof e.keyCode === "number") ? e.keyCode : 0;
            if (handle(code, e)) return false;
            if (prev) return prev(e);
            return true;
        };
    }

    XZArchive.install = install;
    XZArchive.handle  = handle;
    XZArchive.ensureLayer = ensureLayer;
    // 扩展点：后续主界面代码可调用 XZArchive.renderMaps(html) 把 #xz-archive-maps 替换为真实地图列表
    XZArchive.renderMaps = function (html) {
        var m = document.getElementById("xz-archive-maps");
        if (m && typeof html === "string") { m.innerHTML = html; }
    };

    // 关键：必须在主脚本把 document.onkeydown 设好之后再包裹，
    // 所以统一延迟到 load 事件（无论主脚本是同步赋值还是用 onload 注册）。
    if (document.readyState === "complete") {
        install();
    } else if (document.addEventListener) {
        window.addEventListener("load", install);
    } else {
        window.attachEvent("onload", install);
    }
})();
