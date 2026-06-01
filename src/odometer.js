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
