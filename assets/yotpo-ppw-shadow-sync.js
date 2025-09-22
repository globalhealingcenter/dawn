/* yotpo-ppw-shadow-sync.js
   Update ONLY the number in the Yotpo points widget based on selected price.
   Rule: $4.80 → 4 points (floor). Keeps all Yotpo copy/links intact.
*/
(function () {
  const $ = (s, r = document) => r.querySelector(s);

  // --- helpers ---------------------------------------------------------------
  const getText = (el) => {
    if (!el) return '';
    if (el.shadowRoot) return (el.shadowRoot.textContent || '').trim();
    return (el.textContent || '').trim();
  };
  const parseMoney = (txt) => {
    if (!txt) return NaN;
    const m = txt.replace(/\s+/g, ' ').match(/([0-9]+(?:\.[0-9]{1,2})?)/);
    return m ? parseFloat(m[1]) : NaN;
  };
  const firstNumber = (vals) => { for (const v of vals) if (!Number.isNaN(v)) return v; return NaN; };

  // --- selection detection (fixed) ------------------------------------------
  const isSubSelected = () => {
    // 1) Try the subscribe web component directly (open shadow root)
    const subHost = $('og-optin-button.gh-subscribe-card');
    if (subHost) {
      if (subHost.hasAttribute('subscribed')) return true;
      if (subHost.getAttribute('aria-checked') === 'true') return true;
      // check its internal radio
      if (subHost.shadowRoot &&
          subHost.shadowRoot.querySelector('input[type="radio"]:checked')) return true;
    }

    // 2) If the One-Time row's radio is checked, then subscribe is NOT selected
    const oneRow = [...document.querySelectorAll('div,section,li')].find(el =>
      /one[\s-]?time\s+purchase/i.test(el.textContent || '')
    );
    if (oneRow && oneRow.querySelector('input[type="radio"]:checked')) return false;

    // 3) Fallback: if a subscription price exists and One-Time isn’t explicitly checked,
    // assume subscribe is selected.
    if (!oneRow && $('og-price[subscription]')) return true;

    return false;
  };

  // --- price readers ---------------------------------------------------------
  const readSubPrice = () =>
    firstNumber([
      parseMoney(getText($('og-optin-button.gh-subscribe-card og-price[subscription]'))),
      parseMoney(getText($('og-price[subscription]'))),
    ]);

  const readOneTimePrice = () => {
    const row = [...document.querySelectorAll('div,section,li')].find(el =>
      /one[\s-]?time\s+purchase/i.test(el.textContent || '')
    ) || null;

    return firstNumber([
      parseMoney(getText(row)),
      parseMoney(getText($('og-price.regular, og-price:not([subscription])'))),
    ]);
  };

  const getActivePrice = () => (isSubSelected() ? readSubPrice() : readOneTimePrice());

  // --- yotpo number writer ---------------------------------------------------
  const setPointsNumber = (points) => {
    const widget = $('.yotpo-product-points-widget');
    if (!widget) return false;

    const amt = widget.querySelector('.yotpo-product-points-widget-points-amount');
    if (amt) {
      if (amt.textContent.trim() !== String(points)) amt.textContent = String(points);
      return true;
    }
    // fallback: replace first number in the link’s HTML (preserves copy/links)
    const link = widget.querySelector('.yotpo-product-points-widget-link') || widget;
    const html = link.innerHTML;
    const newHtml = html.replace(/\b\d+\b/, String(points));
    if (newHtml !== html) link.innerHTML = newHtml;
    return true;
  };

  // --- apply (throttled) -----------------------------------------------------
  let raf = 0;
  const apply = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const price = getActivePrice();
      if (!Number.isNaN(price)) setPointsNumber(Math.floor(price));
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }

  // re-run on user interactions and DOM updates
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[type="radio"]') || e.target.closest('.gh-subscribe-card')) apply();
  });
  const mo = new MutationObserver(() => apply());
  mo.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['subscribed', 'aria-checked']
  });

  // tiny debugger
  window.__ppwYotpoDebug = () => ({
    subSelected: isSubSelected(),
    activePrice: getActivePrice(),
    pointsShown:
      document.querySelector('.yotpo-product-points-widget .yotpo-product-points-widget-points-amount')
        ?.textContent || null
  });
})();
