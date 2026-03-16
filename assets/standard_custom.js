document.addEventListener('DOMContentLoaded', function () {
  var slider = document.querySelector('.standards-cards__slider');
  if (!slider) return;

  var track = slider.querySelector('.standards-cards__track');
  var slides = Array.prototype.slice.call(track.children);
  if (!slides.length) return;

  var currentIndex = 0;
  var isDragging = false;
  var startX = 0;
  var currentTranslate = 0;
  var prevTranslate = 0;
  var slideWidth = 0;

  function isMobile() {
    return window.innerWidth <= 767;
  }

  function setSlideWidth() {
    if (!isMobile()) {
      slideWidth = slider.offsetWidth / slides.length;
    } else {
      slideWidth = slider.offsetWidth * 0.8;
    }
  }

  function setPositionByIndex() {
    currentTranslate = -currentIndex * slideWidth;
    track.style.transform = 'translateX(' + currentTranslate + 'px)';
  }

  function loopIndex(index) {
    var total = slides.length;
    if (index < 0) return total - 1;
    if (index >= total) return 0;
    return index;
  }

  function animateToIndex(index) {
    currentIndex = loopIndex(index);
    track.style.transition = 'transform 0.35s ease-out';
    setPositionByIndex();
  }

  function pointerDown(e) {
    if (!isMobile()) return;
    isDragging = true;
    track.style.transition = 'none';
    startX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    prevTranslate = currentTranslate;
  }

  function pointerMove(e) {
    if (!isDragging || !isMobile()) return;
    var clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    var deltaX = clientX - startX;
    currentTranslate = prevTranslate + deltaX;
    track.style.transform = 'translateX(' + currentTranslate + 'px)';
  }

  function pointerUp() {
    if (!isDragging || !isMobile()) return;
    isDragging = false;
    var movedBy = currentTranslate - prevTranslate;

    if (Math.abs(movedBy) > slideWidth * 0.25) {
      if (movedBy < 0) {
        animateToIndex(currentIndex + 1);
      } else {
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
  }

  function init() {
    setSlideWidth();
    slides.forEach(function (slide) {
      slide.style.flex = '0 0 80%';
      slide.style.maxWidth = '80%';
    });
    track.style.display = 'flex';
    track.style.willChange = 'transform';
    track.style.transition = 'transform 0.35s ease-out';
    setPositionByIndex();
    attachEvents();
  }

  window.addEventListener('resize', function () {
    setSlideWidth();
    setPositionByIndex();
  });

  init();
});
