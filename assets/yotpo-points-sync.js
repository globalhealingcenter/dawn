<!-- in Assets: yotpo-points-sync.js (or whatever file you’re using) -->
<script>
(() => {
  // Avoid double-start if theme loads this file twice
  if (window.__PPW_YOTPO_SYNC__) return;
  window.__PPW_YOTPO_SYNC__ = true;

  // ---------- helpers ----------
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const POINTS_CONTAINER_SEL = '.yotpo-product-points-widget';
  const POINTS_NUMBER_SEL    = '.yotpo-product-points-widget-points-amount';

  // Try a few likely selectors for the SUBSCRIBE price.
  const SUB_PRICE_CANDIDATES = [
    // your subscribe card / green price area (try specific first)
    '.gh-subscribe-card [class*="price"]',
    '.gh-subscribe-card og-price',
    '.gh-subscribe-card [data-price]',
    '.gh-subscribe-card [data-testid*="price"]',
    '.gh-subscribe-card *',
  ];

  // If we can’t find a sub price we fall back to the normal price near the form
  const OTO_PRICE_CANDIDATES = [
    '[data-product-price]',
    '.price-item--regular',
    '.product__price',
    '.product__info-container [class*="price"]',
    '.product [class*="price"]',
  ];

  const MONEY_RE = /\$?\s*([0-9]+(?:[.,][0-9]{1,2})?)/;

  function parseMoneyFrom(el) {
    if (!el) return null;
    const txt = (el.getAttribute('aria-label') || el.textContent || '').trim();
    const m = txt.match(MONEY_RE);
    if (!m) return null;
    // normalize 25,46 => 25.46
    const n = parseFloat(m[1].replace(',', '.'));
    return isNaN(n) ? null : n;
  }

  function firstMoneyFrom(selectors) {
    for (const sel of selectors) {
      for (const el of $$(sel)) {
        const n = parseMoneyFrom(el);
        if (n) return n;
      }
    }
    return null;
  }

  function getSubscribePrice() {
    // If a subscribe option is visible/selected, this usually exists
    return firstMoneyFrom(SUB_PRICE_CANDIDATES);
  }

  function getOtoPrice() {
    return firstMoneyFrom(OTO_PRICE_CANDIDATES);
  }

  // Compute target points: floor(price). If a subscribe price
  // is on screen we prefer that; otherwise fall back to OTO.
  function computeTargetPoints() {
    const sub = getSubscribePrice();
    const price = sub ?? getOtoPrice();
    if (!price) return null;
    return Math.floor(price);
  }

  // Debounce updates so we only touch DOM after things settle
  let pendingTimer = null;
  function scheduleUpdate(delay = 250) {
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(applyUpdate, delay);
  }

  function applyUpdate() {
    const box = $(POINTS_CONTAINER_SEL);
    if (!box) return;

    // The number span that Yotpo renders
    const num = $(POINTS_NUMBER_SEL, box);
    if (!num) return;

    const desired = computeTargetPoints();
    if (desired == null) return;

    // Only update if changed; store last value on the number element
    const last = num.getAttribute('data-ppw-last');
    const next = String(desired);

    if (last !== next && num.textContent !== next) {
      // Update only textContent of the NUMBER span.
      num.textContent = next;
      num.setAttribute('data-ppw-last', next);
    }
  }

  // ---------- boot ----------
  function bootWhenReady() {
    const yotpoBox = $(POINTS_CONTAINER_SEL);
    if (!yotpoBox) {
      // try again shortly; Yotpo loads async
      setTimeout(bootWhenReady, 300);
      return;
    }

    // Run once after it renders
    scheduleUpdate(350);

    // Observe Yotpo widget subtree & price areas with a quiet-time debounce
    const mo = new MutationObserver(() => scheduleUpdate(300));
    mo.observe(yotpoBox, { childList: true, subtree: true, characterData: true });

    // Also listen for clicks/changes that switch purchase type
    document.addEventListener('click', e => {
      // clicks that likely change prices/subscription choice
      if (e.target.closest('.gh-subscribe-card') ||
          e.target.closest('input[type="radio"]') ||
          e.target.closest('[data-selling-plan], [data-frequency], [data-price]')) {
        scheduleUpdate(200);
      }
    });

    document.addEventListener('change', e => {
      if (e.target.closest('form') || e.target.closest('.gh-subscribe-card')) {
        scheduleUpdate(200);
      }
    });

    // a few safety re-checks after initial load
    setTimeout(applyUpdate, 1000);
    setTimeout(applyUpdate, 2000);
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootWhenReady);
  } else {
    bootWhenReady();
  }
})();
</script>
