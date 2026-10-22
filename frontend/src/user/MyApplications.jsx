import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, InputAdornment, MenuItem, Pagination, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@mui/material";

import api from "../services/api";

// ================== APPLICATION OPTIONS ==================
const PAGE_SIZE = 5;

const APPLICATION_STATUSES = [
    "Pending",
    "Submitted",
    "Under Review",
    "Shortlisted",
    "Interview",
    "Selected",
    "Rejected",
];

const STATUS_CLASSES = {
    Submitted: "submitted",
    "Under Review": "review",
    Shortlisted: "shortlisted",
    Interview: "interview",
    Selected: "selected",
    Rejected: "rejected",
};

// ================== DISPLAY HELPERS ==================
function formatApplicationDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getDetailsPath(id) {
    return `/manage/my-applications/${encodeURIComponent(id)}`;
}

function ApplicationStatusBadge({ status }) {
    return (
        <span
            className={`panel-status panel-status-${
                STATUS_CLASSES[status] || "submitted"
            }`}
        >
            <span aria-hidden="true" />
            {status}
        </span>
    );
}

// ================== SHARED JOB DETAILS ==================
function ApplicationJob({ application }) {
    const job = application.jobSnapshot || {};
    const applicationId = application.id || application._id;

    return (
        <div className="applications-job">
            <span className="applications-job-icon" aria-hidden="true">
                <i className="fa-solid fa-briefcase" />
            </span>

            <div className="applications-job-copy">
                <h3>
                    <Link to={getDetailsPath(applicationId)}>
                        {job.title || "Job application"}
                    </Link>
                </h3>

                {job.company && <p>{job.company}</p>}

                <div className="applications-job-meta">
                    {job.location && (
                        <span>
                            <i
                                className="fa-solid fa-location-dot"
                                aria-hidden="true"
                            />
                            {job.location}
                        </span>
                    )}

                    {job.mode && (
                        <span className="applications-mode">{job.mode}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ================== MY APPLICATIONS ==================
function MyApplications() {
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({
        search: "",
        status: "",
        page: 1,
    });

    const [applications, setApplications] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 0,
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    // ================== SEARCH DELAY ==================
    // Wait briefly while typing instead of requesting every keystroke.
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const nextSearch = search.trim();

            setFilters((previous) => {
                if (previous.search === nextSearch) return previous;

                return {
                    ...previous,
                    search: nextSearch,
                    page: 1,
                };
            });
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search]);

    // ================== FETCH APPLICATIONS ==================
    useEffect(() => {
        const controller = new AbortController();

        async function fetchApplications() {
            setLoading(true);
            setError("");
            setApplications([]);

            try {
                const params = {
                    page: filters.page,
                    limit: PAGE_SIZE,
                };

                if (filters.search) params.search = filters.search;
                if (filters.status) params.status = filters.status;

                const { data } = await api.get("/applications/my", {
                    params,
                    signal: controller.signal,
                });

                if (controller.signal.aborted) return;

                // Return to an available page if the result count changed.
                const lastPage = Math.max(1, data.pagination.totalPages);

                if (filters.page > lastPage) {
                    setFilters((previous) => ({
                        ...previous,
                        page: lastPage,
                    }));
                    return;
                }

                setApplications(data.applications);
                setPagination(data.pagination);
            } catch (requestError) {
                if (controller.signal.aborted) return;

                const message = requestError.response?.data?.message;

                setError(
                    typeof message === "string" && message.trim()
                        ? message
                        : "Applications could not be loaded. Please try again."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchApplications();

        return () => controller.abort();
    }, [filters, refreshKey]);

    // ================== FILTER HANDLERS ==================
    function clearFilters() {
        setSearch("");
        setFilters({
            search: "",
            status: "",
            page: 1,
        });
    }

    function handleStatusChange(event) {
        const nextStatus = event.target.value;

        setFilters((previous) => ({
            ...previous,
            status: nextStatus,
            page: 1,
        }));
    }

    const hasFilters = Boolean(search || filters.status);
    const appliedFilters = Boolean(filters.search || filters.status);
    const startIndex = (pagination.page - 1) * pagination.limit;

    return (
        <div className="my-applications-page">
            <header className="panel-page-heading">
                <div>
                    <h1 className="panel-page-title">My Applications</h1>

                    <p className="panel-page-description">
                        Track your applications and follow their progress.
                    </p>
                </div>

                <Button
                    component={Link}
                    to="/jobs"
                    variant="outlined"
                    className="panel-button panel-button-outline"
                    startIcon={
                        <i
                            className="fa-solid fa-magnifying-glass"
                            aria-hidden="true"
                        />
                    }
                >
                    Browse Jobs
                </Button>
            </header>

            {/* ================== FILTERS ================== */}
            <section
                className="panel-card applications-toolbar"
                aria-label="Filter applications"
            >
                <TextField
                    label="Search applications"
                    placeholder="Job title or company"
                    size="small"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="panel-field"
                    fullWidth
                    slotProps={{
                        htmlInput: {
                            maxLength: 200,
                        },
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <i
                                        className="fa-solid fa-magnifying-glass"
                                        aria-hidden="true"
                                    />
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                <TextField
                    select
                    label="Application status"
                    size="small"
                    value={filters.status}
                    onChange={handleStatusChange}
                    className="panel-field"
                    fullWidth
                    slotProps={{
                        inputLabel: {
                            shrink: true,
                        },
                        select: {
                            displayEmpty: true,
                        },
                    }}
                >
                    <MenuItem value="">All statuses</MenuItem>

                    {APPLICATION_STATUSES.map((item) => (
                        <MenuItem value={item} key={item}>
                            {item}
                        </MenuItem>
                    ))}
                </TextField>

                <Button
                    type="button"
                    className="panel-button applications-reset"
                    disabled={!hasFilters}
                    onClick={clearFilters}
                >
                    Clear filters
                </Button>
            </section>

            {/* ================== APPLICATION RESULTS ================== */}
            <section
                className="panel-card applications-results"
                aria-labelledby="application-list-title"
                aria-busy={loading}
            >
                <header className="panel-card-header">
                    <div>
                        <h2
                            className="panel-card-title"
                            id="application-list-title"
                        >
                            Your applications
                        </h2>

                        <p
                            className="panel-card-description"
                            role="status"
                            aria-live="polite"
                        >
                            {loading
                                ? "Loading your applications..."
                                : error
                                    ? "Application list is unavailable."
                                    : `${pagination.total} ${
                                        pagination.total === 1
                                            ? "application"
                                            : "applications"
                                    } ${
                                        appliedFilters
                                            ? "match your filters."
                                            : "in total."
                                    }`}
                        </p>
                    </div>

                    <span className="applications-sort-note">
                        <i
                            className="fa-solid fa-arrow-down-wide-short"
                            aria-hidden="true"
                        />
                        Newest first
                    </span>
                </header>

                {loading ? (
                    <div className="panel-empty-state" role="status">
                        <i
                            className="fa-solid fa-spinner fa-spin"
                            aria-hidden="true"
                        />
                        <h3>Loading applications...</h3>
                        <p>Please wait while we fetch your applications.</p>
                    </div>
                ) : error ? (
                    <div className="panel-empty-state">
                        <i
                            className="fa-solid fa-circle-exclamation"
                            aria-hidden="true"
                        />

                        <h3>Unable to load applications.</h3>
                        <p role="alert">{error}</p>

                        <Button
                            type="button"
                            variant="contained"
                            disableElevation
                            className="panel-button panel-button-primary"
                            onClick={() => setRefreshKey((previous) => previous + 1)}
                        >
                            Try again
                        </Button>
                    </div>
                ) : applications.length > 0 ? (
                    <>
                        {/* ================== DESKTOP TABLE ================== */}
                        <TableContainer className="applications-table-container">
                            <Table
                                className="applications-table"
                                aria-labelledby="application-list-title"
                            >
                                <TableHead>
                                    <TableRow>
                                        <TableCell scope="col">Job details</TableCell>
                                        <TableCell scope="col">Applied on</TableCell>

                                        <TableCell scope="col" align="right">
                                            Status & action
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {applications.map((application) => {
                                        const id = application.id || application._id;

                                        return (
                                            <TableRow key={id}>
                                                <TableCell>
                                                    <ApplicationJob application={application} />
                                                </TableCell>

                                                <TableCell>
                                                    <time
                                                        className="applications-date"
                                                        dateTime={application.createdAt}
                                                    >
                                                        {formatApplicationDate(application.createdAt)}
                                                    </time>
                                                </TableCell>

                                                <TableCell align="right">
                                                    <div className="applications-row-action">
                                                        <ApplicationStatusBadge status={application.status} />

                                                        <Link
                                                            to={getDetailsPath(id)}
                                                            className="panel-text-link"
                                                            aria-label={`View application for ${application.jobSnapshot?.title || "this job"}`}
                                                        >
                                                            View details
                                                            <i
                                                                className="fa-solid fa-arrow-right"
                                                                aria-hidden="true"
                                                            />
                                                        </Link>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* ================== MOBILE CARDS ================== */}
                        <ul className="applications-mobile-list">
                            {applications.map((application) => {
                                const id = application.id || application._id;

                                return (
                                    <li key={id}>
                                        <span className="applications-mobile-label">
                                            Job details
                                        </span>

                                        <ApplicationJob application={application} />

                                        <div className="applications-mobile-facts">
                                            <div>
                                                <span className="applications-mobile-label">
                                                    Applied on
                                                </span>

                                                <time
                                                    className="applications-date"
                                                    dateTime={application.createdAt}
                                                >
                                                    {formatApplicationDate(application.createdAt)}
                                                </time>
                                            </div>

                                            <div>
                                                <span className="applications-mobile-label">
                                                    Current status
                                                </span>

                                                <ApplicationStatusBadge status={application.status} />
                                            </div>
                                        </div>

                                        <Link
                                            to={getDetailsPath(id)}
                                            className="panel-text-link applications-mobile-details"
                                            aria-label={`View application for ${application.jobSnapshot?.title || "this job"}`}
                                        >
                                            View details
                                            <i
                                                className="fa-solid fa-arrow-right"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* ================== PAGINATION ================== */}
                        <footer className="applications-pagination">
                            <p>
                                Showing {startIndex + 1}–
                                {startIndex + applications.length} of {pagination.total}
                            </p>

                            {pagination.totalPages > 1 && (
                                <Pagination
                                    count={pagination.totalPages}
                                    page={pagination.page}
                                    onChange={(_, nextPage) => {
                                        setFilters((previous) => ({
                                            ...previous,
                                            page: nextPage,
                                        }));
                                    }}
                                    shape="rounded"
                                    color="primary"
                                    siblingCount={0}
                                    aria-label="Application pages"
                                />
                            )}
                        </footer>
                    </>
                ) : (
                    <div className="panel-empty-state">
                        <i
                            className="fa-regular fa-folder-open"
                            aria-hidden="true"
                        />

                        <h3>
                            {appliedFilters
                                ? "No matching applications."
                                : "No applications yet."}
                        </h3>

                        <p>
                            {appliedFilters
                                ? "Try another search or clear your filters."
                                : "Explore available roles and take your next step."}
                        </p>

                        {appliedFilters ? (
                            <Button
                                type="button"
                                onClick={clearFilters}
                                className="panel-button panel-button-primary"
                                variant="contained"
                                disableElevation
                            >
                                Clear filters
                            </Button>
                        ) : (
                            <Button
                                component={Link}
                                to="/jobs"
                                className="panel-button panel-button-primary"
                                variant="contained"
                                disableElevation
                            >
                                Browse Jobs
                            </Button>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

export default MyApplications;