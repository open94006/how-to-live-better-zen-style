# 高 CP 值人生指南（台灣版）

改寫自 eternity4719《[高性價比人生指南](https://github.com/eternity4719/HowToLiveBetter)》（正文 CC BY 4.0）的前五篇，做成靜態網站。每條建議整理成「摘要、證據真實度、描述、來源、備註」，並換成台灣的用語、法規與求助管道。

## 指令

```
npm install        # 只用到 opencc-js：抽取來源時把簡體轉成台灣繁體
npm run extract    # book-src/*.md → data/source.json（成本標籤、證據等級、來源）
npm run build      # content/*.mjs + data/*.json → site/*.html
npm run check      # 檢查 content/ 是否有 Big5 以外的字（多半是簡體）與大陸用語
python3 tools/subset_font.py <ChenYuluoyan-2.0-Thin.ttf>   # 首頁意境語句改字後重做字型子集（需 fonttools、brotli）
python3 -I tools/fetch_images.py   # 依 data/image-picks.json 下載 CC0／公眾領域圖片（需 Pillow）
python3 -m http.server 4321 --directory site   # 本機預覽
```

## 新增一篇

1. 把原書 `book/NN-*.md` 複製到 `book-src/`，執行 `npm run extract`。
2. 寫 `content/NN.mjs`（欄位說明見 `content/01.mjs` 開頭），每一條都要放進某個分組，build 會檢查。
   首頁目錄與「問路」讀的是 `content/catalog.mjs`：34 篇的主題分類、引導問題與推薦篇章都在這裡；有了 `content/NN.mjs` 的篇章會自動變成可點閱。
3. 在 `data/image-picks.json` 加上圖片（`id` 填 Openverse 的圖片 id），執行 `fetch_images.py`。
4. `npm run check && npm run build`。

證據等級與原書來源由原文自動帶入，不手動改；台灣在地的補充資料寫在每條的 `tw` 欄位，網站上會另外標示。
