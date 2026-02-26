/**
 * Static Reviews Carousel — infinite, transform-based, smooth.
 * Touch swipe + mouse drag. Loops endlessly via clone repositioning.
 */
(function () {
  var EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1.0)';
  var DURATION = 450;

  function initCarousel(section) {
    var track = section.querySelector('.src__track');
    var outer = section.querySelector('.src__carousel-outer');
    var progressFill = section.querySelector('.src__progress-fill');
    var progressEl = section.querySelector('.src__progress');
    if (!track || !outer) return;

    var origCards = Array.prototype.slice.call(track.querySelectorAll('.src__card'));
    var count = origCards.length;
    if (count <= 1) return;

    /* ---- Clone slides for infinite loop ---- */
    var clonesPerSide = count;

    for (var i = 0; i < clonesPerSide; i++) {
      var clone = origCards[i].cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }
    for (var i = clonesPerSide - 1; i >= 0; i--) {
      var clone = origCards[i].cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.insertBefore(clone, track.firstChild);
    }

    /* ---- State ---- */
    var cardW, gap, step, peekOffset;
    var internalIdx = clonesPerSide;
    var animating = false;

    function measure() {
      var first = track.querySelector('.src__card');
      cardW = first.offsetWidth;
      gap = parseFloat(getComputedStyle(track).gap) || 0;
      step = cardW + gap;
      var containerW = outer.offsetWidth;
      var fullVisible = Math.floor(containerW / step);
      peekOffset = (containerW - fullVisible * step + gap) / 2;
    }

    function tx(idx, drag) {
      return -(idx * step) + peekOffset + (drag || 0);
    }

    function applyTransform(idx, drag, animate) {
      if (animate) {
        track.style.transition = 'transform ' + DURATION + 'ms ' + EASE;
      } else {
        track.style.transition = 'none';
      }
      track.style.transform = 'translateX(' + tx(idx, drag) + 'px)';
    }

    /* ---- Navigation ---- */
    function goTo(idx, animate) {
      internalIdx = idx;
      applyTransform(internalIdx, 0, animate);
      updateProgress();
    }

    function settle() {
      animating = false;
      var real = internalIdx - clonesPerSide;
      if (real < 0 || real >= count) {
        internalIdx = clonesPerSide + ((real % count) + count) % count;
        applyTransform(internalIdx, 0, false);
      }
    }

    track.addEventListener('transitionend', function (e) {
      if (e.target !== track) return;
      settle();
    });

    /* ---- Progress ---- */
    function getRealIdx() {
      var r = (internalIdx - clonesPerSide) % count;
      return (r + count) % count;
    }

    function updateProgress() {
      if (!progressFill) return;
      var idx = getRealIdx();
      progressFill.style.width = ((idx + 1) / count) * 100 + '%';
      if (progressEl) {
        progressEl.setAttribute('aria-valuenow', idx + 1);
        progressEl.setAttribute('aria-valuemax', count);
      }
    }

    /* ---- Interrupt mid-animation ---- */
    function stopAnimation() {
      if (!animating) return;
      var cs = getComputedStyle(track);
      var matrix = new DOMMatrix(cs.transform);
      var curX = matrix.m41;
      track.style.transition = 'none';
      track.style.transform = 'translateX(' + curX + 'px)';
      internalIdx = Math.round((-curX + peekOffset) / step);
      animating = false;
    }

    /* ---- Snap logic (shared by touch + mouse) ---- */
    function snapAfterDrag(dragDist) {
      var threshold = step * 0.15;
      if (Math.abs(dragDist) > threshold) {
        internalIdx += dragDist < 0 ? 1 : -1;
      }
      animating = true;
      goTo(internalIdx, true);
    }

    /* ---- Touch ---- */
    var touchStartX = 0, touchStartY = 0, touchDragX = 0;
    var isSwiping = null;

    track.addEventListener('touchstart', function (e) {
      stopAnimation();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchDragX = 0;
      isSwiping = null;
    }, { passive: true });

    track.addEventListener('touchmove', function (e) {
      var dx = e.touches[0].clientX - touchStartX;
      var dy = e.touches[0].clientY - touchStartY;

      if (isSwiping === null) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
          isSwiping = true;
        } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
          isSwiping = false;
        }
        if (isSwiping !== true) return;
      }
      if (!isSwiping) return;
      e.preventDefault();
      touchDragX = dx;
      applyTransform(internalIdx, touchDragX, false);
    }, { passive: false });

    track.addEventListener('touchend', function () {
      if (isSwiping !== true) { isSwiping = null; return; }
      isSwiping = null;
      snapAfterDrag(touchDragX);
      touchDragX = 0;
    });

    /* ---- Mouse drag ---- */
    var mouseDown = false, mouseStartX = 0, mouseDragX = 0, hasDragged = false;

    track.addEventListener('mousedown', function (e) {
      stopAnimation();
      mouseDown = true;
      hasDragged = false;
      mouseStartX = e.pageX;
      mouseDragX = 0;
      track.classList.add('is-dragging');
      e.preventDefault();
    });

    track.addEventListener('mousemove', function (e) {
      if (!mouseDown) return;
      e.preventDefault();
      mouseDragX = e.pageX - mouseStartX;
      if (Math.abs(mouseDragX) > 3) hasDragged = true;
      applyTransform(internalIdx, mouseDragX, false);
    });

    function endMouse() {
      if (!mouseDown) return;
      mouseDown = false;
      track.classList.remove('is-dragging');
      snapAfterDrag(mouseDragX);
      mouseDragX = 0;
    }

    track.addEventListener('mouseup', endMouse);
    track.addEventListener('mouseleave', endMouse);

    track.addEventListener('click', function (e) {
      if (hasDragged) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    /* ---- Resize ---- */
    var rTimer;
    window.addEventListener('resize', function () {
      clearTimeout(rTimer);
      rTimer = setTimeout(function () {
        measure();
        applyTransform(internalIdx, 0, false);
      }, 200);
    });

    /* ---- Init ---- */
    measure();
    goTo(clonesPerSide, false);
  }

  function initAll() {
    var sections = document.querySelectorAll('.src.static-reviews-carousel');
    for (var i = 0; i < sections.length; i++) {
      initCarousel(sections[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', initAll);
})();
