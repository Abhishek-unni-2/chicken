// Procedural 3D models for Carne & Gusto — no external assets, everything is built from primitives.
import * as THREE from 'three';

export const C = {
  green: 0x013b12,
  green2: 0x0b5a22,
  green3: 0x08421a,
  cream: 0xf6d2ab,
  creamDeep: 0xe8c79b,
  wood: 0x8a5a33,
  steel: 0xb9c2c6,
};

/* ---------- helpers ---------- */
const sn = (x, y, z) => Math.sin(x * 1.7 + y * 2.3) * Math.sin(y * 1.9 + z * 2.9) * Math.sin(z * 2.1 + x * 1.3);
const fbm = (x, y, z) =>
  0.5 + 0.5 * (sn(x, y, z) * 0.6 + sn(x * 2.3 + 5, y * 2.3, z * 2.3) * 0.3 + sn(x * 5.1, y * 5.1 + 3, z * 5.1) * 0.1);

const SKIN_GOLD = new THREE.Color(0xe39a35);
const SKIN_DARK = new THREE.Color(0x9a4512);
const SKIN_LIGHT = new THREE.Color(0xf3c06a);

/** Bumpy, mottled "roasted skin": displaces along normals and bakes vertex colours. */
function roastGeo(geo, seed = 0, amp = 0.05, freq = 3) {
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = fbm(x * freq + seed, y * freq, z * freq);
    const b = fbm(x * freq * 2.7 + 9, y * freq * 2.7 + seed, z * freq * 2.7);
    const d = (a - 0.5) * amp + (b - 0.5) * amp * 0.6;
    p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
    c.copy(SKIN_GOLD).lerp(SKIN_DARK, THREE.MathUtils.smoothstep(a, 0.45, 0.85) * 0.85);
    c.lerp(SKIN_LIGHT, THREE.MathUtils.smoothstep(b, 0.6, 0.95) * 0.5);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

const skinMat = () =>
  new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.35,
  });
const boneMat = () => new THREE.MeshStandardMaterial({ color: 0xf1e3cc, roughness: 0.6 });
const steelMat = () => new THREE.MeshStandardMaterial({ color: C.steel, roughness: 0.22, metalness: 1 });

function roastMesh(geo, mat, seed, amp, freq, scale, pos) {
  const m = new THREE.Mesh(roastGeo(geo, seed, amp, freq), mat);
  if (scale) m.scale.set(...scale);
  if (pos) m.position.set(...pos);
  m.castShadow = true;
  return m;
}

/* ---------- the roast chicken ---------- */
/** Whole bird lying along the X axis (spit axis). userData.parts drives the "explode" animation. */
export function makeBird({ spit = true } = {}) {
  const g = new THREE.Group();
  const skin = skinMat();
  const parts = [];
  const add = (obj, dir) => {
    g.add(obj);
    parts.push({ obj, rest: obj.position.clone(), dir: new THREE.Vector3(...dir) });
  };

  add(roastMesh(new THREE.SphereGeometry(1, 72, 56), skin, 1, 0.07, 2.6, [1.45, 0.95, 0.95], [0, 0, 0]), [0, 0, 0]);
  add(roastMesh(new THREE.SphereGeometry(1, 56, 44), skin, 4, 0.06, 2.8, [0.95, 0.62, 0.8], [-0.4, 0.3, 0]), [-0.3, 1, 0]);

  for (const s of [1, -1]) {
    // thigh
    add(roastMesh(new THREE.SphereGeometry(1, 40, 32), skin, 7 + s, 0.06, 3, [0.7, 0.45, 0.42], [0.8, -0.28, s * 0.72]), [0.5, -0.4, s * 1.1]);
    // drumstick: meat + bone
    const leg = new THREE.Group();
    leg.add(roastMesh(new THREE.CapsuleGeometry(0.19, 0.7, 10, 24), skin, 11 + s, 0.05, 3.4));
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.34, 14), boneMat());
    bone.position.y = 0.62;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), boneMat());
    knob.position.y = 0.82;
    leg.add(bone, knob);
    leg.position.set(1.5, -0.38, s * 0.66);
    leg.rotation.set(s * 0.18, 0, -Math.PI / 2 + 0.28);
    leg.traverse((o) => (o.castShadow = true));
    add(leg, [1.2, -0.3, s * 1.1]);
    // wing
    const wing = roastMesh(new THREE.CapsuleGeometry(0.2, 0.62, 8, 20), skin, 20 + s, 0.05, 3.2, [1, 1, 0.55], [-0.15, 0.08, s * 0.93]);
    wing.rotation.z = Math.PI / 2 - 0.15;
    add(wing, [-0.2, 0.5, s * 1.5]);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.28, 18), skin);
  neck.geometry = roastGeo(neck.geometry, 3, 0.03, 4);
  neck.rotation.z = Math.PI / 2;
  neck.position.set(-1.5, 0, 0);
  add(neck, [-1, 0, 0]);

  if (spit) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 5.4, 16), steelMat());
    rod.rotation.z = Math.PI / 2;
    g.add(rod);
    for (const x of [-2.7, 2.7]) {
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), steelMat());
      k.position.x = x;
      g.add(k);
    }
    for (const x of [-1.15, 1.2]) {
      const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.035, 24), steelMat());
      fork.rotation.z = Math.PI / 2;
      fork.position.x = x;
      g.add(fork);
    }
  }
  g.userData.parts = parts;
  g.userData.explode = (e) => parts.forEach((p) => p.obj.position.copy(p.rest).addScaledVector(p.dir, e));
  return g;
}

/* ---------- individual cuts (upright, centred, ~1.6 tall) ---------- */
export function makeDrumstick() {
  const g = new THREE.Group();
  const skin = skinMat();
  const meat = roastMesh(new THREE.SphereGeometry(1, 56, 44), skin, 31, 0.06, 2.8, [0.62, 0.78, 0.6], [0, 0.32, 0]);
  const taper = roastMesh(new THREE.CylinderGeometry(0.2, 0.08, 0.8, 24, 8), skin, 32, 0.04, 3.4, null, [0, -0.35, 0]);
  const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.5, 14), boneMat());
  bone.position.y = -0.9;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), boneMat());
  knob.position.set(0.05, -1.18, 0);
  const knob2 = knob.clone();
  knob2.position.set(-0.07, -1.16, 0.05);
  g.add(meat, taper, bone, knob, knob2);
  g.rotation.z = 0.5;
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export function makeWing() {
  const g = new THREE.Group();
  const skin = skinMat();
  const a = roastMesh(new THREE.CapsuleGeometry(0.24, 0.7, 10, 22), skin, 41, 0.05, 3.2, [1, 1, 0.8], [0, 0.45, 0]);
  a.rotation.z = -0.5;
  const b = roastMesh(new THREE.CapsuleGeometry(0.2, 0.8, 10, 22), skin, 43, 0.05, 3.2, [1.1, 1, 0.5], [0.5, -0.38, 0]);
  b.rotation.z = 0.9;
  const tip = roastMesh(new THREE.SphereGeometry(1, 28, 20), skin, 44, 0.04, 4, [0.18, 0.4, 0.1], [1.03, -0.78, 0]);
  tip.rotation.z = 0.5;
  g.add(a, b, tip);
  g.scale.setScalar(0.95);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export function makeTenders() {
  const g = new THREE.Group();
  const skin = skinMat();
  const defs = [
    [-0.55, 0.0, 0.0, 0.5, 0.0],
    [0.0, 0.18, 0.25, -0.35, 0.7],
    [0.5, -0.05, -0.2, 0.15, -0.4],
  ];
  defs.forEach(([x, y, z, rz, ry], i) => {
    const t = roastMesh(new THREE.CapsuleGeometry(0.2, 0.95, 10, 22), skin, 51 + i, 0.07, 3.6, [1, 1, 0.75], [x, y, z]);
    t.rotation.set(0, ry, rz);
    g.add(t);
  });
  g.rotation.set(0.2, 0, 0);
  return g;
}

export function makeBreast() {
  const g = new THREE.Group();
  const skin = skinMat();
  const lobe = roastMesh(new THREE.SphereGeometry(1, 56, 44), skin, 61, 0.08, 2.4, [1.0, 0.5, 0.72], [0, 0, 0]);
  const lobe2 = roastMesh(new THREE.SphereGeometry(1, 40, 32), skin, 62, 0.07, 2.8, [0.75, 0.38, 0.55], [0.1, 0.15, 0.18]);
  lobe.rotation.z = -0.15;
  g.add(lobe, lobe2);
  // rosemary sprigs
  const gm = new THREE.MeshStandardMaterial({ color: 0x2f7a2c, roughness: 0.7 });
  for (let i = 0; i < 7; i++) {
    const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.22, 3, 6), gm);
    l.position.set(-0.2 + i * 0.07, 0.5, 0.05 + Math.sin(i) * 0.08);
    l.rotation.set(Math.PI / 2 + Math.sin(i * 2) * 0.4, 0, 0.9 + i * 0.35);
    g.add(l);
  }
  return g;
}

/* ---------- textures ---------- */
export function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function chalkTexture(title, lines, { w = 1024, h = 700 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#10301a';
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 1800; i++) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
    x.fillRect(Math.random() * w, Math.random() * h, Math.random() * 80, 2);
  }
  x.strokeStyle = '#f6d2ab';
  x.lineWidth = 6;
  x.strokeRect(26, 26, w - 52, h - 52);
  x.fillStyle = '#f6d2ab';
  x.textAlign = 'center';
  x.font = '110px "Bebas Neue", Impact, sans-serif';
  x.fillText(title, w / 2, 150);
  x.textAlign = 'left';
  x.font = '64px "Bebas Neue", Impact, sans-serif';
  lines.forEach(([a, b], i) => {
    const y = 250 + i * 90;
    x.globalAlpha = 0.92;
    x.fillText(a, 90, y);
    x.textAlign = 'right';
    x.fillText(b, w - 90, y);
    x.textAlign = 'left';
    x.globalAlpha = 0.35;
    x.setLineDash([3, 12]);
    x.lineWidth = 4;
    x.beginPath();
    const tw = x.measureText(a).width;
    x.moveTo(90 + tw + 24, y - 10);
    x.lineTo(w - 90 - x.measureText(b).width - 24, y - 10);
    x.stroke();
    x.setLineDash([]);
    x.globalAlpha = 1;
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- the stall ---------- */
const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (t, a, b) => ease(clamp01((t - a) / (b - a)));
const back = (t) => { const c1 = 1.70158, c3 = c1 + 1; const u = clamp01(t); return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };

/**
 * Market stall. Call stall.userData.setT(0..1) to play the "build" animation.
 * Bird is NOT included — place it at (0, 2.15, 0) scale .75 to sit on the rotisserie stands.
 */
export async function makeStall({ logoUrl, menuLines } = {}) {
  try { await document.fonts.load('60px "Bebas Neue"'); } catch (e) { /* fonts optional */ }
  const g = new THREE.Group();
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  };
  const P = {};

  P.ground = new THREE.Mesh(new THREE.CircleGeometry(10, 64), std(0x06240d, { roughness: 1 }));
  P.ground.rotation.x = -Math.PI / 2;
  g.add(P.ground);

  // counter
  P.counter = new THREE.Group();
  P.counter.add(box(5.4, 1.1, 1.7, std(C.green2), 0, 0.55, 0));
  P.counter.add(box(5.7, 0.12, 2.0, std(C.creamDeep, { roughness: 0.45 }), 0, 1.16, 0.05));
  P.counter.add(box(5.5, 0.1, 1.8, std(0x05280d), 0, 0.05, 0));
  for (let i = 0; i < 4; i++) {
    const x = -2.0 + i * 1.33;
    P.counter.add(box(1.15, 0.7, 0.04, std(C.cream), x, 0.55, 0.86));
    P.counter.add(box(1.05, 0.6, 0.06, std(C.green3), x, 0.55, 0.87));
  }
  // rotisserie stands + motor
  for (const x of [-1.85, 1.85]) {
    P.counter.add(box(0.1, 0.9, 0.1, new THREE.MeshStandardMaterial({ color: C.steel, metalness: 1, roughness: 0.3 }), x, 1.67, 0));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 20, Math.PI), new THREE.MeshStandardMaterial({ color: C.steel, metalness: 1, roughness: 0.3 }));
    ring.position.set(x, 2.12, 0);
    ring.rotation.y = Math.PI / 2;
    ring.rotation.z = Math.PI;
    P.counter.add(ring);
  }
  P.counter.add(box(0.5, 0.45, 0.5, new THREE.MeshStandardMaterial({ color: 0x20262a, metalness: 0.8, roughness: 0.4 }), 2.35, 1.46, 0));
  g.add(P.counter);

  // back wall
  P.wall = new THREE.Group();
  P.wall.add(box(5.9, 3.5, 0.15, std(C.green3), 0, 1.75, -1.0));
  const menuTex = chalkTexture('TODAY', menuLines || [['Roast Bird', 'Whole'], ['Crispy Wings', '6 pc'], ['Tenders', '5 pc'], ['Fresh Cuts', 'By kg']]);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.56), new THREE.MeshStandardMaterial({ map: menuTex, roughness: 0.9 }));
  board.position.set(-1.95, 2.25, -0.91);
  const frame = box(2.45, 1.7, 0.06, std(C.wood), -1.95, 2.25, -0.95);
  P.wall.add(frame, board);
  P.wall.add(box(1.9, 0.05, 0.05, std(C.steel, { metalness: 1, roughness: 0.3 }), 1.95, 3.0, -0.88));
  for (const x of [1.35, 1.95, 2.55]) {
    const b = makeBird({ spit: false });
    b.scale.setScalar(0.26);
    b.rotation.z = Math.PI / 2;
    b.position.set(x, 2.45, -0.8);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 14, Math.PI * 1.5), std(C.steel, { metalness: 1 }));
    hook.position.set(x, 3.0, -0.84);
    P.wall.add(b, hook);
  }
  g.add(P.wall);

  // poles
  P.poles = new THREE.Group();
  for (const x of [-2.85, 2.85]) for (const z of [-0.9, 1.1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.5, 14), std(C.creamDeep, { roughness: 0.5 }));
    pole.geometry.translate(0, 1.75, 0);
    pole.position.set(x, 0, z);
    P.poles.add(pole);
  }
  g.add(P.poles);

  // awning (striped roof + scalloped valance)
  P.awning = new THREE.Group();
  const nStripes = 11, W = 6.6, sw = W / nStripes;
  const stripeMat = [std(C.green2, { roughness: 0.8, side: THREE.DoubleSide }), std(C.cream, { roughness: 0.8, side: THREE.DoubleSide })];
  for (let i = 0; i < nStripes; i++) {
    const x = -W / 2 + sw * (i + 0.5);
    P.awning.add(box(sw, 0.05, 3.3, stripeMat[i % 2], x, 0, 0));
  }
  const valance = new THREE.Group();
  for (let i = 0; i < nStripes; i++) {
    const x = -W / 2 + sw * (i + 0.5);
    const m = stripeMat[i % 2];
    valance.add(box(sw, 0.24, 0.04, m, x, -0.12, 0));
    const sc = new THREE.Mesh(new THREE.CircleGeometry(sw / 2, 24, Math.PI, Math.PI), m);
    sc.position.set(x, -0.24, 0);
    valance.add(sc);
  }
  valance.position.set(0, 0, 1.65);
  valance.rotation.x = -0.2;
  P.awning.add(valance);
  P.awning.position.set(0, 3.55, 0.3);
  P.awning.rotation.x = 0.2;
  P.awningBase = P.awning.position.y;
  g.add(P.awning);

  // string lights
  const glow = glowTexture();
  P.lights = new THREE.Group();
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20, x = (u - 0.5) * 6.0;
    pts.push(new THREE.Vector3(x, 3.18 - 0.32 * (1 - Math.pow(Math.abs(u - 0.5) * 2, 2)) * (1 + 0), 1.95 + 0.1));
  }
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.008, 5), std(0x111111));
  P.lights.add(wire);
  P.bulbs = [];
  for (let i = 1; i < 20; i += 2) {
    const p = pts[i];
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), bulbMat);
    b.position.copy(p).add(new THREE.Vector3(0, -0.07, 0));
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffb457, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.setScalar(0.4);
    s.position.copy(b.position);
    P.lights.add(b, s);
    P.bulbs.push(s);
  }
  g.add(P.lights);

  // sign on top
  P.sign = new THREE.Group();
  const signMat = std(C.green, { roughness: 0.6 });
  let logoMat = std(C.green);
  if (logoUrl) {
    const tex = new THREE.TextureLoader().load(logoUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    logoMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
  }
  const signBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 0.16), [signMat, signMat, signMat, signMat, logoMat, signMat]);
  P.sign.add(signBody);
  P.sign.add(box(4.4, 0.08, 0.2, std(C.cream), 0, 0.74, 0), box(4.4, 0.08, 0.2, std(C.cream), 0, -0.74, 0));
  for (const x of [-1.6, 1.6]) P.sign.add(box(0.07, 0.5, 0.07, std(C.creamDeep), x, -0.95, -0.05));
  P.sign.position.set(0, 4.6, 0.95);
  P.sign.rotation.x = -0.08;
  g.add(P.sign);

  // props: crates, A-frame, barrel
  P.props = new THREE.Group();
  const crateM = std(C.wood, { roughness: 0.9 });
  const crate = (x, y, z, r = 0) => {
    const c = new THREE.Group();
    c.add(box(0.9, 0.55, 0.7, crateM));
    c.add(box(0.94, 0.08, 0.74, std(0x6d4526), 0, 0.2, 0));
    c.add(box(0.94, 0.08, 0.74, std(0x6d4526), 0, -0.2, 0));
    c.position.set(x, y, z);
    c.rotation.y = r;
    return c;
  };
  P.props.add(crate(-3.7, 0.28, 0.7, 0.2), crate(-3.6, 0.83, 0.65, -0.15));
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.9, 20), std(C.green2, { roughness: 0.6 }));
  barrel.position.set(3.75, 0.45, 0.3);
  P.props.add(barrel);
  const aMat = new THREE.MeshStandardMaterial({ map: chalkTexture('FRESH', [['Every', 'Morning'], ['Never', 'Frozen']], { w: 700, h: 900 }), roughness: 0.9 });
  for (const s of [1, -1]) {
    const pl = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.05), s > 0 ? aMat : std(C.wood));
    pl.position.set(3.55, 0.7, 2.0 + s * 0.28);
    pl.rotation.x = -s * 0.18;
    if (s < 0) pl.rotation.y = Math.PI;
    P.props.add(pl);
  }
  g.add(P.props);

  g.traverse((o) => {
    if (o.isMesh && o !== P.ground) { o.castShadow = true; o.receiveShadow = true; }
  });
  P.ground.receiveShadow = true;

  /** build animation, t in 0..1 */
  g.userData.setT = (t) => {
    g.visible = t > 0.001;
    P.ground.scale.setScalar(0.3 + 0.7 * seg(t, 0, 0.25));
    P.ground.material.opacity = 1;
    P.counter.position.y = -(1 - seg(t, 0.05, 0.38)) * 4;
    P.wall.position.y = -(1 - seg(t, 0.12, 0.45)) * 5;
    P.poles.children.forEach((p, i) => (p.scale.y = Math.max(0.001, seg(t, 0.25 + i * 0.03, 0.55))));
    P.awning.position.y = P.awningBase + (1 - back(clamp01((t - 0.45) / 0.3))) * 4.5;
    P.awning.visible = t > 0.46;
    const sg = back(clamp01((t - 0.7) / 0.22));
    P.sign.scale.setScalar(Math.max(0.001, sg));
    P.sign.visible = t > 0.7;
    P.lights.visible = t > 0.8;
    P.bulbs.forEach((b, i) => (b.material.opacity = 0.7 * seg(t, 0.82 + i * 0.01, 1)));
    P.props.children.forEach((c, i) => c.scale.setScalar(Math.max(0.001, back(clamp01((t - 0.55 - i * 0.04) / 0.25)))));
  };
  g.userData.parts = P;
  g.userData.setT(0);
  return g;
}

/** Shared studio-ish environment so metal + clearcoat have something to reflect. */
export function makeEnvironment(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x0b2a14, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, color, int) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(int), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  panel(10, 6, 0, 12, 4, 0xfff0d8, 3);
  panel(6, 10, -12, 3, 3, 0xffc98a, 2.2);
  panel(6, 10, 12, 2, -4, 0xf6d2ab, 1.6);
  panel(14, 3, 0, -2, 13, 0xffffff, 1.2);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.03).texture;
  pm.dispose();
  return tex;
}
