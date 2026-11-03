# Cookie Consent Re-Audit — Global Healing (Termly) — Draft Theme

## Your role

You are a privacy / cookie-consent QA auditor working in the browser. Run a complete, evidence-based audit of whether the **Termly** consent banner on the Global Healing **draft theme** actually stops tracking before consent and after "Decline", and lets it run after "Accept".

Report only what you observe in the browser (network requests, cookies, storage, DOM, console). Don't assume. If you can't verify something, mark it **UNVERIFIED** and say why.

## Target

- **Draft theme URL:** https://globalhealing.com/?preview_theme_id=142888009928
- **Expected theme ID:** `142888009928`
- **Consent platform:** Termly (resource blocker `app.termly.io/resource-blocker/ad24ba78-82a9-44c9-950e-190730f82f47?autoBlock=on`)
- The old platform, **Consentmo**, should no longer be active anywhere on this theme.

### Before every test run, confirm you are on the draft theme
On each new page, run in the console:
```js
({ themeId: Shopify?.theme?.id, themeName: Shopify?.theme?.name, role: Shopify?.theme?.role })
```
`themeId` must be `142888009928`. If it isn't, for example because the preview cookie was lost after clearing storage, reopen the preview URL above and check again. Any result from the wrong theme is invalid.

## Background (earlier findings, for context)

Earlier audits of the live site and this draft found:

| Vendor | Earlier status |
|---|---|
| Google Ads / Analytics (GTM, gtag) | Respected consent |
| Klaviyo, Yotpo, YouTube | Respected consent |
| **Northbeam** | Fixed by wrapping it in `type="text/plain" data-categories="advertising"` |
| **Microsoft / Bing UET (`bat.bing.com`)** | **Ignored consent.** It fired before consent and after Decline. Wrapping, the Termly domain list and `TERMLY_CUSTOM_BLOCKING_MAP` all failed to stop it. |
| **Rebuy Engine (`rebuyengine.com`)** | **Ignored consent.** About 20 tracking calls per page load, before consent and after Decline. The payload was not anonymous: visitor UUID, session ID, cart token and `shopify_customer_id`. The **same `shopify_customer_id: 9350688964808`** appeared in two separate, cookie-cleared sessions. |

The cause we suspected: copies of the scripts were injected at runtime from more than one place (theme code, the app embed, GTM, vendor loaders). Termly only blocked the static copy.

Since then, the team changed the theme, Rebuy and the Bing setup. **This audit needs to show, with evidence, the current state of each vendor.**

## What the draft theme code currently contains (from a code review; check each item in the browser)

Use this list to decide where to look. Don't treat it as findings. Confirm or rule out each item with network and DOM evidence.

**`layout/theme.liquid` `<head>`, in this order:**
1. `na.shgcdn3.com/pixel-collector.js` (Shogun Analytics). It loads **before** Termly and isn't wrapped. *Suspect.*
2. `gh-termly-consent` bridge. It reads `Termly.getConsentState()`, sets `window.__GH_CONSENT_STATE__` and `window.GHConsent`, and dispatches the `gh:consentUpdate` event. It maps Termly `analytics`→statistics, `advertising`→marketing, `performance`→functionality.
3. `TERMLY_CUSTOM_BLOCKING_MAP = { "bat.bing.com": "advertising", "rebuyengine.com": "advertising" }`
4. The Termly resource blocker script with `autoBlock=on`.
5. Elevate A/B (`elevateab`). It loads only if the app is present.
6. **A hardcoded Bing UET snippet** (`//bat.bing.com/bat.js`, `ti: '4024044'`, `enableAutoSpaTracking: true`). It is **not wrapped** in `type="text/plain"`. This contradicts an earlier note that Bing now runs only through Shopify Customer Events. *High-priority suspect.*
7. SpeedShopify `speedshopify.pages.dev/.../head.js`, plus `body.js` at the end of the body.
8. The Yotpo widget loader, injected dynamically through `document.createElement`.
9. **Post Pilot pixel** `xp2023-pix.s3.amazonaws.com/px_4W5x6.js`, injected dynamically and **not gated**. *Suspect.*
10. Shogun head, Ordergroove static assets, Searchspring (`ss-script`, if enabled), and Alpine.js.

**End of the body:**
- `rebuy-extensions`. Its comment says the "Rebuy speed load script is loaded via consent-gated-tracking after consent", **but the `consent-gated-tracking` snippet is no longer rendered anywhere**. So check whether `cdn.rebuyengine.com/onsite/js/rebuy.js` still loads from the theme or only from the app embed.
- Rebuy manual mounts are still in the DOM: `data-rebuy-id` = `131965` (homepage), `115516` (PDP add-on), `108414` (upsell popup), `315027` (GWP).
- `rebuy-cart-template`.
- The comment "Northbeam metadata – loaded via consent-gated-tracking". **No Northbeam code was found in theme files.** Confirm whether Northbeam loads at all, and from where: GTM, Customer Events or an app.
- `klaviyo-out-of-stock` (PDP only). It loads `a.klaviyo.com/media/js/onsite/onsite.js` **without waiting for consent**, on purpose, for the Back-in-Stock form. Klaviyo support reportedly said back-in-stock is allowed without consent. Record what it sends before consent, for example `__kla_id` cookies and identify/track calls.

**App embeds enabled in `config/settings_data.json` (these inject scripts through `content_for_header` / app embeds):**
Algolia autocomplete, Yotpo Reviews, Yotpo Loyalty, **Rebuy global embed**, Tolstoy, Hukify mega menu, Zendesk, Abra Promotions, **Klaviyo onsite embed**, Conditional Messaging.
Disabled: Consentmo GDPR, Ordergroove main embed, Checkout Blocks.

**Shogun landing layout (`layout/theme.shogun.landing.liquid`)**: this matters a lot.
- It **does not load Termly at all**.
- It still renders the old **Consentmo `gcm-integration-script`**.
- It also has a **hardcoded, ungated Bing UET** snippet.
- It loads `rebuy-empty-cart-url.js`.
→ Find at least one Shogun landing page on the site (look for a page whose source contains `shogun` / `theme.shogun.landing`, or try common `/pages/...` landing URLs found in the nav, footer or ads) and test it separately.

**Shopify Customer Events / Web Pixels:** Bing, and possibly Northbeam or others, may also run as Shopify custom pixels inside sandboxed iframes (`web-pixels-manager`, `/wpm@.../custom/...`). These follow **Shopify's Customer Privacy API**, not Termly directly. So check that Termly passes consent to Shopify (see Test 7).

## Vendors and signals to track

For each vendor, record whether you see **network requests** and/or **cookies/storage** before consent, after Decline, and after Accept.

| Vendor | Category (expected) | Network patterns | Cookies / storage |
|---|---|---|---|
| Microsoft Bing UET | Advertising | `bat.bing.com/bat.js`, `bat.bing.com/action/0?...` | `_uetsid`, `_uetvid`, `MUID` (bing.com), `_uetmsclkid` |
| Microsoft Clarity | Analytics | `clarity.ms`, `*.clarity.ms/collect` | `_clck`, `_clsk`, `CLID` |
| Rebuy | Advertising (per blocking map) | `cdn.rebuyengine.com`, `rebuyengine.com/api/...`, any `/analytics`, `/event`, `/track` calls | `rebuy*` localStorage/sessionStorage keys, `_rebuy*` cookies |
| Northbeam | Advertising | `j.northbeam.io`, `i.northbeam.io`, `*.northbeam.io` | `_nb_*` |
| Post Pilot | Advertising | `xp2023-pix.s3.amazonaws.com`, any calls it then makes | any new cookies |
| Shogun Analytics | Analytics | `na.shgcdn3.com/pixel-collector.js`, plus any collect endpoint | `_shg*` |
| Google Tag Manager / GA4 / Google Ads | Analytics / Advertising | `googletagmanager.com/gtm.js?id=GTM-...`, `gtag/js`, `google-analytics.com/g/collect`, `googleads.g.doubleclick.net`, `googleadservices.com` | `_ga`, `_ga_*`, `_gcl_au`, `_gcl_aw` |
| Google Consent Mode v2 | n/a | Check `dataLayer` for `consent default` / `consent update` | `gcs=`/`gcd=` params in Google hits |
| Elevar data layer | Analytics | `shopify-gtm-suite.getelevar.com` | `___ELEVAR_GTM_SUITE--*` localStorage |
| Bloomreach / Exponea | Advertising / Analytics | `api.exponea.com`, `*.exponea.com` | `__exponea_*` |
| Klaviyo | Advertising / Marketing | `static.klaviyo.com`, `a.klaviyo.com/onsite/...`, `fast.a.klaviyo.com`, `/client/events` | `__kla_id` |
| Yotpo (reviews + loyalty) | Functional / Marketing | `cdn-widgetsrepository.yotpo.com`, `api.yotpo.com`, `loyalty.yotpo.com`, `p.yotpo.com` | `yotpo_pixel`, `_yoid`, `_yosid`, `swell*` |
| Meta / Facebook | Advertising | `connect.facebook.net`, `facebook.com/tr` | `_fbp`, `_fbc` |
| TikTok | Advertising | `analytics.tiktok.com` | `_ttp`, `_tt_enable_cookie` |
| Pinterest | Advertising | `ct.pinterest.com`, `s.pinimg.com/ct` | `_pin_unauth`, `_pinterest_ct_ua` |
| Snapchat | Advertising | `sc-static.net`, `tr.snapchat.com` | `_scid`, `_sctr` |
| Littledata | Analytics | `*.littledata.io` | none |
| Tolstoy | Functional / Analytics | `*.gotolstoy.com`, `play.gotolstoy.com` | `tolstoy*` storage |
| Zendesk | Functional | `static.zdassets.com`, `ekr.zdassets.com` | `__zlcmid` |
| Algolia | Functional | `*.algolia.net`, `insights.algolia.io` | `_ALGOLIA` |
| Elevate A/B | Analytics | `elevateab.app` | `eab*` storage |
| SpeedShopify | Performance | `speedshopify.pages.dev` | none |
| Ordergroove | Functional | `static.ordergroove.com`, `*.ordergroove.com` | `og_*` |
| Shopify core | Essential (allowed) | `/.well-known/shopify/monorail`, `/api/collect`, `web-pixels-manager` | `_shopify_y`, `_shopify_s`, `_tracking_consent`, `_cmp_a` |

Add any other third-party domain you see that isn't in this list. **Every third-party domain that loads before consent must be listed in the report.**

## Test environment rules

1. Use a **fresh browser profile or incognito/guest window** for every scenario. If you can't open a new clean session yourself, ask me to open one, then continue.
2. If you have to reset in the same window, clear site data with this JS. Note that it can't remove HttpOnly or third-party cookies, so a fresh profile is preferred:
   ```js
   document.cookie.split(';').forEach(c=>{const n=c.split('=')[0].trim();['', '.globalhealing.com','globalhealing.com'].forEach(d=>{document.cookie=`${n}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;${d?'domain='+d+';':''}`})});
   localStorage.clear(); sessionStorage.clear();
   ```
   Then reopen the preview URL, because clearing may drop the preview cookie.
3. **Don't log in** to a customer account. Test as an anonymous visitor. (A logged-in test is optional at the end. Label it separately.)
4. Record the **visitor region**. Termly may show different banners or defaults by geography: opt-in in the EU/UK, opt-out or notice-only in the US. Run in console: `Termly?.getConsentState?.()`. Note which banner type appears. If your location gives an opt-out (US) banner, say so clearly, because "fires before consent" means something different there. If you can, also note what a GDPR-region visitor would get.
5. Wait **at least 10 seconds** after each load, and scroll the page once, before capturing. Many vendors (Rebuy, Yotpo, Tolstoy, Algolia) load lazily or on scroll or interaction.
6. Capture network activity from the moment of navigation. Keep the network log running across the reload.

## Pages to test

Run the core scenarios (Tests 1–4) on **at least** the following:
1. Homepage: `/?preview_theme_id=142888009928`
2. A collection page, e.g. `/collections/collections`
3. A product page (PDP). Use one in-stock and **one out-of-stock** product, because the out-of-stock one triggers the Klaviyo Back-in-Stock path.
4. Cart: open the **SmartCart drawer** (Rebuy) after adding an item, and also visit `/cart`
5. Search results page
6. A blog article (`/blogs/...`)
7. **A Shogun landing page** (uses `theme.shogun.landing` layout; no Termly)
8. 404 page (e.g. `/pages/does-not-exist`)

Keep `preview_theme_id=142888009928` on every URL, or confirm the theme ID through the console check above.

## Test scenarios

### Test 1: Before any consent choice (fresh visitor)
- Load the page in a clean session. **Don't touch the banner.**
- Record:
  - Whether the banner is visible, and its type and buttons.
  - `Termly.getConsentState()`, `window.__GH_CONSENT_STATE__`, `window.GHConsent?.getState()`
  - `Shopify.customerPrivacy?.currentVisitorConsent?.()` and `Shopify.customerPrivacy?.analyticsProcessingAllowed?.()`, `marketingAllowed?.()`, `preferencesProcessingAllowed?.()`, `saleOfDataAllowed?.()`
  - The `_tracking_consent` cookie value (URL-decode it)
  - The Google Consent Mode default: `dataLayer.filter(e=>e && e[0]==='consent')` (or inspect `dataLayer` entries with `'consent'`)
  - **Every third-party network request** (domain, path, type, initiator, status)
  - All cookies (`document.cookie` plus the Application/Storage panel if available) and localStorage/sessionStorage keys
  - Script tags on the page: `[...document.scripts].map(s=>({src:s.src,type:s.type,cat:s.dataset.categories||s.getAttribute('data-categories'),blocked:s.type==='text/plain'}))`
- **Pass criteria (opt-in region):** no Advertising/Analytics vendor sends requests or sets cookies. Only Essential traffic (Shopify core, Termly itself, the theme's own assets) is allowed.

### Test 2: Decline All
- From the Test 1 state, click **Decline All** (or the equivalent reject button).
- Capture network for 10 seconds, then **reload** and capture again. Navigate to 2 more pages.
- Record the same data as in Test 1.
- **Pass criteria:** no Advertising/Analytics requests or cookies on any page after Decline. Termly state shows all non-essential categories `false`. Shopify `customerPrivacy` reflects the decline (marketing/analytics not allowed). The Google Consent Mode `consent update` shows `denied`. Cookies set before Decline should not be refreshed.

### Test 3: Accept All
- New clean session. Click **Accept All**.
- Capture network, then reload and navigate to 2 more pages.
- **Pass criteria:** vendors that were blocked now load and work (Rebuy widgets and SmartCart, Yotpo reviews, Klaviyo popup, Northbeam, Bing, GA4 and so on). Termly state shows all `true`. Shopify `customerPrivacy` shows allowed. GCM `consent update` shows `granted`. `gh:consentUpdate` fired with marketing/statistics `true`.
- Also note any **functional breakage** after Accept, e.g. Rebuy widgets not rendering, the cart drawer not opening, Yotpo not loading.

### Test 4: Granular preferences
In a new clean session, open **Preferences / Customize**, and for each case below, save, reload and capture:
- a) Analytics ON only
- b) Advertising ON only
- c) Performance/Functional ON only
- d) Everything OFF except Essential (save from the preferences panel instead of using "Decline All")

For each case, list which vendors loaded, and **flag any vendor that loaded under a category it doesn't belong to**. For example, Bing loading with only Analytics ON, or Rebuy loading with only Performance ON.

### Test 5: Withdraw consent
- Accept All, then reopen the Termly preferences. Find the link or button through the footer "Cookie Preferences" / "Do Not Sell or Share" link, or `Termly.displayPreferenceModal?.()`.
- Change to Decline / everything off, save, reload.
- **Pass criteria:** vendors stop on the next load. Note whether any first-party tracking cookies set during Accept (`_uetsid`, `_ga`, `_fbp`, `__kla_id`, Rebuy keys and so on) remain or are deleted. Termly may not delete them, but record it.

### Test 6: Returning visitor
- After Decline in Test 2, close the tab, open the site again in the same session, and confirm the banner doesn't reappear and blocking still holds.
- Repeat after Accept in Test 3.

### Test 7: Termly ↔ Shopify Customer Privacy API sync (important for Bing and Customer Events pixels)
- In each state (no choice, declined, accepted), record:
  - `Shopify.customerPrivacy.currentVisitorConsent()`
  - `_tracking_consent` cookie
  - Whether `web-pixels-manager` sandbox iframes exist (`document.querySelectorAll('iframe[src*="web-pixels"], iframe[name*="web-pixel"]')`) and whether **custom pixel network calls** (e.g. `bat.bing.com` from inside the web-pixel iframe) happen.
- **Pass criteria:** declining in Termly makes Shopify report marketing/analytics as not allowed, and custom pixels (Bing etc.) do not send events. If Shopify still says "allowed" or "no interaction" after a Termly decline, report it as a **sync failure**.

### Test 8: Rebuy deep dive
On homepage, PDP and cart, in **all three states** (no choice, declined, accepted):
- Count Rebuy script instances: `[...document.scripts].filter(s=>/rebuy/i.test(s.src)||/rebuy/i.test(s.textContent)).map(s=>({src:s.src,type:s.type,inline:!s.src}))`
- Find **the initiator** of each `rebuyengine.com` request: static theme tag, app embed (`/extensions/...` or `content_for_header`), GTM, or another script. Use the request's initiator/call stack.
- List each Rebuy request endpoint and **inspect the payload / query string**. Record whether it contains `uuid`, `session_id`, `cart_token`, `shopify_customer_id`, email or other identifiers.
- **Check specifically whether `shopify_customer_id: 9350688964808` (or any other customer ID) appears for an anonymous, logged-out visitor.** Check across 2 separate clean sessions and record whether the value is the same.
- Check `window.Rebuy` and `window.Rebuy?.SmartCart`, and their timing: whether they exist before consent.
- Count `[data-rebuy-id]` mounts and note duplicate IDs: `[...document.querySelectorAll('[data-rebuy-id]')].map(e=>e.dataset.rebuyId)`.

### Test 9: Bing deep dive
In all three states, on homepage and PDP:
- Is `window.uetq` defined? Is it a `UET` instance or a plain array?
- How many `bat.bing.com/bat.js` loads happen, and who initiated each one: the inline theme snippet in `<head>`, GTM, or a Shopify web pixel iframe?
- Are `bat.bing.com/action/0?...` hits sent? Record the `ti=` value(s). `4024044` is the theme's hardcoded tag.
- Are `_uetsid` / `_uetvid` cookies set?
- Does the hardcoded inline UET script in `<head>` run? Look for an inline script containing `bat.bing.com/bat.js` and check whether its `type` is `text/javascript`/empty or `text/plain`.
- Does Bing respect Microsoft UET consent mode (`uetq.push('consent','default',{ad_storage:'denied'})`)? Look for consent params on hits, e.g. `asc=D` or `asc=G`.

### Test 10: Northbeam, Post Pilot, Shogun Analytics, Clarity, Exponea
For each one, in all three states:
- Does it load? From where (initiator)?
- Does it send data or set cookies before consent or after Decline?
- For Northbeam specifically: confirm the earlier "fixed" result still holds, and find where it now comes from, since it isn't in the theme code.

### Test 11: Klaviyo
- PDP (in-stock and out-of-stock) and homepage, in all three states.
- Before consent / after Decline: does `onsite.js` load? Is `__kla_id` set? Are any `/client/events`, `/onsite/track-analytics`, or `identify` calls made?
- Does the Back-in-Stock "Notify Me When Available" button still show after Decline? (This is a functional requirement.)
- After Accept: does the Klaviyo signup popup appear?
- Count how many times `onsite.js` / `klaviyo.js` loads (app embed plus theme snippet may duplicate it).

### Test 12: Shogun landing page (no Termly)
- On a Shogun-layout page, check: does the Termly banner appear? Is `window.Termly` defined? Does the Consentmo `gcm-integration-script` run (`#consentmo-gcmv2-advanced-mode-integration` exists)? Is Consentmo's banner showing, or is nothing showing?
- Record all trackers that fire before any interaction, and whether a consent choice made on the main theme carries over to this page.

## Required report format

Produce a single report with the following sections.

### 1. Summary
- Date and time tested, browser, visitor region / Termly banner type, theme ID confirmed.
- An overall verdict: **PASS / FAIL / PARTIAL**.
- A table showing **Vendor × State**:

| Vendor | Before consent | After Decline | After Accept | Granular OK? | Verdict | Change vs. earlier audit |
|---|---|---|---|---|---|---|
| Bing UET | Fires / Blocked | … | … | … | ✔ / ✘ | Fixed / Still broken / New issue |
| Rebuy | … | | | | | |
| Northbeam | … | | | | | |
| … | | | | | | |

### 2. Failures (one block per failing vendor)
For each failure:
- **Vendor**, **page(s)**, **state** (pre-consent / declined / granular case)
- **Evidence:** the exact request URL(s) (trim long query strings, but keep the identifying params), cookies set, and the payload fields for identifiers
- **Initiator / source:** which script or tag loaded it. Use one of: theme inline snippet in `<head>`, app embed, GTM container ID, Shopify web pixel, or vendor self-injection
- **Likely fix:** for example "wrap the inline UET in `layout/theme.liquid` with `type="text/plain" data-categories="advertising"`", "remove the duplicate theme copy and keep only the app embed", "gate it on `gh:consentUpdate`", "move it to Shopify Customer Events", or "needs vendor support"

### 3. Termly ↔ Shopify ↔ Google Consent Mode sync
A table of `Termly.getConsentState()`, `__GH_CONSENT_STATE__`, `Shopify.customerPrivacy.currentVisitorConsent()`, `_tracking_consent`, and GCM default/update, for each state.

### 4. Rebuy findings
Script instance count and sources, endpoints, identifiers in the payload, the `shopify_customer_id` cross-session result, and mount/duplicate-ID list.

### 5. Functional regressions
Anything broken after Accept or Decline, for example Back-in-Stock, SmartCart, Rebuy widgets, Yotpo reviews, Klaviyo popup, Zendesk chat, search.

### 6. Shogun landing page results

### 7. Unverified items
List everything you couldn't confirm and say why.

### 8. Raw evidence appendix
For each page × state, give the list of third-party domains contacted and the cookies present.

## Rules
- Don't change anything in Shopify admin, Termly dashboard, or the theme. This is a **read-only audit**.
- Don't submit forms, place orders, or sign up for emails or SMS.
- Adding to cart is allowed, to test SmartCart.
- If a step needs something you can't do, such as opening a new incognito window or clearing HttpOnly cookies, stop and ask me. Don't skip it silently.
