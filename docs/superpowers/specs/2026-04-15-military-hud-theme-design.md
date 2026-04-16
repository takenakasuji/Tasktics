# Military HUD Theme Design

## Overview

Tasktics の UI モチーフを航空管制 (ATC) から Military HUD (戦術ディスプレイ) に変更する。変更範囲は CSS（配色・フォント・装飾）のみ。機能・レイアウト・用語はすべて現行のまま維持する。

## Design Decisions

| 項目 | 決定 | 理由 |
|------|------|------|
| モチーフ | Military HUD (Subtle Tactical) | 抑えめでプロフェッショナルな戦術ディスプレイ。発光感は控えめ |
| 配色基調 | 黒に近いダークネイビー | ユーザー指定 |
| アクセント色 | シアン/アイスブルー (`#5ec4d4`) | ハイテク戦術ディスプレイ感。ネイビーと同系で統一感がある |
| スタイル方向 | Subtle (A案) | Bold/グロー演出ではなく、落ち着いたプロフェッショナル路線 |
| フォント | Chakra Petch (display) + Source Code Pro (mono) | 角張ったテック系で Military HUD に合致 |
| 用語 | 現行維持 | TASK, MS, ALL PRI, ALL CAT, FS0001, URG/HI/NRM/LO, ACTIVE/NEXT ACTION/HOLDING/CLEARED すべてそのまま |
| シンボル | `◆` → `◢` | 戦術的な角形記号に変更 |

## Color Palette

### Base Colors

| Variable | Current (ATC) | New (Tactical) |
|----------|--------------|----------------|
| `--bg-primary` | `#0a0e14` | `#080c18` |
| `--bg-secondary` | `#0d1117` | `#0d1424` |
| `--bg-card` | `#111922` | `#111b2e` |
| `--bg-card-hover` | `#162030` | `#162040` |
| `--border` | `#1e3a4a` | `#1a2a45` |
| `--border-bright` | `#2a5a6a` | `#2a3a5f` |
| `--text-primary` | `#c8d6e5` | `#c8d6e8` |
| `--text-secondary` | `#6b8899` | `#4a6a88` |
| `--text-dim` | `#3a5566` | `#2a4a68` |
| `--accent` | `#00ff88` | `#5ec4d4` |
| `--accent-dim` | `#00aa55` | `#3a8a9a` |
| `--accent-glow` | `rgba(0,255,136,0.15)` | `rgba(94,196,212,0.12)` |

### Priority Colors

| Variable | Current | New |
|----------|---------|-----|
| `--urg` | `#ff4444` | `#ff5544` |
| `--urg-bg` | `rgba(255,68,68,0.12)` | `rgba(255,85,68,0.08)` |
| `--hi` | `#ff8800` | `#ff9944` |
| `--hi-bg` | `rgba(255,136,0,0.12)` | `rgba(255,153,68,0.08)` |
| `--nrm` | `#00cc66` | `#5ec4d4` |
| `--nrm-bg` | `rgba(0,204,102,0.12)` | `rgba(94,196,212,0.06)` |
| `--lo` | `#4488cc` | `#3a6699` |
| `--lo-bg` | `rgba(68,136,204,0.12)` | `rgba(58,102,153,0.08)` |

### Status Background Colors

| Variable | Current | New |
|----------|---------|-----|
| `--active-bg` | `rgba(0,255,136,0.05)` | `rgba(94,196,212,0.04)` |
| `--holding-bg` | `rgba(255,136,0,0.05)` | `rgba(255,153,68,0.04)` |
| `--cleared-bg` | `rgba(100,120,140,0.05)` | `rgba(100,120,140,0.04)` |
| `--next-bg` | `rgba(0,170,255,0.05)` | `rgba(58,102,153,0.04)` |

## Fonts

| Use | Current | New |
|-----|---------|-----|
| Display (title, section labels) | Orbitron | Chakra Petch (weight: 400, 600, 700) |
| Body (mono) | Share Tech Mono | Source Code Pro (weight: 400, 500, 600) |

Google Fonts import:
```
https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700&family=Source+Code+Pro:wght@400;500;600&display=swap
```

CSS variables:
```css
--font-mono: 'Source Code Pro', 'Courier New', monospace;
--font-display: 'Chakra Petch', 'Source Code Pro', monospace;
```

## Symbol Change

`◆` (diamond) → `◢` (right angle triangle) throughout the UI:
- Header: `◢ TASKTICS`
- Section labels: `◢ WEEKLY TIMELINE`

## Scope

### In Scope

- `public/style.css`: CSS custom properties (colors, fonts), hardcoded accent color references
- `public/index.html`: Google Fonts link URL, `◆` → `◢` symbol in header and section labels
- `public/js/render.js`: `◆` → `◢` symbol in milestone rendering (line 241)
- Mockup reference: `.superpowers/brainstorm/57839-1776302812/content/tactical-revised.html`

### Out of Scope

- All JavaScript logic (app.js and js/*.js)
- Task model, data format, API endpoints
- View switching behavior, drag-and-drop
- All terminology (TASK, MS, ALL PRI, ALL CAT, priorities, statuses)
- Layout structure of any view (HYBRID, KANBAN, TIMELINE)
- PURGE button (kept as-is)
- TIMELINE navigation (PREV / TODAY / NEXT only, no date range label)

## Views

- **HYBRID**: TIMELINE + KANBAN combination (no change to composition)
- **KANBAN**: 4-column standalone view (ACTIVE / NEXT ACTION / HOLDING / CLEARED)
- **TIMELINE**: Weekly calendar with PREV / TODAY / NEXT navigation
