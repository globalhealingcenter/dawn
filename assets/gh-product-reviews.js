/**
 * GH Product Reviews Carousel
 *
 * Infinite transform-based carousel with:
 * - Touch swipe
 * - Mouse drag
 * - Infinite clone repositioning
 * - Responsive measurements
 * - Progress indicator
 * - Shopify section reload support
 */

(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
    var DURATION = 450;

    function initCarousel(section) {
        if (!section || section.dataset.ghReviewsInitialized === 'true') {
            return;
        }

        var track = section.querySelector('.ghr-reviews__track');
        var carousel = section.querySelector('.ghr-reviews__carousel');
        var progressFill = section.querySelector('.ghr-reviews__progress-fill');
        var progressElement = section.querySelector('.ghr-reviews__progress');

        if (!track || !carousel) {
            return;
        }

        var originalCards = Array.prototype.slice.call(
            track.querySelectorAll('.ghr-reviews__card')
        );

        var count = originalCards.length;

        if (!count) {
            return;
        }

        section.dataset.ghReviewsInitialized = 'true';

        if (count === 1) {
            if (progressFill) {
                progressFill.style.width = '100%';
            }

            return;
        }

        var clonesPerSide = count;

        /*
         * Append a cloned set after the original cards.
         */
        for (var appendIndex = 0; appendIndex < clonesPerSide; appendIndex++) {
            var appendedClone = originalCards[appendIndex].cloneNode(true);

            appendedClone.setAttribute('aria-hidden', 'true');
            appendedClone.removeAttribute('aria-label');

            disableCloneLinks(appendedClone);
            track.appendChild(appendedClone);
        }

        /*
         * Insert a cloned set before the original cards.
         */
        for (var prependIndex = clonesPerSide - 1; prependIndex >= 0; prependIndex--) {
            var prependedClone = originalCards[prependIndex].cloneNode(true);

            prependedClone.setAttribute('aria-hidden', 'true');
            prependedClone.removeAttribute('aria-label');

            disableCloneLinks(prependedClone);
            track.insertBefore(prependedClone, track.firstChild);
        }

        var cardWidth = 0;
        var gap = 0;
        var step = 0;
        var peekOffset = 0;
        var fullyVisibleCards = 1;
        var internalIndex = clonesPerSide;
        var animating = false;

        function disableCloneLinks(clone) {
            var links = clone.querySelectorAll('a');

            for (var linkIndex = 0; linkIndex < links.length; linkIndex++) {
                links[linkIndex].setAttribute('tabindex', '-1');
            }
        }

        function measure() {
            var firstCard = track.querySelector('.ghr-reviews__card');

            if (!firstCard) {
                return;
            }

            cardWidth = firstCard.getBoundingClientRect().width;
            gap = parseFloat(window.getComputedStyle(track).gap) || 0;
            step = cardWidth + gap;

            var containerWidth = carousel.getBoundingClientRect().width;

            fullyVisibleCards = Math.max(
                1,
                Math.floor(containerWidth / step)
            );

            peekOffset =
                (containerWidth - fullyVisibleCards * step + gap) / 2;
        }

        function updateActiveCard() {
            var allCards = track.querySelectorAll('.ghr-reviews__card');

            for (var cardIndex = 0; cardIndex < allCards.length; cardIndex++) {
                allCards[cardIndex].classList.remove('ghr-review-active');
            }

            /*
             * Desktop:
             * Three complete cards are visible, so the second card is active.
             *
             * Mobile:
             * One complete card is visible, so that card is active.
             */
            var middleOffset = Math.floor(
                (fullyVisibleCards - 1) / 2
            );

            var activeCardIndex = internalIndex + middleOffset;
            var activeCard = allCards[activeCardIndex];

            if (activeCard) {
                activeCard.classList.add('ghr-review-active');
            }
        }

        function getTranslateX(index, dragDistance) {
            return (
                -(index * step) +
                peekOffset +
                (dragDistance || 0)
            );
        }

        function applyTransform(index, dragDistance, shouldAnimate) {
            if (shouldAnimate) {
                track.style.transition =
                    'transform ' + DURATION + 'ms ' + EASE;
            } else {
                track.style.transition = 'none';
            }

            track.style.transform =
                'translate3d(' +
                getTranslateX(index, dragDistance) +
                'px, 0, 0)';
        }

        function getRealIndex() {
            var realIndex =
                (internalIndex - clonesPerSide) % count;

            return (realIndex + count) % count;
        }

        function updateProgress() {
            var realIndex = getRealIndex();

            if (progressFill) {
                progressFill.style.width =
                    ((realIndex + 1) / count) * 100 + '%';
            }

            if (progressElement) {
                progressElement.setAttribute(
                    'aria-valuenow',
                    String(realIndex + 1)
                );

                progressElement.setAttribute(
                    'aria-valuemax',
                    String(count)
                );
            }
        }

        function goTo(index, shouldAnimate) {
            internalIndex = index;

            if (!shouldAnimate) {
                section.classList.add('ghr-reviews--resetting');
            }

            applyTransform(internalIndex, 0, shouldAnimate);
            updateProgress();
            updateActiveCard();

            if (!shouldAnimate) {
                section.offsetHeight;

                window.requestAnimationFrame(function () {
                    section.classList.remove('ghr-reviews--resetting');
                });
            }
        }

        function settleInfinitePosition() {
            animating = false;

            var realIndex = internalIndex - clonesPerSide;
            var needsReset = realIndex < 0 || realIndex >= count;

            if (!needsReset) {
                updateActiveCard();
                return;
            }

            /*
             * Temporarily disable card transitions so moving the active
             * state from a clone to the matching original is invisible.
             */
            section.classList.add('ghr-reviews--resetting');

            internalIndex =
                clonesPerSide +
                ((realIndex % count) + count) % count;

            applyTransform(internalIndex, 0, false);
            updateActiveCard();
            updateProgress();

            /*
             * Force the browser to apply the reset styles before
             * transitions are enabled again.
             */
            section.offsetHeight;

            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(function () {
                    section.classList.remove('ghr-reviews--resetting');
                });
            });
        }

        track.addEventListener('transitionend', function (event) {
            if (
                event.target !== track ||
                event.propertyName !== 'transform'
            ) {
                return;
            }

            settleInfinitePosition();
        });

        function stopAnimation() {
            if (!animating || !step) {
                return;
            }

            var computedStyle = window.getComputedStyle(track);
            var transform = computedStyle.transform;
            var currentX = 0;

            if (transform && transform !== 'none') {
                try {
                    var matrix = new DOMMatrixReadOnly(transform);
                    currentX = matrix.m41;
                } catch (error) {
                    currentX = getTranslateX(internalIndex, 0);
                }
            }

            track.style.transition = 'none';
            track.style.transform =
                'translate3d(' + currentX + 'px, 0, 0)';

            internalIndex = Math.round(
                (-currentX + peekOffset) / step
            );

            animating = false;
        }

        function snapAfterDrag(dragDistance) {
            if (!step) {
                return;
            }

            var threshold = step * 0.15;

            if (Math.abs(dragDistance) > threshold) {
                internalIndex += dragDistance < 0 ? 1 : -1;
            }

            animating = true;
            goTo(internalIndex, true);
        }

        /*
         * Touch interaction
         */
        var touchStartX = 0;
        var touchStartY = 0;
        var touchDragX = 0;
        var isSwiping = null;

        track.addEventListener(
            'touchstart',
            function (event) {
                if (!event.touches.length) {
                    return;
                }

                stopAnimation();

                touchStartX = event.touches[0].clientX;
                touchStartY = event.touches[0].clientY;
                touchDragX = 0;
                isSwiping = null;
            },
            { passive: true }
        );

        track.addEventListener(
            'touchmove',
            function (event) {
                if (!event.touches.length) {
                    return;
                }

                var deltaX =
                    event.touches[0].clientX - touchStartX;

                var deltaY =
                    event.touches[0].clientY - touchStartY;

                if (isSwiping === null) {
                    if (
                        Math.abs(deltaX) > Math.abs(deltaY) &&
                        Math.abs(deltaX) > 5
                    ) {
                        isSwiping = true;
                    } else if (
                        Math.abs(deltaY) > Math.abs(deltaX) &&
                        Math.abs(deltaY) > 5
                    ) {
                        isSwiping = false;
                    }
                }

                if (isSwiping !== true) {
                    return;
                }

                event.preventDefault();

                touchDragX = deltaX;
                applyTransform(internalIndex, touchDragX, false);
            },
            { passive: false }
        );

        track.addEventListener('touchend', function () {
            if (isSwiping !== true) {
                isSwiping = null;
                return;
            }

            isSwiping = null;
            snapAfterDrag(touchDragX);
            touchDragX = 0;
        });

        track.addEventListener('touchcancel', function () {
            if (isSwiping === true) {
                snapAfterDrag(touchDragX);
            }

            isSwiping = null;
            touchDragX = 0;
        });

        /*
         * Mouse interaction
         */
        var mouseDown = false;
        var mouseStartX = 0;
        var mouseDragX = 0;
        var hasDragged = false;

        track.addEventListener('mousedown', function (event) {
            if (event.button !== 0) {
                return;
            }

            stopAnimation();

            mouseDown = true;
            hasDragged = false;
            mouseStartX = event.pageX;
            mouseDragX = 0;

            track.classList.add('is-dragging');
            event.preventDefault();
        });

        track.addEventListener('mousemove', function (event) {
            if (!mouseDown) {
                return;
            }

            event.preventDefault();

            mouseDragX = event.pageX - mouseStartX;

            if (Math.abs(mouseDragX) > 3) {
                hasDragged = true;
            }

            applyTransform(internalIndex, mouseDragX, false);
        });

        function endMouseDrag() {
            if (!mouseDown) {
                return;
            }

            mouseDown = false;
            track.classList.remove('is-dragging');

            snapAfterDrag(mouseDragX);
            mouseDragX = 0;
        }

        track.addEventListener('mouseup', endMouseDrag);
        track.addEventListener('mouseleave', endMouseDrag);

        track.addEventListener(
            'click',
            function (event) {
                if (!hasDragged) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                hasDragged = false;
            },
            true
        );

        /*
         * Keyboard navigation
         */
        track.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowRight') {
                event.preventDefault();

                stopAnimation();
                animating = true;
                goTo(internalIndex + 1, true);
            }

            if (event.key === 'ArrowLeft') {
                event.preventDefault();

                stopAnimation();
                animating = true;
                goTo(internalIndex - 1, true);
            }
        });

        /*
         * Responsive recalculation
         */
        var resizeTimer;

        window.addEventListener('resize', function () {
            window.clearTimeout(resizeTimer);

            resizeTimer = window.setTimeout(function () {
                measure();
                applyTransform(internalIndex, 0, false);
                updateActiveCard();
            }, 200);
        });

        /*
         * Initial position
         */
        measure();
        goTo(clonesPerSide, false);
    }

    function initAll(scope) {
        var context = scope || document;
        var sections;

        if (
            context.matches &&
            context.matches('[data-gh-reviews]')
        ) {
            sections = [context];
        } else {
            sections = context.querySelectorAll(
                '[data-gh-reviews]'
            );
        }

        for (var index = 0; index < sections.length; index++) {
            initCarousel(sections[index]);
        }
    }

    function handleSectionLoad(event) {
        initAll(event.target);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initAll(document);
        });
    } else {
        initAll(document);
    }

    document.addEventListener(
        'shopify:section:load',
        handleSectionLoad
    );
})();