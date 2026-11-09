/* yotpo-ppw-shadow-sync.js — variant-safe
   Sync Yotpo "Earn at least X points" with the LOWEST PDP price (SUB vs OTO).
   - 1 point = $1 (floor; 4.80 → 4)
   - The copy reads "at least", so we always show the cheapest purchase option
     (normally Subscribe & Save), not whichever option happens to be selected.
   - Only changes the number inside Yotpo’s amount span
   - Watches the Ordergroove offer + VARIANT changes (select/radio/buttons)
   - Targets the Ordergroove V3 PDP template (.gh-og-* classes); the pre-V3
     (.gh-subscribe-card) selectors are kept as fallbacks.
*/

/* ==========================================================
[FIX C: Tapcart Safe Shim for Yotpo Points Widget]
Purpose:
Prevent Tapcart app crashes when Yotpo Loyalty or Reviews 
widgets run on screens without Shopify product context.
Only activates in Tapcart webviews.
========================================================== */

(function () {
  try {
    const inTapcart = !!window.Tapcart || /Tapcart/i.test(navigator.userAgent);
    const isPdp =
      /\/products\//.test(location.pathname) ||
      !!(window.meta && window.meta.product);

    if (inTapcart && !isPdp) {
      window.product = window.product || {};
      window.product.reviews = window.product.reviews || {};
      window.product.reviews.bottomline = window.product.reviews.bottomline || {};
    }
  } catch (err) {
    console.warn("[Tapcart/Yotpo Fix C]", err);
  }
})();


(function () {
  'use strict';

  // ---------- tiny helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const moneyToNumber = (t = '') => {
    const n = parseFloat(String(t).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : NaN;
  };

  function readOgPrice(el) {
    if (!el) return NaN;
    try {
      const root = el.shadowRoot || el;
      return moneyToNumber(root.textContent || '');
    } catch { return NaN; }
  }

  // Scope lookups to the PDP offer when it exists, so the sticky-bar /
  // category / cart offers on the same page can never win.
  function offerRoot() {
    return $('og-offer[location="pdp"]') || document;
  }

  // Pull prices from your OG price elements every time (variant safe)
  function getPrices() {
    const r = offerRoot();

    // Ordergroove V3: <div class="gh-og-subscribe"> … <og-price subscription>
    const subEl =
      $('.gh-og-subscribe og-price[subscription]', r) ||
      $('og-price[subscription]', r) ||
      $('og-price[subscription]') ||
      $('og-price.subscription', r) ||
      $('.gh-subscribe-card og-price', r); // pre-V3 fallback

    // Ordergroove V3: <div class="gh-og-onetime"> … <og-price regular>
    let oneEl =
      $('.gh-og-onetime og-price[regular]', r) ||
      $('.gh-og-one-price og-price[regular]', r) ||
      $('og-price[regular]', r) ||
      $('og-price[regular]') ||
      $('og-price.regular', r) ||
      (function () {
        const otoRow =
          $('[data-offer="onetime"]', r) ||
          $('[data-type="onetime"]', r) ||
          $$('div,li,section', r).find(n => /one[-\s]?time/i.test(n?.textContent || ''));
        return otoRow ? $('og-price', otoRow) : null;
      })();

    return {
      subscription: readOgPrice(subEl),
      onetime: readOgPrice(oneEl)
    };
  }

  // Ordergroove flags the chosen option with a [subscribed] attribute on
  // <og-optin-button>. Kept for the debug helper — the points number itself
  // no longer depends on which option is selected ("at least" = cheapest).
  function isSubscribeSelected() {
    const og =
      $('.gh-og-subscribe og-optin-button', offerRoot()) ||
      $('og-optin-button.gh-subscribe-card') || // pre-V3 fallback
      $('og-optin-button', offerRoot());
    if (og && (og.hasAttribute('subscribed') ||
               og.hasAttribute('active') ||
               og.hasAttribute('checked'))) return true;
    if ($('.gh-og-subscribe [aria-checked="true"]')) return true;
    if ($('.gh-subscribe-card [aria-checked="true"]')) return true;
    if ($('.gh-og-subscribe input[type="radio"]:checked')) return true;
    if ($('.gh-subscribe-card input[type="radio"]:checked')) return true;
    return false;
  }

  // Find Yotpo number span and learn its prefix/suffix around the number
  let pointsEl = null, prefix = '', suffix = '';
  function getPointsEl() {
    return $('.yotpo-product-points-widget-points-amount') ||
           $$('a.yotpo-product-points-widget-link span')
             .find(s => /\d/.test(s.textContent || '')) || null;
  }
  function captureTemplate(node) {
    if (!node) return;
    const txt = (node.textContent || '').trim();
    const m = txt.match(/^(.*?)(\d[\d,\.]*)(.*)$/);
    prefix = m ? m[1] : '';
    suffix = m ? m[3] : '';
  }

  // -------- render loop (variant-safe) --------
  let lastShown = null, rafId = null;

  // The widget copy reads "Earn at least N rewards points", so N must be the
  // points for the CHEAPEST purchase option (Subscribe & Save where it exists),
  // regardless of which option the shopper currently has selected.
  function computeLowestPrice() {
    // Re-read prices EVERY time to catch variant changes
    const p = getPrices();
    const candidates = [p.subscription, p.onetime].filter(n => Number.isFinite(n) && n > 0);
    return candidates.length ? Math.min.apply(null, candidates) : NaN;
  }

  function render() {
    if (!pointsEl || !document.contains(pointsEl)) {
      pointsEl = getPointsEl();
      // New node => the cached value says nothing about what it now displays.
      lastShown = null;
      if (pointsEl) captureTemplate(pointsEl);
    }
    if (!pointsEl) return;

    const price = computeLowestPrice();
    if (!Number.isFinite(price)) return;

    const pts = Math.floor(price);
    const desired = `${prefix}${pts}${suffix}`;

    // Compare against what the node ACTUALLY shows, not a cached number.
    // Yotpo re-renders its widget and resets the amount to its own default,
    // so a cached-value guard would skip the write and leave the wrong number.
    if (pointsEl.textContent === desired) {
      lastShown = pts;
      return;
    }

    pointsEl.textContent = desired;
    lastShown = pts;
  }

  function scheduleRender() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => { rafId = null; render(); });
  }

  // -------- wiring & observers --------
  function initObservers() {
    // Ordergroove offer changes (re-render, variant swap, price refresh).
    // Watch the whole offer: OG replaces its inner DOM wholesale, so observing
    // a single button is not enough.
    const offer =
      $('og-offer[location="pdp"]') ||
      $('.gh-og-options')?.closest('og-offer') ||
      $('og-offer');
    if (offer) {
      new MutationObserver(scheduleRender).observe(offer, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true
      });
      offer.addEventListener('change', scheduleRender, true);
      offer.addEventListener('click', scheduleRender, true);
    }

    // Yotpo can re-render its DOM
    const yWrap =
      $('.yotpo-product-points-widget-logged-in-view') ||
      $('.yotpo-product-points-inner-wrapper') ||
      $('a.yotpo-product-points-widget-link')?.parentElement;
    if (yWrap) {
      new MutationObserver(() => { pointsEl = null; lastShown = null; scheduleRender(); })
        .observe(yWrap, { childList: true, subtree: true });
    }

    // Variant changes (cover selects, radios, size buttons)
    const variantSelectors = [
      'select[name="id"]',
      'input[name="id"]',
      '[data-option], [data-variant], [data-product-attribute]',
      '.product-form, .product__info, .product__options'
    ];
    document.addEventListener('change', e => {
      if (variantSelectors.some(sel => e.target.matches?.(sel))) scheduleRender();
    }, true);
    document.addEventListener('click', e => {
      // Many stores use button radios for options
      if (e.target.closest('[role="radio"],[data-option],[data-variant]')) scheduleRender();
    }, true);

    // Safety net: very light periodic check
    setInterval(scheduleRender, 1500);
  }

  // Debug helper
  window.__ppwYotpoDebug = function () {
    const shown = pointsEl ? pointsEl.textContent : null;
    const p = getPrices();
    return {
      subSelected: isSubscribeSelected(),
      prices: p,
      lowestPrice: computeLowestPrice(),
      pointsShown: shown
    };
  };

  // Boot
  (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start, { once: true })
    : start());

  function start() {
    pointsEl = getPointsEl();
    if (pointsEl) captureTemplate(pointsEl);
    initObservers();
    scheduleRender();
  }
})();
