import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button } from "@mui/material";

import api from "../../services/api";

// ================== POSTING DATE ==================
function getPostingInfo(value) {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const postedDate = new Date(value);

    if (Number.isNaN(postedDate.getTime())) {
        return null;
    }

    const now = new Date();

    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    const postedDay = Date.UTC(
        postedDate.getFullYear(),
        postedDate.getMonth(),
        postedDate.getDate()
    );

    const days = Math.floor((today - postedDay) / 86400000);

    const label =
        days < 0
            ? "Recently posted"
            : days === 0
              ? "Today"
              : days === 1
                ? "1 day ago"
                : `${days} days ago`;

    return {
        label,
        dateTime: postedDate.toISOString(),
        fullDate: postedDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
        }),
    };
}

// ================== FEATURED JOBS ==================
function FeaturedJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    // ================== FETCH FEATURED JOBS ==================
    useEffect(() => {
        const controller = new AbortController();

        async function fetchFeaturedJobs() {
            setLoading(true);
            setError("");

            try {
                const { data } = await api.get("/jobs", {
                    params: {
                        featured: true,
                        page: 1,
                        limit: 5,
                    },
                    signal: controller.signal,
                });

                if (controller.signal.aborted) return;

                setJobs(
                    data.jobs.map((job) => ({
                        ...job,
                        id: String(job.id || job._id),
                    }))
                );
            } catch (requestError) {
                if (controller.signal.aborted) return;

                const message = requestError.response?.data?.message;

                setJobs([]);
                setError(
                    typeof message === "string" && message.trim()
                        ? message
                        : "Featured jobs could not be loaded. Please try again."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchFeaturedJobs();

        return () => controller.abort();
    }, [refreshKey]);

    return (
        <section
            className="website-section rms-featured"
            aria-labelledby="rms-featured-title"
            aria-busy={loading}
        >
            <div className="website-shell">
                {/* ================== SECTION HEADER ================== */}
                <div className="rms-featured-header">
                    <div>
                        <p className="website-section-label">FIND YOUR NEXT OPPORTUNITY</p>

                        <h2 id="rms-featured-title" className="website-section-title">
                            Explore featured
                            <span> job openings.</span>
                        </h2>

                        <p className="website-section-description">
                            Discover roles that match your experience and take the next step in your
                            career.
                        </p>
                    </div>

                    <Link to="/jobs" className="website-button website-button-outline">
                        View All Jobs
                        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </Link>
                </div>

                {/* ================== LOADING AND ERROR STATES ================== */}
                {loading ? (
                    <div className="rms-jobs-empty" role="status">
                        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />

                        <h3>Loading featured jobs...</h3>
                        <p>Please wait while we fetch the latest openings.</p>
                    </div>
                ) : error ? (
                    <Alert
                        severity="error"
                        action={
                            <Button
                                type="button"
                                color="inherit"
                                size="small"
                                onClick={() => setRefreshKey((previous) => previous + 1)}
                            >
                                Retry
                            </Button>
                        }
                    >
                        {error}
                    </Alert>
                ) : jobs.length > 0 ? (
                    <div className="jobs-list-grid">
                        {jobs.map((job) => {
                            const jobUrl = `/jobs/${encodeURIComponent(job.id)}`;

                            const posting = getPostingInfo(job.publishedAt || job.createdAt);

                            return (
                                <article key={job.id} className="rms-job-card jobs-position-card">
                                    {/* ================== COMPANY AND DATE ================== */}
                                    <div className="jobs-card-topline">
                                        <p className="rms-job-company">
                                            {job.company || "Company not specified"}
                                        </p>

                                        {posting && (
                                            <time
                                                className="jobs-posted"
                                                dateTime={posting.dateTime}
                                                title={`Posting date: ${posting.fullDate}`}
                                                aria-label={`Posting date: ${posting.fullDate}`}
                                            >
                                                <i
                                                    className="fa-regular fa-clock"
                                                    aria-hidden="true"
                                                />

                                                {posting.label}
                                            </time>
                                        )}
                                    </div>

                                    {/* ================== JOB TITLE ================== */}
                                    <div className="jobs-title-row">
                                        <h3 className="rms-job-title">
                                            <Link to={jobUrl} title={job.title}>
                                                {job.title}
                                            </Link>
                                        </h3>
                                    </div>

                                    {/* ================== TYPE AND WORK MODE ================== */}
                                    <div className="rms-job-tags">
                                        <span>{job.type || "Not specified"}</span>
                                        <span>{job.mode || "Not specified"}</span>
                                    </div>

                                    {/* ================== SHORT DESCRIPTION ================== */}
                                    <p className="jobs-card-description">
                                        {job.shortDescription ||
                                            "View the job details for more information."}
                                    </p>

                                    {/* ================== EXPERIENCE AND SALARY ================== */}
                                    <dl className="rms-job-meta jobs-card-meta">
                                        <div>
                                            <dt>
                                                <i
                                                    className="fa-solid fa-briefcase"
                                                    aria-hidden="true"
                                                />
                                                Experience
                                            </dt>

                                            <dd>{job.experience || "Not specified"}</dd>
                                        </div>

                                        <div>
                                            <dt>
                                                <i
                                                    className="fa-solid fa-indian-rupee-sign"
                                                    aria-hidden="true"
                                                />
                                                Salary
                                            </dt>

                                            <dd>{job.salary || "Not disclosed"}</dd>
                                        </div>
                                    </dl>

                                    {/* ================== LOCATION AND DETAILS ================== */}
                                    <div className="rms-job-footer">
                                        <p className="rms-job-location" title={job.location}>
                                            <i
                                                className="fa-solid fa-location-dot"
                                                aria-hidden="true"
                                            />

                                            <span>{job.location || "Not specified"}</span>
                                        </p>

                                        <Link
                                            to={jobUrl}
                                            className="website-button website-button-outline jobs-details-button"
                                            aria-label={`View details for ${job.title}`}
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
                    <div className="rms-jobs-empty">
                        <i className="fa-solid fa-briefcase" aria-hidden="true" />

                        <h3>No featured openings right now</h3>
                        <p>Check back later or explore our jobs page.</p>
                    </div>
                )}

                {/* ================== EXPLORE ALL JOBS ================== */}
                <div className="rms-jobs-cta">
                    <div>
                        <p className="website-section-label">YOUR NEXT CHAPTER</p>

                        <h3>Ready to find your next opportunity?</h3>

                        <p>Explore available roles and find the one that fits your goals.</p>
                    </div>

                    <Link to="/jobs" className="website-button website-button-white">
                        Explore All Jobs
                        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default FeaturedJobs;
