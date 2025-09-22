<script>
/* PDP • Yotpo points number sync with Subscribe price (Shadow-DOM aware)
   - Looks into og-optin-button shadowRoot and uses the *lowest* amount
     (discounted subscribe price) found there.
   - Falls back to one-time price if subscribe isn’t present.
   - Only updates the number span so the rest of the Yotpo copy stays intact.
*/
(() => {
  if (window.__PPW_YOTPO_SHADOW_SYNC__) return;
  window.__PPW_YOTPO_SHADOW_SYNC__ = true;

  const POINTS_BOX_SEL = '.yotpo-product-points-widget';
  const POINTS_NUM_SEL = '.yotpo-product-points-widget-points-amount';

  // ---- Shadow-DOM utilities ------------------------------------
  function deepQueryAll(selector, root = document) {
    const found = [];
    const scan = (node) => {
      if (!node) return;
      // Walk element children
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, null, false);
      let cur = node === document ? document.documentElement : node;
      if (cur && cur.matches && cur.matches(selector)) found.push(cur);
      while (walker.nextNode()) {
        const el = walker.currentNode;
        if (el.matches && el.matches(selector)) found.push(el);
        if (el.shadowRoot) scan(el.shadowRoot);
      }
      // If root is a ShadowRoot, also check its direct children
      if (node instanceof ShadowRoot) {
        for (const el of node.children) {
          if (el.matches && el.matches(selector)) found.push(el);
          if (el.shadowRoot) scan(el.shadowRoot);
        }
      }
    };
    scan(root);
    return found;
  }

  function textDeep(el) {
    if (!el) return '';
    let t = el.textContent || '';
    if (el.shadowRoot) t += ' ' + (el.shadowRoot.textContent || '');
    return t;
  }

  function moneyVals(txt) {
    const out = [];
    const re = /\$?\s*([0-9]+(?:[.,][0-9]{1,2})?)/g;
    let m;
    while ((m = re.exec(txt))) {
      const n = parseFloat(m[1].replace(',', '.'));
      if (!isNaN(n)) out.push(n);
    }
    return out;
  }

  // ---- Price readers -------------------------------------------
  // Prefer the *lowest* number inside the subscribe card’s shadowRoot
  function subscribePrice() {
    // Host is in light DOM; price is inside its shadowRoot
    const hosts = deepQueryAll('og-optin-button.gh-subscribe-card');
    for (const host of hosts) {
      const txt = host.shadowRoot ? host.shadowRoot.textContent : '';
      const vals = moneyVals(txt);
      if (vals.length) return Math.min(...vals);
    }
    // Fallback: direct og-price[subscription] hosts (if exposed)
    const subs = deepQueryAll('og-price[subscription]');
    for (const el of subs) {
      const vals = moneyVals(textDeep(el));
      if (vals.length) return vals[0];
    }
    return null;
  }

  function oneTimePrice() {
    // Try common PDP price spots (both light & shadow)
    const spots = [
      '[data-product-price]',
      '.price-item--regular',
      '.product__price',
      '.product [class*="price"]',
      'og-price.regular',
      'og-price:not([subscription])'
    ];
    for (const sel of spots) {
      const els = deepQueryAll(sel);
      for (const el of els) {
        const vals = moneyVals(textDeep(el));
        if (vals.length) return vals[0];
      }
    }
    return null;
  }

  function computePoints() {
    const sub = subscribePrice();
    const price = (sub != null) ? sub : oneTimePrice();
    if (price == null) return null;
    return Math.floor(price); // 25.46 → 25 (no rounding up)
  }

  // ---- Update logic (debounced, no flicker) --------------------
  let t = null;
  function schedule(ms = 200) {
    clearTimeout(t);
    t = setTimeout(update, ms);
  }

  function update() {
    const box = document.querySelector(POINTS_BOX_SEL);
    const num = box && box.querySelector(POINTS_NUM_SEL);
    if (!num) return;

    const want = computePoints();
    if (want == null) return;

    const next = String(want);
    if (num.getAttribute('data-ppw-last') === next || num.textContent === next) return;
    num.textContent = next;                 // only the number
    num.setAttribute('data-ppw-last', next);
  }

  function boot() {
    if (!document.querySelector(POINTS_BOX_SEL)) { setTimeout(boot, 250); return; }

    // initial & safety passes
    schedule(350);
    setTimeout(update, 1000);
    setTimeout(update, 2000);

    // Watch the subscribe module (light + shadow) and the Yotpo box
    const mo = new MutationObserver(() => schedule(150));
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });

    // User interactions that change price
    const kick = () => schedule(150);
    document.addEventListener('click',  (e) => {
      if (e.target.closest('.gh-subscribe-card') || e.target.closest('input[type="radio"]')) kick();
    }, true);
    document.addEventListener('change', (e) => {
      if (e.target.closest('.gh-subscribe-card') || e.target.closest('form')) kick();
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // --- tiny debug helper in console:
  window.__ppwYotpoDebug = () => ({
    sub: subscribePrice(),
    oto: oneTimePrice(),
    points: computePoints()
  });
})();
</script>
