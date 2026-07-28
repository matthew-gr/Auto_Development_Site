/* ============================================================
   VELOCE — scroll engine
   Canvas frame-sequence scrub + overlay crossfade + solution wheel
   + pinned-title engagement fade. Driven from one Lenis rAF loop.
   ============================================================ */

/* ---- Canvas image-sequence scrub (hero, solutions background) ---- */
function initScrub(cfg) {
  const section = document.querySelector(cfg.section);
  const canvas  = section.querySelector("canvas");
  const ctx     = canvas.getContext("2d", { alpha: false });
  const lines   = [...section.querySelectorAll(".reveal-line")];
  const bgFill  = cfg.bg || "#0a0a12";
  const images = [];
  let firstDrawn = false;
  for (let i = 0; i < cfg.frameCount; i++) {
    const img = new Image();
    img.src = cfg.framePath(i);
    img.onload = () => { if (!firstDrawn) { firstDrawn = true; draw(0); canvas.style.opacity = "1"; } };
    images[i] = img;
  }
  let current = -1;
  function draw(index) {
    const img = images[index];
    if (!img || !img.complete || !img.naturalWidth) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    let dw, dh, dx, dy;
    if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
    else         { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
    ctx.fillStyle = bgFill; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = canvas.clientWidth  * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(current < 0 ? 0 : current);
  }
  const N = lines.length;
  function update() {
    const rect = section.getBoundingClientRect();
    if (rect.bottom < -window.innerHeight || rect.top > window.innerHeight) return;
    const scrollable = rect.height - window.innerHeight;
    const p = Math.min(Math.max(-rect.top / scrollable, 0), 1);
    const idx = Math.min(cfg.frameCount - 1, Math.floor(p * (cfg.frameCount - 1)));
    if (idx !== current) { current = idx; draw(idx); }

    // Overlay fade: longer, smoother transitions. First line is full from the
    // very start (no blank on load); the windows leave a tiny gap between the
    // rest, so a blank frame or two between titles while scrolling is fine.
    const F = 0.08;
    lines.forEach((el, i) => {
      const a = parseFloat(el.dataset.in), b = parseFloat(el.dataset.out);
      const fi = (i === 0)     ? 0 : F;   // first line: no fade-in (visible from p=0)
      const fo = (i === N - 1) ? 0 : F;   // last line:  no fade-out (holds to p=1)
      let o;
      if (p < a - fi)        o = 0;
      else if (p < a)        o = (p - (a - fi)) / fi;
      else if (p <= b)       o = 1;
      else if (p < b + fo)   o = 1 - (p - b) / fo;
      else                   o = 0;
      o = Math.max(0, Math.min(1, o));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${(1 - o) * 14}px)`;
    });
  }
  window.addEventListener("resize", resize);
  resize();
  return { update, resize };
}

/* ---- Scrolling-wheel: one item locks at the reading spot at a time ----
   Every item enters from below, rises through the same reading position,
   and fades out upward. Used for both the solutions and the engagements. */
function initWheel(sel, itemSel, opts) {
  const section = document.querySelector(sel);
  if (!section) return null;
  opts = opts || {};
  const items   = [...section.querySelectorAll(itemSel)];
  const N       = items.length;
  const travel  = opts.travel  != null ? opts.travel  : 14;   // vh of rise
  const falloff = opts.falloff != null ? opts.falloff : 2.0;  // higher = more blank between
  const centerX = !!opts.centerX;                             // horizontally centered items
  function update() {
    const rect = section.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const scrollable = rect.height - window.innerHeight;
    const p = Math.min(Math.max(-rect.top / scrollable, 0), 1);
    const active = p * (N - 1);
    items.forEach((el, i) => {
      const d = i - active;                  // 0 = in the reading position
      const o = Math.max(0, 1 - Math.abs(d) * falloff);
      el.style.opacity = o.toFixed(3);
      const y = (d * travel).toFixed(2);
      el.style.transform = centerX ? `translate(-50%, ${y}vh)` : `translateY(${y}vh)`;
      el.style.pointerEvents = o > 0.6 ? "auto" : "none";
    });
  }
  return { update };
}

/* ---- Parallax: drift a blurred layer slower than the page for a 3D feel ---- */
function initParallax(sel, layerSel, amount) {
  const section = document.querySelector(sel);
  if (!section) return null;
  const layer = section.querySelector(layerSel);
  if (!layer) return null;
  function update() {
    const rect = section.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    // -0.5 (entering from below) → +0.5 (leaving at top)
    const prog = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
    layer.style.transform = `translate3d(0, ${(prog * amount).toFixed(1)}px, 0)`;
  }
  return { update };
}

document.addEventListener("DOMContentLoaded", () => {
  const scrubs = (window.SCRUB_SECTIONS || [])
    .filter(c => document.querySelector(c.section))
    .map(initScrub);
  const solWheel = initWheel("#solutions", ".solution",   { travel: 12, falloff: 2.2, centerX: true  });
  const engWheel = initWheel("#portfolio", ".engagement", { travel: 14, falloff: 1.8, centerX: false });
  const parallax = initParallax("#solution", ".pb-layer", 120);

  // Lenis is optional: if it fails to load, fall back to native scroll so the
  // animations NEVER all die because of one missing dependency.
  let lenis = null;
  try {
    if (typeof Lenis === "function") {
      lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
      window.__lenis = lenis;
    }
  } catch (e) { console.warn("Lenis unavailable — using native scroll.", e); lenis = null; }

  function raf(t) {
    try {
      if (lenis) lenis.raf(t);
      scrubs.forEach(s => s.update());
      if (solWheel) solWheel.update();
      if (engWheel) engWheel.update();
      if (parallax) parallax.update();
    } catch (e) { /* never let one bad frame kill the whole loop */ }
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Simple reveals for the static panels
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { threshold: 0.2 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  const hideHint = (y) => document.querySelectorAll(".scroll-hint")
    .forEach(h => h.style.opacity = y > 60 ? "0" : "1");
  if (lenis) lenis.on("scroll", ({ scroll }) => hideHint(scroll));
  else window.addEventListener("scroll", () => hideHint(window.scrollY), { passive: true });
});
