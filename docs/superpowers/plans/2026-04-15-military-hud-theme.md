# Military HUD Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ATC (air traffic control) visual theme with a Military HUD theme — dark navy base, ice blue accent, Chakra Petch + Source Code Pro fonts, `◢` symbol.

**Architecture:** CSS-only theme swap. Replace CSS custom properties in `:root`, update hardcoded color values and font references in `style.css`, swap the Google Fonts import in `index.html`, and replace `◆` symbols with `◢` in `index.html` and `render.js`. No logic changes.

**Tech Stack:** CSS, HTML, vanilla JS (symbol replacement only)

**Spec:** `docs/superpowers/specs/2026-04-15-military-hud-theme-design.md`

**Mockup reference:** `.superpowers/brainstorm/57839-1776302812/content/tactical-revised.html`

---

### Task 1: Update CSS custom properties in `:root`

**Files:**
- Modify: `public/style.css:5-33`

- [ ] **Step 1: Replace all CSS custom properties in `:root`**

Replace the entire `:root` block in `public/style.css` (lines 5-33):

```css
:root {
  --bg-primary: #080c18;
  --bg-secondary: #0d1424;
  --bg-card: #111b2e;
  --bg-card-hover: #162040;
  --border: #1a2a45;
  --border-bright: #2a3a5f;
  --text-primary: #c8d6e8;
  --text-secondary: #4a6a88;
  --text-dim: #2a4a68;
  --accent: #5ec4d4;
  --accent-dim: #3a8a9a;
  --accent-glow: rgba(94, 196, 212, 0.12);
  --urg: #ff5544;
  --urg-bg: rgba(255, 85, 68, 0.08);
  --hi: #ff9944;
  --hi-bg: rgba(255, 153, 68, 0.08);
  --nrm: #5ec4d4;
  --nrm-bg: rgba(94, 196, 212, 0.06);
  --lo: #3a6699;
  --lo-bg: rgba(58, 102, 153, 0.08);
  --active-bg: rgba(94, 196, 212, 0.04);
  --holding-bg: rgba(255, 153, 68, 0.04);
  --cleared-bg: rgba(100, 120, 140, 0.04);
  --next-bg: rgba(58, 102, 153, 0.04);
  --font-mono: 'Source Code Pro', 'Courier New', monospace;
  --font-display: 'Chakra Petch', 'Source Code Pro', monospace;
  --radius: 4px;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
```

- [ ] **Step 2: Verify the file is valid**

Run: `node -e "require('fs').readFileSync('public/style.css','utf8')"`
Expected: no error (file is readable)

- [ ] **Step 3: Commit**

```bash
git add public/style.css
git commit -m "theme: replace CSS custom properties with Military HUD palette"
```

---

### Task 2: Replace hardcoded color and font values in style.css

**Files:**
- Modify: `public/style.css:244,257,271,458,462,470`

There are 6 places in `style.css` where colors/fonts are hardcoded instead of using CSS variables. Each must be updated to match the new theme.

- [ ] **Step 1: Replace hardcoded font on line 244**

In `.week-nav-btn`, change:
```css
  font-family: 'Share Tech Mono', monospace;
```
to:
```css
  font-family: var(--font-mono);
```

- [ ] **Step 2: Replace hardcoded color on line 257**

In `.week-nav-btn:hover`, change:
```css
  background: rgba(0, 255, 136, 0.05);
```
to:
```css
  background: var(--accent-glow);
```

- [ ] **Step 3: Replace hardcoded color on line 271**

In `.week-nav-today:not(.current):hover`, change:
```css
  background: rgba(0, 255, 136, 0.12);
```
to:
```css
  background: var(--accent-glow);
```

- [ ] **Step 4: Replace hardcoded kanban column border colors (lines 458, 462, 470)**

In `.kanban-column[data-status="active"]`, change:
```css
  border-color: rgba(0, 255, 136, 0.3);
```
to:
```css
  border-color: rgba(94, 196, 212, 0.3);
```

In `.kanban-column[data-status="next"]`, change:
```css
  border-color: rgba(0, 170, 255, 0.3);
```
to:
```css
  border-color: rgba(58, 102, 153, 0.3);
```

Leave `.kanban-column[data-status="holding"]` (line 466, orange) and `.kanban-column[data-status="cleared"]` (line 470) as-is — their colors are still correct for the new theme.

- [ ] **Step 5: Commit**

```bash
git add public/style.css
git commit -m "theme: replace hardcoded colors and fonts with new palette values"
```

---

### Task 3: Update Google Fonts import and symbols in index.html

**Files:**
- Modify: `public/index.html:8,15,51`

- [ ] **Step 1: Replace Google Fonts link (line 8)**

Change:
```html
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700&display=swap" rel="stylesheet">
```
to:
```html
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700&family=Source+Code+Pro:wght@400;500;600&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Replace diamond symbol in header (line 15)**

Change:
```html
        <span class="diamond">◆</span> TASKTICS
```
to:
```html
        <span class="diamond">◢</span> TASKTICS
```

- [ ] **Step 3: Replace diamond symbol in section label (line 51)**

Change:
```html
    <div class="section-label">◆ WEEKLY TIMELINE</div>
```
to:
```html
    <div class="section-label">◢ WEEKLY TIMELINE</div>
```

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "theme: update fonts and symbols in index.html"
```

---

### Task 4: Update diamond symbol in render.js

**Files:**
- Modify: `public/js/render.js:241`

- [ ] **Step 1: Replace milestone diamond symbol (line 241)**

Change:
```js
        el.innerHTML = `<span class="ms-diamond">◆</span><span class="ms-title">${escapeHtml(ms.title)}</span>`;
```
to:
```js
        el.innerHTML = `<span class="ms-diamond">◢</span><span class="ms-title">${escapeHtml(ms.title)}</span>`;
```

- [ ] **Step 2: Commit**

```bash
git add public/js/render.js
git commit -m "theme: replace diamond symbol in milestone rendering"
```

---

### Task 5: Update CSS file comment header

**Files:**
- Modify: `public/style.css:1-3`

- [ ] **Step 1: Update the comment block at the top of style.css**

Change:
```css
/* ============================================
   TASKTICS - ATC Theme CSS
   ============================================ */
```
to:
```css
/* ============================================
   TASKTICS - Military HUD Theme CSS
   ============================================ */
```

- [ ] **Step 2: Commit**

```bash
git add public/style.css
git commit -m "theme: update CSS file header comment"
```

---

### Task 6: Visual verification

- [ ] **Step 1: Start the dev server**

Run: `npm start`
Expected: Server starts at http://localhost:3000

- [ ] **Step 2: Verify HYBRID view**

Open http://localhost:3000 in a browser. Confirm:
- Header shows `◢ TASKTICS` in ice blue (`#5ec4d4`) on dark navy background (`#0d1424`)
- Font is Chakra Petch for title, Source Code Pro for stats
- View tabs (HYBRID/KANBAN/TIMELINE) use the new accent color
- TIMELINE section shows `◢ WEEKLY TIMELINE` label
- KANBAN cards show correct priority border colors
- Overall background is dark navy (`#080c18`)

- [ ] **Step 3: Verify KANBAN view**

Click KANBAN tab. Confirm:
- 4 columns render with correct border accent colors
- Task cards have left-border priority coloring (red/orange/cyan/blue)
- CLEARED column cards are dimmed

- [ ] **Step 4: Verify TIMELINE view**

Click TIMELINE tab. Confirm:
- PREV / TODAY / NEXT buttons styled correctly
- Today column highlighted with accent background
- Task chips show correct priority colors
- Milestone markers show `◢` symbol

- [ ] **Step 5: Compare with mockup**

Open `.superpowers/brainstorm/57839-1776302812/content/tactical-revised.html` in a browser for side-by-side comparison. Colors and fonts should match.
