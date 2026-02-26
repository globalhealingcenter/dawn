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
    container.dataset.initialized = "true"; // Prevent double-init

    var originalSlides = Array.from(track.querySelectorAll('.gh-hero-slide'));
    var count = originalSlides.length;
    if (count <= 1) return;

    // 1. Clone first and last slides for infinite effect
    var firstClone = originalSlides[0].cloneNode(true);
    var lastClone = originalSlides[count - 1].cloneNode(true);
    
    track.appendChild(firstClone);
    track.insertBefore(lastClone, originalSlides[0]);

    var allSlides = track.querySelectorAll('.gh-hero-slide');
    var currentIndex = 1; // Start at 1 because 0 is the clone
    var isTransitioning = false;

    function getSlideWidth() {
      return track.offsetWidth || track.clientWidth;
    }

    // Set initial position to the "real" first slide
    function setInitialPosition() {
      track.scrollLeft = getSlideWidth();
    }
    setInitialPosition();

    function loadLazySlide(slide) {
      if (!slide) return;
      var lazyElements = slide.querySelectorAll('[data-src]');
      lazyElements.forEach(function(el) {
        var src = el.getAttribute('data-src');
        if (src) {
          if (el.tagName === 'IMG') {
            el.src = src;
            var srcset = el.getAttribute('data-srcset');
            if (srcset) el.srcset = srcset;
          } else if (el.tagName === 'VIDEO') {
            el.src = src;
            el.load();
            el.play().catch(function() {});
          }
          el.removeAttribute('data-src');
        }
      });
    }

    function updateLoop() {
      var width = getSlideWidth();
      // If we are on the "Fake Last" (the clone of the first)
      if (currentIndex >= allSlides.length - 1) {
        track.style.scrollBehavior = 'auto';
        currentIndex = 1;
        track.scrollLeft = width;
      } 
      // If we are on the "Fake First" (the clone of the last)
      else if (currentIndex <= 0) {
        track.style.scrollBehavior = 'auto';
        currentIndex = allSlides.length - 2;
        track.scrollLeft = currentIndex * width;
      }
      isTransitioning = false;
    }

    function scrollToIndex(index) {
      if (isTransitioning) return;
      isTransitioning = true;
      
      var width = getSlideWidth();
      currentIndex = index;
      
      track.style.scrollBehavior = 'smooth';
      track.scrollLeft = currentIndex * width;

      // Wait for the smooth scroll to finish, then check if we need to "snap"
      setTimeout(function() {
        updateLoop();
        loadLazySlide(allSlides[currentIndex]);
      }, 500); // Matches standard smooth scroll duration
    }

    container.querySelector('.gh-hero-carousel__btn--prev')?.addEventListener('click', function() {
      scrollToIndex(currentIndex - 1);
    });

    container.querySelector('.gh-hero-carousel__btn--next')?.addEventListener('click', function() {
      scrollToIndex(currentIndex + 1);
    });

    // Handle window resizing so width stays correct
    window.addEventListener('resize', setInitialPosition);

    // Initial Load
    loadLazySlide(allSlides[currentIndex]);
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
