// 從原書 book-src/*.md 抽出每條的成本標籤、證據等級與來源，轉成台灣繁體，寫到 data/source.json。
// 正文由人工改寫在 content/，這裡只負責「照抄不改」的部分。
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Converter } from 'opencc-js';

const toTW = Converter({ from: 'cn', to: 'tw' });
const toTWP = Converter({ from: 'cn', to: 'twp' });
const SEP = /\s*(?:；|\s;\s)\s*/;
const CLOSED_PAREN = /^（[^）]*）\.?$/;

// 把一行「来源」拆成一筆一筆：每筆以 <網址> 結尾，筆與筆之間用分號隔開。
// 網址後緊跟的「（說明）」歸前一筆；網址後沒遇到分號就又出現網址（「（通知頁 <網址>）」「<網址>、<網址>」），
// 後面那個網址算前一筆的補充連結。
export function parseSources(line) {
  const parts = line.split(/<(https?:[^>]+)>/);
  const out = [];
  let pending = '';
  let extraNext = false;
  for (let i = 0; i < parts.length; i++) {
    if (i % 2) {
      const text = pending.trim();
      if (extraNext) {
        out.at(-1).extra.push({ label: clean(text.replace(/^[（，、,]\s*/, '')) || '另一個連結', url: parts[i] });
      } else {
        out.push({ ...splitCitation(clean(text)), url: parts[i], extra: [] });
      }
      pending = '';
      extraNext = false;
      continue;
    }
    let seg = parts[i];
    if (out.length) {
      seg = seg.replace(/^\s*[）)]/, ''); // 補充連結的右括號
      const m = seg.match(SEP);
      const head = (m ? seg.slice(0, m.index) : seg).trim();
      if (!m && head && !CLOSED_PAREN.test(head)) { pending = head; extraNext = true; continue; }
      const note = clean(head.replace(/^（|）\.?$/g, ''));
      if (note) out.at(-1).note = note;
      seg = m ? seg.slice(m.index + m[0].length) : '';
    }
    pending += seg;
  }
  return out;
}

// 去掉引文「……」與多餘標點
function clean(s) {
  return s
    .replace(/[：:]?\s*「[^」]*」/g, '')
    .replace(/，\s*(?=[.。]|$)/g, '')
    .replace(/^[\s;；.。，]+|[\s;；，：:]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// 「作者 (年份). 標題」→ { author, year, title }；格式不合就整串當標題
function splitCitation(s) {
  const m = s.match(/^(.+?)\s*[(（](\d{4}(?:[-–]\d{2}(?:[-–]\d{2})?)?)[)）]\.?\s*(.*)$/);
  if (m && m[1].length < 160 && m[3]) return { author: m[1].trim(), year: m[2], title: m[3].replace(/\.$/, '').trim() };
  const n = s.match(/^([^.\d]{2,40})\.\s+(.+)$/); // 「NHS. Blood in urine」這種沒年份的
  if (n) return { author: n[1], year: '', title: n[2].replace(/\.$/, '') };
  return { author: '', year: '', title: s.replace(/\.$/, '') };
}

function selfCheck() {
  const r = parseSources('甲 (2020). 標題一. <https://a> ；乙 (2021). 標題二（第三條）. <https://b>（通知頁 <https://c>）；NHS. Blood in urine：「x」. <https://d>（說明）；丙 (2019). J, 44(7), 1. <https://e>，含更正 J (2020). <https://f>；丁 (2018). 表. <https://g>、<https://h>');
  assert.deepEqual(r.map(x => x.url), ['https://a', 'https://b', 'https://d', 'https://e', 'https://g']);
  assert.deepEqual(r[1], { author: '乙', year: '2021', title: '標題二（第三條）', url: 'https://b', extra: [{ label: '通知頁', url: 'https://c' }] });
  assert.equal(r[2].author, 'NHS');
  assert.equal(r[2].note, '說明');
  assert.equal(r[3].extra[0].url, 'https://f');
  assert.deepEqual(r[4].extra, [{ label: '另一個連結', url: 'https://h' }]);
}

function parseTags(comment) {
  const tags = {};
  for (const [, k, v] of comment.matchAll(/(\S+?)=(\S+)/g)) tags[k] = v;
  return tags;
}

export function parseChapter(md) {
  const items = {};
  for (const block of md.split(/^### /m).slice(1)) {
    const lines = block.split('\n');
    const head = lines[0].match(/^(\d+)\.\s*(.+)$/);
    if (!head) continue;
    const field = name => {
      const l = lines.find(x => x.startsWith(`- ${name}：`));
      return l ? l.slice(name.length + 3).trim() : '';
    };
    const tagLine = lines.find(l => l.startsWith('<!-- 成本标签'));
    items[head[1]] = {
      title: toTW(head[2].trim()),
      tags: tagLine ? JSON.parse(toTW(JSON.stringify(parseTags(tagLine.replace(/<!--\s*成本标签:|-->/g, ''))))) : {},
      grade: field('证据等级').slice(0, 1),
      sources: parseSources(field('来源')).map(s => ({
        ...s,
        author: toTW(s.author),
        title: toTW(s.title),
        ...(s.note && { note: toTWP(s.note) }),
        extra: s.extra.map(e => ({ label: toTWP(e.label), url: e.url })),
      })),
    };
  }
  return items;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  selfCheck();
  const out = {};
  for (const f of fs.readdirSync('book-src').filter(f => f.endsWith('.md')).sort()) {
    const md = fs.readFileSync(`book-src/${f}`, 'utf8');
    out[f.slice(0, 2)] = { title: toTW(md.match(/^# \d+\.\s*(.+)$/m)[1]), items: parseChapter(md) };
  }
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/source.json', JSON.stringify(out, null, 1));
  for (const [k, v] of Object.entries(out)) {
    const n = Object.values(v.items);
    console.log(k, v.title, `${n.length} 條`, `${n.reduce((a, i) => a + i.sources.length, 0)} 筆來源`);
  }
}
