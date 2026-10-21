import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Button } from "@mui/material";

import api from "../../services/api";
import { normalizeJob } from "../../utils/dataFormat";

// ================== POSTED DATE ==================
function getPostedLabel(dateString) {
    if (!dateString) return "Date unavailable";

    const posted = new Date(dateString);

    if (Number.isNaN(posted.getTime())) {
        return "Date unavailable";
    }

    const now = new Date();

    const postedDay = Date.UTC(
        posted.getFullYear(),
        posted.getMonth(),
        posted.getDate()
    );

    const currentDay = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    const days = Math.floor((currentDay - postedDay) / 86400000);

    if (days < 0) return "Recently posted";
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";

    return `${days} days ago`;
}

// ================== RELATED JOB RANKING ==================
// Rank the fetched suggestions by department, skills and location.
function getRelatedJobs(jobs, currentJob) {
    const currentSkills = new Set(
        currentJob.skills.map((skill) => skill.toLowerCase())
    );

    return jobs
        .map(normalizeJob)
        .filter(
            (job) =>
                job.id !== currentJob.id &&
                job.status === "Published"
        )
        .map((job) => {
            const sameDepartment =
                Boolean(currentJob.department) &&
                job.department?.toLowerCase() ===
                    currentJob.department.toLowerCase();

            const sameLocation =
                Boolean(currentJob.location) &&
                job.location?.toLowerCase() ===
                    currentJob.location.toLowerCase();

            const matchingSkills = job.skills.filter((skill) =>
                currentSkills.has(skill.toLowerCase())
            ).length;

            return {
                ...job,
                relevance:
                    (sameDepartment ? 4 : 0) +
                    matchingSkills +
                    (sameLocation ? 1 : 0),
            };
        })
        .filter((job) => job.relevance > 0)
        .sort((first, second) => second.relevance - first.relevance)
        .slice(0, 3);
}

// ================== JOB DETAILS PAGE ==================
function JobDetails({ user = null }) {
    const { id } = useParams();

    // Reset page state when navigating between different jobs.
    return <JobDetailsContent key={id} id={id} user={user} />;
}

function JobDetailsContent({ id, user }) {
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notFound, setNotFound] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const [relatedJobs, setRelatedJobs] = useState([]);
    const [relatedLoading, setRelatedLoading] = useState(false);
    const [relatedError, setRelatedError] = useState("");
    const [relatedRefreshKey, setRelatedRefreshKey] = useState(0);

    // ================== PAGE POSITION ==================
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
    }, []);

    // ================== FETCH JOB DETAILS ==================
    useEffect(() => {
        const controller = new AbortController();

        async function fetchJob() {
            setLoading(true);
            setError("");
            setNotFound(false);
            setJob(null);

            if (!/^[a-fA-F0-9]{24}$/.test(id || "")) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            try {
                const { data } = await api.get(
                    `/jobs/${encodeURIComponent(id)}`,
                    { signal: controller.signal }
                );

                if (controller.signal.aborted) return;

                setJob(normalizeJob(data.job));
            } catch (requestError) {
                if (controller.signal.aborted) return;

                if (requestError.response?.status === 404) {
                    setNotFound(true);
                } else {
                    const message = requestError.response?.data?.message;

                    setError(
                        typeof message === "string" && message.trim()
                            ? message
                            : "Job details could not be loaded. Please try again."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchJob();

        return () => controller.abort();
    }, [id, refreshKey]);

    // ================== FETCH RELATED JOB SUGGESTIONS ==================
    useEffect(() => {
        if (!job) return;

        const controller = new AbortController();

        async function fetchRelatedJobs() {
            setRelatedLoading(true);
            setRelatedError("");
            setRelatedJobs([]);

            try {
                // Use the existing public endpoint for a bounded candidate list.
                const params = {
                    page: 1,
                    limit: 20,
                };

                if (job.department) {
                    params.search = job.department;
                }

                const { data } = await api.get("/jobs", {
                    params,
                    signal: controller.signal,
                });

                if (controller.signal.aborted) return;

                setRelatedJobs(getRelatedJobs(data.jobs, job));
            } catch {
                if (controller.signal.aborted) return;

                setRelatedError("Related jobs could not be loaded.");
            } finally {
                if (!controller.signal.aborted) {
                    setRelatedLoading(false);
                }
            }
        }

        fetchRelatedJobs();

        return () => controller.abort();
    }, [job, relatedRefreshKey]);

    // ================== LOADING STATE ==================
    if (loading) {
        return (
            <section
                className="website-section website-shell"
                aria-busy="true"
            >
                <div className="rms-jobs-empty jd-not-found" role="status">
                    <i
                        className="fa-solid fa-spinner fa-spin"
                        aria-hidden="true"
                    />

                    <h1 className="website-section-title">
                        Loading job details...
                    </h1>

                    <p>Please wait while we fetch this opportunity.</p>
                </div>
            </section>
        );
    }

    // ================== REQUEST ERROR ==================
    if (error) {
        return (
            <section className="website-section website-shell">
                <div className="rms-jobs-empty jd-not-found">
                    <h1 className="website-section-title">
                        Unable to load this job.
                    </h1>

                    <Alert severity="error">{error}</Alert>

                    <Button
                        type="button"
                        onClick={() => setRefreshKey((previous) => previous + 1)}
                        className="website-button website-button-primary"
                    >
                        Try Again
                    </Button>

                    <Link to="/jobs">Back to Jobs</Link>
                </div>
            </section>
        );
    }

    // ================== UNAVAILABLE JOB ==================
    if (notFound || !job) {
        return (
            <section className="website-section website-shell">
                <div className="rms-jobs-empty jd-not-found">
                    <i className="fa-solid fa-briefcase" aria-hidden="true" />

                    <h1 className="website-section-title">Job not found.</h1>

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

    // ================== JOB DISPLAY VALUES ==================
    const isOpen = job.status === "Published";
    const restrictedAccount = Boolean(user && user.role !== "user");
    const canContinue = isOpen && !restrictedAccount;
    const postedAt = job.publishedAt || job.createdAt;

    const descriptionParagraphs = String(job.description || "")
        .split(/\r?\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

    const summaryItems = [
        {
            label: "Location",
            value: job.location || "Not specified",
            icon: "fa-location-dot",
        },
        {
            label: "Experience",
            value: job.experience || "Not specified",
            icon: "fa-briefcase",
        },
        {
            label: "Salary",
            value: job.salary || "Not disclosed",
            icon: "fa-indian-rupee-sign",
        },
    ];

    const applyLabel = !isOpen
        ? "Applications closed"
        : restrictedAccount
          ? "User account required"
          : "Apply Now";

    const applyMessage = !isOpen
        ? "This position is no longer accepting applications."
        : restrictedAccount
          ? "Applications are available to user accounts."
          : user
            ? "Continue to the application form."
            : "Login is required to apply for this job.";

    return (
        <div className="jd-page">
            {/* ================== WEBSITE BANNER ================== */}
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
                            <li><Link to="/">Home</Link></li>
                            <li><Link to="/jobs">Jobs</Link></li>
                            <li aria-current="page">Job Details</li>
                        </ol>
                    </nav>

                    <div className="about-hero-content">
                        <p className="website-section-label">
                            YOUR NEXT CAREER MOVE
                        </p>

                        <h1
                            id="job-details-page-title"
                            className="website-section-title"
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

            {/* ================== JOB CONTENT ================== */}
            <section className="website-section">
                <div className="website-shell">
                    <div className="jd-container">
                        <div className="jd-layout">
                            <article
                                className="jd-content-card"
                                aria-labelledby="job-title"
                            >
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
                                                {job.type && <span>{job.type}</span>}
                                                {job.mode && <span>{job.mode}</span>}
                                                {!isOpen && <span>Closed</span>}
                                            </div>
                                        </div>

                                        <div className="jd-summary-action">
                                            <Button
                                                component={canContinue ? Link : "button"}
                                                to={
                                                    canContinue
                                                        ? `/jobs/${encodeURIComponent(job.id)}/apply`
                                                        : undefined
                                                }
                                                disabled={!canContinue}
                                                variant="contained"
                                                disableElevation
                                                className="website-button website-button-primary"
                                            >
                                                {applyLabel}

                                                {canContinue && (
                                                    <i
                                                        className="fa-solid fa-arrow-right"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </Button>

                                            <p>{applyMessage}</p>
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
                                                Openings:{" "}
                                                <strong>
                                                    {job.openings ?? "Not specified"}
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
                                                <time dateTime={postedAt || undefined}>
                                                    {getPostedLabel(postedAt)}
                                                </time>
                                            </span>
                                        </p>
                                    </div>
                                </header>

                                <section className="jd-content-section">
                                    <h3 className="jd-section-title">
                                        Job description
                                    </h3>

                                    {descriptionParagraphs.length ? (
                                        descriptionParagraphs.map((paragraph, index) => (
                                            <p
                                                key={index}
                                                className="website-section-description"
                                            >
                                                {paragraph}
                                            </p>
                                        ))
                                    ) : (
                                        <p className="website-section-description">
                                            No description provided.
                                        </p>
                                    )}
                                </section>

                                {job.requirements.length > 0 && (
                                    <section className="jd-content-section">
                                        <h3 className="jd-section-title">
                                            What we’re looking for
                                        </h3>

                                        <ul className="jd-point-list">
                                            {job.requirements.map((item, index) => (
                                                <li key={`${index}-${item}`}>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}

                                {job.qualification && (
                                    <section className="jd-content-section">
                                        <h3 className="jd-section-title">
                                            Qualification
                                        </h3>

                                        <p className="website-section-description">
                                            {job.qualification}
                                        </p>
                                    </section>
                                )}

                                {job.skills.length > 0 && (
                                    <section className="jd-content-section">
                                        <h3 className="jd-section-title">
                                            Relevant skills
                                        </h3>

                                        <ul
                                            className="jd-skills"
                                            aria-label="Relevant skills"
                                        >
                                            {job.skills.map((skill, index) => (
                                                <li key={`${index}-${skill}`}>
                                                    {skill}
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                            </article>

                            {/* ================== RELATED JOBS ================== */}
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

                                        <p>More roles you might want to explore.</p>
                                    </div>

                                    {relatedLoading ? (
                                        <p className="jd-related-empty" role="status">
                                            Loading related jobs...
                                        </p>
                                    ) : relatedError ? (
                                        <Alert
                                            severity="warning"
                                            action={
                                                <Button
                                                    type="button"
                                                    color="inherit"
                                                    size="small"
                                                    onClick={() =>
                                                        setRelatedRefreshKey(
                                                            (previous) => previous + 1
                                                        )
                                                    }
                                                >
                                                    Retry
                                                </Button>
                                            }
                                        >
                                            {relatedError}
                                        </Alert>
                                    ) : relatedJobs.length > 0 ? (
                                        <div className="jd-related-list">
                                            {relatedJobs.map((relatedJob) => {
                                                const path = `/jobs/${encodeURIComponent(relatedJob.id)}`;

                                                return (
                                                    <article
                                                        key={relatedJob.id}
                                                        className="jd-related-card"
                                                    >
                                                        <p className="jd-related-company">
                                                            {relatedJob.company}
                                                        </p>

                                                        <h3>
                                                            <Link to={path}>
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
                                                                    {relatedJob.experience ||
                                                                        "Not specified"}
                                                                </dd>
                                                            </div>

                                                            <div>
                                                                <dt>Salary</dt>
                                                                <dd>
                                                                    {relatedJob.salary ||
                                                                        "Not disclosed"}
                                                                </dd>
                                                            </div>
                                                        </dl>

                                                        <div className="jd-related-footer">
                                                            <span>{relatedJob.mode}</span>

                                                            <Link
                                                                to={path}
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
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="jd-related-empty">
                                            No related positions available right now.
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

export default JobDetails;