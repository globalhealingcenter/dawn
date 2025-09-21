/* Yotpo Dynamic Points (subscription-aware, shadowRoot safe)
   Shows floor(price) points for One-Time or Subscribe selection.
   Reads <og-price> values from shadowRoot; falls back to "Save XX%".
*/

(function () {
  const log = (...a) => console.debug('[points]', ...a);
  const $ = (s, r = document) => r.querySelector(s);

  // ---------- Parse money from <og-price> shadow root ----------
  function parseShadowMoney(el) {
    if (!el || !el.shadowRoot) return NaN;
    const txt = (el.shadowRoot.textContent || '').replace(/,/g, '');
    const m = txt.match(/(\d+(?:\.\d{1,2})?)/);
    return m ? parseFloat(m[1]) : NaN;
  }

  // ---------- Base (one-time) price ----------
  function getOneTimePrice() {
    // Prefer the pre-discount price element
    let n = parseShadowMoney($('og-price.gh--pre-discount-price'));
    if (isFinite(n)) return n;

    // Fallback: read number near the “One-Time Purchase” row
    const row = [...document.querySelectorAll('*')]
      .find(n => /one[-\s]?time purchase/i.test(n?.textContent || ''));
    if (row) {
      const m = (row.parentElement?.textContent || row.textContent || '').replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/);
      if (m) n = parseFloat(m[1]);
    }
    return isFinite(n) ? n : NaN;
  }

  // ---------- Subscription price ----------
  function getSubscribePrice() {
    // 1) Try the price inside the subscribe card
    let n = parseShadowMoney($('.gh-subscribe-card og-price')) ||
            parseShadowMoney($('og-price[subscription]'));
    if (isFinite(n)) return n;

    // 2) Fallback: derive from one-time and “Save XX%”
    const pctMatch = ($('.gh-subscribe-card')?.textContent || '').match(/save\s*(\d+)\s*%/i);
    const base = getOneTimePrice();
    if (pctMatch && isFinite(base)) {
      const pct = parseInt(pctMatch[1], 10);
      n = base * (1 - pct / 100);
    }
    return isFinite(n) ? n : NaN;
  }

  // ---------- Is subscribe selected? (multiple signals) ----------
  function isSubscribeSelected() {
    const card = $('.gh-subscribe-card');
    if (!card) return false;

    // Common states
    if (card.matches('.selected,.active,[selected],[aria-pressed="true"],[aria-checked="true"]')) return true;

    const radio = card.querySelector('input[type="radio"],input[role="radio"]');
    if (radio && (radio.checked || radio.getAttribute('aria-checked') === 'true')) return true;

    if (card.hasAttribute('subscribed')) return true;

    // If the One-Time row itself looks selected, invert
    const one = [...document.querySelectorAll('*')].find(n => /one[-\s]?time purchase/i.test(n.textContent || ''));
    if (one && one.closest('.selected,.active')) return false;

    return false;
  }

  function setPoints(val) {
    const span = $('.yotpo-product-points-widget-points-amount');
    if (span && isFinite(val)) span.textContent = String(Math.floor(val));
  }

  function render() {
    const ptsEl = $('.yotpo-product-points-widget-points-amount');
    if (!ptsEl) return log('Yotpo span not ready');

    const base = getOneTimePrice();
    const sub  = getSubscribePrice();
    const useSub = isSubscribeSelected();

    log('prices', { base, sub, useSub });

    let price = base;
    if (useSub && isFinite(sub)) price = sub;

    if (isFinite(price)) setPoints(price);
    else log('no price available');
  }

  // Wait for the Yotpo span, then attach listeners
  function boot(start = Date.now()) {
    if ($('.yotpo-product-points-widget-points-amount')) {
      render();

      // Update on interactions and DOM changes
      ['click', 'change', 'input'].forEach(ev =>
        document.addEventListener(ev, () => setTimeout(render, 0), true)
      );

      const mo = new MutationObserver(() => setTimeout(render, 0));
      mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });

      // Safety passes after async widgets finish
      setTimeout(render, 400);
      setTimeout(render, 1200);
      setTimeout(render, 2500);
    } else if (Date.now() - start < 15000) {
      setTimeout(() => boot(start), 200);
    } else {
      log('gave up waiting for Yotpo span');
    }
  }

  // Only run on PDP-ish pages
  if (document.querySelector('form[action*="/cart/add"], [data-product-id], .yotpo-product-points-widget-logged-in-view')) {
    boot();
  }
})();
