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
    // frameStart/frameEnd remap: hold on frame 0 until frameStart (frosted intro),
    // and finish the scrub by frameEnd so it's done before the next section covers it.
    const fs = cfg.frameStart || 0, fe = cfg.frameEnd || 1;
    const pf = Math.min(Math.max((p - fs) / (fe - fs), 0), 1);
    const idx = Math.min(cfg.frameCount - 1, Math.floor(pf * (cfg.frameCount - 1)));
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
    // pStart/pEnd: hide the wheel before pStart, run it between pStart and pEnd,
    // then hold the last item (so it stays readable and finishes before any cover).
    const ps = opts.pStart != null ? opts.pStart : 0;
    const pe = opts.pEnd != null ? opts.pEnd : 1;
    if (p < ps) { items.forEach(el => { el.style.opacity = "0"; el.style.pointerEvents = "none"; }); return; }
    const pw = Math.min((p - ps) / (pe - ps), 1);
    const active = pw * (N - 1);
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

/* ---- Frosted-glass reveal: clear the blur + slide the intro copy away, then
   hand off to the sharp car + wheel. One continuous pinned sequence. ---- */
function initReveal(sel) {
  const section = document.querySelector(sel);
  if (!section) return null;
  const car    = section.querySelector(".sol-car");
  const intro  = section.querySelector(".sol-intro");
  const frost  = section.querySelector(".sol-frost");
  const banner = section.querySelector(".sol-eyebrow");
  const scrim  = section.querySelector(".sol-scrim");
  // First ~0.20 of the section = the black problem sliding up off the stationary
  // (frosted) car. Then the frost clears; then the scrub/wheel take over.
  const CLEAR_START = 0.22, CLEAR_END = 0.38, MAX_BLUR = 22;
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  function update() {
    const rect = section.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const scrollable = rect.height - window.innerHeight;
    const p = Math.min(Math.max(-rect.top / scrollable, 0), 1);
    const clear = clamp01((p - CLEAR_START) / (CLEAR_END - CLEAR_START));  // 0 intro → 1 revealed
    if (car) car.style.filter = `blur(${(MAX_BLUR * (1 - clear)).toFixed(1)}px)`;
    if (intro) {
      intro.style.opacity = (1 - clear).toFixed(3);
      intro.style.transform = `translateY(${(-clear * 6).toFixed(2)}vh)`;   // glass slides up/away
      intro.style.pointerEvents = clear > 0.5 ? "none" : "auto";
    }
    if (frost)  frost.style.opacity  = (1 - clear).toFixed(3);
    if (banner) banner.style.opacity = clear.toFixed(3);
    if (scrim)  scrim.style.opacity  = clear.toFixed(3);
  }
  return { update };
}

/* ---- Grow: scale a section's content up as you scroll (CTA finale) ---- */
function initGrow(sel, innerSel, opts) {
  const section = document.querySelector(sel);
  if (!section) return null;
  const inner = section.querySelector(innerSel);
  if (!inner) return null;
  opts = opts || {};
  const from = opts.from != null ? opts.from : 0.75;
  const to   = opts.to   != null ? opts.to   : 1.0;
  function update() {
    const rect = section.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    // Drive by ENTRY, not pinned progress: grow as the section rises into view and
    // reach full size by the time it fills the screen (top ~15% down), then hold.
    // No "scroll past the bottom to keep growing".
    const t = Math.min(Math.max((window.innerHeight - rect.top) / (window.innerHeight * 0.85), 0), 1);
    inner.style.transform = `scale(${(from + (to - from) * t).toFixed(3)})`;
    inner.style.opacity = (0.5 + 0.5 * t).toFixed(3);
  }
  return { update };
}

document.addEventListener("DOMContentLoaded", () => {
  const scrubs = (window.SCRUB_SECTIONS || [])
    .filter(c => document.querySelector(c.section))
    .map(initScrub);
  const solWheel = initWheel("#solutions", ".solution",   { travel: 12, falloff: 2.2, centerX: true,  pStart: 0.38, pEnd: 0.76 });
  const engWheel = initWheel("#portfolio", ".engagement", { travel: 14, falloff: 1.8, centerX: false, pEnd: 0.82 });
  const reveal   = initReveal("#solutions");
  const ctaGrow  = initGrow("#cta", ".cta-inner");

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
      if (reveal) reveal.update();
      if (ctaGrow) ctaGrow.update();
      if (solWheel) solWheel.update();
      if (engWheel) engWheel.update();
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
