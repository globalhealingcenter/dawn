(function () {
  'use strict';

  // Top Sections
  function initStandardsCardsSlick() {
    if (typeof window.jQuery === 'undefined') return false;

    var $ = window.jQuery;
    if (!$.fn || !$.fn.slick) return false;

    var $track = $('.standards-cards__track');
    // Return false so the retry mechanism can keep waiting for the element.
    if (!$track.length) return false;

    function enableSlick() {
      if (window.innerWidth > 767 || $track.hasClass('slick-initialized')) return;

      $track.slick({
        infinite: true,
        arrows: false,
        dots: false,
        slidesToShow: 1,
        slidesToScroll: 1,
        centerMode: true,
        centerPadding: '12%',
        variableWidth: false,
        speed: 450,
        draggable: true,
        swipe: true,
        touchMove: true,
        mobileFirst: true,
      });
    }

    function disableSlick() {
      if (window.innerWidth > 767 && $track.hasClass('slick-initialized')) {
        $track.slick('unslick');
      }
    }

    enableSlick();

    if (!$track.data('slick-bound')) {
      window.addEventListener('resize', function () {
        disableSlick();
        enableSlick();
      });
      $track.data('slick-bound', true);
    }

    return true;
  }

  function tryInitStandards(attemptsLeft) {
    if (initStandardsCardsSlick() || attemptsLeft <= 0) return;
    window.setTimeout(function () {
      tryInitStandards(attemptsLeft - 1);
    }, 200);
  }

  var standardsInitStarted = false;
  function startStandardsInit() {
    if (standardsInitStarted) return;
    standardsInitStarted = true;
    tryInitStandards(20);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startStandardsInit);
  } else {
    startStandardsInit();
  }
  window.addEventListener('load', startStandardsInit);

  function initFacilityTabs() {
    document.querySelectorAll('.facility-tabs').forEach(function (root) {
      if (!root || root.dataset.tabsInit === '1') return;

      var buttons = root.querySelectorAll('.facility-tabs__nav-button');
      var panels = root.querySelectorAll('.facility-tabs__panel');
      if (!buttons.length || !panels.length) return;

      // Prevent duplicate listeners when Shopify re-loads sections.
      root.dataset.tabsInit = '1';

      function setActive(target) {
        buttons.forEach(function (btn) {
          var isActive = btn.getAttribute('data-tab-target') === target;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        panels.forEach(function (panel) {
          var match = panel.getAttribute('data-tab-panel') === target;
          panel.classList.toggle('is-active', match);
        });
      }

      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var target = btn.getAttribute('data-tab-target');
          if (!target) return;
          setActive(target);
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFacilityTabs);
  } else {
    initFacilityTabs();
  }

  function initMethodologyCardsSlick() {
    if (typeof window.jQuery === 'undefined') return false;

    var $ = window.jQuery;
    if (!$.fn || !$.fn.slick) return false;

    var $track = $('.methodology-cards__track');
    // Return false so the retry mechanism can keep waiting for the element.
    if (!$track.length) return false;
    var $progressFill = $('.methodology-cards__progress-fill');

    function updateProgress(currentSlide, slickInst) {
      slickInst = slickInst || $track.slick('getSlick');
      var total = slickInst.slideCount || 1;
      var idx = (currentSlide || 0) + 1;
      var pct = (idx / total) * 100;
      $progressFill.css('width', pct + '%');
    }

    // Bind progress updates once (avoid stacking handlers on resize / re-init).
    if ($progressFill.length && !$track.data('progress-bound')) {
      $track.data('progress-bound', true);
      $track.on(
        'init.skpMethodologyProgress reInit.skpMethodologyProgress afterChange.skpMethodologyProgress',
        function (event, slickInst, current) {
          updateProgress(current, slickInst);
        }
      );
    }

    function enableSlick() {
      if (window.innerWidth > 767 || $track.hasClass('slick-initialized')) return;

      $track.slick({
        infinite: true,
        arrows: false,
        dots: false,
        slidesToShow: 1,
        slidesToScroll: 1,
        centerMode: true,
        centerPadding: '12%',
        variableWidth: false,
        speed: 450,
        draggable: true,
        swipe: true,
        touchMove: true,
        mobileFirst: true,
      });
    }

    function disableSlick() {
      if (window.innerWidth > 767 && $track.hasClass('slick-initialized')) {
        $track.slick('unslick');
      }
    }

    enableSlick();

    // In case init already fired before binding, force one update.
    if ($progressFill.length && $track.hasClass('slick-initialized')) {
      try {
        var existing = $track.slick('getSlick');
        updateProgress(existing.currentSlide, existing);
      } catch (e) {
        // Ignore if slick isn't ready yet.
      }
    }

    if (!$track.data('slick-bound')) {
      window.addEventListener('resize', function () {
        disableSlick();
        enableSlick();
      });
      $track.data('slick-bound', true);
    }

    return true;
  }

  function initMethodologyPopup() {
    var trigger = document.querySelector('.methodology-cards__popup-trigger');
    var popup = document.querySelector('.methodology-cards-popup');
    if (!trigger || !popup) return;

    if (popup.dataset && popup.dataset.popupInit === '1') return;
    if (popup.dataset) popup.dataset.popupInit = '1';

    var dialog = popup.querySelector('.methodology-cards-popup__dialog');
    var closeBtn = popup.querySelector('.methodology-cards-popup__close');

    function openPopup() {
      popup.classList.add('is-open');
      popup.setAttribute('aria-hidden', 'false');
    }

    function closePopup() {
      popup.classList.remove('is-open');
      popup.setAttribute('aria-hidden', 'true');
    }

    trigger.addEventListener('click', function () {
      openPopup();
    });

    popup.addEventListener('click', function (e) {
      if (!dialog.contains(e.target)) {
        closePopup();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closePopup();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        closePopup();
      }
    });
  }

  function tryInitMethodology(attemptsLeft) {
    if (initMethodologyCardsSlick() || attemptsLeft <= 0) return;
    window.setTimeout(function () {
      tryInitMethodology(attemptsLeft - 1);
    }, 200);
  }

  var methodologyInitStarted = false;
  function startMethodologyInit() {
    if (methodologyInitStarted) return;
    methodologyInitStarted = true;
    tryInitMethodology(20);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      startMethodologyInit();
      initMethodologyPopup();
    });
  } else {
    startMethodologyInit();
    initMethodologyPopup();
  }
  window.addEventListener('load', startMethodologyInit);

  // Reviews Carousel
  function initCarousel(wrap) {
    if (!wrap || wrap.dataset.rcInit) return;
    wrap.dataset.rcInit = '1';

    var track = wrap.querySelector('.rc-track');
    var fill = wrap.querySelector('.rc-progress-fill');
    if (!track) return;

    var cards = Array.prototype.slice.call(track.querySelectorAll('.rc-card'));
    var count = cards.length;
    if (count < 2) return;

    var current = 0;
    var cardW = 0;
    var gapPx = 0;

    function measure() {
      cardW = cards[0].offsetWidth;
      gapPx = parseFloat(getComputedStyle(track).gap) || 0;
    }

    function targetX(i) {
      var step = cardW + gapPx;
      var trackW = track.offsetWidth;
      var peekLeft = (trackW - cardW) / 2;
      return -(i * step) + peekLeft;
    }

    function moveTo(i, animate) {
      track.style.transition = animate
        ? 'transform 0.45s cubic-bezier(0.25, 0.1, 0.25, 1)'
        : 'none';
      track.style.transform = 'translateX(' + targetX(i) + 'px)';
      if (fill) fill.style.width = ((i + 1) / count) * 100 + '%';
    }

    function init() {
      measure();
      moveTo(current, false);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        requestAnimationFrame(function () { requestAnimationFrame(init); });
      });
    } else {
      requestAnimationFrame(function () { requestAnimationFrame(init); });
    }

    /* ── Drag / swipe ── */
    var startX = 0;
    var startY = 0;
    var dragX = 0;
    var dragging = false;
    var locked = null;
    var hasDragged = false;
    var STEP_RATIO = 0.2;

    function dragStart(x, y) {
      measure();
      track.style.transition = 'none';
      startX = x; startY = y; dragX = 0;
      dragging = true; locked = null; hasDragged = false;
    }

    function dragMove(x, y) {
      if (!dragging) return false;
      var dx = x - startX;
      var dy = y - startY;
      if (locked === null) {
        if (Math.abs(dx) > 5 && Math.abs(dx) >= Math.abs(dy)) locked = 'h';
        else if (Math.abs(dy) > 5 && Math.abs(dy) > Math.abs(dx)) locked = 'v';
        else return false;
      }
      if (locked !== 'h') return false;
      dragX = dx;
      hasDragged = true;
      track.style.transform = 'translateX(' + (targetX(current) + dragX) + 'px)';
      return true;
    }

    function dragEnd() {
      if (!dragging) return;
      dragging = false;
      if (locked === 'h') {
        var step = cardW + gapPx;
        if (Math.abs(dragX) > step * STEP_RATIO) {
          current = Math.max(0, Math.min(count - 1, current + (dragX < 0 ? 1 : -1)));
        }
      }
      moveTo(current, true);
    }

    /* touch */
    track.addEventListener('touchstart', function (e) {
      dragStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    track.addEventListener('touchmove', function (e) {
      if (dragMove(e.touches[0].clientX, e.touches[0].clientY)) e.preventDefault();
    }, { passive: false });

    track.addEventListener('touchend', dragEnd);
    track.addEventListener('touchcancel', dragEnd);

    /* mouse */
    track.addEventListener('mousedown', function (e) {
      dragStart(e.pageX, e.pageY);
      track.classList.add('rc-grabbing');
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      dragMove(e.pageX, e.pageY);
    });

    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      track.classList.remove('rc-grabbing');
      dragEnd();
    });

    track.addEventListener('click', function (e) {
      if (hasDragged) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    /* resize */
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        measure();
        moveTo(current, false);
      }, 150);
    });
  }

  /* init all carousels on the page */
  function initAllCarousels() {
    document.querySelectorAll('.rc-carousel').forEach(function (el) {
      initCarousel(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllCarousels);
  } else {
    initAllCarousels();
  }

  /* re-init when Shopify loads a section in the theme editor */
  document.addEventListener('shopify:section:load', function (e) {
    var section = e && e.target;
    if (!section || !section.querySelectorAll) return;

    section.querySelectorAll('.rc-carousel').forEach(function (wrap) {
      initCarousel(wrap);
    });

    // Re-init slick + tabs/popup for editor dynamic loads.
    initStandardsCardsSlick();
    initMethodologyCardsSlick();
    initFacilityTabs();
    initMethodologyPopup();
  });
})();
