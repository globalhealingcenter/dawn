/* Yotpo points number sync — PPW
   - Keeps the Yotpo widget intact (no re-rendering, no flicker)
   - Only updates the numeric text inside
     .yotpo-product-points-widget-points-amount
   - Switches to subscription price when subscribe is selected
   - Points rule: floor(price)  (e.g., $4.80 -> 4)
   - Exposes window.__ppwYotpoDebug()
*/
(() => {
  const DEBUG = false;
  const log = (...a) => DEBUG && console.log('[PPW]', ...a);

  const $ = (sel, root = document) => root.querySelector(sel);

  // Parse a money string to Number, robust to commas/periods
  function parseMoney(s) {
    if (!s) return 0;
    let str = String(s).replace(/[^\d.,]/g, '');
    // Coerce thousands/decimal: keep last '.' as decimal, strip others
    const lastDot = str.lastIndexOf('.');
    if (lastDot !== -1) {
      str = str.slice(0, lastDot).replace(/[.]/g, '') + '.' + str.slice(lastDot + 1);
    }
    // If there is no dot but there is a comma, treat comma as decimal
    if (lastDot === -1 && str.indexOf(',') !== -1) {
      const lastComma = str.lastIndexOf(',');
      str = str.slice(0, lastComma).replace(/,/g, '') + '.' + str.slice(lastComma + 1);
    } else {
      // remove commas as thousands
      str = str.replace(/,/g, '');
    }
    const n = Number(str);
    return isNaN(n) ? 0 : n;
  }

  function getPointsForPrice(price) {
    return Math.floor(price); // $4.80 -> 4
  }

  // Is subscribe selected?
  function isSubscribeSelected() {
    // Radix: aria radio or input radio inside subscribe block
    if ($('.gh-subscribe-card [role="radio"][aria-checked="true"]')) return true;
    const r = $('.gh-subscribe-card input[type="radio"]');
    if (r && r.checked) return true;
    return false;
  }

  // Try to read the OTO price and SUB price from the page.
  // We read visible text; fallback to og-price web component text if needed.
  function readSubPrice() {
    // 1) Try og-price[subscription]
    const host = $('og-price[subscription]');
    if (host && host.shadowRoot) {
      const txt = host.shadowRoot.textContent || '';
      const n = parseMoney(txt);
      if (n) return n;
    }
    // 2) Fallback: visible text inside subscribe card
    const card = $('.gh-subscribe-card');
    if (card) {
      const txt = card.textContent || '';
      const n = parseMoney(txt);
      if (n) return n;
    }
    return 0;
  }

  function readOtoPrice() {
    // common “one-time purchase” row
    const row = document.querySelector('[data-test="one-time"], .one-time, .gh--pre-discount-price') || document.body;
    const txt = (row.textContent || '');
    const n = parseMoney(txt);
    if (n) return n;

    // Fallback: product price anywhere on the page
    const any = document.body.textContent || '';
    return parseMoney(any) || 0;
  }

  function getActivePrice() {
    if (isSubscribeSelected()) {
      const s = readSubPrice();
      if (s) return s;
    }
    return readOtoPrice();
  }

  // Update just the number inside Yotpo points amount
  function updateWidget() {
    const amountEl = $('.yotpo-product-points-widget-points-amount');
    if (!amountEl) return; // widget not rendered yet

    const price = getActivePrice();
    if (!price) return;

    const pts = String(getPointsForPrice(price));
    if (amountEl.textContent !== pts) {
      amountEl.textContent = pts;
      log('updated ->', { pts, price });
    }
  }

  // Observe things that can change the visible price:
  function attachObservers() {
    // Generic observer on subscribe block (text/attributes)
    const subBlock = $('.gh-subscribe-card') || document.body;
    const mo1 = new MutationObserver(() => updateWidget());
    mo1.observe(subBlock, { subtree: true, childList: true, characterData: true, attributes: true });

    // If og-price has open shadow root, observe inside it as well
    const og = $('og-price[subscription]');
    if (og && og.shadowRoot) {
      const mo2 = new MutationObserver(updateWidget);
      mo2.observe(og.shadowRoot, { subtree: true, childList: true, characterData: true });
    }

    // Watch clicks/changes on radios or the subscribe card
    document.addEventListener('change', (e) => {
      if (e.target && (e.target.type === 'radio' || e.target.closest('.gh-subscribe-card'))) {
        setTimeout(updateWidget, 20);
      }
    });
    document.addEventListener('click', (e) => {
      if (e.target && e.target.closest('.gh-subscribe-card')) {
        setTimeout(updateWidget, 20);
      }
    });
  }

  // Debug helper so you can verify it’s running
  window.__ppwYotpoDebug = function () {
    const amountEl = $('.yotpo-product-points-widget-points-amount');
    return {
      subSelected: isSubscribeSelected(),
      activePrice: getActivePrice(),
      pointsShown: amountEl ? amountEl.textContent : null
    };
  };

  // Kick off
  attachObservers();
  // First pass + a couple defer retries in case Yotpo renders late
  updateWidget();
  setTimeout(updateWidget, 150);
  setTimeout(updateWidget, 500);
})();
