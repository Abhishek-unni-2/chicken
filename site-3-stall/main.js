import { CONFIG, waLink, mapsLink, money } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(hover: none)').matches;
gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------ content */
$$('[data-cfg]').forEach((el) => {
  const k = el.dataset.cfg;
  if (k === 'phone') { el.textContent = CONFIG.phone; if (el.tagName === 'A') el.href = `tel:${CONFIG.phone.replace(/\s/g, '')}`; }
  else if (k === 'tel') el.href = `tel:${CONFIG.phone.replace(/\s/g, '')}`;
  else if (k === 'address') el.innerHTML = CONFIG.address.join('<br>');
  else if (k === 'hours') el.innerHTML = CONFIG.hours.map(([d, h]) => `<span>${d}</span><b>${h}</b>`).join('');
  else if (k === 'wa') el.href = waLink();
  else if (k === 'maps') el.href = mapsLink();
  else if (k === 'instagram') el.textContent = CONFIG.instagram;
});
$('#yr').textContent = new Date().getFullYear();
$('#today').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
$('#rateList').innerHTML = CONFIG.rates
  .map((r) => `<li><b>${r.name}</b><span class="d"></span><span class="p">${money(r.price)}</span><small>${r.note}</small></li>`)
  .join('');
$$('[data-from]').forEach((el) => {
  const r = CONFIG.rates.find((x) => x.name === el.dataset.from);
  if (r) el.textContent = `from ${money(r.price)}/${r.unit}`;
});
$('#oItem').innerHTML = CONFIG.rates.map((r) => `<option value="${r.name}">${r.name} — ${money(r.price)}/${r.unit}</option>`).join('');

// Real photos: drop cut-out PNGs into /assets (hen.png, dressed.png, cuts.png, bulk.png) and they replace the line art.
$$('img.slot').forEach((img) => {
  const probe = new Image();
  probe.onload = () => { img.src = probe.src; img.closest('.art').classList.add('has-photo'); };
  probe.src = img.dataset.src;
});

/* ------------------------------------------------------------ order form → WhatsApp */
const qty = $('#oQty');
$$('.step button').forEach((b) => b.addEventListener('click', () => {
  qty.value = Math.max(0.5, (parseFloat(qty.value) || 1) + parseFloat(b.dataset.d)).toString();
}));
$('#oform').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#oName').value.trim();
  const msg = `Hi Carne & Gusto! ${name ? `I'm ${name}. ` : ''}I'd like ${qty.value} kg of ${$('#oItem').value} (${$('#oPrep').value.toLowerCase()}). Is it available today?`;
  window.open(waLink(msg), '_blank', 'noopener');
});

/* ------------------------------------------------------------ nav / drawer / dock */
const burger = $('#burger'), drawer = $('#drawer'), nav = $('#nav'), dock = $('.dock');
const setDrawer = (open) => { burger.setAttribute('aria-expanded', open); drawer.classList.toggle('open', open); document.body.style.overflow = open ? 'hidden' : ''; };
burger.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
$$('a', drawer).forEach((a) => a.addEventListener('click', () => setDrawer(false)));
let lastY = 0;
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (s) => {
    const y = s.scroll();
    nav.classList.toggle('hide', y > lastY && y > 300 && !drawer.classList.contains('open'));
    dock.classList.toggle('show', y > innerHeight * 1.2);
    lastY = y;
  },
});

/* ------------------------------------------------------------ flip cards (tap on touch) */
$$('.fcard').forEach((c) => {
  c.addEventListener('click', (e) => { if (e.target.closest('a')) return; if (isTouch || e.detail === 0) c.classList.toggle('flip'); });
  c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.classList.toggle('flip'); } });
});

/* ------------------------------------------------------------ hero: walk into the stall (real 3D dolly) */
const layers = $$('.stall .layer');
const z0 = [-140, -60, 20, 100];
gsap.set(layers, { z: (i) => z0[i] });

const mm = gsap.matchMedia();
mm.add('(min-width: 1px)', () => {
  if (reduce) return;
  const small = innerWidth < 820;
  const zEnd = small ? [160, 330, 620, 820] : [300, 560, 900, 1150];
  const tl = gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: small ? '+=130%' : '+=170%', scrub: 0.7, pin: '.hero__pin', anticipatePin: 1, invalidateOnRefresh: true } });
  tl.to('.hero__text', { y: -120, opacity: 0, ease: 'power2.in', duration: 0.45 }, 0)
    .to('.hero__scroll', { opacity: 0, duration: 0.15 }, 0)
    .to(layers, { z: (i) => zEnd[i], ease: 'power1.inOut', duration: 1, stagger: 0 }, 0)
    .to('.stall', { y: small ? -innerHeight * 0.16 : 0, x: () => { const st = $('.stall'); const r = st.getBoundingClientRect(); return innerWidth / 2 - (r.left + r.width / 2) + gsap.getProperty(st, 'x'); }, ease: 'power1.inOut', duration: 0.8 }, 0)
    .to('.stall .l2', { y: small ? -60 : -120, ease: 'none', duration: 1 }, 0)
    .to('.stall .l3', { opacity: 0, duration: 0.3 }, 0.7);

  // pointer parallax
  if (!isTouch) {
    const xs = layers.map((l, i) => gsap.quickTo(l, 'xPercent', { duration: 0.8, ease: 'power3' }));
    addEventListener('pointermove', (e) => {
      if (scrollY > innerHeight * 0.5) return;
      const mx = e.clientX / innerWidth - 0.5;
      xs.forEach((q, i) => q(mx * (i + 1) * -2.2));
    });
  }
});

/* ------------------------------------------------------------ section reveals */
$$('[data-split]').forEach((el) => {
  gsap.from(el.children, { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 82%' } });
});
gsap.from('.fcard', { y: 90, rotateX: -22, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, transformPerspective: 900, scrollTrigger: { trigger: '.cards', start: 'top 82%' } });
gsap.from('.steps li', { y: 100, rotateX: -35, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '.steps', start: 'top 85%' } });
gsap.from('.rates__copy > *', { y: 50, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.rates', start: 'top 78%' } });
gsap.from('.board', { y: 80, rotate: 6, opacity: 0, duration: 1.1, ease: 'back.out(1.4)', scrollTrigger: { trigger: '.board', start: 'top 85%' } });
gsap.from('#rateList li', { x: -30, opacity: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.board', start: 'top 70%' } });
gsap.from('.oform', { y: 70, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.oform', start: 'top 88%' } });
gsap.from('.rv blockquote', { y: 90, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.14, scrollTrigger: { trigger: '.rv', start: 'top 85%' } });
gsap.from('.visit__grid > *', { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15, scrollTrigger: { trigger: '.visit', start: 'top 75%' } });
gsap.from('.bigmark', { y: 120, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: 'footer', start: 'top 95%' } });

// rate board: subtle 3D tilt
const board = $('#board');
if (!isTouch && !reduce) {
  board.addEventListener('pointermove', (e) => {
    const r = board.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(board, { rotateY: x * 8, rotateX: -y * 8, rotate: -1.6, transformPerspective: 1000, duration: 0.5 });
  });
  board.addEventListener('pointerleave', () => gsap.to(board, { rotateY: 0, rotateX: 0, duration: 0.8 }));
}

/* ------------------------------------------------------------ loader: the rooster draws itself */
const loader = $('#loader');
const lr = $('#lr');
lr.innerHTML = $('#rooster .ln').innerHTML;
const strokes = $$('path', lr);
strokes.forEach((p) => { p.setAttribute('pathLength', 1); p.style.strokeDasharray = 1; p.style.strokeDashoffset = 1; });

const pct = $('#pct');
const counter = { v: 0 };
const ready = Promise.all([
  document.fonts ? document.fonts.ready : Promise.resolve(),
  new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r))),
]);

const intro = () => {
  document.body.classList.remove('is-loading');
  ScrollTrigger.refresh();
  if (reduce) return;
  const t = gsap.timeline({ defaults: { ease: 'power3.out' } });
  t.from('.nav', { y: -80, opacity: 0, duration: 0.8 }, 0.2)
    .from('.hero .eyebrow', { y: 30, opacity: 0, duration: 0.7 }, 0.15)
    .from('.hero h1 span', { y: 90, opacity: 0, rotate: 4, duration: 0.9, stagger: 0.1 }, 0.25)
    .from('.hero__sub, .hero__cta', { y: 30, opacity: 0, duration: 0.8, stagger: 0.1 }, 0.6)
    .from(layers, { y: 140, opacity: 0, duration: 1.2, stagger: 0.1, ease: 'power4.out' }, 0.2);
};

const loaderTl = gsap.timeline();
if (reduce) {
  loader.style.display = 'none';
  document.body.classList.remove('is-loading');
} else {
  loaderTl
    .to(strokes, { strokeDashoffset: 0, duration: 1.1, stagger: 0.06, ease: 'power2.inOut' }, 0.2)
    .to('.lr-eye', { opacity: 1, duration: 0.3 }, 1.5)
    .fromTo('.loader__logo', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7 }, 1.3)
    .to(counter, { v: 100, duration: 2.1, ease: 'power1.inOut', onUpdate: () => (pct.textContent = Math.round(counter.v)) }, 0.1);
  Promise.all([ready, new Promise((r) => loaderTl.eventCallback('onComplete', r))]).then(() => {
    gsap.timeline({ onComplete: () => (loader.style.display = 'none') })
      .to('.loader__center, .loader__count', { opacity: 0, y: -30, duration: 0.4, ease: 'power2.in' })
      .to(loader, { yPercent: -100, duration: 1.05, ease: 'power4.inOut', onStart: () => setTimeout(intro, 450) }, 0.25);
  });
}
if (reduce) intro();
addEventListener('load', () => ScrollTrigger.refresh());
