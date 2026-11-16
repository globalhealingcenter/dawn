/*
  Keeps the Rebuy Smart Cart title "Your Cart (N)" up to date.

  The title's count span (.header-item-count) comes from Rebuy's settings and
  Rebuy doesn't update it when quantities change in the side cart, so we set it
  from Rebuy's own cart item_count.
*/
(function () {
  'use strict';

  function syncTitle() {
    var cart = window.Rebuy && window.Rebuy.Cart && window.Rebuy.Cart.cart;
    if (!cart || typeof cart.item_count !== 'number') return;

    var spans = document.querySelectorAll('.rebuy-cart .header-item-count');
    for (var i = 0; i < spans.length; i++) {
      if (spans[i].textContent !== String(cart.item_count)) spans[i].textContent = cart.item_count;
    }
  }

  // Rebuy may redraw its header right after an event, so set it again shortly after.
  function sync() {
    syncTitle();
    setTimeout(syncTitle, 100);
  }

  document.addEventListener('rebuy:cart.change', sync);
  document.addEventListener('rebuy:cart.ready', sync);
  document.addEventListener('rebuy:smartcart.show', sync);
})();
