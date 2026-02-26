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
    if (!track) return;

    var slides = track.querySelectorAll('.gh-hero-slide');
    var count = slides.length;
    if (count <= 1) return;

    var prevBtn = container.querySelector('.gh-hero-carousel__btn--prev');
    var nextBtn = container.querySelector('.gh-hero-carousel__btn--next');

    var currentIndex = 0;
    var autoplayInterval = 5000; // 5 seconds
    var autoplayTimer;

    function getSlideWidth() {
      return track.offsetWidth || track.clientWidth;
    }

    function scrollToIndex(index) {
      currentIndex = Math.max(0, Math.min(index, count - 1));
      loadLazySlide(slides[currentIndex]);
      var width = getSlideWidth();
      track.scrollTo({ left: currentIndex * width, behavior: 'smooth' });
    }

    function loadLazySlide(slide) {
      if (!slide) return;
      var lazyImgs = slide.querySelectorAll('img.gh-hero-slide__img--lazy[data-src]');
      lazyImgs.forEach(function (img) {
        var src = img.getAttribute('data-src');
        var srcset = img.getAttribute('data-srcset');
        if (src) {
          img.src = src;
          if (srcset) img.setAttribute('srcset', srcset);
          img.removeAttribute('data-src');
          img.removeAttribute('data-srcset');
          img.classList.remove('gh-hero-slide__img--lazy');
        }
      });

      var lazyVideos = slide.querySelectorAll('video[data-src]');
      lazyVideos.forEach(function (video) {
        var vSrc = video.getAttribute('data-src');
        if (vSrc) {
          video.src = vSrc;
          video.removeAttribute('data-src');
          video.load();
          video.play().catch(function() {});
        }
      });
    }

    // Initial load
    loadLazySlide(slides[0]);

    // Buttons
    prevBtn?.addEventListener('click', function() {
      scrollToIndex(currentIndex - 1);
      resetAutoplay();
    });
    nextBtn?.addEventListener('click', function() {
      scrollToIndex(currentIndex + 1);
      resetAutoplay();
    });

    // Touch swipe
    var touchStartX = 0;
    track.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    track.addEventListener('touchend', function(e) {
      var touchEndX = e.changedTouches[0].screenX;
      var diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) scrollToIndex(currentIndex + 1);
        else scrollToIndex(currentIndex - 1);
        resetAutoplay();
      }
    }, { passive: true });

    // Video play/pause on visibility
    var scrollObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var vids = entry.target.querySelectorAll('video');
        vids.forEach(function(v) {
          if (entry.isIntersecting) v.play().catch(() => {});
          else v.pause();
        });
      });
    }, { root: track, threshold: 0.5 });
    slides.forEach(s => scrollObserver.observe(s));

    // Autoplay
    function startAutoplay() {
      autoplayTimer = setInterval(function() {
        scrollToIndex(currentIndex + 1 >= count ? 0 : currentIndex + 1);
      }, autoplayInterval);
    }
    function resetAutoplay() {
      clearInterval(autoplayTimer);
      startAutoplay();
    }
    startAutoplay();

    // Resize handler
    window.addEventListener('resize', function() {
      scrollToIndex(currentIndex); // recalc width
    });
  }

  function initAll() {
    var carousels = document.querySelectorAll('.ghd--hero-carousel');
    carousels.forEach(c => initHeroCarousel(c));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  document.addEventListener('shopify:section:load', initAll);
})();
