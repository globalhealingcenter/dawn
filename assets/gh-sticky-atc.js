/**
 * ============================================================
 * GH Sticky ATC — PDP v2
 * ============================================================
 *
 * Responsibilities:
 *
 * 1. Show/hide sticky bar based on scroll position
 * 2. Detect One-Time / Subscribe state from main PDP
 * 3. Relay sticky purchase-type changes to main PDP / OG
 * 4. Mirror selling-plan / delivery-frequency selection
 * 5. Synchronize current Shopify variant
 * 6. Synchronize One-Time pricing
 * 7. Read subscription pricing from PDP / OrderGroove
 * 8. Display original price + discounted subscription price
 * 9. Show subscription benefits
 * 10. Proxy Add to Cart to real PDP form
 * 11. Scroll back to top
 *
 * IMPORTANT:
 *
 * This file intentionally DOES NOT calculate:
 *
 *     price * 0.85
 *
 * or any other subscription discount.
 *
 * OrderGroove / the main PDP is the source of truth for
 * subscription pricing.
 */


(function () {
  'use strict';


  /* ==========================================================
     GENERAL HELPERS
     ========================================================== */


  const $ = (selector, root = document) => {
    return root.querySelector(selector);
  };


  const $$ = (selector, root = document) => {
    return Array.from(root.querySelectorAll(selector));
  };


  function onReady(callback) {

    if (document.readyState === 'loading') {

      document.addEventListener(
        'DOMContentLoaded',
        callback,
        {
          once: true
        }
      );

    } else {

      callback();

    }

  }


  function dispatchChange(element) {

    if (!element) {
      return;
    }

    element.dispatchEvent(
      new Event(
        'change',
        {
          bubbles: true
        }
      )
    );

  }


  function dispatchInput(element) {

    if (!element) {
      return;
    }

    element.dispatchEvent(
      new Event(
        'input',
        {
          bubbles: true
        }
      )
    );

  }


  /* ==========================================================
     MONEY
     ========================================================== */


  function formatMoney(cents) {

    if (
      cents === null ||
      cents === undefined ||
      cents === ''
    ) {
      return '';
    }


    try {

      const currency =
        window.Shopify &&
          Shopify.currency &&
          Shopify.currency.active
          ? Shopify.currency.active
          : 'USD';


      return new Intl.NumberFormat(
        undefined,
        {
          style: 'currency',
          currency
        }
      ).format(
        Number(cents) / 100
      );

    } catch (error) {

      return '$' + (
        Number(cents) / 100
      ).toFixed(2);

    }

  }


  function cleanMoneyText(value) {

    if (!value) {
      return null;
    }


    const text = String(value)
      .replace(/\s+/g, ' ')
      .trim();


    const match = text.match(
      /(?:USD\s*)?[$£€]\s?\d[\d,.]*(?:\.\d{1,2})?/
    );


    return match
      ? match[0]
      : null;

  }


  /* ==========================================================
     CURRENT PRODUCT FORM
     ========================================================== */


  function getProductForm() {

    /**
     * Prefer normal Shopify product forms.
     * Avoid forms belonging to recommended products, cart
     * drawers, quick view, etc. as much as possible.
     */

    return (
      $('.product__info-wrapper form[action*="/cart/add"]') ||
      $('.product-info form[action*="/cart/add"]') ||
      $('product-form form[action*="/cart/add"]') ||
      $('form[action*="/cart/add"]')
    );

  }


  function getMainATCButton() {

    const form = getProductForm();


    if (form) {

      return (
        $('button[type="submit"][name="add"]', form) ||
        $('.product-form__submit', form) ||
        $('[data-type="add-to-cart"]', form) ||
        $('button[type="submit"]', form)
      );

    }


    return (
      $('.product-form__submit:not([data-gh-sticky-atc-button])') ||
      $('[data-type="add-to-cart"]:not([data-gh-sticky-atc-button])')
    );

  }


  /* ==========================================================
     CURRENT SHOPIFY VARIANT
     ========================================================== */


  function getCurrentVariantId(root) {

    const form = getProductForm();


    if (form) {

      const variantField = $(
        'input[name="id"], select[name="id"]',
        form
      );


      if (
        variantField &&
        variantField.value
      ) {

        return String(
          variantField.value
        );

      }

    }


    /**
     * Dawn / modern themes may maintain a selected variant
     * selector outside the product form.
     */

    const globalVariant = $(
      [
        '.product__info-wrapper [name="id"]',
        'variant-selects [name="id"]',
        'variant-radios [name="id"]',
        '[data-product-form] [name="id"]'
      ].join(',')
    );


    if (
      globalVariant &&
      globalVariant.value
    ) {

      return String(
        globalVariant.value
      );

    }


    /**
     * URL fallback:
     *
     * ?variant=123456789
     */

    try {

      const params = new URLSearchParams(
        window.location.search
      );


      const urlVariant = params.get(
        'variant'
      );


      if (urlVariant) {

        return String(
          urlVariant
        );

      }

    } catch (error) {
      // Ignore URL parsing errors.
    }


    return String(
      root.getAttribute(
        'data-initial-variant'
      ) || ''
    );

  }


  function getCurrentVariant(root, variants) {

    if (
      !variants ||
      !variants.length
    ) {

      return null;

    }


    const currentId =
      getCurrentVariantId(root);


    const match = variants.find(
      variant => {

        return String(variant.id) ===
          String(currentId);

      }
    );


    return match || variants[0];

  }


  /* ==========================================================
     SCROLL VISIBILITY
     ========================================================== */


  function initScrollVisibility(root) {

    const threshold = parseInt(
      root.getAttribute(
        'data-show-after-px'
      ) || '300',
      10
    );


    function updateVisibility() {

      if (threshold <= 0) {

        root.classList.remove(
          'gh-sticky-atc--hidden'
        );

        return;

      }


      const shouldHide =
        window.scrollY < threshold;


      root.classList.toggle(
        'gh-sticky-atc--hidden',
        shouldHide
      );

    }


    updateVisibility();


    let ticking = false;


    window.addEventListener(
      'scroll',
      () => {

        if (ticking) {
          return;
        }


        ticking = true;


        window.requestAnimationFrame(
          () => {

            updateVisibility();

            ticking = false;

          }
        );

      },
      {
        passive: true
      }
    );

  }


  /* ==========================================================
     ORDERGROOVE / SUBSCRIPTION STATE
     ========================================================== */


  function isValidSellingPlanValue(value) {

    if (
      value === null ||
      value === undefined
    ) {

      return false;

    }


    const clean = String(value).trim();


    return (
      clean !== '' &&
      clean !== '0' &&
      clean !== 'null' &&
      clean !== 'undefined'
    );

  }


  function getSellingPlanFields() {

    const form = getProductForm();


    if (form) {

      const formFields = $$(
        '[name="selling_plan"]',
        form
      );


      if (formFields.length) {

        return formFields;

      }

    }


    return $$(
      '[name="selling_plan"]'
    );

  }


  function getActivePlanId() {

    const fields =
      getSellingPlanFields();


    for (const field of fields) {

      if (
        isValidSellingPlanValue(
          field.value
        )
      ) {

        return String(
          field.value
        );

      }

    }


    /**
     * OrderGroove custom element fallback.
     */

    const ogOffer = $('og-offer');


    if (ogOffer) {

      const plan =
        ogOffer.getAttribute('selling-plan') ||
        ogOffer.getAttribute('selling-plan-id') ||
        ogOffer.getAttribute('data-selling-plan') ||
        ogOffer.getAttribute('data-selling-plan-id');


      if (
        isValidSellingPlanValue(plan)
      ) {

        return String(plan);

      }

    }


    return null;

  }


  function detectPDPState() {

    /**
     * Signal #1:
     * Shopify selling_plan has an active value.
     */

    if (getActivePlanId()) {

      return 'subscribe';

    }


    /**
     * Signal #2:
     * Native or theme radio buttons.
     */

    const subscriptionChecked = $(

      [
        'input[type="radio"][data-og-option="subscribe"]:checked',
        'input[type="radio"][value="subscribe"]:checked',
        'input[type="radio"][value="subscription"]:checked',
        'input[type="radio"][data-purchase-type="subscribe"]:checked',
        'input[type="radio"][data-purchase-option="subscribe"]:checked',
        'input[type="radio"][data-selling-plan-option="subscribe"]:checked'
      ].join(',')

    );


    if (subscriptionChecked) {

      return 'subscribe';

    }


    const oneTimeChecked = $(

      [
        'input[type="radio"][data-og-option="onetime"]:checked',
        'input[type="radio"][value="onetime"]:checked',
        'input[type="radio"][value="one-time"]:checked',
        'input[type="radio"][data-purchase-type="onetime"]:checked',
        'input[type="radio"][data-purchase-option="onetime"]:checked'
      ].join(',')

    );


    if (oneTimeChecked) {

      return 'onetime';

    }


    /**
     * Signal #3:
     * OrderGroove custom element state attributes.
     */

    const ogOffer = $('og-offer');


    if (ogOffer) {

      const state = (

        ogOffer.getAttribute('og-state') ||
        ogOffer.getAttribute('data-og-state') ||
        ogOffer.getAttribute('state') ||
        ''

      ).toLowerCase();


      if (
        state.includes('opted-in') ||
        state.includes('subscribe') ||
        state.includes('subscription')
      ) {

        return 'subscribe';

      }


      if (
        state.includes('opted-out') ||
        state.includes('onetime') ||
        state.includes('one-time')
      ) {

        return 'onetime';

      }

    }


    /**
     * Signal #4:
     * Common OG state classes.
     */

    if (
      $(
        [
          '.og-opted-in',
          '.og-subscribe-selected',
          '[class*="og-opted-in"]'
        ].join(',')
      )
    ) {

      return 'subscribe';

    }


    return 'onetime';

  }


  /* ==========================================================
     MAIN PDP PRICES
     ========================================================== */


  function getProductInfoRoot() {

    return (
      $('.product__info-wrapper') ||
      $('.product-info') ||
      $('product-info') ||
      document
    );

  }


  function readOneTimePriceFromPDP() {

    const area = getProductInfoRoot();


    /**
     * OrderGroove regular price.
     */

    const ogSelectors = [

      'og-price[regular]',
      'og-price[one-time]',
      '[data-og-price="regular"]',
      '[data-og-price="onetime"]',
      '[data-og-price="one-time"]'

    ];


    for (const selector of ogSelectors) {

      const element = $(
        selector,
        area
      ) || $(selector);


      if (element) {

        const money = cleanMoneyText(
          element.textContent
        );


        if (money) {
          return money;
        }

      }

    }


    /**
     * Shopify/Dawn regular/current price.
     */

    const selectors = [

      '.price__container .price__regular .price-item--regular',
      '.price__container .price-item--regular',
      '.price .price-item--regular',
      '[data-product-price]',
      '[data-price]'

    ];


    for (const selector of selectors) {

      const element = $(
        selector,
        area
      );


      if (element) {

        const money = cleanMoneyText(
          element.textContent
        );


        if (money) {
          return money;
        }

      }

    }


    return null;

  }


  function readSubscriptionPriceFromPDP() {

    const area = getProductInfoRoot();


    /**
     * OrderGroove-specific price candidates first.
     */

    const selectors = [

      'og-price[subscription]',
      'og-price[subscribe]',
      '[data-og-price="subscription"]',
      '[data-og-price="subscribe"]',
      '[data-subscription-price]',
      '.og-subscription-price',
      '.og-price-subscription',
      '.og-price-current',
      '[class*="subscription-price"]'

    ];


    for (const selector of selectors) {

      const element =
        $(selector, area) ||
        $(selector);


      if (!element) {
        continue;
      }


      const money = cleanMoneyText(
        element.textContent
      );


      if (money) {

        return money;

      }

    }


    /**
     * Theme sale price fallback.
     *
     * We use this only while PDP says subscription is active.
     */

    const saleSelectors = [

      '.price__sale .price-item--sale',
      '.price .price-item--sale',
      '.price-item--sale'

    ];


    for (const selector of saleSelectors) {

      const element = $(
        selector,
        area
      );


      if (!element) {
        continue;
      }


      const money = cleanMoneyText(
        element.textContent
      );


      if (money) {

        return money;

      }

    }


    return null;

  }


  function readComparePriceFromPDP() {

    const area = getProductInfoRoot();


    const selectors = [

      '[data-og-compare-price]',
      '.og-price-compare',
      'og-price[regular]',
      '[data-compare-price]',
      '.price__sale .price-item--regular',
      '.price del',
      's.price-item'

    ];


    for (const selector of selectors) {

      const element =
        $(selector, area) ||
        $(selector);


      if (!element) {
        continue;
      }


      const money = cleanMoneyText(
        element.textContent
      );


      if (money) {

        return money;

      }

    }


    return null;

  }


  /* ==========================================================
     PRICE SYNC
     ========================================================== */


  function syncPrice(
    root,
    variants,
    isSubscription
  ) {

    const priceElement = $(
      '[data-gh-price]',
      root
    );


    const compareElement = $(
      '[data-gh-compare-price]',
      root
    );


    if (!priceElement) {
      return;
    }


    const currentVariant =
      getCurrentVariant(
        root,
        variants
      );


    /**
     * ========================================================
     * ONE-TIME
     * ========================================================
     */

    if (!isSubscription) {

      let price =
        readOneTimePriceFromPDP();


      if (
        !price &&
        currentVariant
      ) {

        price = formatMoney(
          currentVariant.price
        );

      }


      if (price) {

        priceElement.textContent = price;

      }


      if (compareElement) {

        compareElement.textContent = '';

        compareElement.style.display =
          'none';

      }


      return;

    }


    /**
     * ========================================================
     * SUBSCRIPTION
     *
     * IMPORTANT:
     * We do not calculate the discount.
     * ========================================================
     */

    const subscriptionPrice =
      readSubscriptionPriceFromPDP();


    let originalPrice =
      readComparePriceFromPDP();


    /**
     * If OG doesn't expose a separate compare element,
     * current Shopify variant price is the One-Time original
     * price.
     */

    if (
      !originalPrice &&
      currentVariant
    ) {

      originalPrice = formatMoney(
        currentVariant.price
      );

    }


    if (subscriptionPrice) {

      priceElement.textContent =
        subscriptionPrice;

    }


    /**
     * Never replace subscription price with calculated 15%.
     *
     * If OG has not initialized yet, retain existing displayed
     * price until its DOM becomes available.
     */


    if (
      compareElement &&
      originalPrice &&
      subscriptionPrice &&
      normalizePriceText(originalPrice) !==
      normalizePriceText(subscriptionPrice)
    ) {

      compareElement.textContent =
        originalPrice;

      compareElement.style.display = '';

    } else if (compareElement) {

      compareElement.textContent = '';

      compareElement.style.display =
        'none';

    }

  }


  function normalizePriceText(value) {

    return String(value || '')
      .replace(/\s+/g, '')
      .replace(/,/g, '')
      .toLowerCase();

  }


  /* ==========================================================
     TOGGLE UI
     ========================================================== */


  function applyToggleUI(
    root,
    isSubscription
  ) {

    const oneTimeButton = $(
      '[data-gh-toggle="onetime"]',
      root
    );


    const subscriptionButton = $(
      '[data-gh-toggle="subscribe"]',
      root
    );


    const delivery = $(
      '.gh-sticky-delivery',
      root
    );


    const deliverySelect = $(
      '[data-gh-delivery]',
      root
    );


    if (oneTimeButton) {

      oneTimeButton.setAttribute(
        'aria-pressed',
        isSubscription
          ? 'false'
          : 'true'
      );

    }


    if (subscriptionButton) {

      subscriptionButton.setAttribute(
        'aria-pressed',
        isSubscription
          ? 'true'
          : 'false'
      );

    }


    root.classList.toggle(
      'gh-sticky-atc--subscribed',
      isSubscription
    );


    if (delivery) {

      delivery.setAttribute(
        'aria-hidden',
        isSubscription
          ? 'false'
          : 'true'
      );

    }


    if (deliverySelect) {

      deliverySelect.disabled =
        !isSubscription;

    }


    /**
     * Requirement says CTA remains "Add to Cart"
     * for both purchase types.
     */

    const buttonText = $(
      '.gh-sticky-atc__btn-text',
      root
    );


    if (buttonText) {

      buttonText.textContent =
        'Add to Cart';

    }

  }


  /* ==========================================================
     SELLING PLAN / DELIVERY LABELS
     ========================================================== */


  function formatPlanLabel(name) {

    if (!name) {
      return '';
    }


    const original = String(name).trim();


    /**
     * Examples:
     *
     * "Delivery every 1 month"
     * "Every 1 month"
     * "1 Month"
     */

    const monthMatch = original.match(
      /(?:delivery\s+)?(?:every\s+)?(\d+)\s*months?/i
    );


    if (monthMatch) {

      const quantity =
        parseInt(
          monthMatch[1],
          10
        );


      return (
        quantity +
        ' ' +
        (
          quantity === 1
            ? 'month'
            : 'months'
        )
      );

    }


    /**
     * Convert standard 30 / 60 / 90-day options to
     * design-friendly monthly wording.
     */

    const dayMatch = original.match(
      /(?:delivery\s+)?(?:every\s+)?(\d+)\s*days?/i
    );


    if (dayMatch) {

      const days =
        parseInt(
          dayMatch[1],
          10
        );


      const mapping = {

        30: '1 month',

        60: '2 months',

        90: '3 months',

        120: '4 months',

        180: '6 months'

      };


      if (mapping[days]) {

        return mapping[days];

      }

    }


    return original;

  }


  function getPlanData(root) {

    const sectionId =
      root.getAttribute(
        'data-section-id'
      );


    const script = document.getElementById(
      'gh-sticky-plans-' +
      sectionId
    );


    if (!script) {
      return [];
    }


    try {

      return JSON.parse(
        script.textContent || '[]'
      );

    } catch (error) {

      console.warn(
        '[GH Sticky ATC] Unable to parse selling plans.',
        error
      );

      return [];

    }

  }


  function populateDeliveryOptions(root) {

    const select = $(
      '[data-gh-delivery]',
      root
    );


    if (!select) {
      return;
    }


    const plans =
      getPlanData(root);


    if (!plans.length) {
      return;
    }


    const currentValue =
      select.value;


    select.innerHTML = '';


    plans.forEach(plan => {

      const option =
        document.createElement(
          'option'
        );


      option.value =
        String(plan.id);


      option.textContent =
        formatPlanLabel(
          plan.name
        );


      select.appendChild(
        option
      );

    });


    if (
      currentValue &&
      Array.from(
        select.options
      ).some(
        option =>
          String(option.value) ===
          String(currentValue)
      )
    ) {

      select.value =
        currentValue;

    }

  }


  function syncActiveDelivery(root) {

    const select = $(
      '[data-gh-delivery]',
      root
    );


    if (!select) {
      return;
    }


    const activePlan =
      getActivePlanId();


    if (!activePlan) {
      return;
    }


    const planExists = Array.from(
      select.options
    ).some(
      option => {

        return String(option.value) ===
          String(activePlan);

      }
    );


    if (
      planExists &&
      String(select.value) !==
      String(activePlan)
    ) {

      select.value =
        String(activePlan);

    }

  }


  /* ==========================================================
     RELAY PURCHASE TYPE TO MAIN PDP
     ========================================================== */


  function clickElement(element) {

    if (!element) {
      return false;
    }


    try {

      element.click();

      return true;

    } catch (error) {

      return false;

    }

  }


  function findSubscriptionControl() {

    const selectors = [

      'input[type="radio"][data-og-option="subscribe"]',
      'input[type="radio"][value="subscribe"]',
      'input[type="radio"][value="subscription"]',
      'input[data-purchase-type="subscribe"]',
      '[data-purchase-option="subscribe"]',
      '[data-og-action="optin"]',
      'og-optin-button'

    ];


    for (const selector of selectors) {

      const element =
        $(selector);


      if (element) {

        return element;

      }

    }


    return null;

  }


  function findOneTimeControl() {

    const selectors = [

      'input[type="radio"][data-og-option="onetime"]',
      'input[type="radio"][value="onetime"]',
      'input[type="radio"][value="one-time"]',
      'input[data-purchase-type="onetime"]',
      '[data-purchase-option="onetime"]',
      '[data-og-action="optout"]',
      'og-optout-button'

    ];


    for (const selector of selectors) {

      const element =
        $(selector);


      if (element) {

        return element;

      }

    }


    return null;

  }


  function activateFormControl(element) {

    if (!element) {
      return false;
    }


    /**
     * Radio/checkbox needs checked property before events.
     */

    if (
      element.matches &&
      element.matches(
        'input[type="radio"], input[type="checkbox"]'
      )
    ) {

      element.checked = true;

      dispatchInput(element);

      dispatchChange(element);

      clickElement(element);

      return true;

    }


    return clickElement(element);

  }


  function relayToggle(targetState) {

    /**
     * ========================================================
     * SUBSCRIBE
     * ========================================================
     */

    if (targetState === 'subscribe') {

      const subscribeControl =
        findSubscriptionControl();


      if (
        activateFormControl(
          subscribeControl
        )
      ) {

        return true;

      }


      /**
       * OrderGroove API fallbacks.
       *
       * These are defensive only. Exact live OG integration
       * can be substituted here once its exposed API is known.
       */

      if (window.OrderGroove) {

        if (
          typeof window.OrderGroove.setSubscribe ===
          'function'
        ) {

          window.OrderGroove.setSubscribe();

          return true;

        }


        if (
          typeof window.OrderGroove.optIn ===
          'function'
        ) {

          window.OrderGroove.optIn();

          return true;

        }

      }


      return false;

    }


    /**
     * ========================================================
     * ONE-TIME
     * ========================================================
     */

    const oneTimeControl =
      findOneTimeControl();


    if (
      activateFormControl(
        oneTimeControl
      )
    ) {

      return true;

    }


    if (window.OrderGroove) {

      if (
        typeof window.OrderGroove.setOnetime ===
        'function'
      ) {

        window.OrderGroove.setOnetime();

        return true;

      }


      if (
        typeof window.OrderGroove.optOut ===
        'function'
      ) {

        window.OrderGroove.optOut();

        return true;

      }

    }


    /**
     * If the theme uses selling_plan alone as its subscription
     * source, clearing that value returns to One-Time.
     */

    const planFields =
      getSellingPlanFields();


    if (planFields.length) {

      planFields.forEach(
        field => {

          field.value = '';

          dispatchInput(field);

          dispatchChange(field);

        }
      );


      return true;

    }


    return false;

  }


  /* ==========================================================
     RELAY DELIVERY PLAN TO MAIN PDP
     ========================================================== */


  function relayPlanChange(planId) {

    if (!planId) {
      return;
    }


    let updated = false;


    /**
     * Shopify selling_plan fields.
     */

    const fields =
      getSellingPlanFields();


    fields.forEach(field => {

      const tagName =
        field.tagName.toLowerCase();


      if (
        tagName === 'select'
      ) {

        const exists =
          Array.from(
            field.options
          ).some(
            option =>
              String(option.value) ===
              String(planId)
          );


        if (exists) {

          field.value =
            String(planId);

          dispatchInput(field);

          dispatchChange(field);

          updated = true;

        }

      } else {

        field.value =
          String(planId);

        dispatchInput(field);

        dispatchChange(field);

        updated = true;

      }

    });


    /**
     * Try matching radio option.
     */

    const planRadio = $(

      [
        `input[name="selling_plan"][value="${CSS.escape(String(planId))}"]`,
        `input[data-selling-plan-id="${CSS.escape(String(planId))}"]`
      ].join(',')

    );


    if (planRadio) {

      activateFormControl(
        planRadio
      );

      updated = true;

    }


    /**
     * OrderGroove custom element API.
     */

    const ogOffer =
      $('og-offer');


    if (
      ogOffer &&
      typeof ogOffer.setSellingPlan ===
      'function'
    ) {

      try {

        ogOffer.setSellingPlan(
          planId
        );

        updated = true;

      } catch (error) {

        console.warn(
          '[GH Sticky ATC] OG setSellingPlan failed.',
          error
        );

      }

    }


    /**
     * Optional OG global API fallback.
     */

    if (
      !updated &&
      window.OrderGroove &&
      typeof window.OrderGroove.setSellingPlan ===
      'function'
    ) {

      try {

        window.OrderGroove.setSellingPlan(
          planId
        );

        updated = true;

      } catch (error) {
        // No-op.
      }

    }


    return updated;

  }


  /* ==========================================================
     ADD TO CART
     ========================================================== */


  function syncATCAvailability(
    root,
    variants
  ) {

    const stickyButton = $(
      '[data-gh-sticky-atc-button]',
      root
    );


    if (!stickyButton) {
      return;
    }


    const mainButton =
      getMainATCButton();


    const currentVariant =
      getCurrentVariant(
        root,
        variants
      );


    let unavailable = false;


    if (
      currentVariant &&
      currentVariant.available === false
    ) {

      unavailable = true;

    }


    if (
      mainButton &&
      mainButton.disabled
    ) {

      unavailable = true;

    }


    stickyButton.disabled =
      unavailable;


    const text = $(
      '.gh-sticky-atc__btn-text',
      stickyButton
    );


    if (text) {

      text.textContent =
        unavailable
          ? 'Sold Out'
          : 'Add to Cart';

    }

  }


  function triggerMainATC(root) {

    const stickyButton = $(
      '[data-gh-sticky-atc-button]',
      root
    );


    if (
      !stickyButton ||
      stickyButton.disabled
    ) {

      return;

    }


    const mainButton =
      getMainATCButton();


    if (mainButton) {

      stickyButton.classList.add(
        'is-loading'
      );


      try {

        mainButton.click();

      } finally {

        window.setTimeout(
          () => {

            stickyButton.classList.remove(
              'is-loading'
            );

          },
          1000
        );

      }


      return;

    }


    const form =
      getProductForm();


    if (form) {

      stickyButton.classList.add(
        'is-loading'
      );


      try {

        if (
          typeof form.requestSubmit ===
          'function'
        ) {

          form.requestSubmit();

        } else {

          form.submit();

        }

      } finally {

        window.setTimeout(
          () => {

            stickyButton.classList.remove(
              'is-loading'
            );

          },
          1000
        );

      }

    }

  }


  /* ==========================================================
     COMPLETE UI SYNC
     ========================================================== */


  function syncAll(
    root,
    variants
  ) {

    const state =
      detectPDPState();


    const isSubscription =
      state === 'subscribe';


    applyToggleUI(
      root,
      isSubscription
    );


    syncActiveDelivery(
      root
    );


    syncPrice(
      root,
      variants,
      isSubscription
    );


    syncATCAvailability(
      root,
      variants
    );

  }


  /* ==========================================================
     WAIT FOR PDP / ORDERGROOVE
     ========================================================== */


  function waitForPurchaseUI(
    callback,
    attempt = 0
  ) {

    const maxAttempts = 60;


    const formExists =
      Boolean(
        getProductForm()
      );


    const subscriptionExists =
      Boolean(
        $('og-offer') ||
        $('[name="selling_plan"]') ||
        findSubscriptionControl()
      );


    /**
     * Start once product form is ready.
     *
     * OG may load later, so observers continue syncing it.
     */

    if (
      formExists &&
      (
        subscriptionExists ||
        attempt >= 15
      )
    ) {

      callback();

      return;

    }


    if (
      attempt >= maxAttempts
    ) {

      callback();

      return;

    }


    window.setTimeout(
      () => {

        waitForPurchaseUI(
          callback,
          attempt + 1
        );

      },
      100
    );

  }


  /* ==========================================================
     OBSERVER
     ========================================================== */


  function createPDPObserver(
    root,
    variants
  ) {

    let syncTimer = null;


    function scheduleSync() {

      window.clearTimeout(
        syncTimer
      );


      syncTimer = window.setTimeout(
        () => {

          syncAll(
            root,
            variants
          );

        },
        30
      );

    }


    const watchRoot =
      getProductInfoRoot();


    const observer =
      new MutationObserver(
        scheduleSync
      );


    observer.observe(
      watchRoot,
      {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [
          'class',
          'checked',
          'value',
          'selected',
          'og-state',
          'data-og-state',
          'selling-plan',
          'selling-plan-id',
          'data-selling-plan'
        ]
      }
    );


    return observer;

  }


  /* ==========================================================
     GLOBAL PRODUCT EVENTS
     ========================================================== */


  function bindProductEvents(
    root,
    variants
  ) {

    const events = [

      'variant:change',

      'variantChange',

      'product:variant-change',

      'product:variant:change',

      'product-info:variant-change',

      'og:state-change',

      'ordergroove:state-change',

      'selling-plan:change'

    ];


    events.forEach(
      eventName => {

        document.addEventListener(
          eventName,
          () => {

            window.setTimeout(
              () => {

                syncAll(
                  root,
                  variants
                );

              },
              50
            );

          }
        );

      }
    );


    /**
     * Catch standard product option/input changes.
     */

    document.addEventListener(
      'change',
      event => {

        const target =
          event.target;


        if (!target) {
          return;
        }


        if (

          target.matches(
            [
              'input[name="id"]',
              'select[name="id"]',
              '[name="options[]"]',
              '[name^="options"]',
              '[name="selling_plan"]',
              'variant-selects select',
              'variant-radios input'
            ].join(',')
          )

        ) {

          window.setTimeout(
            () => {

              syncAll(
                root,
                variants
              );

            },
            40
          );

        }

      }
    );

  }


  /* ==========================================================
     PARSE VARIANTS
     ========================================================== */


  function getVariants(root) {

    const sectionId =
      root.getAttribute(
        'data-section-id'
      );


    const element =
      document.getElementById(
        'gh-sticky-variants-' +
        sectionId
      );


    if (!element) {
      return [];
    }


    try {

      return JSON.parse(
        element.textContent || '[]'
      );

    } catch (error) {

      console.warn(
        '[GH Sticky ATC] Unable to parse variant data.',
        error
      );


      return [];

    }

  }


  /* ==========================================================
     INITIALIZE ONE STICKY SECTION
     ========================================================== */


  function initOne(root) {

    /**
     * Prevent duplicate initialization.
     */

    if (
      root.dataset.ghStickyInitialized ===
      'true'
    ) {

      return;

    }


    root.dataset.ghStickyInitialized =
      'true';


    const variants =
      getVariants(root);


    initScrollVisibility(
      root
    );


    /**
     * Scroll-to-top works even before OG loads.
     */

    const scrollButton = $(
      '[data-gh-scroll-top]',
      root
    );


    if (scrollButton) {

      scrollButton.addEventListener(
        'click',
        () => {

          window.scrollTo(
            {
              top: 0,
              behavior: 'smooth'
            }
          );

        }
      );

    }


    waitForPurchaseUI(
      () => {

        populateDeliveryOptions(
          root
        );


        syncAll(
          root,
          variants
        );


        /**
         * ----------------------------------------------------
         * One-Time / Subscribe toggle
         * ----------------------------------------------------
         */

        $$(
          '[data-gh-toggle]',
          root
        ).forEach(
          button => {

            button.addEventListener(
              'click',
              () => {

                const targetState =
                  button.getAttribute(
                    'data-gh-toggle'
                  );


                const wantsSubscription =
                  targetState ===
                  'subscribe';


                /**
                 * Update sticky UI immediately for responsiveness.
                 */

                applyToggleUI(
                  root,
                  wantsSubscription
                );


                /**
                 * Relay to the actual PDP / OrderGroove.
                 */

                relayToggle(
                  targetState
                );


                /**
                 * OG/the theme may need multiple rendering cycles.
                 */

                window.setTimeout(
                  () => {

                    syncAll(
                      root,
                      variants
                    );

                  },
                  80
                );


                window.setTimeout(
                  () => {

                    syncAll(
                      root,
                      variants
                    );

                  },
                  250
                );


                window.setTimeout(
                  () => {

                    syncAll(
                      root,
                      variants
                    );

                  },
                  600
                );

              }
            );

          }
        );


        /**
         * ----------------------------------------------------
         * Delivery selector
         * ----------------------------------------------------
         */

        const deliverySelect = $(
          '[data-gh-delivery]',
          root
        );


        if (deliverySelect) {

          deliverySelect.addEventListener(
            'change',
            event => {

              const selectedPlan =
                event.target.value;


              if (!selectedPlan) {
                return;
              }


              /**
               * Ensure Subscribe is selected first.
               */

              if (
                detectPDPState() !==
                'subscribe'
              ) {

                relayToggle(
                  'subscribe'
                );

              }


              relayPlanChange(
                selectedPlan
              );


              window.setTimeout(
                () => {

                  syncAll(
                    root,
                    variants
                  );

                },
                100
              );


              window.setTimeout(
                () => {

                  syncAll(
                    root,
                    variants
                  );

                },
                400
              );

            }
          );

        }


        /**
         * ----------------------------------------------------
         * Add To Cart
         * ----------------------------------------------------
         */

        const stickyATC = $(
          '[data-gh-sticky-atc-button]',
          root
        );


        if (stickyATC) {

          stickyATC.addEventListener(
            'click',
            () => {

              triggerMainATC(
                root
              );

            }
          );

        }


        /**
         * ----------------------------------------------------
         * Observe main purchase area
         * ----------------------------------------------------
         */

        createPDPObserver(
          root,
          variants
        );


        /**
         * ----------------------------------------------------
         * Bind global variant / OG events
         * ----------------------------------------------------
         */

        bindProductEvents(
          root,
          variants
        );


        /**
         * ----------------------------------------------------
         * Direct selling_plan listeners
         * ----------------------------------------------------
         */

        getSellingPlanFields().forEach(
          field => {

            field.addEventListener(
              'change',
              () => {

                window.setTimeout(
                  () => {

                    syncAll(
                      root,
                      variants
                    );

                  },
                  20
                );

              }
            );

          }
        );


        /**
         * One final sync once OG has had more time.
         */

        window.setTimeout(
          () => {

            populateDeliveryOptions(
              root
            );


            syncAll(
              root,
              variants
            );

          },
          1000
        );

      }
    );

  }


  /* ==========================================================
     INITIALIZE ALL
     ========================================================== */


  function initAll() {

    $$(
      '[data-gh-sticky="true"]'
    ).forEach(
      root => {

        initOne(root);

      }
    );

  }


  onReady(
    initAll
  );


  /**
   * Shopify Theme Editor support.
   *
   * Re-initialize section when dynamically added/reloaded.
   */

  document.addEventListener(
    'shopify:section:load',
    event => {

      const section =
        event.target;


      const root =
        section.matches &&
          section.matches(
            '[data-gh-sticky="true"]'
          )
          ? section
          : $(
            '[data-gh-sticky="true"]',
            section
          );


      if (root) {

        root.dataset.ghStickyInitialized =
          'false';


        initOne(root);

      }

    }
  );

})();