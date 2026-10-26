import usePageSEO from "../../hooks/usePageSEO";
import { seoPages } from "../../config/seoConfig";

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, Button, MenuItem, Pagination, TextField } from "@mui/material";

import api from "../../services/api";
import JobSearchBar from "../../components/JobSearchBar";

// ================== JOB CONFIGURATION ==================
const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Contract", "Internship"];
const WORK_MODES = ["On-site", "Hybrid", "Remote"];
const PAGE_SIZE = 20;

// ================== POSTED DATE ==================
// Compare calendar dates in the visitor's local timezone.
function getPostedLabel(dateString) {
    if (!dateString) return "Date unavailable";

    const posted = new Date(dateString);

    if (Number.isNaN(posted.getTime())) {
        return "Date unavailable";
    }

    const now = new Date();

    const postedDay = Date.UTC(posted.getFullYear(), posted.getMonth(), posted.getDate());

    const currentDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    const days = Math.floor((currentDay - postedDay) / 86400000);

    if (days < 0) return "Recently posted";
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";

    return `${days} days ago`;
}

// ================== JOBS PAGE ==================
function Jobs() {
    usePageSEO(seoPages.jobs);

    const [searchParams, setSearchParams] = useSearchParams();

    const [pagination, setPagination] = useState({
        filterKey: "",
        page: 1,
    });

    const [result, setResult] = useState({
        requestKey: "",
        jobs: [],
        total: 0,
        totalPages: 0,
        error: "",
    });

    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // ================== URL FILTERS ==================
    const designation = (searchParams.get("designation") || "").trim();
    const location = (searchParams.get("location") || "").trim();
    const experience = searchParams.get("experience") || "";
    const employmentType = searchParams.get("employmentType") || "";
    const workMode = searchParams.get("workMode") || "";

    const filterKey = JSON.stringify([designation, location, experience, employmentType, workMode]);

    // A new filter starts from the first page.
    const currentPage = pagination.filterKey === filterKey ? pagination.page : 1;

    const requestKey = JSON.stringify([filterKey, currentPage, refreshKey]);

    const isCurrentResult = result.requestKey === requestKey;
    const isLoading = loading || !isCurrentResult;
    const error = isCurrentResult ? result.error : "";
    const jobs = isCurrentResult ? result.jobs : [];
    const total = isCurrentResult ? result.total : 0;
    const pageCount = isCurrentResult ? result.totalPages : 0;
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    const hasFilters = Boolean(designation || location || experience || employmentType || workMode);

    // ================== FETCH PUBLISHED JOBS ==================
    useEffect(() => {
        const controller = new AbortController();

        async function fetchJobs() {
            setLoading(true);

            const params = {
                page: currentPage,
                limit: PAGE_SIZE,
            };

            if (designation) params.search = designation;
            if (location) params.location = location;
            if (experience) params.experience = experience;
            if (employmentType) params.type = employmentType;
            if (workMode) params.mode = workMode;

            try {
                const { data } = await api.get("/jobs", {
                    params,
                    signal: controller.signal,
                });

                if (controller.signal.aborted) return;

                const lastPage = Math.max(data.pagination.totalPages, 1);

                // Handle jobs being closed while the visitor is browsing.
                if (currentPage > lastPage) {
                    setPagination({
                        filterKey,
                        page: lastPage,
                    });

                    return;
                }

                setResult({
                    requestKey,
                    jobs: data.jobs.map((job) => ({
                        ...job,
                        id: String(job.id || job._id),
                    })),
                    total: data.pagination.total,
                    totalPages: data.pagination.totalPages,
                    error: "",
                });
            } catch (requestError) {
                if (controller.signal.aborted) return;

                const message = requestError.response?.data?.message;

                setResult({
                    requestKey,
                    jobs: [],
                    total: 0,
                    totalPages: 0,
                    error:
                        typeof message === "string" && message.trim()
                            ? message
                            : "Jobs could not be loaded. Please try again.",
                });
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchJobs();

        // Ignore older responses after filters change or the page unmounts.
        return () => controller.abort();
    }, [
        designation,
        location,
        experience,
        employmentType,
        workMode,
        currentPage,
        filterKey,
        requestKey,
    ]);

    // ================== FILTER HANDLERS ==================
    function updateFilter(name, value) {
        const nextParams = new URLSearchParams(searchParams);

        if (value) {
            nextParams.set(name, value);
        } else {
            nextParams.delete(name);
        }

        setPagination({ filterKey: "", page: 1 });

        setSearchParams(nextParams, {
            preventScrollReset: true,
        });
    }

    function clearFilters() {
        const nextParams = new URLSearchParams(searchParams);

        ["designation", "location", "experience", "employmentType", "workMode"].forEach((name) =>
            nextParams.delete(name)
        );

        setPagination({ filterKey: "", page: 1 });

        setSearchParams(nextParams, {
            preventScrollReset: true,
        });
    }

    function handlePageChange(_, page) {
        setPagination({ filterKey, page });

        document.getElementById("jobs-results-title")?.focus();
    }

    const filterOptions = [
        {
            name: "employmentType",
            label: "Job type",
            value: employmentType,
            options: EMPLOYMENT_TYPES,
        },
        {
            name: "workMode",
            label: "Work mode",
            value: workMode,
            options: WORK_MODES,
        },
    ];

    let resultLabel = "No matching positions found.";

    if (isLoading) {
        resultLabel = "Loading opportunities...";
    } else if (error) {
        resultLabel = "Job listings are currently unavailable.";
    } else if (total > 0) {
        resultLabel = `Showing ${startIndex + 1}–${startIndex + jobs.length} of ${total} positions`;
    }

    return (
        <div className="jobs-page">
            {/* ================== IMAGE BANNER ================== */}
            <section className="about-hero" aria-labelledby="jobs-page-title">
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
                            <li aria-current="page">Jobs</li>
                        </ol>
                    </nav>

                    <div className="about-hero-content">
                        <p className="website-section-label">FIND YOUR OPPORTUNITY</p>

                        <h1 id="jobs-page-title" className="website-section-title">
                            Your skills. Your ambitions.
                            <span>Your next opportunity.</span>
                        </h1>

                        <p className="website-section-description jobs-banner-description">
                            Discover roles that match your experience, interests and the way you
                            want to work.
                        </p>
                    </div>
                </div>
            </section>

            {/* ================== SEARCH AND FILTERS ================== */}
            <section
                className="website-shell jobs-search-section"
                aria-label="Search and filter jobs"
            >
                <div className="jobs-search-panel">
                    <JobSearchBar />

                    <div className="jobs-filter-row">
                        {filterOptions.map((filter) => (
                            <TextField
                                key={filter.name}
                                id={`jobs-filter-${filter.name}`}
                                select
                                fullWidth
                                size="small"
                                label={filter.label}
                                value={filter.value}
                                onChange={(event) => updateFilter(filter.name, event.target.value)}
                                className="website-text-field"
                            >
                                <MenuItem value="">All</MenuItem>

                                {filter.options.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}

                                {filter.value && !filter.options.includes(filter.value) && (
                                    <MenuItem value={filter.value}>{filter.value}</MenuItem>
                                )}
                            </TextField>
                        ))}

                        <Button
                            type="button"
                            onClick={clearFilters}
                            disabled={!hasFilters}
                            className="jobs-clear-button"
                        >
                            Clear filters
                        </Button>
                    </div>
                </div>
            </section>

            {/* ================== JOB RESULTS ================== */}
            <section
                className="website-section jobs-results"
                aria-labelledby="jobs-results-title"
                aria-busy={isLoading}
            >
                <div className="website-shell jobs-results-fluid">
                    <div className="jobs-results-header">
                        <p className="website-section-label">EXPLORE OPPORTUNITIES</p>

                        <h2 id="jobs-results-title" className="website-section-title" tabIndex={-1}>
                            Find a role
                            <span> that fits you.</span>
                        </h2>

                        <p className="jobs-result-count" role="status">
                            {resultLabel}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="rms-jobs-empty jobs-empty">
                            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                            <h3>Loading jobs...</h3>
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
                        <>
                            <div className="jobs-list-grid">
                                {jobs.map((job) => {
                                    const postedAt = job.publishedAt || job.createdAt;
                                    const detailsPath = `/jobs/${encodeURIComponent(job.id)}`;

                                    return (
                                        <article
                                            key={job.id}
                                            className="rms-job-card jobs-position-card"
                                        >
                                            <div className="jobs-card-topline">
                                                <p className="rms-job-company">{job.company}</p>

                                                <time
                                                    className="jobs-posted"
                                                    dateTime={postedAt || undefined}
                                                    aria-label={`Posted ${getPostedLabel(postedAt)}`}
                                                >
                                                    <i
                                                        className="fa-regular fa-clock"
                                                        aria-hidden="true"
                                                    />
                                                    {getPostedLabel(postedAt)}
                                                </time>
                                            </div>

                                            <div className="jobs-title-row">
                                                <h3 className="rms-job-title">
                                                    <Link to={detailsPath} title={job.title}>
                                                        {job.title}
                                                    </Link>
                                                </h3>
                                            </div>

                                            <div className="rms-job-tags">
                                                <span>{job.type}</span>
                                                <span>{job.mode}</span>
                                            </div>

                                            <p className="jobs-card-description">
                                                {job.shortDescription ||
                                                    "View the job details for more information."}
                                            </p>

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

                                            <div className="rms-job-footer">
                                                <p
                                                    className="rms-job-location"
                                                    title={job.location}
                                                >
                                                    <i
                                                        className="fa-solid fa-location-dot"
                                                        aria-hidden="true"
                                                    />
                                                    <span>{job.location}</span>
                                                </p>

                                                <Button
                                                    component={Link}
                                                    to={detailsPath}
                                                    className="website-button website-button-outline jobs-details-button"
                                                    aria-label={`View details for ${job.title}`}
                                                >
                                                    View Details
                                                    <i
                                                        className="fa-solid fa-arrow-right"
                                                        aria-hidden="true"
                                                    />
                                                </Button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>

                            {pageCount > 1 && (
                                <div className="jobs-pagination">
                                    <Pagination
                                        count={pageCount}
                                        page={currentPage}
                                        onChange={handlePageChange}
                                        shape="rounded"
                                        siblingCount={0}
                                        aria-label="Job results pages"
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="rms-jobs-empty jobs-empty">
                            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />

                            <h3>
                                {hasFilters
                                    ? "No jobs match your search."
                                    : "No positions available right now."}
                            </h3>

                            <p>
                                {hasFilters
                                    ? "Try another search or clear your filters."
                                    : "Please check back later for new opportunities."}
                            </p>

                            {hasFilters && (
                                <Button
                                    type="button"
                                    onClick={clearFilters}
                                    className="website-button website-button-primary"
                                >
                                    Clear All Filters
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default Jobs;
