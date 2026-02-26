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

    // 1. Infinite Cloning
    var firstClone = originalSlides[0].cloneNode(true);
    var lastClone = originalSlides[count - 1].cloneNode(true);
    track.appendChild(firstClone);
    track.insertBefore(lastClone, originalSlides[0]);

    var allSlides = track.querySelectorAll('.gh-hero-slide');
    var currentIndex = 1;
    var isTransitioning = false;

    function getSlideWidth() {
      return track.offsetWidth || track.clientWidth;
    }

    // Jump to the "real" first slide instantly
    track.scrollLeft = getSlideWidth();

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
          }
          el.removeAttribute('data-src');
          el.classList.remove('gh-hero-slide__img--lazy');
        }
      });
    }

    // Pre-loads the current, next, and previous slides
    function preloadNeighbors(index) {
      loadSlideAssets(allSlides[index]);         // Current
      loadSlideAssets(allSlides[index + 1]);     // Next
      loadSlideAssets(allSlides[index - 1]);     // Previous
    }

    function scrollToIndex(index) {
      if (isTransitioning) return;
      isTransitioning = true;
      
      // Pre-load the slide we are about to see BEFORE we move
      loadSlideAssets(allSlides[index]);

      var width = getSlideWidth();
      currentIndex = index;
      track.style.scrollBehavior = 'smooth';
      track.scrollLeft = currentIndex * width;

      setTimeout(function() {
        // Infinite Loop Snap Logic
        if (currentIndex >= allSlides.length - 1) {
          track.style.scrollBehavior = 'auto';
          currentIndex = 1;
          track.scrollLeft = width;
        } else if (currentIndex <= 0) {
          track.style.scrollBehavior = 'auto';
          currentIndex = allSlides.length - 2;
          track.scrollLeft = currentIndex * width;
        }
        
        isTransitioning = false;
        // Pre-load neighbors for the next potential click
        preloadNeighbors(currentIndex);
      }, 500); 
    }

    container.querySelector('.gh-hero-carousel__btn--prev')?.addEventListener('click', function() {
      scrollToIndex(currentIndex - 1);
    });

    container.querySelector('.gh-hero-carousel__btn--next')?.addEventListener('click', function() {
      scrollToIndex(currentIndex + 1);
    });

    // Initial load: Prepare the first view and the items next to it
    preloadNeighbors(currentIndex);
    
    window.addEventListener('resize', function() {
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = currentIndex * getSlideWidth();
    });
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
