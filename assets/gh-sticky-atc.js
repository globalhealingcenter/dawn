/* gh-sticky-atc.js — Sticky Add-to-Cart behavior (Shopify + Ordergroove friendly) */
(function () {
  // ---------- Helpers ----------
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

  // Detect if "Subscribe" is currently selected.
  // Works with Shopify selling plans and common Ordergroove DOM states.
  function isSubscriptionSelected() {
    // 1) Shopify selling plan inputs
    const spInputs = document.querySelectorAll(
      'form[action*="/cart/add"] [name="selling_plan"], form[action*="/cart/add"] [name^="selling_plan"]'
    );
    for (const n of spInputs) {
      const tag = (n.tagName || '').toUpperCase();
      if (tag === 'SELECT' && n.value && n.value !== '0' && n.value !== 'null') return true;
      if ((n.type === 'radio' || n.type === 'checkbox')) {
        const checked = document.querySelector(`[name="${n.name}"]:checked`);
        if (checked && checked.value && checked.value !== '0' && checked.value !== 'null') return true;
      }
      if (n.type === 'hidden' && n.value && n.value !== '0' && n.value !== 'null') return true;
    }

    // 2) Ordergroove / custom toggle heuristics (adjust selectors as needed)
    // Look for an opt-in button in "selected/pressed" state or container flags
    if (
      document.querySelector('.og-selected, [data-og-state="opted-in"], .gh-subscribe-card[aria-pressed="true"]')
    ) return true;

    return false;
  }

  // Try to read the *rendered* PDP price so the sticky bar mirrors exactly what the user sees.
  function readLivePDPPrice(isSub) {
    // Ordergroove custom elements are great sources:
    const ogEl = document.querySelector(isSub ? 'og-price[subscription]' : 'og-price[regular]');
    if (ogEl && ogEl.textContent.trim()) return ogEl.textContent.trim();

    // Shopify Dawn-style price blocks (fallbacks; may vary by theme):
    //  - when subscribed, some themes update the main price element too
    const mainSale = document.querySelector('.price .price-item.price-item--sale');
    if (mainSale && mainSale.textContent.trim()) return mainSale.textContent.trim();

    const mainReg = document.querySelector('.price .price-item.price-item--regular');
    if (mainReg && mainReg.textContent.trim()) return mainReg.textContent.trim();

    return null; // force variant-price fallback
  }

  function updateButtonLabels(root) {
    const btn = root.querySelector('#StickyATCButton');
    if (!btn) return;
    const addLabel = btn.querySelector('.add-to-cart-default-text');
    const subLabel = btn.querySelector('.add-to-cart-subscribe-text');
    const sub = isSubscriptionSelected();

    if (addLabel) addLabel.style.display = sub ? 'none' : '';
    if (subLabel) subLabel.style.display = sub ? '' : 'none';
  }

  function updatePriceUI(root, variants, id) {
    const btn = root.querySelector('#StickyATCButton');
    const priceEl = btn?.querySelector('.gh-sticky-atc__price');
    if (!btn || !priceEl) return;

    // Prefer mirroring the *live PDP* price so discounts/subscription are accurate
    const live = readLivePDPPrice(isSubscriptionSelected());
    if (live) {
      priceEl.textContent = ' | ' + live;
      return;
    }

    // Fallback: variant price
    const variant = findVariantById(variants, id);
    if (variant) priceEl.textContent = ' | ' + formatMoney(variant.price);
  }

  function triggerMainATC() {
    const mainBtn =
      document.querySelector('form[action*="/cart/add"] button[type="submit"]:not(#StickyATCButton)') ||
      document.querySelector('[data-type="add-to-cart"]:not(#StickyATCButton)') ||
      document.querySelector('.product-form__submit:not(#StickyATCButton)');
    if (mainBtn) { mainBtn.click(); return; }
    const form = document.querySelector('form[action*="/cart/add"]');
    if (form?.requestSubmit) form.requestSubmit();
    else if (form?.submit) form.submit();
  }

  // ---------- Init / Listeners ----------
  function attachListeners(root, variants) {
    // Variant & selling plan changes
    document.addEventListener('change', e => {
      const name = e.target?.name || '';
      if (name.includes('selling_plan')) {
        updateButtonLabels(root);
        updatePriceUI(root, variants, currentVariantId(root));
      }
      if (['id', 'options[', 'option'].some(prefix => name.startsWith(prefix))) {
        updatePriceUI(root, variants, currentVariantId(root));
      }
    });

    // Common theme custom events
    ['variant:change', 'product:variant-change', 'product:variant:change'].forEach(evt => {
      document.addEventListener(evt, e => {
        const id = e.detail?.variant?.id || e.detail?.id;
        if (id) updatePriceUI(root, variants, id);
      });
    });

    // Observe PDP price or opt-in widget changes (useful with apps manipulating DOM)
    const mo = new MutationObserver(() => {
      updateButtonLabels(root);
      updatePriceUI(root, variants, currentVariantId(root));
    });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true });

    // Input value change (some themes mutate id via JS)
    const idInput = document.querySelector('form[action*="/cart/add"] [name="id"]');
    if (idInput) {
      new MutationObserver(() => updatePriceUI(root, variants, currentVariantId(root)))
        .observe(idInput, { attributes: true, attributeFilter: ['value'] });
      idInput.addEventListener('input', () => updatePriceUI(root, variants, currentVariantId(root)));
    }

    // Button click → proxy to main ATC
    const btn = root.querySelector('#StickyATCButton');
    if (btn) btn.addEventListener('click', triggerMainATC);
  }

  function initOne(root) {
    const sectionId = root.getAttribute('data-section-id');
    const variantsEl = document.getElementById('gh-sticky-variants-' + sectionId);

    let variants = [];
    try { variants = JSON.parse(variantsEl?.textContent || '[]'); } catch (e) {}

    updateButtonLabels(root);
    updatePriceUI(root, variants, currentVariantId(root));
    attachListeners(root, variants);
  }

  function initAll() {
    document.querySelectorAll('[data-gh-sticky="true"]').forEach(initOne);
  }

  window.GHStickyATC = window.GHStickyATC || { init: initAll };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll, { once: true });
  } else {
    initAll();
  }
})();
