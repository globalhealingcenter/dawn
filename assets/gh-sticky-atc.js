/* gh-sticky-atc.js — Sticky Add-to-Cart behavior (theme-agnostic) */
(function () {
  function formatMoney(cents) {
    try {
      const currency = (window.Shopify && Shopify.currency && Shopify.currency.active) || 'USD';
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
    } catch {
      return `$${(cents / 100).toFixed(2)}`;
    }
  }

  function findVariantById(variants, id) {
    return variants.find(v => String(v.id) === String(id)) || null;
  }

  function currentVariantId(root) {
    const form = document.querySelector('form[action*="/cart/add"]');
    return (
      form?.querySelector('[name="id"]')?.value ||
      document.querySelector('select[name="id"]')?.value ||
      root.getAttribute('data-initial-variant')
    );
  }

  function updatePriceUI(root, variants, id) {
    const btn = root.querySelector('#StickyATCButton');
    const priceEl = btn?.querySelector('.gh-sticky-atc__price');
    if (!btn || !priceEl) return;
    const variant = findVariantById(variants, id);
    if (variant) priceEl.textContent = ' | ' + formatMoney(variant.price);
  }

  function updateSubscribeTextUI(root) {
    const btn = root.querySelector('#StickyATCButton');
    if (!btn) return;
    const addLabel = btn.querySelector('.add-to-cart-default-text');
    const subLabel = btn.querySelector('.add-to-cart-subscribe-text');
    const sp = document.querySelector('[name^="selling_plan"]');

    const isCheckedInput = n =>
      ['radio', 'checkbox'].includes(n?.type) ? !!document.querySelector(`[name="${n.name}"]:checked`)?.value : !!n?.value;

    const isSub = sp?.tagName === 'SELECT' ? !!sp.value : isCheckedInput(sp);

    if (addLabel) addLabel.style.display = isSub ? 'none' : '';
    if (subLabel) subLabel.style.display = isSub ? '' : 'none';
  }

  function triggerMainATC() {
    const mainBtn =
      document.querySelector('form[action*="/cart/add"] button[type="submit"]:not(#StickyATCButton)') ||
      document.querySelector('[data-type="add-to-cart"]:not(#StickyATCButton)') ||
      document.querySelector('.product-form__submit:not(#StickyATCButton)');
    if (mainBtn) {
      mainBtn.click();
      return;
    }
    const form = document.querySelector('form[action*="/cart/add"]');
    if (form?.requestSubmit) form.requestSubmit();
    else if (form?.submit) form.submit();
  }

  function attachListeners(root, variants) {
    document.addEventListener('change', e => {
      const n = e.target?.name || '';
      if (n.includes('selling_plan')) updateSubscribeTextUI(root);
      if (['id', 'options[', 'option'].some(prefix => n.startsWith(prefix))) {
        updatePriceUI(root, variants, currentVariantId(root));
      }
    });

    // Listen for common variant-change custom events (varies by theme)
    ['variant:change', 'product:variant-change', 'product:variant:change'].forEach(evt => {
      document.addEventListener(evt, e => {
        const id = e.detail?.variant?.id || e.detail?.id;
        if (id) updatePriceUI(root, variants, id);
      });
    });

    const idInput = document.querySelector('form[action*="/cart/add"] [name="id"]');
    if (idInput) {
      new MutationObserver(() => updatePriceUI(root, variants, currentVariantId(root)))
        .observe(idInput, { attributes: true, attributeFilter: ['value'] });
      idInput.addEventListener('input', () => updatePriceUI(root, variants, currentVariantId(root)));
    }

    const btn = root.querySelector('#StickyATCButton');
    if (btn) btn.addEventListener('click', triggerMainATC);
  }

  function initOne(root) {
    const sectionId = root.getAttribute('data-section-id');
    const variantsEl = document.getElementById('gh-sticky-variants-' + sectionId);

    let variants = [];
    try { variants = JSON.parse(variantsEl?.textContent || '[]'); } catch (e) {}

    updateSubscribeTextUI(root);
    updatePriceUI(root, variants, currentVariantId(root));
    attachListeners(root, variants);
  }

  function initAll() {
    document.querySelectorAll('[data-gh-sticky="true"]').forEach(initOne);
  }

  // Public (optional) manual init: window.GHStickyATC.init()
  window.GHStickyATC = window.GHStickyATC || { init: initAll };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll, { once: true });
  } else {
    initAll();
  }
})();
