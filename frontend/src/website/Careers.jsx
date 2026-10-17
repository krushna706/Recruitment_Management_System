import { Button } from "@mui/material";
import { Link } from "react-router-dom";

const APPLICATION_EMAIL = "krushna@gmail.cus";

// Demo positions only.
// Replace with backend data during API integration.
const careerPositions = [
    {
        id: "demo-frontend",
        title: "Frontend Developer",
        department: "Engineering",
        location: "Bhubaneswar, Odisha",
        experience: "0–2 years",
        employmentType: "Full-time",
        description:
            "Build responsive interfaces with React, translate designs into reusable components and improve the user experience.",
        isActive: true,
    },
    {
        id: "demo-backend",
        title: "Backend Developer",
        department: "Engineering",
        location: "Bhubaneswar, Odisha",
        experience: "1–3 years",
        employmentType: "Full-time",
        description:
            "Develop REST APIs with Node.js and Express, work with MongoDB and contribute to reliable application services.",
        isActive: true,
    },
    {
        id: "demo-designer",
        title: "UI/UX Designer",
        department: "Design",
        location: "Bhubaneswar, Odisha",
        experience: "0–2 years",
        employmentType: "Full-time",
        description:
            "Create clear user journeys, wireframes and interface designs while collaborating with the development team.",
        isActive: true,
    },
];

const cultureItems = [
    {
        icon: "fa-people-group",
        title: "Work together",
        description:
            "Share ideas, learn from different perspectives and contribute to a common goal.",
    },
    {
        icon: "fa-lightbulb",
        title: "Bring your ideas",
        description:
            "Ask questions, explore practical solutions and take ownership of your contribution.",
    },
    {
        icon: "fa-arrow-trend-up",
        title: "Keep learning",
        description:
            "Build your skills through meaningful work, feedback and everyday collaboration.",
    },
];

function getApplicationLink(position) {
    const subject = `Application for ${position.title} (${position.id})`;

    const body = [
        "Hello Hiring Team,",
        "",
        `I would like to apply for the ${position.title} position.`,
        `Position reference: ${position.id}`,
        "",
        "Full name: ",
        "Phone number: ",
        "Current location: ",
        "Relevant experience: ",
        "Portfolio / LinkedIn: ",
        "",
        "Please find my resume attached.",
        "",
        "Thank you.",
    ].join("\n");

    return `mailto:${APPLICATION_EMAIL}?subject=${encodeURIComponent(
        subject
    )}&body=${encodeURIComponent(body)}`;
}

export default function Careers() {
    const openPositions = careerPositions.filter(
        (position) => position.isActive === true
    );

    return (
        <div className="careers-page">
            {/* BANNER */}
            <section
                className="about-hero"
                aria-labelledby="careers-title"
            >
                <img
                    className="about-hero-image"
                    src="/images/about-banner.jpg"
                    alt=""
                    fetchPriority="high"
                />

                <div className="website-shell about-hero-inner">
                    <nav
                        className="about-breadcrumb"
                        aria-label="Breadcrumb"
                    >
                        <ol>
                            <li>
                                <Link to="/">Home</Link>
                            </li>

                            <li aria-current="page">Careers</li>
                        </ol>
                    </nav>

                    <div className="about-hero-content">
                        <p className="website-section-label">
                            GROW WITH US
                        </p>

                        <h1
                            id="careers-title"
                            className="website-section-title"
                        >
                            Bring your talent.
                            <span>Build what comes next.</span>
                        </h1>

                        <p className="website-section-description careers-banner-description">
                            Explore our approach to work, discover
                            opportunities and take your next step with us.
                        </p>
                    </div>
                </div>
            </section>

            {/* WORK CULTURE */}
            <section
                className="website-section"
                aria-labelledby="careers-culture-title"
            >
                <div className="website-shell">
                    <div className="careers-section-heading">
                        <p className="website-section-label">
                            LIFE AT OUR ORGANIZATION
                        </p>

                        <h2
                            id="careers-culture-title"
                            className="website-section-title"
                        >
                            Different perspectives.
                            <span> Shared possibilities.</span>
                        </h2>

                        <p className="website-section-description">
                            Our approach to work starts with people:
                            listening to ideas, taking responsibility
                            and making progress together.
                        </p>
                    </div>

                    <div className="careers-culture-grid">
                        {cultureItems.map((item, index) => (
                            <article
                                key={item.title}
                                className="careers-culture-card"
                            >
                                <div className="careers-card-top">
                                    <span
                                        className="careers-icon"
                                        aria-hidden="true"
                                    >
                                        <i
                                            className={`fa-solid ${item.icon}`}
                                        />
                                    </span>

                                    <span
                                        className="careers-card-number"
                                        aria-hidden="true"
                                    >
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                </div>

                                <h3>{item.title}</h3>

                                <p className="website-section-description">
                                    {item.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* OPEN POSITIONS */}
            <section
                id="career-positions"
                className="website-section careers-positions"
                aria-labelledby="careers-positions-title"
            >
                <div className="website-shell">
                    <div className="careers-section-heading">
                        <p className="website-section-label">
                            OPEN POSITIONS
                        </p>

                        <h2
                            id="careers-positions-title"
                            className="website-section-title"
                        >
                            Find your next
                            <span> opportunity.</span>
                        </h2>

                        <p className="website-section-description">
                            Explore opportunities that match your skills,
                            interests and career goals.
                        </p>
                    </div>

                    {openPositions.length > 0 ? (
                        <>

                            <div className="careers-position-grid">
                                {openPositions.map((position) => (
                                    <article
                                        key={position.id}
                                        className="rms-job-card"
                                    >
                                        <div className="rms-job-heading">
                                            <p className="rms-job-department">
                                                {position.department}
                                            </p>

                                            <h3 className="rms-job-title">
                                                {position.title}
                                            </h3>
                                        </div>

                                        <div className="rms-job-tags">
                                            <span>
                                                {position.employmentType}
                                            </span>
                                        </div>

                                        <p className="careers-position-description">
                                            {position.description}
                                        </p>

                                        <dl className="rms-job-meta">
                                            <div>
                                                <dt>
                                                    <i
                                                        className="fa-solid fa-briefcase"
                                                        aria-hidden="true"
                                                    />
                                                    Experience
                                                </dt>

                                                <dd>
                                                    {position.experience}
                                                </dd>
                                            </div>
                                        </dl>

                                        <div className="rms-job-footer">
                                            <p className="rms-job-location">
                                                <i
                                                    className="fa-solid fa-location-dot"
                                                    aria-hidden="true"
                                                />

                                                <span>
                                                    {position.location}
                                                </span>
                                            </p>

                                            <Button
                                                component="a"
                                                href={getApplicationLink(
                                                    position
                                                )}
                                                className="website-button website-button-primary"
                                                aria-label={`Apply now for ${position.title} by email`}
                                            >
                                                Apply Now
                                            </Button>
                                        </div>
                                    </article>
                                ))}
                            </div>

                        </>
                    ) : (
                        <div className="careers-empty">
                            <span
                                className="careers-empty-icon"
                                aria-hidden="true"
                            >
                                <i className="fa-solid fa-briefcase" />
                            </span>

                            <h3>No open positions right now.</h3>

                            <p className="website-section-description">
                                We don’t have any openings at the moment.
                                Please check back for future opportunities.
                                Thank you for your interest in joining us.
                            </p>

                            <div className="careers-empty-actions">
                                <Button
                                    component={Link}
                                    to="/about"
                                    className="website-button website-button-primary"
                                >
                                    Get to Know Us
                                </Button>

                                <Button
                                    component={Link}
                                    to="/contact"
                                    className="website-button website-button-outline"
                                >
                                    Contact Us
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}