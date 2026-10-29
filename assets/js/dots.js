// Background dot grid. Dots near the cursor grow, drift away slightly, and turn green.
(() => {
  const canvas = document.getElementById("dots");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const GAP = 22;
  const RADIUS = 140;
  const BASE = [212, 212, 208];
  const ACCENT = [31, 77, 58];

  let w, h, dpr, cols, rows;
  let mouse = { x: -1e4, y: -1e4 };
  let strength = 0; // eases 0 → 1 while the cursor is on the page
  let target = 0;
  let frame = null;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / GAP) + 1;
    rows = Math.ceil(h / GAP) + 1;
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const ox = (w % GAP) / 2;
    const oy = (h % GAP) / 2;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let x = ox + i * GAP;
        let y = oy + j * GAP;
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const d = Math.hypot(dx, dy);
        const t = d < RADIUS ? (1 - d / RADIUS) ** 2 * strength : 0;
        if (t > 0) {
          x += (dx / (d || 1)) * t * 6;
          y += (dy / (d || 1)) * t * 6;
        }
        const c = BASE.map((b, k) => Math.round(b + (ACCENT[k] - b) * t));
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.beginPath();
        ctx.arc(x, y, 1 + t * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function tick() {
    strength += (target - strength) * 0.12;
    draw();
    frame = Math.abs(target - strength) > 0.01 ? requestAnimationFrame(tick) : null;
  }

  function schedule() {
    if (frame === null) frame = requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();

  // Static grid only for touch devices and reduced-motion users.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(hover: hover)").matches) return;

  window.addEventListener("pointermove", (e) => {
    mouse = { x: e.clientX, y: e.clientY };
    target = 1;
    schedule();
  });
  document.addEventListener("pointerleave", () => { target = 0; schedule(); });
})();
