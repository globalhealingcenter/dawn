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

    var slides = Array.from(track.querySelectorAll('.gh-hero-slide'));
    var count = slides.length;
    if (count <= 1) return;

    var prevBtn = container.querySelector('.gh-hero-carousel__btn--prev');
    var nextBtn = container.querySelector('.gh-hero-carousel__btn--next');

    // Clone first and last for infinite loop
    var firstClone = slides[0].cloneNode(true);
    var lastClone = slides[count - 1].cloneNode(true);
    track.appendChild(firstClone);
    track.insertBefore(lastClone, slides[0]);
    slides = Array.from(track.querySelectorAll('.gh-hero-slide')); // update array
    var slideWidth = track.offsetWidth;
    var currentIndex = 1; // start at original first slide

    // Set initial position
    track.style.display = 'flex';
    track.style.transition = 'transform 0.5s ease';
    track.style.transform = `translateX(${-slideWidth * currentIndex}px)`;

    function loadLazySlide(slide) {
      if (!slide) return;
      slide.querySelectorAll('img.gh-hero-slide__img--lazy[data-src]').forEach(img => {
        var src = img.dataset.src;
        var srcset = img.dataset.srcset;
        if (src) {
          img.src = src;
          if (srcset) img.srcset = srcset;
          img.classList.remove('gh-hero-slide__img--lazy');
          delete img.dataset.src;
          delete img.dataset.srcset;
        }
      });
      slide.querySelectorAll('video[data-src]').forEach(video => {
        if (video.dataset.src) {
          video.src = video.dataset.src;
          delete video.dataset.src;
          video.load();
          video.play().catch(() => {});
        }
      });
    }

    // Load initial slides
    loadLazySlide(slides[currentIndex]);
    loadLazySlide(slides[currentIndex + 1]);
    loadLazySlide(slides[currentIndex - 1]);

    function goToSlide(index) {
      currentIndex = index;
      track.style.transition = 'transform 0.5s ease';
      track.style.transform = `translateX(${-slideWidth * currentIndex}px)`;
      loadLazySlide(slides[currentIndex]);
      loadLazySlide(slides[currentIndex + 1]);
      loadLazySlide(slides[currentIndex - 1]);
    }

    track.addEventListener('transitionend', () => {
      // Infinite loop adjustment
      if (currentIndex === 0) {
        track.style.transition = 'none';
        currentIndex = count;
        track.style.transform = `translateX(${-slideWidth * currentIndex}px)`;
      } else if (currentIndex === slides.length - 1) {
        track.style.transition = 'none';
        currentIndex = 1;
        track.style.transform = `translateX(${-slideWidth * currentIndex}px)`;
      }
    });

    // Buttons
    prevBtn?.addEventListener('click', () => goToSlide(currentIndex - 1));
    nextBtn?.addEventListener('click', () => goToSlide(currentIndex + 1));

    // Autoplay
    var autoplayInterval = 5000;
    var autoplayTimer = setInterval(() => goToSlide(currentIndex + 1), autoplayInterval);
    function resetAutoplay() {
      clearInterval(autoplayTimer);
      autoplayTimer = setInterval(() => goToSlide(currentIndex + 1), autoplayInterval);
    }
    prevBtn?.addEventListener('click', resetAutoplay);
    nextBtn?.addEventListener('click', resetAutoplay);

    // Touch swipe
    let touchStartX = 0;
    track.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX, { passive: true });
    track.addEventListener('touchend', e => {
      let touchEndX = e.changedTouches[0].screenX;
      let diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goToSlide(currentIndex + 1);
        else goToSlide(currentIndex - 1);
        resetAutoplay();
      }
    }, { passive: true });

    // Resize
    window.addEventListener('resize', () => {
      slideWidth = track.offsetWidth;
      track.style.transition = 'none';
      track.style.transform = `translateX(${-slideWidth * currentIndex}px)`;
    });
  }

  function initAll() {
    document.querySelectorAll('.ghd--hero-carousel').forEach(c => initHeroCarousel(c));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();
  document.addEventListener('shopify:section:load', initAll);
})();