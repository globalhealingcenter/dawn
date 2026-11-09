/*
 * Meticulous Craftsmanship V2 Carousel
 *
 * Infinite carousel with:
 * - equal base gaps
 * - active card width + height scaling
 * - JS-controlled neighbour spacing
 * - touch/mouse dragging
 * - keyboard navigation
 * - infinite clone correction
 * - progress indicator
 */

(() => {
    'use strict';

    const SECTION_SELECTOR = '[data-ghmc-carousel]';
    const TRACK_SELECTOR = '[data-ghmc-track]';
    const CARD_SELECTOR = '[data-ghmc-card]';

    const ACTIVE_CLASS = 'ghmc-card-active';
    const DRAGGING_CLASS = 'is-dragging';
    const RESETTING_CLASS = 'ghmc-craftsmanship--resetting';

    /*
     * Desktop focused card scale.
     */
    const ACTIVE_SCALE = 1.14;

    /*
     * Match CSS mobile breakpoint.
     */
    const MOBILE_BREAKPOINT = 767;

    class GhmcCarousel {
        constructor(section) {
            this.section = section;

            this.track = section.querySelector(
                TRACK_SELECTOR
            );

            this.progress = section.querySelector(
                '[data-ghmc-progress]'
            );

            this.progressFill = section.querySelector(
                '[data-ghmc-progress-fill]'
            );

            if (!this.track) {
                return;
            }

            this.originalCards = Array.from(
                this.track.querySelectorAll(
                    CARD_SELECTOR
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

            this.cardWidth = 0;
            this.cardGap = 0;
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
             * Single card.
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
                    this.updateProgress();
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
                this.updateProgress();
            });
        }

        createClones() {
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

                clone.dataset.ghmcClone = 'true';

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

                clone.dataset.ghmcClone = 'true';

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
                (event) =>
                    this.handlePointerDown(
                        event
                    )
            );

            this.track.addEventListener(
                'transitionend',
                this.handleTransitionEnd
            );

            this.track.addEventListener(
                'dragstart',
                (event) => {
                    event.preventDefault();
                }
            );

            this.track.addEventListener(
                'keydown',
                (event) => {
                    if (
                        event.key ===
                        'ArrowLeft'
                    ) {
                        event.preventDefault();

                        this.goPrevious();
                    }

                    if (
                        event.key ===
                        'ArrowRight'
                    ) {
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
                        window.setTimeout(
                            () => {
                                this.updateMeasurements();

                                this.moveToIndex(
                                    this.currentIndex,
                                    false
                                );

                                this.updateActiveCard();
                            },
                            150
                        );
                }
            );
        }

        isMobile() {
            return (
                window.innerWidth <=
                MOBILE_BREAKPOINT
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

            this.cardGap =
                parseFloat(
                    trackStyles.columnGap ||
                    trackStyles.gap
                ) || 0;

            /*
             * offsetWidth ignores CSS transforms.
             *
             * That's exactly what we want:
             * always measure BASE card width,
             * never the active scaled width.
             */
            this.cardWidth =
                firstCard.offsetWidth;

            this.cardStep =
                this.cardWidth +
                this.cardGap;
        }

        getCenteredTranslate(index) {
            const card =
                this.cards[index];

            if (!card) {
                return 0;
            }

            /*
             * Since the active card is scaled from
             * center center, its visual center remains
             * exactly the same as its base center.
             *
             * Therefore we center using the BASE width.
             */
            const viewportWidth =
                window.innerWidth;

            return (
                viewportWidth / 2 -
                this.cardWidth / 2 -
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

        /*
         * Apply focus scaling and neighbour offsets.
         *
         * Normal CSS gap stays untouched.
         */
        updateCardTransforms() {
            /*
             * Mobile has no focus scaling.
             */
            if (this.isMobile()) {
                this.cards.forEach(
                    (card) => {
                        card.style.setProperty(
                            '--ghmc-scale',
                            '1'
                        );

                        card.style.setProperty(
                            '--ghmc-offset-x',
                            '0px'
                        );
                    }
                );

                return;
            }

            /*
             * Active card grows equally from its center.
             *
             * Example:
             * base width = 450
             * scale = 1.14
             *
             * visual width = 513
             * extra width = 63
             * extra each side = 31.5
             */
            const extraWidth =
                this.cardWidth *
                (ACTIVE_SCALE - 1);

            const sideExpansion =
                extraWidth / 2;

            this.cards.forEach(
                (card, index) => {
                    let scale = 1;
                    let offsetX = 0;

                    if (
                        index ===
                        this.currentIndex
                    ) {
                        scale =
                            ACTIVE_SCALE;
                    } else if (
                        index <
                        this.currentIndex
                    ) {
                        /*
                         * Everything left of
                         * active card moves left.
                         */
                        offsetX =
                            -sideExpansion;
                    } else {
                        /*
                         * Everything right of
                         * active card moves right.
                         */
                        offsetX =
                            sideExpansion;
                    }

                    card.style.setProperty(
                        '--ghmc-scale',
                        String(scale)
                    );

                    card.style.setProperty(
                        '--ghmc-offset-x',
                        `${offsetX}px`
                    );
                }
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

            /*
             * Change focus + neighbour positions
             * at the same time as track movement.
             */
            this.updateActiveCard();

            this.moveToIndex(
                this.currentIndex,
                true
            );

            this.updateProgress();
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

            this.updateActiveCard();

            this.moveToIndex(
                this.currentIndex,
                true
            );

            this.updateProgress();
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

            this.track.setPointerCapture?.(
                event.pointerId
            );

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

            this.track.releasePointerCapture?.(
                event.pointerId
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

            const dragDistance =
                this.dragCurrentX -
                this.dragStartX;

            const threshold =
                Math.min(
                    80,
                    this.cardStep * 0.2
                );

            if (
                Math.abs(
                    dragDistance
                ) >= threshold
            ) {
                if (
                    dragDistance < 0
                ) {
                    this.currentIndex += 1;
                } else {
                    this.currentIndex -= 1;
                }
            }

            this.isAnimating = true;

            /*
             * Update active card BEFORE moving track,
             * so focus/spacing transitions happen
             * together.
             */
            this.updateActiveCard();

            this.moveToIndex(
                this.currentIndex,
                true
            );

            this.updateProgress();
        }

        handleTransitionEnd(event) {
            if (
                event.target !==
                this.track ||
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

            /*
             * Update both:
             * - active state
             * - neighbour spacing
             *
             * before silently resetting track.
             */
            this.updateActiveCard();

            this.moveToIndex(
                this.currentIndex,
                false
            );

            void this.track.offsetWidth;

            requestAnimationFrame(
                () => {
                    this.section.classList.remove(
                        RESETTING_CLASS
                    );
                }
            );
        }

        getRealIndex() {
            if (
                this.originalCount <= 1
            ) {
                return 0;
            }

            return (
                (
                    this.currentIndex -
                    this.cloneCount
                ) %
                this.originalCount +
                this.originalCount
            ) % this.originalCount;
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

            /*
             * Scaling + equal visible gaps
             * are handled here.
             */
            this.updateCardTransforms();
        }

        updateProgress() {
            const currentPosition =
                this.getRealIndex() + 1;

            const percentage =
                (
                    currentPosition /
                    this.originalCount
                ) * 100;

            if (this.progressFill) {
                this.progressFill.style.width =
                    `${percentage}%`;
            }

            if (this.progress) {
                this.progress.setAttribute(
                    'aria-valuenow',
                    String(
                        currentPosition
                    )
                );
            }
        }
    }

    const initializeGhmcCarousels =
        (scope = document) => {
            scope
                .querySelectorAll(
                    SECTION_SELECTOR
                )
                .forEach(
                    (section) => {
                        if (
                            section.dataset
                                .ghmcInitialized ===
                            'true'
                        ) {
                            return;
                        }

                        section.dataset
                            .ghmcInitialized =
                            'true';

                        new GhmcCarousel(
                            section
                        );
                    }
                );
        };

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            () =>
                initializeGhmcCarousels()
        );
    } else {
        initializeGhmcCarousels();
    }

    document.addEventListener(
        'shopify:section:load',
        (event) => {
            initializeGhmcCarousels(
                event.target
            );
        }
    );
})();