/**
 * Ingredients V2 Carousel
 *
 * Desktop:
 * - Normal CSS layouts
 *
 * Mobile:
 * - Infinite carousel
 * - Centered active card
 * - Drag/swipe
 * - Keyboard arrows
 * - No progress bar
 */

(() => {
    'use strict';

    const SECTION_SELECTOR = '[data-ghiv2-carousel]';
    const TRACK_SELECTOR = '[data-ghiv2-track]';
    const CARD_SELECTOR = '[data-ghiv2-card]';

    const MOBILE_QUERY = '(max-width: 899px)';

    const ACTIVE_CLASS = 'ghiv2-card-active';
    const DRAGGING_CLASS = 'is-dragging';


    class IngredientsCarousel {

        constructor(section) {
            this.section = section;

            this.track =
                section.querySelector(
                    TRACK_SELECTOR
                );

            if (!this.track) {
                return;
            }

            this.originalCards =
                Array.from(
                    this.track.querySelectorAll(
                        `${CARD_SELECTOR}:not([data-ghiv2-clone])`
                    )
                );

            this.originalCount =
                this.originalCards.length;

            if (!this.originalCount) {
                return;
            }


            this.cards = [];

            this.cloneCount = 0;

            this.currentIndex = 0;

            this.currentTranslate = 0;
            this.startTranslate = 0;

            this.dragStartX = 0;
            this.dragCurrentX = 0;

            this.isDragging = false;
            this.isAnimating = false;
            this.isInitialized = false;

            this.mediaQuery =
                window.matchMedia(
                    MOBILE_QUERY
                );


            this.handlePointerMove =
                this.handlePointerMove.bind(
                    this
                );

            this.handlePointerUp =
                this.handlePointerUp.bind(
                    this
                );

            this.handleTransitionEnd =
                this.handleTransitionEnd.bind(
                    this
                );

            this.handleBreakpointChange =
                this.handleBreakpointChange.bind(
                    this
                );


            this.bindBreakpoint();

            this.handleBreakpointChange();
        }


        bindBreakpoint() {

            if (
                this.mediaQuery.addEventListener
            ) {

                this.mediaQuery.addEventListener(
                    'change',
                    this.handleBreakpointChange
                );

            } else {

                this.mediaQuery.addListener(
                    this.handleBreakpointChange
                );

            }

        }


        handleBreakpointChange() {

            if (this.mediaQuery.matches) {

                this.initializeMobile();

            } else {

                this.destroyMobile();

            }

        }


        initializeMobile() {

            if (this.isInitialized) {
                return;
            }


            this.isInitialized = true;


            /*
             * Single ingredient does not need
             * infinite clones or dragging.
             */
            if (this.originalCount === 1) {

                this.cards =
                    this.originalCards;

                this.currentIndex = 0;


                requestAnimationFrame(() => {

                    this.moveToIndex(
                        0,
                        false
                    );

                    this.updateActiveCard();

                });


                return;
            }


            this.createClones();

            this.bindCarouselEvents();


            requestAnimationFrame(() => {

                /*
                 * First actual card starts
                 * in the center.
                 */
                this.currentIndex =
                    this.cloneCount;


                this.moveToIndex(
                    this.currentIndex,
                    false
                );


                this.updateActiveCard();

            });

        }


        createClones() {

            /*
             * There are max 4 ingredients,
             * so cloning all of them is safe
             * and keeps the infinite loop
             * completely filled.
             */
            this.cloneCount =
                this.originalCount;


            const beforeFragment =
                document.createDocumentFragment();

            const afterFragment =
                document.createDocumentFragment();


            this.originalCards.forEach(
                (card) => {

                    const clone =
                        card.cloneNode(true);

                    clone.dataset.ghiv2Clone =
                        'true';

                    clone.setAttribute(
                        'aria-hidden',
                        'true'
                    );

                    beforeFragment.appendChild(
                        clone
                    );

                }
            );


            this.originalCards.forEach(
                (card) => {

                    const clone =
                        card.cloneNode(true);

                    clone.dataset.ghiv2Clone =
                        'true';

                    clone.setAttribute(
                        'aria-hidden',
                        'true'
                    );

                    afterFragment.appendChild(
                        clone
                    );

                }
            );


            this.track.prepend(
                beforeFragment
            );

            this.track.append(
                afterFragment
            );


            this.cards =
                Array.from(
                    this.track.querySelectorAll(
                        CARD_SELECTOR
                    )
                );

        }


        bindCarouselEvents() {

            this.track.addEventListener(
                'pointerdown',
                this.handlePointerDown
            );


            this.track.addEventListener(
                'transitionend',
                this.handleTransitionEnd
            );


            this.track.addEventListener(
                'dragstart',
                this.preventDrag
            );


            this.track.addEventListener(
                'keydown',
                this.handleKeyDown
            );

        }


        unbindCarouselEvents() {

            this.track.removeEventListener(
                'pointerdown',
                this.handlePointerDown
            );


            this.track.removeEventListener(
                'transitionend',
                this.handleTransitionEnd
            );


            this.track.removeEventListener(
                'dragstart',
                this.preventDrag
            );


            this.track.removeEventListener(
                'keydown',
                this.handleKeyDown
            );


            window.removeEventListener(
                'pointermove',
                this.handlePointerMove
            );


            window.removeEventListener(
                'pointerup',
                this.handlePointerUp
            );


            window.removeEventListener(
                'pointercancel',
                this.handlePointerUp
            );

        }


        preventDrag = (event) => {
            event.preventDefault();
        };


        handleKeyDown = (event) => {

            if (event.key === 'ArrowLeft') {

                event.preventDefault();

                this.goPrevious();

            }


            if (event.key === 'ArrowRight') {

                event.preventDefault();

                this.goNext();

            }

        };


        handlePointerDown = (event) => {

            if (
                !this.isInitialized ||
                this.originalCount <= 1
            ) {
                return;
            }


            if (
                typeof event.button !==
                'undefined' &&
                event.button !== 0
            ) {
                return;
            }


            this.isDragging = true;
            this.isAnimating = false;


            this.dragStartX =
                event.clientX;

            this.dragCurrentX =
                event.clientX;


            this.startTranslate =
                this.currentTranslate;


            this.track.classList.add(
                DRAGGING_CLASS
            );


            this.track.style.transition =
                'none';


            if (
                this.track.setPointerCapture
            ) {

                try {

                    this.track.setPointerCapture(
                        event.pointerId
                    );

                } catch (error) {
                    // Ignore unsupported capture.
                }

            }


            window.addEventListener(
                'pointermove',
                this.handlePointerMove
            );


            window.addEventListener(
                'pointerup',
                this.handlePointerUp
            );


            window.addEventListener(
                'pointercancel',
                this.handlePointerUp
            );

        };


        handlePointerMove(event) {

            if (!this.isDragging) {
                return;
            }


            this.dragCurrentX =
                event.clientX;


            const distance =
                this.dragCurrentX -
                this.dragStartX;


            this.setTranslate(
                this.startTranslate +
                distance,
                false
            );

        }


        handlePointerUp(event) {

            if (!this.isDragging) {
                return;
            }


            this.isDragging = false;


            this.track.classList.remove(
                DRAGGING_CLASS
            );


            if (
                this.track.releasePointerCapture
            ) {

                try {

                    this.track.releasePointerCapture(
                        event.pointerId
                    );

                } catch (error) {
                    // Pointer may already be released.
                }

            }


            window.removeEventListener(
                'pointermove',
                this.handlePointerMove
            );


            window.removeEventListener(
                'pointerup',
                this.handlePointerUp
            );


            window.removeEventListener(
                'pointercancel',
                this.handlePointerUp
            );


            const distance =
                this.dragCurrentX -
                this.dragStartX;


            const activeCard =
                this.cards[
                this.currentIndex
                ];


            const cardWidth =
                activeCard
                    ? activeCard
                        .getBoundingClientRect()
                        .width
                    : 250;


            const threshold =
                Math.min(
                    80,
                    cardWidth * 0.2
                );


            if (
                Math.abs(distance) >=
                threshold
            ) {

                if (distance < 0) {

                    this.currentIndex += 1;

                } else {

                    this.currentIndex -= 1;

                }

            }


            this.isAnimating = true;


            this.moveToIndex(
                this.currentIndex,
                true
            );


            this.updateActiveCard();

        }


        getTranslateForIndex(index) {

            const card =
                this.cards[index];

            if (!card) {
                return 0;
            }


            const viewportWidth =
                window.innerWidth;


            const cardWidth =
                card
                    .getBoundingClientRect()
                    .width;


            /*
             * offsetLeft is more robust than
             * index * cardStep because it uses
             * the browser's real calculated
             * card position.
             */
            return (
                viewportWidth / 2 -
                (
                    card.offsetLeft +
                    cardWidth / 2
                )
            );

        }


        setTranslate(
            value,
            animate = true
        ) {

            this.currentTranslate =
                value;


            this.track.style.transition =
                animate
                    ? 'transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1)'
                    : 'none';


            this.track.style.transform =
                `translate3d(${value}px, 0, 0)`;

        }


        moveToIndex(
            index,
            animate = true
        ) {

            this.setTranslate(
                this.getTranslateForIndex(
                    index
                ),
                animate
            );

        }


        goNext() {

            if (
                this.isAnimating ||
                this.isDragging ||
                this.originalCount <= 1
            ) {
                return;
            }


            this.currentIndex += 1;

            this.isAnimating = true;


            this.moveToIndex(
                this.currentIndex,
                true
            );


            this.updateActiveCard();

        }


        goPrevious() {

            if (
                this.isAnimating ||
                this.isDragging ||
                this.originalCount <= 1
            ) {
                return;
            }


            this.currentIndex -= 1;

            this.isAnimating = true;


            this.moveToIndex(
                this.currentIndex,
                true
            );


            this.updateActiveCard();

        }


        handleTransitionEnd(event) {

            if (
                event.propertyName !==
                'transform' ||
                !this.isAnimating
            ) {
                return;
            }


            this.isAnimating = false;


            this.correctInfinitePosition();

        }


        correctInfinitePosition() {

            const firstOriginal =
                this.cloneCount;


            const lastOriginal =
                this.cloneCount +
                this.originalCount -
                1;


            let correctedIndex =
                this.currentIndex;


            if (
                this.currentIndex <
                firstOriginal
            ) {

                correctedIndex +=
                    this.originalCount;

            } else if (
                this.currentIndex >
                lastOriginal
            ) {

                correctedIndex -=
                    this.originalCount;

            }


            if (
                correctedIndex ===
                this.currentIndex
            ) {
                return;
            }


            this.currentIndex =
                correctedIndex;


            this.moveToIndex(
                this.currentIndex,
                false
            );


            this.updateActiveCard();

        }


        updateActiveCard() {

            this.cards.forEach(
                (card, index) => {

                    const active =
                        index ===
                        this.currentIndex;


                    card.classList.toggle(
                        ACTIVE_CLASS,
                        active
                    );


                    if (active) {

                        card.setAttribute(
                            'aria-current',
                            'true'
                        );

                    } else {

                        card.removeAttribute(
                            'aria-current'
                        );

                    }

                }
            );

        }


        destroyMobile() {

            if (!this.isInitialized) {

                /*
                 * Still make sure desktop
                 * has no old inline transforms.
                 */
                this.resetDesktopStyles();

                return;
            }


            this.unbindCarouselEvents();


            /*
             * Remove all cloned cards.
             */
            this.track
                .querySelectorAll(
                    '[data-ghiv2-clone="true"]'
                )
                .forEach((clone) => {

                    clone.remove();

                });


            this.cards =
                this.originalCards;


            this.originalCards.forEach(
                (card) => {

                    card.classList.remove(
                        ACTIVE_CLASS
                    );

                    card.removeAttribute(
                        'aria-current'
                    );

                }
            );


            this.resetDesktopStyles();


            this.cloneCount = 0;
            this.currentIndex = 0;

            this.currentTranslate = 0;

            this.isDragging = false;
            this.isAnimating = false;

            this.isInitialized = false;

        }


        resetDesktopStyles() {

            this.track.classList.remove(
                DRAGGING_CLASS
            );


            this.track.style.removeProperty(
                'transform'
            );


            this.track.style.removeProperty(
                'transition'
            );

        }

    }


    const instances =
        new WeakMap();


    function initialize(
        scope = document
    ) {

        scope
            .querySelectorAll(
                SECTION_SELECTOR
            )
            .forEach((section) => {

                if (
                    instances.has(section)
                ) {
                    return;
                }


                const instance =
                    new IngredientsCarousel(
                        section
                    );


                instances.set(
                    section,
                    instance
                );

            });

    }


    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            () => {

                initialize();

            }
        );

    } else {

        initialize();

    }


    document.addEventListener(
        'shopify:section:load',
        (event) => {

            initialize(
                event.target
            );

        }
    );

})();