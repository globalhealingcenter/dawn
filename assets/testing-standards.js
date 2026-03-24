(function () {

  // Top Sections
  function initStandardsCardsSlick() {
    if (typeof window.jQuery === 'undefined') return false;

    var $ = window.jQuery;
    if (!$.fn || !$.fn.slick) return false;

    var $track = $('.standards-cards__track');
    if (!$track.length) return true;

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      tryInitStandards(20);
    });
  } else {
    tryInitStandards(20);
  }

  window.addEventListener('load', function () {
    tryInitStandards(20);
  });

  function initFacilityTabs() {
    var root = document.querySelector('.facility-tabs');
    if (!root) return;

    var buttons = root.querySelectorAll('.facility-tabs__nav-button');
    var panels = root.querySelectorAll('.facility-tabs__panel');
    if (!buttons.length || !panels.length) return;

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
    if (!$track.length) return true;
    var $progressFill = $('.methodology-cards__progress-fill');

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

      if ($progressFill.length) {
        var updateProgress = function (currentSlide, slick) {
          slick = slick || $track.slick('getSlick');
          var total = slick.slideCount || 1;
          var idx = (currentSlide || 0) + 1;
          var pct = (idx / total) * 100;
          $progressFill.css('width', pct + '%');
        };

        $track.on('init reInit afterChange', function (event, slick, current) {
          updateProgress(current, slick);
        });

        // In case init already fired before binding
        var existing = $track.slick('getSlick');
        updateProgress(existing.currentSlide, existing);
      }
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

  function initMethodologyPopup() {
    var trigger = document.querySelector('.methodology-cards__popup-trigger');
    var popup = document.querySelector('.methodology-cards-popup');
    if (!trigger || !popup) return;

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      tryInitMethodology(20);
      initMethodologyPopup();
    });
  } else {
    tryInitMethodology(20);
    initMethodologyPopup();
  }

  window.addEventListener('load', function () {
    tryInitMethodology(20);
  });

  // Reviews Carousel
  function initCarousel(wrap) {
    if (!wrap || wrap.dataset.rcInit) return;
    wrap.dataset.rcInit = '1';

    var track = wrap.querySelector('.rc-track');
    var fill = wrap.querySelector('.rc-progress-fill');
    if (!track) return;

    var origCards = Array.prototype.slice.call(track.querySelectorAll('.rc-card'));
    var count = origCards.length;
    if (count < 2) return;

    // Prepend clone of last card, append clone of first card so the track
    // layout is: [lastClone · orig0 · orig1 · … · origN-1 · firstClone]
    // Animating into a clone then silently jumping to its real counterpart
    // produces seamless infinite scrolling in both directions.
    var lastClone  = origCards[count - 1].cloneNode(true);
    var firstClone = origCards[0].cloneNode(true);
    lastClone.setAttribute('aria-hidden', 'true');
    firstClone.setAttribute('aria-hidden', 'true');
    track.insertBefore(lastClone, origCards[0]);
    track.appendChild(firstClone);

    // DOM indices: 0 = lastClone, 1..count = real cards, count+1 = firstClone
    var current = 0;   // logical index 0..count-1
    var domIdx  = 1;   // DOM position of centred slide; starts at 1 (orig0)
    var cardW   = 0;
    var gapPx   = 0;

    function measure() {
      cardW = track.querySelectorAll('.rc-card')[0].offsetWidth;
      gapPx = parseFloat(getComputedStyle(track).gap) || 0;
    }

    function targetX(di) {
      var step     = cardW + gapPx;
      var peekLeft = (track.offsetWidth - cardW) / 2;
      return -(di * step) + peekLeft;
    }

    function setFill() {
      if (fill) fill.style.width = ((current + 1) / count) * 100 + '%';
    }

    function moveTo(di, animate) {
      track.style.transition = animate
        ? 'transform 0.45s cubic-bezier(0.25, 0.1, 0.25, 1)'
        : 'none';
      track.style.transform = 'translateX(' + targetX(di) + 'px)';
      setFill();
    }

    // After animating into a clone, silently reposition to its real counterpart.
    track.addEventListener('transitionend', function () {
      if (domIdx === 0) {
        domIdx = count;
        moveTo(domIdx, false);
      } else if (domIdx === count + 1) {
        domIdx = 1;
        moveTo(domIdx, false);
      }
    });

    function init() {
      measure();
      moveTo(domIdx, false);
      setFill();
    }

    requestAnimationFrame(function () { requestAnimationFrame(init); });

    /* ── Drag / swipe ── */
    var startX    = 0;
    var startY    = 0;
    var dragX     = 0;
    var dragging  = false;
    var locked    = null;
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
      track.style.transform = 'translateX(' + (targetX(domIdx) + dragX) + 'px)';
      return true;
    }

    function dragEnd() {
      if (!dragging) return;
      dragging = false;
      if (locked === 'h') {
        var step = cardW + gapPx;
        if (Math.abs(dragX) > step * STEP_RATIO) {
          var dir = dragX < 0 ? 1 : -1;
          domIdx  = domIdx + dir;
          current = ((current + dir) % count + count) % count;
        }
      }
      moveTo(domIdx, true);
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
        moveTo(domIdx, false);
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
    var wrap = e.target.querySelector('.rc-carousel');
    if (wrap) initCarousel(wrap);
  });
})();
