document.addEventListener('DOMContentLoaded', function () {
  var slider = document.querySelector('.standards-cards__slider');
  if (!slider) return;

  var track = slider.querySelector('.standards-cards__track');
  var originalSlides = Array.prototype.slice.call(track.children);
  if (!originalSlides.length) return;

  var slides;
  var slideCount = originalSlides.length;
  var currentIndex = 1; // start on first real slide (after prepended clone)
  var isDragging = false;
  var startX = 0;
  var currentTranslate = 0;
  var prevTranslate = 0;
  var slideWidth = 0;
  var centerOffset = 0;
  var initialized = false;

  function isMobile() {
    return window.innerWidth <= 767;
  }

  function setSlideWidth() {
    var sliderWidth = slider.offsetWidth;
    if (!slides || !slides.length || !sliderWidth) return;
    // Use actual slide width so math stays in sync with layout
    var firstSlideWidth = slides[0].getBoundingClientRect().width || sliderWidth * 0.7;
    slideWidth = firstSlideWidth;
    centerOffset = (sliderWidth - slideWidth) / 2;
  }

  function setPositionByIndex() {
    currentTranslate = -currentIndex * slideWidth + centerOffset;
    track.style.transform = 'translateX(' + currentTranslate + 'px)';
  }

  function animateToIndex(index) {
    currentIndex = index;
    track.style.transition = 'transform 0.35s ease-out';
    setPositionByIndex();
  }

  function handleTransitionEnd() {
    // seamless looping between cloned edges and real slides
    track.style.transition = 'none';
    if (currentIndex === 0) {
      currentIndex = slideCount;
      setPositionByIndex();
    } else if (currentIndex === slideCount + 1) {
      currentIndex = 1;
      setPositionByIndex();
    }
  }

  function pointerDown(e) {
    if (!isMobile() || !initialized) return;
    isDragging = true;
    track.style.transition = 'none';
    startX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    prevTranslate = currentTranslate;
  }

  function pointerMove(e) {
    if (!isDragging || !isMobile() || !initialized) return;
    var clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    var deltaX = clientX - startX;
    currentTranslate = prevTranslate + deltaX;
    track.style.transform = 'translateX(' + currentTranslate + 'px)';
  }

  function pointerUp() {
    if (!isDragging || !isMobile() || !initialized) return;
    isDragging = false;
    var movedBy = currentTranslate - prevTranslate;

    if (Math.abs(movedBy) > slideWidth * 0.25) {
      if (movedBy < 0) {
        // next
        animateToIndex(currentIndex + 1);
      } else {
        // prev
        animateToIndex(currentIndex - 1);
      }
    } else {
      animateToIndex(currentIndex);
    }
  }

  function attachEvents() {
    slider.addEventListener('mousedown', pointerDown);
    slider.addEventListener('touchstart', pointerDown, { passive: true });
    window.addEventListener('mousemove', pointerMove);
    window.addEventListener('touchmove', pointerMove, { passive: true });
    window.addEventListener('mouseup', pointerUp);
    window.addEventListener('touchend', pointerUp);
    window.addEventListener('touchcancel', pointerUp);
    track.addEventListener('transitionend', handleTransitionEnd);
  }

  function initMobileSlider() {
    if (initialized || !isMobile()) return;

    // Clone first and last slide for seamless loop
    var firstClone = originalSlides[0].cloneNode(true);
    var lastClone = originalSlides[slideCount - 1].cloneNode(true);
    track.insertBefore(lastClone, originalSlides[0]);
    track.appendChild(firstClone);

    slides = Array.prototype.slice.call(track.children);

    slides.forEach(function (slide) {
      slide.style.flex = '0 0 70%';
      slide.style.maxWidth = '70%';
    });

    track.style.display = 'flex';
    track.style.willChange = 'transform';

    setSlideWidth();
    // wait a frame so layout is stable before first jump
    window.requestAnimationFrame(function () {
      setPositionByIndex();
    });
    attachEvents();

    initialized = true;
  }

  window.addEventListener('resize', function () {
    if (initialized && !isMobile()) {
      // when leaving mobile, just reset transform so cards sit naturally
      track.style.transition = 'none';
      track.style.transform = 'translateX(0)';
      isDragging = false;
    }

    if (isMobile()) {
      setSlideWidth();
      if (initialized) {
        setPositionByIndex();
      } else {
        initMobileSlider();
      }
    }
  });

  // Initial run – only create slider on mobile
  if (isMobile()) {
    initMobileSlider();
  }
});
