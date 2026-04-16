# NOTES Markdown Rendering & Panel Expansion Design

## Overview

タスクとマイルストーンの NOTES を Markdown 対応にする。モーダル（右サイドパネル）を拡張し、NOTES の表示・編集領域を広く取る。

- 閲覧時: レンダリング済みHTMLとして表示
- 編集時: 生のMarkdownを textarea で編集（クリックで切替）
- パネルは現状の `400px` から `max(640px, 50vw)` に拡張

## User Decisions

| 項目 | 決定 |
|------|------|
| 表示モード | C: 閲覧時レンダリング / 編集時生Markdown |
| 編集領域サイズ | D: パネル全体を大きくし、NOTES領域を広く取る |
| パネル幅 | 画面中央まで（`max(640px, 50vw)`） |
| 対象 | タスク + マイルストーン両方 |

## Behavior

### 編集モード遷移

- モーダルを開いた直後 → NOTES は `<div class="notes-rendered">` にレンダリング結果を表示
- NOTES 領域をクリック → textarea（生Markdown）に切り替わり、自動フォーカス
- SAVE ボタン押下 → DBに生Markdownを保存、モーダルを閉じる
- Esc / CANCEL → 変更を破棄してモーダルを閉じる
- モーダルを再度開く → 再びレンダリング状態で開く（編集中状態は保持しない）

### 新規作成時

- NOTES は空 → 編集モード（textarea）で開始（レンダリング状態で空白表示するより編集しやすい）

## Data Model

**変更なし**。既存の `notes` フィールドにMarkdownテキストをそのまま保存する。プレーンテキストも有効なMarkdownとしてレンダリングされるため後方互換。

## Panel Layout

`.modal-content`:

- 現在: `width: 400px; max-width: 90vw;`
- 変更後: `width: max(640px, 50vw); max-width: 90vw;`

内部レイアウトは既存のflex縦並びを維持。

## NOTES Element Layout

### Task modal

- 現在: `<textarea id="task-notes" rows="2" placeholder="メモ">`
- 変更後: 同じ form-row 内に以下の2要素を配置（片方のみ表示）:
  - `<div id="task-notes-rendered" class="notes-rendered">` — 閲覧用
  - `<textarea id="task-notes" rows="8" class="notes-textarea">` — 編集用

### Milestone modal

- 現在: `<textarea id="milestone-notes" rows="3" placeholder="メモ">`
- 変更後: 同パターン（`milestone-notes-rendered` / `milestone-notes` textarea rows="8"）

両方とも `min-height: 180px` を確保し、空でも領域が潰れないようにする。

## Markdown Support Scope

GitHub Flavored Markdown (GFM) を `marked` ライブラリで変換:

- 見出し (`#`, `##`, `###`)
- 太字 (`**`), 斜体 (`*`)
- 箇条書き (`-`, `*`)
- 番号付きリスト (`1.`)
- チェックボックス (`- [ ]`, `- [x]`)
- リンク (`[text](url)`)
- インラインコード / コードブロック
- 引用 (`>`)
- 区切り線 (`---`)
- テーブル
- 取り消し線 (`~~`)

## Libraries

- **marked** (latest stable, ~40KB UMD) — Markdown → HTML 変換
- **DOMPurify** (latest stable, ~20KB UMD) — XSS対策のHTMLサニタイズ

npm経由でインストール、`node_modules/*/dist/*.min.js` を `public/js/lib/` にコピーして `<script>` タグで読み込む。既存のvanilla JS／バンドラー無し方針を維持。

## Styling (`notes-rendered`)

Military HUDテーマに合わせる:

- `h1`, `h2`, `h3` — アクセントカラー (`--accent`)、`font-display`
- `code` インライン — `bg-card` 背景、`font-mono`、小パディング
- `pre > code` — `bg-primary` 背景、`border`、`font-mono`、`padding: 10px`
- `a` — アクセントカラー、ホバーで下線
- `blockquote` — 左ボーダー（アクセント）、インデント
- `ul`, `ol` — インデント、通常カラー
- `table` — `border: 1px solid var(--border)`、ヘッダーは `bg-card` 背景
- `input[type="checkbox"]` (チェックリスト) — `accent-color: var(--accent)`、`disabled`
- クリック時のカーソル: `cursor: text` (編集可能であることを示唆)
- ホバー時: 枠線を `--border-bright` に変化させる

## Scope

### In Scope

- `public/index.html` — NOTES form-row 内に rendered div と textarea を両方配置
- `public/style.css` — `.modal-content` 幅拡張、`.notes-rendered` スタイル追加、`.notes-textarea` min-height追加
- `public/js/modal.js`:
  - `openCreateModal` — 編集モードで開始
  - `openEditModal` — レンダリングモードで開始（notes があれば）
  - `openMilestoneModal` — 同上
  - 新関数: `enterNotesEditMode(type)`, `renderNotes(type, markdown)` など
  - クリックハンドラをレンダリングdivに設定
- `public/js/lib/marked.min.js`, `public/js/lib/purify.min.js` — ライブラリ追加
- `package.json` — `marked`, `dompurify` を `dependencies` に追加
- 初回起動時のコピーは postinstall か手動（後述の In Scope ではコピー済みファイルをコミット）

### Out of Scope

- KANBAN / TIMELINE カード内でのMarkdownプレビュー
- ライブプレビュー（2ペイン、即時反映）
- 画像ファイルのアップロード（MarkdownのURL参照は有効）
- 言語別シンタックスハイライト
- 既存ノートのMarkdownへの自動変換（そのまま解釈されるので不要）
- キーボードショートカット（Cmd+E で編集モード、等）

## Testing

### 単体テスト

既存の vitest スイートには Markdown ロジックは含めない（`marked` / `DOMPurify` 自体は十分テスト済み）。

### 手動確認

- 空のタスク新規作成 → NOTES は編集モードで開始
- NOTES に `# Title\n\n- [x] done\n- [ ] todo` を入力 → SAVE → 再オープンで見出しとチェックボックスがレンダリング
- レンダリング領域をクリック → textareaに切り替わり、Markdown生テキストが表示
- `<script>alert(1)</script>` を入力 → SAVE → 再オープンで実行されない（DOMPurify で除去）
- マイルストーンも同じ挙動
- パネル幅が画面右半分（640px 以上）になる
- モーダル内でスクロールが機能する（NOTES が長い場合）
