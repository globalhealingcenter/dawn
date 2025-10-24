/* yotpo-ppw-shadow-sync.js — variant-safe
   Sync Yotpo "Earn up to X points" with the active PDP price (OTO vs SUB).
   - 1 point = $1 (floor; 4.80 → 4)
   - Only changes the number inside Yotpo’s amount span
   - Watches subscribe toggle + VARIANT changes (select/radio/buttons)
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

  // Pull prices from your OG price elements every time (variant safe)
  function getPrices() {
    const subEl =
      $('og-price[subscription]') ||
      $('og-price.subscription') ||
      $('.gh-subscribe-card og-price');

    let oneEl =
      $('og-price[regular]') ||
      $('og-price.regular') ||
      (function () {
        const otoRow =
          $('[data-offer="onetime"]') ||
          $('[data-type="onetime"]') ||
          $$('div,li,section').find(n => /one[-\s]?time/i.test(n?.textContent || ''));
        return otoRow ? $('og-price', otoRow) : null;
      })();

    return {
      subscription: readOgPrice(subEl),
      onetime: readOgPrice(oneEl)
    };
  }

  // Your theme toggles attributes on the subscribe card/button when selected.
  function isSubscribeSelected() {
    const og = $('og-optin-button.gh-subscribe-card');
    if (og && (og.hasAttribute('subscribed') ||
               og.hasAttribute('active') ||
               og.hasAttribute('checked'))) return true;
    if ($('.gh-subscribe-card [aria-checked="true"]')) return true;
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
  function computeActivePrice() {
    // Re-read prices EVERY time to catch variant changes
    const p = getPrices();
    return isSubscribeSelected() && Number.isFinite(p.subscription)
      ? p.subscription
      : p.onetime;
  }

  function render() {
    if (!pointsEl || !document.contains(pointsEl)) {
      pointsEl = getPointsEl();
      if (pointsEl) captureTemplate(pointsEl);
    }
    if (!pointsEl) return;

    const price = computeActivePrice();
    if (!Number.isFinite(price)) return;

    const pts = Math.floor(price);
    if (pts === lastShown) return;

    pointsEl.textContent = `${prefix}${pts}${suffix}`;
    lastShown = pts;
  }

  function scheduleRender() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => { rafId = null; render(); });
  }

  // -------- wiring & observers --------
  function initObservers() {
    // Subscribe card changes
    const card = $('og-optin-button.gh-subscribe-card');
    if (card) {
      new MutationObserver(scheduleRender).observe(card, { attributes: true });
      card.addEventListener('change', scheduleRender, true);
      card.addEventListener('click', scheduleRender, true);
    }

    // Yotpo can re-render its DOM
    const yWrap =
      $('.yotpo-product-points-widget-logged-in-view') ||
      $('.yotpo-product-points-inner-wrapper') ||
      $('a.yotpo-product-points-widget-link')?.parentElement;
    if (yWrap) {
      new MutationObserver(() => { pointsEl = null; scheduleRender(); })
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
