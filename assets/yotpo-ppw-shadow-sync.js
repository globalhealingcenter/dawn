(() => {
  const D = document, W = window;

  // Tiny helpers
  const $ = (s, c = D) => c.querySelector(s);

  // Pull a $xx.xx number out of a row’s text. Takes the last $ in the row.
  function getPriceFromRow(row) {
    if (!row) return NaN;
    const m = row.textContent.replace(/\s+/g, ' ').match(/\$[\d,]*\.?\d+/g);
    if (!m || !m.length) return NaN;
    return parseFloat(m[m.length - 1].replace(/[^\d.]/g, ''));
  }

  // Find the two rows by their text (works across themes)
  function findRows() {
    // Consider common containers that act like the radio rows
    const candidates = [
      ...D.querySelectorAll(
        'label, [role="radio"], .purchase-option, .rc-option, .gh-subscribe-card, og-optin-button'
      )
    ];
    let oto = null, sub = null;

    for (const el of candidates) {
      const t = (el.textContent || '').toLowerCase();
      if (!oto && /one[-\s]?time/.test(t)) oto = el;
      if (!sub && /(subscribe|subscription)/.test(t)) sub = el;
      if (oto && sub) break;
    }

    // Weak fallbacks
    if (!sub) sub = D.querySelector('.gh-subscribe-card, [class*="subscribe"]');
    if (!oto)  oto = D.querySelector('[class*="one"][class*="time"], [data-purchase-option="one_time"]');

    return { oto, sub };
  }

  function isSubSelected(subRow) {
    if (!subRow) return false;
    const input = subRow.querySelector('input[type="radio"]');
    if (input) return !!input.checked;
    const aria = subRow.getAttribute('aria-checked');
    if (aria != null) return aria === 'true';
    return /\b(selected|active|is-selected)\b/.test(subRow.className);
  }

  function computePoints() {
    const { oto, sub } = findRows();
    const subOn = isSubSelected(sub);
    const price = subOn ? getPriceFromRow(sub) : getPriceFromRow(oto);
    const points = isFinite(price) ? Math.floor(price) : NaN; // $4.80 => 4
    return { subOn, price, points };
  }

  // Write only the number, preserve Yotpo’s markup/links to avoid flicker
  function setYotpoPoints(p) {
    const amtEl =
      $('.yotpo-product-points-widget-logged-in-view .yotpo-product-points-widget-points-amount') ||
      $('.yotpo-product-points-widget-points-amount');

    if (!amtEl || !isFinite(p)) return false;

    const current = parseInt(amtEl.textContent.replace(/[^\d]/g, ''), 10);
    if (current !== p) {
      amtEl.textContent = String(p);
      return true;
    }
    return false;
  }

  function tick() {
    const { points } = computePoints();
    setYotpoPoints(points);
  }

  // Observe minimal mutations that reflect option/price changes
  let mo;
  function start() {
    tick();

    if (mo) mo.disconnect();
    mo = new MutationObserver(() => tick());
    mo.observe(D.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'aria-checked', 'checked']
    });

    D.addEventListener('change', tick, true);
  }

  if (D.readyState !== 'loading') start();
  else D.addEventListener('DOMContentLoaded', start);

  // Debug helper: run __ppwYotpoDebug() in console
  W.__ppwYotpoDebug = function () {
    const { subOn, price, points } = computePoints();
    const shown =
      ($('.yotpo-product-points-widget-points-amount') || {}).textContent || null;
    return { subSelected: subOn, activePrice: price, pointsShown: shown };
  };
})();
