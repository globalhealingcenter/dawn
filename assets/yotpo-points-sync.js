<script>
(() => {
  // prevent double init
  if (window.__PPW_YOTPO_SYNC__) return;
  window.__PPW_YOTPO_SYNC__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const POINTS_BOX_SEL   = '.yotpo-product-points-widget';
  const POINTS_NUM_SEL   = '.yotpo-product-points-widget-points-amount';

  // containers / elements that hold subscribe price
  const SUB_HOSTS = [
    '.gh-subscribe-card',            // container of the subscribe module
    'og-price[subscription]',        // subscribe price web component (host)
    'og-price.subscription'
  ];

  // fallback OTO price
  const OTO_HOSTS = [
    '[data-product-price]',
    '.price-item--regular',
    '.product__price',
    '.product [class*="price"]'
  ];

  // --- helpers ----------------------------------------------------

  // Read text including Shadow DOM (open)
  function deepText(el) {
    if (!el) return '';
    // some components keep the value in attributes as well
    const attrHints = [
      'aria-label','data-price','data-amount','data-value','value','price','amount'
    ];
    for (const a of attrHints) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v && /\d/.test(v)) return String(v);
    }

    let t = (el.textContent || '');
    if (el.shadowRoot) {
      t += ' ' + (el.shadowRoot.textContent || '');
    }
    return t;
  }

  // Get ALL money amounts from text, return array of Numbers
  function allMoneyInText(txt) {
    const re = /\$?\s*([0-9]+(?:[.,][0-9]{1,2})?)/g;
    const out = [];
    let m;
    while ((m = re.exec(txt))) {
      const n = parseFloat(m[1].replace(',', '.'));
      if (!isNaN(n)) out.push(n);
    }
    return out;
  }

  // Return first money value found in any of the hosts
  function firstMoneyFrom(hostSelectors) {
    for (const sel of hostSelectors) {
      for (const host of $$(sel)) {
        const txt = deepText(host);
        const vals = allMoneyInText(txt);
        if (vals.length) return vals[0];
      }
    }
    return null;
  }

  // For the SUBSCRIBE card, prefer the *lowest* value seen in that card
  function lowestMoneyFromSubscribe() {
    for (const sel of SUB_HOSTS) {
      for (const host of $$(sel)) {
        const txt = deepText(host);
        const vals = allMoneyInText(txt);
        if (vals.length) {
          // discounted price will be the lowest number rendered in the card
          return Math.min(...vals);
        }
      }
    }
    return null;
  }

  function computeTargetPoints() {
    // Try subscribe price first (lowest in card)
    const sub = lowestMoneyFromSubscribe();
    const price = (sub != null) ? sub : firstMoneyFrom(OTO_HOSTS);
    if (price == null) return null;
    return Math.floor(price);
  }

  // Debounced updater
  let timer = null;
  function scheduleUpdate(ms=250) {
    clearTimeout(timer);
    timer = setTimeout(applyUpdate, ms);
  }

  function applyUpdate() {
    const box = $(POINTS_BOX_SEL);
    if (!box) return;

    const num = $(POINTS_NUM_SEL, box);
    if (!num) return;

    const desired = computeTargetPoints();
    if (desired == null) return;

    const next = String(desired);
    const last = num.getAttribute('data-ppw-last') || '';
    if (last !== next && num.textContent !== next) {
      num.textContent = next;           // only change the number
      num.setAttribute('data-ppw-last', next);
    }
  }

  // Boot when Yotpo widget appears
  function boot() {
    const box = $(POINTS_BOX_SEL);
    if (!box) { setTimeout(boot, 300); return; }

    // initial pass
    scheduleUpdate(350);

    // Observe Yotpo area and price areas
    const mo = new MutationObserver(() => scheduleUpdate(300));
    mo.observe(box, { childList:true, subtree:true, characterData:true });

    // Any click/change that likely toggles price
    const rebounce = () => scheduleUpdate(200);
    document.addEventListener('click',  e => {
      if (e.target.closest('.gh-subscribe-card') ||
          e.target.closest('input[type="radio"]') ||
          e.target.closest('[data-selling-plan], [data-frequency]')) rebounce();
    });
    document.addEventListener('change', e => {
      if (e.target.closest('.gh-subscribe-card') ||
          e.target.closest('form')) rebounce();
    });

    // safety passes after JS settles
    setTimeout(applyUpdate, 1000);
    setTimeout(applyUpdate, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
</script>
