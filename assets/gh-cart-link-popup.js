/*
  Add-to-cart links that stay on the page and open the Rebuy Smart Cart sidebar.

  Works with Shopify cart permalinks already used on landing pages:
    <a href="/cart/45203563708616:1">Add to cart</a>
    <a href="https://globalhealing.com/cart/111:1,222:2">Add both</a>

  Only links inside .landing-page or marked with [data-cart-popup] are handled.
  If Rebuy isn't available, the theme's header cart popup opens instead.
*/
(function () {
  'use strict';

  var SCOPE = '.landing-page a[href*="/cart/"], a[data-cart-popup][href*="/cart/"]';
  var SECTIONS = 'cart-notification-product,cart-notification-button,cart-icon-bubble';

  // "/cart/111:1,222:2" -> [{ id: 111, quantity: 1 }, { id: 222, quantity: 2 }]
  function parseItems(href) {
    var path;
    try {
      path = new URL(href, window.location.href).pathname;
    } catch (error) {
      return null;
    }

    var match = path.match(/^\/cart\/(\d+:\d+(?:,\d+:\d+)*)\/?$/);
    if (!match) return null;

    return match[1].split(',').map(function (pair) {
      var parts = pair.split(':');
      return { id: Number(parts[0]), quantity: Number(parts[1]) || 1 };
    });
  }

  function rebuySmartCart() {
    var rebuy = window.Rebuy;
    return rebuy && rebuy.SmartCart && typeof rebuy.SmartCart.show === 'function' ? rebuy : null;
  }

  function openRebuy(rebuy) {
    var refresh = rebuy.Cart && typeof rebuy.Cart.fetchCart === 'function'
      ? Promise.resolve(rebuy.Cart.fetchCart())
      : Promise.resolve();

    return refresh.catch(function () {}).then(function () {
      rebuy.SmartCart.show();
    });
  }

  function openHeaderPopup(data) {
    var popup = document.querySelector('cart-notification');
    if (!popup) {
      window.location.href = '/cart';
      return;
    }
    // The header popup shows the first added item.
    data.key = data.items && data.items[0] && data.items[0].key;
    popup.renderContents(data);
  }

  // Capture phase: Rebuy Smart Cart puts its own click handler on cart links
  // and stops propagation, so a normal (bubbling) listener never runs.
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    var link = event.target.closest && event.target.closest(SCOPE);
    if (!link) return;

    var items = parseItems(link.getAttribute('href'));
    if (!items) return; // not a cart permalink, let the link work normally

    event.preventDefault();
    event.stopPropagation(); // keep Rebuy's own link handler (go to checkout) from running
    if (link.dataset.loading) return;
    link.dataset.loading = '1';
    link.setAttribute('aria-busy', 'true');

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        items: items,
        sections: SECTIONS,
        sections_url: window.location.pathname
      })
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error(data.description || data.message || 'Add to cart failed');
          return data;
        });
      })
      .then(function (data) {
        var rebuy = rebuySmartCart();
        if (rebuy) return openRebuy(rebuy);
        openHeaderPopup(data);
      })
      .catch(function (error) {
        console.error('[GH cart link]', error);
        alert(error.message); // e.g. "This product is sold out."
      })
      .finally(function () {
        delete link.dataset.loading;
        link.removeAttribute('aria-busy');
      });
  }, true);
})();
