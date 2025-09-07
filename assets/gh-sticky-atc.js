/* gh-sticky-atc.js — robust price sync (walk selected option container) */
(function () {
  // ---------- tiny helpers ----------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const onReady = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();
  const nextTick = (fn) => setTimeout(fn, 0);

  function formatMoney(cents) {
    try {
      const cur = (window.Shopify && Shopify.currency && Shopify.currency.active) || 'USD';
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(cents / 100);
    } catch { return `$${(cents / 100).toFixed(2)}`; }
  }
  const findVariantById = (variants, id) => variants.find(v => String(v.id) === String(id)) || null;

  // --- subscription state ---
  function sellingPlanIsSet() {
    const nodes = $$('form[action*="/cart/add"] [name="selling_plan"], [name^="selling_plan"]');
    for (const n of nodes) {
      if (n.tagName === 'SELECT' && n.value && n.value !== '0' && n.value !== 'null') return true;
      if ((n.type === 'radio' || n.type === 'checkbox')) {
        const ck = $(`[name="${n.name}"]:checked`);
        if (ck && ck.value && ck.value !== '0' && ck.value !== 'null') return true;
      }
      if (n.type === 'hidden' && n.value && n.value !== '0' && n.value !== 'null') return true;
    }
    return false;
  }

  function isSubscriptionSelected() {
    if (sellingPlanIsSet()) return true;
    // Fallback: a “subscribe” radio selected
    const subRadio =
      $('input[type="radio"][value*="sub"]:checked, input[type="radio"][data-og-option="subscribe"]:checked, input[type="radio"][name*="purchase"][value="subscribe"]:checked');
    return !!subRadio;
  }

  // --- price scraping (robust) ---
  const MONEY_RE = /[$£€]\s?\d[\d,.]*(?:\s?[–-]\s?[$£€]?\d[\d,.]*)?/;

  function firstMoneyIn(el) {
    if (!el) return null;
    // obvious candidates inside the chosen card
    const targets = $$(
      '.money, [data-money], [data-price], [data-og-price], .price, .price__value, .price-item, .og-price, .og-price--subscription, .og-price--regular, [class*="price"]',
      el
    );
    for (const t of targets) {
      const txt = (t.textContent || '').trim();
      if (MONEY_RE.test(txt)) return txt.match(MONEY_RE)[0];
    }
    // last resort: scan container text
    const blockTxt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    const m = blockTxt.match(MONEY_RE);
    return m ? m[0] : null;
  }

  function selectedOptionContainer(isSub) {
    // Subscription: nearest card around selected subscribe radio / state
    if (isSub) {
      const subChecked =
        $('input[type="radio"][value*="sub"]:checked, input[type="radio"][data-og-option="subscribe"]:checked') ||
        $('input[type="radio"][name*="purchase"]:checked');
      const cand =
        subChecked?.closest('label, .og-card, .og-selected, .gh-subscribe-card, .subscription-option, .purchase-option, .og-offer, [role="group"]') ||
        $('.og-selected, [data-og-state="opted-in"], .gh-subscribe-card[aria-pressed="true"]');
      if (cand) return cand;
    }
    // One-time: nearest card around “one-time” radio
    const otChecked =
      $('input[type="radio"][value*="one"]:checked, input[type="radio"][data-og-option="onetime"]:checked') ||
      $('input[type="radio"][name*="purchase"]:checked');
    return (
      otChecked?.closest('label, .og-card, .purchase-option, .onetime-option, .og-optout-button, [role="group"]') ||
      $('.og-optout-button')
    );
  }

  function readLivePDPPrice(sub) {
    // 1) Ordergroove custom elements (fast path if present)
    const og = sub ? $('og-price[subscription]') : $('og-price[regular]');
    if (og && og.textContent.trim()) return og.textContent.trim();

    // 2) Look inside the selected purchase option card
    const cont = selectedOptionContainer(sub);
    const fromCard = firstMoneyIn(cont);
    if (fromCard) return fromCard;

    // 3) Theme price block (some themes update this for subs as well)
    const sale = $('.price .price-item.price-item--sale');
    if (sale && sale.textContent.trim()) return sale.textContent.trim();
    const reg  = $('.price .price-item.price-item--regular');
    if (reg && reg.textContent.trim()) return reg.textContent.trim();

    return null;
  }

  // --- sticky UI updates ---
  function currentVariantId(root) {
    const form = $('form[action*="/cart/add"]');
    return (
      form?.querySelector('[name="id"]')?.value ||
      $('select[name="id"]')?.value ||
      root.getAttribute('data-initial-variant')
    );
  }

  function syncLabels(root) {
    const btn = root.querySelector('#StickyATCButton'); if (!btn) return;
    const addLabel = btn.querySelector('.add-to-cart-default-text');
    const subLabel = btn.querySelector('.add-to-cart-subscribe-text');
    const sub = isSubscriptionSelected();
    if (addLabel) addLabel.style.display = sub ? 'none' : '';
    if (subLabel)  subLabel.style.display  = sub ? '' : 'none';
  }

  function syncPrice(root, variants, id) {
    const btn = root.querySelector('#StickyATCButton');
    const priceEl = btn?.querySelector('.gh-sticky-atc__price');
    if (!btn || !priceEl) return;

    const sub = isSubscriptionSelected();
    const live = readLivePDPPrice(sub);
    if (live) { priceEl.textContent = ' | ' + live; return; }

    // Fallback: variant price
    const variant = findVariantById(variants, id);
    if (variant) priceEl.textContent = ' | ' + formatMoney(variant.price);
  }

  function triggerMainATC() {
    const mainBtn =
      $('form[action*="/cart/add"] button[type="submit"]:not(#StickyATCButton)') ||
      $('[data-type="add-to-cart"]:not(#StickyATCButton)') ||
      $('.product-form__submit:not(#StickyATCButton)');
    if (mainBtn) { mainBtn.click(); return; }
    const form = $('form[action*="/cart/add"]');
    form?.requestSubmit?.() ?? form?.submit?.();
  }

  // --- init / listeners ---
  function attachListeners(root, variants) {
    document.addEventListener('change', e => {
      const name = e.target?.name || '';
      if (name.includes('selling_plan') || name.includes('purchase')) {
        syncLabels(root);
        syncPrice(root, variants, currentVariantId(root));
      }
      if (['id','options[','option'].some(p => name.startsWith(p))) {
        syncPrice(root, variants, currentVariantId(root));
      }
    });

    ['variant:change','product:variant-change','product:variant:change'].forEach(evt => {
      document.addEventListener(evt, e => {
        const id = e.detail?.variant?.id || e.detail?.id;
        if (id) syncPrice(root, variants, id);
      });
    });

    // Scope the observer to the purchase/price area for minimal churn
    const priceRoot = $('.product-form, .purchase-options, .product__info-wrapper, .price') || document.body;
    const mo = new MutationObserver(() => {
      syncLabels(root);
      syncPrice(root, variants, currentVariantId(root));
    });
    mo.observe(priceRoot, { subtree: true, childList: true, attributes: true });

    const idInput = $('form[action*="/cart/add"] [name="id"]');
    if (idInput) {
      new MutationObserver(() => syncPrice(root, variants, currentVariantId(root)))
        .observe(idInput, { attributes: true, attributeFilter: ['value'] });
      idInput.addEventListener('input', () => syncPrice(root, variants, currentVariantId(root)));
    }

    root.querySelector('#StickyATCButton')?.addEventListener('click', triggerMainATC);
  }

  function waitForPrereqs(cb) {
    const ready = !!($('form[action*="/cart/add"]') && ($('[name^="selling_plan"]') || $('og-price') || $('.product-form')) );
    if (ready) return cb();
    setTimeout(() => waitForPrereqs(cb), 100);
  }

  function initOne(root) {
    const sectionId = root.getAttribute('data-section-id');
    const variantsEl = document.getElementById('gh-sticky-variants-' + sectionId);
    let variants = [];
    try { variants = JSON.parse(variantsEl?.textContent || '[]'); } catch (e) {}

    waitForPrereqs(() => {
      syncLabels(root);
      syncPrice(root, variants, currentVariantId(root));
      attachListeners(root, variants);
    });
  }

  function initAll() { $$('[data-gh-sticky="true"]').forEach(initOne); }

  onReady(() => nextTick(initAll)); // defer one tick to avoid racing apps
})();
