(() => {
  const D = document, W = window;
  const $ = (s, c = D) => c.querySelector(s);

  // --- price helpers ---------------------------------------------------------
  function firstDollar(el) {
    if (!el) return NaN;
    const m = el.textContent.replace(/\s+/g, " ").match(/\$[\d,]*\.?\d+/g);
    if (!m || !m.length) return NaN;
    return parseFloat(m[0].replace(/[^\d.]/g, ""));
  }
  function lastDollar(el) {
    if (!el) return NaN;
    const m = el.textContent.replace(/\s+/g, " ").match(/\$[\d,]*\.?\d+/g);
    if (!m || !m.length) return NaN;
    return parseFloat(m[m.length - 1].replace(/[^\d.]/g, ""));
  }
  function findRows() {
    // Collect likely row elements (labels, radios, known blocks)
    const pool = [
      ...D.querySelectorAll(
        'label,[role="radio"],.purchase-option,.rc-option,.gh-subscribe-card,og-optin-button,[class*="subscribe"],[data-purchase-option]'
      )
    ];

    let oto = null, sub = null;
    for (const el of pool) {
      const t = (el.textContent || "").toLowerCase();
      if (!oto && /one[-\s]?time/.test(t)) oto = el;
      if (!sub && /(subscribe|subscription)/.test(t)) sub = el;
      if (oto && sub) break;
    }

    // Weak fallbacks (in case of custom markup)
    if (!oto)  oto = D.querySelector('[data-purchase-option="one_time"], [class*="one"][class*="time"]');
    if (!sub)  sub = D.querySelector('.gh-subscribe-card,[class*="subscribe"]');

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
  function readPercent(el) {
    if (!el) return NaN;
    const m = el.textContent.match(/(\d+)\s*%/);
    return m ? parseInt(m[1], 10) : NaN;
  }

  function getOtoPrice(row) {
    // OTO row typically has just one price → take the last occurrence
    let p = lastDollar(row);
    if (isNaN(p)) {
      // fallback to common price elements on PDP
      p = firstDollar($('.price-item--regular')) ||
          firstDollar($('.product__price, .product-price')) ||
          firstDollar(D);
    }
    return p;
  }

  function getSubPrice(row, fallbackOto) {
    // SUB row usually shows "discounted $first, original $last" → take FIRST
    let p = firstDollar(row);

    // If not present, compute from % off + OTO price
    if (isNaN(p)) {
      const off = readPercent(row);
      if (!isNaN(off) && isFinite(fallbackOto)) {
        p = +(fallbackOto * (1 - off / 100)).toFixed(2);
      }
    }
    return p;
  }

  // --- yotpo replace (only number) ------------------------------------------
  function setYotpoPoints(points) {
    const amt =
      $('.yotpo-product-points-widget-logged-in-view .yotpo-product-points-widget-points-amount') ||
      $('.yotpo-product-points-widget-points-amount');
    if (!amt || !isFinite(points)) return false;
    const current = parseInt(amt.textContent.replace(/[^\d]/g, ''), 10);
    if (current !== points) {
      amt.textContent = String(points);
      return true;
    }
    return false;
  }

  function compute() {
    const { oto, sub } = findRows();
    const subOn = isSubSelected(sub);

    const otoPrice = getOtoPrice(oto);
    const subPrice = getSubPrice(sub, otoPrice);

    const active = subOn ? subPrice : otoPrice;
    const points = isFinite(active) ? Math.floor(active) : NaN;

    return { subOn, otoPrice, subPrice, active, points };
  }

  function tick() {
    const c = compute();
    setYotpoPoints(c.points);
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

  // Debug: run __ppwYotpoDebug() in console
  W.__ppwYotpoDebug = function () {
    const c = compute();
    const shown =
      ($('.yotpo-product-points-widget-points-amount') || {}).textContent || null;
    return {
      subSelected: c.subOn,
      otoPrice: c.otoPrice,
      subPrice: c.subPrice,
      activePrice: c.active,
      pointsShown: shown
    };
  };
})();
