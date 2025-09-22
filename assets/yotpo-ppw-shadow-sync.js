/* yotpo-ppw-shadow-sync.js
   Sync Yotpo "Earn up to X points" with the active PDP price (one-time vs subscribe).
   - No tier/multiplier: 1 point = $1 (floor; $4.80 → 4 points)
   - Non-destructive: updates only the number inside Yotpo's amount span
   - Flicker-free: avoids touching surrounding copy/links, throttles updates
*/

(function () {
  'use strict';

  // ---------- Utilities ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const moneyToNumber = (txt = '') => {
    const m = String(txt).replace(/[^0-9.]/g, '');
    const n = parseFloat(m);
    return Number.isFinite(n) ? n : NaN;
  };

  function readOgPrice(el) {
    if (!el) return NaN;
    try {
      const root = el.shadowRoot || el;
      return moneyToNumber(root.textContent || '');
    } catch {
      return NaN;
    }
  }

  // Get current one-time and subscribe prices from your theme’s price elements
  function getPrices() {
    // Subscribe price lives in <og-price subscription>
    const subEl =
      $('og-price[subscription]') ||
      $('og-price.subscription') ||
      $('.gh-subscribe-card og-price');

    // One-time price lives in <og-price regular> OR the OTO row
    let oneEl = $('og-price[regular]') || $('og-price.regular');
    if (!oneEl) {
      // last fallback: any og-price inside the OTO row
      const otoRow =
        $('[data-offer="onetime"]') ||
        $('[data-type="onetime"]') ||
        $$('div,li,section').find(n => /one[-\s]?time/i.test(n.textContent || ''));
      if (otoRow) oneEl = $('og-price', otoRow);
    }

    const subscription = readOgPrice(subEl);
    const onetime = readOgPrice(oneEl);

    return { subscription, onetime };
  }

  // Your theme toggles a flag on the subscribe button/card.
  function isSubscribeSelected() {
    const og = $('og-optin-button.gh-subscribe-card');
    if (og && (og.hasAttribute('subscribed') ||
               og.hasAttribute('active') ||
               og.hasAttribute('checked'))) {
      return true;
    }
    // fallbacks
    if ($('.gh-subscribe-card [aria-checked="true"]')) return true;
    if ($('.gh-subscribe-card input[type="radio"]:checked')) return true;
    return false;
  }

  // Find Yotpo's number span and capture its prefix/suffix once
  let pointsEl = null;
  let prefix = '';
  let suffix = '';
  function getPointsEl() {
    // This span exists inside the Yotpo widget and contains the number
    const el =
      $('.yotpo-product-points-widget-points-amount') ||
      // fallback: any span inside the Yotpo link that contains a number
      $$('a.yotpo-product-points-widget-link span').find(s =>
        /\d/.test(s.textContent || '')
      );
    return el || null;
  }
  function captureTemplate(node) {
    if (!node) return;
    const t = (node.textContent || '').trim();
    const m = t.match(/^(.*?)(\d[\d,\.]*)(.*)$/);
    if (m) {
      prefix = m[1];
      suffix = m[3];
    } else {
      // default if Yotpo only rendered a number
      prefix = '';
      suffix = '';
    }
  }

  // ---------- Update loop ----------
  let lastShown = null;
  let prices = { subscription: NaN, onetime: NaN };
  let rafId = null;

  function computeActivePrice() {
    // Refresh prices if we don't have them yet
    if (!Number.isFinite(prices.subscription) || !Number.isFinite(prices.onetime)) {
      prices = getPrices();
    }
    return isSubscribeSelected() && Number.isFinite(prices.subscription)
      ? prices.subscription
      : prices.onetime;
  }

  function render() {
    // (Re)discover the Yotpo span if it was re-rendered
    if (!pointsEl || !document.contains(pointsEl)) {
      pointsEl = getPointsEl();
      if (pointsEl) captureTemplate(pointsEl);
    }
    if (!pointsEl) return;

    const activePrice = computeActivePrice();
    if (!Number.isFinite(activePrice)) return;

    const pts = Math.floor(activePrice); // $1 → 1 point, floor
    if (pts === lastShown) return; // no change

    // Update only the number to avoid flicker / copy loss
    pointsEl.textContent = `${prefix}${pts}${suffix}`;
    lastShown = pts;
  }

  // Throttled schedule to coalesce rapid UI changes
  function scheduleRender() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      render();
    });
  }

  // ---------- Wiring ----------
  function initObservers() {
    // 1) React to changes on the subscribe card/button
    const card = $('og-optin-button.gh-subscribe-card');
    if (card) {
      new MutationObserver(scheduleRender).observe(card, {
        attributes: true,
        childList: false,
        subtree: false
      });
      card.addEventListener('change', scheduleRender, true);
      card.addEventListener('click', scheduleRender, true);
    }

    // 2) React to Yotpo re-renders (it sometimes replaces the amount span)
    const yWrap =
      $('.yotpo-product-points-widget-logged-in-view') ||
      $('.yotpo-product-points-inner-wrapper') ||
      $('a.yotpo-product-points-widget-link')?.parentElement;
    if (yWrap) {
      new MutationObserver(() => {
        pointsEl = null; // force rediscovery
        scheduleRender();
      }).observe(yWrap, { childList: true, subtree: true });
    }

    // 3) Periodic soft refresh as a safety net (very light)
    setInterval(scheduleRender, 1500);
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  // ---------- Debug helper ----------
  window.__ppwYotpoDebug = function () {
    const active = computeActivePrice();
    const shown = pointsEl ? pointsEl.textContent : null;
    return {
      subSelected: isSubscribeSelected(),
      prices: { ...prices },
      pointsShown: shown
    };
  };

  // ---------- Boot ----------
  ready(() => {
    prices = getPrices();
    pointsEl = getPointsEl();
    if (pointsEl) captureTemplate(pointsEl);

    initObservers();
    scheduleRender();
  });
})();
