# Timeline Day-Click to Create Milestone Design

## Overview

TIMELINE ビューで各日セルのヘッダー部分（曜日・日付が表示されている箇所）をクリックすると、新規マイルストーン作成パネルが開き、`DUE DATE` フィールドにその日の日付が事前入力される。

## User Decisions

| 項目 | 決定 |
|------|------|
| クリック対象 | 日付ヘッダー部分のみ（`.week-day-header`） |
| 過去日付 | 過去日もクリック可能 |
| 既存マイルストーンがある日 | それでも新規作成パネルを開く（複数マイルストーン可） |
| タスク・マイルストーン要素のクリック | 既存の編集動作を維持（本機能と独立） |

## Behavior

- 日ヘッダーをクリック → 新規マイルストーンパネルが開く
- `DUE DATE` フィールドにクリックした日の日付（`YYYY-MM-DD`）が設定される
- `TITLE` と `NOTES` は空、`TITLE` にフォーカスが当たる
- 保存・キャンセル挙動は既存の `+ MS` ボタン経由の場合と同じ

## Scope

### In Scope

- `public/js/modal.js` — `openMilestoneModal(mode, ms)` を `openMilestoneModal(mode, ms, presetDate)` に拡張。`presetDate` は create モード時のみ参照。既存の呼び出し互換を維持。
- `public/js/render.js` — `renderTimeline` で日ヘッダー要素にクリックハンドラを追加（`window.Modal.openMilestoneModal('create', null, dateStr)` を呼び出す）
- `public/style.css` — `.week-day-header` に `cursor: pointer` と hover 時の背景変化を追加

### Out of Scope

- タスク追加機能（マイルストーンのみ）
- 右クリックメニュー、ドラッグ操作
- マイルストーンの保存ロジック変更（既存のフォーム送信を再利用）
- 視覚的な `+` アイコン表示

## Implementation Details

### `openMilestoneModal` シグネチャ拡張

```js
function openMilestoneModal(mode, ms, presetDate) {
  // ...
  document.getElementById('milestone-date').value =
    ms ? ms.dueDate : (presetDate || State.todayISO());
  // ...
}
```

既存の `openMilestoneModal('edit', ms)` と `openMilestoneModal('create', null)` は挙動変わらず。

### `renderTimeline` のクリックハンドラ

```js
header.addEventListener('click', () => {
  window.Modal.openMilestoneModal('create', null, dateStr);
});
```

`dateStr` は既に各日のループ内で `formatDateISO(dayDate)` として計算済み。

### スタイル

```css
.week-day-header {
  cursor: pointer;
  transition: background 0.15s;
}
.week-day-header:hover {
  background: var(--accent-glow);
}
```

## Testing

手動テスト項目:
- 今日の日付ヘッダーをクリック → パネルが開き、日付が今日
- 過去日（昨日など）のヘッダーをクリック → パネルが開き、日付が過去日
- 未来日のヘッダーをクリック → パネルが開き、日付が未来日
- 既存のタスクが並んでいる日のヘッダーをクリック → パネルが開く（タスクは影響なし）
- 既存のマイルストーンが並んでいる日のヘッダーをクリック → 新規作成パネルが開く
- 既存のタスクをクリック → タスク編集パネルが開く（従来挙動が壊れない）
- 既存のマイルストーンをクリック → マイルストーン編集パネルが開く（従来挙動が壊れない）
- ヘッダーマウスオーバー時、カーソルがpointerに変わる
