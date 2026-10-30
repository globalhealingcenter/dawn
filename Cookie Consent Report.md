**GLOBAL HEALING  COOKIE CONSENT CHECK**

# Cookie Consent Check

*A quick check of the cookie consent banner on globalhealing.com*

# What We Tested

We checked whether the cookie banner (Termly) actually stops tracking scripts from running when a visitor clicks "Decline." We loaded the site fresh, recorded every script that ran before any button was clicked, then clicked "Decline All" and reloaded to see what changed.

# Result

| Vendor / Script | What it does | Result |
| :---- | :---- | :---: |
| Google Ads / Analytics | Ad tracking & site analytics | ✔ Respects choice |
| Klaviyo, Yotpo, YouTube | Email marketing, reviews, video | ✔ Respects choice |
| Microsoft / Bing Ads | Ad tracking pixel | ✘ Ignores choice |
| Rebuy Engine | Cart tracking & personalization | ✘ Ignores choice |
| Northbeam | Marketing attribution | ✘ Ignores choice |

# Three Scripts Are Not Blocked

* Microsoft/Bing Ads  runs and sets tracking cookies immediately on page load, before and after clicking Decline.

* Rebuy Engine (cart/upsell tool)  sends about 20 tracking calls on every page load, regardless of consent choice.

* Northbeam (marketing attribution)  also runs automatically on every load.

These three are added directly to the site code and are not connected to the cookie banner, so the banner has no way to stop them.

# Why It Matters

The banner tells visitors that tracking won't start until they agree to it. Right now, three tools don't follow that rule. In regions with strict privacy laws, this is a real compliance risk, not just a technical detail.

# Recommended Fix

This is a configuration change, not a rebuild. Each of the three scripts needs to be added to Termly's blocked list so it waits for consent before running  the same way Google and Klaviyo already do. Happy to help set this up.

**Cookie Consent Fix, Test Results**

We tested the cookie banner (Termly) on the draft theme, checking network requests and stored tracking IDs before and after Accept/Decline.

**Working correctly:**

* **Northbeam**, Fixed. Wrapped in `<script type="text/plain" data-categories="advertising">` and it now stays silent until a visitor accepts, then activates correctly.

**Still a problem, Bing Ads pixel & Rebuy Engine**

Three fixes were tried for these two, in order, and none fully worked:

1. **Same script wrapping as Northbeam**, `<script type="text/plain" data-categories="advertising">` applied to the Bing and Rebuy scripts. Still fired before consent and after Decline.  
2. **Added both domains to Termly's Advertising third-party domain list** (`bat.bing.com` and `rebuyengine.com`, set via Termly's dashboard). Still fired.  
3. **Added Termly's custom blocking map script** as provided by Termly:

\<\!-- Termly custom blocking map \--\>  
\<script data-termly-config\>  
  window.TERMLY\_CUSTOM\_BLOCKING\_MAP \= {  
    "bat.bing.com": "advertising",  
    "rebuyengine.com": "advertising",  
  }  
\</script\>

Still fired, on both the live site and the draft theme, confirmed across repeated tests.

**Why it's still not working:** Both scripts are loading from more than one place on the page, not just the one script tag that got wrapped/blocked. Our testing found extra, untouched copies of the Bing and Rebuy scripts still present and executing (e.g. Rebuy shows 4 script instances on the page, only 1 ever gated). All three of Termly's methods, manual wrapping, the domain block list, and the custom blocking map, only catch scripts that exist as static tags in the page's HTML at load time. They don't reliably catch a script that gets added to the page dynamically afterward, at runtime, by other code (like the theme's JS, GTM, or the vendor's own loader script re-injecting itself). That's exactly what's happening here: one copy gets blocked, but a second copy gets injected some other way and loads anyway, so consent gets bypassed.

**Next step:** Engineering needs to trace where those extra Bing/Rebuy script instances are actually coming from (not the static Termly-wrapped tag) and stop that injection at the source, since Termly's built-in tools won't catch it. Currently we are in discussion with Termly support to help identify these items so that we can take our next step of action. 

\<div class="yotpo-widget-instance" data-yotpo-instance-id="38307"\>\</div\>  
\<script src="https\://cdn-widgetsrepository.yotpo.com/v1/loader/biz9zGm3crKRr\_rj-OtV8w" async\>\</script\>  
\<img src="https\://api.yotpo.com/conversion\_tracking.gif?app\_key=63EcnfHVSENo8yIBbBSY9uqxQxPZztn6xa7YvxGC\&order\_id={{order\_name\|handleize}}\&order\_amount={{subtotal\_price\|money\_without\_currency}}\&order\_currency={{ shop.currency }}" width="1" height="1"\>

  \<\!--  
  Elevar Data Layer  
    
  This file is automatically updated and should not be edited directly.  
    
  https\://knowledge.getelevar.com/how-to-customize-data-layer-version-2  
    
  Updated: 2023-08-22 19:06:41+00:00  
  Version: 3.8.0  
  \--\>  
  \<\!-- Google Tag Manager \--\>  
  \<script\>  
    window.dataLayer \= window.dataLayer \|\| \[\];  
  \</script\>  
  \<script\>  
    (function(w,d,s,l,i){w\[l\]=w\[l\]\|\|\[\];w\[l\].push({"gtm.start":  
    new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)\[0\],  
    j=d.createElement(s),dl=l\!="dataLayer"?"\&l="+l:"";j.async=true;j.src=  
    "https\://www\.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);  
  })(window,document,"script","dataLayer","GTM-KJTRKBG");  
  \</script\>  
  \<\!-- End Google Tag Manager \--\>  
  \<script id="elevar-gtm-suite-config" type="application/json"\>{"gtm\_id": "GTM-KJTRKBG", "event\_config": {"cart\_reconcile": true, "cart\_view": true, "checkout\_complete": true, "checkout\_step": true, "collection\_view": true, "defers\_collection\_loading": false, "defers\_search\_results\_loading": false, "product\_add\_to\_cart": true, "product\_add\_to\_cart\_ajax": true, "product\_remove\_from\_cart": true, "product\_select": true, "product\_view": true, "search\_results\_view": false, "user": true, "save\_order\_notes": true}, "gtm\_suite\_script": "https\://shopify-gtm-suite.getelevar.com/shops/f47ccbb80c31bd05256747b4e7aba593a0c43e45/3.8.0/gtm-suite.js", "consent\_enabled": false, "apex\_domain": null}\</script\>

  \<script\>  
    (() \=\> {  
    if (\!window.\_\_ElevarIsGtmSuiteCalled) {  
    window.\_\_ElevarIsGtmSuiteCalled \= true;  
    const init \= () \=\> {  
    window.\_\_ElevarDataLayerQueue \= \[\];  
    window.\_\_ElevarListenerQueue \= \[\];  
    if (\!window.dataLayer) window.dataLayer \= \[\];  
  };  
    init();  
    window.\_\_ElevarTransformItem \= event \=\> {  
    if (typeof window.ElevarTransformFn \=== "function") {  
    try {  
    const result \= window.ElevarTransformFn(event);  
    if (typeof result \=== "object" && \!Array.isArray(result) && result \!== null) {  
    return result;  
  } else {  
    console.error("Elevar Data Layer: \`window.ElevarTransformFn\` returned a value " \+ "that wasn't an object, so we've treated things as if this " \+ "function wasn't defined.");  
    return event;  
  }  
  } catch (error) {  
    console.error("Elevar Data Layer: \`window.ElevarTransformFn\` threw an error, so " \+ "we've treated things as if this function wasn't defined. The " \+ "exact error is shown below.");  
    console.error(error);  
    return event;  
  }  
  } else {  
    return event;  
  }  
  };  
    window.ElevarPushToDataLayer \= item \=\> {  
    const date \= new Date();  
    localStorage.setItem("\_\_\_ELEVAR\_GTM\_SUITE--lastDlPushTimestamp", String(Math.floor(date.getTime() / 1000)));  
    const enrichedItem \= {  
    event\_id: window.crypto.randomUUID ? window.crypto.randomUUID() : String(Math.random()).replace("0.", ""),  
    event\_time: date.toISOString(),  
    ...item  
  };  
    const transformedEnrichedItem \= window.\_\_ElevarTransformItem ? window.\_\_ElevarTransformItem(enrichedItem) : enrichedItem;  
    const payload \= {  
    raw: enrichedItem,  
    transformed: transformedEnrichedItem  
  };  
    if (transformedEnrichedItem.\_elevar\_internal?.isElevarContextPush) {  
    window.\_\_ElevarIsContextSet \= true;  
    window.\_\_ElevarDataLayerQueue.unshift(payload);  
    window.\_\_ElevarListenerQueue.unshift(payload);  
  } else {  
    window.\_\_ElevarDataLayerQueue.push(payload);  
    window.\_\_ElevarListenerQueue.push(payload);  
  }  
    window.dispatchEvent(new CustomEvent("elevar-listener-notify"));  
    if (window.\_\_ElevarIsContextSet) {  
    while (window.\_\_ElevarDataLayerQueue.length \> 0\) {  
    const event \= window.\_\_ElevarDataLayerQueue.shift().transformed;  
    window.dataLayer.push(event);  
  }  
  }  
  };

    const configElement \= document.getElementById("elevar-gtm-suite-config");

    if (\!configElement) {  
    console.error("Elevar: DL Config element not found");  
    return;  
  }

    const config \= JSON.parse(configElement.textContent);

    const script \= document.createElement("script");  
    script.type \= "text/javascript";  
    script.src \= config.gtm\_suite\_script;  
    script.async \= false;  
    script.defer \= true;

    script.onerror \= () \=\> {  
    console.error("Elevar: DL JS script failed to load");  
  };  
    script.onload \= async () \=\> {  
    if (\!window.ElevarGtmSuite) {  
    console.error("Elevar: \`ElevarGtmSuite\` is not defined");  
    return;  
  }

    window.ElevarGtmSuite.utils.emailCapture();

    const cartData \= {  
    attributes: {{- cart.attributes \| json \-}},  
    cartTotal: "{{- cart.total\_price \| times: 0.01 \| json \-}}",  
    currencyCode: {{- cart.currency.iso\_code \| json \-}},  
    items: \[  
  {%- for line\_item in cart.items \-%}  
  {  
  {%- if line\_item.sku \!= blank \-%}  
    id: {{- line\_item.sku \| json \-}},  
  {%- else \-%}  
    id: "{{- line\_item.product\_id \| json \-}}",  
  {%- endif \-%}  
    name: {{- line\_item.product.title \| json \-}},  
    brand: {{- line\_item.vendor \| json \-}},  
    category: {{- line\_item.product.type \| json \-}},  
    variant: {{- line\_item.variant.title \| json \-}},  
    price: "{{- line\_item.final\_price \| times: 0.01 \| json \-}}",  
    position: {{- forloop.index \-}},  
    quantity: "{{- line\_item.quantity \| json \-}}",  
    productId: "{{- line\_item.product\_id \| json \-}}",  
    variantId: "{{- line\_item.variant\_id \-}}",  
    compareAtPrice: "{{- line\_item.variant.compare\_at\_price \| times: 0.01 \| json \-}}",  
    image: "{{- line\_item.image \| image\_url \-}}"  
  },  
  {%- endfor \-%}  
    \]  
  }  
    ;

    await window.ElevarGtmSuite.handlers.cartAttributesReconcile(  
    cartData,  
    config.event\_config.save\_order\_notes,  
    config.consent\_enabled,  
    config.apex\_domain  
    );

    if (config.event\_config.user) {  
    const data \= {  
  {%- if checkout \-%}  
    cartTotal: "{{- checkout.total\_price \| times: 0.01 \| json \-}}",  
    currencyCode: {{- checkout.currency \| json \-}},  
  {%- else \-%}  
    cartTotal: "{{- cart.total\_price \| times: 0.01 \| json \-}}",  
    currencyCode: {{- cart.currency.iso\_code \| json \-}},  
  {%- endif \-%}  
  {%- if customer \-%}  
    customer: {  
    id: "{{- customer.id \| json \-}}",  
    email: {{- customer.email \| json \-}},  
    firstName: {{- customer.first\_name \| json \-}},  
    lastName: {{- customer.last\_name \| json \-}},  
    phone: {{- customer.phone \| json \-}},  
    city: {{- customer.default\_address.city \| json \-}},  
    zip: {{- customer.default\_address.zip \| json \-}},  
    address1: {{- customer.default\_address.address1 \| json \-}},  
    address2: {{- customer.default\_address.address2 \| json \-}},  
    country: {{- customer.default\_address.country \| json \-}},  
    countryCode: {{- customer.default\_address.country\_code \| json \-}},  
    province: {{- customer.default\_address.province \| json \-}},  
    provinceCode: {{- customer.default\_address.province\_code \| json \-}},  
    tags: {{- customer.tags \| join: ', ' \| json \-}}  
  }  
  {%- endif \-%}  
  };  
    window.ElevarGtmSuite.handlers.user(data);  
  }

  {%- if first\_time\_accessed \-%}  
    if (config.event\_config.checkout\_complete) {  
    const data \= {%- if checkout \-%}  
  {  
    currencyCode: {{- checkout.currency \| json \-}},  
    actionField: {  
  {%- if checkout.order\_id \-%}  
    id: {{- checkout.order\_id \| json \-}},  
  {%- else \-%}  
    id: {{- checkout.id \| json \-}},  
  {%- endif \-%}  
  {%- if checkout.order\_name \-%}  
    order\_name: {{- checkout.order\_name \| json \-}},  
  {%- endif \-%}  
    affiliation: {{- shop.name \| json \-}},  
    revenue: "{{- checkout.total\_price \| times: 0.01 \| json \-}}",  
    tax: "{{- checkout.tax\_price \| times: 0.01 \| json \-}}",  
    shipping: "{{- checkout.shipping\_price \| times: 0.01 \| json \-}}",  
  {%- if checkout.discount\_applications \-%}  
    coupon: {{- checkout.discount\_applications\[0\].title \| json \-}},  
  {%- endif \-%}  
  {%- if order.subtotal\_price \-%}  
    subTotal: "{{- order.subtotal\_price \| times: 0.01 \| json \-}}",  
  {%- elsif checkout.subtotal\_price \-%}  
    subTotal: "{{- checkout.subtotal\_price \| times: 0.01 \| json \-}}",  
  {%- endif \-%}  
    productSubTotal: "{{- checkout.line\_items\_subtotal\_price \| times: 0.01 \| json \-}}",  
    discountAmount: "{{- checkout.discounts\_amount \| times: 0.01 \| json \-}}"  
  },  
  {%- if checkout.customer \-%}  
    customer: {  
    id: "{{- checkout.customer.id \| json \-}}",  
    email: {{- checkout.email \| json \-}},  
    firstName: {{- checkout.billing\_address.first\_name \| json \-}},  
    lastName: {{- checkout.billing\_address.last\_name \| json \-}},  
  {%- if checkout.customer.phone \-%}  
    phone: {{- checkout.customer.phone \| json \-}},  
  {%- elsif checkout.billing\_address.phone \-%}  
    phone: {{- checkout.billing\_address.phone \| json \-}},  
  {%- else \-%}  
    phone: {{- checkout.shipping\_address.phone \| json \-}},  
  {%- endif \-%}  
    city: {{- checkout.billing\_address.city \| json \-}},  
    zip: {{- checkout.billing\_address.zip \| json \-}},  
    address1: {{- checkout.billing\_address.address1 \| json \-}},  
    address2: {{- checkout.billing\_address.address2 \| json \-}},  
    country: {{- checkout.billing\_address.country \| json \-}},  
    countryCode: {{- checkout.billing\_address.country\_code \| json \-}},  
    province: {{- checkout.billing\_address.province \| json \-}},  
    provinceCode: {{- checkout.billing\_address.province\_code \| json \-}},  
    tags: {{- checkout.customer.tags \| json \-}}  
  },  
  {%- endif \-%}  
    items: \[  
  {%- for line\_item in checkout.line\_items \-%}  
  {  
  {%- if line\_item.sku \!= blank \-%}  
    id: {{- line\_item.sku \| json \-}},  
  {%- else \-%}  
    id: "{{- line\_item.product\_id \| json \-}}",  
  {%- endif \-%}  
    name: {{- line\_item.product.title \| json \-}},  
    brand: {{- line\_item.vendor \| json \-}},  
    category: {{- line\_item.product.type \| json \-}},  
    variant: {{- line\_item.variant.title \| json \-}},  
    price: "{{- line\_item.final\_price \| times: 0.01 \| json \-}}",  
    quantity: "{{- line\_item.quantity \| json \-}}",  
    productId: "{{- line\_item.product\_id \| json \-}}",  
    variantId: "{{- line\_item.variant\_id \-}}",  
    image: "{{- line\_item.image \| image\_url \-}}"  
  },  
  {%- endfor \-%}  
    \],  
    landingSite: {{- checkout.landing\_site \| json \-}}  
  }  
  {%- endif \-%}  
    ;  
    window.ElevarGtmSuite.handlers.checkoutComplete(data);  
  }  
  {%- endif \-%}  
  };

    document.head.appendChild(script);  
  }  
  })();  
  \</script\>

  \<\!-- Google Tag Manager (noscript) \--\>  
  \<noscript\>  
    \<iframe src="https\://www\.googletagmanager.com/ns.html?id=GTM-KJTRKBG" height="0" width="0" style="display:none;visibility:hidden"\>\</iframe\>  
  \</noscript\>  
  \<\!-- End Google Tag Manager (noscript) \--\>

  \<\!-- EXPONEA start \--\>  
  \<script\>(function(b,c){if(\!b.exponea){var a=function(a,g){function k(d){return function(){var e=arguments;""==a&&"initialize"==d&\&e&\&e\[0\].modify&\&e\[0\].modify.overlay&&"loading"==c.readyState&&(c.write('\<div id="\_\_inf\_\_overlay\_\_" style="position:absolute;background:\#fff;left:0;top:0;width:100%;height:100%;z-index:1000000"\>\</div\>'),setTimeout(function(){var a=c.getElementById("\_\_inf\_\_overlay\_\_");a&\&c.body.removeChild(a);res.\_\_=\!0},e\[0\].modify.delay\|\|500));b.exponea.\_.push(\[a+d,arguments\])}}var h=g.split(" "),f,d;res={\_:\[\]};for(d=0;d\<h.length;d++)f=h\[d\],res\[f\]=k(f);return res};b.exponea=a("","initialize identify update track trackLink trackEnhancedEcommerce getHtml showHtml showBanner showForm ping getAbTest");b.exponea.notifications=a("notifications.","isAvailable isSubscribed subscribe unsubscribe");var a=c.createElement("script"),g="https:"===c.location.protocol?"https:":"http:";a.type="text/javascript";a.async=\!0;a.src=g+"//api.us1.exponea.com/js/exponea.min.js";c.getElementsByTagName("head")\[0\].appendChild(a);b.webxpClient=b.webxpClient\|\|{};b.webxpClient.sdk=b.exponea;b.webxpClient.sdkObjectName="exponea"}})(window,document);\</script\>  
  \<script type="text/javascript"\>  
    exponea.initialize({  
    "target": "//api.us1.exponea.com",  
    "token": "cdfa07d2-90b2-11eb-b9b6-867564e6537c",  
    "cookies": {  
    expires: 730 \* 24 \* 3600 // \= 730 days  
  },  
    "customer": {  
  {% if checkout.customer %}  
  {% if checkout.customer.email %}"email\_id": {{ checkout.customer.email \| json }}{% endif %}  
  {% endif %}  
  },  
    "track": {  
    "visits": true,  
  {% if shop %}"default\_properties": { "domain": {{ shop.permanent\_domain\|json }} } {% endif %}  
  }  
  });  
    if (Shopify && Shopify.Checkout && Shopify.Checkout.step) {  
    exponea.track('checkout', {  
      step\_title: Shopify.Checkout.step,  
      shipping\_city: {{ checkout.shipping\_address.city \| json }},  
    shipping\_cost: {{ checkout.shipping\_method.price \| json }},  
    shipping\_country: {{ checkout.shipping\_address.country \| json }},  
    shipping\_type: {{ checkout.shipping\_method.title \| json }},  
    total\_price: {{ checkout.total\_price }}  
  });  
  }  
  \</script\>  
  \<\!-- EXPONEA end \--\>

  \<\!-- Clarity \--\>  
  \<script type="text/javascript"\>  
    (function(c,l,a,r,i,t,y){  
    c\[a\]=c\[a\]\|\|function(){(c\[a\].q=c\[a\].q\|\|\[\]).push(arguments)};  
    t=l.createElement(r);t.async=1;t.src="https\://www\.clarity.ms/tag/"+i;  
    y=l.getElementsByTagName(r)\[0\];y.parentNode.insertBefore(t,y);  
  })(window, document, "clarity", "script", "pf44boi4t0");  
  \</script\>

### **Cookie Consent — Rebuy Engine Update**

* **Staging Environment**  
  * Testing on staging was not reliable because Termly does not work properly there, most likely due to the site being password-protected.  
  * Therefore, all testing was performed on the **production draft theme**.  
* **What We Tried**  
  * Rebuy can load through two possible paths:  
    1. The Rebuy Shopify app/connector.  
    2. A manually embedded Rebuy script.  
  * We checked the Rebuy app extension settings.  
  * We also added the blocking script provided by Rebuy along with the correct Termly configuration.  
  * Despite these changes, **Rebuy is still collecting data without respecting consent**.  
* **Testing Performed**  
  * Testing was performed **twice** using completely cleared browser sessions with:  
    1. No cookies.  
    2. No previous visit/session data.  
  * Testing was done on:  
    1. The production draft theme.  
* **Audit Findings**  
  * Rebuy sends tracking data **before any consent choice is made**.  
  * Rebuy also continues sending tracking data **after clicking “Decline All.”**  
  * The data being sent is **not anonymous**.  
  * Each tracking event included:  
    1. Persistent visitor UUID.  
    2. Session ID.  
    3. Cart token.  
    4. **`shopify_customer_id`** — an actual Shopify customer record ID.  
* **Additional Concern**  
  * The same **`shopify_customer_id: 9350688964808`** appeared in both completely separate, cookie-cleared sessions.  
  * This suggests it may be:  
    1. A fixed/default ID that Rebuy falls back to, or  
    2. A Rebuy configuration issue.  
  * A genuinely unique anonymous visitor should not normally use the same customer ID across unrelated sessions.  
* **Next Step**  
  * This appears to point to an issue on **Rebuy's side**.  
  * Recommend contacting Rebuy Support and asking:  
    1. **How is Rebuy supposed to integrate with third-party consent tools such as Termly?** Standard blocking methods are not preventing Rebuy from collecting data.  
    2. **What does `shopify_customer_id: 9350688964808` represent?** It should not be identical across unrelated anonymous sessions.

## **Bing**

Bing is currently implemented only through the Shopify Customer Events/Pixel system. Shopify will therefore handle the required **Marketing and Analytics consent management** for Bing based on the customer’s consent status.

## **Klaviyo**

### **Current Setup**

* **1 App Embed enabled:** `klaviyo-onsite-embed`  
  * Site-wide  
  * Can be used to display popups and forms configured through the Klaviyo admin.  
* **0 App Blocks** are currently enabled in any template.  
* **Custom theme script:** `klaviyo-out-of-stock.liquid`  
  * Currently included in `theme.liquid`  
  * Loads the Klaviyo Back-in-Stock CDN and initializes it for account `YeibUN`.

### **Required Changes**

The current Klaviyo script should be replaced with the appropriate **Klaviyo App Blocks**.

Before making this change, we need the following information from the Klaviyo/Marketing team:

1. The **Klaviyo Form IDs** that need to be implemented.  
2. Where each form should be displayed, for example:  
   * Homepage  
   * Product Detail Page (PDP)  
   * Collection pages  
   * Cart  
   * Account pages  
   * Specific sections or templates

Once we have the Form IDs and their required locations, we can replace the existing theme-based implementation with the Klaviyo App Blocks.

## **Rebuy**

### **Current Setup**

* **1 App Embed enabled:** `rebuy-global-embed`  
  * Site-wide  
  * Provides the main Rebuy engine and SmartCart functionality.  
* **App Blocks enabled** across multiple templates and the footer.  
  * Homepage widgets: `108417`, `108416`  
  * PDP: `128942`  
  * Collection: `132905`  
  * Cart: `129453`  
  * Search: `116559`  
  * Article: `238897`  
  * 404/Login: `111554`  
  * Account: `112272`  
  * Footer: `131965`

### **Custom Rebuy Scripts / Components**

#### **1\. Rebuy Core CDN**

**Script:** `cdn.rebuyengine.com/onsite/js/rebuy.js`

**Location:**  
Loaded through `rebuy-extensions`, which is rendered in `theme.liquid`, so it runs on every page using the main theme.

**Purpose:**  
This is the core Rebuy engine. It powers:

* SmartCart  
* Recommendation widgets  
* Popups  
* Rebuy tracking  
* Rebuy widget initialization

Without this script, the manually mounted Rebuy widgets and `data-rebuy-id` components would not function.

#### **2\. `rebuy-cart-template`**

**Location:**  
Rendered through `theme.liquid`, so it is available site-wide.

**Purpose:**  
This is a custom HTML/CSS template for the Rebuy SmartCart slide-out cart.

It controls elements such as:

* Cart line items  
* Free-gift progress  
* Cart recommendations  
* SmartCart styling  
* Other custom cart UI elements

Rebuy uses this custom template instead of the default SmartCart UI when the cart is opened, such as through the header cart icon.

#### **3\. `rebuy-empty-cart-url.js`**

**Location:**  
Loaded through `theme.liquid` on every page, and also on Shogun landing pages.

**Purpose:**  
When the SmartCart is empty, this script finds the **Shop Now** links and assigns the appropriate URL based on the market:

* `.com` → `/collections/collections`  
* `.co.uk` → `/collections/products-for-uk`  
* `.ca` → `/collections/international`

The script runs:

* On page load  
* On `rebuy:smartcart.show`  
* On `rebuy:cart.change`

#### **4\. Manual Mount `108414` — Upsell Popup**

**Location:**  
Located in the footer area of `theme.liquid`, meaning the container exists on every page.

**Purpose:**  
This is an **Upsell Popup**.

Rebuy controls when the popup is displayed based on its configured rules, typically after an add-to-cart action.

On product pages, the implementation also passes the current `product.id` so Rebuy can recommend relevant products.

The custom markup is defined in `rebuy-extensions` as:

`#rebuy-widget-108414`

#### **5\. Manual Mount `278280` — Promotional Widget**

**Location:**  
Rendered through `theme.liquid`, so it is available on every page.

**Purpose:**  
This is a promotional campaign widget.

Current campaign comment:

> 2026 Earth Day Wk4 Free Tote on New Sub

The widget is used for the **Free Tote on New Subscription** promotion.

The visibility and display rules are controlled through the Rebuy admin. The theme is only responsible for mounting the widget container.

### **Additional Rebuy Mounts**

| Mount ID | Pages | Role |
| ----- | ----- | ----- |
| `131965` | Homepage \+ `ghi-courses` only | Homepage widget |
| `115516` | Any page with a product object, mainly PDP | Add-on / cross-sell widget |

### **Summary**

For Rebuy, there are currently **two implementation methods** being used:

1. **Shopify Rebuy App Embed/App Blocks**  
2. **Custom theme-based Rebuy implementation**, including the CDN, SmartCart template, scripts, and manually mounted widgets.

Because both approaches are active, we should confirm which functionality is intentionally being handled by the Shopify app blocks versus the custom theme implementation before removing or replacing any scripts. This will help avoid breaking existing Rebuy widgets, SmartCart functionality, recommendations, or promotional campaigns.

**GLOBAL HEALING**

**Rebuy Script vs. App Embed,  Configuration Comparison**

Companion document to: Rebuy Personalization Engine,  Site Audit

Site: globalhealing.com

Date: September 2026

# **Purpose of This Document**

This document records a two-configuration comparison test and the conclusion drawn from it. The two configurations tested were:

* Configuration A: the custom Rebuy script (rebuy.js and the associated custom theme-based components loaded through rebuy-extensions in theme.liquid) disabled, with only the Shopify App Embed (rebuy-global-embed) and App Blocks left enabled.

* Configuration B: both the custom Rebuy script and the Shopify App Embed / App Blocks enabled at the same time,  this is the site's current, as-deployed configuration.

The same set of pages and components covered in the original audit were checked under each configuration for direct comparison.

# **Result: No Functional Difference Between Configurations**

Across every page and widget tested, Configuration A (App Embed only) produced the same customer-facing outcome as Configuration B (both enabled). Widgets that worked, worked identically in both configurations. Widgets that were broken,  the Upsell Popup and the Promotional Widget,  stayed equally broken in both configurations, since their failure is caused by the missing/misconfigured custom\_endpoint recommendation data in the Rebuy admin account (documented in the original audit), not by which script is loaded on the page.

| Component / Behavior | Config A,  Script OFF, App Embed ON | Config B,  Script ON, App Embed ON | Result |
| :---- | ----- | ----- | ----- |
| **App Embed core engine (SmartCart, tracking init)** | **Working** | **Working** | **NO DIFFERENCE** |
| **Homepage widgets (108417, 108416\)** | **Working** | **Working** | **NO DIFFERENCE** |
| **PDP widget (128942)** | **Working** | **Working** | **NO DIFFERENCE** |
| **Add-on / cross-sell widget (115516)** | **Working** | **Working** | **NO DIFFERENCE** |
| **Collection widget (132905)** | **Working** | **Working** | **NO DIFFERENCE** |
| **Cart widget (129453)** | **Working** | **Working** | **NO DIFFERENCE** |
| **Search widget (116559)** | **Working** | **Working** | **NO DIFFERENCE** |
| **Article widget (238897)** | **Working** | **Working** | **NO DIFFERENCE** |
| **SmartCart slide-out drawer** | **Working** | **Working** | **NO DIFFERENCE** |
| **Upsell Popup (Manual Mount 108414\)** | **Not working** | **Not working** | **NO DIFFERENCE** |
| **Promotional Widget (Manual Mount 278280\)** | **Not working** | **Not working** | **NO DIFFERENCE** |
| **Duplicate/orphaned widget copies in DOM** | **Not present** | **Present (dead)** | **SCRIPT ADDS DEAD CODE** |

*Note on the last row: this is the one place the two configurations are not identical,  but the difference runs in favor of removing the script, not against it. With the script off, there is nothing left to create the duplicate, dead widget markup found during the original audit; with it on, that dead code is generated on every page for no functional benefit.*

# **Conclusion**

Because disabling the custom theme-based Rebuy script produced no loss of functionality,  SmartCart, the App Block widgets, and cart cross-sell recommendations all continued to work exactly as before,  the custom script is not required for Rebuy's customer-facing functionality on this theme. The Shopify App Embed and App Blocks alone are sufficient to deliver the full working feature set currently live on the site.

This also directly explains a finding from the original audit: the duplicate, unrendered widget copies found alongside several working widgets (108417, 108416, 128942, 115516\) only appear when the custom script is also active. With the custom script disabled, those duplicate/dead elements are not created at all, since there is no longer a second implementation competing to render the same widget ID.

# **Recommendation**

* Remove the custom Rebuy script and its associated manual mounts (the rebuy-extensions block in theme.liquid, the custom rebuy-cart-template, rebuy-empty-cart-url.js, and Manual Mounts 108414 and 278280\) from the theme, and rely on the Shopify App Embed / App Blocks as the single source of Rebuy functionality going forward.

* This removes the duplicate-ID markup identified in the audit, reduces the number of scripts loaded on every page, and eliminates the maintenance burden of keeping two parallel Rebuy implementations in sync.

* Before removing the code, separately resolve the Upsell Popup and Promotional Widget functionality,  since neither works under either configuration, if that functionality is still wanted, it will need to be rebuilt as a Shopify App Block (or reconfigured correctly in Rebuy admin) rather than carried over from the legacy script.

* Retest the site once more after the custom script is fully removed, to confirm no page-specific dependency on it was missed.

After removing the Klaviyo scripts, both the popup and the back-in-stock form stopped showing.

As mentioned earlier, the back-in-stock form is separate from the popup, but it appears to rely on the Klaviyo onsite script to render. So, removing the script also affects the back-in-stock form.

For the popup, since we are now using the Klaviyo app, we need to add the **popup form ID** to the app configuration instead of relying only on the onsite script.

The back-in-stock issue will need to be investigated separately. We did not find any other page-specific Klaviyo components apart from the popup.

2\. Klaviyo Status

Here is our current standing on the Klaviyo integration:

**Previous Observation (Sep 22):**

Removing the legacy Klaviyo script caused both the Klaviyo Pop-up and the Back-in-Stock form to stop rendering. While the Back-in-Stock form is structurally separate, it still relies on the base Klaviyo onsite script. For the Pop-up, transitioning to the app integration requires mapping the Popup Form ID within the app configuration rather than relying on the manual script.

**Current Finding (Sep 24):**

During our review today on the live store, we noticed a change in state:

• **Live Store Pop-up Inactive:** The Klaviyo pop-up is currently not visible on the live site. Was any configuration changed on your side recently?

• **Draft Testing Paused:** Because the pop-up is currently inactive on live, we are unable to validate its behavior on the draft theme. Once reactivated on live, we can verify its display on the draft theme using the Klaviyo extension alone (without the onsite script).

• **Back-in-Stock Dependency:** The Back-in-Stock form remains affected by the script removal, despite being managed separately.

**Klaviyo Next Steps & Summary:**

To move forward with Klaviyo testing, please assist us with the following:

• **Reactivate/Create Pop-up:** Please ensure the Klaviyo Pop-up is active on live and share its **Form ID** with us.

• **Back-in-Stock Form ID:** If the Back-in-Stock form is configured in Klaviyo, please provide its **Form ID** as well so we can configure and test it independently within the app.

![][image1]  
**GLOBAL HEALING**

**Rebuy App Embed Only – Component Status**

**Companion document to:** Rebuy Personalization Engine, Site Audit

**Site:** globalhealing.com

**Date:** September 2026

# **Purpose of This Document**

This document records the status of every Rebuy component on the site running on the Shopify App Embed (rebuy-global-embed) and App Blocks alone, with the custom theme-based Rebuy code (the "Rebuy START / END" snippet in theme.liquid, the custom rebuy-cart-template, rebuy-empty-cart-url.js, and Manual Mounts 108414 and 278280\) removed. It was tested by removing that code in the browser and clicking Add to Cart on every widget, the SmartCart drawer, and the empty-cart link, across the homepage, product, collection, cart, search, article and 404 pages.

# **Result: Most Components Work on the Connector Alone**

Eight of the eleven components tested work correctly with only the App Embed and App Blocks: they load, return products, and add to cart. Three do not work as-is and need a fix before the custom script can be removed. Two more do not work under any configuration, because they are switched off in the Rebuy admin, not because of the script.

# **Component Status**

| Component | Behavior on App Embed / App Blocks alone | Status | Action Needed |
| :---- | :---- | :---- | :---- |
| **App Embed core engine (SmartCart, tracking init)** | Loads and initializes correctly | **WORKING** | None |
| **SmartCart slide-out drawer** | Opens; quantity, remove, Autoship upgrade, discount code and checkout all function. Falls back to Rebuy’s default cart design instead of the site’s custom layout. | **WORKING** | Optional: recreate custom cart styling in Rebuy’s widget settings |
| **Homepage widgets (108417, 108416\)** | Products load and add to cart correctly, but the Add to Cart button is cropped out of view by the carousel, so it is not usable as currently displayed | **WORKING** | Adjust carousel/CSS so the button is visible |
| **PDP widget (128942)** | "Bundle & Save 15%" adds all items with the discount applied | **WORKING** | None |
| **Add-on / cross-sell widget (115516)** | Does not render – its mount only exists in the removed theme snippet, with no App Block equivalent | **NOT WORKING** | Add as a Rebuy App Block on the product template |
| **Collection widget (132905)** | Adds to cart correctly (hover button sits slightly below the card, but is clickable) | **WORKING** | None |
| **Cart widget (129453)** | Adds to cart correctly | **WORKING** | None |
| **Search widget (116559)** | Adds to cart correctly | **WORKING** | None |
| **Article widget (238897)** | Works identically to the current setup | **WORKING** | None |
| **Empty-cart "Shop Now" link** | Always routes to the .com collection; loses its UK and Canada routing | **WORKING** | Move market routing into SmartCart settings, or keep rebuy-empty-cart-url.js |
| **Upsell Popup (Manual Mount 108414\)** | Not working – set to Preview Mode in the Rebuy admin, unrelated to the script | **NOT WORKING** | Take out of Preview Mode and rebuild as an App Block, if still wanted |
| **Promotional Widget (Manual Mount 278280\)** | Not working – set to Preview Mode in the Rebuy admin, unrelated to the script | **NOT WORKING** | Take out of Preview Mode and rebuild as an App Block, if still wanted |

# **Conclusion**

The Shopify App Embed and App Blocks alone can run most of the site’s Rebuy functionality: the core engine, SmartCart cart actions, and six of the eight page widgets all work correctly without the custom script. Three gaps need to be closed first: the homepage carousel Add to Cart buttons need to be made visible, the product-page add-on widget (115516) needs an App Block equivalent, and the empty-cart link needs its market-specific routing restored. The Upsell Popup and Promotional Widget do not work either way and are a separate, pre-existing issue in the Rebuy admin.

![][image1]  
**GLOBAL HEALING**

**Klaviyo Theme Changes – Code Changes**

**Companion document to:** Cookie Consent Check

**Site:** globalhealing.com (draft theme `gh/termly`, ID 142888009928\)

**Date:** October 2026

# **Purpose of This Document**

This document lists the code changes made for Klaviyo in two files: `snippets/klaviyo-out-of-stock.liquid` and `snippets/gh-termly-consent.liquid`.

**Note:** `klaviyo-consent.liquid` does not exist in the theme, and never has in its git history. Klaviyo’s consent code lives in `snippets/gh-termly-consent.liquid`.

# **1\. `snippets/klaviyo-out-of-stock.liquid`**

**Commit:** `2323e7fe` (27 Oct 2026, Shopify theme editor)

**Before:**

```liquid
<script async type="text/javascript" src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=YeibUN"></script>

<script src="https://a.klaviyo.com/media/js/onsite/onsite.js"></script>
<script>
  var klaviyo = klaviyo || [];
  klaviyo.init({ account: "YeibUN", platform: "shopify" });
  klaviyo.enable("backinstock", { trigger: { ... }, modal: { ... } });
</script>
```

**After:**

```liquid
{% if template.name == 'product' %}
<script>
  // Klaviyo's standard stub: queues klaviyo calls until klaviyo.js loads
  !function(){ if(!window.klaviyo){ window._klOnsite = window._klOnsite || []; ... } }();

  (function () {
    if (window.__klaviyoBisInit) return;
    window.__klaviyoBisInit = true;

    // Load Back in Stock straight away, without waiting for klaviyo.isIdentified()
    var s = document.createElement('script');
    s.src = 'https://a.klaviyo.com/media/js/onsite/onsite.js';
    s.async = true;
    s.onload = function () {
      klaviyo.init({ account: 'YeibUN', platform: 'shopify' });
      klaviyo.enable('backinstock', { trigger: { ... }, modal: { ... } });
    };
    document.head.appendChild(s);
  })();
</script>
{% endif %}
```

| Code change | Purpose |
| :---- | :---- |
| Wrapped in `{% if template.name == 'product' %}` | Runs on product pages only, instead of every page. |
| Removed the `klaviyo.js` script tag | No second copy; uses the one loaded by the Klaviyo app embed. |
| Added Klaviyo’s standard stub | `klaviyo` calls are queued safely until the script loads. |
| `onsite.js` now loaded async, with setup in `onload` | Doesn’t block the page; setup runs once the script is ready. |
| No `klaviyo.isIdentified()` wait | That call never resolves after a Decline, which hid the button. |
| `window.__klaviyoBisInit` guard | Prevents Back in Stock being set up twice. |
| `trigger` and `modal` settings | Unchanged. |

# **2\. `snippets/gh-termly-consent.liquid` (Klaviyo-related code)**

**Commits:** `3037d667`, `0ccbf937`, `00a2fb03`, `f072891a`, `a4a4fe6f`

**a) Send the visitor’s choice to Shopify (Klaviyo reads it)**

```js
window.Shopify.customerPrivacy.setTrackingConsent({
  analytics:   state.analytics === true,
  marketing:   state.advertising === true,
  preferences: state.performance === true
  // + sale_of_data, only after a real banner click
}, callback);
```

This only runs after a real click on the banner (tracked with `localStorage.gh_termly_choice_made`), never before the visitor chooses.

**b) Clear Klaviyo identity on Decline**

```js
function clearKlaviyoIdentity() {
  // deletes the __kla_id cookie on path=/ for host, .host and no-domain
}

if (!consent.marketing) clearKlaviyoIdentity();
```

**c) Customer Hub gating**

```js
// /account and /customer_authentication links (logout excluded)
function isAccountLink(link) { ... }

// adds data-k-hub-ignore to account links, including menu links added later
function markAccountLinks(root) { ... }

document.addEventListener('click', function (event) {
  if (!isAccountLink(link)) return;
  link.setAttribute('data-k-hub-ignore', '');
  if (!marketingAllowed()) return;      // no consent: normal account page
  event.preventDefault();
  event.stopImmediatePropagation();
  openHubOrNavigate(link.href);         // consent: open the Hub
}, true);

// waits up to 4s for window.customerHubApi, then falls back to the link
var HUB_WAIT_MS = 4000;
function openHubOrNavigate(href) { ... window.customerHubApi.open(); ... }
```

**d) Hide recently viewed until consent**

```css
html:not(.gh-consent-marketing) .evm-drawer-recently-viewed,
html:not(.gh-consent-marketing) .evm-drawer-related-viewed-browsing {
  display: none !important;
}
```

```js
document.documentElement.classList.toggle('gh-consent-marketing', state.marketing);
```

[image1]: <data:image/png;base64,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>