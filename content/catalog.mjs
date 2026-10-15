// 全書 34 篇的目錄：主題分類、每篇一句引導問題，以及首頁「問路」的煩惱與推薦篇章。
// 已改寫的篇章（content/NN.mjs）會自動換成正式標題並可點閱；其餘顯示為整理中。
export const categories = [
  { id: 'body', name: '身體健康' },
  { id: 'mind', name: '心力與時間' },
  { id: 'money', name: '金錢' },
  { id: 'family', name: '家人與關係' },
  { id: 'work', name: '工作與學習' },
  { id: 'safety', name: '安全與法律' },
];

export const chapters = [
  { no: 1, cat: 'body', title: '別太早離開', question: '哪些花小錢的事，能讓我們活得久一點？' },
  { no: 2, cat: 'body', title: '別讓身體慢慢垮掉', question: '每天的菸酒、飲食和睡眠，正在替身體記什麼帳？' },
  { no: 3, cat: 'mind', title: '把力氣留給重要的事', question: '為什麼總是很累，卻好像什麼都沒做？' },
  { no: 4, cat: 'mind', title: '把時間還給自己', question: '時間都去哪了？怎麼一點一點拿回來？' },
  { no: 5, cat: 'money', title: '別讓錢白白流走', question: '錢是怎麼一點一點漏掉的？' },
  { no: 6, cat: 'body', title: '反面清單', question: '哪些錢和力氣，其實花了也沒用？' },
  { no: 7, cat: 'money', title: '沒錢的時候怎麼活', question: '手頭很緊的時候，可以先抓住什麼？' },
  { no: 8, cat: 'safety', title: '別把自己賠進去', question: '借錢、擔保、被騙，怎麼不讓自己受傷？' },
  { no: 9, cat: 'safety', title: '一般人容易踩的法律紅線', question: '哪些事一不小心就違法了？' },
  { no: 10, cat: 'family', title: '談戀愛和結婚划不划算', question: '走進一段關係前，該想清楚什麼？' },
  { no: 11, cat: 'work', title: '工程師和技術人容易踩的紅線', question: '寫程式、做技術，也可能觸法嗎？' },
  { no: 12, cat: 'money', title: '創業與做生意', question: '想自己當老闆，先算哪幾筆帳？' },
  { no: 13, cat: 'safety', title: '緊急情況', question: '意外發生的那幾分鐘，該先做什麼？' },
  { no: 14, cat: 'safety', title: '帳號與資訊安全', question: '怎麼保護自己的帳號和個人資料？' },
  { no: 15, cat: 'money', title: '租屋與買房', question: '租屋還是買房，怎麼選比較不吃虧？' },
  { no: 16, cat: 'body', title: '得了慢性病之後怎麼活', question: '確診之後，日子要怎麼好好過下去？' },
  { no: 17, cat: 'family', title: '家裡有長輩', question: '怎麼照顧爸媽，也照顧好自己？' },
  { no: 18, cat: 'family', title: '養孩子划不划算', question: '養一個孩子，要付出些什麼？' },
  { no: 19, cat: 'work', title: '在職、離職與職災', question: '上班族一定要知道的權益有哪些？' },
  { no: 20, cat: 'family', title: '剛出生的孩子怎麼帶', question: '新手爸媽最該先知道的事。' },
  { no: 21, cat: 'safety', title: '出國旅行與海外安全', question: '出門在外，怎麼平安回家？' },
  { no: 22, cat: 'mind', title: '怎麼放鬆', question: '真正能讓人恢復的休息是什麼？' },
  { no: 23, cat: 'work', title: '學什麼技能划算', question: '時間有限，該先學什麼？' },
  { no: 24, cat: 'body', title: '看病', question: '怎麼看病才不白跑、不花冤枉錢？' },
  { no: 25, cat: 'family', title: '親人離開以後要辦什麼', question: '最難過的時候，還有哪些事要處理？' },
  { no: 26, cat: 'work', title: '做一個網站或平台', question: '上線之前，有哪些法律和責任？' },
  { no: 27, cat: 'family', title: '懷孕和生產', question: '從懷孕到生產，哪些事值得提早準備？' },
  { no: 28, cat: 'body', title: '別為了外表把身體搞壞', question: '變美之前，先確認不會受傷。' },
  { no: 29, cat: 'mind', title: '遭遇重大打擊之後', question: '天塌下來的時候，先撐住哪幾件事？' },
  { no: 30, cat: 'family', title: '上學以後的孩子', question: '孩子上學之後，父母可以做些什麼？' },
  { no: 31, cat: 'work', title: '十八歲之後有哪幾條路', question: '升學、工作、出國，路可以怎麼走？' },
  { no: 32, cat: 'work', title: '出國留學', question: '出國念書，值得嗎？' },
  { no: 33, cat: 'body', title: '身障之後怎麼活', question: '身體改變之後，生活可以怎麼重新開始？' },
  { no: 34, cat: 'body', title: '家裡的常備藥別吃出事', question: '家裡那些藥，你真的吃對了嗎？' },
];

// 首頁「問路」：按鈕上的短標籤（一行放得下）→ 完整的煩惱 → 一句回應 → 推薦篇章（依推薦順序）
export const guides = [
  { glyph: '疲', label: '總是好累', ask: '最近總是好累，提不起勁', reply: '累，不一定是你不夠努力，可能只是力氣花錯了地方。', chapters: [3, 22, 2] },
  { glyph: '身', label: '想顧好身體', ask: '想把身體顧好，卻不知從何開始', reply: '先從最便宜、證據最紮實的幾件小事做起就好。', chapters: [1, 2, 24, 6] },
  { glyph: '錢', label: '錢總是不見', ask: '錢總是莫名其妙就不見了', reply: '錢很少是一次花掉的，通常是一點一點漏掉的。', chapters: [5, 7, 6] },
  { glyph: '時', label: '時間不夠用', ask: '時間永遠不夠用', reply: '時間不會變多，但可以少被偷走一點。', chapters: [4, 3, 23] },
  { glyph: '家', label: '要照顧家人', ask: '家裡有長輩或孩子要照顧', reply: '照顧別人之前，也記得替自己留一點力氣。', chapters: [17, 18, 20, 30] },
  { glyph: '險', label: '怕被騙', ask: '擔心被騙，怕惹上麻煩', reply: '大部分的麻煩，事前多問一句就能避開。', chapters: [8, 9, 14, 13] },
  { glyph: '路', label: '站在岔路口', ask: '站在人生的岔路口', reply: '沒有完美的選擇，但可以先把帳算清楚。', chapters: [31, 23, 12, 32] },
  { glyph: '傷', label: '剛經歷打擊', ask: '剛經歷了很大的打擊', reply: '先撐過今天就好。這裡有幾件事，可以陪你慢慢走。', chapters: [29, 16, 25, 33] },
];
