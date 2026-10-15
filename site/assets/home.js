// 首頁互動：透視枯山水（游標或手指劃過會耙動沙紋）、引言隨捲動亮起、問路、目錄篩選與搜尋、
// 抽籤翻牌、數字與段落進場。系統開啟「減少動態效果」時動畫全部改為靜態。
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - (1 - t) ** 3;

  // canvas 不一定認得 oklch()：先用 2D context 解析，不認得就留下備用色
  const probe = document.createElement('canvas').getContext('2d');
  const tokenColor = (name, fallback) => {
    probe.fillStyle = fallback;
    probe.fillStyle = getComputedStyle(root).getPropertyValue(name).trim();
    return probe.fillStyle;
  };

  // ── 枯山水 ───────────────────────────────────────────
  // 從斜上方俯瞰的沙庭：耙紋越往下（越近）間距越寬，石頭周圍的同心圓壓成扁橢圓。
  // 游標或手指劃過時，附近的沙紋被推開，再像彈簧一樣慢慢回復；石頭會隨游標做一點視差，越近的動越多。
  // 平時沙紋有微風般的起伏、石頭周圍的圈緩緩向外擴散，偶爾有幾片紅葉飄過。開場畫面看不到時就停。
  function garden(canvas, hero) {
    const ctx = canvas.getContext('2d');
    const LINES = 64, STEP = 5, RINGS = 5, TILT = 0.4;
    // 石頭位置用畫面比例定義（橫式、直式各一組），半徑是畫面短邊的比例
    const LAYOUT = {
      wide: [[0.31, 0.42, 0.06], [0.53, 0.68, 0.04], [0.16, 0.6, 0.024]],
      tall: [[0.28, 0.36, 0.075], [0.4, 0.6, 0.045], [0.12, 0.52, 0.03]],
    };
    let W = 0, H = 0, NP = 0, ys, gaps, off, vel, stones = [], raf = 0, start = 0, col = {}, last = null, clock = 0, visible = true;
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    const depth = y => 0.6 + 0.4 * clamp(y / H, 0, 1);

    function readColors() {
      col = {
        line: tokenColor('--color-rule', '#d5cabb'),
        stone: tokenColor('--color-stone', '#6b625a'),
        light: tokenColor('--color-stone-hi', '#cfc8bf'),
        shade: tokenColor('--color-stone-lo', '#2b2420'),
        leaf: tokenColor('--color-accent', '#b4583a'),
      };
    }

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      NP = Math.ceil(W / STEP) + 1;
      ys = new Float32Array(LINES);
      gaps = new Float32Array(LINES);
      for (let i = 0; i < LINES; i++) ys[i] = H * (-0.01 + 1.03 * ((i + 0.5) / LINES) ** 1.3);
      for (let i = 0; i < LINES; i++) gaps[i] = (ys[Math.min(i + 1, LINES - 1)] - ys[Math.max(i - 1, 0)]) / 2;
      off = new Float32Array(LINES * NP);
      vel = new Float32Array(LINES * NP);
      const unit = Math.min(W, H);
      stones = LAYOUT[W / H > 1 ? 'wide' : 'tall'].map(([fx, fy, fr]) => {
        const y = fy * H;
        const i = clamp(Math.round(LINES * ((y / H + 0.01) / 1.03) ** (1 / 1.3) - 0.5), 0, LINES - 1);
        return { x: fx * W, y, r: fr * unit, gap: (gaps[i] / TILT) * 0.62, d: depth(y) };
      });
      draw(reduce ? 1 : revealAt(performance.now()));
    }

    const revealAt = t => (start ? easeOut(clamp((t - start) / 2600, 0, 1)) : 0);
    // 石頭加上視差後的位置；外圈橢圓用來讓耙紋繞開
    const placed = () => stones.map(s => {
      const x = s.x + tilt.x * 26 * s.d, y = s.y + tilt.y * 10 * s.d;
      const A = s.r + (RINGS + 0.7) * s.gap;
      return { ...s, x, y, A, B: A * TILT };
    });

    function draw(reveal) {
      ctx.clearRect(0, 0, W, H);
      const P = placed();
      ctx.strokeStyle = col.line;
      // 耙紋：由左往右「耙」出來，近處的線稍粗
      for (let i = 0; i < LINES; i++) {
        const reach = W * clamp(reveal * 1.5 - (i / LINES) * 0.5, 0, 1);
        ctx.lineWidth = 0.6 + 0.8 * (ys[i] / H);
        ctx.beginPath();
        let pen = false;
        for (let j = 0; j < NP; j++) {
          const x = j * STEP;
          if (x > reach) break;
          // 微風：一道很淺的波從左往右走，近處起伏大一點
          const y = ys[i] + off[i * NP + j] + Math.sin(x * 0.011 - clock * 0.8 + i * 0.33) * (0.4 + 1.3 * ys[i] / H);
          if (P.some(s => ((x - s.x) / s.A) ** 2 + ((ys[i] - s.y) / s.B) ** 2 < 1)) { pen = false; continue; }
          if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
        }
        ctx.stroke();
      }
      const appear = clamp(reveal * 2 - 0.7, 0, 1);
      for (const s of P) {
        // 同心圓
        ctx.globalAlpha = appear;
        ctx.lineWidth = 0.6 + 0.8 * (s.y / H);
        // 同心圓慢慢往外擴：最內圈淡入、最外圈淡出，像水波
        const p = (clock / 6 + s.x / W) % 1;
        for (let m = 0; m < RINGS; m++) {
          const R = s.r + (m + p + 0.5) * s.gap;
          ctx.globalAlpha = appear * (m === 0 ? p : m === RINGS - 1 ? 1 - p : 1);
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, R, R * TILT, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // 影子與石頭：扁圓加上左上方來的光
        const rx = s.r, ry = s.r * TILT, h = s.r * 0.55;
        ctx.fillStyle = col.shade;
        ctx.globalAlpha = appear * 0.18;
        ctx.beginPath();
        ctx.ellipse(s.x + rx * 0.14, s.y + ry * 0.2, rx * 1.1, ry * 1.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = appear;
        const g = ctx.createRadialGradient(s.x - rx * 0.35, s.y - h - ry * 0.3, rx * 0.05, s.x, s.y - h * 0.4, rx * 1.2);
        g.addColorStop(0, col.light);
        g.addColorStop(0.55, col.stone);
        g.addColorStop(1, col.shade);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y - h * 0.45, rx, ry + h * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) leaves(appear);
      ctx.globalAlpha = 1;
    }

    // 紅葉：位置只由時間決定，不用另外記狀態；翻面用 y 軸縮放做出立體感
    // 五片葉子：起點高度、飄落幅度、速度、出現時機（delay × speed 錯開約 0.2 圈）、大小、自轉與翻面速度
    const LEAVES = [
      { y0: 0.08, dy: 0.5, speed: 0.045, delay: 0, size: 21, spin: 0.8, flip: 1.7, ph: 0 },
      { y0: 0.32, dy: 0.42, speed: 0.036, delay: 5.5, size: 17, spin: -0.6, flip: 1.3, ph: 2.1 },
      { y0: -0.05, dy: 0.6, speed: 0.03, delay: 13, size: 24, spin: 0.5, flip: 1, ph: 4.2 },
      { y0: 0.18, dy: 0.55, speed: 0.04, delay: 15, size: 19, spin: -0.9, flip: 1.5, ph: 1.3 },
      { y0: 0.45, dy: 0.35, speed: 0.05, delay: 16, size: 15, spin: 0.7, flip: 2, ph: 3.4 },
    ];
    function leaves(appear) {
      for (const L of LEAVES) {
        const q = ((clock + L.delay) * L.speed) % 1;
        const x = (-0.08 + 1.16 * q) * W + Math.sin(clock * 0.7 + L.ph) * 34;
        const y = (L.y0 + L.dy * q) * H + Math.sin(clock * 1.1 + L.ph) * 14;
        const size = L.size * depth(y) * (W < 720 ? 0.85 : 1);
        const turn = Math.cos(clock * L.flip + L.ph);
        // 落在沙上的影子
        ctx.globalAlpha = appear * 0.12;
        ctx.fillStyle = col.shade;
        ctx.beginPath();
        ctx.ellipse(x + 10, y + 16, size, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(clock * L.spin + L.ph);
        ctx.scale(1, 0.25 + 0.75 * Math.abs(turn));
        ctx.globalAlpha = appear * (turn > 0 ? 0.9 : 0.7);
        ctx.fillStyle = col.leaf;
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.quadraticCurveTo(0, -size * 0.6, size, 0);
        ctx.quadraticCurveTo(0, size * 0.6, -size, 0);
        ctx.fill();
        ctx.strokeStyle = col.leaf;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-size * 1.35, 0);
        ctx.lineTo(size * 0.8, 0);
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = col.line;
    }

    // 彈簧回復：位移拉回 0、速度逐步衰減；傳回剩餘的「能量」
    function settle() {
      let e = 0;
      for (let i = 0; i < LINES; i++) {
        const lim = gaps[i] * 0.8;
        for (let j = 0; j < NP; j++) {
          const k = i * NP + j;
          if (!off[k] && !vel[k]) continue;
          vel[k] = (vel[k] - 0.022 * off[k]) * 0.9;
          off[k] = clamp(off[k] + vel[k], -lim, lim);
          if (Math.abs(off[k]) < 0.01 && Math.abs(vel[k]) < 0.01) { off[k] = 0; vel[k] = 0; }
          e += Math.abs(off[k]) + Math.abs(vel[k]);
        }
      }
      tilt.x += (tilt.tx - tilt.x) * 0.06;
      tilt.y += (tilt.ty - tilt.y) * 0.06;
      return e + (Math.abs(tilt.tx - tilt.x) + Math.abs(tilt.ty - tilt.y)) * 100;
    }

    function rake(x, y, speed) {
      const R = 70 * depth(y);
      const push = clamp(speed, 0, 40) * 0.05;
      for (let i = 0; i < LINES; i++) {
        const dy = ys[i] - y;
        if (Math.abs(dy) > R) continue;
        for (let j = Math.max(0, Math.floor((x - R) / STEP)); j <= Math.min(NP - 1, Math.ceil((x + R) / STEP)); j++) {
          const d = Math.hypot(j * STEP - x, dy);
          if (d >= R) continue;
          vel[i * NP + j] += Math.sign(dy || 1) * push * (1 - d / R) ** 2;
        }
      }
    }

    function frame(t) {
      raf = 0;
      if (!ys) return wake();  // 尺寸還沒量好，下一格再試
      clock = t / 1000;
      settle();
      draw(revealAt(t));
      if (visible) wake();  // 持續動畫；開場畫面捲出視窗後停下，捲回來再接著動
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };

    readColors();
    resize();
    new ResizeObserver(resize).observe(canvas);
    const recolor = () => { readColors(); draw(reduce ? 1 : revealAt(performance.now())); };
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
    addEventListener('themechange', recolor);
    if (reduce) return;
    start = performance.now();
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); }).observe(hero);
    wake();
    hero.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (last) rake(x, y, Math.hypot(x - last[0], y - last[1]));
      last = [x, y];
      if (e.pointerType === 'mouse') { tilt.tx = x / W - 0.5; tilt.ty = y / H - 0.5; }
      wake();
    });
    hero.addEventListener('pointerleave', () => { last = null; tilt.tx = 0; tilt.ty = 0; wake(); });
  }

  const hero = document.querySelector('.hero');
  // 沙庭出錯也不能拖垮其他互動
  if (hero) try { garden(hero.querySelector('.hero__garden'), hero); } catch (err) { console.error(err); }

  // ── 引言：捲動時一行一行亮起 ──────────────────────────
  const verse = document.querySelector('.verse');
  const vlines = verse ? [...verse.querySelectorAll('.verse__lines span')] : [];
  if (verse && !reduce) verse.classList.add('is-scrolly');
  function verseUpdate() {
    if (!verse?.classList.contains('is-scrolly')) return;
    const r = verse.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    vlines.forEach((el, i) => el.style.setProperty('--o', (0.1 + 0.9 * clamp(p * (vlines.length + 1) - i, 0, 1)).toFixed(3)));
  }

  // ── 問路：選一個字，顯示回應與推薦篇章 ─────────────
  const askBtns = [...document.querySelectorAll('[data-ask]')];
  const answers = [...document.querySelectorAll('.ask__answer')];
  const idle = document.querySelector('.ask__idle');
  if (askBtns.length) {
    answers.forEach(a => { a.hidden = true; });
    idle.hidden = false;
    askBtns.forEach(btn => btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      askBtns.forEach(b => b.setAttribute('aria-pressed', on && b === btn));
      answers.forEach((a, k) => { a.hidden = !(on && k === Number(btn.dataset.ask)); });
      idle.hidden = on;
      // 手機上答案在按鈕下方，捲過去讓人看見
      if (on && !matchMedia('(min-width: 960px)').matches) {
        idle.parentElement.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
      }
    }));
  }

  // ── 目錄：主題、搜尋、只看可閱讀 ────────────────────
  const ix = document.querySelector('.ix');
  if (ix) {
    const rows = [...ix.children];
    const cats = [...document.querySelectorAll('.chip[data-cat]')];
    const search = document.querySelector('[data-search]');
    const openOnly = document.querySelector('[data-open-only]');
    const shownOut = document.querySelector('[data-ix-shown]');
    const empty = document.querySelector('.ix-empty');
    const norm = s => s.toLowerCase().replace(/\s+/g, '');
    rows.forEach(r => { r.dataset.text = norm(r.dataset.text); });
    let cat = 'all';
    const apply = () => {
      const q = norm(search.value);
      let shown = 0;
      rows.forEach(r => {
        const ok = (cat === 'all' || r.dataset.cat === cat) && (!openOnly.checked || r.dataset.open === '1') && (!q || r.dataset.text.includes(q));
        r.hidden = !ok;
        shown += ok;
      });
      shownOut.textContent = shown;
      empty.hidden = shown > 0;
    };
    cats.forEach(c => c.addEventListener('click', () => {
      cat = c.dataset.cat;
      cats.forEach(x => x.setAttribute('aria-pressed', x === c));
      apply();
    }));
    search.addEventListener('input', apply);
    openOnly.addEventListener('change', apply);
  }

  // ── 捲動：只在下一個畫格統一更新一次 ─────────────────
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (hero && !reduce && scrollY < innerHeight * 1.2) hero.style.setProperty('--sy', scrollY.toFixed(0));
      verseUpdate();
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  verseUpdate();

  // ── 抽籤 ───────────────────────────────────────────
  const card = document.querySelector('.omikuji__card');
  const drawBtn = document.querySelector('[data-draw]');
  const tipsEl = document.getElementById('tips');
  if (card && drawBtn && tipsEl) {
    const tips = JSON.parse(tipsEl.textContent);
    const LABEL = { A: '證據紮實', B: '證據尚可', C: '經驗共識' };
    const back = card.querySelector('.omikuji__back');
    let lastPick = -1;
    const el = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text != null) n.textContent = text; return n; };
    function fill(t) {
      const grade = el('span', `grade grade--${t.g.toLowerCase()}`);
      grade.append(el('b', '', t.g), LABEL[t.g]);
      const link = el('a', 'omikuji__link', '讀這一條');
      link.href = `${t.c}.html#n${t.n}`;
      back.replaceChildren(el('p', 'omikuji__ch', t.ct), grade, el('h3', 'omikuji__title', t.t), el('p', 'omikuji__summary', t.s), link);
    }
    drawBtn.addEventListener('click', () => {
      let i;
      do { i = Math.floor(Math.random() * tips.length); } while (i === lastPick && tips.length > 1);
      lastPick = i;
      if (reduce) { fill(tips[i]); card.dataset.flipped = 'true'; drawBtn.textContent = '再抽一支'; return; }
      drawBtn.disabled = true;
      const wasOpen = card.dataset.flipped === 'true';
      card.dataset.flipped = 'false';
      setTimeout(() => card.classList.add('is-shaking'), wasOpen ? 650 : 0);
      setTimeout(() => {
        card.classList.remove('is-shaking');
        fill(tips[i]);
        card.dataset.flipped = 'true';
        drawBtn.textContent = '再抽一支';
        drawBtn.disabled = false;
      }, (wasOpen ? 650 : 0) + 650);
    });
  }

  // ── 段落進場與數字往上跳 ───────────────────────────
  const counters = [...document.querySelectorAll('[data-count]')];
  const countUp = node => {
    const end = Number(node.dataset.count);
    const t0 = performance.now();
    const tick = t => {
      const p = clamp((t - t0) / 1500, 0, 1);
      node.textContent = Math.round(end * easeOut(p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (reduce) return;
  counters.forEach(n => { n.textContent = '0'; });
  const seen = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    seen.unobserve(en.target);
    en.target.classList.add('is-in');
    en.target.querySelectorAll('[data-count]').forEach(countUp);
  }), { threshold: 0.25 });
  document.querySelectorAll('.reveal').forEach(n => seen.observe(n));
})();
