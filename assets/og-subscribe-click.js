// assets/og-subscribe-click.js
(function () {
  if (window._ogBenefitsClickBound) return;
  window._ogBenefitsClickBound = true;
  // Click on benefits => select Subscribe
  document.addEventListener('click', function (e) {
    const content = e.target.closest('.gh-subscribe-card + .content');
    if (!content) return;
    // Don’t hijack clicks on interactive controls
    if (e.target.closest('a,button,label,input,select,textarea,og-select-frequency')) return;
    const optin = content.previousElementSibling;
    if (optin && optin.tagName.toLowerCase() === 'og-optin-button') {
      optin.click();
    }
  }, true);
  // Make benefits focusable + support Enter/Space
  function enableFocus() {
    document.querySelectorAll('.gh-subscribe-card + .content').forEach(el => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    });
  }
  document.addEventListener('keydown', function (e) {
    if (!(e.key === 'Enter' || e.key === ' ')) return;
    const el = document.activeElement;
    if (!el || !el.matches('.gh-subscribe-card + .content')) return;
    const optin = el.previousElementSibling;
    if (optin && optin.tagName.toLowerCase() === 'og-optin-button') {
      e.preventDefault();
      optin.click();
    }
  });
  // Run now and after OG re-renders
  document.addEventListener('DOMContentLoaded', enableFocus);
  new MutationObserver(enableFocus).observe(document.documentElement, { childList: true, subtree: true });
})();