/**
 * GH Logos Carousel
 * - Seamless infinite scroll
 * - Pause on hover (via CSS)
 * - Touch swipe/drag on mobile
 */
(function () {
  var MOBILE_MAX = 767;

  function initLogosCarousel(section) {
    var track = section.querySelector('.ghd--logos-track');
    if (!track || section.dataset.logosInit) return;
    section.dataset.logosInit = '1';

    var isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    function isMobile() { return window.innerWidth <= MOBILE_MAX; }

    var unitWidth = 0;
    var offset = 0;
    var speed = 0.15;
    var rafId = null;
    var touchStartX = 0;
    var touchStartOffset = 0;
    var isDragging = false;
    var animationPaused = false;

    function measure() {
      unitWidth = track.offsetWidth / 2;
      if (unitWidth <= 0) unitWidth = 200;
    }

    function setTransform(val) {
      track.style.transform = 'translate3d(' + val + 'px, 0, 0)';
    }

    function animate() {
      if (animationPaused) return;
      offset -= speed;
      if (offset <= -unitWidth) offset += unitWidth;
      if (offset > 0) offset -= unitWidth;
      setTransform(offset);
      rafId = requestAnimationFrame(animate);
    }

    function startAnimation() {
      animationPaused = false;
      if (!rafId) rafId = requestAnimationFrame(animate);
    }

    function stopAnimation() {
      animationPaused = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    track.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      stopAnimation();
      isDragging = true;
      touchStartX = e.touches[0].clientX;
      touchStartOffset = offset;
    }, { passive: true });

    track.addEventListener('touchmove', function (e) {
      if (!isDragging || e.touches.length !== 1) return;
      var dx = e.touches[0].clientX - touchStartX;
      offset = touchStartOffset + dx;
      while (offset > 0) offset -= unitWidth;
      while (offset <= -unitWidth) offset += unitWidth;
      setTransform(offset);
    }, { passive: true });

    track.addEventListener('touchend', function () {
      if (!isDragging) return;
      isDragging = false;
      measure();
      startAnimation();
    }, { passive: true });

    track.addEventListener('touchcancel', function () {
      isDragging = false;
      measure();
      startAnimation();
    }, { passive: true });

    section.addEventListener('mouseenter', function () {
      animationPaused = true;
    });
    section.addEventListener('mouseleave', function () {
      if (!isDragging) animationPaused = false;
    });

    function applyMobile() {
      if (isMobile()) {
        section.classList.add('ghd--logos-touch');
        measure();
        startAnimation();
      } else {
        section.classList.remove('ghd--logos-touch');
        stopAnimation();
        track.style.transform = '';
      }
    }

    applyMobile();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var wasMobile = section.classList.contains('ghd--logos-touch');
        if (isMobile()) {
          if (!wasMobile) applyMobile();
          else measure();
        } else if (wasMobile) {
          applyMobile();
        }
      }, 100);
    });
  }

  function init() {
    document.querySelectorAll('.ghd--logos.ghd--bg-white').forEach(initLogosCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
