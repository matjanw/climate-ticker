/* Climate Ticker — embeddable Web Component. Defines <climate-ticker>.
 * Usage: <script src="climate-ticker.js"></script> then <climate-ticker></climate-ticker>
 * No external runtime deps; no network calls (all values are computed locally). */
(function () {
// ===== src/constants.js =====
// CarbonSurge — scientific constants.
// All figures are documented with the assumption that produced them so they
// can be audited or updated. Base SI units are kept consistent within each
// metric: carbon in kg of CARBON (not CO2), energy in kJ, temperature in °C.
window.CS_CONST = {
  // The cumulative baselines below are taken to be accurate as of this instant.
  // The live counters accrue forward from here at the per-second rates.
  START_EPOCH_MS: Date.UTC(2026, 0, 1, 0, 0, 0),

  // ---- CARBON (mass of carbon released by fossil-fuel burning, kg C) ----
  CARBON: {
    // 2024 emissions (fossil + land use) were 41.6 Gt CO2 = 11.3 Gt C/yr
    // (Global Carbon Budget 2024) -> 3.6e5 kg C/s.
    RATE_KG_PER_S: 3.6e5,
    // Cumulative since 1850 ~= 2,500 Gt CO2 ~= 700 Gt C (Global Carbon Budget 2024).
    BASELINE_KG: 7.0e14, // cumulative kg C since 1850, as of START_EPOCH
    // One full Exxon Valdez cargo was ~1.48M barrels (~200,000 t) of crude.
    // Crude is ~85% carbon by mass, so burning it releases ~170,000 t C.
    VALDEZ_KG: 1.7e8, // = 170,000 t C, the carbon embodied in one cargo
  },

  // ---- ENERGY (extra heat accumulated in the Earth system, kJ) ----
  ENERGY: {
    // Earth's energy imbalance reached ~1.37 W/m^2 in 2024. Over Earth's
    // surface (5.10e14 m^2) that is ~6.99e14 W = 6.99e11 kJ/s (~11 Hiroshima
    // bombs per second).
    RATE_KJ_PER_S: 6.99e11,
    BASELINE_KJ: 6.5e20, // cumulative kJ since 1850, as of START_EPOCH
    // 1 Little Boy ~ 15 kt TNT = 63 TJ = 6.3e13 J = 6.3e10 kJ.
    HIROSHIMA_KJ: 6.3e10,
  },

  // ---- TEMPERATURE (anomaly above 1850–1900 pre-industrial, °C) ----
  TEMP: {
    // 2025 anomaly: Berkeley Earth 1.44 °C, Copernicus/ERA5 1.47 °C;
    // long-term level ~1.4 °C. Anchored to BASE_YEAR.
    CURRENT_C: 1.44,
    BASE_YEAR: 2026,
    RATE_LOW: 0.2, // °C/decade — long-term (1970–2015) observed rate
    RATE_MID: 0.27, // °C/decade — a central recent-trend estimate
    RATE_HIGH: 0.35, // °C/decade — observed decade-to-2025 acceleration (Foster et al. 2026)
    // If ALL emissions stopped today, CO2-only warming roughly stabilises
    // (Zero Emissions Commitment ~0 ± 0.3 °C, IPCC AR6), but losing the aerosol
    // "mask" (~0.5 °C hidden) unmasks a few tenths more before plateauing.
    // Central committed rise above today ~0.2 °C (range ~0.0–0.5).
    COMMITTED_RISE_C: 0.2,
  },

  SEPARATOR_COLOUR: '#CCCCCC',
};


// ===== src/odometer.js =====
// CarbonSurge — mechanical reel engine.
// buildOdo(container, config) renders a row of digit reels and returns
// { update(value), height }. Reels are driven every frame from the true
// continuous value, so lower places roll fast and higher places roll only on
// carry — no per-reel transition tuning needed. Decimal reels are identical in
// size and colour to integer reels; only the separators differ (grey, 75%).
(function () {
  const C = window.CS_CONST;

  function buildOdo(container, config) {
    const {
      digits = 6,
      decimals = 0,
      fontSize = 34,
      colour = '#FFFFFF',
      containerWidth = 420,
    } = config;

    // Place weights, left -> right (integers then decimals).
    const weights = [];
    for (let i = digits - 1; i >= 0; i--) weights.push(Math.pow(10, i));
    for (let j = 1; j <= decimals; j++) weights.push(Math.pow(10, -j));

    // Build an ordered list of cells: reels with their weight, plus separators.
    const cells = [];
    for (let idx = 0; idx < digits; idx++) {
      const placeFromRight = digits - 1 - idx;
      cells.push({ type: 'reel', weight: weights[idx] });
      if (placeFromRight > 0 && placeFromRight % 3 === 0) {
        cells.push({ type: 'sep', char: ',' });
      }
    }
    if (decimals > 0) {
      cells.push({ type: 'sep', char: '.' });
      for (let j = 0; j < decimals; j++) {
        cells.push({ type: 'reel', weight: weights[digits + j] });
      }
    }

    // Auto-fit the font so the whole number fits the container width.
    const nReels = digits + decimals;
    const nSeps = cells.length - nReels;
    const DIGIT_W = 0.62; // width per digit, in em
    const SEP_W = 0.4; // width per separator, in em
    const budget = Math.max(120, containerWidth - 8);
    const fitSize = budget / (DIGIT_W * nReels + SEP_W * nSeps);
    const fs = Math.min(fontSize, fitSize);
    const cellH = Math.round(fs * 1.3);
    const digitW = Math.ceil(fs * DIGIT_W);
    const sepW = Math.ceil(fs * SEP_W);

    container.innerHTML = '';
    container.classList.add('cs-odo');
    container.style.height = cellH + 'px';

    const reels = [];
    cells.forEach((cell) => {
      if (cell.type === 'sep') {
        const sep = document.createElement('span');
        sep.className = 'cs-sep';
        sep.textContent = cell.char;
        sep.style.width = sepW + 'px';
        sep.style.height = cellH + 'px';
        sep.style.lineHeight = cellH + 'px';
        sep.style.color = C.SEPARATOR_COLOUR;
        sep.style.fontSize = Math.round(fs * 0.75) + 'px';
        container.appendChild(sep);
        return;
      }
      const reel = document.createElement('span');
      reel.className = 'cs-reel';
      reel.style.width = digitW + 'px';
      reel.style.height = cellH + 'px';
      const strip = document.createElement('span');
      strip.className = 'cs-strip';
      strip.style.color = colour;
      strip.style.fontSize = fs + 'px';
      for (let d = 0; d <= 10; d++) {
        const digit = document.createElement('span');
        digit.className = 'cs-digit';
        digit.style.height = cellH + 'px';
        digit.style.lineHeight = cellH + 'px';
        digit.textContent = String(d % 10);
        strip.appendChild(digit);
      }
      reel.appendChild(strip);
      container.appendChild(reel);
      reels.push({ strip, weight: cell.weight });
    });

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lastIndex = reels.length - 1;

    function update(value) {
      for (let k = 0; k < reels.length; k++) {
        const r = reels[k];
        let pos;
        if (k === lastIndex) {
          // Least-significant wheel rolls continuously.
          pos = (value / r.weight) % 10;
        } else {
          // Higher wheels stay crisp and only roll during carry, i.e. while
          // the wheel to their right is travelling from 9 to 0.
          const digit = Math.floor(value / r.weight) % 10;
          let right = (value / (r.weight / 10)) % 10;
          if (right < 0) right += 10;
          pos = digit + (right >= 9 ? right - 9 : 0);
        }
        if (pos < 0) pos += 10;
        if (reduceMotion) pos = Math.floor(pos); // snap instead of rolling
        r.strip.style.transform = 'translateY(' + -pos * cellH + 'px)';
      }
    }

    return { update, height: cellH };
  }

  window.CS_Odometer = { buildOdo };
})();


// ===== src/units.js =====
// CarbonSurge — unit switching.
// Three independent toggles. Each unit declares a `factor` from the metric's
// base unit (kg C, kJ, °C) plus how many decimals its reel should show.
(function () {
  const C = window.CS_CONST;

  const CARBON_UNITS = {
    kg: { id: 'kg', label: 'kg C', decimals: 0, factor: 1 },
    valdez: {
      id: 'valdez',
      label: 'Exxon Valdez loads',
      decimals: 3,
      factor: 1 / C.CARBON.VALDEZ_KG,
    },
  };

  const ENERGY_UNITS = {
    kj: { id: 'kj', label: 'kJ', decimals: 0, factor: 1 },
    hiroshima: {
      id: 'hiroshima',
      label: 'Hiroshima bombs',
      decimals: 0,
      factor: 1 / C.ENERGY.HIROSHIMA_KJ,
    },
  };

  const TEMP_UNITS = {
    c: { id: 'c', label: '°C', decimals: 2 },
    f: { id: 'f', label: '°F', decimals: 2 },
  };

  // value is in the metric's base unit (kg C, kJ, or °C of warming).
  function convert(value, metric, toUnit) {
    if (metric === 'carbon') return value * CARBON_UNITS[toUnit].factor;
    if (metric === 'energy') return value * ENERGY_UNITS[toUnit].factor;
    // Temperature is a delta (warming amount), so °F uses ×9/5 with no offset.
    if (metric === 'temp') return toUnit === 'f' ? (value * 9) / 5 : value;
    return value;
  }

  function formatLabel(metric, unit) {
    if (metric === 'carbon') return CARBON_UNITS[unit].label;
    if (metric === 'energy') return ENERGY_UNITS[unit].label;
    if (metric === 'temp') return TEMP_UNITS[unit].label;
    return '';
  }

  window.CS_Units = { convert, formatLabel, CARBON_UNITS, ENERGY_UNITS, TEMP_UNITS };
})();


// ===== src/projections.js =====
// CarbonSurge — temperature projections.
// Linear extrapolations from the present anomaly at three constant rates.
// These are illustrative "if the rate holds" lines, not IPCC SSP scenarios.
(function () {
  const C = window.CS_CONST;

  function calcProjections(currentTempC) {
    const T = C.TEMP;
    const at = (year, ratePerDecade) => {
      const decades = (year - T.BASE_YEAR) / 10;
      return currentTempC + ratePerDecade * decades;
    };
    const band = (year) => ({
      today: currentTempC,
      // If all emissions stopped today: CO2-only warming stabilises, but aerosol
      // unmasking adds a committed bump on top of today's level before plateauing.
      stopped: currentTempC + T.COMMITTED_RISE_C,
      low: at(year, T.RATE_LOW),
      mid: at(year, T.RATE_MID),
      high: at(year, T.RATE_HIGH),
    });
    return { y2050: band(2050), y2100: band(2100) };
  }

  window.CS_Proj = { calcProjections };
})();


// ===== src/app.js =====
// Climate Ticker — orchestration. Wires the three live odometers, the unit
// toggles, and the projections panel together, and runs the animation loop.
//
// init(root) runs the widget against a given DOM root, which is either the
// page `document` (standalone / iframe build) or a component `shadowRoot`
// (the <climate-ticker> Web Component). Everything is scoped to that root, so
// any number of instances can coexist on a page without clashing.
(function () {
  const C = window.CS_CONST;
  const U = window.CS_Units;
  const O = window.CS_Odometer;
  const P = window.CS_Proj;

  function init(root) {
  const state = { carbon: 'kg', energy: 'hiroshima', temp: 'c' };

  const els = {
    carbon: root.getElementById('carbon-odo'),
    energy: root.getElementById('energy-odo'),
    warming: root.getElementById('warming-odo'),
    proj: root.getElementById('proj-rows'),
  };
  const widgetEl = root.querySelector('.cs-widget');

  const SECONDS_PER_YEAR = 31556952; // mean Gregorian year
  const elapsedSeconds = () => (Date.now() - C.START_EPOCH_MS) / 1000;
  const carbonBaseKg = () => C.CARBON.BASELINE_KG + C.CARBON.RATE_KG_PER_S * elapsedSeconds();
  const energyBaseKj = () => C.ENERGY.BASELINE_KJ + C.ENERGY.RATE_KJ_PER_S * elapsedSeconds();

  // Live warming: present anomaly rising at the observed 0.27 °C/decade.
  const warmingRatePerSec = C.TEMP.RATE_MID / 10 / SECONDS_PER_YEAR;
  const baseYearStartMs = Date.UTC(C.TEMP.BASE_YEAR, 0, 1);
  const warmingC = () =>
    C.TEMP.CURRENT_C + warmingRatePerSec * ((Date.now() - baseYearStartMs) / 1000);
  const warmingDisplay = () => U.convert(warmingC(), 'temp', state.temp);

  const digitsFor = (v) => Math.max(1, Math.floor(Math.log10(Math.max(v, 1))) + 1);

  let carbonOdo = null;
  let energyOdo = null;
  let warmingOdo = null;

  function buildCarbon() {
    const u = U.CARBON_UNITS[state.carbon];
    carbonOdo = O.buildOdo(els.carbon, {
      digits: digitsFor(carbonBaseKg() * u.factor),
      decimals: u.decimals,
      fontSize: 36,
      colour: '#FF7A3C',
      containerWidth: els.carbon.clientWidth || 420,
    });
  }

  function buildEnergy() {
    const u = U.ENERGY_UNITS[state.energy];
    energyOdo = O.buildOdo(els.energy, {
      digits: digitsFor(energyBaseKj() * u.factor),
      decimals: u.decimals,
      fontSize: 36,
      colour: '#FFC24B',
      containerWidth: els.energy.clientWidth || 420,
    });
  }

  function buildWarming() {
    warmingOdo = O.buildOdo(els.warming, {
      digits: digitsFor(warmingDisplay()),
      decimals: 14, // enough places that the live rise is visible
      fontSize: 30,
      colour: '#F0666B',
      containerWidth: els.warming.clientWidth || 420,
    });
  }

  function renderProjections() {
    const proj = P.calcProjections(C.TEMP.CURRENT_C);
    const unit = state.temp;
    const sym = unit === 'f' ? '°F' : '°C';
    // Values are warming since 1850 (above pre-industrial), to one decimal —
    // these are illustrative lines, so two decimals would imply false precision.
    const fmt = (v) => U.convert(v, 'temp', unit).toFixed(1) + sym;
    // Scale runs from pre-industrial (0) so the famous Paris limits are anchors.
    const SCALE_MAX = 4.0; // °C above pre-industrial
    const pct = (v) => Math.max(0, Math.min(100, (v / SCALE_MAX) * 100));

    // Paris guardrails, drawn as dashed reference lines inside every bar.
    const PARIS = [1.5, 2.0];
    const grid = PARIS.map((t) => `<span class="cs-grid" style="left:${pct(t)}%"></span>`).join('');

    // A mini-axis above the groups labels where the Paris limits fall. The
    // empty name/value spacers keep its track aligned with the bars below.
    const axis = `
      <div class="cs-proj-axis">
        <span class="cs-proj-name"></span>
        <span class="cs-axis-track">
          ${PARIS.map((t) => `<span class="cs-axis-tick" style="left:${pct(t)}%">${t}&deg;C</span>`).join('')}
        </span>
        <span class="cs-proj-val"></span>
      </div>`;

    const groups = [['2050', proj.y2050], ['2100', proj.y2100]];
    const bar = (cls, name, value, w, title) => `
      <div class="cs-proj-line">
        <span class="cs-proj-name">${name}</span>
        <span class="cs-bar" aria-hidden="true"${title ? ` title="${title}"` : ''}>
          <span class="cs-fill ${cls}" style="width:${w}%"></span>${grid}
        </span>
        <span class="cs-proj-val ${cls === 'cs-fill-path' ? 'cs-val-path' : 'cs-val-stop'}">${value}</span>
      </div>`;

    els.proj.innerHTML =
      axis +
      groups
        .map(
          ([year, d]) => `
      <div class="cs-proj-group">
        <div class="cs-proj-year">By ${year}</div>
        ${bar('cs-fill-path', 'Current projection', fmt(d.mid), pct(d.mid), `Recent trend 0.27°C/decade. Range at 0.20–0.35: ${fmt(d.low)}–${fmt(d.high)}`)}
        ${bar('cs-fill-stop', 'Stop emissions today', fmt(d.stopped), pct(d.stopped), `If emissions stop today, warming settles near ${fmt(d.stopped)}`)}
      </div>`
        )
        .join('');
  }

  function frame() {
    if (carbonOdo) carbonOdo.update(carbonBaseKg() * U.CARBON_UNITS[state.carbon].factor);
    if (energyOdo) energyOdo.update(energyBaseKj() * U.ENERGY_UNITS[state.energy].factor);
    if (warmingOdo) warmingOdo.update(warmingDisplay());
    raf = requestAnimationFrame(frame);
  }

  let raf = null;
  const start = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  // ── Auto-resize: when embedded in an iframe, post our height to the host so
  //    it can size the frame to fit — no scrollbars, fully responsive. ───────
  const inIframe = typeof window !== 'undefined' && window.parent !== window;
  function postHeight() {
    if (!inIframe || !widgetEl) return;
    const h = Math.ceil(widgetEl.getBoundingClientRect().height);
    window.parent.postMessage({ type: 'climate-ticker:resize', height: h }, '*');
  }

  root.querySelectorAll('.cs-toggle').forEach((toggle) => {
    const metric = toggle.dataset.metric;
    const buttons = toggle.querySelectorAll('button');
    buttons.forEach((btn) => {
      const on = btn.dataset.unit === state[metric];
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.addEventListener('click', () => {
        state[metric] = btn.dataset.unit;
        buttons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        if (metric === 'carbon') buildCarbon();
        else if (metric === 'energy') buildEnergy();
        else {
          buildWarming();
          renderProjections();
        }
        postHeight();
      });
    });
  });

    buildCarbon();
    buildEnergy();
    buildWarming();
    renderProjections();
    start();

    // ── Responsive reels: when the widget's own width changes (e.g. switching
    //    between stacked and wide layouts), rebuild the odometers so the digits
    //    refit, then re-report height to any host iframe. ────────────────────
    let lastW = els.carbon ? els.carbon.clientWidth : 0;
    function refitIfResized() {
      const w = els.carbon ? els.carbon.clientWidth : 0;
      if (w && Math.abs(w - lastW) > 4) {
        lastW = w;
        buildCarbon();
        buildEnergy();
        buildWarming();
      }
      postHeight();
    }
    if (typeof ResizeObserver !== 'undefined' && widgetEl) {
      new ResizeObserver(() => refitIfResized()).observe(widgetEl);
    }
    root.querySelectorAll('details').forEach((d) =>
      d.addEventListener('toggle', postHeight)
    );
    postHeight();
  }

  // Expose for the Web Component (and any custom mount), then auto-mount on the
  // page when the standalone markup is present (index.html / widget.html).
  window.CS_App = { init };
  if (typeof document !== 'undefined' && document.getElementById('carbon-odo')) {
    init(document);
  }
})();


  var CSS = ":host{display:block}\n/* CarbonSurge — design tokens and layout. Sidebar-ready, max 420px. */\n:host {\n  --cs-bg: #0e1116;\n  --cs-panel: #161b22;\n  --cs-border: #232a33;\n  --cs-text: #e6edf3;\n  --cs-muted: #8b949e;\n  --cs-carbon: #ff7a3c;\n  --cs-energy: #ffc24b;\n  --cs-warm: #f0666b;\n  --cs-stop: #ffd60a;\n  --cs-track: #2a313b;\n}\n\n.cs-widget {\n  box-sizing: border-box;\n  width: 100%;\n  max-width: 720px;\n  margin: 0 auto;\n  padding: 18px;\n  background: var(--cs-bg);\n  color: var(--cs-text);\n  font-family: 'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, monospace;\n  border: 1px solid var(--cs-border);\n  border-radius: 14px;\n  /* The widget adapts to the width it is GIVEN (its own box), not the screen,\n     so it lays out correctly in a narrow sidebar or a wide footer alike. */\n  container-type: inline-size;\n  container-name: cs;\n}\n.cs-widget *,\n.cs-widget *::before,\n.cs-widget *::after {\n  box-sizing: border-box;\n}\n\n.cs-head {\n  margin: 0 0 14px;\n}\n.cs-title {\n  margin: 0 0 3px;\n  font-size: 15px;\n  font-weight: 700;\n  letter-spacing: 0.22em;\n  text-transform: uppercase;\n  background: linear-gradient(90deg, var(--cs-energy), var(--cs-carbon));\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n  -webkit-text-fill-color: transparent;\n}\n.cs-subtitle {\n  margin: 0;\n  font-size: 9.5px;\n  font-weight: 500;\n  letter-spacing: 0.16em;\n  text-transform: uppercase;\n  color: var(--cs-muted);\n}\n\n.cs-block {\n  padding: 14px;\n  margin-bottom: 12px;\n  background: var(--cs-panel);\n  border: 1px solid var(--cs-border);\n  border-radius: 10px;\n}\n\n.cs-counter {\n  display: flex;\n  align-items: stretch;\n  overflow: hidden;\n  white-space: nowrap;\n}\n\n/* Odometer reels (set inline for size/colour by the engine). */\n.cs-odo {\n  display: inline-flex;\n  align-items: stretch;\n  overflow: hidden;\n  font-variant-numeric: tabular-nums;\n}\n.cs-reel {\n  position: relative;\n  display: inline-block;\n  overflow: hidden;\n}\n.cs-strip {\n  position: absolute;\n  inset: 0 0 auto 0;\n  display: flex;\n  flex-direction: column;\n  font-weight: 700;\n  will-change: transform;\n}\n.cs-digit {\n  display: block;\n  text-align: center;\n}\n.cs-sep {\n  display: inline-block;\n  text-align: center;\n  align-self: flex-end;\n  font-weight: 700;\n}\n\n.cs-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  margin-top: 10px;\n}\n.cs-caption {\n  font-size: 11px;\n  line-height: 1.35;\n  color: var(--cs-muted);\n}\n\n/* Toggles */\n.cs-toggle {\n  display: inline-flex;\n  flex: none;\n  border: 1px solid var(--cs-border);\n  border-radius: 999px;\n  overflow: hidden;\n}\n.cs-toggle button {\n  appearance: none;\n  border: 0;\n  margin: 0;\n  padding: 5px 10px;\n  background: transparent;\n  color: var(--cs-muted);\n  font-family: inherit;\n  font-size: 10.5px;\n  white-space: nowrap;\n  cursor: pointer;\n}\n.cs-toggle button.active {\n  background: var(--cs-text);\n  color: var(--cs-bg);\n  font-weight: 700;\n}\n\n/* Projections */\n.cs-proj-head {\n  margin: 0 0 12px;\n  align-items: baseline;\n}\n.cs-proj-head h2 {\n  margin: 0;\n  font-size: 12px;\n  font-weight: 700;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--cs-muted);\n}\n.cs-proj-unit {\n  flex: none;\n  font-size: 9.5px;\n  color: var(--cs-muted);\n  opacity: 0.7;\n}\n/* Shared column geometry: [ name ] [ flexible bar ] [ value ] */\n.cs-proj-axis,\n.cs-proj-line {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n}\n.cs-proj-name {\n  flex: none;\n  width: 124px;\n  font-size: 10px;\n  line-height: 1.2;\n  white-space: nowrap;\n  color: var(--cs-muted);\n}\n.cs-proj-val {\n  flex: none;\n  width: 46px;\n  text-align: right;\n  font-size: 14px;\n  font-weight: 700;\n}\n.cs-val-path {\n  color: var(--cs-warm);\n}\n.cs-val-stop {\n  color: var(--cs-stop);\n}\n\n/* Mini-axis labelling the Paris limits above the bars */\n.cs-proj-axis {\n  margin-bottom: 8px;\n}\n.cs-axis-track {\n  position: relative;\n  flex: 1;\n  height: 11px;\n}\n.cs-axis-tick {\n  position: absolute;\n  top: 0;\n  transform: translateX(-50%);\n  font-size: 9px;\n  white-space: nowrap;\n  color: var(--cs-muted);\n}\n\n.cs-proj-group {\n  margin-bottom: 14px;\n}\n.cs-proj-group:last-of-type {\n  margin-bottom: 0;\n}\n.cs-proj-year {\n  margin-bottom: 6px;\n  font-size: 11px;\n  font-weight: 700;\n  letter-spacing: 0.04em;\n  color: var(--cs-text);\n}\n.cs-proj-line {\n  margin-bottom: 6px;\n}\n.cs-proj-line:last-child {\n  margin-bottom: 0;\n}\n.cs-bar {\n  position: relative;\n  flex: 1;\n  height: 9px;\n  border-radius: 999px;\n  background: var(--cs-track);\n}\n.cs-fill {\n  position: absolute;\n  left: 0;\n  top: 0;\n  bottom: 0;\n  border-radius: 999px;\n}\n.cs-fill-path {\n  background: linear-gradient(90deg, var(--cs-energy), var(--cs-warm));\n}\n.cs-fill-stop {\n  background: var(--cs-stop);\n}\n/* Paris 1.5°C / 2°C guide lines, sitting on top of the fill */\n.cs-grid {\n  position: absolute;\n  top: -2px;\n  bottom: -2px;\n  width: 0;\n  border-left: 1px dashed var(--cs-text);\n  opacity: 0.45;\n}\n.cs-proj-caption {\n  margin: 12px 0 0;\n  font-size: 9.5px;\n  line-height: 1.45;\n  color: var(--cs-muted);\n}\n.cs-proj-caption strong {\n  color: var(--cs-text);\n  font-weight: 700;\n}\n\n/* Expandable disclosures (native <details>) */\n.cs-disclosure {\n  margin-top: 12px;\n}\n.cs-disclosure > summary {\n  list-style: none;\n  cursor: pointer;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 10.5px;\n  color: var(--cs-muted);\n  transition: color 0.15s ease;\n}\n.cs-disclosure > summary::-webkit-details-marker {\n  display: none;\n}\n.cs-disclosure > summary::before {\n  content: '▸';\n  font-size: 9px;\n  transition: transform 0.15s ease;\n}\n.cs-disclosure[open] > summary::before {\n  transform: rotate(90deg);\n}\n.cs-disclosure > summary:hover {\n  color: var(--cs-text);\n}\n.cs-disclosure-body {\n  margin-top: 9px;\n  font-size: 10px;\n  line-height: 1.5;\n  color: var(--cs-muted);\n}\n.cs-disclosure[open] .cs-disclosure-body {\n  animation: cs-reveal 0.18s ease;\n}\n@keyframes cs-reveal {\n  from {\n    opacity: 0;\n    transform: translateY(-3px);\n  }\n  to {\n    opacity: 1;\n    transform: none;\n  }\n}\n\n/* Bottom \"About / sources\" link */\n.cs-foot {\n  margin-top: 14px;\n}\n.cs-foot .cs-disclosure-body p {\n  margin: 0 0 8px;\n}\n.cs-foot .cs-disclosure-body p:last-child {\n  margin-bottom: 0;\n}\n.cs-sources a {\n  color: var(--cs-carbon);\n  text-decoration: none;\n  border-bottom: 1px dotted currentColor;\n}\n.cs-sources a:hover {\n  color: var(--cs-energy);\n}\n\n/* ── Responsive: in a wide container, the three live counters sit side by\n   side (a short, wide banner). In a narrow one they stay stacked. Driven by\n   the widget's OWN width via a container query, so it works in any embed. ── */\n@container cs (min-width: 600px) {\n  .cs-metrics {\n    display: grid;\n    grid-template-columns: repeat(3, 1fr);\n    gap: 12px;\n    align-items: start;\n  }\n  .cs-metrics > .cs-block {\n    margin-bottom: 12px;\n  }\n  /* Narrow columns: stack the caption above its toggle instead of side-by-side. */\n  .cs-metrics .cs-row {\n    flex-direction: column;\n    align-items: flex-start;\n    gap: 8px;\n  }\n}\n\n/* Keyboard focus visibility (accessibility). */\n.cs-widget :focus-visible {\n  outline: 2px solid var(--cs-energy);\n  outline-offset: 2px;\n  border-radius: 4px;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .cs-disclosure[open] .cs-disclosure-body {\n    animation: none;\n  }\n}\n";
  var HTML = "<div class=\"cs-widget\" role=\"region\" aria-label=\"Climate Ticker — real-time climate counters\">\n      <header class=\"cs-head\">\n        <h1 class=\"cs-title\">Climate Ticker</h1>\n        <p class=\"cs-subtitle\">Real-time atmospheric dashboard</p>\n      </header>\n\n      <div class=\"cs-metrics\">\n        <section class=\"cs-block\">\n          <div class=\"cs-counter\" id=\"carbon-odo\" role=\"img\" aria-label=\"Carbon released since 1850, live counter\"></div>\n          <div class=\"cs-row\">\n            <span class=\"cs-caption\">Carbon released since 1850</span>\n            <div class=\"cs-toggle\" data-metric=\"carbon\" role=\"group\" aria-label=\"Carbon units\">\n              <button type=\"button\" data-unit=\"kg\">kg C</button>\n              <button type=\"button\" data-unit=\"valdez\">Valdez loads</button>\n            </div>\n          </div>\n        </section>\n\n        <section class=\"cs-block\">\n          <div class=\"cs-counter\" id=\"energy-odo\" role=\"img\" aria-label=\"Extra heat trapped since 1850, live counter\"></div>\n          <div class=\"cs-row\">\n            <span class=\"cs-caption\">Extra heat trapped since 1850</span>\n            <div class=\"cs-toggle\" data-metric=\"energy\" role=\"group\" aria-label=\"Energy units\">\n              <button type=\"button\" data-unit=\"kj\">kJ</button>\n              <button type=\"button\" data-unit=\"hiroshima\">Hiroshima bombs</button>\n            </div>\n          </div>\n        </section>\n\n        <section class=\"cs-block\">\n          <div class=\"cs-counter\" id=\"warming-odo\" role=\"img\" aria-label=\"Global warming since 1850, live counter\"></div>\n          <div class=\"cs-row\">\n            <span class=\"cs-caption\">Global warming since 1850</span>\n            <div class=\"cs-toggle\" data-metric=\"temp\" role=\"group\" aria-label=\"Temperature units\">\n              <button type=\"button\" data-unit=\"c\">°C</button>\n              <button type=\"button\" data-unit=\"f\">°F</button>\n            </div>\n          </div>\n        </section>\n      </div>\n\n      <section class=\"cs-block\">\n        <div class=\"cs-row cs-proj-head\">\n          <h2>Projected warming</h2>\n          <span class=\"cs-proj-unit\">since 1850</span>\n        </div>\n        <div id=\"proj-rows\"></div>\n        <p class=\"cs-proj-caption\">\n          Dashed lines mark the <strong>1.5&deg;C</strong> and <strong>2&deg;C</strong>\n          Paris limits. Even if emissions stopped now, ~0.2&deg;C more is locked in\n          as cooling aerosols fade.\n        </p>\n      </section>\n\n      <details class=\"cs-disclosure cs-foot\">\n        <summary>About these figures &amp; sources</summary>\n        <div class=\"cs-disclosure-body\">\n          <p>\n            Counters accrue from cumulative totals since 1850 at present-day\n            rates: carbon ~360,000&nbsp;kg&nbsp;C/s (41.6&nbsp;Gt&nbsp;CO<sub>2</sub>/yr);\n            excess heat ~6.99&times;10<sup>11</sup>&nbsp;kJ/s (Earth&rsquo;s energy\n            imbalance ~1.37&nbsp;W/m&sup2;, &asymp;11 Hiroshima bombs per second).\n            Warming rises ~0.27&deg;C/decade from ~1.44&deg;C today.\n          </p>\n          <p>\n            &ldquo;Stop today&rdquo; reflects committed warming: CO<sub>2</sub>-only\n            warming roughly stabilises (Zero Emissions Commitment ~0&plusmn;0.3&deg;C,\n            IPCC AR6), but losing the ~0.5&deg;C of aerosol &ldquo;masking&rdquo;\n            unmasks a few tenths more. Lines are constant-rate extrapolations &mdash;\n            illustrative, not IPCC scenarios.\n          </p>\n          <p class=\"cs-sources\">\n            Sources:\n            <a href=\"https://globalcarbonbudget.org/\" target=\"_blank\" rel=\"noopener\">Global Carbon Budget 2024</a> &middot;\n            <a href=\"https://www.ipcc.ch/report/ar6/wg1/\" target=\"_blank\" rel=\"noopener\">IPCC AR6 WG1</a> &middot;\n            <a href=\"https://berkeleyearth.org/global-temperature-report-for-2024/\" target=\"_blank\" rel=\"noopener\">Berkeley Earth</a>\n          </p>\n        </div>\n      </details>\n    </div>";
  var FONT = "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap";

  function ensureFont() {
    if (!document.querySelector("link[data-climate-ticker-font]")) {
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = FONT;
      l.setAttribute("data-climate-ticker-font", "");
      document.head.appendChild(l);
    }
  }

  class ClimateTicker extends HTMLElement {
    connectedCallback() {
      if (this._mounted) return;
      this._mounted = true;
      ensureFont();
      const shadow = this.attachShadow({ mode: "open" });
      shadow.innerHTML = "<style>" + CSS + "</style>" + HTML;
      window.CS_App.init(shadow);
    }
  }
  if (!customElements.get("climate-ticker")) {
    customElements.define("climate-ticker", ClimateTicker);
  }
})();
