// 全站：深淺色切換（記在這台裝置）。篇章頁：閱讀進度、展開條目、分享圖卡、目錄標示目前段落
(() => {
  // 深淺色：預設跟系統，按了之後記住；按鈕顯示「切換後」的那一個字
  const root = document.documentElement;
  const toggle = document.querySelector('[data-theme-toggle]');
  const dark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const label = () => toggle?.setAttribute('aria-label', dark() ? '切換成淺色模式' : '切換成深色模式');
  label();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', label);
  toggle?.addEventListener('click', () => {
    root.dataset.theme = dark() ? 'light' : 'dark';
    try { localStorage.setItem('hltb-theme', root.dataset.theme); } catch { /* 私密瀏覽時不記 */ }
    label();
    dispatchEvent(new Event('themechange'));
  });

  if (!document.querySelector('.page-chapter')) return;
  const groups = [...document.querySelectorAll('.group')];

  // 頂端閱讀進度
  const bar = document.querySelector('.progress span');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max) : 0);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 網址帶 #n12 時，展開那一條
  const showHash = () => {
    const el = location.hash.startsWith('#n') && document.getElementById(location.hash.slice(1));
    if (el) el.querySelector('.point__fold').open = true;
  };
  addEventListener('hashchange', showHash);
  showHash();
  // 複製這一條的網址；複製不了就跳出來讓人自己選取
  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-copy-link]');
    if (!btn) return;
    const url = `${location.origin}${location.pathname}#${btn.closest('.point').id}`;
    try {
      await navigator.clipboard.writeText(url);
      btn.dataset.done = '';
      btn.title = '已複製網址';
      setTimeout(() => { delete btn.dataset.done; btn.title = '複製網址'; }, 1600);
    } catch {
      prompt('複製這一條的網址', url);
    }
  });
  addEventListener('beforeprint', () => document.querySelectorAll('.point details').forEach(d => { d.open = true; }));

  // ── 分享圖卡：把一條建議畫成 1080×1080 的 PNG，可複製或下載 ──
  const dialog = document.querySelector('.share');
  if (dialog) {
    const S = 1080, M = 96, root = document.documentElement;
    const img = dialog.querySelector('.share__img');
    const status = dialog.querySelector('.share__status');
    const copyBtn = dialog.querySelector('[data-share-copy]');
    const dlBtn = dialog.querySelector('[data-share-download]');
    const chapter = `${document.querySelector('.opening__no').textContent.split('·')[0].trim()}・${document.querySelector('.opening h1').textContent}`;
    const site = document.querySelector('.wordmark').lastChild.textContent.trim();
    const slug = location.pathname.split('/').pop().replace(/\.html$/, '') || 'card';
    const css = name => getComputedStyle(root).getPropertyValue(name).trim();
    // canvas 不一定認得 oklch()：先用 2D context 轉一次
    const probe = document.createElement('canvas').getContext('2d');
    const color = name => { probe.fillStyle = '#000'; probe.fillStyle = css(name); return probe.fillStyle; };
    let blob = null, url = '', name = '';

    // 換行：中文逐字、英數整個字一起；句讀不放在行首
    const NO_START = '，。、；：？！」』）》…—%';
    function wrap(ctx, text, width) {
      const lines = [];
      let line = '';
      for (const tok of text.match(/[A-Za-z0-9.'’\-]+|\s+|./gu) ?? []) {
        if (line && ctx.measureText(line + tok).width > width && !NO_START.includes(tok[0])) { lines.push(line.trimEnd()); line = tok.trimStart(); }
        else line += tok;
      }
      if (line) lines.push(line);
      return lines;
    }
    const pill = (ctx, x, y, w, h) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); };
    // 青海波：每排錯開半格、下排蓋住上排
    function waves(ctx, top, h, paper, gold) {
      const R = 26;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, top, S, h); ctx.clip();
      ctx.lineWidth = 1.6; ctx.strokeStyle = gold; ctx.fillStyle = paper;
      for (let row = 0, y = top; y <= top + h + R; row++, y += R / 2) {
        for (let x = (row % 2) * R; x <= S + R; x += 2 * R) {
          for (const r of [R, R * 0.75, R * 0.5, R * 0.25]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        }
      }
      ctx.restore();
    }

    async function render(card) {
      const c = {
        paper: color('--color-paper'), ink: color('--color-ink'), ink2: color('--color-ink-2'), muted: color('--color-muted'),
        rule: color('--color-rule'), accent: color('--color-accent'), accentInk: color('--color-accent-ink'), gold: color('--color-gold'),
      };
      const DISPLAY = css('--font-display'), BODY = css('--font-body');
      const no = card.querySelector('.point__no').textContent;
      const title = card.querySelector('.point__title').textContent;
      const summary = card.querySelector('.point__summary').textContent;
      const g = card.dataset.grade;
      const gradeLabel = card.querySelector('.grade').lastChild.textContent;
      const disputed = card.dataset.disputed === '1';
      const badges = [...card.querySelectorAll('.badge')].map(b => ({ label: b.firstChild.textContent, value: b.lastChild.textContent, gain: b.classList.contains('badge--gain') }));
      const all = chapter + no + title + summary + gradeLabel + badges.map(b => b.label + b.value).join('') + site + '有爭議好';
      await Promise.all([`600 64px ${DISPLAY}`, `400 40px ${DISPLAY}`, `500 26px ${BODY}`, `700 26px ${BODY}`].map(f => document.fonts.load(f, all)));

      const cv = document.createElement('canvas');
      cv.width = cv.height = S;
      const ctx = cv.getContext('2d');
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = c.paper;
      ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = c.rule; ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, S - 80, S - 80);
      waves(ctx, S - 40 - 64, 64, c.paper, c.gold);
      ctx.beginPath(); ctx.moveTo(40, S - 104); ctx.lineTo(S - 40, S - 104); ctx.stroke();

      // 上方：篇章與證據等級
      ctx.font = `500 26px ${BODY}`; ctx.fillStyle = c.muted;
      ctx.fillText(chapter, M, M + 30);
      ctx.font = `600 30px ${DISPLAY}`; ctx.fillStyle = c.accent;
      ctx.fillText(no, M, M + 100);
      ctx.font = `500 26px ${BODY}`;
      const gColor = color(`--color-grade-${g.toLowerCase()}`);
      let gx = M + ctx.measureText(no).width + 64;
      const gw = 44 + 14 + ctx.measureText(gradeLabel).width + 24;
      ctx.strokeStyle = gColor; ctx.lineWidth = 2; pill(ctx, gx, M + 68, gw, 48); ctx.stroke();
      ctx.fillStyle = gColor; ctx.beginPath(); ctx.arc(gx + 26, M + 92, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.paper; ctx.font = `700 22px ${BODY}`; ctx.textAlign = 'center'; ctx.fillText(g, gx + 26, M + 100); ctx.textAlign = 'left';
      ctx.fillStyle = gColor; ctx.font = `500 26px ${BODY}`; ctx.fillText(gradeLabel, gx + 58, M + 101);
      if (disputed) {
        gx += gw + 14;
        const dw = ctx.measureText('有爭議').width + 40;
        ctx.setLineDash([6, 5]); ctx.strokeStyle = c.accent; pill(ctx, gx, M + 68, dw, 48); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = c.accent; ctx.fillText('有爭議', gx + 20, M + 101);
      }

      // 下方：付出與收益徽章（由下往上排，先量出高度）
      ctx.font = `500 26px ${BODY}`;
      const rows = [[]];
      let rx = 0;
      for (const b of badges) {
        const w = ctx.measureText(b.label).width + 12 + ctx.measureText(b.value).width + 40;
        if (rx && rx + w > S - 2 * M) { rows.push([]); rx = 0; }
        rows.at(-1).push({ ...b, w, x: rx });
        rx += w + 14;
      }
      const badgeTop = S - 104 - 60 - rows.length * 64;
      rows.forEach((row, i) => row.forEach(b => {
        const x = M + b.x, y = badgeTop + i * 64;
        ctx.strokeStyle = b.gain ? c.accent : c.rule; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(x, y, b.w, 50, 6); ctx.stroke();
        ctx.fillStyle = b.gain ? c.accent : c.muted; ctx.fillText(b.label, x + 20, y + 34);
        ctx.fillStyle = b.gain ? c.accent : c.ink; ctx.fillText(b.value, x + 20 + ctx.measureText(b.label).width + 12, y + 34);
      }));

      // 中間：標題與摘要，太長就縮小字級
      const top = M + 180, room = badgeTop - 56 - top, width = S - 2 * M;
      let ts = 66, ss = 40, tl, sl;
      for (; ts >= 40; ts -= 4, ss = Math.max(28, ss - 2)) {
        ctx.font = `600 ${ts}px ${DISPLAY}`; tl = wrap(ctx, title, width);
        ctx.font = `400 ${ss}px ${DISPLAY}`; sl = wrap(ctx, summary, width);
        if (tl.length * ts * 1.4 + 76 + sl.length * ss * 1.7 <= room) break;
      }
      let y = top + ts;
      ctx.font = `600 ${ts}px ${DISPLAY}`; ctx.fillStyle = c.ink;
      tl.forEach(l => { ctx.fillText(l, M, y); y += ts * 1.4; });
      y += 4 - ts * 0.4;
      ctx.fillStyle = c.gold; ctx.fillRect(M, y, 72, 3);
      y += 40 + ss;
      ctx.font = `400 ${ss}px ${DISPLAY}`; ctx.fillStyle = c.ink2;
      sl.forEach(l => { ctx.fillText(l, M, y); y += ss * 1.7; });

      // 落款：朱印與站名
      const fy = S - 104 - 18;
      ctx.save(); ctx.translate(S - M - 26, fy - 18); ctx.rotate(-0.05);
      ctx.fillStyle = c.accent; ctx.fillRect(-22, -22, 44, 44);
      ctx.fillStyle = c.accentInk; ctx.font = `700 26px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.fillText('好', 0, 9);
      ctx.restore();
      ctx.textAlign = 'right'; ctx.font = `600 26px ${DISPLAY}`; ctx.fillStyle = c.ink2;
      ctx.fillText(site, S - M - 66, fy - 8);
      ctx.textAlign = 'left';

      blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      name = `${slug}-${card.id.slice(1)}.png`;
      img.src = url;
      img.alt = `${title}：${summary}`;
    }

    const say = (text, state = '') => { status.textContent = text; status.dataset.state = state; };
    document.addEventListener('click', async e => {
      const btn = e.target.closest('[data-share]');
      if (!btn) return;
      copyBtn.disabled = dlBtn.disabled = true;
      img.removeAttribute('src');
      say('正在產生圖卡…');
      dialog.showModal();
      try {
        await render(btn.closest('.point'));
        say('');
        copyBtn.disabled = dlBtn.disabled = false;
      } catch (err) {
        console.error(err);
        say('圖卡產生失敗，請重新整理頁面再試一次。', 'error');
      }
    });
    copyBtn.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('unsupported');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        say('已複製圖片，可以直接貼上。');
      } catch {
        say('這個瀏覽器不能直接複製圖片，請改用「下載 PNG」，或長按圖片儲存。', 'error');
      }
    });
    dlBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = url; a.download = name;
      a.click();
      say('已下載圖片。');
    });
    dialog.querySelector('[data-share-close]').addEventListener('click', () => dialog.close());
    // 點彈窗外面的遮罩也能關閉
    dialog.addEventListener('click', e => {
      if (e.target !== dialog) return;  // 鍵盤觸發的 click 座標是 0，只看真的點在 dialog 本身的
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    });
  }

  // 目錄標示目前讀到哪一段
  const links = new Map([...document.querySelectorAll('.toc a')].map(a => [a.hash.slice(1), a]));
  const seen = new IntersectionObserver(items => {
    items.filter(i => i.isIntersecting).forEach(i => {
      links.forEach(a => a.removeAttribute('aria-current'));
      links.get(i.target.id)?.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  groups.forEach(g => seen.observe(g));
})();
