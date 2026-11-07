// CORE_DIMENSION / VZC 运行时
// 对应 XsureZrcnmve 3.0「VZC 创作扩展」的前端侧。
//
// 职责：
//   1. 接收 C# VzcHost 推来的 Mod 注册表
//      （vzcs/<名称>/<版本>/ 下的 manifest.json + *.mixz + *.vzc 声明式定义）
//   2. 暴露 window.VZC：列出 / 激活 / 事件订阅 / XTO 自动选择
//   3. 把 VZC 事件转译成 CustomEvent，main.js 只监听事件，不关心 Mod 从哪来
//
// 边界：*.mixz 是 NepInRx 13（ZC・X#・.NET 13）编译产物，格式未公开。
// 本运行时不猜测它的二进制结构：若 manifest 声明了 webEntry 则按 ES Module 载入，
// 否则把入口 URL 交给宿主执行器（window.VZC.onMixz），并标记 awaiting-mixz-spec。
//
// XTO（3.0 归位）：XTO 是剧情数据里的节点属性，不是前端运行时逻辑。
// 本运行时只「执行」剧情节点 xto 配置里的策略
// （auto_select / strategy / fallback / wait_ms），
// 不再扫描 default/auto 标记、不再兜底取第一项替剧情做决定。

const registry = {
    mods: [],
    warnings: [],
    root: '',
    activeId: null,
    xto: false,
    source: 'none',
};

const listeners = new Map();

function emit(name, detail) {
    (listeners.get(name) || []).forEach(fn => {
        try { fn(detail); } catch (err) { console.error('[VZC] listener error:', name, err); }
    });
    document.dispatchEvent(new CustomEvent('vzc:' + name, { detail }));
}

function bridge() {
    return window.chrome?.webview;
}

function post(text) {
    bridge()?.postMessage?.(text);
}

function setStatus(text) {
    const el = document.getElementById('st-vzc');
    if (el) el.textContent = text;
}

function applyRegistry(data, source) {
    registry.mods = Array.isArray(data.mods) ? data.mods : [];
    registry.warnings = Array.isArray(data.warnings) ? data.warnings : [];
    registry.root = data.root || '';
    registry.source = source;

    const active = registry.mods.find(m => m.status === 'active');
    registry.activeId = active ? active.id : null;

    const n = registry.mods.filter(m => m.status === 'active').length;
    setStatus(n ? n + ' 个已加载' : '无 (vzcs/ 为空)');
    emit('registry', { mods: registry.mods, warnings: registry.warnings, source });
    console.log('[VZC] 注册表来自', source, '共', registry.mods.length, '条', registry.warnings);
}

// ---------------------------------------------------------------- 宿主消息
const wv = bridge();
if (wv?.addEventListener) {
    wv.addEventListener('message', event => {
        let data = event.data;
        if (typeof data === 'string') {
            // 纯字符串是给 C# 的控制指令回显，注册表一律走 JSON
            if (!data.trim().startsWith('{')) return;
            try { data = JSON.parse(data); } catch { return; }
        }
        if (!data || typeof data !== 'object') return;
        if (data.type === 'vzc:registry') applyRegistry(data, 'host');
        else if (data.type === 'vzc:activate') activateLocal(data.mod);
    });
} else {
    // 独立浏览器：尝试读取扫描器生成的 vzcs/index.json（同源时可用）
    fetch('./../vzcs/index.json', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
        .then(d => applyRegistry(d, 'index.json'))
        .catch(() => setStatus('离线 / 未连接宿主'));
}

// ---------------------------------------------------------------- 激活
function activateLocal(mod, fromUser = false) {
    if (!mod) return null;
    registry.activeId = mod.id;
    emit('activate', { mod });

    // A. 声明了 webEntry：按 ES Module 载入，并把 window.VZC 交给它
    if (mod.webEntryUrl) {
        import(/* @vite-ignore */ mod.webEntryUrl)
            .then(m => {
                if (typeof m.default === 'function') m.default(window.VZC);
                if (typeof m.onLoad === 'function') m.onLoad(window.VZC);
                console.log('[VZC] webEntry 已执行:', mod.id);
            })
            .catch(err => console.error('[VZC] webEntry 载入失败:', mod.id, err));
        return mod;
    }

    // B. 只有 *.mixz：交给宿主执行器 / 未来接入 NepInRx 13 的位置
    if (mod.entryUrl) {
        const handled = (listeners.get('mixz') || []).some(fn => {
            try { return fn(mod) === true; } catch { return false; }
        });
        if (!handled) {
            console.warn('[VZC] *.mixz 执行器尚未接入，入口:', mod.entryUrl);
            setStatus(mod.id + ' / 等待 mixz 执行器');
        }
    }

    // 通知 C# 侧（真正的执行器接缝在 VzcHost.Activate）
    if (fromUser) post('vzc:activate:' + mod.id);
    return mod;
}

// ---------------------------------------------------------------- XTO 自动选择
// 3.0：XTO 是「剧情数据里的节点属性」，不是前端运行时逻辑。
// 真实实例中 branch 节点内联：
//   "xto": {"auto_select": true, "strategy": "weighted", "fallback": "accept", "wait_ms": 1500}
// 选项带 "xto_weight": 0.8 / 0.2
//
// 前端职责收敛为「执行器」：解析节点自带策略 -> 按策略算出选项 -> 交回剧情引擎。
// 不再扫描 default/auto 标记、不再默认取第一项替剧情做决定。
//
// 知识缺口（诚实标注，绝不臆造）：目前仅 "weighted" 有明确定义（按 xto_weight 加权随机）；
// 其余 strategy 取值与 fallback 令牌的精确语义尚未由剧情规范确认，
// 本实现对未知值只做最保守处理并记 warning，不扩展、不编造新语义。

const XTO_DEFAULT_WAIT_MS = 1500;

/**
 * 解析剧情节点自身携带的 xto 配置，只做归一化，不做选择。
 * 接受三种形态：完整剧情节点（读 node.xto）/ xto 配置本体 / node.xto_config 别名。
 * 返回 null 表示「该节点未声明 XTO」，前端据此拒绝自行决策。
 */
function xtoFromNode(node) {
    if (!node || typeof node !== 'object') return null;
    const raw = node.xto && typeof node.xto === 'object' ? node.xto
              : node.xto_config && typeof node.xto_config === 'object' ? node.xto_config
              : (node.auto_select !== undefined || node.strategy !== undefined) ? node
              : null;
    if (raw == null || raw === false) return null;

    // 声明了 xto 即视为启用，除非 auto_select 显式为 false；这是归一化，不是策略决策。
    // 缺失的 strategy / fallback / wait_ms 取保守内置默认，仅用于不完整数据。
    const wait = Number(raw.wait_ms);
    return {
        auto_select: raw.auto_select !== false,
        strategy: String(raw.strategy ?? 'weighted').toLowerCase(),
        fallback: String(raw.fallback ?? 'accept').toLowerCase(),
        wait_ms: Number.isFinite(wait) && wait >= 0 ? wait : XTO_DEFAULT_WAIT_MS,
        source: 'node.xto',
    };
}

/**
 * 按节点配置执行策略，返回被选中的选项（纯函数，策略本身来自数据，不由前端指定）。
 * 仅 "weighted" 有规范定义：按各选项 xto_weight 加权随机；权重全为 0/缺失时转入 fallback。
 */
function selectByXto(options, cfg) {
    const list = options.filter(o => o != null);
    if (list.length === 0) return null;

    if (cfg.strategy === 'weighted') {
        const weights = list.map(o => {
            const w = Number(o.xto_weight);
            return Number.isFinite(w) && w > 0 ? w : 0;
        });
        const total = weights.reduce((a, b) => a + b, 0);
        if (total > 0) {
            let r = Math.random() * total;
            for (let i = 0; i < list.length; i++) {
                r -= weights[i];
                if (r < 0) return list[i];
            }
            return list[list.length - 1]; // 浮点累加兜底
        }
        console.warn('[VZC] xto weighted 策略无有效 xto_weight，转入 fallback:', cfg.fallback);
    } else {
        console.warn('[VZC] 未定义的 xto.strategy:', cfg.strategy, '— 转入 fallback（待剧情规范确认）');
    }
    return applyFallback(list, cfg.fallback);
}

/**
 * fallback 的保守解释（精确语义待剧情规范确认，此处不扩展新令牌）：
 *  - 非空且非保留字：作为明确的选项 id/key/value 去匹配（仍属「数据指定」）
 *  - "accept" / "first"：接受首项（最保守，不引入额外语义）
 *  - "none"：不选择，返回 null 交由玩家决定
 */
function applyFallback(list, fallback) {
    if (fallback === 'none') return null;
    const reserved = ['accept', 'first', 'none', ''];
    if (!reserved.includes(fallback)) {
        const hit = list.find(o => o && (o.id === fallback || o.key === fallback || o.value === fallback));
        if (hit) return hit;
        console.warn('[VZC] xto.fallback 未匹配到任何选项，按 accept 处理:', fallback);
    }
    return list[0];
}

/**
 * 公开 API（保持兼容）：只读取剧情节点自身携带的 xto 配置并执行其中策略。
 * ctx 形态：ctx.node = 完整剧情节点；或 ctx 本身为节点；或 ctx.xto 为 xto 配置对象。
 * 兼容旧调用：ctx.xto 为字符串时表示「调用方显式指定的选项」，仍予尊重
 * （这是调用方给出的决定，不是前端替剧情做的决定）。
 * wait_ms 随 choice 事件带出，由剧情执行器施加等待；玩家侧全局默认见 data/config.ini。
 */
function autoChoice(options, ctx = {}) {
    if (!registry.xto || !Array.isArray(options) || options.length === 0) return null;

    if (typeof ctx.xto === 'string') {
        const explicit = options.find(o => o && (o.id === ctx.xto || o.key === ctx.xto || o.value === ctx.xto));
        if (explicit) {
            emit('choice', { choice: explicit, options, ctx, source: 'caller-explicit' });
            return explicit;
        }
    }

    const node = ctx.node ?? (ctx.xto && typeof ctx.xto === 'object' ? ctx.xto : ctx);
    const cfg = xtoFromNode(node);
    if (!cfg || !cfg.auto_select) {
        // 节点未声明 XTO：前端拒绝替剧情做决定（旧实现会取第一项，此处为有意的行为变更）
        console.warn('[VZC] 节点未声明 xto 配置，autoChoice 不自行决策');
        emit('xto:missing-config', { options, ctx });
        return null;
    }

    const pick = selectByXto(options, cfg);
    emit('choice', {
        choice: pick, options, ctx, xto: cfg,
        strategy: cfg.strategy, fallback: cfg.fallback, wait_ms: cfg.wait_ms,
        source: 'node.xto',
    });
    return pick;
}

// ---------------------------------------------------------------- 公开 API
const VZC = {
    version: '3.0',
    list() { return registry.mods.slice(); },
    active() { return registry.mods.find(m => m.id === registry.activeId) || null; },
    warnings() { return registry.warnings.slice(); },
    get(id) { return registry.mods.find(m => m.id === id) || null; },
    on(name, fn) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(fn);
        return () => VZC.off(name, fn);
    },
    off(name, fn) {
        const arr = listeners.get(name) || [];
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
    },
    emit,
    activate(id) {
        const mod = registry.mods.find(m => m.id === id);
        return activateLocal(mod, true);
    },
    reload() { post('vzc:reload'); return true; },
    setXto(on) {
        registry.xto = !!on;
        emit('xto', { enabled: registry.xto });
        return registry.xto;
    },
    get xto() { return registry.xto; },
    autoChoice,
    xtoFromNode,
    selectByXto,
    // 供 Mod 使用的场景 / 模型 / 剧情转译接口
    model(key) { emit('model', { key }); },
    flip() { emit('flip', {}); },
    scene(payload) { emit('scene', payload || {}); },
    dialogue(payload) { emit('dialogue', payload || {}); },
    onMixz(fn) { return VZC.on('mixz', fn); },
};

window.VZC = VZC;
emit('ready', { version: VZC.version });
// 主动握手：DOM/模块装载完成的时机可能晚于宿主 NavigationCompleted，
// 由运行时主动索取一次注册表，保证不会丢消息（重复收到是幂等的）。
post('vzc:reload');
console.log('[VZC] 运行时就绪，已向宿主索取注册表');
