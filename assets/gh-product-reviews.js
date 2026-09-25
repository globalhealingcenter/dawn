/**
 * GH Product Reviews Carousel
 *
 * Features:
 * - Infinite carousel
 * - Variable-width active/focus card
 * - Active middle card
 * - Equal CSS gap between cards
 * - Smooth horizontal movement
 * - Touch swipe
 * - Mouse drag
 * - Keyboard navigation
 * - Progress indicator
 * - Responsive/mobile support
 * - Shopify section reload support
 */

(function () {
    'use strict';

    var EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
    var DURATION = 450;

    function initCarousel(section) {
        if (
            !section ||
            section.dataset.ghReviewsInitialized === 'true'
        ) {
            return;
        }

        var track = section.querySelector(
            '.ghr-reviews__track'
        );

        var carousel = section.querySelector(
            '.ghr-reviews__carousel'
        );

        var progressFill = section.querySelector(
            '.ghr-reviews__progress-fill'
        );

        var progressElement = section.querySelector(
            '.ghr-reviews__progress'
        );

        if (!track || !carousel) {
            return;
        }

        /* =====================================================
           ORIGINAL CARDS
           ===================================================== */

        var originalCards = Array.prototype.slice.call(
            track.querySelectorAll('.ghr-reviews__card')
        );

        var count = originalCards.length;

        if (!count) {
            return;
        }

        section.dataset.ghReviewsInitialized = 'true';

        /* =====================================================
           SINGLE REVIEW
           ===================================================== */

        if (count === 1) {
            originalCards[0].classList.add(
                'ghr-review-active'
            );

            if (progressFill) {
                progressFill.style.width = '100%';
            }

            if (progressElement) {
                progressElement.setAttribute(
                    'aria-valuenow',
                    '1'
                );

                progressElement.setAttribute(
                    'aria-valuemax',
                    '1'
                );
            }

            return;
        }

        /* =====================================================
           CLONES
           ===================================================== */

        var clonesPerSide = count;

        function disableCloneLinks(clone) {
            var links = clone.querySelectorAll('a');

            for (
                var linkIndex = 0;
                linkIndex < links.length;
                linkIndex++
            ) {
                links[linkIndex].setAttribute(
                    'tabindex',
                    '-1'
                );
            }
        }

        /*
         * Append clones.
         */
        for (
            var appendIndex = 0;
            appendIndex < clonesPerSide;
            appendIndex++
        ) {
            var appendedClone =
                originalCards[appendIndex].cloneNode(true);

            appendedClone.setAttribute(
                'aria-hidden',
                'true'
            );

            appendedClone.removeAttribute(
                'aria-label'
            );

            appendedClone.classList.remove(
                'ghr-review-active'
            );

            disableCloneLinks(appendedClone);

            track.appendChild(appendedClone);
        }

        /*
         * Prepend clones.
         */
        for (
            var prependIndex = clonesPerSide - 1;
            prependIndex >= 0;
            prependIndex--
        ) {
            var prependedClone =
                originalCards[prependIndex].cloneNode(true);

            prependedClone.setAttribute(
                'aria-hidden',
                'true'
            );

            prependedClone.removeAttribute(
                'aria-label'
            );

            prependedClone.classList.remove(
                'ghr-review-active'
            );

            disableCloneLinks(prependedClone);

            track.insertBefore(
                prependedClone,
                track.firstChild
            );
        }

        /* =====================================================
           STATE
           ===================================================== */

        var internalIndex = clonesPerSide;

        var fullyVisibleCards = 1;

        var normalCardWidth = 0;

        var gap = 0;

        var currentTranslate = 0;

        var dragStartTranslate = 0;

        var animating = false;

        /* =====================================================
           HELPERS
           ===================================================== */

        function getAllCards() {
            return track.querySelectorAll(
                '.ghr-reviews__card'
            );
        }

        function getContainerWidth() {
            return carousel.getBoundingClientRect().width;
        }

        function getGap() {
            return (
                parseFloat(
                    window.getComputedStyle(track).gap
                ) || 0
            );
        }

        /* =====================================================
           MEASURE
           ===================================================== */

        function measure() {
            var allCards = getAllCards();

            if (!allCards.length) {
                return;
            }

            gap = getGap();

            /*
             * Always measure a normal/non-active card.
             *
             * Active desktop card has a larger actual
             * flex-basis/min-width.
             */
            var normalCard = track.querySelector(
                '.ghr-reviews__card:not(.ghr-review-active)'
            );

            if (!normalCard) {
                normalCard = allCards[0];
            }

            /*
             * offsetWidth ignores transform scaling.
             */
            normalCardWidth =
                normalCard.offsetWidth;

            var containerWidth =
                getContainerWidth();

            /*
             * Mobile:
             * one primary visible card.
             */
            if (window.innerWidth <= 767) {
                fullyVisibleCards = 1;

                return;
            }

            /*
             * Desktop.
             */
            var normalStep =
                normalCardWidth + gap;

            fullyVisibleCards = Math.max(
                1,
                Math.floor(
                    containerWidth / normalStep
                )
            );

            /*
             * We want an odd number whenever possible
             * because there should be a real middle card.
             *
             * Example:
             * 3 cards -> middle = card #2.
             */
            if (
                fullyVisibleCards > 1 &&
                fullyVisibleCards % 2 === 0
            ) {
                fullyVisibleCards -= 1;
            }
        }

        /* =====================================================
           ACTIVE CARD
           ===================================================== */

        function getMiddleOffset() {
            return Math.floor(
                fullyVisibleCards / 2
            );
        }

        function getActiveCardIndex() {
            return (
                internalIndex +
                getMiddleOffset()
            );
        }

        function updateActiveCard() {
            var allCards =
                getAllCards();

            /*
             * Remove previous active class.
             */
            for (
                var cardIndex = 0;
                cardIndex < allCards.length;
                cardIndex++
            ) {
                allCards[cardIndex].classList.remove(
                    'ghr-review-active'
                );
            }

            /*
             * Determine middle/focus card.
             */
            var activeCardIndex =
                getActiveCardIndex();

            var activeCard =
                allCards[activeCardIndex];

            if (activeCard) {
                activeCard.classList.add(
                    'ghr-review-active'
                );
            }
        }

        /* =====================================================
           TARGET TRANSLATE
           ===================================================== */

        function getTargetTranslate() {
            var allCards =
                getAllCards();

            var activeCardIndex =
                getActiveCardIndex();

            var activeCard =
                allCards[activeCardIndex];

            if (!activeCard) {
                return currentTranslate;
            }

            var containerWidth =
                getContainerWidth();

            /*
             * IMPORTANT:
             *
             * Use actual DOM layout.
             *
             * offsetLeft respects:
             * - actual flex-basis
             * - wider active card
             * - track gap
             *
             * offsetWidth gives actual active-card width.
             */
            var activeCenter =
                activeCard.offsetLeft +
                activeCard.offsetWidth / 2;

            /*
             * Center focus card in viewport.
             */
            return (
                containerWidth / 2 -
                activeCenter
            );
        }

        /* =====================================================
           APPLY TRACK POSITION
           ===================================================== */

        function setTrackTranslate(
            translateX,
            shouldAnimate
        ) {
            if (shouldAnimate) {
                track.style.transition =
                    'transform ' +
                    DURATION +
                    'ms ' +
                    EASE;
            } else {
                track.style.transition =
                    'none';
            }

            currentTranslate =
                translateX;

            track.style.transform =
                'translate3d(' +
                translateX +
                'px, 0, 0)';
        }

        function positionTrack(
            dragDistance,
            shouldAnimate
        ) {
            var targetTranslate =
                getTargetTranslate();

            var finalTranslate =
                targetTranslate +
                (dragDistance || 0);

            setTrackTranslate(
                finalTranslate,
                shouldAnimate
            );
        }

        /* =====================================================
           PROGRESS
           ===================================================== */

        function getRealIndex() {
            /*
             * Progress is based on the active/focus review,
             * not simply the first visible review.
             */
            var activeIndex =
                getActiveCardIndex();

            var realIndex =
                (
                    activeIndex -
                    clonesPerSide
                ) % count;

            return (
                (realIndex + count) %
                count
            );
        }

        function updateProgress() {
            var realIndex =
                getRealIndex();

            if (progressFill) {
                progressFill.style.width =
                    (
                        (
                            realIndex + 1
                        ) /
                        count
                    ) *
                    100 +
                    '%';
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

        /* =====================================================
           GO TO
           ===================================================== */

        function goTo(
            index,
            shouldAnimate
        ) {
            internalIndex =
                index;

            if (!shouldAnimate) {
                section.classList.add(
                    'ghr-reviews--resetting'
                );
            }

            /*
             * FIRST:
             *
             * Assign active class.
             *
             * This changes the active card's actual
             * flex-basis/min-width on desktop.
             */
            updateActiveCard();

            /*
             * IMPORTANT:
             *
             * Force browser to finish flex layout before
             * calculating offsetLeft/offsetWidth.
             *
             * flex-basis/min-width should NOT be animated
             * in CSS.
             */
            track.offsetWidth;

            /*
             * Now move track based on final layout.
             */
            positionTrack(
                0,
                shouldAnimate
            );

            updateProgress();

            if (!shouldAnimate) {
                track.offsetWidth;

                window.requestAnimationFrame(
                    function () {
                        window.requestAnimationFrame(
                            function () {
                                section.classList.remove(
                                    'ghr-reviews--resetting'
                                );
                            }
                        );
                    }
                );
            }
        }

        /* =====================================================
           INFINITE POSITION RESET
           ===================================================== */

        function settleInfinitePosition() {
            animating = false;

            /*
             * internalIndex represents the first position
             * in our visible group.
             */
            var realStartIndex =
                internalIndex -
                clonesPerSide;

            /*
             * We only need reset once first position
             * leaves the original card range.
             */
            if (
                realStartIndex >= 0 &&
                realStartIndex < count
            ) {
                return;
            }

            section.classList.add(
                'ghr-reviews--resetting'
            );

            /*
             * Normalize to matching original slide.
             */
            internalIndex =
                clonesPerSide +
                (
                    (
                        realStartIndex %
                        count
                    ) +
                    count
                ) %
                count;

            /*
             * Assign corresponding original active card.
             */
            updateActiveCard();

            /*
             * Force final flex geometry.
             */
            track.offsetWidth;

            /*
             * Silent clone -> original jump.
             */
            positionTrack(
                0,
                false
            );

            updateProgress();

            track.offsetWidth;

            window.requestAnimationFrame(
                function () {
                    window.requestAnimationFrame(
                        function () {
                            section.classList.remove(
                                'ghr-reviews--resetting'
                            );
                        }
                    );
                }
            );
        }

        /* =====================================================
           TRACK TRANSITION END
           ===================================================== */

        track.addEventListener(
            'transitionend',
            function (event) {
                if (
                    event.target !== track ||
                    event.propertyName !==
                    'transform'
                ) {
                    return;
                }

                settleInfinitePosition();
            }
        );

        /* =====================================================
           STOP CURRENT TRACK ANIMATION
           ===================================================== */

        function stopAnimation() {
            if (!animating) {
                return;
            }

            var computedStyle =
                window.getComputedStyle(
                    track
                );

            var transform =
                computedStyle.transform;

            var currentX =
                currentTranslate;

            if (
                transform &&
                transform !== 'none'
            ) {
                try {
                    var matrix =
                        new DOMMatrixReadOnly(
                            transform
                        );

                    currentX =
                        matrix.m41;
                } catch (error) {
                    currentX =
                        currentTranslate;
                }
            }

            /*
             * Freeze track exactly where it currently is.
             */
            track.style.transition =
                'none';

            track.style.transform =
                'translate3d(' +
                currentX +
                'px, 0, 0)';

            currentTranslate =
                currentX;

            animating = false;
        }

        /* =====================================================
           SNAP AFTER DRAG
           ===================================================== */

        function snapAfterDrag(
            dragDistance
        ) {
            var threshold =
                Math.max(
                    40,
                    normalCardWidth *
                    0.15
                );

            if (
                Math.abs(
                    dragDistance
                ) > threshold
            ) {
                if (
                    dragDistance < 0
                ) {
                    internalIndex += 1;
                } else {
                    internalIndex -= 1;
                }
            }

            animating = true;

            goTo(
                internalIndex,
                true
            );
        }

        /* =====================================================
           TOUCH
           ===================================================== */

        var touchStartX = 0;
        var touchStartY = 0;

        var touchDragX = 0;

        var isSwiping = null;

        track.addEventListener(
            'touchstart',
            function (event) {
                if (
                    !event.touches.length
                ) {
                    return;
                }

                stopAnimation();

                dragStartTranslate =
                    currentTranslate;

                touchStartX =
                    event.touches[0]
                        .clientX;

                touchStartY =
                    event.touches[0]
                        .clientY;

                touchDragX = 0;

                isSwiping = null;
            },
            {
                passive: true
            }
        );

        track.addEventListener(
            'touchmove',
            function (event) {
                if (
                    !event.touches.length
                ) {
                    return;
                }

                var deltaX =
                    event.touches[0]
                        .clientX -
                    touchStartX;

                var deltaY =
                    event.touches[0]
                        .clientY -
                    touchStartY;

                /*
                 * Decide whether this is horizontal
                 * carousel movement or vertical page scroll.
                 */
                if (
                    isSwiping === null
                ) {
                    if (
                        Math.abs(deltaX) >
                        Math.abs(deltaY) &&
                        Math.abs(deltaX) >
                        5
                    ) {
                        isSwiping =
                            true;
                    } else if (
                        Math.abs(deltaY) >
                        Math.abs(deltaX) &&
                        Math.abs(deltaY) >
                        5
                    ) {
                        isSwiping =
                            false;
                    }
                }

                if (
                    isSwiping !== true
                ) {
                    return;
                }

                event.preventDefault();

                touchDragX =
                    deltaX;

                setTrackTranslate(
                    dragStartTranslate +
                    touchDragX,
                    false
                );
            },
            {
                passive: false
            }
        );

        track.addEventListener(
            'touchend',
            function () {
                if (
                    isSwiping !== true
                ) {
                    isSwiping =
                        null;

                    return;
                }

                isSwiping =
                    null;

                snapAfterDrag(
                    touchDragX
                );

                touchDragX = 0;
            }
        );

        track.addEventListener(
            'touchcancel',
            function () {
                if (
                    isSwiping === true
                ) {
                    snapAfterDrag(
                        touchDragX
                    );
                }

                isSwiping =
                    null;

                touchDragX = 0;
            }
        );

        /* =====================================================
           MOUSE DRAG
           ===================================================== */

        var mouseDown = false;

        var mouseStartX = 0;

        var mouseDragX = 0;

        var hasDragged = false;

        track.addEventListener(
            'mousedown',
            function (event) {
                if (
                    event.button !== 0
                ) {
                    return;
                }

                stopAnimation();

                mouseDown = true;

                hasDragged = false;

                mouseStartX =
                    event.pageX;

                mouseDragX = 0;

                dragStartTranslate =
                    currentTranslate;

                track.classList.add(
                    'is-dragging'
                );

                event.preventDefault();
            }
        );

        track.addEventListener(
            'mousemove',
            function (event) {
                if (!mouseDown) {
                    return;
                }

                event.preventDefault();

                mouseDragX =
                    event.pageX -
                    mouseStartX;

                if (
                    Math.abs(
                        mouseDragX
                    ) > 3
                ) {
                    hasDragged =
                        true;
                }

                setTrackTranslate(
                    dragStartTranslate +
                    mouseDragX,
                    false
                );
            }
        );

        function endMouseDrag() {
            if (!mouseDown) {
                return;
            }

            mouseDown = false;

            track.classList.remove(
                'is-dragging'
            );

            snapAfterDrag(
                mouseDragX
            );

            mouseDragX = 0;
        }

        track.addEventListener(
            'mouseup',
            endMouseDrag
        );

        track.addEventListener(
            'mouseleave',
            endMouseDrag
        );

        /*
         * Prevent accidental link click
         * after dragging.
         */
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

        /* =====================================================
           KEYBOARD
           ===================================================== */

        track.addEventListener(
            'keydown',
            function (event) {
                if (
                    event.key ===
                    'ArrowRight'
                ) {
                    event.preventDefault();

                    stopAnimation();

                    animating = true;

                    goTo(
                        internalIndex + 1,
                        true
                    );
                }

                if (
                    event.key ===
                    'ArrowLeft'
                ) {
                    event.preventDefault();

                    stopAnimation();

                    animating = true;

                    goTo(
                        internalIndex - 1,
                        true
                    );
                }
            }
        );

        /* =====================================================
           RESIZE
           ===================================================== */

        var resizeTimer;

        window.addEventListener(
            'resize',
            function () {
                window.clearTimeout(
                    resizeTimer
                );

                resizeTimer =
                    window.setTimeout(
                        function () {
                            section.classList.add(
                                'ghr-reviews--resetting'
                            );

                            /*
                             * Remove active temporarily so
                             * normal dimensions can be measured.
                             */
                            var allCards =
                                getAllCards();

                            for (
                                var i = 0;
                                i <
                                allCards.length;
                                i++
                            ) {
                                allCards[
                                    i
                                ].classList.remove(
                                    'ghr-review-active'
                                );
                            }

                            track.offsetWidth;

                            measure();

                            updateActiveCard();

                            track.offsetWidth;

                            positionTrack(
                                0,
                                false
                            );

                            updateProgress();

                            track.offsetWidth;

                            window.requestAnimationFrame(
                                function () {
                                    window.requestAnimationFrame(
                                        function () {
                                            section.classList.remove(
                                                'ghr-reviews--resetting'
                                            );
                                        }
                                    );
                                }
                            );
                        },
                        200
                    );
            }
        );

        /* =====================================================
           INITIALIZE
           ===================================================== */

        measure();

        goTo(
            clonesPerSide,
            false
        );
    }

    /* =========================================================
       INITIALIZE ALL
       ========================================================= */

    function initAll(scope) {
        var context =
            scope || document;

        var sections;

        if (
            context.matches &&
            context.matches(
                '[data-gh-reviews]'
            )
        ) {
            sections = [
                context
            ];
        } else {
            sections =
                context.querySelectorAll(
                    '[data-gh-reviews]'
                );
        }

        for (
            var index = 0;
            index <
            sections.length;
            index++
        ) {
            initCarousel(
                sections[index]
            );
        }
    }

    /* =========================================================
       PAGE LOAD
       ========================================================= */

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            function () {
                initAll(
                    document
                );
            }
        );
    } else {
        initAll(
            document
        );
    }

    /* =========================================================
       SHOPIFY THEME EDITOR
       ========================================================= */

    document.addEventListener(
        'shopify:section:load',
        function (event) {
            initAll(
                event.target
            );
        }
    );
})();