import * as THREE from 'three';
import { makeBird, makeStall, makeEnvironment, glowTexture, C } from '../shared/models.js';
import { hydrate, money } from '../shared/config.js';

/* ------------------------------------------------------------------ DOM / content */
hydrate((it, i) => `
  <article class="card">
    ${it.tag ? `<span class="tag">${it.tag}</span>` : ''}
    <span class="n">No. ${String(i + 1).padStart(2, '0')}</span>
    <h3>${it.name}</h3>
    <p>${it.note}</p>
    <div class="row"><span class="price">${money(it.price)}</span><span class="unit">/ ${it.unit}</span></div>
  </article>`);
document.getElementById('yr').textContent = new Date().getFullYear();

document.querySelectorAll('.tabs button').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('is-on', x === b));
    document.querySelectorAll('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
  })
);
document.querySelectorAll('.grid').forEach((grid) => {
  grid.addEventListener('pointermove', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.style.transform = `perspective(800px) rotateY(${(x - 0.5) * 9}deg) rotateX(${(0.5 - y) * 9}deg) translateY(-4px)`;
    card.style.setProperty('--mx', x * 100 + '%');
    card.style.setProperty('--my', y * 100 + '%');
  });
  grid.addEventListener('pointerleave', () => grid.querySelectorAll('.card').forEach((c) => (c.style.transform = '')));
  grid.addEventListener('pointerout', (e) => { const c = e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) c.style.transform = ''; });
});

const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('in', e.isIntersecting && e.intersectionRatio > 0.25)), { threshold: [0, 0.25, 0.5] });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

/* ------------------------------------------------------------------ three.js */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const BG = new THREE.Color(C.green);
scene.background = BG.clone();
scene.fog = new THREE.Fog(C.green, 14, 34);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
const env = makeEnvironment(renderer);
scene.environment = env;

// lights
const hemi = new THREE.HemisphereLight(0xffe3c0, 0x06240d, 0.55);
const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
key.position.set(4, 8, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -3, near: 1, far: 24 });
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.02;
const rim = new THREE.DirectionalLight(0xf6d2ab, 1.3);
rim.position.set(-5, 3, -4);
const fire = new THREE.PointLight(0xff7a1f, 0, 14, 2);
const bulbLights = [-2.2, 0, 2.2].map((x) => { const l = new THREE.PointLight(0xffc46b, 0, 8, 2); l.position.set(x, 3.0, 2.2); return l; });
scene.add(hemi, key, rim, fire, ...bulbLights);

// ---- abstract opening scene (says nothing about chicken)
const abs = new THREE.Group();
scene.add(abs);
const pearl = new THREE.Mesh(
  new THREE.SphereGeometry(1.25, 64, 48),
  new THREE.MeshPhysicalMaterial({ color: C.green2, roughness: 0.18, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1 })
);
abs.add(pearl);
const peachMat = new THREE.MeshStandardMaterial({ color: C.cream, roughness: 0.35 });
const greenMat = new THREE.MeshPhysicalMaterial({ color: C.green2, roughness: 0.25, clearcoat: 1 });
const emberMat = new THREE.MeshStandardMaterial({ color: 0xff8a2b, roughness: 0.4, emissive: 0x401800 });
const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.045, 16, 160), peachMat);
const ringB = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.03, 16, 160), peachMat);
ringA.rotation.set(1.2, 0.3, 0);
ringB.rotation.set(0.5, -0.6, 0.4);
abs.add(ringA, ringB);
const orbs = [];
for (let i = 0; i < 16; i++) {
  const r = 0.1 + Math.pow(Math.random(), 2) * 0.5;
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), [peachMat, greenMat, peachMat, emberMat][i % 4]);
  orbs.push({ m, rad: 2.6 + Math.random() * 3.2, ang: Math.random() * 6.28, sp: (0.1 + Math.random() * 0.25) * (i % 2 ? 1 : -1), y: (Math.random() - 0.5) * 3.4, z: (Math.random() - 0.5) * 3 });
  abs.add(m);
}

// ---- bird rig (position/scale/yaw) with the spinning bird inside
const rig = new THREE.Group();
const bird = makeBird();
bird.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material.envMapIntensity = 0.7; } });
rig.add(bird);
scene.add(rig);

// ---- embers
const EMBERS = 280;
const emberGeo = new THREE.BufferGeometry();
const ePos = new Float32Array(EMBERS * 3);
const eSpd = new Float32Array(EMBERS);
for (let i = 0; i < EMBERS; i++) {
  ePos.set([(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8], i * 3);
  eSpd[i] = 0.25 + Math.random() * 0.8;
}
emberGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
const emberMatP = new THREE.PointsMaterial({ map: glowTexture(), color: 0xffa040, size: 0.16, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const embers = new THREE.Points(emberGeo, emberMatP);
scene.add(embers);

// ---- stall
let stall = null;
makeStall({
  logoUrl: '../shared/img/logo-banner.png',
  menuLines: [['Roast Bird', 'Whole'], ['Crispy Wings', '6 pc'], ['Tenders', '5 pc'], ['Fresh Cuts', 'By kg']],
}).then((s) => { stall = s; scene.add(s); });

/* ---------------------------------------------------------------- choreography */
const sm = (t) => t * t * (3 - 2 * t);
const cl = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * t) : a + (b - a) * t);
function kf(u, keys) {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], sm((u - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  }
  return keys[keys.length - 1][1];
}

let narrow = false;
let K = {};
function buildKeys() {
  narrow = innerWidth / innerHeight < 0.85;
  const n = narrow;
  const f = Math.min(1, innerWidth / innerHeight / 1.7);
  K = {
    cam: [[0, [0, 0, 10]], [1, [0, 0.3, n ? 9 : 7]], [2, [0, 0.5, n ? 8.2 : 5.6]], [3, [0, 2.4, n ? 19 : 12.5 + (1 - f) * 7]], [4, [0, 2.6, n ? 15.5 : 9.8 + (1 - f) * 5]]],
    look: [[0, [0, 0, 0]], [1, [0, 0, 0]], [2, [0, 0, 0]], [3, [0, n ? 2.2 : 1.5, 0]], [4, [0, 2.0, 0]]],
    rigPos: [[0, [0, 0, 0]], [0.6, [0, 0, 0]], [1, n ? [0, 1.4, 0] : [1.9 * f, 0, 0]], [2, n ? [0, 1.5, 0] : [-2.1 * f, 0, 0]], [3, [0, 2.15, 0]], [4, [0, 2.15, 0]]],
    rigYaw: [[0, 0], [1, n ? -0.4 : -0.85], [2, n ? 0.35 : 0.7], [3, 0], [4, 0]],
    rigScale: [[1, n ? 0.52 : 0.82 * f], [2, n ? 0.6 : 0.62 * f], [3, 0.75]],
    explode: [[1.2, 0], [2, 0.28], [2.7, 0]],
  };
}
buildKeys();

const bgStops = [[0, [1, 59, 18]], [1, [2, 48, 15]], [2, [3, 36, 12]], [3, [3, 26, 10]], [4, [3, 24, 9]]];
const camTarget = new THREE.Vector3();
const look = new THREE.Vector3();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.85 ? 48 : 40;
  camera.updateProjectionMatrix();
  buildKeys();
  anchors();
}
let A = [0, 1, 2, 3, 4];
function anchors() {
  const vh = innerHeight;
  const top = (el) => el.getBoundingClientRect().top + scrollY;
  const secs = ['story', 'bird', 'stall'].map((id) => document.getElementById(id));
  A = [0, ...secs.map((s) => top(s) + (s.offsetHeight - vh) / 2), top(document.getElementById('menu')) - vh * 0.25];
}
function getU() {
  const y = scrollY;
  if (y <= A[0]) return 0;
  for (let i = 1; i < A.length; i++) if (y <= A[i]) return i - 1 + (y - A[i - 1]) / Math.max(1, A[i] - A[i - 1]);
  return A.length - 1;
}

const dots = [...document.querySelectorAll('.dots li')];
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });
addEventListener('resize', resize);
resize();

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let u = 0, lastY = scrollY, vel = 0;
const clock = new THREE.Clock();

function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  const target = getU();
  u += (target - u) * (1 - Math.exp(-dt * (reduce ? 20 : 5.5)));
  vel += ((Math.abs(scrollY - lastY) / Math.max(dt, 0.001) / 1000) - vel) * 0.1;
  lastY = scrollY;
  mouse.sx += (mouse.x - mouse.sx) * 0.05;
  mouse.sy += (mouse.y - mouse.sy) * 0.05;

  // camera
  camTarget.fromArray(kf(u, K.cam));
  camera.position.set(camTarget.x + mouse.sx * 0.9, camTarget.y - mouse.sy * 0.5, camTarget.z);
  look.fromArray(kf(u, K.look));
  camera.lookAt(look);

  // abstract → bird hand-over
  const absK = 1 - sm(cl((u - 0.25) / 0.7));
  abs.visible = absK > 0.002;
  abs.scale.setScalar(Math.max(0.001, absK));
  abs.rotation.y = t * 0.1 + u * 0.8;
  ringA.rotation.z = t * 0.2;
  ringB.rotation.x = 0.5 + t * 0.12;
  pearl.position.y = Math.sin(t * 0.8) * 0.1;
  orbs.forEach((o, i) => {
    const a = o.ang + t * o.sp;
    const spread = 1 + u * 1.6;
    o.m.position.set(Math.cos(a) * o.rad * spread, o.y + Math.sin(t * 0.6 + i) * 0.15, Math.sin(a) * o.rad * 0.6 + o.z);
  });

  const appear = sm(cl((u - 0.35) / 0.65));
  rig.visible = appear > 0.002;
  const s = kf(u, K.rigScale) * (0.2 + 0.8 * appear) * appear;
  rig.scale.setScalar(Math.max(0.001, s));
  rig.position.fromArray(kf(u, K.rigPos));
  rig.rotation.y = kf(u, K.rigYaw);
  rig.position.y += Math.sin(t * 1.2) * 0.04 * (u < 2.5 ? 1 : 0);
  bird.rotation.x += dt * ((reduce ? 0.1 : 0.45) + vel * 3 + (1 - appear) * 3);
  bird.userData.explode(kf(u, K.explode));

  // stall
  const st = sm(cl((u - 2.2) / 0.8));
  if (stall) stall.userData.setT(st);
  bulbLights.forEach((l, i) => (l.intensity = st * st * (11 + Math.sin(t * 7 + i * 2) * 0.6)));

  // fire / embers / bg
  fire.position.set(rig.position.x, rig.position.y - 0.9 * rig.scale.x, 2.4 * rig.scale.x + 1);
  fire.intensity = appear * (1 - st * 0.6) * (30 + Math.sin(t * 11) * 3 + Math.sin(t * 5.3) * 4);
  emberMatP.opacity = kf(u, [[0, 0], [0.5, 0], [1, 0.95], [3, 0.9], [4, 0.35]]);
  embers.visible = emberMatP.opacity > 0.01;
  if (embers.visible) {
    for (let i = 0; i < EMBERS; i++) {
      let y = ePos[i * 3 + 1] + eSpd[i] * dt;
      if (y > 6) y = -4;
      ePos[i * 3 + 1] = y;
      ePos[i * 3] += Math.sin(t * 1.3 + i) * dt * 0.25;
    }
    emberGeo.attributes.position.needsUpdate = true;
  }
  const bg = kf(u, bgStops);
  scene.background.setRGB(bg[0] / 255, bg[1] / 255, bg[2] / 255, THREE.SRGBColorSpace);
  scene.fog.color.copy(scene.background);

  // chapter dots
  const idx = Math.round(Math.min(3, u));
  dots.forEach((d, i) => d.classList.toggle('on', i === idx));

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- loader */
const bar = document.getElementById('bar');
const loader = document.getElementById('loader');
let hidden = false;
const hide = () => { if (hidden) return; hidden = true; setTimeout(() => loader.classList.add('done'), 400); };
THREE.DefaultLoadingManager.onProgress = (_, a, b) => (bar.style.width = (a / b) * 100 + '%');
THREE.DefaultLoadingManager.onLoad = hide;
setTimeout(() => { bar.style.width = '100%'; hide(); }, 3500);
addEventListener('load', () => { anchors(); });
new ResizeObserver(anchors).observe(document.body);
requestAnimationFrame(frame);
