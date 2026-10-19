import { useState } from "react";
import {
    Alert,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
} from "@mui/material";

const STORAGE_KEY = "rms-demo-enquiries-v1";

const DEMO_ENQUIRIES = [
    {
        id: "enquiry-1001",
        name: "Aarav Sharma",
        email: "aarav@example.com",
        phone: "9000000001",
        subject: "Question about MERN developer opportunities",
        message:
            "Hello Team,\n\nI have two years of experience in React and Node.js. " +
            "I would like to know whether you have any suitable opportunities " +
            "in Bengaluru or remote roles.\n\nThank you.",
        submittedAt: "2026-10-19T09:15:00+05:30",
    },
    {
        id: "enquiry-1002",
        name: "Priya Das",
        email: "priya@example.com",
        phone: "9000000002",
        subject: "Application process enquiry",
        message:
            "Hello,\n\nCould you please explain the application process for " +
            "the Frontend Developer vacancy? I would also like to know " +
            "which documents are required.\n\nRegards,\nPriya",
        submittedAt: "2026-10-18T15:30:00+05:30",
    },
    {
        id: "enquiry-1003",
        name: "Rohan Patel",
        email: "rohan@example.com",
        phone: "",
        subject: "Recruitment support for our company",
        message:
            "Hi Team,\n\nWe are looking for recruitment support for our " +
            "design and engineering teams. Please share the process for " +
            "discussing our hiring requirements.\n\nThank you.",
        submittedAt: "2026-10-17T11:45:00+05:30",
    },
    {
        id: "enquiry-1004",
        name: "Ananya Mishra",
        email: "ananya@example.com",
        phone: "9000000004",
        subject: "Internship opportunities",
        message:
            "Hello Team,\n\nI am a recent graduate and interested in frontend " +
            "development internships. Are freshers eligible to apply for " +
            "your current openings?",
        submittedAt: "2026-10-16T10:00:00+05:30",
    },
];

function loadEnquiries() {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            return {
                enquiries: DEMO_ENQUIRIES,
                error: "",
            };
        }

        const parsed = JSON.parse(stored);

        const valid =
            Array.isArray(parsed) &&
            parsed.every(
                (enquiry) =>
                    enquiry &&
                    [
                        "id",
                        "name",
                        "email",
                        "subject",
                        "message",
                        "submittedAt",
                    ].every(
                        (key) => typeof enquiry[key] === "string"
                    ) &&
                    !Number.isNaN(
                        new Date(enquiry.submittedAt).getTime()
                    )
            );

        if (!valid) {
            throw new Error("Invalid enquiry data");
        }

        return {
            enquiries: parsed,
            error: "",
        };
    } catch {
        return {
            enquiries: [],
            error:
                "Saved enquiries could not be loaded. Existing records " +
                "have not been changed. Check browser storage and refresh.",
        };
    }
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

function formatDate(value, includeTime = false) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
        ...(includeTime
            ? {
                  hour: "numeric",
                  minute: "2-digit",
              }
            : {}),
    }).format(date);
}

// Produces YYYY-MM-DD in the same timezone used for display.
function getDateKey(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}`;
}

function ContactDetail({ label, value }) {
    return (
        <div className="me-detail">
            <dt>{label}</dt>
            <dd>{value || "Not provided"}</dd>
        </div>
    );
}

function ManageEnquiries() {
    const [data, setData] = useState(loadEnquiries);

    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [selectedId, setSelectedId] = useState(null);

    const enquiries = data.enquiries;

    const selectedEnquiry = enquiries.find(
        (enquiry) => enquiry.id === selectedId
    );

    const today = getDateKey(new Date());
    const currentMonth = today.slice(0, 7);

    const todayCount = enquiries.filter(
        (enquiry) => getDateKey(enquiry.submittedAt) === today
    ).length;

    const monthCount = enquiries.filter(
        (enquiry) =>
            getDateKey(enquiry.submittedAt).slice(0, 7) === currentMonth
    ).length;

    const uniqueSenders = new Set(
        enquiries.map((enquiry) =>
            enquiry.email.trim().toLowerCase()
        )
    ).size;

    const metrics = [
        {
            label: "Total enquiries",
            value: enquiries.length,
            detail: "Website contact submissions",
            icon: "fa-regular fa-envelope",
            tone: "blue",
        },
        {
            label: "Received today",
            value: todayCount,
            detail: "Today's submissions",
            icon: "fa-regular fa-calendar-check",
            tone: "green",
        },
        {
            label: "This month",
            value: monthCount,
            detail: "Current calendar month",
            icon: "fa-regular fa-calendar",
            tone: "amber",
        },
        {
            label: "Unique senders",
            value: uniqueSenders,
            detail: "Distinct email addresses",
            icon: "fa-solid fa-users",
            tone: "blue",
        },
    ];

    const invalidDateRange = Boolean(
        fromDate && toDate && fromDate > toDate
    );

    const query = search.trim().toLowerCase();

    const filteredEnquiries = enquiries
        .filter((enquiry) => {
            if (invalidDateRange) return false;

            const matchesSearch = [
                enquiry.name,
                enquiry.email,
                enquiry.phone,
                enquiry.subject,
                enquiry.message,
                enquiry.id,
            ].some((value) =>
                String(value || "").toLowerCase().includes(query)
            );

            const submittedDate = getDateKey(enquiry.submittedAt);

            const matchesFromDate =
                !fromDate || submittedDate >= fromDate;

            const matchesToDate =
                !toDate || submittedDate <= toDate;

            return (
                matchesSearch &&
                matchesFromDate &&
                matchesToDate
            );
        })
        .sort(
            (first, second) =>
                new Date(second.submittedAt).getTime() -
                new Date(first.submittedAt).getTime()
        );

    const visibleEnquiries = filteredEnquiries.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    function resetFilters() {
        setSearch("");
        setFromDate("");
        setToDate("");
        setPage(0);
    }

    function refreshEnquiries() {
        setData(loadEnquiries());
        setPage(0);
    }

    return (
        <div className="manage-jobs manage-enquiries">
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">
                        WEBSITE COMMUNICATION
                    </span>

                    <h1>Manage Enquiries</h1>

                    <p>
                        Review messages received through your contact form.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outlined"
                    onClick={refreshEnquiries}
                    startIcon={
                        <i
                            className="fa-solid fa-arrows-rotate"
                            aria-hidden="true"
                        />
                    }
                >
                    Refresh
                </Button>
            </header>

            {data.error && (
                <Alert severity="error" className="mj-alert">
                    {data.error}
                </Alert>
            )}

            <section
                className="mj-metrics"
                aria-label="Enquiry overview"
            >
                {metrics.map((metric) => (
                    <article
                        key={metric.label}
                        className={`mj-metric mj-tone-${metric.tone}`}
                    >
                        <div className="mj-metric-top">
                            <span className="mj-metric-label">
                                {metric.label}
                            </span>

                            <span
                                className="mj-metric-icon"
                                aria-hidden="true"
                            >
                                <i className={metric.icon} />
                            </span>
                        </div>

                        <strong>{metric.value}</strong>
                        <p>{metric.detail}</p>
                    </article>
                ))}
            </section>

            <section
                className="mj-card"
                aria-labelledby="me-list-title"
            >
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span
                            className="mj-header-icon"
                            aria-hidden="true"
                        >
                            <i className="fa-regular fa-comments" />
                        </span>

                        <div>
                            <h2 id="me-list-title">
                                Website enquiries
                            </h2>

                            <p>
                                View sender details and read their complete message.
                            </p>
                        </div>
                    </div>

                    <span
                        className="mj-result-count"
                        aria-live="polite"
                    >
                        {filteredEnquiries.length} of{" "}
                        {enquiries.length} enquiries
                    </span>
                </header>

                <div className="me-filters">
                    <TextField
                        label="Search enquiries"
                        placeholder="Name, email, subject or message"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                        size="small"
                        fullWidth
                    />

                    <TextField
                        label="From date"
                        type="date"
                        value={fromDate}
                        onChange={(event) => {
                            setFromDate(event.target.value);
                            setPage(0);
                        }}
                        slotProps={{ inputLabel: { shrink: true }, }}
                        error={invalidDateRange}
                        size="small"
                        fullWidth
                    />

                    <TextField
                        label="To date"
                        type="date"
                        value={toDate}
                        onChange={(event) => {
                            setToDate(event.target.value);
                            setPage(0);
                        }}
                        slotProps={{ inputLabel: { shrink: true }, }}
                        error={invalidDateRange}
                        helperText={
                            invalidDateRange
                                ? "Choose a date on or after From date."
                                : undefined
                        }
                        size="small"
                        fullWidth
                    />

                    <Button
                        type="button"
                        variant="outlined"
                        onClick={resetFilters}
                    >
                        Reset
                    </Button>
                </div>

                <TableContainer>
                    <Table
                        className="mj-table me-table"
                        aria-label="Contact form enquiries"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Sender</TableCell>
                                <TableCell>Subject & message</TableCell>
                                <TableCell>Phone</TableCell>
                                <TableCell>Received on</TableCell>
                                <TableCell align="right">
                                    Action
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleEnquiries.map((enquiry) => (
                                <TableRow key={enquiry.id} hover>
                                    <TableCell>
                                        <div className="mj-job-cell">
                                            <span
                                                className="mj-company-avatar"
                                                aria-hidden="true"
                                            >
                                                {getInitials(enquiry.name)}
                                            </span>

                                            <div>
                                                <strong>
                                                    {enquiry.name}
                                                </strong>

                                                <p>{enquiry.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="me-message-cell">
                                            <strong>
                                                {enquiry.subject}
                                            </strong>

                                            <p>
                                                {enquiry.message}
                                            </p>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="mj-cell-primary">
                                            {enquiry.phone ||
                                                "Not provided"}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <time
                                            className="me-date"
                                            dateTime={enquiry.submittedAt}
                                        >
                                            {formatDate(enquiry.submittedAt)}
                                        </time>
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            type="button"
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                                setSelectedId(enquiry.id)
                                            }
                                            aria-label={`View enquiry from ${enquiry.name}: ${enquiry.subject}`}
                                            startIcon={
                                                <i
                                                    className="fa-regular fa-eye"
                                                    aria-hidden="true"
                                                />
                                            }
                                        >
                                            View message
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visibleEnquiries.length && (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <div className="mj-empty">
                                            <span aria-hidden="true">
                                                <i className="fa-regular fa-envelope-open" />
                                            </span>

                                            <h3>
                                                {invalidDateRange
                                                    ? "Check the date range"
                                                    : enquiries.length
                                                      ? "No matching enquiries"
                                                      : "No enquiries yet"}
                                            </h3>

                                            <p>
                                                {invalidDateRange
                                                    ? "The end date must be on or after the start date."
                                                    : enquiries.length
                                                      ? "Try another search or date range."
                                                      : "Website contact messages will appear here."}
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
                    count={filteredEnquiries.length}
                    page={page}
                    onPageChange={(_, nextPage) =>
                        setPage(nextPage)
                    }
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(
                            Number(event.target.value)
                        );
                        setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25]}
                />
            </section>

            <Dialog
                open={Boolean(selectedEnquiry)}
                onClose={() => setSelectedId(null)}
                maxWidth="md"
                fullWidth
                className="me-dialog"
                aria-labelledby="me-dialog-title"
            >
                {selectedEnquiry && (
                    <>
                        <DialogTitle id="me-dialog-title">
                            Enquiry details
                        </DialogTitle>

                        <DialogContent dividers>
                            <div className="me-sender-banner">
                                <span
                                    className="me-avatar"
                                    aria-hidden="true"
                                >
                                    {getInitials(
                                        selectedEnquiry.name
                                    )}
                                </span>

                                <div className="me-sender-copy">
                                    <h2>
                                        {selectedEnquiry.name}
                                    </h2>

                                    <p>
                                        {selectedEnquiry.email}
                                    </p>

                                    <span>
                                        {selectedEnquiry.id}
                                    </span>
                                </div>

                                <Chip
                                    label="Website contact"
                                    color="primary"
                                    size="small"
                                    variant="outlined"
                                />
                            </div>

                            <section className="me-section">
                                <h3>Contact information</h3>

                                <dl className="me-detail-grid">
                                    <ContactDetail
                                        label="Full name"
                                        value={selectedEnquiry.name}
                                    />

                                    <ContactDetail
                                        label="Email address"
                                        value={selectedEnquiry.email}
                                    />

                                    <ContactDetail
                                        label="Phone number"
                                        value={selectedEnquiry.phone}
                                    />

                                    <ContactDetail
                                        label="Submitted on"
                                        value={formatDate(
                                            selectedEnquiry.submittedAt,
                                            true
                                        )}
                                    />
                                </dl>
                            </section>

                            <section className="me-section">
                                <h3>Message</h3>

                                <div className="me-message-panel">
                                    <div className="me-subject">
                                        <span>SUBJECT</span>
                                        <h4>
                                            {selectedEnquiry.subject}
                                        </h4>
                                    </div>

                                    <p className="me-full-message">
                                        {selectedEnquiry.message}
                                    </p>
                                </div>
                            </section>
                        </DialogContent>

                        <DialogActions>
                            <Button
                                variant="outlined"
                                onClick={() => setSelectedId(null)}
                            >
                                Close
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </div>
    );
}

export default ManageEnquiries;