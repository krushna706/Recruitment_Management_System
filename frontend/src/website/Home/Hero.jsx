import { useEffect, useState } from "react";

import JobSearchBar from "../../components/JobSearchBar";

const slides = [
    {
        id: 1,
        tag: "YOUR NEXT CHAPTER",
        title: "Your next career move",
        highlight: "starts here.",
        description:
            "Find opportunities that match your skills, experience and ambitions.",
        image: "/images/hero-1.avif",
    },
    {
        id: 2,
        tag: "FIND YOUR OPPORTUNITY",
        title: "Bring your talent.",
        highlight: "Build your future.",
        description:
            "Discover your next role in technology, business and design.",
        image: "/images/hero-2.avif",
    },
    {
        id: 3,
        tag: "LEARN. CONTRIBUTE. GROW.",
        title: "Build on your skills.",
        highlight: "Take the next step.",
        description:
            "Starting out or moving forward? Find an opportunity that fits you.",
        image: "/images/hero-3.avif",
    },
    {
        id: 4,
        tag: "MORE POSSIBILITIES AHEAD",
        title: "A fresh direction.",
        highlight: "A new beginning.",
        description:
            "Explore on-site, remote and hybrid roles across India.",
        image: "/images/hero-4.avif",
    },
];

function Hero() {
    const [activeIndex, setActiveIndex] = useState(0);

    const [isPaused, setIsPaused] = useState(() =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    useEffect(() => {
        if (isPaused) return;

        const timer = window.setTimeout(() => {
            setActiveIndex((previous) => (previous + 1) % slides.length);
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [activeIndex, isPaused]);

    useEffect(() => {
        const preference = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

        function handleChange(event) {
            if (event.matches) {
                setIsPaused(true);
            }
        }

        preference.addEventListener("change", handleChange);

        return () => {
            preference.removeEventListener("change", handleChange);
        };
    }, []);

    useEffect(() => {
        const nextImage = new Image();
        nextImage.src = slides[(activeIndex + 1) % slides.length].image;
    }, [activeIndex]);

    function changeSlide(index) {
        setActiveIndex((index + slides.length) % slides.length);
    }

    const slide = slides[activeIndex];

    return (
        <section
            className="rms-hero"
            aria-label="Career opportunities"
            aria-roledescription="carousel"
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
                </div>

                <div className="rms-hero-search-wrap">
                    <JobSearchBar />
                </div>

                <p className="rms-hero-search-note">
                    <i
                        className="fa-solid fa-location-dot"
                        aria-hidden="true"
                    />
                    Discover opportunities across India
                </p>
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
                        onClick={() =>
                            setIsPaused((previous) => !previous)
                        }
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

export default Hero;