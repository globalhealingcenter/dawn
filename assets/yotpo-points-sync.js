<script>
(function () {
  // ---- helpers ----
  const $ = (s, r=document) => r.querySelector(s);

  // Try a few common price locations. Returns cents (int) or null.
  function getPriceCents() {
    const candidates = [
      '[data-current-price]',
      '[data-product-price]',
      '[data-price]',
      '.price .price__sale .price-item--sale',
      '.price .price-item--sale',
      '.price .price__regular .price-item--regular',
      '.price-item.price-item--regular',
      '.price .price-item__price',
    ];
    for (const sel of candidates) {
      const el = $(sel);
      if (!el) continue;
      const raw = (el.getAttribute('data-current-price')
                || el.getAttribute('data-product-price')
                || el.getAttribute('data-price')
                || el.textContent || '').trim();
      // keep only digits (assumes $ with 2 decimals)
      const cents = parseInt(raw.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(cents) && cents > 0) return cents;
    }
    return null;
  }

  function getQty() {
    const q = $('input[name="quantity"]');
    const n = q ? parseInt(q.value, 10) : 1;
    return isNaN(n) ? 1 : Math.max(1, n);
  }

  // Find the numeric span inside Yotpo's points widget.
  function getYotpoPointsSpan() {
    const root =
      $('.yotpo-product-points-widget-logged-in-view') ||
      $('.yotpo-product-points-widget-logged-out-view') ||
      $('.yotpo-product-points-widget');
    if (!root) return null;

    return root.querySelector('.yotpo-product-points-widget-points-amount')
        || root.querySelector('.yotpo-product-points-widget-amount')
        || root.querySelector('[class*="points-amount"]')
        || root.querySelector('span'); // fallback
  }

  // ---- main updater ----
  function updatePoints() {
    const span = getYotpoPointsSpan();
    const priceCents = getPriceCents();
    if (!span || !priceCents) return;

    const qty = getQty();
    // 1 pt per $1, DO NOT round up
    const points = Math.floor((priceCents * qty) / 100);
    span.textContent = points.toString();
  }

  // ---- wire it up ----
  function start() {
    // Initial update when widget shows up
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (getYotpoPointsSpan()) {
        clearInterval(iv);
        updatePoints();

        // React to price re-renders
        const priceRoot = $('.price') || document.body;
        new MutationObserver(updatePoints)
          .observe(priceRoot, { childList: true, subtree: true, characterData: true });

        // React to Yotpo re-renders
        const widgetRoot = getYotpoPointsSpan()?.closest('.yotpo-product-points-widget') || document.body;
        new MutationObserver(updatePoints)
          .observe(widgetRoot, { childList: true, subtree: true });

        // React to user input (qty / subscription toggles)
        document.addEventListener('change', (e) => {
          const t = e.target;
          if (!t) return;
          if (t.name === 'quantity' || t.name === 'selling_plan' || t.name === 'selling_plan_id') {
            updatePoints();
          }
        });
        document.addEventListener('click', (e) => {
          if (e.target.closest('[data-subscription],[data-selling-plan],[data-purchase-option]')) {
            setTimeout(updatePoints, 0);
          }
        });
      } else if (Date.now() - t0 > 10000) {
        clearInterval(iv); // give up after 10s
      }
    }, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
</script>
