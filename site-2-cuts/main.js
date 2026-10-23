import * as THREE from 'three';
import { makeBird, makeStall, makeEnvironment, makeDrumstick, makeWing, makeTenders, makeBreast } from '../shared/models.js';
import { CONFIG, hydrate, money } from '../shared/config.js';

/* ------------------------------------------------------------------ content */
hydrate((it) => `
  <li class="mi">
    <h4>${it.name}${it.tag ? `<span class="tag">${it.tag}</span>` : ''}</h4>
    <span class="dots"></span>
    <span class="p">${money(it.price)}<small>/ ${it.unit}</small></span>
    <p>${it.note}</p>
  </li>`);
document.getElementById('yr').textContent = new Date().getFullYear();

const find = (grp, name) => CONFIG.menu[grp].find((i) => i.name === name);
const CUTS = [
  { sub: 'Drumstick & thigh', name: 'Legs', desc: 'Dark, juicy, bone-in. The one everybody reaches for first.', rows: [['Hot', find('ready', 'Grilled Leg Quarter')], ['Fresh', find('fresh', 'Drumsticks')]], make: makeDrumstick },
  { sub: 'Crisp & spiced', name: 'Wings', desc: 'Double-crisp with our house spice dust. Come for one, leave with six.', rows: [['Hot', find('ready', 'Crispy Wings')], ['Fresh', find('fresh', 'Wings')]], make: makeWing },
  { sub: 'Hand-cut strips', name: 'Tenders', desc: 'Tender, golden, built for dipping. Cut by hand every morning.', rows: [['Hot', find('ready', 'Chicken Tenders')]], make: makeTenders },
  { sub: 'Lean & tender', name: 'Breast', desc: 'Roasted with rosemary or sold fresh and boneless — trimmed, ready to cook.', rows: [['Hot', find('ready', 'Half Roast Chicken')], ['Fresh', find('fresh', 'Boneless Breast')]], make: makeBreast },
];
const el = (id) => document.getElementById(id);
const card = el('cutcard');
let shown = -1;
function showCut(i) {
  if (i === shown) return;
  const first = shown < 0;
  shown = i;
  const c = CUTS[i];
  const fill = () => {
    el('cSub').textContent = c.sub;
    el('cName').textContent = c.name;
    el('cDesc').textContent = c.desc;
    el('cPrice').innerHTML = c.rows.map(([k, it]) => `<li><span><small>${k.toUpperCase()}</small>${it.name}</span><b>${money(it.price)}<small style="font-size:12px;opacity:.6"> /${it.unit}</small></b></li>`).join('');
    el('cIdx').textContent = String(i + 1).padStart(2, '0');
    card.classList.remove('swap');
  };
  if (first) fill();
  else { card.classList.add('swap'); setTimeout(fill, 280); }
}

/* ------------------------------------------------------------------ three.js */
const canvas = el('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.environment = makeEnvironment(renderer);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);

const hemi = new THREE.HemisphereLight(0xffe3c0, 0x6b3a1c, 0.7);
const key = new THREE.DirectionalLight(0xfff0dc, 2.6);
key.position.set(4, 8, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -3, near: 1, far: 24 });
key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
const rim = new THREE.DirectionalLight(0xfff4e6, 1.2);
rim.position.set(-5, 3, -4);
const bulbLights = [-2.2, 0, 2.2].map((x) => { const l = new THREE.PointLight(0xffc46b, 0, 8, 2); l.position.set(x, 3.0, 2.2); return l; });
scene.add(hemi, key, rim, ...bulbLights);

// ---- opening blob (an ember-orange orb — nothing chicken about it)
const blobGeo = new THREE.SphereGeometry(1.5, 72, 54);
const base = blobGeo.attributes.position.array.slice();
const blob = new THREE.Mesh(blobGeo, new THREE.MeshPhysicalMaterial({ color: 0xff6a1f, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x3a0f00 }));
scene.add(blob);
const sn = (x, y, z) => Math.sin(x * 1.7 + y * 2.3) * Math.sin(y * 1.9 + z * 2.9) * Math.sin(z * 2.1 + x * 1.3);
function wobble(t, amt) {
  const p = blobGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
    const d = 1 + amt * (sn(x * 1.1 + t * 0.5, y * 1.1, z * 1.1 + t * 0.3) * 0.7 + sn(x * 2.2, y * 2.2 + t * 0.7, z * 2.2) * 0.3);
    p.setXYZ(i, x * d, y * d, z * d);
  }
  p.needsUpdate = true;
  blobGeo.computeVertexNormals();
}

// ---- bird
const rig = new THREE.Group();
const bird = makeBird();
bird.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material.envMapIntensity = 0.8; } });
rig.add(bird);
scene.add(rig);

// ---- cuts carousel
const ring = new THREE.Group();
const pieces = CUTS.map((c, k) => {
  const holder = new THREE.Group();
  const obj = c.make();
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material.envMapIntensity = 0.8; } });
  holder.add(obj);
  const R = 3.4, a = (k * Math.PI) / 2;
  holder.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
  ring.add(holder);
  return { holder, obj };
});
scene.add(ring);

// ---- stall
let stall = null;
makeStall({ logoUrl: '../shared/img/logo-banner.png' }).then((s) => { stall = s; scene.add(s); });

/* ---------------------------------------------------------------- choreography */
const sm = (t) => t * t * (3 - 2 * t);
const cl = (v) => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a + (b - a) * t;
const PEACH = [246, 210, 171], NIGHT = [3, 26, 10];

let narrow = false, f = 1;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  narrow = w / h < 0.85;
  f = Math.min(1, w / h / 1.7);
  camera.fov = narrow ? 50 : 40;
  camera.updateProjectionMatrix();
  measure();
}
const SECS = ['hero', 'bird', 'cuts', 'stall'].map(el);
let M = [];
function measure() { M = SECS.map((s) => ({ top: s.getBoundingClientRect().top + scrollY, len: s.offsetHeight - innerHeight })); }
function getU() {
  const y = scrollY;
  if (y <= M[0].top) return 0;
  for (let i = 0; i < M.length; i++) {
    const { top, len } = M[i];
    if (y <= top + len) return i + cl((y - top) / len);
    const nxt = M[i + 1];
    if (nxt && y < nxt.top) return i + 1;
  }
  return M.length;
}

const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });
addEventListener('resize', resize);
new ResizeObserver(measure).observe(document.body);
resize();

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const birdStage = SECS[1].querySelector('.stage'), stallStage = SECS[3].querySelector('.stage');
const bar = el('cBar'), cutsStage = SECS[2].querySelector('.stage');
const look = new THREE.Vector3(), cam = new THREE.Vector3();
let u = 0, lastY = scrollY, vel = 0;
const clock = new THREE.Clock();

function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  u += (getU() - u) * (1 - Math.exp(-dt * (reduce ? 20 : 5.5)));
  vel += (Math.abs(scrollY - lastY) / Math.max(dt, 0.001) / 1000 - vel) * 0.1;
  lastY = scrollY;
  mouse.sx += (mouse.x - mouse.sx) * 0.05;
  mouse.sy += (mouse.y - mouse.sy) * 0.05;

  // ---- blob → bird (u 0..1)
  const blobK = 1 - sm(cl((u - 0.35) / 0.55));
  blob.visible = blobK > 0.003;
  blob.scale.setScalar(Math.max(0.001, blobK) * (narrow ? 0.5 : 0.62));
  blob.position.set(mouse.sx * 0.6, -mouse.sy * 0.4 + Math.sin(t) * 0.08, 0);
  blob.rotation.y = t * 0.2;
  if (blob.visible) wobble(t, 0.1 + vel * 0.5);

  const appear = sm(cl((u - 0.55) / 0.45));
  const split = sm(cl((u - 1.35) / 0.6)); // bird explodes then vanishes into cuts
  const absorbed = sm(cl((u - 1.75) / 0.35));
  const toStall = sm(cl((u - 2.85) / 0.4));
  const bs = (narrow ? 0.55 : 0.82 * f) * appear * (1 - absorbed);
  const stallBird = toStall;
  const rs = mix(bs, 0.75, stallBird);
  rig.visible = rs > 0.01;
  rig.scale.setScalar(Math.max(0.001, rs));
  rig.position.set(0, mix(narrow ? 0.4 : 0, 2.15, stallBird), 0);
  rig.rotation.y = mix(0.3, 0, stallBird);
  rig.rotation.z = mix(-0.12, 0, stallBird);
  bird.rotation.x += dt * ((reduce ? 0.1 : 0.5) + vel * 3 + (1 - appear) * 3 + split * 2);
  bird.userData.explode(split * 1.5 * (1 - stallBird));

  // ---- cuts carousel (u 2..3)
  const cp = cl(u - 2);
  const raw = cp * 3.999;
  const i = Math.floor(raw), fr = raw - i;
  const a = i + sm(cl((fr - 0.55) / 0.45));
  const cutsIn = sm(cl((u - 1.55) / 0.5)) * (1 - sm(cl((u - 2.9) / 0.25)));
  ring.visible = cutsIn > 0.003;
  ring.scale.setScalar(Math.max(0.001, cutsIn));
  ring.position.set(narrow ? 0 : 1.9 * f, narrow ? 1.5 : 0, 0);
  ring.rotation.y = -a * Math.PI / 2;
  pieces.forEach((p, k) => {
    p.obj.rotation.y = t * 0.6 + k;
    p.holder.position.y = Math.sin(t * 1.1 + k * 1.7) * 0.1;
  });
  if (u > 1.9 && u < 3.1) {
    showCut(Math.min(3, Math.round(a)));
    bar.style.width = (cp * 100).toFixed(1) + '%';
  }

  // ---- stall (u 3..4)
  const sp = cl(u - 3);
  if (stall) stall.userData.setT(sm(cl((u - 2.8) / 0.6)));
  const st = cl((u - 2.8) / 0.6);
  bulbLights.forEach((l, k) => (l.intensity = st * st * (11 + Math.sin(t * 7 + k * 2) * 0.6)));

  // camera: straight on, then orbit the stall
  const w = sm(cl((u - 2.75) / 0.5));
  const ang = mix(-0.85, 0.85, sp);
  const R = (narrow ? 20 : 13 + (1 - f) * 6) - sp * 1.5;
  const h = mix(5.2, 2.4, sm(sp));
  cam.set(Math.sin(ang) * R, h, Math.cos(ang) * R);
  const dflt = [0, 0.3, narrow ? 10.5 : 8.5];
  camera.position.set(
    mix(dflt[0], cam.x, w) + mouse.sx * 0.8,
    mix(dflt[1], cam.y, w) - mouse.sy * 0.4,
    mix(dflt[2], cam.z, w)
  );
  look.set(0, mix(0, narrow ? 2.4 : 1.7, w), 0);
  camera.lookAt(look);

  // page colour: peach → night green
  const c = sm(cl((u - 2.8) / 0.45));
  cutsStage.style.opacity = 1 - sm(cl((u - 2.8) / 0.15));
  document.body.style.background = `rgb(${PEACH.map((v, k) => Math.round(mix(v, NIGHT[k], c))).join(',')})`;
  birdStage.classList.toggle('on', u > 1.15 && u < 2.0);
  stallStage.classList.toggle('on', u > 3.25);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- loader */
const loader = el('loader');
let hidden = false;
const hide = () => { if (hidden) return; hidden = true; setTimeout(() => loader.classList.add('done'), 300); };
THREE.DefaultLoadingManager.onLoad = hide;
setTimeout(hide, 3500);
showCut(0);
requestAnimationFrame(frame);
