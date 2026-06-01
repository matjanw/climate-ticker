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
