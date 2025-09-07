/* gh-sticky-atc.js — safe init (scoped observers, no early race) */
(function () {
  // ---------- tiny helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const onReady = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();
  const nextTick = (fn) => setTimeout(fn, 0);

  function formatMoney(cents) {
    try {
      const c = (window.Shopify && Shopify.currency && Shopify.currency.active) || 'USD';
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(cents / 100);
    } catch { return `$${(cents / 100).toFixed(2)}`; }
  }
  const findVariantById = (variants, id) => variants.find(v => String(v.id) === String(id)) || null;

  function currentVariantId(root) {
    const form = $('form[action*="/cart/add"]');
    return (
      form?.querySelector('[name="id"]')?.value ||
      $('select[name="id"]')?.value ||
      root.getAttribute('data-initial-variant')
    );
  }

  function isSubscriptionSelected() {
    // Shopify selling-plan inputs
    const spInputs = $$('form[action*="/cart/add"] [name="selling_plan"], [name^="selling_plan"]');
    for (const n of spInputs) {
      if (n.tagName === 'SELECT' && n.value && n.value !== '0' && n.value !== 'null') return true;
      if ((n.type === 'radio' || n.type === 'checkbox')) {
        const ck = $(`[name="${n.name}"]:checked`);
        if (ck && ck.value && ck.value !== '0' && ck.value !== 'null') return true;
      }
      if (n.type === 'hidden' && n.value && n.value !== '0' && n.value !== 'null') return true;
    }
    // Ordergroove/common UI flags (non-blocking heuristics)
    if ($('.og-selected, [data-og-state="opted-in"], .gh-subscribe-card[aria-pressed="true"]')) return true;
    return false;
  }

  function readLivePDPPrice(isSub) {
    const ogEl = isSub ? $('og-price[subscription]') : $('og-price[regular]');
    if (ogEl && ogEl.textContent.trim()) return ogEl.textContent.trim();
    const sale = $('.price .price-item.price-item--sale');
    if (sale && sale.textContent.trim()) return sale.textContent.trim();
    const reg = $('.price .price-item.price-item--regular');
    if (reg && reg.textContent.trim()) return reg.textContent.trim();
    return null;
  }

  function updateLabels(root) {
    const btn = root.querySelector('#StickyATCButton'); if (!btn) return;
    const addLabel = btn.querySelector('.add-to-cart-default-text');
    const subLabel = btn.querySelector('.add-to-cart-subscribe-text');
    const sub = isSubscriptionSelected();
    if (addLabel) addLabel.style.display = sub ? 'none' : '';
    if (subLabel) subLabel.style.display = sub ? '' : 'none';
  }

  function updatePrice(root, variants, id) {
    const btn = root.querySelector('#StickyATCButton');
    const priceEl = btn?.querySelector('.gh-sticky-atc__price');
    if (!btn || !priceEl) return;
    const live = readLivePDPPrice(isSubscriptionSelected());
    if (live) { priceEl.textContent = ' | ' + live; return; }
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

  function attachListeners(root, variants) {
    document.addEventListener('change', e => {
      const n = e.target?.name || '';
      if (n.includes('selling_plan')) { updateLabels(root); updatePrice(root, variants, currentVariantId(root)); }
      if (['id','options[','option'].some(p => n.startsWith(p))) updatePrice(root, variants, currentVariantId(root));
    });

    ['variant:change','product:variant-change','product:variant:change'].forEach(evt => {
      document.addEventListener(evt, e => {
        const id = e.detail?.variant?.id || e.detail?.id;
        if (id) updatePrice(root, variants, id);
      });
    });

    const priceRoot = $('.price') || document.body;
    const mo = new MutationObserver(() => {
      updateLabels(root);
      updatePrice(root, variants, currentVariantId(root));
    });
    mo.observe(priceRoot, { subtree: true, childList: true, attributes: true });

    const idInput = $('form[action*="/cart/add"] [name="id"]');
    if (idInput) {
      new MutationObserver(() => updatePrice(root, variants, currentVariantId(root)))
        .observe(idInput, { attributes: true, attributeFilter: ['value'] });
      idInput.addEventListener('input', () => updatePrice(root, variants, currentVariantId(root)));
    }

    const btn = root.querySelector('#StickyATCButton');
    btn?.addEventListener('click', triggerMainATC);
  }

  function waitForPrereqs(cb) {
    // Require: product form + (selling-plan input OR og-price)
    const ready = !!($('form[action*="/cart/add"]') && ($('[name^="selling_plan"]') || $('og-price')) );
    if (ready) return cb();
    setTimeout(() => waitForPrereqs(cb), 100);
  }

  function initOne(root) {
    const sectionId = root.getAttribute('data-section-id');
    const variantsEl = document.getElementById('gh-sticky-variants-' + sectionId);
    let variants = [];
    try { variants = JSON.parse(variantsEl?.textContent || '[]'); } catch (e) {}

    waitForPrereqs(() => {
      updateLabels(root);
      updatePrice(root, variants, currentVariantId(root));
      attachListeners(root, variants);
    });
  }

  function initAll() { document.querySelectorAll('[data-gh-sticky="true"]').forEach(initOne); }

  onReady(() => nextTick(initAll)); // defer one tick after DOMContentLoaded
})();
