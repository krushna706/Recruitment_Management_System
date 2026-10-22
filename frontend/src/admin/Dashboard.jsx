import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Alert, Button, CircularProgress } from "@mui/material";

import api from "../services/api";

// ================== APPLICATION STATUS DISPLAY ==================
const statusClasses = {
    Submitted: "submitted",
    "Under Review": "review",
    Shortlisted: "shortlisted",
    Interview: "interview",
    Selected: "selected",
    Rejected: "rejected",
};

const chartStatuses = [
    { label: "Submitted", className: "submitted" },
    { label: "Under Review", className: "review" },
    { label: "Shortlisted", className: "shortlisted" },
    { label: "Interview", className: "interview" },
    { label: "Selected", className: "selected" },
    { label: "Rejected", className: "rejected" },
];

function getTimestamp(value) {
    if (!value) return 0;

    const timestamp = new Date(value).getTime();

    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDate(value, includeTime = false) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Kolkata",
        ...(includeTime
            ? { hour: "numeric", minute: "2-digit" }
            : { year: "numeric" }),
    }).format(date);
}

function getInitials(name = "") {
    return (
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join("")
            .toUpperCase() || "?"
    );
}

// ================== ADMIN DASHBOARD ==================
function Dashboard({ user }) {
    const outletContext = useOutletContext();
    const currentUser = user ?? outletContext?.user;
    const firstName = currentUser?.name?.trim().split(/\s+/)[0];

    // ================== API STATES ==================
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    // ================== FETCH DASHBOARD DATA ==================
    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        async function loadDashboard() {
            setLoading(true);
            setError("");

            try {
                const { data } = await api.get("/admin/dashboard", {
                    signal: controller.signal,
                });

                if (!active) return;

                // Display real MongoDB data only when the response is valid.
                if (
                    data?.success !== true ||
                    !data.stats?.clientJobs ||
                    !data.stats?.internalVacancies ||
                    !data.stats?.applications ||
                    !data.statusCounts ||
                    !Array.isArray(data.recentApplications) ||
                    !Array.isArray(data.recentActivities)
                ) {
                    throw new Error("Invalid dashboard API response.");
                }

                setDashboard(data);
            } catch (requestError) {
                if (!active) return;

                setDashboard(null);
                setError(
                    requestError.response?.data?.message ||
                        requestError.message ||
                        "Unable to load dashboard data."
                );
            } finally {
                if (active) setLoading(false);
            }
        }

        loadDashboard();

        return () => {
            active = false;
            controller.abort();
        };
    }, [refreshKey]);

    // ================== LOADING / ERROR STATES ==================
    if (loading) {
        return (
            <div className="admin-dashboard">
                <header className="panel-page-heading">
                    <div>
                        <h1 className="panel-page-title">Dashboard</h1>
                        <p className="panel-page-description">
                            Your recruitment overview, all in one place.
                        </p>
                    </div>
                </header>
                <div className="panel-card" role="status" style={{ padding: 40, textAlign: "center" }}>
                    <CircularProgress size={28} />
                    <p>Loading recruitment dashboard...</p>
                </div>
            </div>
        );
    }

    if (error || !dashboard) {
        return (
            <div className="admin-dashboard">
                <header className="panel-page-heading">
                    <div>
                        <h1 className="panel-page-title">Dashboard</h1>
                        <p className="panel-page-description">
                            Your recruitment overview, all in one place.
                        </p>
                    </div>
                </header>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error || "Dashboard data is unavailable."}
                </Alert>
                <Button
                    variant="outlined"
                    onClick={() => setRefreshKey((previous) => previous + 1)}
                >
                    Try again
                </Button>
            </div>
        );
    }

    // ================== MONGODB STATISTICS ==================
    const { stats, statusCounts } = dashboard;
    const applicationTotal = Number(stats.applications.total) || 0;
    const pendingCount = Number(stats.applications.pending) || 0;

    const countStatus = (status) => Number(statusCounts[status]) || 0;

    const recentApplications = [...dashboard.recentApplications]
        .sort((a, b) => getTimestamp(b.appliedAt) - getTimestamp(a.appliedAt))
        .slice(0, 5);

    const recentActivities = [...dashboard.recentActivities]
        .sort((a, b) => getTimestamp(b.at) - getTimestamp(a.at))
        .slice(0, 4);

    // ================== OVERVIEW CARDS ==================
    const overviewCards = [
        {
            label: "Client Jobs",
            value: Number(stats.clientJobs.total) || 0,
            description: `${Number(stats.clientJobs.published) || 0} currently published`,
            icon: "fa-solid fa-briefcase",
            tone: "blue",
            path: "/manage/manage-jobs",
        },
        {
            label: "Internal Vacancies",
            value: Number(stats.internalVacancies.total) || 0,
            description: `${Number(stats.internalVacancies.published) || 0} currently published`,
            icon: "fa-solid fa-briefcase",
            tone: "blue",
            path: "/manage/manage-vacancies",
        },
        {
            label: "Total Applications",
            value: applicationTotal,
            description: "Across client jobs and internal vacancies",
            icon: "fa-regular fa-file-lines",
            tone: "purple",
            path: "/manage/manage-applications",
        },
        {
            label: "Registered Users",
            value: Number(stats.registeredUsers) || 0,
            description: "Candidate accounts",
            icon: "fa-solid fa-users",
            tone: "teal",
            path: "/manage/manage-users",
        },
    ];

    // ================== APPLICATION STATUS CARDS ==================
    const statusCards = [
        {
            label: "Pending",
            value: pendingCount,
            description: "Submitted + under review",
            icon: "fa-regular fa-clock",
            tone: "amber",
        },
        {
            label: "Shortlisted",
            value: Number(stats.applications.shortlisted) || 0,
            description: "Currently shortlisted",
            icon: "fa-solid fa-user-check",
            tone: "blue",
        },
        {
            label: "Selected",
            value: Number(stats.applications.selected) || 0,
            description: "Marked as selected",
            icon: "fa-solid fa-circle-check",
            tone: "green",
        },
        {
            label: "Rejected",
            value: Number(stats.applications.rejected) || 0,
            description: "Not moving forward",
            icon: "fa-regular fa-circle-xmark",
            tone: "red",
        },
    ];

    // ================== APPLICATION STATUS CHART ==================
    const statusChart = chartStatuses.map((status) => {
        const count = countStatus(status.label);

        return {
            ...status,
            count,
            percentage: applicationTotal ? (count / applicationTotal) * 100 : 0,
        };
    });

    // Preserve unexpected statuses in the total, rather than hiding them.
    const knownStatusCount = statusChart.reduce(
        (total, status) => total + status.count,
        0
    );

    const otherStatusCount = Math.max(0, applicationTotal - knownStatusCount);

    if (otherStatusCount > 0) {
        statusChart.push({
            label: "Other / Unknown",
            className: "other",
            count: otherStatusCount,
            percentage: (otherStatusCount / applicationTotal) * 100,
        });
    }

    return (
        <div className="admin-dashboard">
            <header className="panel-page-heading">
                <div>
                    <h1 className="panel-page-title">Dashboard</h1>

                    <p className="panel-page-description">
                        Your recruitment overview, all in one place.
                    </p>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <Button
                        type="button"
                        variant="outlined"
                        className="panel-button panel-button-outline"
                        onClick={() => setRefreshKey((previous) => previous + 1)}
                        startIcon={
                            <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
                        }
                    >
                        Refresh
                    </Button>

                    <Button
                        component={Link}
                        to="/manage/manage-jobs"
                        variant="outlined"
                        className="panel-button panel-button-outline"
                        startIcon={
                            <i className="fa-solid fa-briefcase" aria-hidden="true" />
                        }
                    >
                        Manage Jobs
                    </Button>
                </div>
            </header>

            <section
                className="admin-welcome"
                aria-labelledby="admin-welcome-title"
            >
                <div className="admin-welcome-copy">
                    <h2 id="admin-welcome-title">
                        Welcome back
                        {firstName && (
                            <>
                                , <span>{firstName}</span>
                            </>
                        )}
                        .
                    </h2>

                    <p>
                        Keep hiring moving. Review applications, manage openings
                        and follow your team’s recruitment progress.
                    </p>

                    <Link
                        to="/manage/manage-applications"
                        className="admin-welcome-link"
                    >
                        Review applications
                        <i
                            className="fa-solid fa-arrow-right"
                            aria-hidden="true"
                        />
                    </Link>
                </div>

                <div className="admin-review-summary">
                    <div className="admin-review-summary-top">
                        <span aria-hidden="true">
                            <i className="fa-regular fa-clock" />
                        </span>

                        <p>Pending applications</p>
                    </div>

                    <strong>{pendingCount}</strong>

                    <p>
                        {pendingCount
                            ? "Submitted or currently under review."
                            : "No applications are pending right now."}
                    </p>
                </div>
            </section>

            <section
                className="admin-overview-grid"
                aria-label="Recruitment totals"
            >
                {overviewCards.map((card) => (
                    <Link
                        key={card.label}
                        to={card.path}
                        className={`admin-overview-card admin-tone-${card.tone}`}
                    >
                        <span className="admin-metric-icon" aria-hidden="true">
                            <i className={card.icon} />
                        </span>

                        <div className="admin-overview-copy">
                            <h2>{card.label}</h2>
                            <strong>{card.value}</strong>
                            <p>{card.description}</p>
                        </div>

                        <i
                            className="fa-solid fa-arrow-up-right-from-square admin-overview-arrow"
                            aria-hidden="true"
                        />
                    </Link>
                ))}
            </section>

            <section
                className="admin-status-grid"
                aria-label="Application status overview"
            >
                {statusCards.map((card) => (
                    <article
                        key={card.label}
                        className={`admin-status-card admin-tone-${card.tone}`}
                    >
                        <div className="admin-status-card-top">
                            <span
                                className="admin-status-icon"
                                aria-hidden="true"
                            >
                                <i className={card.icon} />
                            </span>

                            <strong>{card.value}</strong>
                        </div>

                        <h2>{card.label}</h2>
                        <p>{card.description}</p>
                    </article>
                ))}
            </section>

            <section
                className="panel-card admin-chart"
                aria-labelledby="admin-chart-title"
            >
                <header className="panel-card-header">
                    <div>
                        <h2 id="admin-chart-title" className="panel-card-title">
                            Application status overview
                        </h2>

                        <p className="panel-card-description">
                            How your applications are distributed across
                            recruitment stages.
                        </p>
                    </div>

                    <span className="admin-chart-total">
                        <strong>{applicationTotal}</strong>
                        total applications
                    </span>
                </header>

                {applicationTotal > 0 ? (
                    <div className="admin-chart-body">
                        <div
                            className="admin-chart-column-labels"
                            aria-hidden="true"
                        >
                            <span>Current status</span>
                            <span>Share of applications</span>
                            <span>Count</span>
                        </div>

                        <ul className="admin-chart-list">
                            {statusChart.map((item) => (
                                <li
                                    key={item.label}
                                    className={`admin-chart-row admin-chart-${item.className}`}
                                >
                                    <span className="admin-chart-label">
                                        <span aria-hidden="true" />
                                        {item.label}
                                    </span>

                                    <div className="admin-chart-bar-group">
                                        <div
                                            className="admin-chart-track"
                                            aria-hidden="true"
                                        >
                                            <div
                                                className="admin-chart-fill"
                                                style={{
                                                    width: `${item.percentage}%`,
                                                }}
                                            />
                                        </div>

                                        <span className="admin-chart-percentage">
                                            {item.percentage.toFixed(1)}%
                                        </span>
                                    </div>

                                    <strong className="admin-chart-count">
                                        <span className="admin-visually-hidden">
                                            Application count:{" "}
                                        </span>
                                        {item.count}
                                    </strong>
                                </li>
                            ))}
                        </ul>

                        <p className="admin-chart-note">
                            Each application is counted once under its current
                            status. Pending includes Submitted and Under Review.
                        </p>
                    </div>
                ) : (
                    <div className="panel-empty-state">
                        <i
                            className="fa-solid fa-chart-simple"
                            aria-hidden="true"
                        />
                        <h3>No application data yet.</h3>
                        <p>
                            The chart will appear when applications are
                            received.
                        </p>
                    </div>
                )}
            </section>

            <div className="admin-dashboard-bottom">
                <section
                    className="panel-card admin-recent-applications"
                    aria-labelledby="admin-applications-title"
                >
                    <header className="panel-card-header">
                        <div>
                            <h2
                                id="admin-applications-title"
                                className="panel-card-title"
                            >
                                Recent applications
                            </h2>

                            <p className="panel-card-description">
                                The latest candidates to apply.
                            </p>
                        </div>

                        <Link
                            to="/manage/manage-applications"
                            className="panel-text-link"
                        >
                            View all
                            <i
                                className="fa-solid fa-arrow-right"
                                aria-hidden="true"
                            />
                        </Link>
                    </header>

                    {recentApplications.length > 0 ? (
                        <div className="admin-table-scroll">
                            <table className="admin-applications-table">
                                <caption className="admin-visually-hidden">
                                    Recent candidates, applied positions,
                                    application dates and current statuses
                                </caption>

                                <thead>
                                    <tr>
                                        <th scope="col">Candidate & role</th>
                                        <th scope="col">Applied on</th>
                                        <th scope="col">Status</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {recentApplications.map((application) => {
                                        const statusClass =
                                            statusClasses[application.status];

                                        return (
                                            <tr key={application.id}>
                                                <td>
                                                    <div className="admin-candidate">
                                                        <span
                                                            className="admin-candidate-avatar"
                                                            aria-hidden="true"
                                                        >
                                                            {getInitials(
                                                                application.candidate,
                                                            )}
                                                        </span>

                                                        <div>
                                                            <h3>
                                                                {application.candidate ||
                                                                    "Unknown candidate"}
                                                            </h3>

                                                            <p>
                                                                {
                                                                    application.title
                                                                }
                                                            </p>

                                                            <span>
                                                                {
                                                                    application.company
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>
                                                    <time
                                                        dateTime={
                                                            application.appliedAt
                                                        }
                                                    >
                                                        {formatDate(
                                                            application.appliedAt,
                                                        )}
                                                    </time>
                                                </td>

                                                <td>
                                                    <span
                                                        className={
                                                            statusClass
                                                                ? `panel-status panel-status-${statusClass}`
                                                                : "panel-status"
                                                        }
                                                    >
                                                        <span aria-hidden="true" />
                                                        {application.status ||
                                                            "Unknown"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="panel-empty-state">
                            <i
                                className="fa-regular fa-folder-open"
                                aria-hidden="true"
                            />
                            <h3>No applications yet.</h3>
                            <p>New candidate applications will appear here.</p>
                        </div>
                    )}
                </section>

                <section
                    className="panel-card admin-activity"
                    aria-labelledby="admin-activity-title"
                >
                    <header className="panel-card-header">
                        <div>
                            <h2
                                id="admin-activity-title"
                                className="panel-card-title"
                            >
                                Recent activity
                            </h2>

                            <p className="panel-card-description">
                                Latest recruitment updates.
                            </p>
                        </div>
                    </header>

                    {recentActivities.length > 0 ? (
                        <ol className="admin-activity-list">
                            {recentActivities.map((activity) => (
                                <li
                                    key={activity.id}
                                    className={`admin-activity-item admin-tone-${activity.tone}`}
                                >
                                    <span
                                        className="admin-activity-icon"
                                        aria-hidden="true"
                                    >
                                        <i className={activity.icon} />
                                    </span>

                                    <div>
                                        <h3>
                                            <Link to={activity.path}>
                                                {activity.title}
                                            </Link>
                                        </h3>

                                        <p>{activity.description}</p>

                                        <time dateTime={activity.at}>
                                            {formatDate(activity.at, true)}
                                        </time>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <div className="panel-empty-state">
                            <i
                                className="fa-regular fa-clock"
                                aria-hidden="true"
                            />
                            <h3>No recent activity.</h3>
                            <p>Recruitment updates will appear here.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Dashboard;
