import { Link } from "react-router-dom";

const features = [
    {
        icon: "fa-compass",
        title: "Discover your next role",
        description: "Explore opportunities aligned with your career interests.",
    },
    {
        icon: "fa-file-circle-check",
        title: "Apply with confidence",
        description: "Understand the role and requirements before applying.",
    },
    {
        icon: "fa-arrow-trend-up",
        title: "Move your career forward",
        description: "Find opportunities to learn, contribute and grow.",
    },
];

export default function AboutSection() {
    return (
        <section className="website-section rms-about" aria-labelledby="rms-about-title">
            <div className="website-shell rms-about-grid">
                <div className="rms-about-visual">
                    <div className="rms-about-image-box">
                        <img
                            src="/images/about-team.avif"
                            alt="Team members sharing ideas in a modern office"
                            width="900"
                            height="1000"
                            loading="lazy"
                            decoding="async"
                        />
                    </div>

                    <div className="rms-about-caption">
                        <span className="rms-about-caption-icon">
                            <i className="fa-solid fa-users" aria-hidden="true" />
                        </span>

                        <div>
                            <strong>People first. Possibilities next.</strong>
                            <p>Your next chapter starts with an opportunity.</p>
                        </div>
                    </div>
                </div>

                <div className="rms-about-content">
                    <p className="website-section-label">WHO WE ARE</p>

                    <h2 id="rms-about-title" className="website-section-title">
                        Connecting talent.
                        <span> Creating possibilities.</span>
                    </h2>

                    <p className="rms-about-intro">
                        The right opportunity can change the direction of a career. We help
                        candidates explore their options and take their next step with confidence.
                    </p>

                    <p className="website-section-description">
                        Clear job information, a straightforward application process and a focus on
                        people make the journey towards your next role simpler.
                    </p>

                    <ul className="rms-about-features">
                        {features.map((feature) => (
                            <li key={feature.title} className="rms-about-feature">
                                <span className="rms-about-feature-icon">
                                    <i className={`fa-solid ${feature.icon}`} aria-hidden="true" />
                                </span>

                                <div>
                                    <h3>{feature.title}</h3>
                                    <p>{feature.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <Link to="/about" className="website-button website-button-primary">
                        More About Us
                        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
