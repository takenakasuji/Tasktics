# Daily Recurrence Skip-Weekends Design

## Overview

日次リカーリングタスクに「土日除外」オプションを追加する。有効時、次回インスタンスの期限日が土曜・日曜に当たる場合は翌月曜日まで進める。金曜に完了したタスクは、土曜ではなく月曜で再生成される。

## User Decisions

| 項目 | 決定 |
|------|------|
| 対象リカーリング種別 | 日次 (daily) のみ |
| スキップ方向 | 前進（土日 → 次の月曜） |
| 適用範囲 | 次回生成時 + 初回作成時の両方 |
| スキップ対象 | 土曜・日曜の固定（祝日・任意曜日は対象外） |

## Data Model

`recurrence` オブジェクトに `skipWeekends` フィールドを追加する:

```js
{
  type: 'daily',
  dayOfWeek: null,
  dayOfMonth: null,
  skipWeekends: true  // 新規
}
```

- `type === 'daily'` のときのみ意味を持つ
- `type` が `weekly` / `monthly` のときは常に `false`
- 既存タスク（`skipWeekends` が `undefined`）は falsy として扱い、従来挙動を維持

## Behavior

`skipWeekends: true` の daily リカーリングで、計算された日付が土曜または日曜の場合、翌月曜日まで進める。

### 1. 次回インスタンス生成時

`spawnNextRecurrence` から呼ばれる `getNextOccurrenceDate`:

- daily + skipWeekends: `+1日`した後、その日が土日なら月曜まで進める
- 例: 金曜 clear → `+1日` = 土曜 → 月曜
- 例: 土曜 clear → `+1日` = 日曜 → 月曜
- 例: 日曜 clear → `+1日` = 月曜 → そのまま

### 2. 初回作成時

`calcFirstScheduledDate` の daily 分岐:

- daily + skipWeekends: 今日を初回とするが、今日が土日なら月曜まで進める
- 例: 土曜に新規作成 → 初回は月曜

## UI

タスクモーダル内、既存の `RECURRENCE` ドロップダウンの下に新しい行を追加:

```
RECURRENCE: [毎日 ▼]
☐ SKIP WEEKENDS (土日除外)
```

- `type === 'daily'` のときのみ表示
- その他の type（none/weekly/monthly）選択時は非表示
- 非表示に遷移した際は値を `false` にリセット（`readRecurrenceForm` 側で制御）

## Scope

### In Scope

- `public/js/recurrence.js`
  - `calcNextDailyDate(fromDateStr, skipWeekends)` — 第2引数追加、土日スキップロジック
  - `getNextOccurrenceDate(recurrence, fromDateStr)` — `recurrence.skipWeekends` を `calcNextDailyDate` に渡す
  - `calcFirstScheduledDate(recurrence, todayStr)` — daily + skipWeekends のとき土日ならスキップ
- `public/js/modal.js`
  - `setRecurrenceFormVisibility` — daily 選択時にチェックボックス行を表示
  - `readRecurrenceForm` — `skipWeekends` を読み取り
  - `populateRecurrenceForm` — `skipWeekends` を書き込み
  - `resetRecurrenceForm` — チェック解除
- `public/index.html` — `recurrence-weekly-options` / `recurrence-monthly-options` と同パターンで `recurrence-daily-options` を追加
- `tests/recurrence.test.js` — 土日スキップのテストケース追加

### Out of Scope

- 週次・月次リカーリングへのスキップ適用
- 祝日スキップ（日本の祝日APIや手動祝日定義は対象外）
- 任意曜日の除外設定
- 後退スキップ（土日 → 前の金曜）

## Testing

`tests/recurrence.test.js` に追加するケース:

- daily + skipWeekends=true: 金曜から → 月曜
- daily + skipWeekends=true: 土曜から → 月曜
- daily + skipWeekends=true: 日曜から → 月曜
- daily + skipWeekends=true: 月曜〜木曜から → 翌日
- daily + skipWeekends=false: 従来通り（金曜 → 土曜）
- daily + skipWeekends=undefined: 従来通り（後方互換）
- `calcFirstScheduledDate` daily + skipWeekends=true: 土曜を今日とした場合 → 月曜
- `calcFirstScheduledDate` daily + skipWeekends=true: 平日を今日とした場合 → 今日

手動確認:
- daily タスク作成時、RECURRENCE を「毎日」に切り替えるとチェックボックスが出る
- チェックON、TIMELINE で金曜のタスクを clear → 月曜に新タスクが出現
- 「毎日」以外（毎週・毎月・なし）に切り替えるとチェックボックスが消える
- 既存の daily タスク（skipWeekends なし）の挙動が変わらない
