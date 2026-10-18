import { useState } from "react";
import {
    Alert,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";

const STORAGE_KEY = "rms-demo-applications-v1";

const STATUSES = [
    "Submitted",
    "Under Review",
    "Shortlisted",
    "Interview",
    "Selected",
    "Rejected",
];

const NEXT_STATUS = {
    Submitted: "Under Review",
    "Under Review": "Shortlisted",
    Shortlisted: "Interview",
    Interview: "Selected",
};

const STATUS_COLORS = {
    Submitted: "info",
    "Under Review": "warning",
    Shortlisted: "primary",
    Interview: "secondary",
    Selected: "success",
    Rejected: "error",
};

const DEMO_APPLICATIONS = [
    {
        id: "application-1001",
        candidate: "Aarav Sharma",
        email: "aarav@example.com",
        phone: "9000000001",
        qualification: "B.Tech — Computer Science",
        experience: "2 years",
        skills: "React, Node.js, Express, MongoDB",
        jobId: "demo-job-1",
        title: "MERN Stack Developer",
        company: "Sample Digital",
        openingType: "client",
        department: "Engineering",
        location: "Bengaluru, Karnataka",
        mode: "Hybrid",
        appliedAt: "2026-10-18T10:30:00+05:30",
        status: "Submitted",
        resumeUrl: "",
        history: [
            {
                status: "Submitted",
                at: "2026-10-18T10:30:00+05:30",
                message: "Application received.",
            },
        ],
    },
    {
        id: "application-1002",
        candidate: "Priya Das",
        email: "priya@example.com",
        phone: "9000000002",
        qualification: "B.Sc — Computer Science",
        experience: "1 year",
        skills: "React, JavaScript, CSS",
        jobId: "demo-vacancy-1",
        title: "Frontend Developer",
        company: "",
        openingType: "internal",
        department: "Engineering",
        location: "Bhubaneswar, Odisha",
        mode: "On-site",
        appliedAt: "2026-10-17T09:15:00+05:30",
        status: "Under Review",
        resumeUrl: "",
        history: [
            {
                status: "Submitted",
                at: "2026-10-17T09:15:00+05:30",
                message: "Application received.",
            },
            {
                status: "Under Review",
                at: "2026-10-18T11:00:00+05:30",
                message: "Your profile is being reviewed.",
            },
        ],
    },
    {
        id: "application-1003",
        candidate: "Rohan Patel",
        email: "rohan@example.com",
        phone: "9000000003",
        qualification: "Bachelor of Design",
        experience: "2 years",
        skills: "Figma, Prototyping, User Research",
        jobId: "demo-job-2",
        title: "UI/UX Designer",
        company: "Sample Design Studio",
        openingType: "client",
        department: "Design",
        location: "Pune, Maharashtra",
        mode: "Remote",
        appliedAt: "2026-10-15T12:00:00+05:30",
        status: "Shortlisted",
        resumeUrl: "",
        history: [
            {
                status: "Submitted",
                at: "2026-10-15T12:00:00+05:30",
                message: "Application received.",
            },
            {
                status: "Under Review",
                at: "2026-10-16T10:00:00+05:30",
                message: "",
            },
            {
                status: "Shortlisted",
                at: "2026-10-17T15:00:00+05:30",
                message: "Your profile has been shortlisted.",
            },
        ],
    },
];

function loadApplications() {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            return { applications: DEMO_APPLICATIONS, error: "" };
        }

        const parsed = JSON.parse(stored);

        const valid =
            Array.isArray(parsed) &&
            parsed.every(
                (item) =>
                    item &&
                    [
                        "id",
                        "candidate",
                        "email",
                        "title",
                        "jobId",
                        "appliedAt",
                    ].every((key) => typeof item[key] === "string") &&
                    ["client", "internal"].includes(item.openingType) &&
                    STATUSES.includes(item.status) &&
                    Array.isArray(item.history) &&
                    item.history.every(
                        (entry) =>
                            entry &&
                            STATUSES.includes(entry.status) &&
                            typeof entry.at === "string" &&
                            typeof entry.message === "string"
                    )
            );

        if (!valid) throw new Error("Invalid application data");

        return { applications: parsed, error: "" };
    } catch {
        return {
            applications: [],
            error:
                "Saved applications could not be loaded. Reload after checking " +
                "browser storage. Existing data has not been overwritten.",
        };
    }
}

function formatDate(value, includeTime = false) {
    const date = new Date(value);

    if (!value || Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
        ...(includeTime
            ? { hour: "numeric", minute: "2-digit" }
            : {}),
    }).format(date);
}

function getInitials(name) {
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join("")
            .toUpperCase() || "?"
    );
}

function getAllowedStatuses(status) {
    if (!NEXT_STATUS[status]) return [];

    return [NEXT_STATUS[status], "Rejected"];
}

function getOpeningKey(application) {
    return `${application.openingType}:${application.jobId}`;
}

function getResumeUrl(value) {
    if (typeof value !== "string" || !value) return "";

    try {
        const url = new URL(value);

        return url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

function StatusChip({ status }) {
    return (
        <Chip
            label={status}
            color={STATUS_COLORS[status] || "default"}
            size="small"
            variant="outlined"
        />
    );
}

function Detail({ label, children }) {
    return (
        <div className="ap-detail">
            <dt>{label}</dt>
            <dd>{children || "Not provided"}</dd>
        </div>
    );
}

function Applications() {
    const [initialData] = useState(loadApplications);
    const [applications, setApplications] = useState(
        initialData.applications
    );

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [jobFilter, setJobFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const [selectedId, setSelectedId] = useState(null);
    const [nextStatus, setNextStatus] = useState("");
    const [message, setMessage] = useState("");

    const selected = applications.find(
        (application) => application.id === selectedId
    );

    const allowedStatuses = selected
        ? getAllowedStatuses(selected.status)
        : [];

    const resumeUrl = getResumeUrl(selected?.resumeUrl);

    const counts = applications.reduce(
        (result, item) => {
            result[item.status] += 1;
            return result;
        },
        Object.fromEntries(STATUSES.map((status) => [status, 0]))
    );

    const metrics = [
        {
            label: "Total applications",
            value: applications.length,
            detail: "Client jobs + internal vacancies",
            icon: "fa-regular fa-file-lines",
            tone: "blue",
        },
        {
            label: "Pending",
            value: counts.Submitted + counts["Under Review"],
            detail: "Submitted + under review",
            icon: "fa-regular fa-clock",
            tone: "amber",
        },
        {
            label: "Selected",
            value: counts.Selected,
            detail: "Completed selections",
            icon: "fa-solid fa-user-check",
            tone: "green",
        },
        {
            label: "Rejected",
            value: counts.Rejected,
            detail: "Not moving forward",
            icon: "fa-regular fa-circle-xmark",
            tone: "red",
        },
    ];

    const jobOptions = [
        ...new Map(
            applications
                .filter(
                    (item) =>
                        typeFilter === "All" ||
                        item.openingType === typeFilter
                )
                .map((item) => [
                    getOpeningKey(item),
                    {
                        value: getOpeningKey(item),
                        label:
                            `${item.title} · ` +
                            (item.openingType === "internal"
                                ? "Internal vacancy"
                                : item.company || "Client job"),
                    },
                ])
        ).values(),
    ];

    const query = search.trim().toLowerCase();

    const filteredApplications = applications
        .filter((item) => {
            const matchesSearch = [
                item.candidate,
                item.email,
                item.title,
                item.company,
                item.id,
            ].some((value) =>
                String(value || "").toLowerCase().includes(query)
            );

            const matchesType =
                typeFilter === "All" ||
                item.openingType === typeFilter;

            const matchesJob =
                jobFilter === "All" ||
                getOpeningKey(item) === jobFilter;

            const matchesStatus =
                statusFilter === "All" ||
                (statusFilter === "Pending"
                    ? ["Submitted", "Under Review"].includes(item.status)
                    : item.status === statusFilter);

            return (
                matchesSearch &&
                matchesType &&
                matchesJob &&
                matchesStatus
            );
        })
        .sort((first, second) =>
            second.appliedAt.localeCompare(first.appliedAt)
        );

    const visibleApplications = filteredApplications.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    function openDetails(application) {
        setSelectedId(application.id);
        setNextStatus("");
        setMessage("");
    }

    function closeDetails() {
        setSelectedId(null);
        setNextStatus("");
        setMessage("");
    }

    function resetFilters() {
        setSearch("");
        setTypeFilter("All");
        setJobFilter("All");
        setStatusFilter("All");
        setPage(0);
    }

    function updateStatus(event) {
        event.preventDefault();

        if (initialData.error || !selected) return;

        if (!getAllowedStatuses(selected.status).includes(nextStatus)) {
            toast.error("Select a valid next status.");
            return;
        }

        const trimmedMessage = message.trim();

        if (trimmedMessage.length > 1000) {
            toast.error("Keep the update message within 1,000 characters.");
            return;
        }

        const now = new Date().toISOString();

        const updatedApplications = applications.map((item) =>
            item.id === selected.id
                ? {
                      ...item,
                      status: nextStatus,
                      updatedAt: now,
                      history: [
                          ...item.history,
                          {
                              status: nextStatus,
                              at: now,
                              message: trimmedMessage,
                          },
                      ],
                  }
                : item
        );

        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(updatedApplications)
            );
        } catch {
            toast.error(
                "Could not save the update. Check browser storage and try again."
            );
            return;
        }

        setApplications(updatedApplications);
        setPage(0);
        setNextStatus("");
        setMessage("");

        toast.success("Application status updated.");
    }

    return (
        <div className="manage-jobs applications-page">
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">
                        CANDIDATE MANAGEMENT
                    </span>

                    <h1>Applications</h1>

                    <p>
                        Review candidates and keep every application moving.
                    </p>
                </div>

                <span className="mj-result-count">
                    Client jobs & internal vacancies
                </span>
            </header>

            {initialData.error && (
                <Alert severity="error" className="mj-alert">
                    {initialData.error}
                </Alert>
            )}

            <section className="mj-metrics" aria-label="Application totals">
                {metrics.map((metric) => (
                    <article
                        key={metric.label}
                        className={`mj-metric mj-tone-${metric.tone}`}
                    >
                        <div className="mj-metric-top">
                            <span className="mj-metric-label">
                                {metric.label}
                            </span>

                            <span className="mj-metric-icon" aria-hidden="true">
                                <i className={metric.icon} />
                            </span>
                        </div>

                        <strong>{metric.value}</strong>
                        <p>{metric.detail}</p>
                    </article>
                ))}
            </section>

            <section className="ap-stage-summary" aria-label="Recruitment stages">
                {STATUSES.map((status) => (
                    <div className="ap-stage-item" key={status}>
                        <span>{status}</span>
                        <strong>{counts[status]}</strong>
                    </div>
                ))}
            </section>

            <section className="mj-card" aria-labelledby="ap-list-title">
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span className="mj-header-icon" aria-hidden="true">
                            <i className="fa-solid fa-users" />
                        </span>

                        <div>
                            <h2 id="ap-list-title">Candidate applications</h2>
                            <p>
                                Open an application to review details and update status.
                            </p>
                        </div>
                    </div>

                    <span className="mj-result-count">
                        {filteredApplications.length} of{" "}
                        {applications.length} applications
                    </span>
                </header>

                <div className="ap-filters">
                    <TextField
                        label="Search applications"
                        placeholder="Candidate, email, job or application ID"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                        className="ap-search"
                        size="small"
                        fullWidth
                    />

                    <TextField
                        label="Opening type"
                        value={typeFilter}
                        onChange={(event) => {
                            setTypeFilter(event.target.value);
                            setJobFilter("All");
                            setPage(0);
                        }}
                        size="small"
                        select
                        fullWidth
                    >
                        <MenuItem value="All">All openings</MenuItem>
                        <MenuItem value="client">Client jobs</MenuItem>
                        <MenuItem value="internal">Internal vacancies</MenuItem>
                    </TextField>

                    <TextField
                        label="Job / vacancy"
                        value={jobFilter}
                        onChange={(event) => {
                            setJobFilter(event.target.value);
                            setPage(0);
                        }}
                        size="small"
                        select
                        fullWidth
                    >
                        <MenuItem value="All">All jobs / vacancies</MenuItem>
                        {jobOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label="Application status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                        size="small"
                        select
                        fullWidth
                    >
                        <MenuItem value="All">All statuses</MenuItem>
                        <MenuItem value="Pending">Pending</MenuItem>
                        {STATUSES.map((status) => (
                            <MenuItem key={status} value={status}>
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        type="button"
                        variant="outlined"
                        onClick={resetFilters}
                    >
                        Reset
                    </Button>
                </div>

                <TableContainer>
                    <Table className="mj-table ap-table" aria-label="Applications">
                        <TableHead>
                            <TableRow>
                                <TableCell>Candidate</TableCell>
                                <TableCell>Applied position</TableCell>
                                <TableCell>Applied on</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleApplications.map((application) => (
                                <TableRow key={application.id} hover>
                                    <TableCell>
                                        <div className="mj-job-cell">
                                            <span
                                                className="mj-company-avatar"
                                                aria-hidden="true"
                                            >
                                                {getInitials(application.candidate)}
                                            </span>

                                            <div>
                                                <strong>{application.candidate}</strong>
                                                <p>{application.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="mj-cell-primary">
                                            {application.title}
                                        </span>

                                        <span className="mj-cell-secondary">
                                            {application.openingType === "internal"
                                                ? "Own company"
                                                : application.company}
                                        </span>

                                        <span className="ap-opening-type">
                                            {application.openingType === "internal"
                                                ? "Internal vacancy"
                                                : "Client job"}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <time dateTime={application.appliedAt}>
                                            {formatDate(application.appliedAt)}
                                        </time>
                                    </TableCell>

                                    <TableCell>
                                        <StatusChip status={application.status} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            type="button"
                                            variant="outlined"
                                            size="small"
                                            onClick={() => openDetails(application)}
                                            aria-label={`View ${application.candidate}'s application for ${application.title}`}
                                            startIcon={
                                                <i
                                                    className="fa-regular fa-eye"
                                                    aria-hidden="true"
                                                />
                                            }
                                        >
                                            View details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visibleApplications.length && (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <div className="mj-empty">
                                            <span aria-hidden="true">
                                                <i className="fa-regular fa-file-lines" />
                                            </span>
                                            <h3>
                                                {applications.length
                                                    ? "No matching applications"
                                                    : "No applications yet"}
                                            </h3>
                                            <p>
                                                {applications.length
                                                    ? "Try another search or filter."
                                                    : "Candidate applications will appear here."}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={filteredApplications.length}
                    page={page}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25]}
                />
            </section>

            <Dialog
                open={Boolean(selected)}
                onClose={closeDetails}
                maxWidth="md"
                fullWidth
                className="ap-dialog"
                aria-labelledby="ap-dialog-title"
            >
                {selected && (
                    <>
                        <DialogTitle id="ap-dialog-title">
                            Application details
                        </DialogTitle>

                        <DialogContent dividers>
                            <div className="ap-candidate-banner">
                                <span className="ap-large-avatar" aria-hidden="true">
                                    {getInitials(selected.candidate)}
                                </span>

                                <div>
                                    <h2>{selected.candidate}</h2>
                                    <p>{selected.title}</p>
                                    <span>{selected.id}</span>
                                </div>

                                <StatusChip status={selected.status} />
                            </div>

                            <section className="ap-detail-section">
                                <h3>Candidate information</h3>

                                <dl className="ap-detail-grid">
                                    <Detail label="Email">{selected.email}</Detail>
                                    <Detail label="Phone">{selected.phone}</Detail>
                                    <Detail label="Qualification">
                                        {selected.qualification}
                                    </Detail>
                                    <Detail label="Experience">
                                        {selected.experience}
                                    </Detail>
                                    <Detail label="Skills">{selected.skills}</Detail>
                                    <Detail label="Applied on">
                                        {formatDate(selected.appliedAt, true)}
                                    </Detail>
                                </dl>

                                {resumeUrl ? (
                                    <Button
                                        component="a"
                                        href={resumeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variant="outlined"
                                        startIcon={
                                            <i
                                                className="fa-regular fa-file-pdf"
                                                aria-hidden="true"
                                            />
                                        }
                                    >
                                        Open resume
                                    </Button>
                                ) : (
                                    <p className="ap-muted">
                                        Resume is not available for this application.
                                    </p>
                                )}
                            </section>

                            <section className="ap-detail-section">
                                <h3>Applied opening</h3>

                                <dl className="ap-detail-grid">
                                    <Detail label="Position">{selected.title}</Detail>
                                    <Detail label="Opening type">
                                        {selected.openingType === "internal"
                                            ? "Internal vacancy"
                                            : "Client job"}
                                    </Detail>
                                    <Detail label="Company">
                                        {selected.openingType === "internal"
                                            ? "Own company"
                                            : selected.company}
                                    </Detail>
                                    <Detail label="Department">
                                        {selected.department}
                                    </Detail>
                                    <Detail label="Location">{selected.location}</Detail>
                                    <Detail label="Work mode">{selected.mode}</Detail>
                                </dl>
                            </section>

                            <section className="ap-detail-section">
                                <h3>Update application status</h3>

                                {allowedStatuses.length ? (
                                    <form onSubmit={updateStatus} className="ap-status-form">
                                        <TextField
                                            label="Next status"
                                            value={nextStatus}
                                            onChange={(event) =>
                                                setNextStatus(event.target.value)
                                            }
                                            select
                                            required
                                            fullWidth
                                            size="small"
                                        >
                                            {allowedStatuses.map((status) => (
                                                <MenuItem key={status} value={status}>
                                                    {status}
                                                </MenuItem>
                                            ))}
                                        </TextField>

                                        <TextField
                                            label="Update message (optional)"
                                            placeholder="Add interview details or a brief update for the candidate."
                                            value={message}
                                            onChange={(event) =>
                                                setMessage(event.target.value)
                                            }
                                            multiline
                                            minRows={3}
                                            fullWidth
                                            size="small"
                                            error={message.trim().length > 1000}
                                            helperText={
                                                "Candidate-facing update. Maximum 1,000 characters."
                                            }
                                        />

                                        {nextStatus === "Rejected" && (
                                            <Alert severity="warning">
                                                Saving will mark this application as rejected.
                                                Further stage changes are disabled in this flow.
                                            </Alert>
                                        )}

                                        <Button
                                            type="submit"
                                            variant="contained"
                                            disableElevation
                                            disabled={
                                                !nextStatus ||
                                                message.trim().length > 1000 ||
                                                Boolean(initialData.error)
                                            }
                                        >
                                            Save status update
                                        </Button>
                                    </form>
                                ) : (
                                    <Alert
                                        severity={
                                            selected.status === "Selected"
                                                ? "success"
                                                : "info"
                                        }
                                    >
                                        This application is {selected.status.toLowerCase()}.
                                        Its recruitment flow is complete.
                                    </Alert>
                                )}
                            </section>

                            <section className="ap-detail-section">
                                <h3>Application history</h3>

                                <ol className="ap-history">
                                    {[...selected.history].reverse().map((entry, index) => (
                                        <li key={`${entry.at}-${index}`}>
                                            <span
                                                className="ap-history-dot"
                                                aria-hidden="true"
                                            />

                                            <div>
                                                <strong>{entry.status}</strong>
                                                <time dateTime={entry.at}>
                                                    {formatDate(entry.at, true)}
                                                </time>

                                                {entry.message && (
                                                    <p>{entry.message}</p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        </DialogContent>

                        <DialogActions>
                            <Button onClick={closeDetails} variant="outlined">
                                Close
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </div>
    );
}

export default Applications;