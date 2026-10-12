#!/usr/bin/env python3
"""Responsive audit: render a page across a width sweep + named phone/iPad viewports,
save screenshots, and report layout problems (esp. iPad portrait band).

Usage:
  python responsive_audit.py page.html --out audit/
  python responsive_audit.py http://localhost:3000 --out audit/ --engine webkit

Requires: pip install playwright --break-system-packages && playwright install webkit chromium
Falls back to Chromium if WebKit is unavailable (and says so in the report).
"""
import argparse
import json
import sys
from pathlib import Path

NAMED = [
    # name, width, height, touch
    ("phone-320", 320, 640, True),
    ("iphone-390", 390, 844, True),
    ("iphone-430", 430, 932, True),
    ("ipad-mini-portrait-744", 744, 1133, True),
    ("ipad-9-portrait-810", 810, 1080, True),
    ("ipad-air11-portrait-820", 820, 1180, True),
    ("ipad-pro11-portrait-834", 834, 1194, True),
    ("ipad-pro12.9-air13-portrait-1024", 1024, 1366, True),
    ("ipad-pro13-m4-portrait-1032", 1032, 1376, True),
    ("ipad-mini-landscape-1133", 1133, 744, True),
    ("ipad-air11-landscape-1180", 1180, 820, True),
    ("ipad-pro11-landscape-1194", 1194, 834, True),
    ("ipad-pro12.9-landscape-1366", 1366, 1024, True),
    ("desktop-1440", 1440, 900, False),
]

JS_CHECK = r"""
() => {
  const vw = document.documentElement.clientWidth;
  const doc = document.documentElement;
  const out = {
    viewportMeta: !!document.querySelector('meta[name="viewport"]'),
    clientWidth: vw,
    scrollWidth: Math.max(doc.scrollWidth, document.body ? document.body.scrollWidth : 0),
    overflowers: [], smallTargets: [], smallInputs: [], tinyText: 0
  };
  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.classList && el.classList.length) s += '.' + [...el.classList].slice(0, 3).join('.');
    return s;
  };
  const all = [...document.querySelectorAll('body *')];
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    // ignore elements inside an intentional horizontal scroller
    let p = el.parentElement, scrolled = false;
    while (p && p !== document.body) {
      const ps = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(ps.overflowX) && p.scrollWidth > p.clientWidth + 1 || /(auto|scroll)/.test(ps.overflowX)) { scrolled = true; break; }
      p = p.parentElement;
    }
    if (!scrolled && cs.position !== 'fixed' && (r.right > vw + 1 || r.left < -1)) {
      out.overflowers.push({ el: sel(el), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) });
    }
    const tag = el.tagName;
    if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(tag) || el.getAttribute('role') === 'button') {
      if ((r.width < 40 || r.height < 40) && !(tag === 'A' && cs.display === 'inline')) {
        out.smallTargets.push({ el: sel(el), w: Math.round(r.width), h: Math.round(r.height) });
      }
    }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) && parseFloat(cs.fontSize) < 16) {
      out.smallInputs.push({ el: sel(el), fontSize: cs.fontSize });
    }
    if (el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(cs.fontSize) < 12) {
      out.tinyText++;
    }
  }
  out.overflowers = out.overflowers.slice(0, 8);
  out.smallTargets = out.smallTargets.slice(0, 8);
  out.smallInputs = out.smallInputs.slice(0, 5);
  return out;
}
"""


def to_url(target: str) -> str:
    if target.startswith(("http://", "https://", "file://")):
        return target
    return Path(target).resolve().as_uri()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("target")
    ap.add_argument("--out", default="audit")
    ap.add_argument("--engine", choices=["webkit", "chromium"], default="webkit")
    ap.add_argument("--step", type=int, default=16, help="width sweep step in px (320..1440)")
    ap.add_argument("--no-screens", action="store_true", help="skip screenshots")
    args = ap.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("Install playwright: pip install playwright --break-system-packages && playwright install webkit chromium")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    url = to_url(args.target)
    report = {"engine": None, "named": [], "sweep_failures": [], "summary": []}

    with sync_playwright() as p:
        engine = args.engine
        try:
            browser = getattr(p, engine).launch()
        except Exception as e:  # engine not installed
            if engine == "webkit":
                print(f"[warn] WebKit unavailable ({e.__class__.__name__}); falling back to Chromium. "
                      "Safari-specific quirks (dvh, safe-area, text-size-adjust) will NOT be reproduced.")
                engine = "chromium"
                browser = p.chromium.launch()
            else:
                raise
        report["engine"] = engine

        def run(width, height, touch):
            ctx = browser.new_context(viewport={"width": width, "height": height},
                                      has_touch=touch, device_scale_factor=2 if touch else 1)
            page = ctx.new_page()
            page.goto(url, wait_until="networkidle")
            res = page.evaluate(JS_CHECK)
            return ctx, page, res

        # 1) Named devices
        for name, w, h, touch in NAMED:
            ctx, page, res = run(w, h, touch)
            hscroll = res["scrollWidth"] > res["clientWidth"] + 1
            entry = {"name": name, "w": w, "h": h, "hscroll": hscroll,
                     "scrollWidth": res["scrollWidth"], **{k: res[k] for k in
                     ("viewportMeta", "overflowers", "smallTargets", "smallInputs", "tinyText")}}
            report["named"].append(entry)
            if not args.no_screens:
                page.screenshot(path=str(out / f"{name}.png"), full_page=False)
            ctx.close()

        # 2) Continuous sweep (catches Split View / Stage Manager widths)
        for w in range(320, 1441, args.step):
            ctx, page, res = run(w, 900, True)
            if res["scrollWidth"] > res["clientWidth"] + 1:
                report["sweep_failures"].append({"width": w, "scrollWidth": res["scrollWidth"],
                                                 "offenders": res["overflowers"][:3]})
            ctx.close()
        browser.close()

    # Summary
    s = report["summary"]
    if not report["named"][0]["viewportMeta"]:
        s.append("CRITICAL: missing <meta name=viewport>; iPad Safari will lay out at ~980px and scale down.")
    for e in report["named"]:
        if e["hscroll"]:
            s.append(f"OVERFLOW at {e['name']} ({e['w']}px): scrollWidth {e['scrollWidth']}")
    if report["sweep_failures"]:
        ws = [f["width"] for f in report["sweep_failures"]]
        s.append(f"Horizontal overflow in sweep at widths: {ws[:12]}{'…' if len(ws) > 12 else ''}")
    tablet = [e for e in report["named"] if 744 <= e["w"] <= 1032 and e["h"] > e["w"]]
    for e in tablet:
        if e["smallTargets"]:
            s.append(f"Small tap targets at {e['name']}: {e['smallTargets'][:3]}")
        if e["smallInputs"]:
            s.append(f"Inputs < 16px (iOS focus-zoom) at {e['name']}: {e['smallInputs'][:2]}")
    if not s:
        s.append("No overflow, viewport, or tap-target problems detected.")
    s.append("Reminder: inspect the iPad portrait screenshots (744/820/834/1024/1032) for cramped columns; "
             "automated checks cannot judge visual balance.")

    (out / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"Engine: {report['engine']}")
    print("\n".join(f"- {line}" for line in s))
    print(f"\nFull report: {out / 'report.json'}" + ("" if args.no_screens else f" | screenshots in {out}/"))


if __name__ == "__main__":
    main()
