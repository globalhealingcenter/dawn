/**
 * Ingredients V2 Mobile Carousel
 *
 * Based on the Meticulous Craftsmanship V2 carousel.
 *
 * Features:
 * - Mobile only
 * - Centered active ingredient
 * - Partial previous/next ingredient visible
 * - Pointer/touch dragging
 * - Infinite looping
 * - Snap to card
 * - Keyboard arrow support
 * - NO progress bar
 */

(() => {
    'use strict';

    const SECTION_SELECTOR = '[data-ghiv2-carousel]';
    const TRACK_SELECTOR = '[data-ghiv2-track]';
    const VIEWPORT_SELECTOR = '[data-ghiv2-viewport]';
    const CARD_SELECTOR = '[data-ghiv2-card]';

    const ACTIVE_CLASS = 'ghiv2-card-active';
    const DRAGGING_CLASS = 'is-dragging';
    const RESETTING_CLASS = 'ghiv2--resetting';

    const MOBILE_BREAKPOINT = 899;


    class GhIngredientsCarousel {

        constructor(section) {
            this.section = section;
            this.track = section.querySelector(TRACK_SELECTOR);
            this.viewport = section.querySelector(VIEWPORT_SELECTOR);

            if (!this.track || !this.viewport) {
                return;
            }

            this.originalCards = Array.from(
                this.track.querySelectorAll(CARD_SELECTOR)
            );

            this.originalCount = this.originalCards.length;

            if (!this.originalCount) {
                return;
            }

            this.cards = [];
            this.cloneCount = 0;

            this.currentIndex = 0;
            this.cardStep = 0;

            this.currentTranslate = 0;
            this.startTranslate = 0;

            this.dragStartX = 0;
            this.dragCurrentX = 0;

            this.isDragging = false;
            this.isAnimating = false;

            this.resizeTimer = null;

            this.handlePointerMove =
                this.handlePointerMove.bind(this);

            this.handlePointerUp =
                this.handlePointerUp.bind(this);

            this.handleTransitionEnd =
                this.handleTransitionEnd.bind(this);

            this.initialize();
        }


        initialize() {

            /*
             * Ingredients V2 becomes a carousel only on mobile.
             */
            if (window.innerWidth > MOBILE_BREAKPOINT) {
                return;
            }


            /*
             * Single ingredient:
             * no cloning or dragging required,
             * but still center the ingredient.
             */
            if (this.originalCount === 1) {

                this.cards = this.originalCards;
                this.currentIndex = 0;

                requestAnimationFrame(() => {

                    this.updateMeasurements();

                    this.moveToIndex(
                        this.currentIndex,
                        false
                    );

                    this.updateActiveCard();

                });

                return;
            }


            this.createClones();

            this.bindEvents();


            requestAnimationFrame(() => {

                this.updateMeasurements();

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
             * Add copies before/after the real cards
             * to create the infinite carousel.
             */

            this.cloneCount = Math.min(
                this.originalCount,
                Math.max(
                    3,
                    Math.ceil(
                        window.innerWidth / 250
                    )
                )
            );


            const beforeCards =
                this.originalCards.slice(
                    -this.cloneCount
                );

            const afterCards =
                this.originalCards.slice(
                    0,
                    this.cloneCount
                );


            const beforeFragment =
                document.createDocumentFragment();

            const afterFragment =
                document.createDocumentFragment();


            beforeCards.forEach((card) => {

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

            });


            afterCards.forEach((card) => {

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

            });


            this.track.prepend(
                beforeFragment
            );

            this.track.append(
                afterFragment
            );


            this.cards = Array.from(
                this.track.querySelectorAll(
                    CARD_SELECTOR
                )
            );

        }


        bindEvents() {

            this.track.addEventListener(
                'pointerdown',
                (event) => {
                    this.handlePointerDown(event);
                }
            );


            this.track.addEventListener(
                'transitionend',
                this.handleTransitionEnd
            );


            /*
             * Prevent browser image dragging.
             */
            this.track.addEventListener(
                'dragstart',
                (event) => {
                    event.preventDefault();
                }
            );


            /*
             * Desktop keyboard accessibility.
             * Also useful with external keyboards
             * on tablets/mobile.
             */
            this.track.addEventListener(
                'keydown',
                (event) => {

                    if (event.key === 'ArrowLeft') {

                        event.preventDefault();

                        this.goPrevious();

                    }


                    if (event.key === 'ArrowRight') {

                        event.preventDefault();

                        this.goNext();

                    }

                }
            );


            window.addEventListener(
                'resize',
                () => {

                    window.clearTimeout(
                        this.resizeTimer
                    );


                    this.resizeTimer =
                        window.setTimeout(() => {

                            if (
                                window.innerWidth >
                                MOBILE_BREAKPOINT
                            ) {
                                return;
                            }

                            this.updateMeasurements();

                            this.moveToIndex(
                                this.currentIndex,
                                false
                            );

                        }, 150);

                }
            );

        }


        updateMeasurements() {

            const firstCard =
                this.cards[0];

            if (!firstCard) {
                return;
            }


            const trackStyles =
                window.getComputedStyle(
                    this.track
                );


            const gap =
                parseFloat(
                    trackStyles.columnGap ||
                    trackStyles.gap
                ) || 0;


            this.cardStep =
                firstCard
                    .getBoundingClientRect()
                    .width +
                gap;

        }


        getCenteredTranslate(index) {

            const card =
                this.cards[index];

            if (!card) {
                return 0;
            }


            const viewportWidth =
                this.viewport
                    .getBoundingClientRect()
                    .width;


            const cardWidth =
                card
                    .getBoundingClientRect()
                    .width;


            return (
                viewportWidth / 2 -
                cardWidth / 2 -
                index * this.cardStep
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
                this.getCenteredTranslate(
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


        handlePointerDown(event) {

            if (
                this.originalCount <= 1 ||
                (
                    typeof event.button !==
                    'undefined' &&
                    event.button !== 0
                )
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

                this.track.setPointerCapture(
                    event.pointerId
                );

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

        }


        handlePointerMove(event) {

            if (!this.isDragging) {
                return;
            }


            this.dragCurrentX =
                event.clientX;


            const dragDistance =
                this.dragCurrentX -
                this.dragStartX;


            this.setTranslate(
                this.startTranslate +
                dragDistance,
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

                    this.track
                        .releasePointerCapture(
                            event.pointerId
                        );

                } catch (error) {
                    /*
                     * Pointer capture may already
                     * have been released.
                     */
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


            const dragDistance =
                this.dragCurrentX -
                this.dragStartX;


            const threshold =
                Math.min(
                    80,
                    this.cardStep * 0.2
                );


            if (
                Math.abs(dragDistance) >=
                threshold
            ) {

                if (dragDistance < 0) {

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

            const firstOriginalIndex =
                this.cloneCount;


            const lastOriginalIndex =
                this.cloneCount +
                this.originalCount -
                1;


            let correctedIndex =
                this.currentIndex;


            if (
                this.currentIndex <
                firstOriginalIndex
            ) {

                correctedIndex =
                    this.currentIndex +
                    this.originalCount;

            }


            if (
                this.currentIndex >
                lastOriginalIndex
            ) {

                correctedIndex =
                    this.currentIndex -
                    this.originalCount;

            }


            if (
                correctedIndex ===
                this.currentIndex
            ) {
                return;
            }


            this.section.classList.add(
                RESETTING_CLASS
            );


            this.currentIndex =
                correctedIndex;


            this.moveToIndex(
                this.currentIndex,
                false
            );


            this.updateActiveCard();


            /*
             * Force browser to apply the
             * instant reset before transition
             * is enabled again.
             */
            void this.track.offsetWidth;


            requestAnimationFrame(() => {

                this.section.classList.remove(
                    RESETTING_CLASS
                );

            });

        }


        updateActiveCard() {

            this.cards.forEach(
                (card, index) => {

                    const isActive =
                        index ===
                        this.currentIndex;


                    card.classList.toggle(
                        ACTIVE_CLASS,
                        isActive
                    );


                    if (isActive) {

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

    }


    const initializeIngredientsCarousels =
        (scope = document) => {

            /*
             * Desktop keeps the CSS grid.
             */
            if (
                window.innerWidth >
                MOBILE_BREAKPOINT
            ) {
                return;
            }


            scope
                .querySelectorAll(
                    SECTION_SELECTOR
                )
                .forEach((section) => {

                    if (
                        section.dataset
                            .ghiv2Initialized ===
                        'true'
                    ) {
                        return;
                    }


                    section.dataset
                        .ghiv2Initialized =
                        'true';


                    new GhIngredientsCarousel(
                        section
                    );

                });

        };


    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            () => {
                initializeIngredientsCarousels();
            }
        );

    } else {

        initializeIngredientsCarousels();

    }


    /*
     * Shopify Theme Editor support.
     */
    document.addEventListener(
        'shopify:section:load',
        (event) => {

            initializeIngredientsCarousels(
                event.target
            );

        }
    );

})();