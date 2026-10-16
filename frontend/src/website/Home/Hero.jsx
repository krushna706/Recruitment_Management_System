import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const slides = [
    {
        id: 1,
        tag: "YOUR NEXT CHAPTER",
        title: "Your next career move",
        highlight: "starts here.",
        description:
            "Discover opportunities across India and find a role that fits your skills, interests and ambitions.",
        image: "/images/hero-1.avif",
        primaryLabel: "Explore Jobs",
        secondaryLabel: "About Us",
        secondaryPath: "/about",
    },
    {
        id: 2,
        tag: "FIND YOUR OPPORTUNITY",
        title: "Bring your talent.",
        highlight: "Build your future.",
        description:
            "Explore roles in technology, business and design. Find an opportunity where your contribution matters.",
        image: "/images/hero-2.avif",
        primaryLabel: "Browse Openings",
        secondaryLabel: "Explore Careers",
        secondaryPath: "/careers",
    },
    {
        id: 3,
        tag: "LEARN. CONTRIBUTE. GROW.",
        title: "Build on your skills.",
        highlight: "Take the next step.",
        description:
            "Starting your career or ready for a new challenge? Discover opportunities that help you move forward.",
        image: "/images/hero-3.avif",
        primaryLabel: "Find Your Role",
        secondaryLabel: "Learn About Us",
        secondaryPath: "/about",
    },
    {
        id: 4,
        tag: "MORE POSSIBILITIES AHEAD",
        title: "A fresh direction.",
        highlight: "A new beginning.",
        description:
            "Explore on-site, remote and hybrid roles and find a way of working that matches your career plans.",
        image: "/images/hero-4.avif",
        primaryLabel: "View Open Positions",
        secondaryLabel: "Explore Careers",
        secondaryPath: "/careers",
    },
];

export default function Hero() {
    const [activeIndex, setActiveIndex] = useState(0);

    const [isPaused, setIsPaused] = useState(() =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    // Automatically change slides every five seconds.
    useEffect(() => {
        if (isPaused) return;

        const timer = window.setTimeout(() => {
            setActiveIndex((previous) => (previous + 1) % slides.length);
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [activeIndex, isPaused]);

    // Stop automatic rotation if reduced motion is enabled.
    useEffect(() => {
        const preference = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

        const handleChange = (event) => {
            if (event.matches) {
                setIsPaused(true);
            }
        };

        preference.addEventListener("change", handleChange);

        return () => {
            preference.removeEventListener("change", handleChange);
        };
    }, []);

    // Preload the next slide image.
    useEffect(() => {
        const nextImage = new Image();
        nextImage.src = slides[(activeIndex + 1) % slides.length].image;
    }, [activeIndex]);

    const changeSlide = (index) => {
        setActiveIndex((index + slides.length) % slides.length);
    };

    const handleFocus = (event) => {
        // Pause for keyboard navigation, not ordinary mouse hover.
        if (event.target.matches(":focus-visible")) {
            setIsPaused(true);
        }
    };

    const slide = slides[activeIndex];

    return (
        <section
            className="rms-hero"
            aria-label="Career opportunities"
            aria-roledescription="carousel"
            onFocusCapture={handleFocus}
        >
            <div className="rms-hero-images" aria-hidden="true">
                {slides.map((item, index) => (
                    <div
                        key={item.id}
                        className={`rms-hero-image ${
                            index === activeIndex ? "is-active" : ""
                        }`}
                        style={{
                            backgroundImage: `url("${item.image}")`,
                        }}
                    />
                ))}
            </div>

            <div className="rms-hero-overlay" aria-hidden="true" />

            <div className="website-shell rms-hero-body">
                <div
                    className="rms-hero-content"
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${activeIndex + 1} of ${slides.length}`}
                    aria-live={isPaused ? "polite" : "off"}
                >
                    <p className="rms-hero-eyebrow">
                        <span aria-hidden="true" />
                        {slide.tag}
                    </p>

                    <h1 className="rms-hero-title">
                        {slide.title}
                        <span>{slide.highlight}</span>
                    </h1>

                    <p className="rms-hero-description">
                        {slide.description}
                    </p>

                    <div className="rms-hero-actions">
                        <Link
                            to="/jobs"
                            className="website-button website-button-primary"
                        >
                            {slide.primaryLabel}
                            <i
                                className="fa-solid fa-arrow-right"
                                aria-hidden="true"
                            />
                        </Link>

                        <Link
                            to={slide.secondaryPath}
                            className="website-button website-button-light-outline"
                        >
                            {slide.secondaryLabel}
                        </Link>
                    </div>

                    <p className="rms-hero-location">
                        <i
                            className="fa-solid fa-location-dot"
                            aria-hidden="true"
                        />
                        Opportunities across India
                    </p>
                </div>
            </div>

            <div className="website-shell rms-hero-controls">
                <div className="rms-hero-pagination">
                    <span className="rms-hero-count" aria-hidden="true">
                        <strong>
                            {String(activeIndex + 1).padStart(2, "0")}
                        </strong>
                        / {String(slides.length).padStart(2, "0")}
                    </span>

                    <div className="rms-hero-dots">
                        {slides.map((item, index) => (
                            <button
                                key={item.id}
                                type="button"
                                className={`rms-hero-dot ${
                                    index === activeIndex ? "is-active" : ""
                                }`}
                                aria-label={`Show slide ${index + 1}`}
                                aria-current={
                                    index === activeIndex ? "true" : undefined
                                }
                                onClick={() => changeSlide(index)}
                            />
                        ))}
                    </div>
                </div>

                <div className="rms-hero-buttons">
                    <button
                        type="button"
                        aria-label={
                            isPaused ? "Play slideshow" : "Pause slideshow"
                        }
                        onClick={() => setIsPaused((previous) => !previous)}
                    >
                        <i
                            className={`fa-solid ${
                                isPaused ? "fa-play" : "fa-pause"
                            }`}
                            aria-hidden="true"
                        />
                    </button>

                    <button
                        type="button"
                        aria-label="Previous slide"
                        onClick={() => changeSlide(activeIndex - 1)}
                    >
                        <i
                            className="fa-solid fa-arrow-left"
                            aria-hidden="true"
                        />
                    </button>

                    <button
                        type="button"
                        aria-label="Next slide"
                        onClick={() => changeSlide(activeIndex + 1)}
                    >
                        <i
                            className="fa-solid fa-arrow-right"
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </div>
        </section>
    );
}