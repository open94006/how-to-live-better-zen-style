# 部署到 GitHub Pages

網站是 `site/` 裡的靜態檔，`.github/workflows/pages.yml` 會在每次 push 到 `main` 時跑 `node build.mjs` 重建並部署。

## 第一次設定

1. 把專案推上去：

   ```bash
   git add -A
   git commit -m "Add site and Pages workflow"
   git push origin main
   ```

2. 到 GitHub repo → **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
3. 到 **Actions** 分頁，等「Deploy Pages」跑完（第一次若在步驟 2 之前就推了而失敗，按 **Re-run jobs** 或 **Run workflow**）。
4. 網址：`https://open94006.github.io/how-to-live-better-zen-style/`

## 之後更新

改 `content/`、`data/` 或 `site/assets/` → commit → push，約一分鐘後自動上線。

本機預覽：

```bash
node build.mjs && python3 -m http.server 4321 --directory site
```

## 注意

- 頁面內連結全是相對路徑，放在 `/how-to-live-better-zen-style/` 子路徑下沒問題；不要改成 `/` 開頭的絕對路徑。
- repo 若是 private，免費帳號無法開 Pages，需改成 public。
- 自訂網域：Settings → Pages → Custom domain 填網域，DNS 加 CNAME 指向 `open94006.github.io`。
