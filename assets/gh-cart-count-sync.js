/*
  Keeps the header cart icon and count in sync with Rebuy Smart Cart.

  Rebuy changes the cart (quantity +/-, remove, add) without telling the theme,
  so the header bubble kept the old number. Rebuy's "rebuy:cart.change" event
  carries the updated cart, so we use its item_count straight away. When the
  cart switches between empty and not empty, the icon itself changes, so we
  re-render the theme's cart-icon-bubble section instead.
*/
(function () {
  'use strict';

  var timer = null;

  function renderSection() {
    var icon = document.getElementById('cart-icon-bubble');
    if (!icon) return;

    fetch(window.location.pathname + '?sections=cart-icon-bubble', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    })
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (sections) {
        if (!sections || !sections['cart-icon-bubble']) return;
        var html = new DOMParser().parseFromString(sections['cart-icon-bubble'], 'text/html');
        var fresh = html.querySelector('.shopify-section');
        if (fresh) icon.innerHTML = fresh.innerHTML;
      })
      .catch(function (error) {
        console.warn('[GH cart count]', error);
      });
  }

  // Update the existing bubble in place. Returns false if it can't (no bubble,
  // or the cart is now empty), so the caller re-renders the section.
  function setCount(count) {
    var icon = document.getElementById('cart-icon-bubble');
    var bubble = icon && icon.querySelector('.cart-count-bubble');
    if (!bubble || count < 1) return false;

    var visible = bubble.querySelector('[aria-hidden="true"]');
    var hidden = bubble.querySelector('.visually-hidden');
    if (visible) visible.textContent = count < 100 ? count : '';
    if (hidden) hidden.textContent = hidden.textContent.replace(/\d+/, count);
    return true;
  }

  // "Your Cart (N)" title inside the Rebuy side cart. The header HTML comes from
  // Rebuy's settings and its count span isn't kept up to date by Rebuy.
  function rebuyCount() {
    var cart = window.Rebuy && window.Rebuy.Cart && window.Rebuy.Cart.cart;
    return cart && typeof cart.item_count === 'number' ? cart.item_count : null;
  }

  function syncTitle(count) {
    if (typeof count !== 'number') count = rebuyCount();
    if (count === null) return;
    var spans = document.querySelectorAll('.rebuy-cart .header-item-count');
    for (var i = 0; i < spans.length; i++) {
      if (spans[i].textContent !== String(count)) spans[i].textContent = count;
    }
  }

  document.addEventListener('rebuy:cart.change', function (event) {
    var detail = event.detail || {};
    var cart = detail.cart && detail.cart.cart;
    var count = cart && typeof cart.item_count === 'number' ? cart.item_count : null;

    syncTitle(count);
    // Rebuy may redraw its header right after the change; set it again.
    setTimeout(function () { syncTitle(); }, 100);

    if (count !== null && setCount(count)) return;

    // Empty <-> not empty, or no count in the event: ask Shopify for the icon.
    clearTimeout(timer);
    timer = setTimeout(renderSection, 600);
  });

  document.addEventListener('rebuy:cart.ready', function () { syncTitle(); });
  document.addEventListener('rebuy:smartcart.show', function () {
    syncTitle();
    setTimeout(function () { syncTitle(); }, 100);
  });
})();
