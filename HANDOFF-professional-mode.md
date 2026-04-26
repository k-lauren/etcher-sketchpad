# Handoff Spec: Professional Mode

## Overview

"Professional Mode" is a user-togglable UI skin that replaces the playful sticky-note aesthetic with a clean SaaS-style design. The toggle lives in Settings alongside Theme and Dev Mode. When active, it reskins every surface — header, canvas nodes, connections, sidebar, config panel, toolbar, and zoom controls — without changing any app logic, data model, or interaction behavior.

The existing codebase already has `saasMode: boolean` on `AppConfig` (defaults `false`) and persists it via localStorage — the plumbing is done, only the CSS/component rendering needs to respond to it.

**Reference mockup:** `etcher-sketchpad-saas.html` in the repo root (open in any browser).

---

## 1. Config & Toggle

### Where the toggle goes

Settings panel → Appearance section, as a new row between "Theme" and "Layout direction."

```
Label:       Professional mode
Description: Clean, minimal interface — less sticky note, more SaaS.
Control:     Toggle switch (same component as Dev Mode)
```

### Data flow

`AppConfig.saasMode` is already typed and stored. The toggle just calls `onSave({ ...config, saasMode: !config.saasMode })`. On `App` mount, apply a body class:

```ts
document.body.classList.toggle('mode-pro', config.saasMode);
```

This mirrors how `theme-dark` is already toggled and allows all visual changes to be driven by CSS selectors: `body.mode-pro .sticky { ... }`.

---

## 2. Design Tokens

Two parallel token sets. The "Classic" column is what exists today. The "Pro" column is what `body.mode-pro` overrides.

### Colors

| Token | Classic (light) | Pro (light) | Usage |
|-------|----------------|-------------|-------|
| `--bg` | `#F5F4EF` | `#FAFBFC` | Page / canvas background |
| `--surface` | `#FFFFFF` | `#FFFFFF` | Cards, sidebar, header |
| `--surface-hover` | `#F0EEE5` | `#F6F8FA` | Hover states |
| `--border` | `#E5E3DC` | `#E1E4E8` | Primary borders |
| `--border-light` | `#E5E3DC` | `#ECEEF1` | Subtle dividers |
| `--text` | `#1A1A1A` | `#1F2328` | Primary text |
| `--text-secondary` | `#555555` | `#656D76` | Labels, metadata |
| `--text-tertiary` | `#8B8677` | `#8B949E` | Hints, placeholders |
| `--accent` | `#1A1A1A` | `#2563EB` | Active tab, primary buttons |
| `--accent-light` | n/a | `#EFF6FF` | Active tab background |
| `--node-root` | `#FFF6A8` (yellow) | `#FFFFFF` | Root node background |
| `--node-child` | `#C6EAFF` (blue) | `#F8FAFF` | Chained node background |
| `--node-doc` | `#D4F1DE` (green) | `#F0FDF4` | Document node background |
| `--node-selected` | `0 0 0 3px #FF7EB9` | `0 0 0 2px #2563EB` | Selected ring |
| `--success` | `#2A9D5C` | `#16A34A` | Save confirmation, doc icon |
| `--error` | `#B00020` | `#DC2626` | Error text |
| `--error-bg` | `#FFECEC` | `#FEF2F2` | Error background |

### Typography

| Token | Classic | Pro | Usage |
|-------|---------|-----|-------|
| `--font` | system stack | same | No change |
| `--font-mono` | `ui-monospace, ...` | same | No change |
| `--logo-size` | `18px / 700` | `15px / 700` | Logo text |
| `--tab-size` | `14px` | `13px` | Tab labels |
| `--node-badge` | `10px / 600 / uppercase` | `11px / 600 / uppercase` | Node type badge |
| `--node-body` | `13px` | `13px` | Question/answer text |

### Spacing

| Token | Classic | Pro | Usage |
|-------|---------|-----|-------|
| `--header-h` | `~46px` (padding-based) | `52px` (fixed) | Header height |
| `--header-px` | `20px` | `20px` | Header horizontal padding |
| `--node-w` | `220px` | `280px` | Node card width |
| `--node-r` | `3px` | `12px` | Node border radius |
| `--node-pad` | `12px` | `12px` | Node internal padding |
| `--sidebar-w` | `380px` | `420px` | Sidebar width |
| `--toolbar-r` | `50%` (circle) | `20px` (pill) | Toolbar button radius |

### Shadows

| Token | Classic | Pro |
|-------|---------|-----|
| `--node-shadow` | `3px 3px 0 rgba(0,0,0,0.15)` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` |
| `--node-shadow-selected` | `4px 4px 0 rgba(0,0,0,0.2), ring` | `0 0 0 2px #2563EB` |

---

## 3. Component-by-Component Spec

### 3.1 Header

| Property | Classic | Pro |
|----------|---------|-----|
| Height | auto (padding `10px 20px`) | fixed `52px`, vertically centered |
| Logo icon | Yellow square, `14×14`, `border-radius: 3px`, rotated `-6deg`, black border | Gradient square (`#2563EB → #7C3AED`), `28×28`, `border-radius: 8px`, sparkle SVG icon centered inside, no rotation |
| Logo text | `"Etcher-Sketchpad"` single weight | `"Etcher"` bold + `"Sketchpad"` in `--text-tertiary` |
| Tab (inactive) | `color: #555`, transparent bg | `color: --text-secondary`, transparent bg |
| Tab (active) | `bg: #1A1A1A`, `color: #FFF` | `bg: --accent-light`, `color: --accent`, `font-weight: 600` |
| Provider badge | Plain text `12px #888` | Pill: `bg: --surface-hover`, `border: 1px solid --border-light`, `border-radius: 20px`, `padding: 4px 10px`, with CPU icon |

**Hover states:**
- Tab (inactive): `bg: --surface-hover`
- Tab (active): no change (already highlighted)

### 3.2 Canvas Dot Grid

| Property | Classic | Pro |
|----------|---------|-----|
| Dot color | `#D4D1C3` | `#E1E4E8` (same as `--border`) |
| Dot size | `1px` radius | `0.8px` radius |
| Grid spacing | `24px` (scales with zoom) | `24px` (scales with zoom) |
| Background | `#F5F4EF` | `#FAFBFC` |

### 3.3 Node Cards

**Structure changes:**

Classic nodes are flat `div`s with inline question/answer sections. Pro nodes add a **header bar** — a distinct top row with the node type badge, action icons, and a `1px` bottom border separating it from the body. This is a new DOM element, not just CSS.

```
┌─────────────────────────────────────┐
│ [icon] CHAINED    [▾] [👁] [⎘] [✕] │  ← header bar
├─────────────────────────────────────┤
│ How do they compare to monoliths    │  ← question (tinted bg)
│ for small teams?                    │
│                                     │
│ For small teams, a well-structured  │  ← answer (plain)
│ monolith is almost always the ...   │
│                                     │
│                          [Re-ask]   │  ← footer actions
└─────────────────────────────────────┘
```

| Property | Classic | Pro |
|----------|---------|-----|
| Width | `220px` | `280px` |
| Border | `1.5px solid #1A1A1A` | `1.5px solid --border` (selected: `--accent`) |
| Border radius | `3px` | `12px` |
| Shadow | hard offset `3px 3px` | soft `0 1px 3px rgba(...)` |
| Header bar | none (badge is inline) | distinct row, `padding: 8px 12px`, `border-bottom: 1px solid --border-light` |
| Question bg | `rgba(255,255,255,0.55)` | `--surface-hover` (root) or `rgba(37,99,235,0.04)` (child) |
| Answer area | `max-height: 120px` | `max-height: 140px` |
| Badge icons | none (text only: "root", "↳ chained") | `MessageSquare` for root, `GitBranch` (rotated 180°) for chained, `FileText` for doc |
| Action icons | emoji (`🔍`, `⎘`, `✂`, `✕`) | Lucide SVGs (`Eye`, `Copy`, `Scissors`, `Trash2`) at `14px` |
| Action style | `.icon-btn` with emoji | ghost button: transparent bg, `--text-secondary`, `padding: 6px`, `border-radius: 6px` |
| Loading state | Text: `"Thinking…"` | `Loader2` icon (spinning) + `"Generating response..."` in `--accent` color |

**Action button hover:** `bg: rgba(0,0,0,0.06)`

### 3.4 Connection Lines

| Property | Classic | Pro |
|----------|---------|-----|
| Type | Straight `<line>` | Cubic Bézier `<path>` using `C` command |
| Stroke | `#1A1A1A` | `--border` |
| Width | `2px` | `1.5px` |
| Dash | `4 4` | `6 4` |
| Opacity | `0.4` | `0.6` |
| Anchor points | Center-to-center | Right edge of parent → left edge of child (both vertically centered) |

**Bézier control points:** midpoint X between source and target, preserving source Y and target Y respectively:

```
M {parent.x + NODE_W} {parent.y + NODE_H/2}
C {midX} {parent.y + NODE_H/2},
  {midX} {child.y + NODE_H/2},
  {child.x} {child.y + NODE_H/2}
```

where `midX = (x1 + x2) / 2`.

### 3.5 Canvas Toolbar (top-right)

| Property | Classic | Pro |
|----------|---------|-----|
| Tidy button | Circle `36×36`, white bg, black border, `⊞` character | Pill: `border-radius: 20px`, `padding: 8px 14px`, outline style, `LayoutGrid` icon + text "Tidy" |
| Add button | Circle `36×36`, yellow `#FFD93D` bg, `+` character | Pill: `border-radius: 20px`, `padding: 8px 14px`, filled `--accent` bg, `Plus` icon + text "New node" |
| Shadow | `2px 2px 0 rgba(0,0,0,0.12)` | `0 1px 3px rgba(0,0,0,0.06)` for outline, `0.1` for filled |
| Position | `top: 16px`, `right: calc(16px + var(--sb-w))` | same, with `transition: right 300ms ease` |

### 3.6 Zoom Controls (bottom-right)

| Property | Classic | Pro |
|----------|---------|-----|
| Container | white bg, `border-radius: 8px`, `1px` border | same |
| Buttons | `28×28`, `border-radius: 6px`, `−`/`+` text, `1px` border each | ghost style (no border), `ZoomOut`/`ZoomIn` Lucide icons at `15px` |
| Reset button | Text "Reset" | `RotateCcw` icon at `13px` |
| Divider | none | `1px` vertical line between zoom and reset |
| Readout | `12px`, `color: #555` | `12px`, `color: --text-secondary`, `font-weight: 500`, `font-variant-numeric: tabular-nums` |

### 3.7 Canvas Hint (bottom-left)

Unchanged in structure. Token changes only: `color: --text-tertiary`, `bg: --surface`, `border: --border-light`.

### 3.8 Sidebar

| Property | Classic | Pro |
|----------|---------|-----|
| Width | `380px` | `420px` |
| Header title | `"Chain as chat"` | `"Thread view"` |
| Header extras | none | Message count badge: `bg: --surface-hover`, `border-radius: 10px`, `padding: 2px 8px`, `font-size: 11px` |
| Header icon | none | `MessageSquare` icon in `--accent` |
| Fullscreen/close | emoji `⤢`/`✕` | `Maximize2`/`Minimize2`/`X` Lucide icons |
| User bubble | `bg: #1A1A1A`, `color: #FFF`, `border-radius: 10px` | `bg: --accent`, `color: #FFF`, `border-radius: 12px 12px 4px 12px` (tail bottom-right) |
| Assistant bubble | `bg: #F1EFE7`, `border-radius: 10px` | `bg: --surface-hover`, `border-radius: 12px 12px 12px 4px` (tail bottom-left) |
| Bot avatar | none | `26×26` circle, gradient `--accent → #7C3AED`, `Bot` icon `14px` white, left of assistant bubble |
| Empty state | Text only | `Eye` icon (28px, `--border` color) above text |
| Composer | textarea + `"Send"` text button | textarea (`border-radius: 8px`) + icon-only `Send` button (filled `--accent`) |
| Placeholder text | `"Continue the chain..."` | `"Continue the thread..."` |

**Bubble shape rationale:** The asymmetric radii create directional "tails" that visually indicate message origin without needing labels. The small radius (4px) faces toward the sender's side.

### 3.9 Settings Panel

This is the biggest structural change — not just a reskin but a layout shift.

**Classic:** Single centered card, max-width `640px`, all fields stacked vertically with identical chip-selector pattern for every option.

**Pro:** No wrapper card. Left-aligned, max-width `900px`, two-column layout per section:

```
┌──────────────────────────────────────────────────────────┐
│ Settings                                                  │
│ Your keys stay in the browser — we never see them.        │
│                                                           │
│ Provider                   [DeepSeek] [OpenAI] (Claude)   │
│ Choose which AI service    API key  [sk-ant-...]          │
│ to use for inference.      Model    [claude-sonnet-4-5]   │
│                                                           │
│ ───────────────────────────────────────────────────────── │
│                                                           │
│ Appearance                 Theme        [Light | Dark]    │
│ Visual preferences and     Layout dir   [Horizontal ▾]   │
│ canvas layout.             Pro mode     [====○]           │
│                                                           │
│ ───────────────────────────────────────────────────────── │
│                                                           │
│ Advanced                   Dev mode     [○====]           │
│ Options for power users                                   │
│ and debugging.                                            │
│                                                           │
│ ───────────────────────────────────────────────────────── │
│                                                           │
│                            [Save changes]  ✓ Saved        │
└──────────────────────────────────────────────────────────┘
```

| Property | Classic | Pro |
|----------|---------|-----|
| Outer padding | `32px` centered | `40px 48px`, left-aligned |
| Max width | `640px` (centered card) | `900px` (no card, left-aligned) |
| Section layout | stacked, single column | two-column: `180px` fixed label column + flexible control column (`max-width: 440px`) with `48px` gap |
| Section heading | UPPERCASE `12px` label with icon | `15px / 600` heading, `12px` description beneath in `--text-tertiary` |
| Provider selector | identical chips (equal-width buttons) | pill buttons (`border-radius: 20px`), dark fill on active (`--text` bg, `#FFF` text), outline on inactive |
| API key fields | all 3 providers shown always | only active provider's fields shown |
| Theme control | two equal-width chips | segmented control: `bg: --surface-hover` container, `border-radius: 8px`, active segment gets `bg: --surface` + shadow. Each segment has sun/moon icon. |
| Layout control | two equal-width chips | native `<select>` dropdown with custom chevron |
| Dev mode | chip toggle ("On"/"Off") | iOS-style toggle switch (40×22, pill, sliding dot) |
| Pro mode | n/a (new) | same toggle switch as dev mode |
| Save button | `bg: #1A1A1A` | `bg: --accent` |
| Save confirmation | `"Saved"` green text | `Check` icon + `"Saved"` in `--success` |

**Toggle switch spec:** width `40px`, height `22px`, border-radius `11px`, track color off `#D1D5DB` / on `--accent`. Dot: `18×18`, white, `border-radius: 50%`, `box-shadow: 0 1px 3px rgba(0,0,0,0.15)`. Transition: `transform 200ms ease` on dot, `background 200ms ease` on track.

---

## 4. Dark Theme Interaction

Professional Mode and Dark Theme are independent toggles. When both are active, the Pro tokens should adapt to dark variants:

| Pro Token (light) | Pro Token (dark) |
|-------------------|-----------------|
| `--bg: #FAFBFC` | `--bg: #0F1320` |
| `--surface: #FFFFFF` | `--surface: #161A2A` |
| `--border: #E1E4E8` | `--border: #242A3D` |
| `--text: #1F2328` | `--text: #E6E3D9` |
| `--accent: #2563EB` | `--accent: #60A5FA` (lighter blue for contrast) |
| `--node-root: #FFFFFF` | `--node-root: #1A1F33` |
| `--node-child: #F8FAFF` | `--node-child: #1C2240` |
| `--node-selected: 0 0 0 2px #2563EB` | `--node-selected: 0 0 0 2px #60A5FA` |

CSS specificity: `body.mode-pro.theme-dark .sticky { ... }` overrides both individual modes.

---

## 5. Transition & Animation

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Sidebar width | sidebar open/close | `flex-basis`, `width` | `300ms` | `ease` |
| Toolbar position | sidebar open/close | `right` | `300ms` | `ease` |
| Zoom controls position | sidebar open/close | `right` | `300ms` | `ease` |
| Node card | select/deselect | `box-shadow`, `border-color` | `150ms` | `ease` |
| Toggle switch dot | toggle | `transform: translateX` | `200ms` | `ease` |
| Toggle switch track | toggle | `background` | `200ms` | `ease` |
| Buttons | hover | `all` | `120ms` | `ease` |

There is **no animation on the mode switch itself**. Changing Professional Mode causes an instant re-render. Attempting to cross-fade every element would be complex and fragile — an instant switch feels intentional, like toggling a VS Code theme.

---

## 6. Implementation Strategy

### Recommended approach: CSS custom properties + body class

1. **Define CSS variables** at `:root` for the classic tokens.
2. **Override under `body.mode-pro`** for the professional tokens.
3. **Override under `body.theme-dark`** for classic dark.
4. **Override under `body.mode-pro.theme-dark`** for professional dark.
5. **Structural changes** (header bar on nodes, two-column settings, bot avatar, pill toolbar) should be conditional renders in JSX gated on a `proMode` prop or context value.

```css
:root {
  --bg: #F5F4EF;
  --node-w: 220px;
  --node-r: 3px;
  /* ... */
}
body.mode-pro {
  --bg: #FAFBFC;
  --node-w: 280px;
  --node-r: 12px;
  /* ... */
}
```

### Files touched

| File | Change |
|------|--------|
| `types.ts` | Already has `saasMode: boolean` — no change needed |
| `storage.ts` | Already has `saasMode: false` default — no change needed |
| `styles.css` | Add `body.mode-pro` overrides for all tokens. Add `body.mode-pro.theme-dark` combined overrides. |
| `App.tsx` | Add `document.body.classList.toggle('mode-pro', config.saasMode)` in the existing theme `useEffect` |
| `ConfigPanel.tsx` | Add Pro Mode toggle row in Appearance section. When `saasMode` is on, restructure the panel into two-column layout (conditional render). |
| `StickyNoteCard.tsx` | Conditionally render header bar with Lucide icons vs. flat layout with emoji. Width change is handled by CSS variable. |
| `Sidebar.tsx` | Conditionally render bot avatar, update bubble classes, swap emoji for Lucide icons, update title text. |
| `Canvas.tsx` | Swap `<line>` for `<path>` when pro mode. Update toolbar buttons (pill vs. circle). Hint text unchanged. |

### New dependency

```bash
npm install lucide-react
```

The mockup uses these icons: `Plus`, `LayoutGrid`, `Settings`, `X`, `Maximize2`, `Minimize2`, `Copy`, `Scissors`, `Trash2`, `ChevronDown`, `ChevronRight`, `Send`, `ZoomIn`, `ZoomOut`, `RotateCcw`, `FileText`, `Bot`, `Sparkles`, `GitBranch`, `Loader2`, `AlertCircle`, `Eye`, `Moon`, `Sun`, `Cpu`, `Key`, `ArrowDownUp`, `Bug`, `Check`, `MessageSquare`.

---

## 7. Accessibility Notes

- **Toggle switch**: needs `role="switch"`, `aria-checked`, `aria-label="Professional mode"`. Must be keyboard-operable (Space/Enter to toggle).
- **Focus order**: unchanged — the toggle is a new element in the natural tab order within Settings.
- **Contrast**: all Pro-mode text/background combinations pass WCAG AA. Verify `--text-tertiary` (`#8B949E`) against `--surface` (`#FFFFFF`) = 3.5:1 — this passes for large text (14px bold or 18px+) but fails for small text. Use `--text-secondary` (`#656D76`, 5.0:1) for any critical small text.
- **Motion**: the spinning `Loader2` icon should respect `prefers-reduced-motion` — replace with a static ellipsis or pulsing dot.
- **Screen readers**: the mode toggle should announce "Professional mode, on/off" on change. Node type badges (Root, Chained, Document) are already text — no change needed.

---

## 8. Edge Cases

- **Mode switch with sidebar open**: sidebar width changes from 380→420px. The `transition` on `flex-basis` handles this smoothly. Canvas toolbar/zoom `right` offsets use `calc(16px + var(--sb-w))` — update `--sb-w` from `380px` to `420px` under `body.mode-pro`.
- **Mode switch preserves all state**: notes, selection, sidebar open/closed, zoom level, scroll position — nothing resets.
- **Long node text**: Pro nodes are 280px vs 220px, so existing content fits better. `max-height` on answer area increases from 120→140px. Overflow behavior (scroll) is unchanged.
- **Very deep chains**: Bézier curves handle large horizontal gaps better than straight lines since the midpoint control prevents lines from overlapping nodes.
- **Printing**: the mode toggle is cosmetic only and doesn't affect print. If print styles are added later, Pro mode's lighter palette is more print-friendly.
