// ─── Elements ───────────────────────────────────────────────────────────────
const heroSection     = document.querySelector(".hero-scroll");
const heroName        = document.querySelector(".hero-name");
const firstName       = document.getElementById("first-name");
const lastName        = document.getElementById("last-name");
const movementSection = document.querySelector(".movement-section");
const accentBlob      = document.querySelector(".accent-circle");
const typeLines       = document.querySelector(".type-lines");
const quoteText       = document.querySelector(".quote-text");

const movementLines = [...document.querySelectorAll(".movement-line")].map(el => ({
  element: el,
  from:    el.dataset.from === "right" ? "right" : "left",
  text:    (el.dataset.text || "").trim(),
}));
const leftLines  = movementLines.filter(l => l.from === "left");
const rightLines = movementLines.filter(l => l.from === "right");

// ─── Font cycling pool ───────────────────────────────────────────────────────
// Diatype stays throughout — only weight and posture cycle during fly-in
const fontPool = [
  {
    family: '"ABC Diatype", "Diatype", "Inter", "Helvetica Neue", Arial, sans-serif',
    styles: ["normal", "italic"],
    weights: ["100", "200", "300", "400"],
  },
];

const CYCLE_COUNT = 28;
const styleCycle = Array.from({ length: CYCLE_COUNT }, () => {
  const font   = fontPool[Math.floor(Math.random() * fontPool.length)];
  const style  = font.styles[Math.floor(Math.random() * font.styles.length)];
  const weight = font.weights[Math.floor(Math.random() * font.weights.length)];
  return { family: font.family, style, weight };
});
styleCycle[0] = { family: '"ABC Diatype", "Diatype", "Inter", "Helvetica Neue", Arial, sans-serif', style: "normal", weight: "400" };
const finalStyle = { family: '"ABC Diatype", "Diatype", "Inter", "Helvetica Neue", Arial, sans-serif', style: "normal", weight: "400" };

// ─── Build name letters ──────────────────────────────────────────────────────
function buildLetters(el, text) {
  el.textContent = "";
  return [...text].map(char => {
    const span = document.createElement("span");
    span.className = "name-letter";
    span.dataset.char = char;
    span.textContent = char;
    el.appendChild(span);
    return span;
  });
}
const firstLetters = buildLetters(firstName, "Bryan");
const lastLetters  = buildLetters(lastName,  "Xu");
const allLetters   = [...firstLetters, ...lastLetters];

// ─── Random burst vectors (different every page load) ───────────────────────
const burstVectors = allLetters.map(() => {
  const angle = Math.random() * Math.PI * 2;       // all directions
  const dist  = 180 + Math.random() * 440;
  return {
    x:      Math.cos(angle) * dist,
    y:      Math.sin(angle) * dist,
    rotate: (Math.random() - 0.5) * 240,
    scale:  1.1 + Math.random() * 1.1,
    delay:  Math.random() * 0.13,
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const clamp    = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeOut3 = t => 1 - (1 - t) ** 3;
const easeOut5 = t => 1 - (1 - t) ** 5;
const easeIn   = (t, p) => t ** p;

function sectionProgress(section) {
  const r          = section.getBoundingClientRect();
  const scrollable = r.height - window.innerHeight;
  if (scrollable <= 0) return r.top <= 0 ? 1 : 0;
  return clamp(-r.top / scrollable, 0, 1);
}

// ─── Phase timings ────────────────────────────────────────────────────────────
// 0 ──fly-in──► 0.20 ──settle/hold──► 0.40 ──slower burst/fade──► 0.92 ──done
const FLY_END     = 0.20;
const HOLD_END    = 0.40;
const FINAL_LOCK  = 0.32;
const BURST_START = 0.40;
const FADE_START  = 0.64;
const FADE_END    = 0.92;
const INITIAL     = 0.88;   // how settled the name looks on first paint

// ─── Hero update ─────────────────────────────────────────────────────────────
function updateHero(p) {
  // Fly-in progress (starts at INITIAL on load)
  const flyLocal = clamp(p / FLY_END + INITIAL, 0, 1);
  const flyEased = easeOut3(flyLocal);

  // Font cycling keeps its old-feeling length, then final Diatype gets an added beat.
  const switchDone = p >= FINAL_LOCK;
  const cycleIndex = Math.floor(clamp(p / FINAL_LOCK, 0, 1) * CYCLE_COUNT) % CYCLE_COUNT;
  const style      = switchDone ? finalStyle : styleCycle[cycleIndex];

  // Burst + throw + fade
  const burstLocal    = clamp((p - BURST_START) / (FADE_START - BURST_START), 0, 1);
  const burstEased    = easeIn(burstLocal, 1.8);
  const throwLocal    = clamp((p - BURST_START) / (FADE_END   - BURST_START), 0, 1);
  const throwEased    = easeIn(throwLocal, 1.7);
  const combinedMotion = clamp(0.35 * burstEased + 0.65 * throwEased, 0, 1);
  const fadeLocal     = clamp((p - FADE_START) / (FADE_END - FADE_START), 0, 1);
  const fadeEased     = easeIn(fadeLocal, 2.2);
  const settleLocal    = clamp(p / BURST_START, 0, 1);
  const settleEased    = easeOut3(settleLocal);

  // Apply font — NO letter-spacing manipulation, CSS handles it
  [firstName, lastName].forEach(el => {
    el.style.fontFamily = style.family;
    el.style.fontStyle  = style.style;
    el.style.fontWeight = style.weight;
  });
  heroName.dataset.fontKind = "diatype";

  // Fly-in positioning
  const vw      = window.innerWidth;
  const vh      = window.innerHeight;
  const firstW  = firstName.getBoundingClientRect().width;
  const lastW   = lastName.getBoundingClientRect().width;
  const gap     = clamp(vw * 0.02, 10, 36);
  const groupW  = firstW + gap + lastW;
  const cx      = -groupW / 2;
  const margin  = clamp(vw * 0.15, 120, 300);

  const firstX  = (-(vw / 2 + firstW + margin)) + (cx                    - (-(vw / 2 + firstW + margin))) * flyEased;
  const lastX   = (vw / 2 + margin)              + (cx + firstW + gap     - (vw / 2 + margin))             * flyEased;
  const skew    = 8 * (1 - flyEased);

  firstName.style.transform = `translate3d(${firstX.toFixed(1)}px,-50%,0) skewX(${(-skew).toFixed(2)}deg)`;
  lastName.style.transform  = `translate3d(${lastX.toFixed(1)}px,-50%,0) skewX(${skew.toFixed(2)}deg)`;

  // Group: starts slightly low, settles to center, then bursts.
  const slowRise    = 0;
  const settleRise  = (1 - settleEased) * vh * 0.055;
  const burstRise   = -combinedMotion * vh * 0.56;
  const groupScale  = 1 + settleEased * 0.028 + combinedMotion * 0.48;
  const nameBlur    = (1 - flyEased) * 5 + fadeEased * 1.8;
  const groupBlur   = combinedMotion * 3;
  const groupOpacity = clamp((0.2 + 0.8 * flyEased) * (1 - fadeEased), 0, 1);

  heroName.style.transform = `translate3d(0,${(slowRise + settleRise + burstRise).toFixed(1)}px,0) scale(${groupScale.toFixed(3)})`;
  heroName.style.opacity   = groupOpacity.toFixed(3);
  heroName.style.filter    = `blur(${groupBlur.toFixed(2)}px)`;
  firstName.style.filter   = `blur(${nameBlur.toFixed(2)}px)`;
  lastName.style.filter    = `blur(${nameBlur.toFixed(2)}px)`;

  // Individual letter burst — random directions
  allLetters.forEach((letter, i) => {
    const v      = burstVectors[i];
    const staged = clamp(combinedMotion - v.delay * 0.18, 0, 1);
    if (staged <= 0) {
      letter.style.transform = "translate3d(0,0,0) rotate(0deg) scale(1)";
      letter.style.opacity   = "1";
      letter.style.filter    = "blur(0)";
      return;
    }
    const le = easeOut5(staged);
    const sx = vw / 1440;
    const sy = vh / 900;
    letter.style.transform = [
      `translate3d(${(v.x * le * sx).toFixed(1)}px,${(v.y * le * sy).toFixed(1)}px,0)`,
      `rotate(${(v.rotate * le).toFixed(1)}deg)`,
      `scale(${(1 + (v.scale - 1) * le).toFixed(3)})`,
    ].join(" ");
    letter.style.opacity = (1 - fadeEased).toFixed(3);
    letter.style.filter  = `blur(${(le * 2.4).toFixed(2)}px)`;
  });
}

// ─── Movement update ──────────────────────────────────────────────────────────
const MOVEMENT_DURATION = 0.88;
const MOVEMENT_TRAVEL_RATIO = 0.72;
const MOVEMENT_TRAVEL_EXTRA = 260;
const MOVEMENT_REVEAL_POWER = 1.75;

function updateMovement(p) {
  const movementP = clamp(p / MOVEMENT_DURATION, 0, 1);
  const eased  = easeOut3(movementP);
  const revealP = easeIn(movementP, MOVEMENT_REVEAL_POWER);
  const travel = window.innerWidth * MOVEMENT_TRAVEL_RATIO + MOVEMENT_TRAVEL_EXTRA;
  const rightGroupDrop = window.innerWidth > 860 ? clamp(window.innerHeight * 0.18, 130, 230) : 0;

  function updateGroup(lines, dir) {
    const offset = dir * (1 - eased) * travel;
    const sweep  = revealP * lines.length;
    lines.forEach((line, i) => {
      const local  = clamp(sweep - i, 0, 1);
      const hidden = (100 - local * 100).toFixed(2);
      line.element.textContent = line.text;
      line.element.style.clipPath  = line.from === "right"
        ? `inset(0 0 0 ${hidden}%)`
        : `inset(0 ${hidden}% 0 0)`;
      const yOffset = line.from === "right" ? rightGroupDrop : 0;
      line.element.style.transform = `translate3d(${offset.toFixed(1)}px,${yOffset.toFixed(1)}px,0)`;
      line.element.style.opacity   = (0.12 + 0.88 * eased).toFixed(3);
      line.element.style.filter    = `blur(${((1 - eased) * 3.5).toFixed(2)}px)`;
    });
  }

  updateGroup(leftLines,  -1);
  updateGroup(rightLines,  1);
}

// ─── Accent blob — slow mouse tracking ───────────────────────────────────────
let blobX = window.innerWidth * 0.72, blobY = window.innerHeight * 0.18;
let targetX = blobX, targetY = blobY;
const LERP = 0.12;
const LENS_RADIUS = 105;
const LENS_TRIGGER_PAD = 4;
// Magnifier strength lives here: raise both scale values to make the old-glass lens stronger.
const LENS_LAYERS = [
  { scale: 1.24, mask: "rgba(0,0,0,0) 0px, rgba(0,0,0,0) 82px, rgba(0,0,0,1) 94px, rgba(0,0,0,1) 125px" },
  { scale: 1.68, mask: "rgba(0,0,0,1) 0px, rgba(0,0,0,1) 82px, rgba(0,0,0,0) 94px" },
];
let activeLensTarget = null;
let magnifierLayers = [];
let lastLensTarget = null;

if (accentBlob) {
  LENS_LAYERS.forEach(({ scale, mask }, index) => {
    const layer = document.createElement("div");
    layer.className = "magnifier-copy";
    layer.style.zIndex = String(index + 1);
    accentBlob.appendChild(layer);
    magnifierLayers.push({ element: layer, scale, mask });
  });
}

function setLensTarget(target) {
  activeLensTarget = target;
  if (!accentBlob) return;
  accentBlob.classList.toggle("is-magnifying", Boolean(activeLensTarget));
  if (!activeLensTarget) {
    magnifierLayers.forEach(layer => layer.element.replaceChildren());
    lastLensTarget = null;
  }
}

function prepareLensClone(target) {
  const clone = target.cloneNode(true);
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
  clone.style.transform = "none";
  clone.style.filter = "none";
  clone.style.opacity = "1";
  clone.style.clipPath = "none";
  clone.querySelectorAll(".name-letter").forEach(letter => {
    letter.style.opacity = "1";
    letter.style.filter = "none";
  });
  return clone;
}

function movementLineRects() {
  return movementLines
    .filter(line => isVisibleEnough(line.element))
    .map(line => ({ line, rect: line.element.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0);
}

function unionRects(rects) {
  if (rects.length === 0) return null;
  const left = Math.min(...rects.map(rect => rect.left));
  const top = Math.min(...rects.map(rect => rect.top));
  const right = Math.max(...rects.map(rect => rect.right));
  const bottom = Math.max(...rects.map(rect => rect.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function prepareMovementLensClone(targetRect) {
  const clone = document.createElement("div");
  clone.className = "type-lines magnifier-movement-clone";

  movementLineRects().forEach(({ line, rect }) => {
    const lineClone = line.element.cloneNode(true);
    lineClone.style.position = "absolute";
    lineClone.style.left = `${(rect.left - targetRect.left).toFixed(1)}px`;
    lineClone.style.top = `${(rect.top - targetRect.top).toFixed(1)}px`;
    lineClone.style.width = `${rect.width.toFixed(1)}px`;
    lineClone.style.height = `${rect.height.toFixed(1)}px`;
    lineClone.style.margin = "0";
    lineClone.style.transform = "none";
    lineClone.style.gridColumn = "auto";
    lineClone.style.gridRow = "auto";
    clone.appendChild(lineClone);
  });

  return clone;
}

function lensTargetRect(target) {
  if (target === typeLines) {
    return unionRects(movementLineRects().map(({ rect }) => rect));
  }
  return target.getBoundingClientRect();
}

function prepareLensContent(target, targetRect) {
  return target === typeLines ? prepareMovementLensClone(targetRect) : prepareLensClone(target);
}

function buildSelectionLayer(targetRect) {
  const layer = document.createElement("div");
  layer.className = "magnifier-selection";

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return layer;

  for (let i = 0; i < selection.rangeCount; i += 1) {
    const range = selection.getRangeAt(i);
    [...range.getClientRects()].forEach(selectionRect => {
      const left = Math.max(selectionRect.left, targetRect.left);
      const top = Math.max(selectionRect.top, targetRect.top);
      const right = Math.min(selectionRect.right, targetRect.right);
      const bottom = Math.min(selectionRect.bottom, targetRect.bottom);
      if (right <= left || bottom <= top) return;

      const rect = document.createElement("span");
      rect.className = "magnifier-selection-rect";
      rect.style.left = `${(left - targetRect.left).toFixed(1)}px`;
      rect.style.top = `${(top - targetRect.top).toFixed(1)}px`;
      rect.style.width = `${(right - left).toFixed(1)}px`;
      rect.style.height = `${(bottom - top).toFixed(1)}px`;
      layer.appendChild(rect);
    });
  }

  return layer;
}

function circleIntersectsRect(cx, cy, radius, rect) {
  if (rect.width <= 0 || rect.height <= 0) return false;
  const nearestX = clamp(cx, rect.left, rect.right);
  const nearestY = clamp(cy, rect.top, rect.bottom);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

function isVisibleEnough(el) {
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && Number(style.opacity || 1) > 0.04;
}

function findLensTarget() {
  const radius = LENS_RADIUS + LENS_TRIGGER_PAD;

  if (heroName && isVisibleEnough(heroName)) {
    const heroHits = [firstName, lastName].filter(Boolean);
    if (heroHits.some(el => circleIntersectsRect(blobX, blobY, radius, el.getBoundingClientRect()))) {
      return heroName;
    }
  }

  if (typeLines) {
    const movementHit = movementLineRects().some(({ rect }) => circleIntersectsRect(blobX, blobY, radius, rect));
    if (movementHit) return typeLines;
  }

  if (quoteText && isVisibleEnough(quoteText)) {
    if (circleIntersectsRect(blobX, blobY, radius, quoteText.getBoundingClientRect())) {
      return quoteText;
    }
  }

  return null;
}

function renderMagnifier() {
  if (!activeLensTarget || magnifierLayers.length === 0) return;

  const rect = lensTargetRect(activeLensTarget);
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    setLensTarget(null);
    return;
  }

  const lensLeft = blobX - LENS_RADIUS;
  const lensTop = blobY - LENS_RADIUS;
  const originX = blobX - rect.left;
  const originY = blobY - rect.top;

  magnifierLayers.forEach(({ element, scale, mask }) => {
    const clone = prepareLensContent(activeLensTarget, rect);
    const selectionLayer = buildSelectionLayer(rect);

    element.replaceChildren(selectionLayer, clone);
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
    element.style.left = `${(rect.left - lensLeft).toFixed(1)}px`;
    element.style.top = `${(rect.top - lensTop).toFixed(1)}px`;
    element.style.transformOrigin = `${originX.toFixed(1)}px ${originY.toFixed(1)}px`;
    element.style.transform = `scale(${scale})`;
    element.style.setProperty("--lens-origin-x", `${originX.toFixed(1)}px`);
    element.style.setProperty("--lens-origin-y", `${originY.toFixed(1)}px`);
    element.style.maskImage = `radial-gradient(circle at var(--lens-origin-x) var(--lens-origin-y), ${mask})`;
    element.style.webkitMaskImage = `radial-gradient(circle at var(--lens-origin-x) var(--lens-origin-y), ${mask})`;
  });
  lastLensTarget = activeLensTarget;
}

window.addEventListener("pointermove", e => {
  targetX = e.clientX;
  targetY = e.clientY;
}, { passive: true });

window.addEventListener("pointerleave", () => setLensTarget(null));

function tickBlob() {
  blobX += (targetX - blobX) * LERP;
  blobY += (targetY - blobY) * LERP;
  if (accentBlob) {
    accentBlob.style.transform = `translate(${blobX.toFixed(1)}px,${blobY.toFixed(1)}px)`;
  }
  const nextLensTarget = findLensTarget();
  if (nextLensTarget !== lastLensTarget) setLensTarget(nextLensTarget);
  renderMagnifier();
  requestAnimationFrame(tickBlob);
}
tickBlob();

// ─── Render loop ─────────────────────────────────────────────────────────────
let ticking = false;
function render() {
  if (heroSection)     updateHero(sectionProgress(heroSection));
  if (movementSection) updateMovement(sectionProgress(movementSection));
}
function schedule() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { render(); ticking = false; });
}

// ─── Lenis smooth scroll ─────────────────────────────────────────────────────
if (window.Lenis) {
  const lenis = new window.Lenis({
    lerp: 0.11,
    smoothWheel: true,
    syncTouch: false,
    gestureOrientation: "vertical",
    touchMultiplier: 1.08,
    wheelMultiplier: 1.08,
  });
  lenis.on("scroll", schedule);
  if (window.gsap) {
    window.gsap.ticker.add(t => lenis.raf(t * 1000));
    window.gsap.ticker.lagSmoothing(0);
  } else {
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }
}

window.addEventListener("scroll", schedule, { passive: true });
window.addEventListener("resize", schedule);
document.body.classList.add("is-loaded");
render();

// ─── Intersection observer for data-reveal elements ───────────────────────────
const observer = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("is-visible"); observer.unobserve(e.target); }
  }),
  { threshold: 0.15 }
);
document.querySelectorAll("[data-reveal]").forEach(el => observer.observe(el));
