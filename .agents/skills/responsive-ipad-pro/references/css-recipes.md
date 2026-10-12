# CSS recipes

Contents: Foundation · Fluid tokens · Auto-fit grid · Adaptive sidebar shell · Container-query components · Responsive table · Nav pattern · Touch & hover · Full-height, safe-area, keyboard · Tailwind config · Images

## Foundation

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body { margin: 0; min-height: 100dvh; line-height: 1.5; }
img, video, svg, canvas { max-width: 100%; height: auto; }
/* Flex/grid children holding long content must be allowed to shrink */
:where(.flex > *, .grid > *) { min-width: 0; }
pre, code, table { max-width: 100%; }
pre { overflow-x: auto; }
input, select, textarea { font-size: max(16px, 1em); } /* no iOS focus zoom */
```

## Fluid tokens

```css
:root {
  --space-s: clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem);
  --space-m: clamp(1rem, 0.8rem + 1vw, 1.5rem);
  --space-l: clamp(1.5rem, 1.1rem + 2vw, 2.5rem);
  --step-0: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --step-2: clamp(1.375rem, 1.1rem + 1.2vw, 2rem);
  --step-4: clamp(1.75rem, 1.2rem + 2.5vw, 3rem);
  --page-pad: max(var(--space-m), env(safe-area-inset-left));
}
.container { width: min(100% - 2 * var(--page-pad), 1200px); margin-inline: auto; }
```

## Auto-fit grid (no breakpoints)

```css
.cards {
  display: grid;
  gap: var(--space-m);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
}
```
Use `auto-fill` instead of `auto-fit` if you don't want a lone card to stretch.

## Adaptive sidebar shell (the iPad-portrait fix)

Phone: stacked, drawer nav. Tablet portrait (600–1099): icon rail. Wide (≥1100): full sidebar.

```css
.shell { display: grid; min-height: 100dvh; grid-template-columns: minmax(0, 1fr); }
.shell__nav  { /* phone: off-canvas drawer or bottom bar */ }
.shell__main { min-width: 0; padding: var(--page-pad); }

@media (min-width: 600px) {          /* tablet band */
  .shell { grid-template-columns: 72px minmax(0, 1fr); }  /* icon rail */
  .nav-label { display: none; }
}
@media (min-width: 1100px) {         /* NOT 1024: iPad Pro/Air 13" portrait stays in tablet layout */
  .shell { grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); }
  .nav-label { display: inline; }
}
```

Main-area content should then use container queries (below), because the main column is narrower than the viewport.

## Container-query components

```css
.panel { container-type: inline-size; container-name: panel; }

.stat-grid { display: grid; gap: var(--space-m); grid-template-columns: 1fr; }
@container panel (min-width: 520px)  { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
@container panel (min-width: 840px)  { .stat-grid { grid-template-columns: repeat(4, 1fr); } }

.media-card { display: grid; gap: var(--space-m); }
@container (min-width: 480px) { .media-card { grid-template-columns: 200px 1fr; } }
```
Note: an element can't query its own container; put `container-type` on a wrapper and style descendants. Use `cqi` units for fluid sizing inside a container.

## Responsive table

```html
<div class="table-wrap"><table>…</table></div>
```
```css
.table-wrap { overflow-x: auto; container-type: inline-size; -webkit-overflow-scrolling: touch; }
.table-wrap table { min-width: 560px; width: 100%; border-collapse: collapse; }

/* optional: stacked cards when the container is narrow */
@container (max-width: 559px) {
  table, thead, tbody, tr, td { display: block; }
  thead { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); }
  td::before { content: attr(data-label); font-weight: 600; display: block; }
}
```

## Navigation pattern

- < 600: bottom tab bar (≤ 5 items) or hamburger drawer.
- 600–1099: icon rail with tooltips on long-press/focus; or a top bar that wraps.
- ≥ 1100: full labelled sidebar.
- Top-nav with many links: let it wrap (`flex-wrap: wrap; gap`) or collapse overflow into a "More" menu based on container width, not viewport.

## Touch & hover

```css
/* Default: works with touch */
.menu-item { min-height: 44px; padding: 0.75rem 1rem; }

@media (hover: hover) and (pointer: fine) {
  .card:hover { transform: translateY(-2px); }
  .dropdown:hover > .dropdown__menu { display: block; } /* still also toggle on click/tap */
}
@media (pointer: coarse) {
  .icon-btn { min-width: 44px; min-height: 44px; }
  .list { gap: 0.5rem; }
}
```
Never hide essential info behind hover. Don't rely on `:hover` to open menus; use `button[aria-expanded]` toggles.

## Full-height, safe area, keyboard

```css
.app { min-height: 100vh; min-height: 100dvh; }          /* fallback then dynamic */
.bottom-bar {
  position: fixed; inset-inline: 0; bottom: 0;
  padding-bottom: env(safe-area-inset-bottom);
}
.top-bar { position: sticky; top: 0; padding-top: env(safe-area-inset-top); }
main { padding-bottom: calc(64px + env(safe-area-inset-bottom)); } /* room for bottom bar */
```
Keyboard: `<meta name="viewport" content="..., interactive-widget=resizes-content">` (Chromium) and for Safari use `window.visualViewport` `resize` events to lift fixed footers/composers.

Prefer `overflow-x: clip` over `hidden` when you must clip horizontal overflow on an ancestor, since `hidden` breaks `position: sticky`.

## Tailwind config (avoid the 1024 trap)

```js
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      sm: '480px',
      tablet: '600px',   // tablet portrait begins (covers 744–1032)
      wide: '1100px',    // desktop / tablet landscape; sidebar + 3-col allowed here
      xl: '1280px',
      '2xl': '1536px',
    },
  },
}
```
Usage: `grid-cols-1 tablet:grid-cols-2 wide:grid-cols-3`, `hidden wide:block` for full sidebar, `tablet:w-[72px] wide:w-72` for rail → sidebar. Tailwind v4: define `--breakpoint-tablet: 600px; --breakpoint-wide: 1100px;` in `@theme`. Tailwind v3.2+/v4 supports `@container` utilities (`@container`, `@md:grid-cols-2`).

## Images

```html
<img src="hero-1032.jpg"
     srcset="hero-640.jpg 640w, hero-1032.jpg 1032w, hero-1600.jpg 1600w, hero-2064.jpg 2064w"
     sizes="(min-width: 1100px) 50vw, 100vw"
     width="1600" height="900" alt="…" style="aspect-ratio:16/9;object-fit:cover">
```
