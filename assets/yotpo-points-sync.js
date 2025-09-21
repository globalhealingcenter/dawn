/**
 * Yotpo “Earn up to X points” — dynamic updater for PDP
 *
 * Why:
 * Yotpo’s native points widget uses the product’s default one-time price.
 * On our PDP the effective price can change (e.g., Subscribe & Save, variant
 * price differences). That makes the default “earn X points” message wrong.
 *
 * What this script does:
 * - Reads the *current* effective unit price shown on the PDP.
 * - Recalculates earned points using our simple rule:
 *     1 point per whole USD dollar (floor; e.g., $4.80 → 4 points).
 *   (No tiers or multipliers in this version.)
 * - Replaces the text inside the Yotpo points widget so it always matches the
 *   selection the shopper is viewing.
 *
 * When it runs:
 * - On initial page load and whenever price-affecting choices change:
 *   variant change, selling plan (Subscribe & Save) toggle/change, and quantity.
 * - Uses lightweight observers / debounced listeners to avoid reflow spam.
 *
 * Safety & performance:
 * - Non-destructive: if the Yotpo element isn’t present, the script quietly exits.
 * - No network calls; only DOM reads/writes of the widget’s text/aria.
 * - Selectors and the points rule can be adjusted at the top of the script.
 */

/* yotpo-points-sync.js
   Keep Yotpo "Earn up to X points" aligned to the currently selected price.
   Rule: 1 point per whole USD dollar (Math.floor). Example: $25.46 -> 25 points.

   You can adjust selectors in CONFIG if your theme uses different markup.
*/
(function () {
  // ---- CONFIG: tweak selectors if your theme differs ----
  const WIDGET_SELECTOR =
    '.yotpo-product-points-widget-logged-in-view, .yotpo-product-points-widget';
  const AMOUNT_SELECTOR =
    '.yotpo-product-points-widget-amount'; // if present we only change this text

  // potential price sources (ordered by preference)
  const PRICE_SELECTORS = [
    // 1) checked purchase/selling plan radios
    'input[type="radio"][name*="purchase"]:checked',
    'input[type="radio"][name*="selling_plan"]:checked',
    'input[name="purchase_option"]:checked',
    // 2) price labels in the selected row/container
    '.rc-option__price',
    '.selling-plan-group [data-price]',
    // 3) generic price elements as fallback
    '.price-item--sale',
    '.price-item--regular',
    '.product__price .price-item',
    '[data-product-price]'
  ];

  // only run on product pages (guard for theme.liquid load)
  if (!/\/products\//.test(location.pathname)) return;

  // --- helpers ---
  const parseUSD = (txt) => {
    if (!txt) return NaN;
    // pull the first $number.xx in the string
    const m = String(txt).replace(/,/g, '').match(/\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
    return m ? parseFloat(m[1]) : NaN;
  };

  const selectedRowText = () => {
    const radio = document.querySelector(
      'input[type="radio"][name*="purchase"]:checked, ' +
      'input[type="radio"][name*="selling_plan"]:checked, ' +
      'input[name="purchase_option"]:checked'
    );
    if (!radio) return '';
    const row = radio.closest(
      'label, .purchase-option, .selling-plan, .rc-option, .purchase-option__row, .selling-plan-group'
    );
    return row ? row.textContent : '';
  };

  const getEffectivePrice = () => {
    // 1) try the checked purchase/plan row first
    let price = parseUSD(selectedRowText());

    // 2) scan fallbacks
    if (!price || isNaN(price)) {
      for (const sel of PRICE_SELECTORS) {
        const el = document.querySelector(sel);
        if (el) {
          price = parseUSD(el.getAttribute('data-price') || el.textContent);
          if (!isNaN(price)) break;
        }
      }
    }
    return price;
  };

  const setPoints = (points) => {
    const widget = document.querySelector(WIDGET_SELECTOR);
    if (!widget) return;

    const label = `Earn up to ${points} point${points === 1 ? '' : 's'}`;

    // If Yotpo exposes a dedicated span for the number, change only that
    const amt = widget.querySelector(AMOUNT_SELECTOR);
    if (amt) {
      amt.textContent = `${points} point${points === 1 ? '' : 's'}`;
    } else {
      // Fallback: set the whole text (useful if the widget is plain text)
      widget.textContent = label;
    }

    widget.setAttribute('aria-label', label);
  };

  const recalc = () => {
    const price = getEffectivePrice();
    if (!price || isNaN(price)) return;
    const points = Math.floor(price); // 1 point per whole dollar
    setPoints(points);
  };

  // --- wire up ---
  const run = () => {
    recalc();

    // user interactions that can change the effective price
    document.addEventListener('change', (e) => {
      if (
        e.target.matches('input[type="radio"], select, [name*="purchase"], [name*="selling_plan"]')
      ) {
        // small delay to let theme update prices in DOM
        setTimeout(recalc, 50);
      }
    });

    // MutationObserver to catch price/widget rerenders
    let t;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(recalc, 120); // debounce
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run);
})();

