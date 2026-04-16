/**
 * GH Hero Carousel
 * - Prev/Next button navigation
 * - Mobile swipe support
 * - Lazy load images/videos when slide is visible
 * - MP4: muted, no autoplay sound
 */
(function () {
  function initHeroCarousel(container) {
    var track = container.querySelector('.gh-hero-carousel__track');
    if (!track || container.dataset.initialized) return;
    container.dataset.initialized = "true";

    var originalSlides = Array.from(track.querySelectorAll('.gh-hero-slide'));
    var count = originalSlides.length;
    if (count <= 1) return;

    // 1. Create Clones
    var firstClone = originalSlides[0].cloneNode(true);
    var lastClone = originalSlides[count - 1].cloneNode(true);
    track.appendChild(firstClone);
    track.insertBefore(lastClone, originalSlides[0]);

    var allSlides = track.querySelectorAll('.gh-hero-slide');
    var currentIndex = 1;
    var isTransitioning = false;

    // 2. Force Exact Widths to prevent "slivers" of other slides
    function syncWidths() {
      var width = track.getBoundingClientRect().width;
      allSlides.forEach(function(slide) {
        slide.style.width = width + 'px';
        slide.style.flex = '0 0 ' + width + 'px'; // Prevent shrinking/growing
      });
      // Snap to current position without animation to keep it aligned
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = currentIndex * width;
    }

    function loadSlideAssets(slide) {
      if (!slide) return;
      var lazyElements = slide.querySelectorAll('[data-src]');
      lazyElements.forEach(function(el) {
        var src = el.getAttribute('data-src');
        if (src) {
          if (el.tagName === 'IMG') {
            el.src = src;
            if (el.getAttribute('data-srcset')) el.srcset = el.getAttribute('data-srcset');
          } else if (el.tagName === 'VIDEO') {
            el.src = src;
            el.load();
            el.play().catch(function() {});
          }
          el.removeAttribute('data-src');
        }
      });
    }

    function preloadNeighbors(index) {
      loadSlideAssets(allSlides[index]);
      loadSlideAssets(allSlides[index + 1]);
      loadSlideAssets(allSlides[index - 1]);
    }

    function scrollToIndex(index) {
      if (isTransitioning) return;
      isTransitioning = true;
      
      var width = track.getBoundingClientRect().width;
      currentIndex = index;
      
      track.style.scrollBehavior = 'smooth';
      // Use Math.round to prevent sub-pixel gaps
      track.scrollLeft = Math.round(currentIndex * width);

      setTimeout(function() {
        // Infinite Loop Logic
        if (currentIndex >= allSlides.length - 1) {
          track.style.scrollBehavior = 'auto';
          currentIndex = 1;
          track.scrollLeft = width;
        } else if (currentIndex <= 0) {
          track.style.scrollBehavior = 'auto';
          currentIndex = allSlides.length - 2;
          track.scrollLeft = Math.round(currentIndex * width);
        }
        
        isTransitioning = false;
        preloadNeighbors(currentIndex);
      }, 550); // Slightly longer than smooth scroll to ensure it finishes
    }

    container.querySelector('.gh-hero-carousel__btn--prev')?.addEventListener('click', function() {
      scrollToIndex(currentIndex - 1);
    });

    container.querySelector('.gh-hero-carousel__btn--next')?.addEventListener('click', function() {
      scrollToIndex(currentIndex + 1);
    });

    // Mobile swipe support (keeps arrow controls active)
    var touchStartX = 0;
    var touchStartY = 0;
    var touchDeltaX = 0;
    var touchDeltaY = 0;
    var isSwiping = false;
    var didSwipe = false;
    var SWIPE_THRESHOLD = 40;

    track.addEventListener('touchstart', function(event) {
      if (!event.touches || !event.touches.length) return;
      var touch = event.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchDeltaX = 0;
      touchDeltaY = 0;
      isSwiping = false;
      didSwipe = false;
    }, { passive: true });

    track.addEventListener('touchmove', function(event) {
      if (!event.touches || !event.touches.length) return;
      var touch = event.touches[0];
      touchDeltaX = touch.clientX - touchStartX;
      touchDeltaY = touch.clientY - touchStartY;

      // Lock to horizontal swipes so vertical page scroll keeps working.
      if (!isSwiping && Math.abs(touchDeltaX) > 8 && Math.abs(touchDeltaX) > Math.abs(touchDeltaY)) {
        isSwiping = true;
      }

      if (isSwiping) {
        event.preventDefault();
      }
    }, { passive: false });

    track.addEventListener('touchend', function() {
      if (!isSwiping || isTransitioning) return;

      if (Math.abs(touchDeltaX) >= SWIPE_THRESHOLD) {
        didSwipe = true;
        if (touchDeltaX < 0) {
          scrollToIndex(currentIndex + 1);
        } else {
          scrollToIndex(currentIndex - 1);
        }
      }
    }, { passive: true });

    // Prevent accidental click-through after a swipe on slide links.
    track.addEventListener('click', function(event) {
      if (!didSwipe) return;
      event.preventDefault();
      event.stopPropagation();
      didSwipe = false;
    }, true);

    // Handle Window Resize and Orientation change
    window.addEventListener('resize', syncWidths);
    
    // Final check: Load initial assets and set position
    syncWidths();
    preloadNeighbors(currentIndex);
  }

  function initAll() {
    document.querySelectorAll('.ghd--hero-carousel').forEach(initHeroCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  document.addEventListener('shopify:section:load', initAll);
})();
