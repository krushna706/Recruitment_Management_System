import { demoJobs } from "../data/jobData";
import { Link, useOutletContext } from "react-router-dom";
import { Button } from "@mui/material";

// Temporary frontend data.
// Backend integration ke time API data use hoga.

const demoVacancies = [
    { id: "job-1", status: "Published" },
    { id: "job-2", status: "Published" },
    { id: "job-3", status: "Published" },
    { id: "job-4", status: "Published" },
    { id: "job-5", status: "Draft" },
    { id: "job-6", status: "Closed" },
];

const demoUsers = [
    { id: "user-1", role: "user" },
    { id: "user-2", role: "user" },
    { id: "user-3", role: "user" },
    { id: "user-4", role: "user" },
    { id: "user-5", role: "user" },
    { id: "user-6", role: "user" },
];

const demoApplications = [
    {
        id: "application-1001",
        candidate: "Aarav Sharma",
        title: "MERN Stack Developer",
        company: "Sample Digital",
        appliedAt: "2026-10-18T10:30:00+05:30",
        status: "Submitted",
    },
    {
        id: "application-1002",
        candidate: "Priya Das",
        title: "Frontend Developer",
        company: "Demo Technologies",
        appliedAt: "2026-10-18T09:15:00+05:30",
        status: "Under Review",
    },
    {
        id: "application-1003",
        candidate: "Rohan Patel",
        title: "UI/UX Designer",
        company: "Sample Design Studio",
        appliedAt: "2026-10-17T15:40:00+05:30",
        status: "Shortlisted",
    },
    {
        id: "application-1004",
        candidate: "Ananya Mishra",
        title: "QA Engineer",
        company: "Demo Technologies",
        appliedAt: "2026-10-17T11:20:00+05:30",
        status: "Interview",
    },
    {
        id: "application-1005",
        candidate: "Vikram Singh",
        title: "Backend Developer",
        company: "Demo Technologies",
        appliedAt: "2026-10-16T14:00:00+05:30",
        status: "Selected",
    },
    {
        id: "application-1006",
        candidate: "Sneha Rao",
        title: "React Developer Intern",
        company: "Demo Technologies",
        appliedAt: "2026-10-16T10:45:00+05:30",
        status: "Rejected",
    },
    {
        id: "application-1007",
        candidate: "Priya Das",
        title: "MERN Stack Developer",
        company: "Sample Digital",
        appliedAt: "2026-10-15T12:30:00+05:30",
        status: "Under Review",
    },
    {
        id: "application-1008",
        candidate: "Rohan Patel",
        title: "Frontend Developer",
        company: "Demo Technologies",
        appliedAt: "2026-10-14T16:00:00+05:30",
        status: "Shortlisted",
    },
];

const demoActivities = [
    {
        id: "activity-1",
        title: "New application received",
        description: "Aarav Sharma applied for MERN Stack Developer.",
        at: "2026-10-18T10:30:00+05:30",
        icon: "fa-regular fa-file-lines",
        tone: "blue",
        path: "/manage/manage-applications",
    },
    {
        id: "activity-2",
        title: "Application moved to review",
        description: "Priya Das · Frontend Developer",
        at: "2026-10-18T10:00:00+05:30",
        icon: "fa-regular fa-clock",
        tone: "amber",
        path: "/manage/manage-applications",
    },
    {
        id: "activity-3",
        title: "Candidate shortlisted",
        description: "Rohan Patel · UI/UX Designer",
        at: "2026-10-17T17:00:00+05:30",
        icon: "fa-solid fa-user-check",
        tone: "green",
        path: "/manage/manage-applications",
    },
    {
        id: "activity-4",
        title: "Vacancy published",
        description: "React Developer Intern is now open for applications.",
        at: "2026-10-17T09:00:00+05:30",
        icon: "fa-solid fa-briefcase",
        tone: "purple",
        path: "/manage/manage-vacancies",
    },
];

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

function Dashboard({
    user,
    jobs = demoJobs,
    vacancies = demoVacancies,
    applications = demoApplications,
    users = demoUsers,
    activities = demoActivities,
}) {
    const outletContext = useOutletContext();
    const currentUser = user ?? outletContext?.user;
    const firstName = currentUser?.name?.trim().split(/\s+/)[0];

    const jobList = Array.isArray(jobs) ? jobs : [];
    const vacancyList = Array.isArray(vacancies) ? vacancies : [];
    const applicationList = Array.isArray(applications) ? applications : [];
    const userList = Array.isArray(users) ? users : [];
    const activityList = Array.isArray(activities) ? activities : [];

    // Count all application statuses in one pass.
    const statusCounts = applicationList.reduce((counts, application) => {
        const status = application.status || "Unknown";

        counts[status] = (counts[status] || 0) + 1;

        return counts;
    }, Object.create(null));

    // Defined inside Dashboard before cards and chart calculations.
    const countStatus = (statuses) =>
        statuses.reduce(
            (total, status) => total + (statusCounts[status] || 0),
            0,
        );

    const pendingCount = countStatus(["Submitted", "Under Review"]);

    const publishedCount = vacancyList.filter(
        (vacancy) => vacancy.status === "Published",
    ).length;

    const totalUsers = userList.filter(
        (account) => account.role === "user",
    ).length;

    const recentApplications = [...applicationList]
        .sort(
            (first, second) =>
                getTimestamp(second.appliedAt) - getTimestamp(first.appliedAt),
        )
        .slice(0, 5);

    const recentActivities = [...activityList]
        .sort(
            (first, second) => getTimestamp(second.at) - getTimestamp(first.at),
        )
        .slice(0, 4);

    const overviewCards = [
        {
            label: "Client Jobs",
            value: jobList.length,
            description: `${jobList.filter((job) => job.status === "Published").length} currently published`,
            icon: "fa-solid fa-briefcase",
            tone: "blue",
            path: "/manage/manage-jobs",
        },
        {
            label: "Internal Vacancies",
            value: vacancyList.length,
            description: `${publishedCount} currently published`,
            icon: "fa-solid fa-briefcase",
            tone: "blue",
            path: "/manage/manage-vacancies",
        },
        {
            label: "Total Applications",
            value: applicationList.length,
            description: "Across client jobs and internal vacancies",
            icon: "fa-regular fa-file-lines",
            tone: "purple",
            path: "/manage/manage-applications",
        },
        {
            label: "Registered Users",
            value: totalUsers,
            description: "Candidate accounts",
            icon: "fa-solid fa-users",
            tone: "teal",
            path: "/manage/manage-users",
        },
    ];

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
            value: countStatus(["Shortlisted"]),
            description: "Currently shortlisted",
            icon: "fa-solid fa-user-check",
            tone: "blue",
        },
        {
            label: "Selected",
            value: countStatus(["Selected"]),
            description: "Marked as selected",
            icon: "fa-solid fa-circle-check",
            tone: "green",
        },
        {
            label: "Rejected",
            value: countStatus(["Rejected"]),
            description: "Not moving forward",
            icon: "fa-regular fa-circle-xmark",
            tone: "red",
        },
    ];

    const statusChart = chartStatuses.map((status) => {
        const count = countStatus([status.label]);

        return {
            ...status,
            count,
            percentage: applicationList.length
                ? (count / applicationList.length) * 100
                : 0,
        };
    });

    // Keep unexpected statuses represented in the chart total.
    const knownStatusCount = statusChart.reduce(
        (total, status) => total + status.count,
        0,
    );

    const otherStatusCount = applicationList.length - knownStatusCount;

    if (otherStatusCount > 0) {
        statusChart.push({
            label: "Other / Unknown",
            className: "other",
            count: otherStatusCount,
            percentage: (otherStatusCount / applicationList.length) * 100,
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

                <Button
                    component={Link}
                    to="/manage/manage-jobs"
                    variant="outlined"
                    className="panel-button panel-button-outline"
                    startIcon={
                        <i
                            className="fa-solid fa-briefcase"
                            aria-hidden="true"
                        />
                    }
                >
                    Manage Jobs
                </Button>
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
                        <strong>{applicationList.length}</strong>
                        total applications
                    </span>
                </header>

                {applicationList.length > 0 ? (
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
