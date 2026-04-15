# Tasktics

ATC（航空管制）テーマのタスク管理デスクトップアプリ。Electron + SQLite + Vanilla JS。

## セットアップ

```bash
npm install   # postinstall で better-sqlite3 が自動リビルドされる
npm start
```

## パッケージビルド

```bash
npm run dist
```

`dist/` に DMG が生成されます。

| ファイル | 対象 |
|---|---|
| `Tasktics-x.x.x-arm64.dmg` | Apple Silicon (M1/M2/M3) |
| `Tasktics-x.x.x.dmg` | Intel Mac |

> コード署名なしの場合、初回起動時は右クリック → 開く で実行してください。

## アーキテクチャ

### Electron Main Process (`main.js`)

- アプリウィンドウの作成・管理
- SQLite DB の初期化・CRUD（better-sqlite3）
- IPC ハンドラで Renderer からのデータ操作を受け付ける
  - `tasks:load` — 全タスクと idCounter を返す
  - `tasks:save` — tasks 配列と idCounter を一括保存
- 初回起動時に `data/tasks.json` が存在すれば自動マイグレーション

### IPC ブリッジ (`preload.js`)

- `contextBridge` で `window.taskticsBridge` を Renderer に公開
  - `loadData()` — `tasks:load` IPC を呼び出す
  - `saveData(payload)` — `tasks:save` IPC を呼び出す

### フロントエンド (`public/`)

| ファイル | 役割 |
|---|---|
| `index.html` | アプリシェル。フォント・スクリプトの読み込み |
| `app.js` | 全アプリケーションロジック（単一グローバルスコープ） |
| `style.css` | ATCテーマのダーク UI（ネオングリーンアクセント） |

### データフロー

- 全ステートは `app.js` のメモリ上に保持
- 変更は 300ms デバウンスして `taskticsBridge.saveData()` で自動保存
- タスク ID は `FS0001`, `FS0002` ... の形式

### データ保存先

- macOS: `~/Library/Application Support/tasktics/tasktics.db`

## タスクモデル

```js
{
  id,               // "FS0001" 形式
  title,
  category,
  priority,         // "URG" | "HI" | "NRM" | "LO"
  status,           // "active" | "next" | "holding" | "cleared"
  time,             // "HH:MM"
  notes,
  createdAt,        // Unix timestamp (ms)
  scheduledDate,    // ISO date string ("YYYY-MM-DD") | null
  recurrence,       // null | { type: "weekly"|"monthly", dayOfWeek?: 0-6, dayOfMonth?: 1-31|-1 }
  recurrenceGroupId // 繰り返しグループの識別子 | null
}
```

## ビュー

### HYBRID（デフォルト）
週間タイムライン + カンバンボードを同時表示。

### KANBAN
4列のステータス管理：
- **ACTIVE** — 進行中
- **NEXT ACTION** — 次のアクション
- **HOLDING** — 待機中
- **CLEARED** — 完了（最新5件を表示、超過分は「SHOW MORE」で展開）

タスクカードはドラッグ&ドロップでステータス変更可能。

### TIMELINE
週間カレンダー。CLEAREDタスクは非表示。◁ PREV / ● TODAY / NEXT ▷ で週移動。

## 主な操作

| 操作 | 方法 |
|---|---|
| タスク追加 | ヘッダーの `+ TASK` ボタン |
| タスク編集 | カードクリックでスライドパネルを開く |
| 保存 | `SAVE` ボタン または `Cmd+Enter` |
| 完了切り替え | カードの `✓` ボタン（CLEARED ↔ ACTIVE） |
| ステータス変更 | ドラッグ&ドロップ |
| 完了タスクを一括削除 | CLEAREDカラムヘッダーの `PURGE` ボタン |
| パネルを閉じる | `Esc` キー |

## フィルター

ヘッダーのドロップダウンで優先度・カテゴリを絞り込み可能。

## 繰り返しタスク (Recurrence)

- 毎週（曜日指定）または毎月（日付指定）の繰り返しを設定可能
- CLEAREDにすると次回インスタンスが自動生成される
- 同グループのタスクは `recurrenceGroupId` で紐付け

## ファイル構成

```
Tasktics/
├── main.js            # Electron Main Process（SQLite + IPC）
├── preload.js         # contextBridge IPC ブリッジ
├── package.json
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── dist/              # ビルド成果物（git-ignored）
└── data/
    └── tasks.json     # マイグレーション元（初回起動後は参照されない）
```
