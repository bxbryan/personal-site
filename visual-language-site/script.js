// ─── Elements ───────────────────────────────────────────────────────────────
const heroSection     = document.querySelector(".hero-scroll");
const heroName        = document.querySelector(".hero-name");
const firstName       = document.getElementById("first-name");
const lastName        = document.getElementById("last-name");
const movementSection = document.querySelector(".movement-section");
const accentBlob      = document.querySelector(".accent-circle");

const movementLines = [...document.querySelectorAll(".movement-line")].map(el => ({
  element: el,
  from:    el.dataset.from === "right" ? "right" : "left",
  text:    (el.dataset.text || "").trim(),
}));
const leftLines  = movementLines.filter(l => l.from === "left");
const rightLines = movementLines.filter(l => l.from === "right");

// ─── Font cycling pool ───────────────────────────────────────────────────────
// Instrument Serif settles at the end — others cycle during fly-in
const fontPool = [
  { family: '"Instrument Serif", serif', styles: ["normal", "italic"], weights: ["400"] },
  { family: '"ABC Diatype", sans-serif', styles: ["normal", "italic"], weights: ["400"] },
  //{ family: '"Voyage", serif', styles: ["normal", "italic"], weights: ["300", "400", "600"] },
  { family: '"Roboto", sans-serif', styles: ["normal", "italic"], weights: ["400", "700"] },
];

const CYCLE_COUNT = 28;
const styleCycle = Array.from({ length: CYCLE_COUNT }, () => {
  const font   = fontPool[Math.floor(Math.random() * fontPool.length)];
  const style  = font.styles[Math.floor(Math.random() * font.styles.length)];
  const weight = font.weights[Math.floor(Math.random() * font.weights.length)];
  return { family: font.family, style, weight };
});
const finalStyle = { family: '"Instrument Serif", serif', style: "normal", weight: "400" };

// ─── Build name letters ──────────────────────────────────────────────────────
function buildLetters(el, text) {
  el.textContent = "";
  return [...text].map(char => {
    const span = document.createElement("span");
    span.className = "name-letter";
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
// 0 ──fly-in──► 0.20 ──hold──► 0.32 ──burst──► 0.42 ──fade──► 0.54 ──done
const FLY_END     = 0.20;
const HOLD_END    = 0.32;
const BURST_START = 0.32;
const FADE_START  = 0.40;
const FADE_END    = 0.52;
const INITIAL     = 0.88;   // how settled the name looks on first paint

// ─── Hero update ─────────────────────────────────────────────────────────────
function updateHero(p) {
  // Fly-in progress (starts at INITIAL on load)
  const flyLocal = clamp(p / FLY_END + INITIAL, 0, 1);
  const flyEased = easeOut3(flyLocal);

  // Font cycling: stops cycling once we hit HOLD_END * 0.8
  const switchDone = p >= HOLD_END * 0.8;
  const cycleIndex = Math.floor(clamp(p / HOLD_END, 0, 1) * CYCLE_COUNT) % CYCLE_COUNT;
  const style      = switchDone ? finalStyle : styleCycle[cycleIndex];

  // Burst + throw + fade
  const burstLocal    = clamp((p - BURST_START) / (FADE_START - BURST_START), 0, 1);
  const burstEased    = easeIn(burstLocal, 1.8);
  const throwLocal    = clamp((p - BURST_START) / (FADE_END   - BURST_START), 0, 1);
  const throwEased    = easeIn(throwLocal, 1.7);
  const combinedMotion = clamp(0.35 * burstEased + 0.65 * throwEased, 0, 1);
  const fadeLocal     = clamp((p - FADE_START) / (FADE_END - FADE_START), 0, 1);
  const fadeEased     = easeIn(fadeLocal, 2.2);

  // Apply font — NO letter-spacing manipulation, CSS handles it
  [firstName, lastName].forEach(el => {
    el.style.fontFamily = style.family;
    el.style.fontStyle  = style.style;
    el.style.fontWeight = style.weight;
  });

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

  // Group: slow rise + burst explosion
  const slowRise    = -(p / FADE_END) * 6 * vh / 100;
  const burstRise   = -combinedMotion * vh * 0.44;
  const groupScale  = 1 + combinedMotion * 0.48;
  const nameBlur    = (1 - flyEased) * 5 + fadeEased * 1.8;
  const groupBlur   = combinedMotion * 3;
  const groupOpacity = clamp((0.2 + 0.8 * flyEased) * (1 - fadeEased), 0, 1);

  heroName.style.transform = `translate3d(0,${(slowRise + burstRise).toFixed(1)}px,0) scale(${groupScale.toFixed(3)})`;
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
function updateMovement(p) {
  const eased  = easeOut3(clamp(p / 0.88, 0, 1));
  const travel = window.innerWidth + 360;

  function updateGroup(lines, dir) {
    const offset = dir * (1 - eased) * travel;
    const sweep  = clamp(p / 0.88, 0, 1) * lines.length;
    lines.forEach((line, i) => {
      const local  = clamp(sweep - i, 0, 1);
      const hidden = (100 - local * 100).toFixed(2);
      line.element.textContent = line.text;
      line.element.style.clipPath  = line.from === "right"
        ? `inset(0 0 0 ${hidden}%)`
        : `inset(0 ${hidden}% 0 0)`;
      line.element.style.transform = `translate3d(${offset.toFixed(1)}px,0,0)`;
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
const LERP = 0.032;

window.addEventListener("mousemove", e => {
  targetX = e.clientX;
  targetY = e.clientY;
}, { passive: true });

function tickBlob() {
  blobX += (targetX - blobX) * LERP;
  blobY += (targetY - blobY) * LERP;
  if (accentBlob) {
    accentBlob.style.transform = `translate(${blobX.toFixed(1)}px,${blobY.toFixed(1)}px)`;
  }
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
  const lenis = new window.Lenis({ lerp: 0.08, smoothWheel: true, syncTouch: true, touchMultiplier: 1.08 });
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
