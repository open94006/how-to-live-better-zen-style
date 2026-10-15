// 產生靜態網站：content/*.mjs + data/source.json + data/images.json → site/*.html
// 用法：node build.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import site from './content/site.mjs';
import * as catalog from './content/catalog.mjs';

const source = JSON.parse(fs.readFileSync('data/source.json', 'utf8'));
const images = JSON.parse(fs.readFileSync('data/images.json', 'utf8'));
const chapters = [];
for (const f of fs.readdirSync('content').filter(f => /^\d\d\.mjs$/.test(f)).sort()) {
  const ch = (await import(`./content/${f}`)).default;
  ch.no = Number(f.slice(0, 2));
  ch.src = source[f.slice(0, 2)];
  chapters.push(ch);
}

// 目錄必須剛好 34 篇；問路推薦的篇號要存在
assert.deepEqual(catalog.chapters.map(c => c.no), Array.from({ length: 34 }, (_, i) => i + 1), '目錄篇號不連續');
catalog.guides.forEach(g => g.chapters.forEach(no => assert(catalog.chapters[no - 1], `問路「${g.glyph}」推薦了不存在的第 ${no} 篇`)));
const CAT = Object.fromEntries(catalog.categories.map(c => [c.id, c.name]));
const toc = catalog.chapters.map(c => ({ ...c, ch: chapters.find(x => x.no === c.no) }));
// 資產網址加上內容雜湊，改了樣式瀏覽器就會重新抓
const ver = createHash('sha1').update(['tokens.css', 'style.css', 'app.js', 'home.css', 'home.js'].map(f => fs.readFileSync(`site/assets/${f}`, 'utf8')).join('')).digest('hex').slice(0, 8);

const GRADE = {
  A: { label: '證據紮實', text: '多半來自隨機分組試驗、大型統合分析，或可以逐字核對的官方規定。' },
  B: { label: '證據尚可', text: '多為觀察研究或單一研究，方向可信，但數字可能有偏差。' },
  C: { label: '經驗共識', text: '來自安全指南、事故統計或專家共識，沒有研究算過照做能少多少傷害。' },
};
// 付出與收益的徽章：花費一律中性呈現，不特別強調「免費」
const COST = [
  ['錢', '花費', { 0: '幾乎不用', 少: '一點', 多: '不少' }],
  ['時間', '時間', { 少: '一下子', 中: '一些', 多: '很多' }],
  ['毅力', '毅力', { 否: '不太需要', 些: '一點', 是: '長期堅持' }],
];
const GAIN = { 大: '大', 中: '中等', 小: '小' };
const KIND = { 死亡率: '換回壽命', 金錢: '省下金錢', 時間: '省下時間' };
const WHO = { 嬰幼兒: '嬰幼兒', 孩子: '孩子', 懷孕: '孕婦', 老人: '長輩', 女性: '女性', '35歲': '35 歲以上', '60歲': '60 歲以上' };
const NUM = '〇一二三四五六七八九';
const zh = n => (n < 10 ? NUM[n] : n < 20 ? '十' + (n % 10 ? NUM[n % 10] : '') : NUM[Math.floor(n / 10)] + '十' + (n % 10 ? NUM[n % 10] : ''));

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// 段落：空行分段；「本篇第 3、7 條」自動連到該條
const linkRefs = html => html.replace(/本篇第\s*([\d、\s]+?)\s*條/g, (_, nums) =>
  `本篇第 ${nums.split('、').map(n => `<a href="#n${n.trim()}">${n.trim()}</a>`).join('、')} 條`);
const paras = text => text.trim().split(/\n\s*\n/).map(p => `<p>${linkRefs(esc(p.trim()))}</p>`).join('');
const who = s => s.split(',').map(any => any.split('+').map(x => WHO[x] ?? x).join('且')).join('、');
const creator = s => { if (!s) return '作者未署名'; try { return unescape(decodeURIComponent(s)); } catch { return unescape(s); } };

function figure(key, cls, { eager = false, sizes = '(min-width: 1100px) 46rem, 100vw' } = {}) {
  const im = images[key];
  if (!im) return '';
  const base = `assets/img/${key}`;
  const lic = im.license === 'cc0' ? 'CC0' : '公眾領域';
  return `<figure class="${cls}">
  <img src="${base}-900.jpg" srcset="${base}-900.jpg 900w, ${base}-1800.jpg ${im.large_w}w" sizes="${sizes}" alt="${esc(im.alt)}"${im.pos ? ` style="object-position: ${esc(im.pos)}"` : ''} width="900" height="${Math.round(900 / im.ratio)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">
  <figcaption>攝影　${im.creator_url ? `<a href="${esc(im.creator_url)}">${esc(creator(im.creator))}</a>` : esc(creator(im.creator))}　·　<a href="${esc(im.landing)}">${lic}</a></figcaption>
</figure>`;
}

function source_(s) {
  const extra = s.extra.map(e => `<a class="src__more" href="${esc(e.url)}">${esc(e.label)}</a>`).join('');
  return `<li class="src">
  <span class="src__who">${esc(s.author || '（未署名）')}</span>${s.year ? `<span class="src__year">${esc(s.year)}</span>` : ''}
  ${s.title ? `<cite class="src__title">${esc(s.title)}</cite>` : ''}${s.note ? `<span class="src__note">${esc(s.note)}</span>` : ''}
  <span class="src__links"><a href="${esc(s.url)}">原始連結</a>${extra}</span>
</li>`;
}

function point(ch, n) {
  const it = ch.items[n];
  const src = ch.src.items[n];
  assert(it && src, `第 ${ch.no} 篇第 ${n} 條缺內容`);
  const g = src.grade;
  const t = src.tags;
  const grade = `<span class="grade grade--${g.toLowerCase()}"><b>${g}</b>${GRADE[g].label}</span>${it.disputed ? '<span class="flag">有爭議</span>' : ''}`;
  const badges = [
    ...COST.filter(([k, , map]) => t[k] in map).map(([k, label, map]) =>`<li class="badge"><span>${label}</span>${map[t[k]]}</li>`),
    t.收益 ? `<li class="badge badge--gain"><span>收益</span>${KIND[t.口徑] ?? ''}・${GAIN[t.收益]}</li>` : '',
    t.人群 ? `<li class="badge badge--who"><span>特別適合</span>${esc(who(t.人群))}</li>` : '',
  ].join('');
  return `<article class="point" id="n${n}" data-grade="${g}" data-disputed="${it.disputed ? 1 : 0}">
  <header class="point__head"><span class="point__no">第 ${n} 條</span>${grade}<button type="button" class="point__share" data-share aria-haspopup="dialog">分享圖卡</button></header>
  <h3 class="point__title">${esc(it.title)}</h3>
  <p class="point__summary">${esc(it.summary)}</p>
  <ul class="badges" aria-label="付出與收益">${badges}</ul>
  <div class="point__desc">${paras(it.desc)}</div>
  <aside class="point__aside" aria-label="證據與備註">
    <p class="point__why"><b>證據</b>${esc(it.why)}</p>
    <div class="point__note">${paras(it.note).replace('<p>', '<p><b>備註</b>')}</div>
  </aside>
  <details class="point__src">
    <summary>來源・${src.sources.length + (it.tw?.length ?? 0)} 筆</summary>
    <div>
      <ol class="sources">${src.sources.map(source_).join('')}</ol>
      ${it.tw?.length ? `<p class="sources__tw-head">台灣在地補充（改寫時查證，請以主管機關最新公告為準）</p><ul class="sources sources--tw">${it.tw.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    </div>
  </details>
</article>`;
}

// 青海波紋樣：每格五組同心圓，下排蓋住上排
const scale = (x, y) => [20, 15, 10, 5].map(r => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
const defs = `<svg class="defs" aria-hidden="true" focusable="false"><defs><pattern id="seigaiha" width="40" height="20" patternUnits="userSpaceOnUse" patternTransform="scale(0.6)">${[[0, 0], [40, 0], [20, 10], [0, 20], [40, 20]].map(([x, y]) => scale(x, y)).join('')}</pattern></defs></svg>`;
const wave = (cls = '') => `<svg class="wave ${cls}" aria-hidden="true" focusable="false"><rect width="100%" height="100%" fill="url(#seigaiha)"/></svg>`;

const head = (title, desc, og, extra = '') => `<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${og ? `<meta property="og:image" content="assets/img/${og}-900.jpg">` : ''}
<meta name="theme-color" content="#f5f0e6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#141a25" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='9' fill='%23b4583a'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@300;400;500;700;900&display=swap">
<link rel="stylesheet" href="assets/tokens.css?v=${ver}">
<link rel="stylesheet" href="assets/style.css?v=${ver}">
<script>document.documentElement.classList.add('js');try{const t=localStorage.getItem('hltb-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}</script>
<script src="assets/app.js?v=${ver}" defer></script>
${extra}
</head>`;

const masthead = (right, cls = '') => `<header class="masthead ${cls}">
  <a class="wordmark" href="index.html"><span class="wordmark__seal" aria-hidden="true">好</span>${esc(site.name)}</a>
  <div class="masthead__tools">
    ${right}
    <button type="button" class="theme-toggle" data-theme-toggle aria-label="切換深淺色"><span class="theme-toggle__day" aria-hidden="true">晝</span><span class="theme-toggle__night" aria-hidden="true">夜</span></button>
  </div>
</header>`;

const footer = ({ signoff = true } = {}) => `<footer class="close">
  ${wave()}
  ${signoff ? `<p class="close__line">${esc(site.signoff)}</p>
  <p class="close__sign">—— ${esc(site.signature)}</p>` : ''}
  <p class="close__ps">內容改寫自 eternity4719《<a href="https://github.com/eternity4719/HowToLiveBetter">高性價比人生指南</a>》（<a href="https://creativecommons.org/licenses/by/4.0/deed.zh_TW">CC BY 4.0</a>），已重新編寫並補充在地資訊；圖片為 CC0 或公眾領域；首頁手寫字為<a href="https://github.com/Chenyu-otf/chenyuluoyan_thin">辰宇落雁體</a>（<a href="assets/fonts/OFL.txt">OFL-1.1</a>）。內容僅供參考，不能取代專業醫療、法律與財務意見。</p>
</footer>`;

function chapterPage(ch, i) {
  const items = Object.keys(ch.items).map(Number);
  const grouped = ch.groups.flatMap(g => g.items);
  assert.deepEqual([...grouped].sort((a, b) => a - b), [...items].sort((a, b) => a - b), `第 ${ch.no} 篇分組與條目不一致`);
  assert.deepEqual(items.sort((a, b) => a - b), Object.keys(ch.src.items).map(Number).sort((a, b) => a - b), `第 ${ch.no} 篇條目數與原書不同`);
  const prev = chapters[i - 1], next = chapters[i + 1];
  const count = g => items.filter(n => ch.src.items[n].grade === g).length;
  const body = `<body class="page-chapter">
${defs}
<div class="progress" aria-hidden="true"><span></span></div>
${masthead(`<a class="masthead__link" href="index.html#chapters">所有篇章</a>`)}
<main>
<section class="opening">
  <div class="opening__text">
    <p class="opening__no">第 ${ch.no} 篇　·　原書「${esc(ch.src.title)}」</p>
    <h1>${esc(ch.title)}</h1>
    <p class="opening__tagline">${esc(ch.tagline)}</p>
    <p class="opening__lead">${esc(ch.lead)}</p>
  </div>
  ${figure(ch.hero, 'opening__plate', { eager: true, sizes: '(min-width: 900px) 40vw, 100vw' })}
</section>

<section class="guide" aria-label="閱讀指引">
  <div class="guide__legend">
    <p class="guide__title">這篇有 ${items.length} 條建議</p>
    <ul class="legend">
      ${['A', 'B', 'C'].map(g => `<li><span class="grade grade--${g.toLowerCase()}"><b>${g}</b>${GRADE[g].label}</span><span>${count(g)} 條。${GRADE[g].text}</span></li>`).join('')}
    </ul>
  </div>
  <div class="guide__tools">
    <p class="guide__title">想先看哪一類？</p>
    <div class="filters" role="group" aria-label="篩選條目">
      ${[['all', '全部'], ['A', 'A 證據紮實'], ['B', 'B 證據尚可'], ['C', 'C 經驗共識'], ['disputed', '有爭議']]
        .map(([v, l], k) => `<button type="button" class="chip" data-filter="${v}" aria-pressed="${k === 0}">${l}</button>`).join('')}
    </div>
    <p class="guide__status" aria-live="polite"><span data-shown>${items.length}</span> 條顯示中</p>
    <p class="guide__how">每張卡片是一件事：先讀摘要，看看要付出多少、能換回什麼；想查證時，再展開最下面的「來源」。</p>
  </div>
</section>

<div class="reader">
  <nav class="toc" aria-label="本篇目錄">
    <p class="toc__title">本篇目錄</p>
    <ol>${ch.groups.map((g, k) => `<li><a href="#g${k + 1}">${esc(g.name)}<span>${g.items.length}</span></a></li>`).join('')}</ol>
  </nav>
  <div class="entries">
    ${ch.groups.map((g, k) => `<section class="group" id="g${k + 1}" aria-labelledby="g${k + 1}h">
      <h2 id="g${k + 1}h">${esc(g.name)}</h2>
      ${wave()}
      <p class="group__blurb">${esc(g.blurb)}</p>
      ${g.image ? figure(g.image, 'plate') : ''}
      ${g.items.map(n => point(ch, n)).join('\n')}
    </section>`).join('\n')}
    <p class="empty" hidden>這個篩選條件下沒有條目。</p>
  </div>
</div>

<nav class="turn" aria-label="翻頁">
  ${prev ? `<a class="turn__prev" href="${prev.slug}.html"><small>上一篇</small>${esc(prev.title)}</a>` : '<a class="turn__prev" href="index.html"><small>回到</small>首頁</a>'}
  ${next ? `<a class="turn__next" href="${next.slug}.html"><small>下一篇</small>${esc(next.title)}</a>` : '<a class="turn__next" href="index.html#chapters"><small>回到</small>所有篇章</a>'}
</nav>
</main>
<dialog class="share" aria-labelledby="share-h">
  <div class="share__head"><p id="share-h" class="share__title">分享這一條</p><button type="button" class="share__close" data-share-close aria-label="關閉">×</button></div>
  <img class="share__img" alt="" width="1080" height="1080">
  <div class="share__actions">
    <button type="button" class="share__btn share__btn--primary" data-share-copy>複製圖片</button>
    <button type="button" class="share__btn" data-share-download>下載 PNG</button>
  </div>
  <p class="share__status" aria-live="polite"></p>
</dialog>
${footer()}
</body>
</html>`;
  return head(`${ch.title}｜${site.name}`, ch.lead, ch.hero) + '\n' + body;
}

function homePage() {
  // 抽籤用的資料：每條只帶標題、摘要、等級與位置
  const tips = chapters.flatMap(ch => Object.entries(ch.items).map(([n, it]) => ({
    c: ch.slug, ct: `第 ${ch.no} 篇・${ch.title}`, n: Number(n), t: it.title, s: it.summary, g: ch.src.items[n].grade,
  })));
  const strong = tips.filter(x => x.g === 'A').length;
  const sourceCount = chapters.reduce((a, ch) => a + Object.values(ch.src.items).reduce((b, i) => b + i.sources.length, 0), 0);
  const first = tips[0];
  const thumb = (key, cls) => {
    const im = images[key];
    return im ? `<img class="${cls}" src="assets/img/${key}-900.jpg" alt="" width="900" height="${Math.round(900 / im.ratio)}"${im.pos ? ` style="object-position: ${esc(im.pos)}"` : ''} loading="lazy" decoding="async">` : '';
  };
  // 問路推薦的一篇：已整理的可點，其餘標示整理中
  const pick = no => {
    const c = toc[no - 1];
    return c.ch
      ? `<li><a class="pick" href="${c.ch.slug}.html">${thumb(c.ch.hero, 'pick__img')}<span class="pick__no">第 ${no} 篇</span><span class="pick__title">${esc(c.ch.title)}</span><span class="pick__line">${esc(c.question)}</span></a></li>`
      : `<li><span class="pick pick--soon"><span class="pick__no">第 ${no} 篇</span><span class="pick__title">${esc(c.title)}</span><span class="pick__line">整理中・${esc(c.question)}</span></span></li>`;
  };
  const row = c => {
    const open = Boolean(c.ch);
    const text = [c.title, c.question, CAT[c.cat], ...(open ? [c.ch.tagline, ...c.ch.groups.map(g => g.name), ...Object.values(c.ch.items).map(i => i.title)] : [])].join(' ');
    const inner = `<span class="ix__no" aria-hidden="true">${c.no}</span>
      <span class="ix__main"><span class="ix__title">${esc(open ? c.ch.title : c.title)}</span><span class="ix__q">${esc(c.question)}</span></span>
      <span class="ix__meta"><span class="ix__cat">${CAT[c.cat]}</span><span class="ix__state">${open ? `${Object.keys(c.ch.items).length} 條建議` : '整理中'}</span></span>
      ${open ? thumb(c.ch.hero, 'ix__img') : ''}`;
    return `<li class="ix__item${open ? ' is-open' : ''}" data-cat="${c.cat}" data-open="${open ? 1 : 0}" data-text="${esc(text)}">
      ${open ? `<a class="ix__row" href="${c.ch.slug}.html" aria-label="第 ${c.no} 篇 ${esc(c.ch.title)}">${inner}</a>` : `<div class="ix__row">${inner}</div>`}
    </li>`;
  };
  const enso = `<svg class="enso" viewBox="0 0 320 320" aria-hidden="true">
    <defs><mask id="enso-reveal" maskUnits="userSpaceOnUse"><path class="enso__sweep" pathLength="1" d="M217.5 53.6 L225.2 58.1 L232.5 63.1 L239.4 68.7 L245.9 74.9 L251.9 81.5 L257.3 88.5 L262.2 95.9 L266.6 103.7 L270.3 111.8 L273.3 120.2 L275.8 128.8 L277.5 137.5 L278.6 146.4 L279.0 155.3 L278.7 164.2 L277.7 173.0 L276.1 181.8 L273.8 190.4 L270.8 198.8 L267.2 207.0 L263.0 214.8 L258.2 222.3 L252.8 229.4 L246.9 236.1 L240.5 242.3 L233.7 248.0 L226.4 253.1 L218.7 257.7 L210.8 261.7 L202.5 265.1 L194.0 267.8 L185.4 269.8 L176.6 271.2 L167.7 271.9 L158.8 271.9 L149.9 271.3 L141.1 269.9 L132.4 267.9 L123.9 265.2 L115.6 261.9 L107.6 257.9 L100.0 253.4 L92.7 248.3 L85.8 242.6 L79.4 236.4 L73.5 229.7 L68.1 222.6 L63.2 215.2 L59.0 207.3 L55.3 199.2 L52.3 190.8 L50.0 182.2 L48.3 173.5 L47.3 164.6 L47.0 155.7 L47.4 146.8 L48.4 137.9 L50.1 129.2 L52.5 120.6 L55.6 112.2 L59.3 104.1 L63.5 96.3 L68.4 88.8 L73.9 81.8 L79.8 75.2 L86.3 69.0 L93.2 63.4 L100.5 58.3 L108.2 53.8 L116.2 49.9 L124.5 46.6 L133.0 44.0" /></mask></defs>
    <path class="enso__ink" mask="url(#enso-reveal)" d="M218.2 50.5 L226.4 55.3 L234.3 60.7 L241.7 66.7 L248.6 73.3 L255.0 80.3 L260.8 87.8 L266.1 95.8 L270.7 104.1 L274.7 112.8 L277.9 121.7 L280.5 130.9 L282.4 140.2 L283.6 149.7 L284.0 159.2 L283.7 168.7 L282.7 178.2 L280.9 187.6 L278.4 196.8 L275.3 205.8 L271.4 214.5 L266.9 222.9 L261.7 230.9 L256.0 238.5 L249.7 245.6 L242.9 252.3 L235.5 258.3 L227.8 263.8 L219.6 268.7 L211.1 273.0 L202.2 276.6 L193.2 279.5 L183.9 281.7 L174.5 283.2 L165.0 283.9 L155.5 283.9 L146.0 283.2 L136.5 281.8 L127.3 279.6 L118.2 276.7 L109.3 273.2 L100.8 269.0 L92.6 264.1 L84.8 258.6 L77.5 252.6 L70.6 245.9 L64.3 238.8 L58.5 231.2 L53.3 223.2 L48.8 214.9 L44.9 206.2 L41.7 197.2 L39.2 188.0 L37.4 178.7 L36.3 169.2 L36.0 159.7 L36.4 150.2 L37.5 140.7 L39.4 131.3 L41.9 122.2 L45.2 113.2 L49.1 104.5 L53.7 96.2 L58.9 88.2 L64.7 80.7 L71.1 73.6 L78.0 67.0 L85.4 61.0 L93.2 55.5 L101.4 50.7 L109.9 46.5 L118.8 43.0 L127.9 40.2 L138.0 47.7 L130.1 50.1 L122.4 53.2 L115.0 56.8 L107.8 61.0 L101.0 65.8 L94.6 71.0 L88.5 76.7 L83.0 82.9 L77.9 89.5 L73.4 96.4 L69.4 103.7 L66.0 111.3 L63.1 119.0 L60.9 127.0 L59.3 135.2 L58.3 143.4 L58.0 151.7 L58.3 160.0 L59.2 168.2 L60.8 176.4 L63.0 184.4 L65.8 192.2 L69.1 199.8 L73.1 207.1 L77.6 214.1 L82.6 220.7 L88.1 226.9 L94.1 232.6 L100.5 237.9 L107.3 242.7 L114.4 246.9 L121.9 250.6 L129.6 253.7 L137.5 256.2 L145.6 258.1 L153.8 259.3 L162.0 259.9 L170.3 259.9 L178.6 259.3 L186.8 258.0 L194.9 256.1 L202.8 253.5 L210.5 250.4 L217.9 246.7 L225.0 242.4 L231.8 237.7 L238.2 232.3 L244.1 226.6 L249.6 220.4 L254.6 213.7 L259.1 206.7 L263.0 199.4 L266.4 191.8 L269.1 184.0 L271.3 176.0 L272.8 167.9 L273.7 159.6 L274.0 151.3 L273.6 143.0 L272.6 134.8 L271.0 126.7 L268.7 118.7 L265.9 110.9 L262.4 103.3 L258.4 96.1 L253.8 89.2 L248.7 82.6 L243.2 76.5 L237.2 70.7 L230.7 65.5 L223.9 60.8 L216.7 56.6 Z" />
    <path class="enso__hair" pathLength="1" d="M214 44 A129 127 0 1 1 128 36" />
  </svg>`;
  const body = `<body class="page-home">
${defs}
${masthead(`<nav class="masthead__nav" aria-label="首頁段落"><a class="masthead__link" href="#ask">問路</a><a class="masthead__link" href="#chapters">篇章</a></nav>`, 'masthead--float')}
<main class="home">
<section class="hero" aria-labelledby="hero-title">
  <canvas class="hero__garden" aria-hidden="true"></canvas>
  <div class="hero__ink">
    ${enso}
    <h1 id="hero-title" class="hero__title">${site.hero.map(l => `<span>${esc(l)}</span>`).join('')}</h1>
  </div>
  <div class="hero__intro">
    <p>${esc(site.intro)}</p>
  </div>
  <p class="hero__hint" aria-hidden="true">在沙上劃過，留下痕跡</p>
  ${wave('hero__wave')}
</section>

<section class="verse" id="verse" aria-label="引言" style="--n: ${site.verse.length}">
  <div class="verse__stage">
    <p class="verse__lines">${site.verse.map(l => `<span>${esc(l)}</span>`).join('')}</p>
  </div>
</section>

<section class="ask sec" id="ask" data-mark="問" aria-labelledby="ask-h">
  ${wave('sec__wave')}
  <div class="sec__inner">
    <header class="sec-head">
      <h2 id="ask-h">${esc(site.ask.title)}</h2>
      <p>${esc(site.ask.lead)}</p>
    </header>
    <div class="ask__body">
      <ul class="ask__list" role="list">
        ${catalog.guides.map((g, k) => `<li><button type="button" class="ask__btn" data-ask="${k}" aria-pressed="false" aria-controls="ask-a${k}"><span class="ask__glyph" aria-hidden="true">${esc(g.glyph)}</span><span class="ask__q">${esc(g.label)}</span></button></li>`).join('')}
      </ul>
      <div class="ask__answers" aria-live="polite">
        <p class="ask__idle" hidden><span aria-hidden="true">問</span>${esc(site.ask.idle)}</p>
        ${catalog.guides.map((g, k) => `<div class="ask__answer" id="ask-a${k}">
          <p class="ask__ask">${esc(g.ask)}</p>
          <p class="ask__reply">${esc(g.reply)}</p>
          <p class="ask__hint">可以先讀這幾篇</p>
          <ol class="ask__picks">${g.chapters.map(pick).join('')}</ol>
        </div>`).join('')}
      </div>
    </div>
  </div>
</section>

<section class="index sec" id="chapters" data-mark="書" aria-labelledby="ix-h">
  <div class="sec__inner">
    <header class="sec-head">
      <h2 id="ix-h">${esc(site.index.title)}</h2>
      <p>${esc(site.index.lead)}</p>
    </header>
    <div class="ix-tools">
      <div class="filters" role="group" aria-label="依主題篩選">
        ${[{ id: 'all', name: '全部' }, ...catalog.categories].map((c, k) => `<button type="button" class="chip" data-cat="${c.id}" aria-pressed="${k === 0}">${esc(c.name)}<span class="chip__n">${c.id === 'all' ? toc.length : toc.filter(x => x.cat === c.id).length}</span></button>`).join('')}
      </div>
      <div class="ix-tools__row">
        <input class="search" type="search" placeholder="搜尋：睡眠、保險、租屋…" aria-label="搜尋篇章或建議" data-search>
        <label class="switch"><input type="checkbox" data-open-only><span>只看可以閱讀的</span></label>
        <p class="ix-status" aria-live="polite">顯示 <span data-ix-shown>${toc.length}</span> 篇</p>
      </div>
    </div>
    <ol class="ix">${toc.map(row).join('')}</ol>
    <p class="ix-empty" hidden>沒有找到相符的篇章，換個詞試試看。</p>
  </div>
</section>

<section class="omikuji sec" data-mark="籤" aria-labelledby="omi-h">
  ${wave('sec__wave')}
  <div class="sec__inner">
    <header class="sec-head sec-head--center">
      <h2 id="omi-h">${esc(site.omikuji.title)}</h2>
      <p>${esc(site.omikuji.lead)}</p>
    </header>
    <div class="omikuji__card" data-flipped="false">
      <div class="omikuji__inner">
        <div class="omikuji__face omikuji__front" aria-hidden="true"><span class="omikuji__mark">籤</span><span class="omikuji__sub">今日小提醒</span></div>
        <div class="omikuji__face omikuji__back" aria-live="polite">
          <p class="omikuji__ch">${esc(first.ct)}</p>
          <span class="grade grade--${first.g.toLowerCase()}"><b>${first.g}</b>${GRADE[first.g].label}</span>
          <h3 class="omikuji__title">${esc(first.t)}</h3>
          <p class="omikuji__summary">${esc(first.s)}</p>
          <a class="omikuji__link" href="${first.c}.html#n${first.n}">讀這一條</a>
        </div>
      </div>
    </div>
    <button class="cta cta--button" type="button" data-draw>抽一支籤</button>
    <script type="application/json" id="tips">${JSON.stringify(tips).replace(/</g, '\\u003c')}</script>
  </div>
</section>

<section class="vows sec" data-mark="約" aria-labelledby="vows-h">
  <div class="sec__inner">
    <header class="sec-head">
      <h2 id="vows-h">這份指南的三個約定</h2>
    </header>
    <ol class="vows__list">
      ${site.vows.map((v, k) => `<li><span class="vows__no" aria-hidden="true">${zh(k + 1)}</span><h3>${esc(v.title)}</h3><p>${esc(v.text)}</p>${k === 1 ? `<p class="vows__grades">${['A', 'B', 'C'].map(g => `<span class="grade grade--${g.toLowerCase()}"><b>${g}</b>${GRADE[g].label}</span>`).join('')}<span class="flag">有爭議</span></p>` : ''}</li>`).join('')}
    </ol>
    <dl class="tally">
      ${[[tips.length, '條建議'], [chapters.length, '個篇章已整理'], [strong, '條證據紮實'], [sourceCount, '筆原始出處']]
        .map(([v, l]) => `<div class="reveal"><dt>${l}</dt><dd data-count="${v}">${v}</dd></div>`).join('')}
    </dl>
  </div>
</section>

<section class="coda" aria-labelledby="coda-h">
  <h2 id="coda-h">${esc(site.coda)}</h2>
  <a class="cta" href="#ask">回到問路</a>
</section>
</main>
${footer()}
</body>
</html>`;
  return head(site.name, site.description, 'home', `<link rel="stylesheet" href="assets/home.css?v=${ver}">\n<script src="assets/home.js?v=${ver}" defer></script>`) + '\n' + body;
}

// 首頁意境語句（辰宇落雁體）用到的字；有變動就要重做字型子集
const moodChars = [...new Set([...site.hero, ...site.verse, site.coda, ...catalog.guides.map(g => g.reply)].join(''))].sort().join('');
if (fs.readFileSync('data/mood-chars.txt', 'utf8').trim() !== moodChars) {
  fs.writeFileSync('data/mood-chars.txt', moodChars + '\n');
  console.warn('首頁意境語句的字有變動：請執行 npm run font 重做字型子集');
}

fs.mkdirSync('site', { recursive: true });
chapters.forEach((ch, i) => fs.writeFileSync(`site/${ch.slug}.html`, chapterPage(ch, i)));
fs.writeFileSync('site/index.html', homePage());
console.log(`built index.html + ${chapters.map(c => c.slug + '.html').join(', ')}`);
