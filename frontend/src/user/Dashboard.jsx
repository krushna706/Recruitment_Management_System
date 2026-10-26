import usePageSEO from "../hooks/usePageSEO";
import { seoPages } from "../config/seoConfig";

import { formatDate } from "../utils/dataFormat";
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Button } from "@mui/material";
import api from "../services/api";

const statusConfig = {
    Submitted: {
        className: "submitted",
        icon: "fa-regular fa-paper-plane",
        message: "Application submitted",
    },
    "Under Review": {
        className: "review",
        icon: "fa-regular fa-clock",
        message: "Application moved to review",
    },
    Shortlisted: {
        className: "shortlisted",
        icon: "fa-solid fa-check",
        message: "Application shortlisted",
    },
    Interview: {
        className: "interview",
        icon: "fa-regular fa-calendar",
        message: "Application moved to interview stage",
    },
    Selected: {
        className: "selected",
        icon: "fa-solid fa-circle-check",
        message: "Application marked as selected",
    },
    Rejected: {
        className: "rejected",
        icon: "fa-solid fa-xmark",
        message: "Application marked as rejected",
    },
};

// ================== APPLICATION STATUS ==================
function getStatus(status) {
    return (
        statusConfig[status] || {
            className: "submitted",
            icon: "fa-regular fa-file-lines",
            message: "Application updated",
        }
    );
}

// ================== APPLICATION DETAILS URL ==================
function getApplicationPath(id) {
    return `/manage/my-applications/${encodeURIComponent(id)}`;
}

// ================== INITIAL DASHBOARD DATA ==================
const initialDashboard = {
    counts: {
        total: 0,
        pending: 0,
        shortlisted: 0,
        rejected: 0,
    },
    recentApplications: [],
    recentActivity: [],
};

// ================== USER DASHBOARD ==================
function Dashboard({ user }) {
    usePageSEO(seoPages.userDashboard);
    
    const outletContext = useOutletContext();

    // Use the authenticated account, never a hardcoded demo user.
    const currentUser = user ?? outletContext?.user;
    const firstName = currentUser?.name?.trim().split(/\s+/)[0] || "";

    const [dashboard, setDashboard] = useState(initialDashboard);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    // ================== FETCH DASHBOARD DATA ==================
    // Counts are calculated by MongoDB and are not tied to list pagination.
    useEffect(() => {
        const controller = new AbortController();

        async function fetchDashboard() {
            setLoading(true);
            setError("");

            try {
                const { data } = await api.get("/applications/my/dashboard", {
                    signal: controller.signal,
                });

                if (controller.signal.aborted) return;

                if (
                    !data?.success ||
                    !data.counts ||
                    !Array.isArray(data.recentApplications) ||
                    !Array.isArray(data.recentActivity)
                ) {
                    throw new Error("Invalid dashboard response.");
                }

                setDashboard({
                    counts: data.counts,
                    recentApplications: data.recentApplications,
                    recentActivity: data.recentActivity,
                });
            } catch (requestError) {
                if (controller.signal.aborted) return;

                const message = requestError.response?.data?.message;

                setError(
                    typeof message === "string" && message.trim()
                        ? message
                        : "Dashboard could not be loaded. Please try again."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchDashboard();

        return () => controller.abort();
    }, [refreshKey]);

    const { counts, recentApplications, recentActivity } = dashboard;

    // ================== LOADING STATE ==================
    if (loading) {
        return (
            <div className="panel-card panel-empty-state" role="status">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                <h1 className="panel-page-title">Loading dashboard...</h1>
                <p>Please wait while we fetch your application summary.</p>
            </div>
        );
    }

    // ================== API ERROR STATE ==================
    if (error) {
        return (
            <div className="panel-card panel-empty-state">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                <h1 className="panel-page-title">Unable to load dashboard.</h1>
                <p role="alert">{error}</p>

                <Button
                    type="button"
                    variant="contained"
                    disableElevation
                    className="panel-button panel-button-primary"
                    onClick={() => setRefreshKey((value) => value + 1)}
                >
                    Try again
                </Button>
            </div>
        );
    }

    const statistics = [
        {
            label: "Total Applications",
            value: counts.total,
            description: "All submitted applications",
            icon: "fa-regular fa-file-lines",
            tone: "blue",
        },
        {
            label: "Pending",
            value: counts.pending,
            description: "Submitted or under review",
            icon: "fa-regular fa-clock",
            tone: "amber",
        },
        {
            label: "Shortlisted",
            value: counts.shortlisted,
            description: "Currently shortlisted",
            icon: "fa-solid fa-user-check",
            tone: "green",
        },
        {
            label: "Rejected",
            value: counts.rejected,
            description: "Not moving forward",
            icon: "fa-regular fa-circle-xmark",
            tone: "red",
        },
    ];

    return (
        <div className="user-dashboard">
            <header className="panel-page-heading">
                <div>
                    <h1 className="panel-page-title">Dashboard</h1>

                    <p className="panel-page-description">
                        Your applications, progress and latest updates.
                    </p>
                </div>

                <Button
                    component={Link}
                    to="/jobs"
                    variant="outlined"
                    className="panel-button panel-button-outline"
                    startIcon={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                >
                    Browse Jobs
                </Button>
            </header>

            <section className="dashboard-welcome" aria-labelledby="dashboard-welcome-title">
                <div className="dashboard-welcome-copy">
                    <h2 id="dashboard-welcome-title">
                        Welcome back{firstName ? ", " : ""}
                        {firstName && <span>{firstName}</span>}.
                    </h2>

                    <p>
                        Keep your next opportunity in sight. Track your applications and stay up to
                        date with every step.
                    </p>

                    <Link to="/manage/my-applications" className="dashboard-welcome-link">
                        View my applications
                        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </Link>
                </div>

                <div className="dashboard-welcome-art" aria-hidden="true">
                    <div className="dashboard-art-orbit" />

                    <div className="dashboard-art-card">
                        <span className="dashboard-art-icon">
                            <i className="fa-solid fa-briefcase" />
                        </span>

                        <span className="dashboard-art-line" />
                        <span className="dashboard-art-line is-short" />

                        <span className="dashboard-art-check">
                            <i className="fa-solid fa-check" />
                        </span>
                    </div>

                    <span className="dashboard-art-spark">
                        <i className="fa-solid fa-star" />
                    </span>
                </div>
            </section>

            <section className="dashboard-stats" aria-label="Application overview">
                {statistics.map((statistic) => (
                    <article
                        className={`dashboard-stat dashboard-stat-${statistic.tone}`}
                        key={statistic.label}
                    >
                        <div className="dashboard-stat-top">
                            <span className="dashboard-stat-icon" aria-hidden="true">
                                <i className={statistic.icon} />
                            </span>

                            <span className="dashboard-stat-value">{statistic.value}</span>
                        </div>

                        <h2>{statistic.label}</h2>
                        <p>{statistic.description}</p>
                    </article>
                ))}
            </section>

            <div className="dashboard-content-grid">
                <section
                    className="panel-card dashboard-applications"
                    aria-labelledby="recent-applications-title"
                >
                    <header className="panel-card-header">
                        <div>
                            <h2 id="recent-applications-title" className="panel-card-title">
                                Recent applications
                            </h2>

                            <p className="panel-card-description">
                                Follow the progress of your latest applications.
                            </p>
                        </div>

                        <Link to="/manage/my-applications" className="panel-text-link">
                            View all
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                    </header>

                    {recentApplications.length > 0 ? (
                        <ul className="dashboard-application-list">
                            {recentApplications.map((application) => {
                                const status = getStatus(application.status);

                                return (
                                    <li className="dashboard-application" key={application.id}>
                                        <div
                                            className="dashboard-application-icon"
                                            aria-hidden="true"
                                        >
                                            <i className="fa-solid fa-briefcase" />
                                        </div>

                                        <div className="dashboard-application-copy">
                                            {application.company && (
                                                <p className="dashboard-company">
                                                    {application.company}
                                                </p>
                                            )}

                                            <h3>
                                                <Link to={getApplicationPath(application.id)}>
                                                    {application.title}
                                                </Link>
                                            </h3>

                                            <div className="dashboard-application-meta">
                                                {application.location && (
                                                    <span>
                                                        <i
                                                            className="fa-solid fa-location-dot"
                                                            aria-hidden="true"
                                                        />
                                                        {application.location}
                                                    </span>
                                                )}

                                                <span>
                                                    <i
                                                        className="fa-regular fa-calendar"
                                                        aria-hidden="true"
                                                    />
                                                    Applied{" "}
                                                    <time dateTime={application.appliedAt}>
                                                        {formatDate(application.appliedAt)}
                                                    </time>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="dashboard-application-action">
                                            <span
                                                className={`panel-status panel-status-${status.className}`}
                                            >
                                                <span aria-hidden="true" />
                                                {application.status}
                                            </span>

                                            <Link
                                                to={getApplicationPath(application.id)}
                                                className="panel-text-link"
                                                aria-label={`View application for ${application.title}`}
                                            >
                                                View details
                                                <i
                                                    className="fa-solid fa-arrow-right"
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="panel-empty-state">
                            <i className="fa-regular fa-folder-open" aria-hidden="true" />

                            <h3>Your journey starts here.</h3>

                            <p>
                                Apply for a role to see your applications and track their progress
                                here.
                            </p>

                            <Button
                                component={Link}
                                to="/jobs"
                                variant="contained"
                                disableElevation
                                className="panel-button panel-button-primary"
                            >
                                Explore Jobs
                            </Button>
                        </div>
                    )}
                </section>

                <section
                    className="panel-card dashboard-activity"
                    aria-labelledby="recent-activity-title"
                >
                    <header className="panel-card-header">
                        <div>
                            <h2 id="recent-activity-title" className="panel-card-title">
                                Recent activity
                            </h2>

                            <p className="panel-card-description">
                                Your latest application updates.
                            </p>
                        </div>

                        <span className="dashboard-activity-heading-icon" aria-hidden="true">
                            <i className="fa-regular fa-clock" />
                        </span>
                    </header>

                    {recentActivity.length > 0 ? (
                        <ol className="dashboard-activity-list">
                            {recentActivity.map((event) => {
                                const status = getStatus(event.status);

                                return (
                                    <li className="dashboard-activity-item" key={event.key}>
                                        <span
                                            className={`dashboard-activity-icon panel-status-${status.className}`}
                                            aria-hidden="true"
                                        >
                                            <i className={status.icon} />
                                        </span>

                                        <div>
                                            <h3>{status.message}</h3>

                                            <Link to={getApplicationPath(event.applicationId)}>
                                                {event.title}
                                            </Link>

                                            <time dateTime={event.at}>
                                                {formatDate(event.at, true)}
                                            </time>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <div className="panel-empty-state">
                            <i className="fa-regular fa-clock" aria-hidden="true" />

                            <h3>No updates yet.</h3>

                            <p>Changes to your application status will appear here.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Dashboard;
