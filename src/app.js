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
        <span class="cs-bar"${title ? ` title="${title}"` : ''}>
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

  root.querySelectorAll('.cs-toggle').forEach((toggle) => {
    const metric = toggle.dataset.metric;
    const buttons = toggle.querySelectorAll('button');
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.unit === state[metric]);
      btn.addEventListener('click', () => {
        state[metric] = btn.dataset.unit;
        buttons.forEach((b) => b.classList.toggle('active', b === btn));
        if (metric === 'carbon') buildCarbon();
        else if (metric === 'energy') buildEnergy();
        else {
          buildWarming();
          renderProjections();
        }
      });
    });
  });

    buildCarbon();
    buildEnergy();
    buildWarming();
    renderProjections();
    start();
  }

  // Expose for the Web Component (and any custom mount), then auto-mount on the
  // page when the standalone markup is present (index.html / widget.html).
  window.CS_App = { init };
  if (typeof document !== 'undefined' && document.getElementById('carbon-odo')) {
    init(document);
  }
})();
