import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@mui/material";

import { demoJobs } from "../../data/jobData";
import { normalizeJob } from "../../utils/dataFormat";

/* Calendar-day difference using the visitor's local date. */
function getPostedLabel(dateString) {
    if (!dateString) return "Date unavailable";
    const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);

    const postedDay = Date.UTC(year, month - 1, day);
    const now = new Date();

    const currentDay = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
    );

    const days = Math.floor((currentDay - postedDay) / (1000 * 60 * 60 * 24));

    if (!Number.isFinite(days)) return "Date unavailable";
    if (days < 0) return "Scheduled";
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";

    return `${days} days ago`;
}

export default function JobDetails({ user = null }) {
    const { id } = useParams();

    return <JobDetailsContent key={id} id={id} user={user} />;
}

function JobDetailsContent({ id, user }) {
    const titleRef = useRef(null);

    const source = demoJobs.find(
        (item) => item.id === id && item.status !== "Draft",
    );
    const job = source ? normalizeJob(source) : null;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
    }, []);

    const relatedJobs = job
        ? demoJobs
              .filter(
                  (item) => item.id !== job.id && item.status === "Published",
              )
              .map((item) => ({
                  ...item,
                  relevance:
                      (item.department === job.department ? 4 : 0) +
                      item.skills.filter((skill) => job.skills.includes(skill))
                          .length +
                      (item.location === job.location ? 1 : 0),
              }))
              .filter((item) => item.relevance > 0)
              .sort((first, second) => second.relevance - first.relevance)
              .slice(0, 3)
        : [];

    if (!job) {
        return (
            <section className="website-section website-shell">
                <div className="rms-jobs-empty jd-not-found">
                    <i className="fa-solid fa-briefcase" aria-hidden="true" />

                    <h1
                        ref={titleRef}
                        tabIndex={-1}
                        className="website-section-title"
                    >
                        Job not found.
                    </h1>

                    <p>
                        This position is unavailable or the link is incorrect.
                    </p>

                    <Button
                        component={Link}
                        to="/jobs"
                        className="website-button website-button-primary"
                    >
                        Explore Jobs
                    </Button>
                </div>
            </section>
        );
    }

    const summaryItems = [
        {
            label: "Location",
            value: job.location,
            icon: "fa-location-dot",
        },
        {
            label: "Experience",
            value: job.experience,
            icon: "fa-briefcase",
        },
        {
            label: "Salary",
            value: job.salary || "Not disclosed",
            icon: "fa-indian-rupee-sign",
        },
    ];

    return (
        <div className="jd-page">
            {/* WEBSITE BANNER */}
            <section
                className="about-hero"
                aria-labelledby="job-details-page-title"
            >
                <img
                    className="about-hero-image"
                    src="/images/about-banner.jpg"
                    alt=""
                    fetchPriority="high"
                />

                <div className="website-shell about-hero-inner">
                    <nav className="about-breadcrumb" aria-label="Breadcrumb">
                        <ol>
                            <li>
                                <Link to="/">Home</Link>
                            </li>

                            <li>
                                <Link to="/jobs">Jobs</Link>
                            </li>

                            <li aria-current="page">Job Details</li>
                        </ol>
                    </nav>

                    <div className="about-hero-content">
                        <p className="website-section-label">
                            YOUR NEXT CAREER MOVE
                        </p>

                        <h1
                            ref={titleRef}
                            id="job-details-page-title"
                            className="website-section-title"
                            tabIndex={-1}
                        >
                            Explore the role.
                            <span>Picture your next step.</span>
                        </h1>

                        <p className="website-section-description jd-banner-description">
                            Get to know the opportunity, understand the
                            requirements and take the next step in your career.
                        </p>
                    </div>
                </div>
            </section>

            {/* JOB CONTENT AND RELATED JOBS */}
            <section className="website-section">
                <div className="website-shell">
                    <div className="jd-container">
                        <div className="jd-layout">
                            <article
                                className="jd-content-card"
                                aria-labelledby="job-title"
                            >
                                {/* SUMMARY INSIDE ABOUT THE ROLE */}
                                <header className="jd-role-header">
                                    <p className="website-section-label">
                                        ABOUT THE ROLE
                                    </p>

                                    <div className="jd-summary-top">
                                        <div className="jd-summary-heading">
                                            <p className="jd-company">
                                                <i
                                                    className="fa-regular fa-building"
                                                    aria-hidden="true"
                                                />
                                                {job.company}
                                            </p>

                                            <h2 id="job-title">{job.title}</h2>

                                            <div className="jd-job-tags">
                                                <span>{job.type}</span>
                                                <span>{job.mode}</span>
                                            </div>
                                        </div>

                                        <div className="jd-summary-action">
                                            <Button
                                                component={Link}
                                                to={
                                                    job.status === "Published"
                                                        ? `/jobs/${encodeURIComponent(id)}/apply`
                                                        : undefined
                                                }
                                                disabled={
                                                    job.status !== "Published"
                                                }
                                                variant="contained"
                                                disableElevation
                                                className="website-button website-button-primary"
                                            >
                                                {job.status === "Published"
                                                    ? "Apply Now"
                                                    : "Applications closed"}
                                                <i
                                                    className="fa-solid fa-arrow-right"
                                                    aria-hidden="true"
                                                />
                                            </Button>

                                            <p>
                                                {user?.role === "user"
                                                    ? "Continue your application."
                                                    : "Preview the application form."}
                                            </p>
                                        </div>
                                    </div>

                                    <dl className="jd-summary-facts">
                                        {summaryItems.map((item) => (
                                            <div key={item.label}>
                                                <dt>
                                                    <i
                                                        className={`fa-solid ${item.icon}`}
                                                        aria-hidden="true"
                                                    />
                                                    {item.label}
                                                </dt>

                                                <dd>{item.value}</dd>
                                            </div>
                                        ))}
                                    </dl>

                                    <div className="jd-posting-info">
                                        <p>
                                            <i
                                                className="fa-solid fa-users"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                Openings:
                                                <strong>
                                                    {" "}
                                                    {job.openings ||
                                                        "Not specified"}
                                                </strong>
                                            </span>
                                        </p>

                                        <p>
                                            <i
                                                className="fa-regular fa-clock"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                Posted:{" "}
                                                <time dateTime={job.createdAt}>
                                                    {getPostedLabel(
                                                        job.createdAt,
                                                    )}
                                                </time>
                                            </span>
                                        </p>
                                    </div>
                                </header>

                                <section className="jd-content-section">
                                    <h3 className="jd-section-title">
                                        Job description
                                    </h3>

                                    <p className="website-section-description">
                                        {job.description}
                                    </p>
                                </section>

                                <section className="jd-content-section">
                                    <h3 className="jd-section-title">
                                        What we’re looking for
                                    </h3>

                                    <ul className="jd-point-list">
                                        {job.requirements.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </section>

                                <section className="jd-content-section">
                                    <h3 className="jd-section-title">
                                        Qualification
                                    </h3>

                                    <p className="website-section-description">
                                        {job.qualification}
                                    </p>
                                </section>

                                <section className="jd-content-section">
                                    <h3 className="jd-section-title">
                                        Relevant skills
                                    </h3>

                                    <ul
                                        className="jd-skills"
                                        aria-label="Relevant skills"
                                    >
                                        {job.skills.map((skill) => (
                                            <li key={skill}>{skill}</li>
                                        ))}
                                    </ul>
                                </section>
                            </article>

                            {/* RELATED JOBS */}
                            <aside
                                className="jd-sidebar"
                                aria-labelledby="related-jobs-title"
                            >
                                <section className="jd-related-panel">
                                    <div className="jd-related-heading">
                                        <p className="website-section-label">
                                            KEEP EXPLORING
                                        </p>

                                        <h2
                                            id="related-jobs-title"
                                            className="jd-section-title"
                                        >
                                            Related jobs
                                        </h2>

                                        <p>
                                            More roles you might want to
                                            explore.
                                        </p>
                                    </div>

                                    {relatedJobs.length > 0 ? (
                                        <div className="jd-related-list">
                                            {relatedJobs.map((relatedJob) => (
                                                <article
                                                    key={relatedJob.id}
                                                    className="jd-related-card"
                                                >
                                                    <p className="jd-related-company">
                                                        {relatedJob.company}
                                                    </p>

                                                    <h3>
                                                        <Link
                                                            to={`/jobs/${relatedJob.id}`}
                                                        >
                                                            {relatedJob.title}
                                                        </Link>
                                                    </h3>

                                                    <p className="jd-related-location">
                                                        <i
                                                            className="fa-solid fa-location-dot"
                                                            aria-hidden="true"
                                                        />
                                                        {relatedJob.location}
                                                    </p>

                                                    <dl className="jd-related-meta">
                                                        <div>
                                                            <dt>Experience</dt>
                                                            <dd>
                                                                {
                                                                    relatedJob.experience
                                                                }
                                                            </dd>
                                                        </div>

                                                        <div>
                                                            <dt>Salary</dt>
                                                            <dd>
                                                                {
                                                                    relatedJob.salary
                                                                }
                                                            </dd>
                                                        </div>
                                                    </dl>

                                                    <div className="jd-related-footer">
                                                        <span>
                                                            {relatedJob.mode}
                                                        </span>

                                                        <Link
                                                            to={`/jobs/${relatedJob.id}`}
                                                            aria-label={`View details for ${relatedJob.title}`}
                                                        >
                                                            View Details
                                                            <i
                                                                className="fa-solid fa-arrow-right"
                                                                aria-hidden="true"
                                                            />
                                                        </Link>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="jd-related-empty">
                                            No related positions available right
                                            now.
                                        </p>
                                    )}

                                    <Button
                                        component={Link}
                                        to="/jobs"
                                        className="website-button website-button-outline jd-browse-button"
                                    >
                                        Browse All Jobs
                                    </Button>
                                </section>
                            </aside>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
