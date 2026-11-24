(function () {
'use strict';
const $ = id => document.getElementById(id);
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const hex = c => '#' + c.toString(16).padStart(6, '0');

/* ---------- save ---------- */
const SAVE = Object.assign({ coins: 0, color: 0, hat: 'none', hats: ['none'], wins: 0, kos: 0, games: 0, name: '', mode: 'elim', isle: 'palm', count: 12, howSeen: false }, JSON.parse(localStorage.getItem('knockout') || '{}'));
SAVE.set = Object.assign({ vol: 1, cam: 1, tsize: 1, gfx: 'high', tags: true, shake: true }, SAVE.set || {});
{ const D = { vol: 1, cam: 1, tsize: 1, gfx: 'high', tags: true, shake: true }; for (const k in D) if (typeof SAVE.set[k] !== typeof D[k] || (typeof D[k] === 'number' && !isFinite(SAVE.set[k])) || (k === 'gfx' && !['high', 'fast'].includes(SAVE.set[k]))) SAVE.set[k] = D[k]; }
const save = () => { try { localStorage.setItem('knockout', JSON.stringify(SAVE)); } catch (e) {} try { cloudSoon(); } catch (e) {} };

/* ---------- content ---------- */
const COLORS = [0xff5a5f, 0xffc93c, 0x2ad4c8, 0x6fb7ff, 0xb67bff, 0x7ee36b, 0xff8fd0, 0xff9a3c, 0xf4f1e8, 0x4a5070, 0x46e0ff, 0xc7ff5a];
const HATS = { none: { n: 'None', e: '🚫', p: 0 }, cap: { n: 'Cap', e: '🧢', p: 200 }, party: { n: 'Party hat', e: '🥳', p: 300 }, flower: { n: 'Flower', e: '🌺', p: 350 }, tophat: { n: 'Top hat', e: '🎩', p: 600 }, cat: { n: 'Cat ears', e: '🐱', p: 700 }, horns: { n: 'Horns', e: '😈', p: 800 }, halo: { n: 'Halo', e: '😇', p: 1200 }, crown: { n: 'Crown', e: '👑', p: 2000 } };
const MODES = { elim: { n: 'Last Isle Standing', d: '1 life · last one wins' }, frenzy: { n: 'KO Frenzy', d: '2 min · respawns · most KOs' } };
const ISLES = {
  palm:  { n: 'Palm Cove', d: 'Sunny tropical bay', skyTop: 0x3f8fe0, skyHor: 0xcdeeff, fog: 0xbfe2f5, sea: 0x18a9c4, seaE: 0x000000, top: 0x63c95e, side: 0xc9a46a, bot: 0x8a6a44, sun: 1.5, hemi: 0.75, sunCol: 0xfff1d6 },
  magma: { n: 'Magma Isle', d: 'Volcano at dusk', skyTop: 0x1c0a14, skyHor: 0xff7a3a, fog: 0x4a1a14, sea: 0xff5a1a, seaE: 0xff4210, top: 0x4a4250, side: 0x2a2228, bot: 0x1a1418, sun: 1.0, hemi: 0.45, sunCol: 0xffb080 },
  reef:  { n: 'Sky Reef', d: 'Neon clouds at night', skyTop: 0x05071a, skyHor: 0x3a2a7a, fog: 0x15123a, sea: 0x2a2468, seaE: 0x120c40, top: 0x46c8f0, side: 0x2c3160, bot: 0x1a1d40, sun: 0.7, hemi: 0.6, sunCol: 0xb9c8ff, night: true },
};
const RIVALS = ['Bonk', 'Zippy', 'Mochi', 'Rex', 'Pip', 'Nova', 'Taco', 'Juno', 'Biscuit', 'Ziggy', 'Pebble', 'Kiwi', 'Waffles', 'Echo', 'Dot', 'Mango', 'Bolt', 'Pickle', 'Sunny', 'Gizmo', 'Noodle', 'Blip', 'Coco', 'Fizz'];
const HS = 1.9, SQ3 = Math.sqrt(3);

/* ---------- renderer ---------- */
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 900);
const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 0.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-20, 40, 18); sun.castShadow = true; scene.add(sun); scene.add(sun.target);
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008;
const gfxHi = () => SAVE.set.gfx !== 'fast';
function resize() { const dpr = Math.min(window.devicePixelRatio || 1, gfxHi() ? (isTouch ? 1.6 : 2) : 1); renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.shadowMap.enabled = gfxHi(); }
addEventListener('resize', resize); resize();
const col = c => new THREE.Color(c).convertSRGBToLinear();
const loadJs = src => new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = src; sc.async = true; sc.onload = ok; sc.onerror = () => no(new Error('load')); document.head.appendChild(sc); });
function canvasTex(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
const GLOW = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();

/* ---------- particles ---------- */
function makePool(n, color, size, grav, drag, additive) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), ca = new Float32Array(n * 3), vel = new Float32Array(n * 3), life = new Float32Array(n), max = new Float32Array(n), c = new THREE.Color(color);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(ca, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })); pts.frustumCulled = false; scene.add(pts);
  let head = 0, alive = 1; for (let i = 0; i < n; i++) pos[i * 3 + 1] = -999;
  return {
    emit(x, y, z, vx, vy, vz, l) { const i = head; head = (head + 1) % n; pos.set([x, y, z], i * 3); vel.set([vx, vy, vz], i * 3); life[i] = max[i] = l; alive = 1; },
    update(dt) { if (!alive) return; let any = 0; const dr = Math.exp(-drag * dt);
      for (let i = 0, o = 0; i < n; i++, o += 3) { if (life[i] <= 0) continue; life[i] -= dt; if (life[i] <= 0) { pos[o + 1] = -999; ca[o] = ca[o + 1] = ca[o + 2] = 0; continue; } any = 1;
        vel[o] *= dr; vel[o + 2] *= dr; vel[o + 1] = vel[o + 1] * dr - grav * dt; pos[o] += vel[o] * dt; pos[o + 1] += vel[o + 1] * dt; pos[o + 2] += vel[o + 2] * dt; const k = additive ? life[i] / max[i] : 1; ca[o] = c.r * k; ca[o + 1] = c.g * k; ca[o + 2] = c.b * k; }
      alive = any; geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; },
    clear() { life.fill(0); ca.fill(0); for (let i = 0; i < n; i++) pos[i * 3 + 1] = -999; alive = 1; }
  };
}
const sparks = makePool(260, 0xffd86a, 0.55, 14, 0.8, true), dust = makePool(isTouch ? 140 : 260, 0xffffff, 1.1, -1, 2.2, false), splash = makePool(220, 0xbff4ff, 0.7, 16, 0.5, false), boomFx = makePool(160, 0xff8a3a, 1.4, -2, 2.4, true);
function burst(pool, x, y, z, n, sp, up, l) { for (let k = 0; k < n; k++) pool.emit(x, y, z, (Math.random() - .5) * sp, Math.random() * up, (Math.random() - .5) * sp, l * (0.6 + Math.random() * 0.6)); }

/* ---------- island ---------- */
const world = new THREE.Group(); scene.add(world);
let ISLE = null; // { id, R, tiles, map, mesh, dirty, sea, seaMat, time }
function clearWorld() { for (const o of [...world.children]) { world.remove(o); o.traverse(c => { if (c.geometry) c.geometry.dispose(); }); } }
const tileKey = (q, r) => q + ',' + r;
function axialToXZ(q, r) { return [HS * SQ3 * (q + r / 2), HS * 1.5 * r]; }
function tileAt(x, z) {
  if (!ISLE) return null; let q = (SQ3 / 3 * x - z / 3) / HS, r = (2 / 3 * z) / HS, s = -q - r;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s); const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  return ISLE.map.get(tileKey(rq, rr)) || null;
}
const walkable = t => t && (t.st === 0 || t.st === 1);
function buildIsle(id, R) {
  clearWorld(); const T = ISLES[id];
  scene.fog = new THREE.Fog(T.fog, 110, 380); renderer.setClearColor(T.fog);
  hemi.intensity = T.hemi; hemi.color.set(T.night ? 0x8fa8ff : 0xffffff); hemi.groundColor.set(T.night ? 0x221a44 : 0x556070);
  sun.intensity = T.sun; sun.color.set(T.sunCol);
  const span = HS * 1.8 * (R + 1); const sc = sun.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 1; sc.far = 140; sc.updateProjectionMatrix();
  // sky
  const skyT = canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, hex(T.skyTop)); gr.addColorStop(0.5, hex(T.skyHor)); gr.addColorStop(1, hex(T.fog)); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  world.add(new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false })));
  if (T.night) { const g = new THREE.BufferGeometry(), p = []; for (let i = 0; i < 700; i++) { const a = Math.random() * 6.28, b = Math.random() * 1.2 + 0.1, r = 500; p.push(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r); } g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); world.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, fog: false }))); }
  // sea / lava / clouds
  let seaMat;
  if (id === 'reef') { const ct = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#231d5a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const x = Math.random() * w, y = Math.random() * h, r = 10 + Math.random() * 40, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(160,140,255,.35)'); gr.addColorStop(1, 'rgba(160,140,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } }); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(10, 10);
    seaMat = new THREE.MeshBasicMaterial({ map: ct, color: 0xffffff }); }
  else if (id === 'magma') { const lt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c2300a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 140; i++) { g.strokeStyle = `rgba(${255},${180 + Math.random() * 70 | 0},60,${0.3 + Math.random() * 0.5})`; g.lineWidth = 2 + Math.random() * 5; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - .5) * 60; y += (Math.random() - .5) * 60; g.lineTo(x, y); } g.stroke(); } }); lt.wrapS = lt.wrapT = THREE.RepeatWrapping; lt.repeat.set(14, 14);
    seaMat = new THREE.MeshBasicMaterial({ map: lt, color: 0xffffff }); }
  else { const wt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#1aa6c0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { g.strokeStyle = 'rgba(255,255,255,' + (0.03 + Math.random() * 0.07) + ')'; g.lineWidth = 1 + Math.random() * 1.5; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 22, y); g.stroke(); } }); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(36, 36);
    seaMat = new THREE.MeshStandardMaterial({ map: wt, color: 0xffffff, roughness: 0.25, metalness: 0.1 }); }
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.y = -7; sea.receiveShadow = id === 'palm'; world.add(sea);
  // tiles: floating rock chunks with a grassy / stone / crystal top
  const geo = new THREE.CylinderGeometry(HS * 0.985, HS * 0.42, 2.8, 6, 1); geo.translate(0, -1.4, 0);
  const topTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = hex(T.top); g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  const mats = [new THREE.MeshStandardMaterial({ color: col(T.side), roughness: 0.95, flatShading: true }), new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.85, emissive: T.night ? col(0x1a4a7a) : col(0), emissiveIntensity: T.night ? 0.6 : 0 }), new THREE.MeshStandardMaterial({ color: col(T.bot), roughness: 1 })];
  const tiles = [], map = new Map();
  for (let q = -R; q <= R; q++) for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) { const [x, z] = axialToXZ(q, r), ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)); const t = { i: tiles.length, q, r, x, z, ring, st: 0, t: 0, y: 0, shade: 0.9 + Math.random() * 0.12 }; tiles.push(t); map.set(tileKey(q, r), t); }
  const mesh = new THREE.InstancedMesh(geo, mats, tiles.length); mesh.castShadow = mesh.receiveShadow = true; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  world.add(mesh);
  ISLE = { id, R, tiles, map, mesh, dirty: true, sea, seaMat, time: 0, edges: null };
  for (const t of tiles) { mesh.setColorAt(t.i, new THREE.Color(t.shade, t.shade, t.shade)); }
  writeTiles(0);
  // neon rims on Sky Reef, glowing cracks on Magma Isle
  if (T.night || id === 'magma') { const rim = new THREE.Mesh(new THREE.TorusGeometry(HS * SQ3 * (R + 0.5), 0.12, 6, 72), new THREE.MeshBasicMaterial({ color: T.night ? 0x46e0ff : 0xff6a2a, transparent: true, opacity: 0.5 })); rim.rotation.x = Math.PI / 2; rim.position.y = -2.4; world.add(rim); ISLE.rim = rim; }
  decor(id, R, T);
}
function writeTiles(dt) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), c = new THREE.Color(); let colDirty = false;
  for (const t of ISLE.tiles) {
    let y = t.y, wob = 0, show = true;
    if (t.st === 1) { wob = Math.sin(ISLE.time * 40 + t.i) * 0.05 * Math.min(1, t.t * 2); const k = 0.5 + 0.5 * Math.sin(ISLE.time * 14); c.setRGB(t.shade * (1 + 0.6 * k), t.shade * (1 - 0.55 * k), t.shade * (1 - 0.55 * k)); ISLE.mesh.setColorAt(t.i, c); colDirty = true; }
    else if (t._warned) { t._warned = false; c.setRGB(t.shade, t.shade, t.shade); ISLE.mesh.setColorAt(t.i, c); colDirty = true; }
    if (t.st === 1) t._warned = true;
    if (t.st === 3) show = false;
    p.set(t.x + wob, show ? y : -500, t.z + wob * 0.6); q.setFromAxisAngle(UP, t.st === 2 ? t.t * 0.6 * (t.i % 2 ? 1 : -1) : 0);
    m.compose(p, q, s); ISLE.mesh.setMatrixAt(t.i, m);
  }
  ISLE.mesh.instanceMatrix.needsUpdate = true; if (colDirty && ISLE.mesh.instanceColor) ISLE.mesh.instanceColor.needsUpdate = true;
}
const UP = new THREE.Vector3(0, 1, 0);
function decor(id, R, T) {
  const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const far = HS * SQ3 * (R + 6);
  const rock = new THREE.MeshStandardMaterial({ color: col(T.side), roughness: 1, flatShading: true }), topM = new THREE.MeshStandardMaterial({ color: col(T.top), roughness: 0.9, flatShading: true });
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + rnd() * 0.4, d = far + rnd() * 50, s = 3 + rnd() * 6, g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.ConeGeometry(s, s * 1.8, 7), rock); b.rotation.x = Math.PI; b.position.y = -s * 0.9; g.add(b);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.95, 0.6, 7), topM); g.add(t);
    if (id === 'palm') for (let j = 0; j < 2; j++) g.add(palm(rnd, s));
    else if (id === 'magma') { const v = new THREE.Mesh(new THREE.ConeGeometry(s * 0.8, s * 1.4, 8), rock); v.position.y = s * 0.7; g.add(v); const gl = new THREE.Mesh(new THREE.CircleGeometry(s * 0.25, 10), new THREE.MeshBasicMaterial({ color: 0xff7a2a })); gl.rotation.x = -Math.PI / 2; gl.position.y = s * 1.4 + 0.02; g.add(gl); }
    else { const cr = new THREE.Mesh(new THREE.OctahedronGeometry(s * 0.5), new THREE.MeshBasicMaterial({ color: [0x46e0ff, 0xb67bff, 0xff8fd0][k % 3] })); cr.position.y = s * 0.9; cr.scale.y = 1.8; g.add(cr); }
    g.position.set(Math.cos(a) * d, -1 - rnd() * 6, Math.sin(a) * d); world.add(g); }
}
function palm(rnd, s) {
  const g = new THREE.Group(), h = 3 + rnd() * 2, trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, h, 6), new THREE.MeshStandardMaterial({ color: col(0x8a6a44), roughness: 1 }));
  trunk.position.y = h / 2; trunk.rotation.z = (rnd() - .5) * 0.3; g.add(trunk);
  const leaf = new THREE.MeshStandardMaterial({ color: col(0x3fae4a), roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
  for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 4), leaf); l.position.set(0, h, 0); l.rotation.set(Math.PI / 2 - 0.5, i / 6 * Math.PI * 2, 0, 'YXZ'); l.translateY(1.1); g.add(l); }
  g.position.set((rnd() - .5) * s, 0.3, (rnd() - .5) * s); return g;
}

/* ---------- fighter models ---------- */
const DARK = new THREE.MeshStandardMaterial({ color: col(0x1b1d26), roughness: 0.5 }), WHITE = new THREE.MeshStandardMaterial({ color: col(0xffffff), roughness: 0.3 });
const BEAN = (() => { const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24, a = t * Math.PI, r = Math.sin(a) * (0.5 + 0.07 * Math.cos(a)) ; pts.push(new THREE.Vector2(Math.max(0.001, r), -Math.cos(a) * 0.62 + 0.62)); } return new THREE.LatheGeometry(pts, 32); })();
const G = { body: new THREE.SphereGeometry(0.5, 28, 20), bean: BEAN, eye: new THREE.SphereGeometry(0.13, 16, 12), pupil: new THREE.SphereGeometry(0.075, 12, 8), shine: new THREE.SphereGeometry(0.028, 8, 6), cheek: new THREE.CircleGeometry(0.075, 14), brow: new THREE.BoxGeometry(0.15, 0.035, 0.03),
  glove: new THREE.SphereGeometry(0.2, 16, 12), cuff: new THREE.TorusGeometry(0.13, 0.05, 8, 16), shoe: new THREE.SphereGeometry(0.17, 14, 10), sole: new THREE.CylinderGeometry(0.15, 0.16, 0.05, 14), mouth: new THREE.TorusGeometry(0.06, 0.022, 8, 16, Math.PI) };
const GLOVE = new THREE.MeshStandardMaterial({ color: col(0xe8343c), roughness: 0.32, metalness: 0.05 }), CUFF = new THREE.MeshStandardMaterial({ color: col(0xf4f1e8), roughness: 0.6 }), SOLE = new THREE.MeshStandardMaterial({ color: col(0xf4f1e8), roughness: 0.7 }), CHEEK = new THREE.MeshBasicMaterial({ color: 0xff7a8a, transparent: true, opacity: 0.55, depthWrite: false }), OUTLINE = new THREE.MeshBasicMaterial({ color: 0x10121a, side: THREE.BackSide });
function hatMesh(h) {
  const g = new THREE.Group(), M = c => new THREE.MeshStandardMaterial({ color: col(c), roughness: 0.5 });
  if (h === 'cap') { const a = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xff5a5f)); g.add(a); const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.3), M(0xff5a5f)); b.position.set(0, 0.02, 0.36); g.add(b); }
  else if (h === 'party') { const a = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.62, 16), M(0xb67bff)); a.position.y = 0.3; g.add(a); const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), M(0xffc93c)); b.position.y = 0.64; g.add(b); }
  else if (h === 'flower') { for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M(0xff8fd0)); p.position.set(Math.cos(i * 1.256) * 0.12 + 0.18, 0.06, Math.sin(i * 1.256) * 0.12 + 0.1); g.add(p); } const c = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M(0xffc93c)); c.position.set(0.18, 0.09, 0.1); g.add(c); }
  else if (h === 'tophat') { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.48, 16), M(0x1b1d26)); a.position.y = 0.26; g.add(a); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16), M(0x1b1d26)); g.add(b); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.08, 16), M(0xff5a5f)); r.position.y = 0.08; g.add(r); }
  else if (h === 'cat') { for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 4), M(0xffb0d8)); e.position.set(s * 0.22, 0.08, 0); e.rotation.z = -s * 0.3; g.add(e); } }
  else if (h === 'horns') { for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 8), M(0xd23a3a)); e.position.set(s * 0.24, 0.06, 0.05); e.rotation.z = -s * 0.5; g.add(e); } }
  else if (h === 'halo') { const a = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 8, 24), new THREE.MeshBasicMaterial({ color: 0xfff1a0 })); a.rotation.x = Math.PI / 2; a.position.y = 0.32; g.add(a); }
  else if (h === 'crown') { const m = new THREE.MeshStandardMaterial({ color: col(0xffc93c), metalness: 0.8, roughness: 0.25 }); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 12, 1, true), m); b.position.y = 0.08; g.add(b); for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), m); s.position.set(Math.cos(i * 1.256) * 0.24, 0.22, Math.sin(i * 1.256) * 0.24); g.add(s); } }
  return g;
}
function makeFighterMesh(color, hat) {
  const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
  const hi = SAVE.set.gfx !== 'fast' && !isTouch;
  const mat = hi ? new THREE.MeshPhysicalMaterial({ color: col(color), roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 }) : new THREE.MeshStandardMaterial({ color: col(color), roughness: 0.4 });
  const belly = new THREE.MeshStandardMaterial({ color: col(new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5).getHex()), roughness: 0.55 });
  // body: a soft bean with a thin cartoon outline
  const body = new THREE.Mesh(G.bean, mat); body.position.y = 0.06; body.castShadow = true; rig.add(body);
  if (SAVE.set.gfx !== 'fast') { const ol = new THREE.Mesh(G.bean, OUTLINE); ol.scale.setScalar(1.045); ol.position.y = -0.02; body.add(ol); }
  const bel = new THREE.Mesh(G.body, belly); bel.scale.set(0.6, 0.66, 0.36); bel.position.set(0, 0.5, 0.33); rig.add(bel);
  // face
  const face = new THREE.Group(); face.position.set(0, 0.86, 0); rig.add(face); const eyes = [], brows = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.17, 0, 0.42); face.add(e); eyes.push(e);
    e.add(new THREE.Mesh(G.eye, WHITE)); const pu = new THREE.Mesh(G.pupil, DARK); pu.position.z = 0.08; e.add(pu); const sh = new THREE.Mesh(G.shine, new THREE.MeshBasicMaterial({ color: 0xffffff })); sh.position.set(0.03, 0.035, 0.145); e.add(sh);
    const br = new THREE.Mesh(G.brow, DARK); br.position.set(s * 0.17, 0.17, 0.47); face.add(br); brows.push(br);
    const ch = new THREE.Mesh(G.cheek, CHEEK); ch.position.set(s * 0.29, -0.13, 0.4); ch.rotation.y = s * 0.55; face.add(ch);
  }
  const mouth = new THREE.Mesh(G.mouth, DARK); mouth.position.set(0, -0.15, 0.48); mouth.rotation.z = Math.PI; face.add(mouth);
  // sneakers
  const feet = []; for (const s of [-1, 1]) { const f = new THREE.Group(); f.position.set(s * 0.21, 0.08, 0.04); const shoe = new THREE.Mesh(G.shoe, DARK); shoe.scale.set(0.95, 0.62, 1.35); f.add(shoe); const so = new THREE.Mesh(G.sole, SOLE); so.scale.set(1, 1, 1.4); so.position.y = -0.08; f.add(so); rig.add(f); feet.push(f); }
  // boxing gloves
  const glove = () => { const gg = new THREE.Group(), gl = new THREE.Mesh(G.glove, GLOVE); gl.scale.set(1, 0.95, 1.12); gg.add(gl); const th = new THREE.Mesh(G.glove, GLOVE); th.scale.setScalar(0.42); th.position.set(0, 0.09, 0.1); gg.add(th); const cu = new THREE.Mesh(G.cuff, CUFF); cu.position.z = -0.17; gg.add(cu); return gg; };
  const fistL = glove(), fistR = glove(); fistL.position.set(-0.58, 0.55, 0.12); fistR.position.set(0.58, 0.55, 0.12); rig.add(fistL, fistR);
  const hg = hatMesh(hat); hg.position.y = 1.27; rig.add(hg);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; g.add(shadow);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffc93c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); glow.scale.set(2.4, 2.4, 1); glow.position.set(0.5, 0.6, 0.6); rig.add(glow);
  const shield = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 12), new THREE.MeshBasicMaterial({ color: 0x46e0ff, transparent: true, opacity: 0.25, depthWrite: false })); shield.position.y = 0.65; shield.visible = false; rig.add(shield);
  const hammer = new THREE.Group(); { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), DARK); h.position.y = 0.45; hammer.add(h); const hd = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.32), new THREE.MeshStandardMaterial({ color: col(0xff5a5f), roughness: 0.4 })); hd.position.y = 0.95; hammer.add(hd); } hammer.position.set(0.58, 0.45, 0.12); hammer.visible = false; rig.add(hammer);
  return { g, rig, body, mat, fistL, fistR, shadow, glow, shield, hammer, eyes, brows, mouth, feet, blink: 2 + Math.random() * 3 };
}

/* ---------- match state ---------- */
// GM: the match. On the host (and offline) it is fully simulated here; online clients only mirror snapshots.
let GM = null, state = 'menu';
const ITEM_KINDS = ['bomb', 'mega', 'boots', 'shield', 'hammer'], ITEM_ICO = { bomb: '💣', mega: '🍄', boots: '👟', shield: '🛡️', hammer: '🔨' };
const ADM = { power: false };
function newFighter(id, o) {
  return { id, name: o.name, color: o.color, hat: o.hat, bot: !!o.bot, pid: o.pid || null, dummy: !!o.dummy, x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, face: 0, dmg: 0, alive: true, out: false, kos: 0, falls: 0, place: 0,
    inp: { mx: 0, mz: 0, p: false, d: 0 }, prevP: false, prevD: 0, atk: null, chg: 0, holdT: 0, dashT: 0, dashCd: 0, airDash: true, stun: 0, inv: 0, shieldT: 0, megaT: 0, bootsT: 0, hammer: 0, item: null,
    lastHit: -1, lastHitT: 0, respawnT: 0, combo: 0, comboT: 0, grounded: true, rad: 0.55, mass: 1, dashHit: null, skill: o.skill || 0.8, ai: { t: 0, tgt: -1, tgtT: 0, hold: 0, wantP: false, dashC: 0, mx: 0, mz: 0 }, vis: null, tag: null };
}
function spawnPoint(i, n, R) { const ring = Math.max(1, R - 1), a = i / n * Math.PI * 2 + 0.3, d = HS * SQ3 * ring * 0.92; return [Math.cos(a) * d, Math.sin(a) * d, Math.atan2(-Math.cos(a), -Math.sin(a))]; }
function isleRadius(n) { return clamp(3 + Math.ceil(n / 4), 4, 8); }

/* ---------- fighter step (authoritative) ---------- */
function stepFighter(f, dt) {
  if (!f.alive) { if (GM.mode === 'frenzy' && f.respawnT > 0) { f.respawnT -= dt; if (f.respawnT <= 0) respawn(f); } return; }
  f.stun = Math.max(0, f.stun - dt); f.inv = Math.max(0, f.inv - dt); f.dashCd = Math.max(0, f.dashCd - dt); f.shieldT = Math.max(0, f.shieldT - dt); f.megaT = Math.max(0, f.megaT - dt); f.bootsT = Math.max(0, f.bootsT - dt);
  f.lastHitT = Math.max(0, f.lastHitT - dt); f.comboT = Math.max(0, f.comboT - dt); if (f.comboT <= 0) f.combo = 0;
  const mega = f.megaT > 0; f.rad = mega ? 1.25 : 0.72; f.mass = mega ? 2.2 : 1; if (f.dummy && GM.tut && GM.tut.i < 5) f.mass = 5;
  const inp = GM.phase === 'play' ? f.inp : { mx: 0, mz: 0, p: false, d: f.prevD };
  let mx = inp.mx || 0, mz = inp.mz || 0; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const canAct = f.stun <= 0.05 && f.dashT <= 0;
  // dash
  if (inp.d !== f.prevD) { f.prevD = inp.d; if (f.dashCd <= 0 && (f.grounded || f.airDash) && f.stun < 0.2) {
      let dx = mx, dz = mz; if (Math.hypot(dx, dz) < 0.2) { dx = Math.sin(f.face); dz = Math.cos(f.face); } const l = Math.hypot(dx, dz); dx /= l; dz /= l;
      f.vx = dx * 22; f.vz = dz * 22; if (!f.grounded) { f.vy = Math.max(f.vy, 5.5); f.airDash = false; } f.face = Math.atan2(dx, dz); f.dashT = 0.17; f.dashCd = 0.7; f.inv = 0.12; f.stun = 0; f.dashHit = new Set(); f.atk = null; f.chg = 0;
      ev('d', f.id); if (GM.mode === 'tut' && f.id === GM.me) GM.tutDash = 1; } }
  // punch: press = jab (or throw a bomb), hold = charge a smash, release = smash
  if (inp.p && !f.prevP && canAct && !f.atk) {
    if (f.item === 'bomb') { throwBomb(f); f.item = null; f.holdT = -9; }
    else if (f.hammer > 0) { f.hammer--; startAtk(f, 'smash', 0.75); f.holdT = -9; }
    else { f.combo = f.comboT > 0 ? f.combo + 1 : 1; f.comboT = 0.6; startAtk(f, f.combo >= 3 ? 'jab3' : 'jab', 0); if (f.combo >= 3) f.combo = 0; f.holdT = 0; } }
  if (inp.p && f.holdT >= 0) { f.holdT += dt; if (f.holdT > 0.22 && !f.atk && canAct) { const was = f.chg; f.chg = Math.min(1, f.chg + dt * 1.5); if (was < 1 && f.chg >= 1) ev('m', f.id); } }
  if (!inp.p && f.prevP) { if (f.chg > 0.08 && !canAct) f.relQ = true; else { if (f.chg > 0.08) startAtk(f, 'smash', f.chg); f.chg = 0; } f.holdT = 0; }
  if (f.relQ && canAct && !f.atk) { f.relQ = false; if (f.chg > 0.08) startAtk(f, 'smash', f.chg); f.chg = 0; }
  if (!inp.p) f.holdT = 0;
  f.prevP = inp.p;
  // movement
  const charging = f.chg > 0;
  if (f.dashT > 0) { f.dashT -= dt; if (f.dashT <= 0) { f.vx *= 0.45; f.vz *= 0.45; } }
  else if (f.stun <= 0) {
    const sp = (f.bootsT > 0 ? 12.6 : 9.2) * (charging ? 0.45 : 1) * (mega ? 0.9 : 1) * (f.atk ? 0.6 : 1), acc = f.grounded ? 70 : 16;
    f.vx = approach(f.vx, mx * sp, acc * dt); f.vz = approach(f.vz, mz * sp, acc * dt);
    if (ml > 0.2 && !f.atk) { const want = Math.atan2(mx, mz); f.face += angDiff(f.face, want) * Math.min(1, dt * 16); }
  } else if (f.grounded) { const k = Math.exp(-3.2 * dt); f.vx *= k; f.vz *= k; }
  // attack timeline
  if (f.atk) { const a = f.atk; a.t += dt; const act = a.kind === 'smash' ? [0.07, 0.2] : [0.05, 0.15]; if (a.t >= act[0] && a.t <= act[1]) hitScan(f); if (a.t > a.dur) f.atk = null; }
  // dash shove
  if (f.dashT > 0) for (const o of GM.fighters) { if (o === f || !o.alive || o.inv > 0 || f.dashHit.has(o.id)) continue; const dx = o.x - f.x, dz = o.z - f.z, d = Math.hypot(dx, dz); if (d < f.rad + o.rad + 0.15 && Math.abs(o.y - f.y) < 1.2) { f.dashHit.add(o.id); applyHit(f, o, 'dash', 0, dx / (d || 1), dz / (d || 1)); } }
  // integrate + ground
  f.x += f.vx * dt; f.z += f.vz * dt;
  const t = tileAt(f.x, f.z), onT = walkable(t) && Math.hypot(f.x - t.x, f.z - t.z) < HS * 0.98;
  if (onT && f.y <= 0.001 && f.y > -0.9 && f.vy <= 0) { f.y = 0; f.vy = 0; if (!f.grounded) { f.grounded = true; f.airDash = true; } }
  else { f.grounded = false; f.vy -= 30 * dt; f.y += f.vy * dt; }
  if (f.y < -0.9 && f.grounded) f.grounded = false;
  if (f.y < -9) knockOut(f);
}
function startAtk(f, kind, chg) { f.atk = { kind, t: 0, dur: kind === 'smash' ? 0.36 : kind === 'jab3' ? 0.26 : 0.2, hit: new Set(), chg }; ev('w', f.id, kind === 'smash' ? 2 : 1); }
function hitScan(f) {
  const a = f.atk, fx = Math.sin(f.face), fz = Math.cos(f.face), reach = (a.kind === 'smash' ? 1.05 : 0.8) + (f.megaT > 0 ? 0.45 : 0);
  for (const o of GM.fighters) { if (o === f || !o.alive || a.hit.has(o.id) || o.inv > 0) continue;
    const dx = o.x - f.x, dz = o.z - f.z, d = Math.hypot(dx, dz); if (d > f.rad + o.rad + reach || Math.abs(o.y - f.y) > 1.3) continue;
    if (d > 0.3 && (dx * fx + dz * fz) / d < 0.3) continue; a.hit.add(o.id);
    const nx = d > 0.01 ? dx / d : fx, nz = d > 0.01 ? dz / d : fz; applyHit(f, o, a.kind, a.chg, nx * 0.6 + fx * 0.4, nz * 0.6 + fz * 0.4); }
}
function applyHit(f, o, kind, chg, nx, nz) {
  if (GM.mode === 'tut' && f && f.id === GM.me) { if (kind === 'jab' || kind === 'jab3') GM.tutJab = 1; if (kind === 'smash' && chg > 0.3) GM.tutSmash = 1; }
  const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
  let dmg, kb;
  if (kind === 'jab') { dmg = 5; kb = 3.2 + o.dmg * 0.035; }
  else if (kind === 'jab3') { dmg = 8; kb = 6 + o.dmg * 0.07; }
  else if (kind === 'dash') { dmg = 4; kb = 5.5 + o.dmg * 0.045; }
  else if (kind === 'bomb') { dmg = 15; kb = 10 + o.dmg * 0.12; }
  else { dmg = 11 + 13 * chg; kb = (8 + 10 * chg) + o.dmg * (0.1 + 0.07 * chg); }
  if (f && f.megaT > 0) kb *= 1.3; if (f && !f.bot && ADM.power && f.id === GM.me) kb *= 3;
  kb /= o.mass; if (o.shieldT > 0) { kb *= 0.2; dmg = 0; }
  o.dmg = Math.min(999, o.dmg + dmg); o.vx = nx * kb; o.vz = nz * kb; o.vy = Math.max(o.vy, kb * 0.36 + (kind === 'smash' || kind === 'bomb' ? 2.5 : 1)); o.grounded = false; o.y = Math.max(o.y, 0.02);
  o.stun = 0.16 + kb * 0.022; o.atk = null; o.dashT = 0;
  if (f) { o.lastHit = f.id; o.lastHitT = 4; }
  ev('h', Math.round(o.x * 10), Math.round((o.y + 0.7) * 10), Math.round(o.z * 10), Math.round(kb), o.id, f ? f.id : -1);
}
function knockOut(f) {
  f.alive = false; f.falls++; const by = f.lastHitT > 0 ? GM.fighters[f.lastHit] : null; if (by && by !== f) by.kos++; if (GM.mode === 'tut' && f.dummy && by && by.id === GM.me) GM.tutKO = 1;
  ev('k', f.id, by && by !== f ? by.id : -1, Math.round(f.x * 10), Math.round(f.z * 10));
  if (GM.mode === 'elim') { f.out = true; f.place = GM.fighters.filter(o => o.alive).length + 1; GM.order.push(f.id); }
  else f.respawnT = 2.2;
  f.atk = null; f.chg = 0; f.item = null; f.hammer = 0; f.megaT = f.bootsT = f.shieldT = 0;
}
function respawn(f) {
  const ok = ISLE.tiles.filter(t => t.st === 0 && t.ring <= Math.max(1, GM.ring - 1)); const t = ok[(Math.random() * ok.length) | 0] || ISLE.tiles[0];
  Object.assign(f, { x: t.x, z: t.z, y: 9, vx: 0, vz: 0, vy: -4, dmg: 0, alive: true, inv: 2.2, stun: 0, grounded: false, lastHitT: 0, airDash: true });
  ev('r', f.id);
}
function collideFighters() {
  const fs = GM.fighters;
  for (let i = 0; i < fs.length; i++) { const a = fs[i]; if (!a.alive) continue; for (let j = i + 1; j < fs.length; j++) { const b = fs[j]; if (!b.alive || Math.abs(a.y - b.y) > 1.2) continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.rad + b.rad; if (d > 0.001 && d < m) { const p = (m - d), nx = dx / d, nz = dz / d, wa = b.mass / (a.mass + b.mass); a.x -= nx * p * wa; a.z -= nz * p * wa; b.x += nx * p * (1 - wa); b.z += nz * p * (1 - wa); } } }
}

/* ---------- items ---------- */
function spawnCrate() {
  const ok = ISLE.tiles.filter(t => t.st === 0 && t.ring < GM.ring && !GM.crates.some(c => c.t === t)); if (!ok.length) return;
  const t = ok[(Math.random() * ok.length) | 0], kind = ITEM_KINDS[(Math.random() * ITEM_KINDS.length) | 0];
  GM.crates.push({ id: GM.nid++, x: t.x, z: t.z, kind, t, y: 6, vy: 0 });
}
function stepItems(dt) {
  if (GM.mode === 'tut') GM.crateT = 99; GM.crateT -= dt; const maxC = 2 + Math.ceil(GM.fighters.length / 5);
  if (GM.crateT <= 0 && GM.phase === 'play') { GM.crateT = 4 + Math.random() * 3; if (GM.crates.length < maxC) spawnCrate(); }
  for (let i = GM.crates.length - 1; i >= 0; i--) { const c = GM.crates[i];
    if (!walkable(c.t)) { GM.crates.splice(i, 1); continue; }
    if (c.y > 0) { c.vy -= 25 * dt; c.y = Math.max(0, c.y + c.vy * dt); }
    for (const f of GM.fighters) { if (!f.alive || Math.hypot(f.x - c.x, f.z - c.z) > f.rad + 0.75 || f.y > 1.5) continue;
      if (c.kind === 'bomb') f.item = 'bomb'; else if (c.kind === 'mega') f.megaT = 8; else if (c.kind === 'boots') f.bootsT = 7; else if (c.kind === 'shield') f.shieldT = 5; else f.hammer = 3;
      if (GM.mode === 'tut' && f.id === GM.me) GM.tutPick = 1; ev('p', f.id, ITEM_KINDS.indexOf(c.kind)); GM.crates.splice(i, 1); break; } }
  for (let i = GM.bombs.length - 1; i >= 0; i--) { const b = GM.bombs[i]; b.t += dt;
    const t = tileAt(b.x, b.z), ground = walkable(t) && b.y <= 0.35;
    if (ground) { b.y = 0.35; b.vy = 0; const k = Math.exp(-5 * dt); b.vx *= k; b.vz *= k; } else { b.vy -= 25 * dt; b.y += b.vy * dt; }
    b.x += b.vx * dt; b.z += b.vz * dt;
    let boom = b.t > 1.6; if (!boom && b.t > 0.15) for (const f of GM.fighters) if (f.alive && f.id !== b.owner && Math.hypot(f.x - b.x, f.z - b.z) < f.rad + 0.4 && Math.abs(f.y + 0.5 - b.y) < 1.2) { boom = true; break; }
    if (b.y < -6) { GM.bombs.splice(i, 1); ev('s', Math.round(b.x * 10), Math.round(b.z * 10)); continue; }
    if (boom) { GM.bombs.splice(i, 1); explode(b); } }
}
function throwBomb(f) { GM.bombs.push({ id: GM.nid++, x: f.x + Math.sin(f.face) * 0.7, z: f.z + Math.cos(f.face) * 0.7, y: f.y + 1, vx: Math.sin(f.face) * 10 + f.vx * 0.3, vz: Math.cos(f.face) * 10 + f.vz * 0.3, vy: 6, t: 0, owner: f.id }); ev('w', f.id, 1); }
function explode(b) {
  ev('e', Math.round(b.x * 10), Math.round(b.y * 10), Math.round(b.z * 10));
  const owner = GM.fighters[b.owner];
  for (const f of GM.fighters) { if (!f.alive || f.inv > 0) continue; const dx = f.x - b.x, dz = f.z - b.z, d = Math.hypot(dx, dz); if (d > 3.4 || Math.abs(f.y - b.y) > 2.5) continue;
    const k = 1 - d / 3.4 * 0.5, o0 = f.dmg; applyHit(owner, f, 'bomb', 0, d > 0.05 ? dx / d : 1, d > 0.05 ? dz / d : 0); f.vx *= k; f.vz *= k; if (f === owner) { f.dmg = o0 + 8; } }
}

/* ---------- the island crumbles ---------- */
function stepTiles(dt) {
  ISLE.time += dt; let moved = false;
  for (const t of ISLE.tiles) {
    if (t.st === 1) { t.t += dt; moved = true; if (t.t >= t.warn) { t.st = 2; t.t = 0; ev('f', t.i); } }
    else if (t.st === 2) { t.t += dt; t.vy = (t.vy || 0) - 22 * dt; t.y += t.vy * dt; moved = true; if (t.y < -40) { t.st = 3; t.y = -40; t.vy = 0; t.t = 0; } }
    else if (t.st === 3 && t.regrow) { t.t += dt; if (t.t > t.regrow) { t.st = 4; t.t = 0; t.regrow = 0; } }
    else if (t.st === 4) { t.t += dt; moved = true; t.y = lerp(-14, 0, Math.min(1, t.t / 1.3)); if (t.t >= 1.3) { t.st = 0; t.y = 0; } }
  }
  if (moved || ISLE.dirty) { writeTiles(dt); ISLE.dirty = false; }
}
function warnTile(t, warn, regrow) { if (t.st !== 0) return; t.st = 1; t.t = 0; t.warn = warn; t.regrow = regrow || 0; t.vy = 0; }
function shrinkSchedule(dt) {
  if (GM.phase !== 'play' || GM.mode === 'tut') return; GM.shrinkT -= dt;
  if (GM.mode === 'elim') {
    if (GM.shrinkT <= 0 && GM.ring > 1) { for (const t of ISLE.tiles) if (t.ring === GM.ring) warnTile(t, 2.8); GM.ring--; GM.shrinkT = GM.ring > 3 ? 6.5 : 8.5; ev('x', GM.ring); }
    else if (GM.shrinkT <= 0 && GM.ring === 1) { const ok = ISLE.tiles.filter(t => t.st === 0 && t.ring === 1); if (ok.length > 2) warnTile(ok[(Math.random() * ok.length) | 0], 2.5); GM.shrinkT = 7; }
  } else {
    if (GM.shrinkT <= 0) { GM.shrinkT = 2.2; const ok = ISLE.tiles.filter(t => t.st === 0 && t.ring >= 1); for (let k = 0; k < 1 + Math.floor(GM.fighters.length / 8); k++) { const t = ok[(Math.random() * ok.length) | 0]; if (t) warnTile(t, 2.2, 8 + Math.random() * 4); } }
    if (GM.t > 90 && GM.ring > ISLE.R - 2) { for (const t of ISLE.tiles) if (t.ring === GM.ring) { warnTile(t, 2.8); t.regrow = 0; } GM.ring--; }
  }
}

/* ---------- bots ---------- */
function botThink(f, dt) {
  const A = f.ai; A.t -= dt; if (!f.alive) { f.inp.p = false; return; }
  const t = tileAt(f.x, f.z), safeR = HS * SQ3 * Math.max(0.6, GM.ring - 1.3);
  const toC = Math.hypot(f.x, f.z), inDanger = !walkable(t) || (t && t.st === 1) || (t && t.ring > GM.ring);
  if (A.t <= 0) { A.t = 0.1 + (1 - f.skill) * 0.25 + Math.random() * 0.1;
    // pick / keep a target
    A.tgtT -= 0.15; let tg = GM.fighters[A.tgt]; if (!tg || !tg.alive || A.tgtT <= 0) { let best = null, bd = 1e9; for (const o of GM.fighters) { if (o === f || !o.alive) continue; const d = Math.hypot(o.x - f.x, o.z - f.z) - (Math.hypot(o.x, o.z) > safeR ? 3 : 0) + Math.random() * 3; if (d < bd) { bd = d; best = o; } } A.tgt = best ? best.id : -1; A.tgtT = 2 + Math.random() * 3; tg = best; }
    let gx = 0, gz = 0;
    // crates
    let crate = null; if (!f.item) { let cd = 7; for (const c of GM.crates) { const d = Math.hypot(c.x - f.x, c.z - f.z); if (d < cd) { cd = d; crate = c; } } }
    if (inDanger || toC > safeR) { gx = -f.x; gz = -f.z; }
    else if (crate) { gx = crate.x - f.x; gz = crate.z - f.z; }
    else if (tg) { const dx = tg.x - f.x, dz = tg.z - f.z, d = Math.hypot(dx, dz);
      // approach from the island side so the hit pushes them outward
      const ox = tg.x - (tg.x / (Math.hypot(tg.x, tg.z) || 1)) * 1.4 - f.x, oz = tg.z - (tg.z / (Math.hypot(tg.x, tg.z) || 1)) * 1.4 - f.z;
      if (d > 2.4) { gx = ox; gz = oz; } else { gx = dx; gz = dz; }
      const range = f.rad + tg.rad + 0.75;
      if (d < range + 0.2) { if (f.item === 'bomb') A.wantP = Math.random() < 0.05; else if (tg.dmg > 50 && Math.random() < 0.35 * f.skill && !A.hold) { A.hold = 0.35 + Math.random() * 0.5; } else A.wantP = Math.random() < 0.55 * f.skill; }
      else if (f.item === 'bomb' && d > 3.5 && d < 8 && Math.random() < 0.25) A.wantP = true;
      if (d > 2.6 && d < 5.5 && f.dashCd <= 0 && Math.random() < 0.06 * f.skill) A.dashC++;
    }
    const gl = Math.hypot(gx, gz); if (gl > 0.01) { A.mx = gx / gl; A.mz = gz / gl; } else { A.mx = A.mz = 0; }
    // don't walk off the edge
    const ahead = tileAt(f.x + A.mx * 1.6, f.z + A.mz * 1.6); if (f.grounded && (!walkable(ahead) || ahead.st === 1) && !inDanger) { const l = Math.hypot(f.x, f.z) || 1; A.mx = -f.x / l; A.mz = -f.z / l; }
    if (Math.random() < 0.08 * (1 - f.skill)) { A.mx += (Math.random() - .5); A.mz += (Math.random() - .5); }
  }
  // recovery: off the island in the air -> head home and air-dash
  if (!f.grounded && !walkable(t) && f.y < 0.5) { const l = Math.hypot(f.x, f.z) || 1; A.mx = -f.x / l; A.mz = -f.z / l; if (f.airDash && f.vy < 2 && f.dashCd <= 0 && Math.random() < 0.5 + f.skill * 0.4) A.dashC++; }
  let p = false; if (A.hold > 0) { A.hold -= dt; p = A.hold > 0; } else if (A.wantP) { p = !f.prevP; A.wantP = false; }
  f.inp.mx = A.mx; f.inp.mz = A.mz; f.inp.p = p; f.inp.d = A.dashC;
}

/* ---------- events (shared by host and clients for sound + fx) ---------- */
function ev(...a) { if (GM && GM.evq) GM.evq.push(a); }

/* ---------- match flow ---------- */
function rosterOffline() {
  const n = SAVE.count, ro = [{ name: SAVE.name || 'You', color: COLORS[SAVE.color], hat: SAVE.hat, bot: false, pid: 'me' }];
  const names = RIVALS.slice().sort(() => Math.random() - 0.5), hats = Object.keys(HATS);
  for (let i = 1; i < n; i++) ro.push({ name: names[(i - 1) % names.length], color: COLORS[(SAVE.color + i * 5) % COLORS.length], hat: Math.random() < 0.55 ? hats[1 + ((Math.random() * (hats.length - 1)) | 0)] : 'none', bot: true, skill: 0.55 + Math.random() * 0.4 });
  return ro;
}
function startMatch(cfg, roster, meIdx) {
  clearMatchVis(); const n = roster.length, R = cfg.R || isleRadius(n);
  buildIsle(cfg.isle, R);
  GM = { mode: cfg.mode, isle: cfg.isle, phase: 'count', t: -3.2, fighters: roster.map((o, i) => newFighter(i, o)), me: meIdx, order: [], crates: [], bombs: [], crateT: 3, nid: 1, ring: R, shrinkT: cfg.mode === 'elim' ? 18 : 4, evq: [], speed: 1, net: NET.role, cd: 9, spec: -1, ended: false, fx: { crates: new Map(), bombs: new Map() } };
  GM.fighters.forEach((f, i) => { const [x, z, face] = spawnPoint(i, n, R); f.x = x; f.z = z; f.face = face; f.tx = x; f.tz = z; });
  for (const f of GM.fighters) makeVis(f);
  state = 'play'; camSnap = true; hideAllOv(); $('menu').classList.add('hide'); $('hud').classList.remove('hide'); if (isTouch) $('touch').classList.remove('hide'); $('spec').classList.add('hide'); $('feed').textContent = '';
  audio(); fitTouch(); $('meDot').style.background = hex(GM.fighters[meIdx].color);
  document.body.classList.toggle('tut', cfg.mode === 'tut'); $('tutBox').classList.add('hide');
}
function clearMatchVis() { if (!GM) return; for (const f of GM.fighters) { if (f.vis) world.remove(f.vis.g); if (f.tag) f.tag.remove(); } for (const m of GM.fx.crates.values()) world.remove(m); for (const m of GM.fx.bombs.values()) world.remove(m); sparks.clear(); dust.clear(); splash.clear(); boomFx.clear(); }
function makeVis(f) { f.vis = makeFighterMesh(f.color, f.hat); world.add(f.vis.g); const t = document.createElement('div'); t.className = 'tag'; t.innerHTML = '<span></span><b></b>'; t.children[0].textContent = f.id === GM.me ? 'YOU' : f.name; if (f.id === GM.me) t.classList.add('me'); $('tags').appendChild(t); f.tag = t; }
function hostStep(dt) {
  GM.t += dt;
  if (GM.phase === 'count' && GM.t >= 0) { GM.phase = 'play'; ev('g'); }
  for (const f of GM.fighters) if (f.dummy) { f.inp.mx = f.inp.mz = 0; f.inp.p = false; } else if (f.bot) botThink(f, dt);
  for (const f of GM.fighters) stepFighter(f, dt);
  collideFighters(); stepItems(dt); shrinkSchedule(dt); stepTiles(dt);
  if (GM.phase === 'play' && !GM.ended) {
    const alive = GM.fighters.filter(f => f.alive);
    if (GM.mode === 'elim' && alive.length <= 1) { if (alive[0]) { alive[0].place = 1; GM.order.push(alive[0].id); } endMatch(); }
    if (GM.mode === 'frenzy' && GM.t >= 120) endMatch();
  }
  if (GM.mode === 'tut') stepTut(dt);
}
/* ---------- tutorial: a small island, a training dummy, 6 steps ---------- */
const TK = (k, t) => isTouch ? t : k;
const TUT = [
  { t: () => TK('Move around with WASD or the arrow keys', 'Move around with the joystick (left side)'), need: 1.4, f: (me, dt) => Math.hypot(me.inp.mx, me.inp.mz) > 0.3 ? dt : 0 },
  { t: () => TK('Walk up to the dummy and tap J / Space to jab it 3 times', 'Walk up to the dummy and tap PUNCH 3 times'), need: 3, f: () => GM.tutJab ? (GM.tutJab = 0, 1) : 0 },
  { t: () => TK('HOLD J / Space to charge, let go to SMASH the dummy', 'HOLD PUNCH to charge, let go to SMASH the dummy'), need: 1, f: () => GM.tutSmash ? 1 : 0 },
  { t: () => TK('Dash with K / Shift (twice)', 'Tap DASH (twice)'), need: 2, f: () => GM.tutDash ? (GM.tutDash = 0, 1) : 0 },
  { t: () => 'Grab the crate that just dropped', need: 1, start: me => { const t = ISLE.tiles.filter(t => t.ring === 1)[(Math.random() * 6) | 0]; GM.crates.push({ id: GM.nid++, x: t.x, z: t.z, kind: 'boots', t, y: 6, vy: 0 }); }, f: () => GM.tutPick ? 1 : 0 },
  { t: () => "The dummy is at 120% now. Smash it off the island!", need: 1, start: () => { const d = GM.fighters[1]; d.dmg = 120; }, f: () => GM.tutKO ? 1 : 0 },
];
function stepTut(dt) {
  const T = GM.tut; if (!T || T.done || GM.phase !== 'play') return; const st = TUT[T.i], me = GM.fighters[GM.me];
  if (!T.started) { T.started = true; T.p = 0; GM.tutJab = GM.tutSmash = GM.tutDash = GM.tutPick = GM.tutKO = 0; if (st.start) st.start(me); $('tutStep').textContent = 'TUTORIAL · STEP ' + (T.i + 1) + ' / ' + TUT.length; $('tutTxt').textContent = st.t(); $('tutBar').style.width = '0%'; }
  T.p += st.f(me, dt); $('tutBar').style.width = Math.min(100, T.p / st.need * 100) + '%';
  if (T.p >= st.need) { tone(880, 0.15, 'triangle', 0.12); T.i++; T.started = false; if (T.i >= TUT.length) { tutDone(); return; } }
  const d = GM.fighters[1]; if (d.alive && T.i < 5) d.dmg = Math.min(d.dmg, 60);
}
function tutDone() {
  const first = !SAVE.tutDone; SAVE.tutDone = true; SAVE.howSeen = true; if (first) SAVE.coins += 250; save(); GM.tut.done = true; GM.phase = 'end';
  $('tutBox').classList.add('hide'); $('big').innerHTML = 'NICE!<small>tutorial complete</small>'; beep(880, 0.4); burst(sparks, GM.fighters[GM.me].x, 2, GM.fighters[GM.me].z, 50, 10, 10, 1);
  const g = GM; setTimeout(() => { if (GM !== g) return; $('resList').textContent = ''; $('resTitle').textContent = '🎓 Tutorial complete!'; $('resInfo').textContent = (first ? '+◎ 250 coins · ' : '') + "You're ready. Jump into Quick Play, or host a room for your friends!"; $('againBtn').textContent = '▶ QUICK PLAY'; GM.tutAgain = true; $('resOv').classList.remove('hide'); $('big').innerHTML = ''; }, 1400);
}
function startTutorial() { audio(); startMatch({ mode: 'tut', isle: 'palm', R: 3 }, [{ name: SAVE.name || 'You', color: COLORS[SAVE.color], hat: SAVE.hat, bot: false, pid: 'me' }, { name: 'Dummy', color: 0xd8d2c4, hat: 'none', bot: true, dummy: true }], 0); GM.tut = { i: 0, p: 0, started: false }; GM.t = -1.2; $('tutBox').classList.remove('hide'); }
function standings() {
  const fs = GM.fighters.slice();
  if (GM.mode === 'elim') fs.sort((a, b) => (a.place || 99) - (b.place || 99) || b.kos - a.kos); else fs.sort((a, b) => b.kos - a.kos || a.falls - b.falls || a.dmg - b.dmg);
  return fs.map((f, i) => ({ id: f.id, name: f.name, color: f.color, kos: f.kos, falls: f.falls, place: i + 1 }));
}
function endMatch() { GM.ended = true; GM.phase = 'end'; const res = standings(), g = GM; GM.res = res; ev('end'); if (NET.role === 'host') netSend({ t: 'end', res }); setTimeout(() => { if (GM === g) showResults(res); }, 1600); }
function showResults(res) {
  if (!GM || state !== 'play') return; const me = res.find(r => r.id === GM.me), n = res.length, place = me ? me.place : n;
  const win = place === 1, earn = 20 + (win ? 150 : place === 2 ? 80 : place === 3 ? 50 : place <= Math.ceil(n / 2) ? 25 : 0) + (me ? me.kos * 15 : 0);
  SAVE.coins += earn; SAVE.games++; if (win) SAVE.wins++; SAVE.kos += me ? me.kos : 0; save();
  $('resTitle').textContent = win ? '🏆 You won!' : 'You placed #' + place + ' of ' + n;
  const list = $('resList'); list.textContent = '';
  for (const r of res) { const d = document.createElement('div'); if (r.id === GM.me) d.className = 'me'; d.innerHTML = '<span></span><i></i><span></span><span></span><span></span>'; d.children[0].textContent = r.place + '.'; d.children[1].style.background = hex(r.color); d.children[2].textContent = r.name; d.children[3].textContent = r.kos + ' KO'; d.children[4].textContent = GM.mode === 'frenzy' ? r.falls + ' falls' : ''; list.appendChild(d); }
  $('resInfo').textContent = '+◎ ' + earn + ' coins' + (me && me.kos ? ' · ' + me.kos + ' knockouts' : '') + (NET.role === 'client' ? ' · the host starts the next match' : '');
  $('againBtn').textContent = NET.role === 'client' ? '↻ BACK TO ROOM' : NET.role === 'host' ? '↻ BACK TO ROOM' : '↻ AGAIN';
  $('resOv').classList.remove('hide'); $('big').innerHTML = ''; tone(win ? 660 : 330, 0.3, 'triangle', 0.12); if (win) setTimeout(() => tone(880, 0.4, 'triangle', 0.12), 160);
}
function quitToMenu() { setTimeout(() => { try { window.__nbUpd && window.__nbUpd(); } catch (e) {} }, 1200); if (NET.role !== 'off') netLeave(); clearMatchVis(); GM = null; state = 'menu'; hideAllOv(); $('hud').classList.add('hide'); $('touch').classList.add('hide'); $('menu').classList.remove('hide'); menuScene(); renderMenu(); }
function hideAllOv() { for (const id of ['resOv', 'pauseOv', 'lobbyOv', 'howOv']) $(id).classList.add('hide'); $('tutBox').classList.add('hide'); }

/* ---------- visuals ---------- */
const crateGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9), crateTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ffc93c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a5a10'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.beginPath(); g.moveTo(6, 6); g.lineTo(w - 6, h - 6); g.stroke(); g.fillStyle = '#1d1606'; g.font = 'bold 34px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h / 2 + 2); });
const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.6, emissive: col(0x553a00), emissiveIntensity: 0.4 }), bombGeo = new THREE.SphereGeometry(0.32, 14, 10), bombMat = new THREE.MeshStandardMaterial({ color: col(0x22242c), roughness: 0.3, metalness: 0.4, emissive: col(0xff3a20), emissiveIntensity: 0 });
function syncVis(dt, time) {
  for (const f of GM.fighters) {
    const v = f.vis; if (!v) continue;
    if (NET.role === 'client') { const k = 1 - Math.exp(-18 * dt); f.x = lerp(f.x, f.tx, k); f.z = lerp(f.z, f.tz, k); f.y = lerp(f.y, f.ty, k); f.face += angDiff(f.face, f.tface) * k; }
    const vis = f.alive || f.y > -12; v.g.visible = vis; if (!vis) { f.tag.style.display = 'none'; continue; }
    v.g.position.set(f.x, f.y, f.z); v.rig.rotation.y = f.face;
    const sc = (f.megaT > 0 ? 1.75 : 1) * 1.38; v.rig.scale.setScalar(lerp(v.rig.scale.x, sc, Math.min(1, dt * 8)));
    // squash, bob, punches
    const moving = Math.hypot(f.vx, f.vz) > 1 && f.grounded; v.rig.position.y = moving ? Math.abs(Math.sin(time * 18 + f.id)) * 0.09 : 0; v.rig.rotation.z = moving ? Math.sin(time * 18 + f.id) * 0.06 : 0;
    v.body.scale.set(1 + (f.chg > 0 ? f.chg * 0.08 : 0), 1 - (f.chg > 0 ? f.chg * 0.1 : 0), 1 + (f.chg > 0 ? f.chg * 0.08 : 0));
    // face: blink, angry brows when attacking/charging, 'O' mouth when hit
    v.blink -= dt; const bl = v.blink < 0.12 ? 0.12 : 1; if (v.blink < 0) v.blink = 2 + Math.random() * 3.5; for (const e of v.eyes) e.scale.y = f.stun > 0 ? 1.2 : bl;
    const angry = f.chg > 0 || !!f.atk; v.brows[0].rotation.z = angry ? -0.45 : 0.08; v.brows[1].rotation.z = angry ? 0.45 : -0.08; v.brows[0].position.y = v.brows[1].position.y = angry ? 0.14 : 0.18;
    if (f.stun > 0 && !f.grounded) { v.mouth.scale.set(0.8, 1.6, 1); v.mouth.rotation.z = 0; } else { v.mouth.scale.set(1, 1, 1); v.mouth.rotation.z = angry ? 0 : Math.PI; }
    // walk cycle
    const ph2 = moving ? Math.sin(time * 18 + f.id) : 0; v.feet[0].position.z = 0.04 + ph2 * 0.16; v.feet[1].position.z = 0.04 - ph2 * 0.16; v.feet[0].position.y = 0.08 + Math.max(0, ph2) * 0.06; v.feet[1].position.y = 0.08 + Math.max(0, -ph2) * 0.06;
    const a = f.atk, ph = a ? Math.min(1, a.t / (a.kind === 'smash' ? 0.12 : 0.08)) * (a.t > a.dur * 0.6 ? Math.max(0, 1 - (a.t - a.dur * 0.6) / (a.dur * 0.4)) : 1) : 0;
    const right = !a || a.kind !== 'jab' || (f.combo % 2 === 1);
    v.fistR.position.set(0.58 - (a && right ? ph * 0.35 : 0), 0.55, 0.12 + (a && right ? ph * (a.kind === 'smash' ? 0.95 : 0.75) : 0) - (f.chg > 0 ? 0.25 * f.chg : 0));
    v.fistL.position.set(-0.58 + (a && (!right || a.kind === 'smash') ? ph * 0.35 : 0), 0.55, 0.12 + (a && (!right || a.kind === 'smash') ? ph * 0.75 : 0));
    v.fistR.rotation.x = a && right ? -0.3 * ph : 0; v.fistL.rotation.x = a && (!right || a.kind === 'smash') ? -0.3 * ph : 0;
    v.glow.material.opacity = f.chg > 0 ? 0.4 + f.chg * 0.6 * (0.7 + 0.3 * Math.sin(time * 30)) : 0; v.glow.material.color.setHex(f.chg >= 1 ? 0xff5a5f : 0xffc93c); v.glow.scale.setScalar(f.chg >= 1 ? 3.2 + Math.sin(time * 24) * 0.4 : 2.4);
    v.shield.visible = f.shieldT > 0; v.hammer.visible = f.hammer > 0; v.fistR.visible = !v.hammer.visible; if (v.hammer.visible) v.hammer.rotation.x = a ? -ph * 1.8 : -0.3;
    v.rig.rotation.x = f.stun > 0 && !f.grounded ? Math.sin(time * 20) * 0.4 : f.dashT > 0 ? 0.35 : 0;
    v.mat.emissive.setRGB(f.inv > 0 && Math.floor(time * 12) % 2 ? 0.4 : 0, f.inv > 0 && Math.floor(time * 12) % 2 ? 0.4 : 0, f.inv > 0 && Math.floor(time * 12) % 2 ? 0.4 : 0);
    // blob shadow on the tile below
    const t = tileAt(f.x, f.z); if (walkable(t) && f.y > -0.5) { v.shadow.visible = true; v.shadow.position.y = -f.y + 0.03; v.shadow.scale.setScalar(sc * clamp(1 - f.y * 0.08, 0.4, 1)); } else v.shadow.visible = false;
    if (f.dashT > 0 && f.grounded && Math.random() < 0.6) dust.emit(f.x, 0.2, f.z, -f.vx * 0.05, 0.6, -f.vz * 0.05, 0.45);
  }
  // crates + bombs
  const seen = new Set();
  for (const c of GM.crates) { seen.add(c.id); let m = GM.fx.crates.get(c.id); if (!m) { m = new THREE.Mesh(crateGeo, crateMat); m.castShadow = true; world.add(m); GM.fx.crates.set(c.id, m); } m.position.set(c.x, (c.y || 0) + 0.55 + Math.sin(time * 3 + c.id) * 0.1, c.z); m.rotation.y = time * 1.2 + c.id; }
  for (const [id, m] of GM.fx.crates) if (!seen.has(id)) { world.remove(m); GM.fx.crates.delete(id); }
  seen.clear();
  for (const b of GM.bombs) { seen.add(b.id); let m = GM.fx.bombs.get(b.id); if (!m) { m = new THREE.Mesh(bombGeo, bombMat.clone()); world.add(m); GM.fx.bombs.set(b.id, m); } m.position.set(b.x, b.y, b.z); m.material.emissiveIntensity = Math.floor(time * (6 + (b.t || 0) * 8)) % 2 ? 0.9 : 0; }
  for (const [id, m] of GM.fx.bombs) if (!seen.has(id)) { world.remove(m); GM.fx.bombs.delete(id); }
  // tiles on clients animate from state
  if (NET.role === 'client') stepTiles(dt); else if (ISLE.dirty) { writeTiles(0); ISLE.dirty = false; }
  if (ISLE.seaMat.map) { ISLE.seaMat.map.offset.x = time * 0.004; ISLE.seaMat.map.offset.y = time * 0.006; }
  sparks.update(dt); dust.update(dt); splash.update(dt); boomFx.update(dt);
}
// events -> sound, particles, feed
function playEvents() {
  const q = GM.evq; if (!q.length) return; GM.evq = [];
  if (NET.role === 'host') NET.outEv.push(...q);
  for (const e of q) handleEv(e);
}
function handleEv(e) {
  const me = GM.fighters[GM.me], k = e[0];
  if (k === 'h') { const x = e[1] / 10, y = e[2] / 10, z = e[3] / 10, s = e[4]; burst(sparks, x, y, z, 6 + Math.min(20, s), 6 + s * 0.4, 4 + s * 0.2, 0.35); thump(s); if ((e[5] === GM.me || e[6] === GM.me) && SAVE.set.shake) shake = Math.max(shake, Math.min(0.6, s * 0.03)); if (s >= 12) popTextDom(x, y + 1, z, s >= 18 ? 'SMASH!' : 'POW!', '#ffc93c'); if (e[5] === GM.me) haptic(s > 10 ? 40 : 15); }
  else if (k === 'k') { const v = GM.fighters[e[1]], by = GM.fighters[e[2]]; const x = e[3] / 10, z = e[4] / 10; burst(splash, x, -6.6, z, 26, 8, 9, 0.9); boom(0.5); feed((by ? by.name + ' 👊 ' : '💦 ') + v.name, v.id === GM.me || (by && by.id === GM.me)); if (by && by.id === GM.me) { toast('KNOCKOUT! +◎15'); tone(990, 0.12, 'square', 0.06); } if (v.id === GM.me) { haptic(80); if (GM.mode === 'elim') { $('big').innerHTML = 'OUT!<small>#' + (GM.fighters.filter(f => f.alive).length + 1) + ' · spectating</small>'; setTimeout(() => { if (GM && $('big').textContent.startsWith('OUT')) $('big').innerHTML = ''; }, 1800); } else toast('RESPAWNING…'); } }
  else if (k === 'm') { const f = GM.fighters[e[1]]; if (f) burst(sparks, f.x, f.y + 1, f.z, 14, 5, 3, 0.4); if (e[1] === GM.me) { tone(1320, 0.12, 'triangle', 0.1); toast('⚡ MAX POWER: let go to SMASH!'); haptic(25); } }
  else if (k === 'w') { whoosh(e[2] === 2 ? 0.16 : 0.08); }
  else if (k === 'd') { const f = GM.fighters[e[1]]; if (f) burst(dust, f.x, 0.3, f.z, 6, 3, 1.5, 0.5); whoosh(0.06); }
  else if (k === 'p') { const f = GM.fighters[e[1]], kind = ITEM_KINDS[e[2]]; if (f) popTextDom(f.x, f.y + 2, f.z, ITEM_ICO[kind], '#fff'); if (e[1] === GM.me) { tone(700, 0.08, 'triangle', 0.12); setTimeout(() => tone(1050, 0.12, 'triangle', 0.12), 70); toast({ bomb: '💣 BOMB! punch to throw', mega: '🍄 MEGA SIZE!', boots: '👟 SPEED BOOTS!', shield: '🛡️ SHIELD!', hammer: '🔨 HAMMER: 3 smashes' }[kind]); } }
  else if (k === 'e') { const x = e[1] / 10, y = e[2] / 10, z = e[3] / 10; burst(boomFx, x, y, z, 40, 10, 8, 0.6); burst(sparks, x, y, z, 30, 14, 10, 0.5); boom(1); const d = Math.hypot(me.x - x, me.z - z); if (SAVE.set.shake) shake = Math.max(shake, clamp(1 - d / 14, 0, 0.8)); }
  else if (k === 's') { burst(splash, e[1] / 10, -6.6, e[2] / 10, 12, 5, 6, 0.7); }
  else if (k === 'f') { const t = ISLE.tiles[e[1]]; if (t) { burst(dust, t.x, 0, t.z, 5, 3, 1, 0.6); if (NET.role === 'client' && t.st < 2) { t.st = 2; t.t = 0; t.vy = 0; } } if (Math.random() < 0.3) rumble(); }
  else if (k === 'x') { toast('⚠️ THE ISLAND IS CRUMBLING!'); rumble(); }
  else if (k === 'g') { $('big').innerHTML = 'BRAWL!'; beep(880, 0.4); setTimeout(() => { if ($('big').textContent === 'BRAWL!') $('big').innerHTML = ''; }, 900); }
  else if (k === 'r') { const f = GM.fighters[e[1]]; if (f) burst(sparks, f.x, 4, f.z, 12, 4, 2, 0.5); }
  else if (k === 'end') { const res = GM.res || standings(), w = res[0]; $('big').innerHTML = (w && w.id === GM.me ? 'VICTORY!' : (w ? w.name.toUpperCase() + ' WINS' : 'TIME!')) + '<small>' + (GM.mode === 'frenzy' ? w.kos + ' knockouts' : 'last one standing') + '</small>'; if (w && w.id === GM.me) { haptic(120); burst(sparks, me.x, me.y + 2, me.z, 60, 10, 12, 1); } }
}

/* ---------- HUD ---------- */
let camSnap = true, shake = 0, hudT = 0;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpV = new THREE.Vector3();
function hud(dt) {
  const me = GM.fighters[GM.me];
  hudT -= dt; const alive = GM.fighters.filter(f => f.alive || (GM.mode === 'frenzy' && !f.out));
  if (GM.phase === 'count') { const n = Math.ceil(-GM.t); const s = n > 0 && n <= 3 ? String(n) : ''; if ($('big').dataset.cd !== s) { $('big').dataset.cd = s; $('big').innerHTML = s; if (s) beep(440); } }
  if (hudT <= 0) { hudT = 0.15;
    $('meDmg').textContent = Math.round(me.dmg) + '%'; $('meDmg').style.color = dmgColor(me.dmg);
    $('meSub').textContent = me.alive ? 'DAMAGE' : GM.mode === 'elim' ? 'KNOCKED OUT' : 'RESPAWNING';
    const it = me.item ? ITEM_ICO[me.item] + ' punch to throw' : me.hammer ? '🔨 × ' + me.hammer : me.megaT > 0 ? '🍄 ' + Math.ceil(me.megaT) + 's' : me.bootsT > 0 ? '👟 ' + Math.ceil(me.bootsT) + 's' : me.shieldT > 0 ? '🛡️ ' + Math.ceil(me.shieldT) + 's' : '';
    $('hItem').classList.toggle('hide', !it); $('hItem').textContent = it; document.body.classList.toggle('hasItem', !!it);
    if (GM.mode === 'tut') { $('topMain').textContent = '🎓'; $('topSub').textContent = 'TUTORIAL'; }
    else if (GM.mode === 'elim') { $('topMain').textContent = GM.fighters.filter(f => f.alive).length; $('topSub').textContent = 'LEFT · ' + MODES.elim.n.toUpperCase(); }
    else { const left = Math.max(0, 120 - Math.max(0, GM.t)); $('topMain').textContent = Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0'); $('topSub').textContent = 'KO FRENZY'; }
    const top = GM.fighters.slice().sort((a, b) => b.kos - a.kos || a.dmg - b.dmg).slice(0, 5); if (!top.includes(me)) top.push(me);
    $('board').innerHTML = '<div style="color:var(--dim);font-size:11px;letter-spacing:.12em">KNOCKOUTS</div>' + top.map(f => '<div class="' + (f.id === GM.me ? 'me' : '') + '"><span><i style="background:' + hex(f.color) + '"></i>' + esc(f.name) + (f.alive ? '' : ' 💀') + '</span><b>' + f.kos + '</b></div>').join('');
    const spec = !me.alive && GM.mode === 'elim' && GM.phase === 'play'; $('spec').classList.toggle('hide', !spec);
    if (spec) { const t = GM.fighters[GM.spec]; $('specTxt').textContent = '👀 ' + (t ? t.name : '') + ' · ' + GM.fighters.filter(f => f.alive).length + ' left'; $('specSkip').classList.toggle('hide', NET.role === 'client'); }
  }
  // name tags
  const showTags = SAVE.set.tags, W = innerWidth, H = innerHeight;
  for (const f of GM.fighters) { const tg = f.tag; if (!f.alive || !showTags && f.id !== GM.me) { tg.style.display = 'none'; continue; }
    tmpV.set(f.x, f.y + (f.megaT > 0 ? 3.6 : 2.3), f.z).project(camera); if (tmpV.z > 1 || Math.abs(tmpV.x) > 1.1 || Math.abs(tmpV.y) > 1.1) { tg.style.display = 'none'; continue; }
    tg.style.display = ''; tg.style.transform = 'translate(' + ((tmpV.x * 0.5 + 0.5) * W | 0) + 'px,' + ((-tmpV.y * 0.5 + 0.5) * H | 0) + 'px) translate(-50%,-100%)';
    const d = Math.round(f.dmg); if (tg._d !== d) { tg._d = d; tg.children[1].textContent = d + '%'; tg.children[1].style.color = dmgColor(d); } }
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dmgColor = d => d < 40 ? '#ffffff' : d < 80 ? '#ffe27a' : d < 120 ? '#ffa24a' : '#ff4a4a';
function feed(t, mine) { const d = document.createElement('div'); d.textContent = t; if (mine) d.style.color = 'var(--sun)'; const f = $('feed'); f.prepend(d); while (f.children.length > 5) f.lastChild.remove(); setTimeout(() => d.remove(), 5000); }
let toastT = 0; function toast(t) { $('toast').textContent = t; clearTimeout(toastT); toastT = setTimeout(() => $('toast').textContent = '', 1400); }
function popTextDom(x, y, z, txt, color) { tmpV.set(x, y, z).project(camera); if (tmpV.z > 1) return; const d = document.createElement('div'); d.className = 'pop'; d.textContent = txt; d.style.color = color; d.style.transform = 'translate(' + ((tmpV.x * 0.5 + 0.5) * innerWidth | 0) + 'px,' + ((-tmpV.y * 0.5 + 0.5) * innerHeight | 0) + 'px) translate(-50%,-50%)'; $('tags').appendChild(d); setTimeout(() => d.remove(), 1000); }
function haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
function camera3(dt) {
  const me = GM.fighters[GM.me]; let tg = me;
  if (!me.alive && GM.mode === 'elim') { let s = GM.fighters[GM.spec]; if (!s || !s.alive) { const al = GM.fighters.filter(f => f.alive); s = al.sort((a, b) => b.kos - a.kos)[0]; GM.spec = s ? s.id : -1; } if (s) tg = s; }
  const z = SAVE.set.cam * (isTouch && innerHeight < 520 ? 1.15 : 1) * (1 + ISLE.R * 0.04), tx = tg.alive || GM.mode === 'elim' ? tg.x * 0.75 : 0, tz = tg.alive || GM.mode === 'elim' ? tg.z * 0.75 : 0;
  const want = tmpV.set(tx, 12.5 * z, tz + 9.6 * z);
  if (camSnap) { camPos.copy(want); camLook.set(tx, 0, tz); camSnap = false; } else { camPos.lerp(want, Math.min(1, dt * 6)); camLook.lerp(new THREE.Vector3(tx, Math.max(-2, Math.min(0, tg.y * 0.3)), tz), Math.min(1, dt * 5)); }
  shake = Math.max(0, shake - dt * 1.8); camera.position.copy(camPos).add(new THREE.Vector3((Math.random() - .5) * shake, (Math.random() - .5) * shake, (Math.random() - .5) * shake)); camera.lookAt(camLook);
  sun.position.set(camLook.x - 20, 40, camLook.z + 18); sun.target.position.copy(camLook);
}
let menuT = 0;
function menuScene() { if (!ISLE || ISLE.id !== SAVE.isle || ISLE.R !== isleRadius(SAVE.count)) buildIsle(SAVE.isle, isleRadius(SAVE.count)); }
function menuCam(dt) { menuT += dt * 0.08; const d = HS * SQ3 * ISLE.R * 1.9; camera.position.set(Math.cos(menuT) * d, d * 0.62, Math.sin(menuT) * d); camera.lookAt(0, -1, 0); ISLE.time += dt; if (ISLE.seaMat.map) ISLE.seaMat.map.offset.x = ISLE.time * 0.004; }

/* ---------- main loop ---------- */
let last = performance.now(); const PERF = { avg: 1 / 60, slow: 0 };
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(), rdt = Math.min(0.05, (now - last) / 1000); last = now; const time = now / 1000;
  pollPad();
  if (state === 'play' && GM) {
    readLocalInput();
    if (NET.role !== 'client') { const steps = GM.speed > 1 ? GM.speed : 1; for (let i = 0; i < steps; i++) hostStep(rdt); }
    playEvents(); syncVis(rdt, time); camera3(rdt); hud(rdt);
    if (NET.role === 'host') netHostTick(rdt); else if (NET.role === 'client') netClientTick(rdt);
  } else if (state === 'paused' && GM) { if (NET.role !== 'off') { readLocalInput(); if (NET.role === 'host') { hostStep(rdt); playEvents(); netHostTick(rdt); } else netClientTick(rdt); syncVis(rdt, time); } }
  else if (state === 'menu' && ISLE) menuCam(rdt);
  if (state === 'play' && gfxHi()) { PERF.avg = PERF.avg * 0.95 + rdt * 0.05; if (PERF.avg > 1 / 32) { PERF.slow += rdt; if (PERF.slow > 4) { SAVE.set.gfx = 'fast'; save(); resize(); toast('Graphics lowered for a smoother game'); } } else PERF.slow = 0; }
  renderer.render(scene, camera);
}

/* ---------- audio ---------- */
let AC = null, MGAIN = null, sea = null;
function audio() { try { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); MGAIN = AC.createGain(); MGAIN.gain.value = SAVE.set.vol; MGAIN.connect(AC.destination); waves(); } if (AC.state === 'suspended') AC.resume(); } catch (e) {} }
function tone(f, d, type = 'sine', v = 0.12) { if (!AC) return; const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + d); o.connect(g); g.connect(MGAIN); o.start(); o.stop(AC.currentTime + d); }
function noise(d, f, q, v, type = 'bandpass') { if (!AC) return; const n = AC.createBufferSource(), b = AC.createBuffer(1, Math.max(1, AC.sampleRate * d | 0), AC.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2); n.buffer = b; const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = AC.createGain(); g.gain.value = v; n.connect(fl); fl.connect(g); g.connect(MGAIN); n.start(); }
const beep = (f, d = 0.18) => tone(f, d, 'square', 0.07), whoosh = v => noise(0.18, 1800, 0.8, v), rumble = () => noise(0.6, 120, 0.7, 0.25, 'lowpass');
function thump(s) { if (!AC) return; const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(180 + s * 6, AC.currentTime); o.frequency.exponentialRampToValueAtTime(50, AC.currentTime + 0.18); g.gain.setValueAtTime(Math.min(0.45, 0.12 + s * 0.02), AC.currentTime); g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.22); o.connect(g); g.connect(MGAIN); o.start(); o.stop(AC.currentTime + 0.25); noise(0.08, 2500, 1, 0.12 + s * 0.01); }
function boom(v) { noise(0.9, 160, 0.5, 0.5 * v, 'lowpass'); tone(60, 0.5, 'sine', 0.3 * v); }
function waves() { if (!AC || sea) return; const n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * 4, AC.sampleRate), ch = b.getChannelData(0); let l = 0; for (let i = 0; i < ch.length; i++) { l = l * 0.985 + (Math.random() * 2 - 1) * 0.015; ch[i] = l * (0.6 + 0.4 * Math.sin(i / ch.length * Math.PI * 2)); } n.buffer = b; n.loop = true; const g = AC.createGain(); g.gain.value = 0.5; n.connect(g); g.connect(MGAIN); n.start(); sea = g; }

/* ---------- input ---------- */
const K = {}; let padActive = false, padPrev = [], padDash = 0, kDash = 0, tDash = 0, tPunch = false, joy = { id: null, x: 0, y: 0, mx: 0, mz: 0 }, mouseP = false;
addEventListener('keydown', e => { if (e.target && e.target.tagName === 'INPUT') return; if (!K[e.code] && (e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyL')) kDash++; K[e.code] = true; if (e.code === 'Space') e.preventDefault(); if ((e.code === 'Escape' || e.code === 'KeyP') && GM) togglePause(); });
addEventListener('keyup', e => { K[e.code] = false; });
addEventListener('blur', () => { for (const k in K) K[k] = false; });
canvas.addEventListener('mousedown', e => { if (e.button === 0 && state === 'play' && !isTouch) mouseP = true; }); addEventListener('mouseup', () => { mouseP = false; });
function readLocalInput() {
  if (!GM) return; const me = GM.fighters[GM.me];
  let mx = ((K.KeyD || K.ArrowRight) ? 1 : 0) - ((K.KeyA || K.ArrowLeft) ? 1 : 0), mz = ((K.KeyS || K.ArrowDown) ? 1 : 0) - ((K.KeyW || K.ArrowUp) ? 1 : 0);
  let p = !!(K.KeyJ || K.Space || K.Enter) || mouseP || tPunch;
  if (joy.id !== null) { mx = joy.mx; mz = joy.mz; }
  if (padActive) { const g = pad(); if (g) { const ax = g.axes[0] || 0, ay = g.axes[1] || 0; if (Math.hypot(ax, ay) > 0.18) { mx = ax; mz = ay; } p = p || btn(g, 0) || btn(g, 7); } }
  if (state !== 'play') { mx = mz = 0; p = false; }
  me.inp.mx = mx; me.inp.mz = mz; me.inp.p = p; me.inp.d = kDash + padDash + tDash;
}
const pad = () => { const ps = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of ps) if (p && p.connected) return p; return null; };
const btn = (g, i) => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.4));
function pollPad() {
  const g = pad(); if (!g) { padActive = false; return; } const down = i => btn(g, i) && !padPrev[i];
  if (Math.abs(g.axes[0]) > 0.3 || Math.abs(g.axes[1]) > 0.3 || g.buttons.some(b => b.pressed)) padActive = true;
  if (down(1) || down(2) || down(5) || down(6)) padDash++;
  if (down(9) && GM) togglePause();
  if (state === 'menu' && down(0) && $('lobbyOv').classList.contains('hide')) $('playBtn').click();
  if (!$('resOv').classList.contains('hide') && down(0)) $('againBtn').click();
  for (let i = 0; i < g.buttons.length; i++) padPrev[i] = btn(g, i);
}
// touch: floating joystick + buttons
{ const zone = $('joyZone'), base = $('joy'), knob = $('knob');
  const setJ = (x, y) => { const r = base.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2; let dx = x - cx, dy = y - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } knob.style.transform = 'translate(' + dx / (r.width / 150) + 'px,' + dy / (r.width / 150) + 'px)'; const m = Math.min(1, d / (R * 0.75)); joy.mx = d > 4 ? dx / (d || 1) * m : 0; joy.mz = d > 4 ? dy / (d || 1) * m : 0; };
  zone.addEventListener('touchstart', e => { e.preventDefault(); audio(); const t = e.changedTouches[0]; joy.id = t.identifier; const zr = zone.getBoundingClientRect(); base.style.left = (t.clientX - zr.left) + 'px'; base.style.top = (t.clientY - zr.top) + 'px'; setJ(t.clientX, t.clientY); }, { passive: false });
  zone.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === joy.id) setJ(t.clientX, t.clientY); }, { passive: false });
  const end = e => { for (const t of e.changedTouches) if (t.identifier === joy.id) { joy.id = null; joy.mx = joy.mz = 0; knob.style.transform = ''; base.style.left = ''; base.style.top = ''; } };
  zone.addEventListener('touchend', end); zone.addEventListener('touchcancel', end);
  const hold = (id, on, off) => { const el = $(id); const s = e => { e.preventDefault(); el.classList.add('on'); audio(); on(); }, t = e => { e.preventDefault(); el.classList.remove('on'); off(); }; el.addEventListener('touchstart', s, { passive: false }); el.addEventListener('touchend', t); el.addEventListener('touchcancel', t); el.addEventListener('mousedown', s); el.addEventListener('mouseup', t); el.addEventListener('mouseleave', t); };
  hold('tPunch', () => { tPunch = true; }, () => { tPunch = false; }); hold('tDash', () => { tDash++; haptic(8); }, () => {}); }
function fitTouch() {
  const vv = window.visualViewport, w = vv ? vv.width : innerWidth, h = vv ? vv.height : innerHeight;
  for (const id of ['touch', 'hud']) { const el = $(id); if (vv) { el.style.inset = 'auto'; el.style.left = vv.offsetLeft + 'px'; el.style.top = vv.offsetTop + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px'; } }
  $('touch').style.setProperty('--s', clamp(Math.min(w / 1000, h / 640), 0.68, 1) * SAVE.set.tsize);
}
if (window.visualViewport) { visualViewport.addEventListener('resize', fitTouch); visualViewport.addEventListener('scroll', fitTouch); }
addEventListener('resize', fitTouch); addEventListener('orientationchange', () => setTimeout(fitTouch, 300));
document.addEventListener('gesturestart', e => e.preventDefault()); document.addEventListener('dblclick', e => e.preventDefault());
{ let lastT = 0; document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastT < 350 && !(e.target.closest && e.target.closest('input,button,a'))) e.preventDefault(); lastT = n; }, { passive: false }); }
document.addEventListener('focusout', e => { if (e.target.tagName === 'INPUT') setTimeout(() => { window.scrollTo(0, 0); fitTouch(); }, 50); });
function togglePause() {
  if (!GM || GM.phase === 'end') return;
  if (state === 'play') { state = 'paused'; $('pauseOv').classList.remove('hide'); }
  else if (state === 'paused') { state = 'play'; $('pauseOv').classList.add('hide'); last = performance.now(); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && NET.role === 'off') togglePause(); });

/* ---------- online rooms (PeerJS star: the host simulates, everyone else sends input) ---------- */
const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' }, { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }, { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }] };
const NET = { role: 'off', peer: null, code: '', conns: new Map(), host: null, members: [], cfg: { mode: 'elim', isle: 'palm', fill: 12 }, sendT: 0, outEv: [], myPid: 'host', inT: 0, lastSt: 0 };
const ROOM_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const peerLib = () => window.Peer ? Promise.resolve() : loadJs('https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js');
const netMsg = t => { $('netMsg').textContent = t; };
const myInfo = () => ({ name: (SAVE.name || 'Player').slice(0, 14), color: COLORS[SAVE.color], hat: SAVE.hat });
async function hostRoom(tries = 0) {
  audio(); netMsg('Opening a room…'); try { await peerLib(); } catch (e) { netMsg('Could not load online play. Check your internet.'); return; }
  let code = ''; for (let i = 0; i < 4; i++) code += ROOM_CH[(Math.random() * ROOM_CH.length) | 0];
  const peer = new Peer('nbki-' + code, { debug: 0, config: ICE });
  peer.on('error', e => { if (e && e.type === 'unavailable-id' && tries < 4) { try { peer.destroy(); } catch (x) {} hostRoom(tries + 1); } else if (NET.role !== 'host') netMsg('Could not open a room (' + (e && e.type || 'error') + '). Try again.'); });
  peer.on('open', () => {
    Object.assign(NET, { role: 'host', peer, code, conns: new Map(), myPid: 'host', members: [Object.assign({ pid: 'host' }, myInfo())] });
    NET.cfg = { mode: SAVE.mode, isle: SAVE.isle, fill: Math.max(SAVE.count, 2) };
    peer.on('connection', c => {
      c.on('data', d => {
        if (!d || typeof d !== 'object') return;
        if (d.t === 'hi') { if (NET.members.length >= 20) { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); return; } if (state === 'play' || state === 'paused') { c.send({ t: 'busy' }); setTimeout(() => c.close(), 300); return; }
          NET.conns.set(c.peer, c); NET.members = NET.members.filter(m => m.pid !== c.peer); NET.members.push({ pid: c.peer, name: String(d.name || 'Player').slice(0, 14), color: +d.color || COLORS[0], hat: HATS[d.hat] ? d.hat : 'none' }); lobbyBroadcast(); renderLobby(); tone(880, 0.1, 'triangle', 0.08); }
        else if (d.t === 'in' && GM) { const f = GM.fighters.find(x => x.pid === c.peer); if (f && !f.bot) { f.inp.mx = clamp(+d.mx || 0, -1, 1); f.inp.mz = clamp(+d.mz || 0, -1, 1); f.inp.p = !!d.p; f.inp.d = d.d | 0; } }
      });
      c.on('close', () => dropPeer(c.peer)); c.on('error', () => dropPeer(c.peer));
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
    openLobby(); netMsg('');
  });
}
function dropPeer(pid) { if (!NET.conns.has(pid)) return; NET.conns.delete(pid); const m = NET.members.find(x => x.pid === pid); NET.members = NET.members.filter(x => x.pid !== pid); if (GM) { const f = GM.fighters.find(x => x.pid === pid); if (f) { f.bot = true; f.skill = 0.7; feed((m ? m.name : 'A player') + ' left (bot took over)'); } } lobbyBroadcast(); renderLobby(); }
function lobbyBroadcast() { netSend({ t: 'lobby', members: NET.members, cfg: NET.cfg, code: NET.code }); }
function netSend(o) { if (NET.role !== 'host') return; for (const c of NET.conns.values()) { try { if (c.open) c.send(o); else if (o.t !== 'st' && !c._q) { c._q = 1; c.on('open', () => { c._q = 0; if (NET.role === 'host') lobbyBroadcast(); }); } } catch (e) {} } }
// keep lobbies fresh (late joiners, dropped packets)
setInterval(() => { if (NET.role === 'host' && (state === 'menu' || (GM && GM.phase === 'end'))) lobbyBroadcast(); }, 2000);
// the host keeps simulating even if its tab is in the background, so the match never freezes for everyone else
{ let bgLast = performance.now(); setInterval(() => { const now = performance.now(), dt = Math.min(1.5, (now - bgLast) / 1000); bgLast = now;
  if (now - last < 250 || NET.role !== 'host' || !GM || (state !== 'play' && state !== 'paused')) return; /* the frame loop is stalled (background tab) */ const n = Math.ceil(dt / 0.033); for (let i = 0; i < n; i++) hostStep(dt / n); GM.evq.length && (NET.outEv.push(...GM.evq), GM.evq = []); netHostTick(dt); }, 50); }
async function joinRoom(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z]/g, ''); if (code.length !== 4) { netMsg('Room codes are 4 letters.'); return; }
  audio(); netMsg('Joining ' + code + '…'); try { await peerLib(); } catch (e) { netMsg('Could not load online play. Check your internet.'); return; }
  const peer = new Peer(undefined, { debug: 0, config: ICE }); let opened = false;
  const fail = t => { if (NET.role === 'client' && opened) return; netMsg(t); try { peer.destroy(); } catch (e) {} };
  const to = setTimeout(() => { if (!opened) fail('Could not find room ' + code + '. Check the code, or ask the host to open it again.'); }, 12000);
  peer.on('error', e => { if (e && e.type === 'peer-unavailable') { clearTimeout(to); fail('No room called ' + code + '. Check the code.'); } else if (!opened) { clearTimeout(to); fail('Could not connect (' + (e && e.type || 'error') + ').'); } });
  peer.on('open', id => { const c = peer.connect('nbki-' + code, { reliable: false, serialization: 'json' });
    c.on('open', () => { opened = true; clearTimeout(to); Object.assign(NET, { role: 'client', peer, code, host: c, myPid: id }); c.send(Object.assign({ t: 'hi' }, myInfo())); netMsg(''); openLobby(); });
    c.on('data', d => clientData(d));
    c.on('close', () => { if (NET.role === 'client') { netLeave(true); if (state !== 'menu') quitToMenu(); netMsg('The host closed the room.'); } }); });
}
function clientData(d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'lobby') { NET.members = d.members || []; NET.cfg = d.cfg || NET.cfg; NET.code = d.code || NET.code; renderLobby(); }
  else if (d.t === 'full') { netLeave(); netMsg('That room is full (20 players).'); $('lobbyOv').classList.add('hide'); }
  else if (d.t === 'busy') { netLeave(); netMsg('That room is in a match right now. Try again in a minute.'); $('lobbyOv').classList.add('hide'); }
  else if (d.t === 'start') { const me = d.roster.findIndex(r => r.pid === NET.myPid); startMatch(d.cfg, d.roster, me < 0 ? 0 : me); for (const f of GM.fighters) { f.tx = f.x; f.tz = f.z; f.ty = f.y; f.tface = f.face; } }
  else if (d.t === 'st' && GM) applySnap(d);
  else if (d.t === 'end' && GM) { const g = GM; GM.res = d.res; GM.phase = 'end'; handleEv(['end']); setTimeout(() => { if (GM === g) showResults(d.res); }, 1600); }
}
function startOnline() {
  if (NET.role !== 'host') return; const humans = NET.members.slice(0, 20), n = Math.max(humans.length, Math.min(20, NET.cfg.fill));
  const roster = humans.map(m => ({ name: m.name, color: m.color, hat: m.hat, bot: false, pid: m.pid })); const names = RIVALS.slice().sort(() => Math.random() - 0.5), hats = Object.keys(HATS);
  for (let i = roster.length; i < n; i++) roster.push({ name: names[i % names.length] + ' 🤖', color: COLORS[(i * 5) % COLORS.length], hat: Math.random() < 0.5 ? hats[1 + ((Math.random() * (hats.length - 1)) | 0)] : 'none', bot: true, skill: 0.55 + Math.random() * 0.4 });
  netSend({ t: 'start', cfg: { mode: NET.cfg.mode, isle: NET.cfg.isle }, roster }); startMatch({ mode: NET.cfg.mode, isle: NET.cfg.isle }, roster, 0);
}
// host -> clients: 20 snapshots a second
function netHostTick(dt) {
  NET.sendT -= dt; if (NET.sendT > 0 || !NET.conns.size) { if (!NET.conns.size) NET.outEv = []; return; } NET.sendT = NET.conns.size > 8 ? 0.066 : 0.05;
  const f = GM.fighters.map(x => [Math.round(x.x * 100), Math.round(x.z * 100), Math.round(x.y * 100), Math.round(x.face * 100), Math.round(x.dmg), (x.alive ? 1 : 0) | (x.grounded ? 2 : 0) | (x.dashT > 0 ? 4 : 0) | (x.stun > 0 ? 8 : 0) | (x.shieldT > 0 ? 16 : 0) | (x.megaT > 0 ? 32 : 0) | (x.bootsT > 0 ? 64 : 0) | (x.inv > 0 ? 128 : 0) | (x.out ? 256 : 0),
    x.atk ? (x.atk.kind === 'smash' ? 3 : x.atk.kind === 'jab3' ? 2 : 1) : 0, x.atk ? Math.round(x.atk.t * 100) : 0, Math.round(x.chg * 20), x.item === 'bomb' ? 1 : 0, x.hammer, x.kos, x.falls, x.combo, Math.round(x.vx), Math.round(x.vz)]);
  let tiles = ''; for (const t of ISLE.tiles) tiles += t.st; NET.tileT = (NET.tileT || 0) - 1; const sendTiles = tiles !== NET.lastTiles || NET.tileT <= 0; if (sendTiles) { NET.lastTiles = tiles; NET.tileT = 15; }
  netSend({ t: 'st', gt: Math.round(GM.t * 100), ph: GM.phase, ring: GM.ring, f, tiles: sendTiles ? tiles : '', c: GM.crates.map(c => [c.id, Math.round(c.x * 10), Math.round(c.z * 10), ITEM_KINDS.indexOf(c.kind), Math.round((c.y || 0) * 10)]), b: GM.bombs.map(b => [b.id, Math.round(b.x * 10), Math.round(b.y * 10), Math.round(b.z * 10), Math.round(b.t * 10)]), ev: NET.outEv.splice(0) });
}
function applySnap(d) {
  GM.t = d.gt / 100; GM.phase = d.ph === 'end' ? GM.phase : d.ph; GM.ring = d.ring;
  d.f.forEach((a, i) => { const f = GM.fighters[i]; if (!f) return; f.tx = a[0] / 100; f.tz = a[1] / 100; f.ty = a[2] / 100; f.tface = a[3] / 100; f.dmg = a[4]; const fl = a[5];
    const wasAlive = f.alive; f.alive = !!(fl & 1); if (f.alive && !wasAlive) { f.x = f.tx; f.z = f.tz; f.y = f.ty; } f.grounded = !!(fl & 2); f.dashT = fl & 4 ? 0.08 : 0; f.stun = fl & 8 ? 0.1 : 0; f.shieldT = fl & 16 ? 1 : 0; f.megaT = fl & 32 ? 1 : 0; f.bootsT = fl & 64 ? 1 : 0; f.inv = fl & 128 ? 0.1 : 0; f.out = !!(fl & 256);
    f.atk = a[6] ? { kind: a[6] === 3 ? 'smash' : a[6] === 2 ? 'jab3' : 'jab', t: a[7] / 100, dur: a[6] === 3 ? 0.42 : a[6] === 2 ? 0.3 : 0.24 } : null; f.chg = a[8] / 20; f.item = a[9] ? 'bomb' : null; f.hammer = a[10]; f.kos = a[11]; f.falls = a[12]; f.combo = a[13]; f.vx = a[14]; f.vz = a[15]; });
  for (let i = 0; i < d.tiles.length && i < ISLE.tiles.length; i++) { const t = ISLE.tiles[i], s = +d.tiles[i]; if (s === t.st) continue; if (s === 0 && t.st !== 0) { if (t.st === 3) { t.st = 4; t.t = 0; } else if (t.st !== 4) { t.st = 0; t.y = 0; } } else if (s === 1) { if (t.st === 0) { t.st = 1; t.t = 0; t.warn = 9; } } else if (s === 2 && t.st < 2) { t.st = 2; t.t = 0; t.vy = 0; } else if (s === 3 && t.st < 2) { t.st = 3; } else if (s === 4 && t.st === 3) { t.st = 4; t.t = 0; } ISLE.dirty = true; }
  GM.crates = d.c.map(a => ({ id: a[0], x: a[1] / 10, z: a[2] / 10, kind: ITEM_KINDS[a[3]], y: a[4] / 10 }));
  GM.bombs = d.b.map(a => ({ id: a[0], x: a[1] / 10, y: a[2] / 10, z: a[3] / 10, t: a[4] / 10 }));
  for (const e of d.ev || []) handleEv(e);
  NET.lastSt = performance.now();
}
function netClientTick(dt) {
  NET.inT -= dt; if (NET.inT <= 0 && NET.host && NET.host.open) { NET.inT = 0.05; const i = GM.fighters[GM.me].inp; try { NET.host.send({ t: 'in', mx: +i.mx.toFixed(2), mz: +i.mz.toFixed(2), p: i.p ? 1 : 0, d: i.d }); } catch (e) {} }
  if (NET.lastSt && performance.now() - NET.lastSt > 8000) { NET.lastSt = 0; toast('Connection to the host lost'); setTimeout(() => { if (NET.role === 'client') { netLeave(); quitToMenu(); netMsg('Lost connection to the host.'); } }, 1500); }
}
function netLeave(quiet) { const p = NET.peer; Object.assign(NET, { role: 'off', peer: null, conns: new Map(), host: null, members: [], outEv: [], lastSt: 0 }); try { p && p.destroy(); } catch (e) {} $('lobbyOv').classList.add('hide'); }
function openLobby() { state = state === 'play' ? state : 'menu'; $('lobbyOv').classList.remove('hide'); renderLobby(); }
function renderLobby() {
  if (NET.role === 'off') return; const host = NET.role === 'host';
  $('lobTitle').textContent = host ? 'Your room' : 'Room'; $('lobCode').textContent = NET.code; $('lobHost').classList.toggle('hide', !host); $('lobWait').classList.toggle('hide', host);
  $('lobInfo').textContent = NET.members.length + ' / 20 players · ' + MODES[NET.cfg.mode].n + ' · ' + ISLES[NET.cfg.isle].n + (NET.cfg.fill > NET.members.length ? ' · bots fill to ' + NET.cfg.fill : '');
  const l = $('lobList'); l.textContent = ''; for (const m of NET.members) { const d = document.createElement('div'); d.innerHTML = '<i></i><span></span>'; d.children[0].style.background = hex(m.color); d.children[1].textContent = (HATS[m.hat] && m.hat !== 'none' ? HATS[m.hat].e + ' ' : '') + m.name + (m.pid === 'host' ? ' 👑' : '') + (m.pid === NET.myPid ? ' (you)' : ''); l.appendChild(d); }
  if (host) { chips($('lobMode'), Object.entries(MODES).map(([k, m]) => [k, m.n]), NET.cfg.mode, v => { NET.cfg.mode = v; lobbyBroadcast(); renderLobby(); });
    chips($('lobIsle'), Object.entries(ISLES).map(([k, m]) => [k, m.n]), NET.cfg.isle, v => { NET.cfg.isle = v; lobbyBroadcast(); renderLobby(); });
    chips($('lobFill'), [[0, 'No bots'], [8, '8'], [12, '12'], [16, '16'], [20, '20']], NET.cfg.fill, v => { NET.cfg.fill = v; lobbyBroadcast(); renderLobby(); }); }
}
function chips(box, opts, cur, on) { box.textContent = ''; for (const [v, n] of opts) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (cur === v ? ' on' : ''); b.textContent = n; b.style.padding = '7px 11px'; b.style.fontSize = '13px'; b.onclick = () => on(v); box.appendChild(b); } }

/* ---------- menu ---------- */
function renderMenu() {
  $('mCoins').textContent = '◎ ' + SAVE.coins.toLocaleString(); $('stWins').textContent = SAVE.wins; $('stKos').textContent = SAVE.kos; $('stGames').textContent = SAVE.games;
  $('howCard').classList.toggle('hide', !!SAVE.tutDone);
  const big = (box, list, cur, on) => { box.textContent = ''; for (const [k, n, d] of list) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (cur === k ? ' on' : ''); b.innerHTML = '<span></span><small></small>'; b.children[0].textContent = n; b.children[1].textContent = d || ''; b.onclick = () => on(k); box.appendChild(b); } };
  big($('modeList'), Object.entries(MODES).map(([k, m]) => [k, m.n, m.d]), SAVE.mode, k => { SAVE.mode = k; save(); renderMenu(); });
  big($('isleList'), Object.entries(ISLES).map(([k, m]) => [k, m.n, m.d]), SAVE.isle, k => { SAVE.isle = k; save(); renderMenu(); menuScene(); });
  big($('countList'), [4, 8, 12, 16, 20].map(n => [n, n + ' players', n === 20 ? 'max chaos' : n === 4 ? 'small brawl' : '']), SAVE.count, k => { SAVE.count = k; save(); renderMenu(); menuScene(); });
  const cl = $('colList'); cl.textContent = ''; COLORS.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sw' + (SAVE.color === i ? ' on' : ''); b.style.background = hex(c); b.setAttribute('aria-label', 'Colour ' + (i + 1)); b.onclick = () => { SAVE.color = i; save(); renderMenu(); }; cl.appendChild(b); });
  const hl = $('hatList'); hl.textContent = ''; for (const [k, h] of Object.entries(HATS)) { const own = SAVE.hats.includes(k), b = document.createElement('button'); b.type = 'button'; b.className = 'hat' + (SAVE.hat === k ? ' on' : ''); b.innerHTML = '<i></i><span></span><small></small>'; b.children[0].textContent = h.e; b.children[1].textContent = h.n; b.children[2].textContent = own ? (SAVE.hat === k ? 'Wearing' : 'Owned') : '◎ ' + h.p.toLocaleString();
    b.onclick = () => { if (!own) { if (SAVE.coins < h.p) { b.children[2].textContent = 'Need ◎ ' + (h.p - SAVE.coins).toLocaleString(); return; } SAVE.coins -= h.p; SAVE.hats.push(k); tone(880, 0.15, 'triangle', 0.1); } SAVE.hat = k; save(); renderMenu(); }; hl.appendChild(b); }
  if (document.activeElement !== $('nameIn')) $('nameIn').value = SAVE.name || '';
}
$('nameIn').addEventListener('input', () => { SAVE.name = $('nameIn').value.replace(/[<>]/g, '').slice(0, 14); save(); });
for (const id of ['nameIn', 'codeJoin', 'codeIn', 'acEmail', 'acPass']) { $(id).addEventListener('keydown', e => e.stopPropagation()); $(id).addEventListener('keyup', e => e.stopPropagation()); }
$('playBtn').onclick = () => { audio(); startMatch({ mode: SAVE.mode, isle: SAVE.isle }, rosterOffline(), 0); };
$('hostBtn').onclick = () => { if (NET.role !== 'off') { openLobby(); return; } hostRoom(); };
$('joinBtn').onclick = () => { if (NET.role !== 'off') { openLobby(); return; } joinRoom($('codeJoin').value); };
$('codeJoin').addEventListener('keydown', e => { if (e.key === 'Enter') $('joinBtn').click(); });
$('lobStart').onclick = () => startOnline();
$('lobLeave').onclick = () => { netLeave(); netMsg('You left the room.'); };
$('againBtn').onclick = () => { if (GM && GM.tutAgain) { startMatch({ mode: SAVE.mode, isle: SAVE.isle }, rosterOffline(), 0); return; } if (NET.role === 'off') { startMatch({ mode: SAVE.mode, isle: SAVE.isle }, rosterOffline(), 0); return; } clearMatchVis(); GM = null; state = 'menu'; hideAllOv(); $('hud').classList.add('hide'); $('touch').classList.add('hide'); $('menu').classList.remove('hide'); menuScene(); renderMenu(); openLobby(); if (NET.role === 'host') lobbyBroadcast(); };
$('menuBtn').onclick = quitToMenu; $('quitBtn').onclick = quitToMenu; $('resumeBtn').onclick = togglePause; $('pauseBtn').onclick = togglePause;
$('specSkip').onclick = () => { if (GM && NET.role !== 'client') GM.speed = 6; };
$('howGo').onclick = e => { e.preventDefault(); $('howOv').classList.remove('hide'); };
$('tutGo').onclick = () => startTutorial();
$('howClose').onclick = () => $('howOv').classList.add('hide');
$('pHowBtn').onclick = () => $('howOv').classList.remove('hide');
if (isTouch) { $('howPunch').textContent = 'PUNCH button'; $('howDash').textContent = 'DASH button'; }

/* ---------- settings ---------- */
const SETS = [['Sound', 'vol', [['Off', 0], ['Low', 0.4], ['Med', 0.7], ['Max', 1]]], ['Camera', 'cam', [['Close', 0.8], ['Normal', 1], ['Far', 1.25]]], ['Touch buttons', 'tsize', [['Small', 0.82], ['Normal', 1], ['Big', 1.15]]],
  ['Graphics', 'gfx', [['High', 'high'], ['Fast', 'fast']]], ['Name tags', 'tags', [['On', true], ['Off', false]]], ['Screen shake', 'shake', [['On', true], ['Off', false]]]];
function renderSettings() { const box = $('setRows'); box.textContent = '';
  for (const [label, key, opts] of SETS) { const row = document.createElement('div'); row.className = 'setrow'; const b = document.createElement('b'); b.textContent = label; row.appendChild(b); const r = document.createElement('div'); r.className = 'row'; chips(r, opts.map(([n, v]) => [v, n]), SAVE.set[key], v => { SAVE.set[key] = v; save(); applySettings(); renderSettings(); }); row.appendChild(r); box.appendChild(row); }
  renderAdmin(); }
function applySettings() { if (MGAIN) MGAIN.gain.value = SAVE.set.vol; resize(); fitTouch(); }
$('acPill').onclick = () => { const c = $('acctCard'); c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.style.boxShadow = '0 0 0 2px var(--sea)'; setTimeout(() => c.style.boxShadow = '', 1400); if (!CLOUD.user) setTimeout(() => $('acEmail').focus({ preventScroll: true }), 500); };
$('setBtn').onclick = $('pSetBtn').onclick = () => { renderSettings(); $('setOv').classList.remove('hide'); $('codeMsg').textContent = ''; };
$('setClose').onclick = () => $('setOv').classList.add('hide');

/* ---------- codes + admin: only SHA-256 fingerprints live here, never the codes ---------- */
const H_ADMIN = '0899e4f32a97efee53902bb9b7b8b1ae7be9e66b4be9bf051272c74804eee2c8', GIFT_SALT = 'a63ec3e311213745659a469c';
async function sha256(t) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { return ''; } }
const isAdmin = () => SAVE.admin === H_ADMIN.slice(0, 16);
function applyGift(pl) { if (pl[0] === 'C' && +pl.slice(1) > 0) { const n = Math.min(100000, +pl.slice(1)); SAVE.coins += n; return '◎ ' + n.toLocaleString() + ' coins'; } if (pl === 'H') { for (const k in HATS) if (!SAVE.hats.includes(k)) SAVE.hats.push(k); return 'every hat'; } return ''; }
async function makeGift(pl) { return 'KI-' + pl + '-' + (await sha256(GIFT_SALT + pl)).slice(0, 8).toUpperCase(); }
async function redeem() {
  const v = ($('codeIn').value || '').trim().toUpperCase().replace(/\s+/g, ''), msg = t => { $('codeMsg').textContent = t; $('codeIn').value = ''; }; if (!v) return;
  if (await sha256(v) === H_ADMIN) { SAVE.admin = H_ADMIN.slice(0, 16); save(); msg('Admin unlocked 🛠️ (panel is just below)'); renderAdmin(); return; }
  const m = /^KI-([A-Z0-9]+)-([0-9A-F]{8})$/.exec(v);
  if (m) { const used = SAVE.gifts || (SAVE.gifts = []); if ((await sha256(GIFT_SALT + m[1])).slice(0, 8).toUpperCase() !== m[2]) { msg('That code is not valid.'); return; } if (used.includes(m[2])) { msg('That code was already used on this device.'); return; }
    const g = applyGift(m[1]); if (!g) { msg('That code is not valid.'); return; } used.push(m[2]); save(); renderMenu(); msg('🎁 Gift received: ' + g + '!'); tone(880, 0.2, 'triangle', 0.12); return; }
  msg('That code was not recognised. Check it and try again.');
}
$('codeGo').onclick = redeem; $('codeIn').addEventListener('keydown', e => { if (e.key === 'Enter') redeem(); });
function renderAdmin() { $('admBox').classList.toggle('hide', !isAdmin()); if (!isAdmin()) { ADM.power = false; return; } $('admPower').textContent = 'Mega punch: ' + (ADM.power ? 'ON' : 'OFF');
  const gr = $('admGiftRow'); if (!gr.children.length) for (const [n, pl] of [['◎ 1,000', 'C1000'], ['◎ 5,000', 'C5000'], ['◎ 25,000', 'C25000'], ['All hats', 'H']]) { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = n; c.onclick = async () => { const code = await makeGift(pl); $('admGiftOut').value = code; try { await navigator.clipboard.writeText(code); $('codeMsg').textContent = 'Gift code copied: ' + code; } catch (e) {} }; gr.appendChild(c); } }
$('admCoins').onclick = () => { if (!isAdmin()) return; SAVE.coins += 10000; save(); renderMenu(); $('codeMsg').textContent = '+◎ 10,000'; };
$('admHats').onclick = () => { if (!isAdmin()) return; applyGift('H'); save(); renderMenu(); $('codeMsg').textContent = 'All hats unlocked'; };
$('admPower').onclick = () => { if (!isAdmin()) return; ADM.power = !ADM.power; renderAdmin(); };
$('admReset').onclick = () => { if (!isAdmin() || !confirm('Reset coins, hats and stats on this device?')) return; Object.assign(SAVE, { coins: 0, hats: ['none'], hat: 'none', wins: 0, kos: 0, games: 0 }); save(); renderMenu(); $('codeMsg').textContent = 'Progress reset on this device.'; };
$('admLeave').onclick = () => { delete SAVE.admin; save(); renderAdmin(); $('codeMsg').textContent = 'Left admin.'; };

/* ---------- account (same Firebase accounts as Ashfall + Boltrush; progress lives in the 'ki' field) ---------- */
const FB_CFG = { apiKey: 'AIzaSyAptGcd7k_mjVwkZPdnMLgR-4KPABtBOPU', authDomain: 'dustline-8da4d.firebaseapp.com', projectId: 'dustline-8da4d', storageBucket: 'dustline-8da4d.firebasestorage.app', messagingSenderId: '288529644668', appId: '1:288529644668:web:edb5d96554bc6d647eddf9' };
const CLOUD = { ready: null, auth: null, db: null, user: null, busy: false, timer: 0, last: '', seen: false };
const acMsg = t => { $('acMsg').textContent = t || ''; };
function cloudInit() {
  if (CLOUD.ready) return CLOUD.ready; const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
  CLOUD.ready = loadJs(base + 'firebase-app-compat.js').then(() => Promise.all([loadJs(base + 'firebase-auth-compat.js'), loadJs(base + 'firebase-firestore-compat.js')])).then(() => {
    if (!(firebase.apps && firebase.apps.length)) firebase.initializeApp(FB_CFG); CLOUD.auth = firebase.auth(); CLOUD.db = firebase.firestore();
    CLOUD.auth.onAuthStateChanged(u => { CLOUD.user = u || null; acUI(); if (u) cloudSync(true); }); return true;
  }).catch(e => { CLOUD.ready = null; acMsg('Could not reach the account server. Check your internet and try again.'); throw e; });
  return CLOUD.ready;
}
function acUI() { const u = CLOUD.user; $('acPillTxt').textContent = u ? u.email + ' · saved' : 'Sign in to save your progress'; $('acPill').classList.toggle('on', !!u); $('acOut').classList.toggle('hide', !!u); $('acInBox').classList.toggle('hide', !u); if (u) $('acWho').textContent = 'Signed in as ' + u.email + (SAVE.cloudAt ? ' · saved ' + new Date(SAVE.cloudAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''); }
const PROG = ['coins', 'hats', 'wins', 'kos', 'games'];
function mergeSave(a, b) { return { coins: Math.max(+a.coins || 0, +b.coins || 0), wins: Math.max(+a.wins || 0, +b.wins || 0), kos: Math.max(+a.kos || 0, +b.kos || 0), games: Math.max(+a.games || 0, +b.games || 0), hats: [...new Set(['none', ...(a.hats || []), ...(b.hats || [])])].filter(k => HATS[k]) }; }
const progKey = o => JSON.stringify(PROG.map(k => o[k]));
async function cloudSync(startup) {
  if (!CLOUD.user || CLOUD.busy) return; CLOUD.busy = true;
  try { const ref = CLOUD.db.collection('saves').doc(CLOUD.user.uid), local = {}; for (const k of PROG) local[k] = SAVE[k];
    let cloud = null; if (startup || !CLOUD.seen) { const snap = await ref.get(); cloud = snap.exists && snap.data().ki ? snap.data().ki : null; CLOUD.seen = true; }
    const merged = cloud ? mergeSave(local, cloud) : mergeSave(local, local), before = progKey(local); Object.assign(SAVE, merged); if (!SAVE.hats.includes(SAVE.hat)) SAVE.hat = 'none';
    const key = progKey(merged); if (cloud ? progKey(cloud) !== key : key !== CLOUD.last) { await ref.set({ ki: merged, kiAt: Date.now() }, { merge: true }); CLOUD.last = key; }
    SAVE.cloudAt = Date.now(); try { localStorage.setItem('knockout', JSON.stringify(SAVE)); } catch (e) {}
    if (startup) acMsg(cloud ? (before !== key ? 'Loaded your account progress ✓' : 'Your progress matches your account ✓') : 'Progress on this device is now saved to your account ✓');
    if (before !== key && state === 'menu') renderMenu(); acUI();
  } catch (e) { acMsg(errText(e)); } finally { CLOUD.busy = false; }
}
function cloudSoon() { if (!CLOUD.user) return; clearTimeout(CLOUD.timer); CLOUD.timer = setTimeout(() => cloudSync(false), 3000); }
const ERRS = { 'auth/invalid-email': 'That email does not look right.', 'auth/missing-password': 'Type a password.', 'auth/weak-password': 'Password needs at least 6 characters.', 'auth/email-already-in-use': 'There is already an account with that email. Tap Sign in instead.', 'auth/invalid-credential': 'Wrong email or password, or no account yet. New here? Tap Create account.', 'auth/wrong-password': 'Wrong password.', 'auth/user-not-found': 'No account with that email yet. Tap Create account.', 'auth/too-many-requests': 'Too many tries. Wait a minute and try again.', 'auth/network-request-failed': 'No internet connection. Try again.' };
const errText = e => ERRS[e && e.code] || ('Something went wrong' + (e && e.code ? ' (' + e.code + ')' : '') + '. Try again.');
{ const creds = () => [($('acEmail').value || '').trim(), $('acPass').value || ''];
  const go = async (fn, msg) => { acMsg(msg); try { await cloudInit(); const [e, p] = creds(); await fn(e, p); $('acPass').value = ''; acMsg('Signed in ✓ Checking your progress…'); } catch (e) { if (e && e.message !== 'load') acMsg(errText(e)); } };
  $('acIn').onclick = () => go((e, p) => CLOUD.auth.signInWithEmailAndPassword(e, p), 'Signing in…');
  $('acUp').onclick = () => go((e, p) => CLOUD.auth.createUserWithEmailAndPassword(e, p), 'Creating your account…');
  $('acForgot').onclick = async () => { const e = creds()[0]; if (!e) { acMsg('Type your email first, then tap Forgot password.'); return; } try { await cloudInit(); await CLOUD.auth.sendPasswordResetEmail(e); acMsg('Reset email sent to ' + e + '. Check your inbox (and spam).'); } catch (er) { acMsg(errText(er)); } };
  $('acSync').onclick = async () => { acMsg('Syncing…'); await cloudSync(true); };
  $('acOutBtn').onclick = async () => { try { await cloudSync(false); } catch (e) {} try { await CLOUD.auth.signOut(); } catch (e) {} CLOUD.seen = false; CLOUD.last = ''; acMsg('Signed out. Your progress stays on this device and in your account.'); };
  $('acPass').addEventListener('keydown', e => { if (e.key === 'Enter') $('acIn').click(); });
  setTimeout(() => cloudInit().catch(() => {}), 1500);
  document.addEventListener('visibilitychange', () => { if (document.hidden && CLOUD.user) cloudSync(false); }); }

/* ---------- installable app ---------- */
{ const standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone, iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installEv = null; if (!standalone && iOS) $('appBtn').classList.remove('hide');
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; if (!standalone) $('appBtn').classList.remove('hide'); });
  $('appBtn').onclick = () => { if (installEv) { installEv.prompt(); installEv = null; $('appBtn').classList.add('hide'); } else location.href = 'KnockoutIsles.mobileconfig'; }; }

/* ---------- boot ---------- */
window.__nbBusy = () => state === 'play' || state === 'paused' || NET.role !== 'off';
try { if (sessionStorage.getItem('ki-upd')) { sessionStorage.removeItem('ki-upd'); setTimeout(() => { try { ($('netMsg').textContent = '✨ Updated to the newest version!'); } catch (e) {} }, 2600); } } catch (e) {}
renderMenu(); fitTouch();
setTimeout(() => { menuScene(); loop(); requestAnimationFrame(() => requestAnimationFrame(() => { try { window.__splashReady && window.__splashReady(); } catch (e) {} })); }, 80);
window.__ki = { startTutorial, TUT, get GM() { return GM; }, get state() { return state; }, get NET() { return NET; }, SAVE, startMatch, rosterOffline, hostStep: dt => hostStep(dt), botThink, tileAt, get ISLE() { return ISLE; }, K, joinRoom, hostRoom, startOnline };
})();
