// Pixel ducks fall down the page margins now and then. Click one to pop it.
// Desktop only: needs a mouse, wide margins, and no reduced-motion preference.
(() => {
  const allowed = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");

  const EVERY = 7000;  // average ms between ducks
  const JITTER = 2000; // ± ms, so they don't feel metronomic
  const TICK = 80;     // ms per animation step; low on purpose
  const PX = 3;        // screen pixels per sprite pixel
  const FALL = 2;      // sprite pixels per step
  const EDGE = 24;     // clearance from the text column and window edge

  const COLORS = { o: "#3b3325", y: "#e3bd4f", w: "#c4983a", b: "#d9793a" };
  const HEAD = [
    "....oooo.....",
    "...oyyyyo....",
    "...oyyoyobb..",
    "...oyyyyobbb.",
    "o...oyyyo....",
  ];
  const FRAMES = [
    [...HEAD,
      "oyoooyyyyo...",
      "oyyyyyyyyyo..",
      "oyywwwwyyyo..",
      "oyyywwwyyyo..",
      ".oyyyyyyyo...",
      "..ooooooo...."],
    [...HEAD,
      "oyoooyyyyo...",
      "oywwwwyyyyo..",
      "oyywwwyyyyo..",
      "oyyyyyyyyyo..",
      ".oyyyyyyyo...",
      "..ooooooo...."],
  ];
  const W = FRAMES[0][0].length;
  const H = FRAMES[0].length;
  const BLAST = 60; // sprite pixels, square

  const things = new Set(); // falling ducks and explosions
  let timer = null;

  function makeCanvas(w, h, className) {
    const el = document.createElement("canvas");
    el.width = w;
    el.height = h;
    el.className = className;
    el.style.width = `${w * PX}px`;
    el.style.height = `${h * PX}px`;
    el.setAttribute("aria-hidden", "true");
    return el;
  }

  function pixels(frame, flip) {
    const out = [];
    frame.forEach((row, y) => [...row].forEach((c, x) => {
      if (COLORS[c]) out.push({ x: flip ? W - 1 - x : x, y, color: COLORS[c] });
    }));
    return out;
  }

  function paint(ctx, list) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (const p of list) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
  }

  function add(thing) {
    things.add(thing);
    document.body.append(thing.el);
    if (timer === null) timer = setInterval(tick, TICK);
  }

  function remove(thing) {
    thing.el.remove();
    things.delete(thing);
    if (!things.size && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function tick() {
    for (const thing of [...things]) if (!thing.step()) remove(thing);
  }

  function clear() {
    for (const thing of [...things]) remove(thing);
  }

  function spawn() {
    // The margins are whatever the widest content leaves free (embedded PDFs break out).
    let left = Infinity, right = -Infinity;
    for (const el of document.querySelectorAll(".wrap, .prose .pdf")) {
      const r = el.getBoundingClientRect();
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
    }
    const width = document.documentElement.clientWidth;
    const size = W * PX;
    const lanes = [
      [EDGE, left - EDGE - size],
      [right + EDGE, width - EDGE - size],
    ].filter(([a, b]) => b > a);
    if (!lanes.length) return;

    const [a, b] = lanes[Math.floor(Math.random() * lanes.length)];
    const x = Math.round((a + Math.random() * (b - a)) / PX) * PX;
    const flip = Math.random() < 0.5;
    const canvas = makeCanvas(W, H, "duck-sprite");
    const ctx = canvas.getContext("2d");
    const el = document.createElement("div");
    el.className = "duck";
    el.setAttribute("aria-hidden", "true");
    el.append(canvas);
    let y = -(H + 1) * PX;
    let n = 0;

    const duck = {
      el,
      step() {
        y += FALL * PX;
        paint(ctx, pixels(FRAMES[Math.floor(n++ / 4) % 2], flip));
        el.style.transform = `translate(${x}px, ${y}px)`;
        return y < innerHeight + 60; // let the trail clear the screen too
      },
    };
    duck.step();
    // pointerdown, not click: the duck can move between press and release.
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      remove(duck);
      explode(x, y, flip);
    });
    add(duck);
  }

  function explode(x, y, flip) {
    const el = makeCanvas(BLAST, BLAST, "duck-blast");
    const ctx = el.getContext("2d");
    const ox = Math.floor((BLAST - W) / 2);
    const oy = Math.floor((BLAST - H) / 2);
    el.style.transform = `translate(${x - ox * PX}px, ${y - oy * PX}px)`;
    let bits = pixels(FRAMES[0], flip).map((p) => {
      const angle = Math.atan2(p.y - H / 2, p.x - W / 2) + Math.random() - 0.5;
      const speed = 0.8 + Math.random() * 2.2;
      return {
        x: p.x + ox, y: p.y + oy, color: p.color,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 0.8,
        life: 4 + Math.random() * 7,
      };
    });

    const blast = {
      el,
      step() {
        bits = bits.filter((p) => p.life-- > 0);
        for (const p of bits) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.3;
        }
        paint(ctx, bits);
        return bits.length > 0;
      },
    };
    blast.step();
    add(blast);
  }

  function schedule() {
    setTimeout(() => {
      if (allowed.matches && !document.hidden) spawn();
      schedule();
    }, EVERY + (Math.random() * 2 - 1) * JITTER);
  }

  allowed.addEventListener("change", clear);
  let lastWidth = innerWidth;
  window.addEventListener("resize", () => {
    // Margins moved, so ducks may now be over the text.
    if (innerWidth !== lastWidth) clear();
    lastWidth = innerWidth;
  });
  schedule();
})();
