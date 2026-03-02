/**
 * Consistency Wellness - mobile carousel
 * - Touch swipe (native scroll)
 * - Progress bar (track + fill)
 * - Peek of adjacent slides
 */
(function () {
  function initCarousel(section) {
    var cardsTrack = section.querySelector('.cw__cards');
    var progressFill = section.querySelector('.cw__progress-fill');
    var progressEl = section.querySelector('.cw__progress');
    if (!cardsTrack || !progressFill) return;

    var cards = cardsTrack.querySelectorAll('.cw__card');
    var count = cards.length;
    if (count <= 1) return;

    function getStepWidth() {
      if (cards.length < 2) return cards[0] ? cards[0].offsetWidth : 0;
      var trackStyle = window.getComputedStyle(cardsTrack);
      var gap = parseFloat(trackStyle.gap) || 0;
      return cards[0].offsetWidth + gap;
    }

    function getCurrentIndex() {
      var step = getStepWidth();
      if (!step) return 0;
      return Math.round(cardsTrack.scrollLeft / step);
    }

    function updateProgress(index) {
      index = Math.max(0, Math.min(index, count - 1));
      var pct = ((index + 1) / count) * 100;
      progressFill.style.width = pct + '%';
      if (progressEl) {
        progressEl.setAttribute('aria-valuenow', index + 1);
      }
    }

    cardsTrack.addEventListener('scroll', function () {
      updateProgress(getCurrentIndex());
    }, { passive: true });

    updateProgress(0);
  }

  function initAll() {
    var sections = document.querySelectorAll('.cw.consistency-wellness');
    for (var i = 0; i < sections.length; i++) {
      initCarousel(sections[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', initAll);
})();
