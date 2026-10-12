---
name: responsive-ipad-pro
description: Design and build truly robust responsive layouts (HTML/CSS/Tailwind/React/Vue), with special focus on the notorious iPad Pro / iPad Air / iPad mini PORTRAIT breakpoint gap (744–1032px wide) where layouts break, sidebars crush content, desktop layouts trigger too early, or hover/touch behave wrongly. Use this skill whenever the user asks for responsive design, mobile-first, tablet layout, breakpoints, "หน้าเว็บเพี้ยนบน iPad", "responsive ไม่สวย", "แสดงผลผิดบน iPad แนวตั้ง", dashboards, landing pages, web apps, admin panels, or any UI that must work across phone/tablet/desktop — even if the user never mentions iPad. Also use it when reviewing or fixing an existing layout for overflow, cramped columns, 100vh bugs, safe-area, Split View / Stage Manager, or touch-target issues.
---

# Responsive Design Pro (iPad-portrait-proof)

Build layouts that hold up on every width from 320px to 1400px+, and in particular on the iPad band that most responsive code ignores.

## Why iPad portrait breaks (read this first, it drives every rule below)

1. **The tablet band is wide and awkward.** iPads in portrait are 744–1032 CSS px wide. Common breakpoints (`md: 768`, `lg: 1024`) slice this band badly: an iPad Pro 12.9" / iPad Air 13" in portrait is **exactly 1024px**, so `min-width: 1024px` (Tailwind `lg:`) turns on the *desktop* layout (sidebar + 3 columns) in a 1024px-wide *touch* portrait screen. Content gets crushed.
2. **Viewport width ≠ device identity.** iPadOS Safari sends a Mac-like user agent, windows can be resized (Split View, Slide Over, Stage Manager), and the same iPad is 820px in portrait and 1180px in landscape. Never detect "is iPad"; respond to the actual available space and input capabilities.
3. **Touch + hover mismatch.** Wide screens assume mouse; iPad has touch (and sometimes a trackpad). Width-based "desktop = hover" assumptions break menus and tooltips.
4. **Viewport units lie.** `100vh` ignores Safari's dynamic toolbars; fixed bars collide with the home indicator.
5. **Layouts tuned to the viewport, not the container.** A sidebar page at 1024px gives the main column only ~740px, but media queries still think "1024 = wide".

## Workflow

1. **Set the foundation** (always; see `references/css-recipes.md` → Foundation):
   - `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Without it iPad Safari lays out at ~980px and scales down.
   - `box-sizing: border-box`, `-webkit-text-size-adjust: 100%`, `img/video/svg { max-width:100%; height:auto }`, `min-width: 0` on flex/grid children that hold text/tables/code.
2. **Choose the layout strategy: fluid first, breakpoints second.**
   - Prefer intrinsic layouts: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr))`, `clamp()` for type and spacing, `flex-wrap`, `aspect-ratio`.
   - Use **container queries** (`container-type: inline-size`) for components (cards, sidebars, tables, nav) so they adapt to the space they actually get, including Split View/Stage Manager.
   - Add media queries only where the content breaks (a column becomes < ~320px, a nav item wraps, a line exceeds ~75ch).
3. **Treat the tablet band as a first-class layout, not "big phone" or "small desktop".** Define explicit ranges and design each one on purpose:
   - Phone: < 600
   - Tablet portrait: 600–1099 (covers 744, 768, 810, 820, 834, 1024, 1032)
   - Desktop / tablet landscape: ≥ 1100 (1133, 1180, 1194, 1366 land here)
   Do **not** switch to a persistent sidebar or 3+ columns at 1024. Start persistent sidebars at ≥ 1100–1200, or use a collapsible/off-canvas/rail sidebar (64–72px icon rail) in the tablet band. If using Tailwind, add custom screens (`tablet: '600px'`, `wide: '1100px'`) rather than relying on `lg`.
4. **Branch on capabilities, not widths:**
   - `@media (hover: hover) and (pointer: fine)` for hover-only affordances; default state must work with touch.
   - `@media (pointer: coarse)` to enlarge targets (≥ 44×44px) and spacing.
   - Use `any-pointer` if you need to support iPad + trackpad/keyboard together.
   - Never user-agent sniff. If JS needs it: `matchMedia('(pointer: coarse)')`, `navigator.maxTouchPoints`.
5. **Handle viewport & system UI** (see recipes): `100dvh`/`svh` instead of `100vh`; `env(safe-area-inset-*)` on fixed/sticky bars; `interactive-widget=resizes-content` or `visualViewport` for on-screen keyboards; input `font-size ≥ 16px` to prevent iOS focus-zoom.
6. **Verify with real measurements**, not by eye (see Verification).
7. **Report** what was tested (widths/orientations) and any known limits.

## Rules, with the reasons

- **No fixed pixel widths on layout containers.** Use `max-width` + `width: min(100% - 2rem, 1200px)`. Fixed widths overflow the 744px iPad mini or Split View windows.
- **Sidebar layouts use grid with `minmax`, not a hard-coded split:** `grid-template-columns: minmax(220px, 280px) minmax(0, 1fr)`. The `minmax(0, 1fr)` is what stops wide tables/code from blowing out the main column.
- **Content-first column counts:** pick columns by minimum comfortable card width (auto-fit), not by device. Cards narrower than ~240px or text measures wider than ~75ch are both bugs.
- **Typography:** `font-size: clamp(1rem, 0.9rem + 0.5vw, 1.125rem)` for body; fluid headings with a sane max. Don't shrink body text below 16px on touch devices.
- **Tables & data grids:** wrap in a container with `overflow-x: auto` and `container-type: inline-size`; at narrow container widths convert rows to stacked cards. The page itself must never scroll horizontally.
- **Navigation:** phone = bottom bar or hamburger; tablet portrait = icon rail or collapsible drawer (never a full 280px sidebar permanently); wide = full sidebar. Top nav with many items must wrap or collapse by container width.
- **Images/media:** set `aspect-ratio` and `object-fit` to prevent layout shift; use `sizes`/`srcset` for tablet widths (~820w and ~1032w at 2x DPR).
- **Modals/sheets:** `max-height: min(90dvh, 720px)`, internal scroll, safe-area padding. On tablet portrait use a centered dialog or side sheet, not a full-screen phone sheet or a desktop-sized dialog.
- **Orientation:** layouts must work on resize, not just on load. Avoid `orientation` queries for core structure (Stage Manager makes windows any shape); use width/aspect-ratio only for optional refinements.
- **Avoid:** `100vh` for full-height shells, `position: fixed` without safe-area handling, `vw` for font sizes without `clamp`, `overflow-x: hidden` on `body` as a "fix" (it hides bugs and breaks `position: sticky`), JS-driven layout that only runs once.

## Common iPad-portrait failures → fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Desktop layout on iPad Pro 12.9"/Air 13" portrait, content squeezed | Breakpoint at 1024 | Move persistent sidebar/3-col start to ≥ 1100–1200; use rail/drawer 600–1099 |
| Page looks zoomed-out / tiny | Missing viewport meta or fixed-width layout | Add viewport meta; remove fixed widths |
| Horizontal scroll by ~10–40px | Unconstrained child (table, pre, flex item, `100vw` + scrollbar) | `min-width:0`, `overflow-x:auto` wrapper, replace `100vw` with `100%` |
| Cards 2-up but too narrow/ugly at 820 | Column count tied to breakpoint | auto-fit/minmax or container query |
| Hover menus don't open / stick open | Hover-only interaction | `(hover: hover)` gating + tap/click toggle |
| Bottom bar hidden behind home indicator / Safari toolbar | No safe-area, `100vh` | `viewport-fit=cover`, `padding-bottom: env(safe-area-inset-bottom)`, `dvh` |
| Layout broken in Split View / Stage Manager | Device-based breakpoints | Container queries, test arbitrary widths 320–1100 |
| Input zooms on focus | font-size < 16px | `font-size: 16px` min on inputs |
| Sticky header jumps / sticky not working | `overflow-x:hidden` on ancestor, or `100vh` hacks | Remove ancestor overflow; use `overflow-x: clip` where needed |

## Verification (do not skip)

Run the bundled audit on the page you produced:

```bash
python scripts/responsive_audit.py <file.html | http://url> --out audit/
```

It renders the page across a width sweep plus named iPad/phone viewports (portrait and landscape), saves screenshots, and reports: horizontal overflow, offending elements, missing viewport meta, tiny tap targets, tiny input text. Prefer WebKit (Safari engine) when available; the script falls back to Chromium and says so. Fix every overflow finding at the tablet widths before delivering.

Also manually reason about these widths: **744, 768, 810, 820, 834, 1024, 1032** (portrait) and **1133, 1180, 1194, 1366** (landscape), plus **320, 390, 430** phones. Device sizes are in `references/ipad-viewports.md`.

## Definition of done

- [ ] Viewport meta + base reset present
- [ ] No horizontal page scroll from 320 to 1400px (continuous sweep, not just named devices)
- [ ] Tablet band 600–1099 has an intentional layout (nav, columns, density) — not stretched phone, not squeezed desktop
- [ ] Persistent sidebar / 3+ columns only appear at ≥ 1100px or by container width
- [ ] Hover-only interactions have touch equivalents; targets ≥ 44px on `pointer: coarse`
- [ ] Full-height shells use `dvh`; fixed bars respect safe areas
- [ ] Inputs ≥ 16px; tables/code scroll inside their own container
- [ ] Audit run and results summarized to the user

## Reference files

- `references/css-recipes.md` — copy-paste foundation, grid/sidebar, container-query, Tailwind config, safe-area, keyboard, and nav patterns. Read when implementing.
- `references/ipad-viewports.md` — iPad CSS-pixel sizes (portrait/landscape) and which breakpoint bands they fall into. Read when choosing breakpoints or testing.
