# iPad viewport reference (CSS px)

Sizes are the full-screen device viewport in CSS pixels. Safari's *visible* height is smaller (toolbars, home indicator), and the width changes in Split View / Slide Over / Stage Manager. Treat these as test points, not as device breakpoints.

| Device | Portrait (w×h) | Landscape (w×h) |
|---|---|---|
| iPad mini (6th/7th gen, 8.3") | 744 × 1133 | 1133 × 744 |
| iPad 9th gen (10.2") | 810 × 1080 | 1080 × 810 |
| iPad 10th gen (10.9") | 820 × 1180 | 1180 × 820 |
| iPad Air 4/5, Air 11" (M2/M3) | 820 × 1180 | 1180 × 820 |
| iPad Air 13" (M2/M3) | 1024 × 1366 | 1366 × 1024 |
| iPad Pro 11" (2018–2022) | 834 × 1194 | 1194 × 834 |
| iPad Pro 11" (M4) | 834 × 1210 | 1210 × 834 |
| iPad Pro 12.9" (2015–2022) | 1024 × 1366 | 1366 × 1024 |
| iPad Pro 13" (M4) | 1032 × 1376 | 1376 × 1032 |

Phones for comparison: 320 (small/Split View), 375, 390, 393, 430, 440.

## Where common breakpoints land

| Width | Hit by | Typical mistake |
|---|---|---|
| 744 | iPad mini portrait | Falls below `md:768` → phone layout stretched across a tablet |
| 768 | Classic "tablet" breakpoint | Real iPads are rarely exactly 768 |
| 810–834 | iPad 9th, Air 11", Pro 11" portrait | Between `md` and `lg`: 2-column grids too narrow if sidebar present |
| **1024** | **iPad Pro 12.9" / Air 13" portrait** | **`lg:` / `min-width:1024px` fires → desktop layout on touch portrait** |
| **1032** | **iPad Pro 13" M4 portrait** | Same as above |
| 1133–1194 | iPad mini / Air / Pro 11" landscape | Treated as "desktop" but still touch |
| 1366–1376 | Pro 12.9"/13" landscape | Real desktop-class space |

## Recommended bands

```
0–599      phone
600–1099   tablet portrait (+ iPad mini landscape just above)  → rail/drawer nav, 2–3 fluid columns
1100–1439  desktop / tablet landscape                           → persistent sidebar OK
1440+      wide                                                 → cap content with max-width
```

Always combine with container queries so a 1366px window with a 320px side panel doesn't give the main area a "wide" layout.

## Behaviors to remember

- iPadOS Safari defaults to desktop-class browsing (Mac-like UA). UA sniffing fails; use media features.
- With a trackpad or Magic Keyboard, `hover: hover` can be true on an iPad. Keep every interaction usable by tap.
- Split View sizes vary by device and orientation; test a continuous width sweep (e.g., every 8–16px from 320 to 1100), not just named devices.
- Retina DPR is 2: serve images for ~1.5–2× the layout width.
- Orientation changes fire `resize`; any JS layout logic must recompute.
