// CORE_DIMENSION — 具象画观测终端
// 依赖全部来自本地 vendor/（见 index.html 的 importmap），离线可用。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const MODELS = {
    vrm: { file: './xiemosheng.vrm',  label: '精确版 VRM (SpringBone)', isVrm: true },
    geo: { file: './xieming_geo.glb', label: '几何精修版 GLB',           isVrm: false },
};

const params   = new URLSearchParams(location.search);
const modelKey = MODELS[params.get('model')] ? params.get('model') : 'vrm';
if (params.get('transparent') === '1') document.body.classList.add('transparent');

// ---------------------------------------------------------------- 场景
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// 正面主光 + 侧后补光（MToon 材质没光会全黑）
scene.add(new THREE.AmbientLight(0xffffff, 0.95));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(1.5, 2, 3);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x9FB4FF, 0.7);
fillLight.position.set(-2, 1, -2);
scene.add(fillLight);

// 所有模型挂在 pivot 上，旋转 / 呼吸都作用于 pivot，不破坏模型自身变换
const pivot = new THREE.Group();
scene.add(pivot);

let currentRoot = null;   // 当前模型的根节点
let vrm = null;           // 仅 VRM 模式有值
let baseDist = 3;
let modelHeight = 1.6;    // 模型真实高度，由包围盒测得
let targetYaw = 0, targetPitch = 0, curYaw = 0, curPitch = 0;
let dragging = false, lastX = 0, lastY = 0;
let zoom = 1;
if (params.get('flip') === '1') targetYaw = Math.PI;   // 部分模型默认背对镜头
const baseYaw = targetYaw;
const noSpring = params.get('nospring') === '1';        // 诊断：跳过 SpringBone 物理更新
const rawMode  = params.get('raw') === '1';             // 诊断：当普通 glTF 渲染，不挂 VRM 插件

const el = (id) => document.getElementById(id);
const setStatus = (k, v) => { const n = el('st-' + k); if (n) n.textContent = v; };

// ---------------------------------------------------------------- 自动取景
// 任何尺度的模型都能被完整看见：按包围盒把脚底对齐 y=0、xz 居中，再算相机距离。
function frameModel(root) {
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    root.position.x -= center.x;
    root.position.y -= box.min.y;
    root.position.z -= center.z;

    modelHeight = Math.max(size.y, 0.01);
    const w = Math.max(size.x, size.z, 0.01);
    const fov = camera.fov * Math.PI / 180;
    const distV = (modelHeight * 0.5) / Math.tan(fov / 2);
    const distH = (w * 0.5) / Math.tan(fov / 2) / Math.max(camera.aspect, 0.5);
    baseDist = Math.max(distV, distH) * 1.35;
    applyCamera();
    setStatus('bbox', size.toArray().map(n => n.toFixed(2)).join(' x ') + '  D=' + baseDist.toFixed(2));
    console.log('[CORE_DIMENSION] bbox', size.toArray().map(n => n.toFixed(2)).join(' x '), 'dist', baseDist.toFixed(2));
}

function applyCamera() {
    // 相机高度与注视点都基于模型真实高度，而不是反推的视高
    camera.position.set(0, modelHeight * 0.55, baseDist * zoom);
    camera.lookAt(0, modelHeight * 0.5, 0);
}

// ---------------------------------------------------------------- 模型加载
function disposeCurrent() {
    if (currentRoot) {
        pivot.remove(currentRoot);
        currentRoot.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
        });
    }
    currentRoot = null;
    vrm = null;
}

function loadModel(key) {
    const cfg = MODELS[key];
    disposeCurrent();

    el('loading').classList.remove('hidden', 'error');
    el('loading').style.display = '';
    el('load-msg').textContent = '正在从维度裂隙中唤醒具象画...';
    el('load-bar').style.width = '0%';
    el('load-sub').textContent = cfg.file;
    setStatus('model', cfg.label);
    setStatus('state', 'LOADING');
    setStatus('spring', '--');

    document.querySelectorAll('.switches .btn').forEach(b => b.classList.remove('active'));
    el(key === 'vrm' ? 'btn-vrm' : 'btn-geo').classList.add('active');

    const loader = new GLTFLoader();
    // 只有 VRM 需要注册插件；GLB 没有 VRM 扩展，保持干净。
    if (cfg.isVrm && !rawMode) loader.register(parser => new VRMLoaderPlugin(parser));

    loader.load(
        cfg.file + '?v=' + Date.now(),
        (gltf) => {
            vrm = gltf.userData.vrm || null;
            const root = (vrm && vrm.scene) ? vrm.scene : gltf.scene;

            // 大模型（36 万顶点）跳过 removeUnnecessaryVertices，避免长时间阻塞主线程
            let verts = 0;
            root.traverse(o => { if (o.geometry?.attributes?.position) verts += o.geometry.attributes.position.count; });
            if (cfg.isVrm && verts < 100000 && VRMUtils.removeUnnecessaryVertices) {
                VRMUtils.removeUnnecessaryVertices(gltf.scene);
            }

            currentRoot = root;
            pivot.add(root);
            pivot.updateMatrixWorld(true);
            frameModel(root);

            // 校正后再量一次世界包围盒，确认模型真的落在 y∈[0, h]
            const after = new THREE.Box3().setFromObject(root);
            setStatus('view',
                'Y[' + after.min.y.toFixed(2) + ',' + after.max.y.toFixed(2) + ']' +
                ' CAM(' + camera.position.toArray().map(n => n.toFixed(2)).join(',') + ')' +
                ' LOOK_Y=' + (modelHeight * 0.5).toFixed(2));

            const chainCount = vrm?.springBoneManager?.joints?.size
                ?? gltf.parser?.json?.extensions?.VRMC_springBone?.springs?.length
                ?? 0;
            setStatus('state', 'ONLINE / ' + Math.round(verts / 1000) + 'K VERTS');
            setStatus('spring', vrm ? (chainCount ? chainCount + ' 条链' : '已载入') : 'N/A (GLB)');

            el('loading').classList.add('hidden');
            el('loading').style.display = 'none';
            console.log('[CORE_DIMENSION] 模型载入完成:', cfg.label, 'vrm=', !!vrm);
        },
        (evt) => {
            if (evt.lengthComputable && evt.total) {
                const pct = Math.min(100, evt.loaded / evt.total * 100);
                el('load-bar').style.width = pct.toFixed(1) + '%';
                el('load-sub').textContent = cfg.file + '  ' + (evt.loaded / 1048576).toFixed(1) + ' / ' + (evt.total / 1048576).toFixed(1) + ' MB';
            } else if (evt.loaded) {
                el('load-sub').textContent = cfg.file + '  ' + (evt.loaded / 1048576).toFixed(1) + ' MB';
            }
        },
        (err) => {
            console.error('[CORE_DIMENSION] 模型加载失败', err);
            el('loading').classList.add('error');
            el('load-msg').textContent = '模型加载失败：' + cfg.file;
            el('load-sub').textContent = String(err?.message || err).slice(0, 120);
            setStatus('state', 'ERROR');
        }
    );
}

// ---------------------------------------------------------------- 交互
el('btn-vrm').onclick   = () => loadModel('vrm');
el('btn-geo').onclick   = () => loadModel('geo');
el('btn-flip').onclick  = () => { targetYaw += Math.PI; };
el('btn-reset').onclick = () => { targetYaw = baseYaw; targetPitch = 0; zoom = 1; applyCamera(); };

renderer.domElement.addEventListener('pointerdown', e => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e => {
    if (!dragging) return;
    targetYaw   += (e.clientX - lastX) * 0.008;
    targetPitch  = Math.max(-0.5, Math.min(0.5, targetPitch + (e.clientY - lastY) * 0.005));
    lastX = e.clientX; lastY = e.clientY;
});
renderer.domElement.addEventListener('pointerup',     () => dragging = false);
renderer.domElement.addEventListener('pointercancel', () => dragging = false);
renderer.domElement.addEventListener('wheel', e => {
    e.preventDefault();
    zoom = Math.max(0.35, Math.min(3, zoom * (e.deltaY > 0 ? 1.1 : 0.9)));
    applyCamera();
}, { passive: false });

addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

// Esc 通知 C# 外壳关闭（WebView2）；独立浏览器里按 Esc 只发信号不报错
addEventListener('keydown', e => {
    if (e.key === 'Escape') window.chrome?.webview?.postMessage?.('exit');
});

// 预留：接收 C# 的「连冥」信号，可在此驱动表情 / 动作
window.chrome?.webview?.addEventListener?.('message', event => {
    console.log('[CORE_DIMENSION] 收到现实指令:', event.data);
    if (event.data === 'flip') targetYaw += Math.PI;
    if (event.data === 'geo')  loadModel('geo');
    if (event.data === 'vrm')  loadModel('vrm');
});

// ---------------------------------------------------------------- VZC 3.0 挂钩
// VZC 运行时把 Mod 事件转译成 CustomEvent，这里只做场景侧响应，不关心 Mod 来源。
const vzcApi = window.VZC;
document.addEventListener('vzc:model', e => {
    const key = e.detail?.key;
    if (key === 'vrm' || key === 'geo') loadModel(key);
});
document.addEventListener('vzc:flip', () => { targetYaw += Math.PI; });
document.addEventListener('vzc:scene', e => {
    const p = e.detail || {};
    if (typeof p.zoom === 'number') {
        zoom = Math.max(0.35, Math.min(3, p.zoom));
        applyCamera();
    }
    if (p.model === 'vrm' || p.model === 'geo') loadModel(p.model);
});
document.addEventListener('vzc:dialogue', e => {
    console.log('[CORE_DIMENSION] VZC 剧情:', e.detail);
});
document.addEventListener('vzc:activate', e => {
    setStatus('vzc', '已激活 · ' + (e.detail?.mod?.title || '?'));
});
el('btn-vzc').onclick = () => {
    vzcApi?.reload();
    setStatus('vzc', '正在重新扫描...');
};

// ---------------------------------------------------------------- 渲染循环
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t  = clock.getElapsedTime();

    curYaw   += (targetYaw   - curYaw)   * 0.12;
    curPitch += (targetPitch - curPitch) * 0.12;
    pivot.rotation.y = curYaw;
    pivot.rotation.x = curPitch;
    pivot.position.y = Math.sin(t * 1.8) * 0.012;   // 轻微呼吸起伏

    if (vrm && !noSpring) vrm.update(dt);             // 驱动 SpringBone（围巾 / 头发摆动）
    renderer.render(scene, camera);
}
animate();

loadModel(modelKey);
