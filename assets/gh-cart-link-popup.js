/*
  Add-to-cart links that open the header cart popup (not Rebuy Smart Cart).


  Works with Shopify cart permalinks already used on landing pages:
    <a href="/cart/45203563708616:1">Add to cart</a>
    <a href="https://globalhealing.com/cart/111:1,222:2">Add both</a>


  Only links inside .landing-page or marked with [data-cart-popup] are handled.
  If anything fails, the link falls back to its normal behaviour.
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


    // Close Rebuy's Smart Cart if it opens because of this add to cart.
    function blockRebuyFor(ms) {
        function hide() {
            if (window.Rebuy && window.Rebuy.SmartCart && typeof window.Rebuy.SmartCart.hide === 'function') {
                window.Rebuy.SmartCart.hide();
            }
        }
        document.addEventListener('rebuy:smartcart.show', hide);
        setTimeout(function () {
            document.removeEventListener('rebuy:smartcart.show', hide);
        }, ms);
    }


    document.addEventListener('click', function (event) {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;


        var link = event.target.closest && event.target.closest(SCOPE);
        if (!link) return;


        var items = parseItems(link.getAttribute('href'));
        var popup = document.querySelector('cart-notification');
        if (!items || !popup) return; // let the link work normally


        event.preventDefault();
        if (link.dataset.loading) return;
        link.dataset.loading = '1';
        link.setAttribute('aria-busy', 'true');


        blockRebuyFor(3000);


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
                    if (!response.ok) throw new Error(data.description || data.message || 'Add to cart
          return data;
                });
            })
            .then(function (data) {
                // The header popup shows the first added item.
                data.key = data.items && data.items[0] && data.items[0].key;
                popup.renderContents(data);
            })
            .catch(function (error) {
                console.error('[GH cart link]', error);
                alert(error.message); // e.g. "This product is sold out."
            })
            .finally(function () {
                delete link.dataset.loading;
                link.removeAttribute('aria-busy');
            });
    });
})();