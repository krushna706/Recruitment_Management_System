import usePageSEO from "../hooks/usePageSEO";
import { seoPages } from "../config/seoConfig";

import { useState } from "react";
import { Link } from "react-router-dom";

const purposes = [
    {
        id: "mission",
        number: "01",
        icon: "fa-bullseye",
        label: "OUR MISSION",
        title: "Connect people with meaningful opportunities.",
        points: [
            "Connect motivated people with suitable roles.",
            "Provide clear and useful job information.",
            "Keep the application process straightforward.",
            "Encourage respectful and transparent communication.",
            "Support learning, contribution and professional growth.",
        ],
        note: "Purpose in every step.",
    },
    {
        id: "vision",
        number: "02",
        icon: "fa-compass",
        label: "OUR VISION",
        title: "Build a future where people can grow.",
        points: [
            "Build an organization where people feel valued.",
            "Welcome diverse perspectives and fresh ideas.",
            "Create opportunities for long-term development.",
            "Strengthen collaboration and shared responsibility.",
            "Grow through continuous learning and improvement.",
        ],
        note: "Possibilities for tomorrow.",
    },
];

const values = [
    {
        number: "01",
        icon: "fa-handshake",
        title: "Integrity",
        description:
            "We believe in honest communication, responsible decisions and treating every person with respect.",
    },
    {
        number: "02",
        icon: "fa-users",
        title: "People First",
        description:
            "We value different perspectives and the unique strengths that people bring to our organization.",
    },
    {
        number: "03",
        icon: "fa-lightbulb",
        title: "Continuous Learning",
        description:
            "We encourage curiosity, fresh ideas and a willingness to learn from each other.",
    },
    {
        number: "04",
        icon: "fa-arrow-trend-up",
        title: "Meaningful Growth",
        description:
            "We support progress that helps people contribute, develop and take on new challenges.",
    },
];

const organizationPrinciples = [
    {
        icon: "fa-comments",
        title: "Clear communication",
        description:
            "We aim to share useful role information and clear expectations so candidates can make informed decisions.",
    },
    {
        icon: "fa-people-group",
        title: "Thoughtful collaboration",
        description:
            "We bring different strengths together through teamwork, shared responsibility and mutual respect.",
    },
    {
        icon: "fa-seedling",
        title: "Continuous improvement",
        description:
            "We look for practical ways to improve how we work and the recruitment experience we provide.",
    },
];

function About() {
    usePageSEO(seoPages.about);
    
    const [selectedPurpose, setSelectedPurpose] = useState("vision");
    const [hoveredPurpose, setHoveredPurpose] = useState(null);

    const [selectedValue, setSelectedValue] = useState(null);
    const [hoveredValue, setHoveredValue] = useState(null);

    const activePurpose = hoveredPurpose ?? selectedPurpose;
    const activeValue = hoveredValue ?? selectedValue;

    function handleCardPointerEnter(event, onHover) {
        if (event.pointerType === "mouse") {
            onHover();
        }
    }

    return (
        <div className="about-page">
            {/* Page banner */}
            <section className="about-hero" aria-labelledby="about-page-title">
                <img
                    className="about-hero-image"
                    src="/images/about-banner.jpg"
                    alt=""
                    fetchPriority="high"
                    decoding="async"
                />

                <div className="website-shell about-hero-inner">
                    <nav className="about-breadcrumb" aria-label="Breadcrumb">
                        <ol>
                            <li>
                                <Link to="/">Home</Link>
                            </li>

                            <li aria-current="page">About Us</li>
                        </ol>
                    </nav>

                    <div className="about-hero-content">
                        <p className="website-section-label">PEOPLE. PURPOSE. POSSIBILITIES.</p>

                        <h1 id="about-page-title" className="website-section-title">
                            Behind every opportunity,
                            <span> there are people.</span>
                        </h1>
                    </div>
                </div>
            </section>

            {/* Company introduction */}
            <section className="website-section" aria-labelledby="about-introduction-title">
                <div className="website-shell about-story-grid">
                    <div className="about-story-visual">
                        <figure className="about-story-photo">
                            <img
                                src="/images/about-team.avif"
                                alt="Colleagues collaborating in an office"
                                width="900"
                                height="1000"
                                loading="lazy"
                                decoding="async"
                            />

                            <figcaption>
                                <span className="about-icon">
                                    <i className="fa-solid fa-users" aria-hidden="true" />
                                </span>

                                <div>
                                    <strong>Better together.</strong>

                                    <p className="website-section-description">
                                        Different perspectives. Shared purpose.
                                    </p>
                                </div>
                            </figcaption>
                        </figure>
                    </div>

                    <div className="about-story-content">
                        <p className="website-section-label">WHO WE ARE</p>

                        <h2 id="about-introduction-title" className="website-section-title">
                            Bringing people together.
                            <span> Building possibilities.</span>
                        </h2>

                        <div className="about-copy">
                            <p className="website-section-description">
                                We believe an organization moves forward when its people have the
                                opportunity to contribute, collaborate and grow.
                            </p>

                            <p className="website-section-description">
                                Our approach is built on clear communication, shared responsibility
                                and a commitment to improvement. We value people who bring ideas,
                                take initiative and learn from those around them.
                            </p>

                            <p className="website-section-description">
                                Our recruitment website introduces candidates to our organization
                                and available roles, helping them understand opportunities before
                                taking the next step.
                            </p>
                        </div>

                        <ul className="about-story-highlights">
                            <li>
                                <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                People-focused thinking
                            </li>

                            <li>
                                <i className="fa-solid fa-circle-check" aria-hidden="true" />A
                                collaborative approach
                            </li>
                        </ul>

                        <Link to="/contact" className="website-button website-button-primary">
                            Get in Touch
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Mission and vision */}
            <section
                className="website-section about-purpose"
                aria-labelledby="about-purpose-title"
            >
                <div className="website-shell">
                    <div className="about-section-heading">
                        <p className="website-section-label">WHAT DRIVES US</p>

                        <h2 id="about-purpose-title" className="website-section-title">
                            A clear purpose.
                            <span> A shared direction.</span>
                        </h2>

                        <p className="website-section-description">
                            Our mission guides what we do today. Our vision shapes what we work
                            towards.
                        </p>
                    </div>

                    <div className="about-purpose-grid">
                        {purposes.map((purpose) => (
                            <article
                                key={purpose.id}
                                className={`about-purpose-card ${
                                    activePurpose === purpose.id ? "is-active" : ""
                                }`}
                                onPointerEnter={(event) =>
                                    handleCardPointerEnter(event, () =>
                                        setHoveredPurpose(purpose.id)
                                    )
                                }
                                onPointerLeave={() => setHoveredPurpose(null)}
                                onPointerCancel={() => setHoveredPurpose(null)}
                            >
                                <div className="about-purpose-card-top">
                                    <span className="about-icon">
                                        <i
                                            className={`fa-solid ${purpose.icon}`}
                                            aria-hidden="true"
                                        />
                                    </span>

                                    <span className="about-purpose-number" aria-hidden="true">
                                        {purpose.number}
                                    </span>
                                </div>

                                <p className="website-section-label">{purpose.label}</p>

                                <h3 className="about-card-title">
                                    <button
                                        type="button"
                                        className="about-card-trigger"
                                        aria-pressed={selectedPurpose === purpose.id}
                                        onClick={() => setSelectedPurpose(purpose.id)}
                                    >
                                        {purpose.title}
                                    </button>
                                </h3>

                                <ul className="website-section-description about-purpose-points">
                                    {purpose.points.map((point) => (
                                        <li key={point}>{point}</li>
                                    ))}
                                </ul>

                                <div className="about-purpose-note">
                                    <span aria-hidden="true" />
                                    {purpose.note}
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Core values */}
            <section className="website-section" aria-labelledby="about-values-title">
                <div className="website-shell">
                    <div className="about-section-heading">
                        <p className="website-section-label">OUR CORE VALUES</p>

                        <h2 id="about-values-title" className="website-section-title">
                            Principles that shape
                            <span> how we work.</span>
                        </h2>

                        <p className="website-section-description">
                            The beliefs behind our decisions, relationships and everyday progress.
                        </p>
                    </div>

                    <div className="about-values-grid">
                        {values.map((value) => (
                            <article
                                key={value.number}
                                className={`about-value-card ${
                                    activeValue === value.number ? "is-active" : ""
                                }`}
                                onPointerEnter={(event) =>
                                    handleCardPointerEnter(event, () =>
                                        setHoveredValue(value.number)
                                    )
                                }
                                onPointerLeave={() => setHoveredValue(null)}
                                onPointerCancel={() => setHoveredValue(null)}
                            >
                                <div className="about-value-card-top">
                                    <span className="about-icon">
                                        <i
                                            className={`fa-solid ${value.icon}`}
                                            aria-hidden="true"
                                        />
                                    </span>

                                    <span className="about-value-number" aria-hidden="true">
                                        {value.number}
                                    </span>
                                </div>

                                <h3 className="about-card-title">
                                    <button
                                        type="button"
                                        className="about-card-trigger"
                                        aria-pressed={selectedValue === value.number}
                                        onClick={() =>
                                            setSelectedValue((current) =>
                                                current === value.number ? null : value.number
                                            )
                                        }
                                    >
                                        {value.title}
                                    </button>
                                </h3>

                                <p className="website-section-description">{value.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Organization information */}
            <section
                className="website-section about-organization"
                aria-labelledby="about-organization-title"
            >
                <div className="website-shell about-organization-grid">
                    <div>
                        <p className="website-section-label">OUR ORGANIZATION</p>

                        <h2 id="about-organization-title" className="website-section-title">
                            Built on collaboration.
                            <span> Guided by purpose.</span>
                        </h2>

                        <div className="about-copy">
                            <p className="website-section-description">
                                Our organization brings together people with different skills and
                                perspectives, united by a commitment to meaningful work.
                            </p>

                            <p className="website-section-description">
                                This recruitment platform provides a place to explore our vacancies,
                                submit applications and follow application progress through a
                                candidate account.
                            </p>
                        </div>

                        <Link
                            to="/careers"
                            className="website-button website-button-outline about-organization-link"
                        >
                            Explore Our Careers
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                    </div>

                    <ul className="about-principles">
                        {organizationPrinciples.map((principle) => (
                            <li key={principle.title}>
                                <span className="about-icon">
                                    <i
                                        className={`fa-solid ${principle.icon}`}
                                        aria-hidden="true"
                                    />
                                </span>

                                <div>
                                    <h3 className="about-card-title">{principle.title}</h3>

                                    <p className="website-section-description">
                                        {principle.description}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </div>
    );
}

export default About;
