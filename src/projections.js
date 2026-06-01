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
