# HN日報

Hacker News の注目記事を日本語で要約した静的ダイジェストです。

## 使い方

```bash
cd hn-digest
python3 -m http.server 8765
```

ブラウザで http://localhost:8765 を開きます。

「スコアを更新」を押すと、Hacker News API から最新のポイント／コメント数を取得します。

## データの更新

1. `python3 scripts/fetch_top.py > /tmp/hn-stub.json` でトップ記事の骨格を取得
2. 各記事の `titleJa` / `summaryJa` / `category` を編集して `data/digest.json` に反映

## 構成

- `index.html` — ページ本体
- `css/style.css` — スタイル
- `js/app.js` — 描画とスコア更新
- `data/digest.json` — 日本語まとめデータ
