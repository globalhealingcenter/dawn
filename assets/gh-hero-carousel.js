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

    function getSlideWidth() {
      return track.offsetWidth || track.clientWidth;
    }

    function getCurrentIndex() {
      var width = getSlideWidth();
      if (!width) return 0;
      return Math.round(track.scrollLeft / width);
    }

    function scrollToIndex(index) {
      var width = getSlideWidth();
      var target = Math.max(0, Math.min(index, count - 1)) * width;
      track.scrollTo({ left: target, behavior: 'smooth' });
    }

    function loadLazySlide(slide) {
      if (!slide) return;
      var lazyImgs = slide.querySelectorAll('img.gh-hero-slide__img--lazy[data-src]');
      for (var i = 0; i < lazyImgs.length; i++) {
        var img = lazyImgs[i];
        var src = img.getAttribute('data-src');
        var srcset = img.getAttribute('data-srcset');
        if (src) {
          img.src = src;
          if (srcset) img.setAttribute('srcset', srcset);
          img.removeAttribute('data-src');
          img.removeAttribute('data-srcset');
          img.classList.remove('gh-hero-slide__img--lazy');
        }
      }
      var lazyVideos = slide.querySelectorAll('video[data-src]');
      for (var j = 0; j < lazyVideos.length; j++) {
        var video = lazyVideos[j];
        var vSrc = video.getAttribute('data-src');
        if (vSrc) {
          video.src = vSrc;
          video.removeAttribute('data-src');
          video.load();
          video.play().catch(function() {});
        }
      }
    }

    if (slides[0]) loadLazySlide(slides[0]);

    track.addEventListener('scroll', function() {
      var idx = getCurrentIndex();
      if (slides[idx]) loadLazySlide(slides[idx]);
    });

    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        scrollToIndex(getCurrentIndex() - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        scrollToIndex(getCurrentIndex() + 1);
      });
    }

    var touchStartX = 0;
    var touchEndX = 0;
    track.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    track.addEventListener('touchend', function(e) {
      touchEndX = e.changedTouches[0].screenX;
      var diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) scrollToIndex(getCurrentIndex() + 1);
        else scrollToIndex(getCurrentIndex() - 1);
      }
    }, { passive: true });

    var scrollObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var vids = entry.target.querySelectorAll('video');
        for (var k = 0; k < vids.length; k++) {
          if (entry.isIntersecting) {
            vids[k].play().catch(function() {});
          } else {
            vids[k].pause();
          }
        }
      });
    }, { root: track, threshold: 0.5 });
    for (var s = 0; s < slides.length; s++) {
      scrollObserver.observe(slides[s]);
    }
  }

  function initAll() {
    var carousels = document.querySelectorAll('.ghd--hero-carousel');
    for (var i = 0; i < carousels.length; i++) {
      initHeroCarousel(carousels[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', initAll);
})();
