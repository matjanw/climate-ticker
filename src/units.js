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
