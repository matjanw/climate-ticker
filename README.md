# Climate Ticker

A compact, self-contained, dependency-free widget that shows, in real time, the
carbon released and excess heat accumulated by the climate system since 1850,
plus projected warming for 2050 and 2100. Built to drop into any page or footer
(max-width 420px). No tracking, no cookies, no network calls — every value is
computed client-side.

## Artifacts (run `node build.js` to regenerate)

| File | Use it for |
| --- | --- |
| `climate-ticker.js` | **Web Component.** `<script>` + `<climate-ticker></climate-ticker>`. Shadow-DOM isolated. |
| `widget.html` | **Standalone page.** Host it and embed via `<iframe>`. One remote font link. |
| `embed.html` | Demo / landing page with a live preview and copy-paste snippets. |
| `index.html` | Dev/master page that loads `src/*` separately. |

## Embedding

**Web Component (recommended):**
```html
<script src="https://cdn.jsdelivr.net/gh/matjanw/climate-ticker@1.0.0/climate-ticker.js"></script>
<climate-ticker></climate-ticker>
```
Styles are sealed in a Shadow DOM, so it never clashes with the host page.
Re-theme from outside with CSS variables:
```css
climate-ticker { --cs-bg: #fff; --cs-text: #111; }
```

**iframe (simplest, great for CMS footers):**
```html
<iframe src="https://matjanw.github.io/climate-ticker/widget.html"
        width="420" height="640" loading="lazy"
        style="border:0;max-width:100%"
        title="Climate Ticker — real-time climate counters"></iframe>
```

**Hosting & pinning:** push to GitHub → served free via jsDelivr
(`cdn.jsdelivr.net/gh/matjanw/climate-ticker@TAG/…`) or GitHub Pages. Pin a version tag so
embeds never break; optionally add a Subresource Integrity hash
(`integrity="sha384-…" crossorigin="anonymous"`).

## Develop / preview locally

```sh
node build.js                  # regenerate climate-ticker.js + widget.html
python3 -m http.server 4178
# open http://localhost:4178/embed.html   (or index.html / widget.html)
```

## Source

| File | Purpose |
| --- | --- |
| `src/constants.js` | All scientific constants, each documented with its assumption. |
| `src/odometer.js` | Mechanical reel engine (`buildOdo`). |
| `src/units.js` | The three independent unit toggles. |
| `src/projections.js` | 2050 / 2100 warming projections. |
| `src/app.js` | Orchestration. Exposes `CS_App.init(root)` so the widget can mount against `document` (standalone) or a `shadowRoot` (Web Component). |
| `src/style.css` | Design tokens (`--cs-*`) and layout. |

## The numbers

**Carbon** — base unit kg of carbon (not CO₂).
- Rate ~360,000 kg C/s (41.6 Gt CO₂/yr); ~700 Gt C cumulative since 1850.
- 1 *Exxon Valdez load* = the carbon released by burning one full cargo
  (~200,000 t crude × ~85% C ≈ 170,000 t C = 1.7×10⁸ kg C).

**Energy** — base unit kJ (excess heat in the Earth system).
- Rate 6.99×10¹¹ kJ/s (Earth's energy imbalance ~1.37 W/m², 2024); ~6.5×10²⁰ kJ since 1850.
- 1 *Hiroshima bomb* = 63 TJ = 6.3×10¹⁰ kJ → **~11 bombs per second**.

**Temperature** — warming above the 1850–1900 pre-industrial baseline.
- Live counter rises from the present anomaly (~1.44 °C) at 0.27 °C/decade.
- Projections show two futures per horizon year: **Current path** (recent
  0.27 °C/decade trend; range 0.20–0.35) and **If we stop now** (committed
  warming, ~+0.2 °C above today as cooling aerosols fade). Bars are anchored to
  the 1.5 °C and 2 °C Paris limits. °C↔°F is a delta conversion (×9/5, no offset).
  Illustrative extrapolations, not IPCC scenarios.

Sources are linked inside the widget ("About these figures & sources").
To update any figure, edit `src/constants.js` and re-run `node build.js`.
