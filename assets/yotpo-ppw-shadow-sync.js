/* yotpo-ppw-shadow-sync.js
   Update only the points number based on the currently selected price.
   $4.80 => 4 points (no rounding up).
*/
(function () {
  // -------- helpers --------
  const $ = (s, r = document) => r.querySelector(s);

  const getText = (el) => {
    if (!el) return '';
    // og-price is a web component with open shadow root
    if (el.shadowRoot) return (el.shadowRoot.textContent || '').trim();
    return (el.textContent || '').trim();
  };

  const parseMoney = (txt) => {
    if (!txt) return NaN;
    const m = txt.replace(/\s+/g, ' ').match(/(\$|USD)?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
    return m ? parseFloat(m[2]) : NaN;
  };

  const firstNumber = (vals) => {
    for (const v of vals) if (!Number.isNaN(v)) return v;
    return NaN;
  };

  // Which option is selected? Look for a checked radio or aria-checked row
  const modeSelected = () => {
    const checked =
      $('input[type="radio"]:checked') ||
      $('[role="radio"][aria-checked="true"]');
    if (!checked) return 'one';
    const ctx = checked.closest('[role="radio"], .gh-subscribe-card, .one-time') || checked;
    const txt = (ctx.textContent || '').toLowerCase();
    return /subscribe|save/.test(txt) ? 'sub' : 'one';
  };

  // Try several places to read subscription price
  const readSubPrice = () =>
    firstNumber([
      parseMoney(getText($('og-price[subscription]'))),
      parseMoney(getText($('.gh-subscribe-card og-price[subscription]'))),
      parseMoney(getText($('[data-offer="subscription"]'))),
    ]);

  // Try several places to read one-time price
  const readOnePrice = () =>
    firstNumber([
      parseMoney(getText($('og-price.regular, og-price:not([subscription])'))),
      parseMoney(getText($('.one-time-purchase og-price'))),
      parseMoney(getText($('[data-offer="one-time"], .one-time-purchase'))),
    ]);

  const getActivePrice = () =>
    modeSelected() === 'sub' ? readSubPrice() : readOnePrice();

  // The Yotpo widget and the number span we will update
  const getWidgetAmountNode = () =>
    $('.yotpo-product-points-widget .yotpo-product-points-widget-points-amount');

  // -------- apply once & wire updates --------
  const apply = () => {
    const amtNode = getWidgetAmountNode();
    if (!amtNode) return; // widget not rendered yet
    const price = getActivePrice();
    if (!Number.isNaN(price)) {
      const points = Math.floor(price); // $4.80 -> 4
      // Only touch the number span
      if (amtNode.textContent !== String(points)) {
        amtNode.textContent = String(points);
      }
    }
  };

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }

  // Re-run on radio/offer changes
  document.addEventListener('change', (e) => {
    if (
      e.target.matches('input[type="radio"]') ||
      e.target.closest('[role="radio"]')
    ) {
      apply();
    }
  });

  // Re-run when price text changes anywhere in the PDP offer area
  const mo = new MutationObserver((muts) => {
    // cheap filter to avoid over-triggering
    if (muts.some(m => m.type === 'characterData' || m.type === 'childList')) apply();
  });
  mo.observe(document.body, { subtree: true, childList: true, characterData: true });

  // expose a tiny debug helper (optional)
  window.__ppwYotpoDebug = () => ({
    subSelected: modeSelected() === 'sub',
    activePrice: getActivePrice(),
    pointsShown: getWidgetAmountNode()?.textContent || null
  });
})();
