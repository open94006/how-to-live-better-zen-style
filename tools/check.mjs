// 檢查改寫內容：Big5 以外的漢字（多半是簡體字，會讓檢查失敗）、大陸用語（列出來人工判斷）
// 用法：node tools/check.mjs
import fs from 'node:fs';

// 把所有 Big5 雙位元組碼解碼一次，得到繁體字集
const BIG5 = new Set();
const dec = new TextDecoder('big5');
for (let hi = 0x81; hi <= 0xfe; hi++) {
  for (const lo of [...Array(0x3f).keys()].map(i => 0x40 + i).concat([...Array(0x5e).keys()].map(i => 0xa1 + i))) {
    const ch = dec.decode(new Uint8Array([hi, lo]));
    if (ch.length === 1 && ch !== '�') BIG5.add(ch);
  }
}

// 台灣不這樣說的詞；括號內是建議
const MAINLAND = {
  視頻: '影片', 信息: '資訊', 數據: '資料／數字', 質量: '品質', 網絡: '網路', 軟件: '軟體', 硬件: '硬體', 屏幕: '螢幕', 鼠標: '滑鼠',
  打車: '叫車', 外賣: '外送', 小區: '社區', 土豆: '馬鈴薯', 西紅柿: '番茄', 酸奶: '優格', 醫保: '健保', 博主: '部落客', 點讚: '按讚',
  充電寶: '行動電源', 摩托: '機車', 頭盔: '安全帽', 樓道: '樓梯間', 空調: '冷氣', 煤氣: '瓦斯', 燃氣: '瓦斯', 灶具: '爐具', 窨井: '人孔',
  疾控: '疾管署／衛生局', 體檢: '健康檢查', B超: '超音波', 螺桿菌: '幽門桿菌', 乳腺: '乳房', 鉬靶: '乳房 X 光攝影', 艾滋: '愛滋',
  安全套: '保險套', 卒中: '中風', 血紅蛋白: '血色素', 甘油三酯: '三酸甘油酯', 公交: '公車', 地鐵: '捷運', 肺炎球菌: '肺炎鏈球菌',
  乙肝: 'B 肝', 丙肝: 'C 肝', 靠譜: '可靠', 搞定: '處理好', 咱們: '我們', 立馬: '馬上', 激活: '啟用', 默認: '預設', 渠道: '管道',
  賦能: '', 閉環: '', 對標: '', 文件夾: '資料夾', 服務器: '伺服器', 內存: '記憶體', 硬盤: '硬碟', 打印: '列印', 營銷: '行銷',
  公積金: '', 社保: '勞健保', 個稅: '所得稅', 租房: '租屋', 二手房: '中古屋', 首付: '頭期款', 炒股: '玩股票',
  出租車: '計程車', 性價比: 'CP 值', 鏈接: '連結', 人民幣: '', 塊錢: '元', 視屏: '影片', 支付寶: '', 微信: '', 手機號: '手機號碼',
  售後: '售後服務', 抓手: '', 宮頸: '子宮頸', 腸鏡: '大腸鏡', 隱血: '潛血', 放松: '放鬆', 輕松: '輕鬆', 着: '著', 么: '麼',
};
// 允許出現的上下文：明講是中國的名稱、原書書名、子宮頸／大腸鏡等本身就含這些字的台灣用語
const ALLOW = [/《高性價比人生指南》/g, /《城鎮燃氣管理條例》/g, /體檢測/g, /中國稱「[^」]*」/g, /中國疾控中心/g, /醫保換成健保/g, /子宮頸/g, /大腸鏡/g, /原書[^，。]*「[^」]*」/g];

let bad = 0;
const files = fs.readdirSync('content').filter(f => f.endsWith('.mjs')).sort();
for (const f of files) {
  fs.readFileSync(`content/${f}`, 'utf8').split('\n').forEach((line, i) => {
    const odd = [...new Set([...line].filter(c => /\p{Script=Han}/u.test(c) && !BIG5.has(c)))];
    if (odd.length) { console.log(`非 Big5 字  content/${f}:${i + 1}  ${odd.join(' ')}`); bad++; }
    let scan = line;
    for (const re of ALLOW) scan = scan.replace(re, '');
    const hits = Object.keys(MAINLAND).filter(w => scan.includes(w));
    if (hits.length) console.log(`用語  content/${f}:${i + 1}  ${hits.map(w => MAINLAND[w] ? `${w}→${MAINLAND[w]}` : w).join('、')}`);
  });
}
console.log(bad ? `\n${bad} 行含 Big5 以外的漢字` : '\n沒有簡體字');
process.exit(bad ? 1 : 0);
