/* YOTPO PDP points sync (no flicker, shadow-root safe)
   - Shows floor(price) points
   - Switches when the user toggles One-Time vs Subscribe
   - Reads prices only from <og-price> hosts (ignores dates/timestamps)
*/
(() => {
  const $ = (s, r = document) => r.querySelector(s);

  // Find the number-only span Yotpo renders (we'll only touch this)
  const findPointsSpan = () =>
    document.querySelector('.yotpo-product-points-widget-points-amount');

  // Read visible price text from an <og-price> host (supports open shadow roots)
  function priceFromOg(og) {
    if (!og) return null;
    const root = og.shadowRoot || og;
    const txt = (root.textContent || '').trim();

    // Prefer a $-tagged price; fall back to a decimal price; ignore long integers (timestamps)
    let m = txt.match(/\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+\.[0-9]{1,2})/);
    if (!m) m = txt.match(/([0-9]+\.[0-9]{1,2})/); // fallback (no $), still decimal-only
    if (!m) return null;

    const val = parseFloat(m[1].replace(/,/g, ''));
    return isFinite(val) ? val : null;
  }

  // Grab both prices from the subscribe card (it contains both regular + subscription)
  function readPrices() {
    const subCard = $('og-optin-button.gh-subscribe-card') || $('.gh-subscribe-card');
    const subOg = subCard ? $('og-price[subscription]', subCard) : $('og-price[subscription]');
    const regOg = subCard ? $('og-price[regular]', subCard) : $('og-price[regular]');

    return {
      subscription: priceFromOg(subOg),
      onetime: priceFromOg(regOg)
    };
  }

  // Heuristics to detect if Subscribe is the active choice
  function isSubscribeSelected() {
    // Common ARIA / input / host-attribute signals; try a few
    if ($('.gh-subscribe-card [aria-checked="true"]')) return true;
    if ($('.gh-subscribe-card input[type="radio"]:checked')) return true;
    if ($('og-optin-button.gh-subscribe-card[checked]')) return true;
    if ($('og-optin-button.gh-subscribe-card[active]')) return true;
    return false;
  }

  let lastPoints = null;

  function setPoints(n) {
    const span = findPointsSpan();
    if (!span) return;
    const next = String(n);
    if (span.textContent !== next) span.textContent = next;
  }

  function update() {
    const ptsSpan = findPointsSpan();
    if (!ptsSpan) return; // Yotpo not rendered yet

    const prices = readPrices();
    const subSelected = isSubscribeSelected();

    // Choose active price
    const active =
      (subSelected && prices.subscription) ||
      prices.onetime ||         // fall back
      prices.subscription ||    // last resort
      null;

    if (active == null) return;
    const points = Math.floor(active);
    if (points !== lastPoints) setPoints(points);
    lastPoints = points;
  }

  function attach() {
    // Initial run (after Yotpo & pricing render)
    const kickoff = () => setTimeout(update, 50);
    kickoff();

    // Re-run on obvious interaction points
    document.addEventListener('click', (e) => {
      if (
        e.target.closest('.gh-subscribe-card') ||
        e.target.closest('[role="radio"]') ||
        e.target.closest('input[type="radio"]')
      ) {
        setTimeout(update, 80);
      }
    }, true);

    document.addEventListener('change', (e) => {
      if (e.target.matches('input[type="radio"], select')) {
        setTimeout(update, 80);
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }

  // Simple debug hook you can call in console: __ppwYotpoDebug()
  window.__ppwYotpoDebug = () => {
    const p = readPrices();
    return {
      subSelected: isSubscribeSelected(),
      prices: p,
      pointsShown: findPointsSpan()?.textContent || null
    };
  };
})();
