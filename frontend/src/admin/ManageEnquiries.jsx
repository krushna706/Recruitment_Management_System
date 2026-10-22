
import { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Chip,
    CircularProgress,
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

import api from "../services/api";

// ================== ENQUIRY CONFIGURATION ==================
const INITIAL_COUNTS = {
    total: 0,
    today: 0,
    thisMonth: 0,
    uniqueSenders: 0,
};

// ================== API ERROR MESSAGE ==================
function getErrorMessage(error, fallback) {
    return error.response?.data?.message || fallback;
}

// ================== SENDER INITIALS ==================
function getInitials(name = "") {
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

// ================== DATE FORMATTING ==================
// Display MongoDB timestamps in Indian Standard Time.
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
            ? {
                  hour: "numeric",
                  minute: "2-digit",
              }
            : {}),
    }).format(date);
}

// ================== CONTACT DETAIL ==================
function ContactDetail({ label, value }) {
    return (
        <div className="me-detail">
            <dt>{label}</dt>
            <dd>{value || "Not provided"}</dd>
        </div>
    );
}

// ================== MANAGE ENQUIRIES PAGE ==================
function ManageEnquiries() {
    // ================== ENQUIRY DATA ==================
    const [enquiries, setEnquiries] = useState([]);
    const [counts, setCounts] = useState(INITIAL_COUNTS);
    const [total, setTotal] = useState(0);

    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");

    // ================== SEARCH AND FILTERS ==================
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [listRevision, setListRevision] = useState(0);

    // ================== ENQUIRY DETAILS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);

    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState("");
    const [detailsRevision, setDetailsRevision] = useState(0);

    // ================== DATE RANGE VALIDATION ==================
    const invalidDateRange = Boolean(
        fromDate && toDate && fromDate > toDate
    );

    // ================== DEBOUNCED SEARCH ==================
    // Avoid sending an API request on every keystroke.
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search]);

    // ================== FETCH MONGODB ENQUIRIES ==================
    // Search, date filters and pagination are handled by the backend.
    useEffect(() => {
        if (invalidDateRange) {
            setEnquiries([]);
            setTotal(0);
            setListError("");
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        let active = true;

        async function fetchEnquiries() {
            setLoading(true);
            setListError("");

            try {
                const params = {
                    page: page + 1,
                    limit: rowsPerPage,
                };

                if (debouncedSearch) {
                    params.search = debouncedSearch;
                }

                if (fromDate) {
                    params.fromDate = fromDate;
                }

                if (toDate) {
                    params.toDate = toDate;
                }

                // ================== ADMIN ENQUIRIES API ==================
                const { data } = await api.get(
                    "/contact/admin",
                    {
                        params,
                        signal: controller.signal,
                    }
                );

                if (!active) return;

                if (
                    !data?.success ||
                    !Array.isArray(data.enquiries) ||
                    !data.pagination ||
                    !data.counts
                ) {
                    throw new Error(
                        "Invalid enquiry response received."
                    );
                }

                const nextTotal = Number(
                    data.pagination.total
                );

                if (
                    !Number.isSafeInteger(nextTotal) ||
                    nextTotal < 0
                ) {
                    throw new Error(
                        "Invalid enquiry pagination data."
                    );
                }

                // ================== PAGINATION CORRECTION ==================
                // Move to the last available page when records change.
                const lastPage = Math.max(
                    0,
                    Math.ceil(nextTotal / rowsPerPage) - 1
                );

                if (page > lastPage) {
                    setPage(lastPage);
                    return;
                }

                setEnquiries(data.enquiries);
                setTotal(nextTotal);

                // These counts represent the complete database.
                setCounts({
                    total: Number(data.counts.total) || 0,
                    today: Number(data.counts.today) || 0,
                    thisMonth:
                        Number(data.counts.thisMonth) || 0,
                    uniqueSenders:
                        Number(data.counts.uniqueSenders) || 0,
                });
            } catch (error) {
                if (!active) return;

                setEnquiries([]);
                setTotal(0);

                setListError(
                    getErrorMessage(
                        error,
                        "Unable to load enquiries. Please try again."
                    )
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        fetchEnquiries();

        return () => {
            active = false;
            controller.abort();
        };
    }, [
        debouncedSearch,
        fromDate,
        toDate,
        page,
        rowsPerPage,
        listRevision,
        invalidDateRange,
    ]);

    // ================== FETCH ENQUIRY DETAILS ==================
    // Load the complete enquiry from the protected admin API.
    useEffect(() => {
        if (!selectedId) return;

        const controller = new AbortController();
        let active = true;

        async function fetchEnquiryDetails() {
            setDetailsLoading(true);
            setDetailsError("");
            setSelectedEnquiry(null);

            try {
                const { data } = await api.get(
                    `/contact/admin/${encodeURIComponent(selectedId)}`,
                    {
                        signal: controller.signal,
                    }
                );

                if (!active) return;

                if (!data?.success || !data.enquiry) {
                    throw new Error(
                        "Invalid enquiry details received."
                    );
                }

                setSelectedEnquiry(data.enquiry);
            } catch (error) {
                if (!active) return;

                setDetailsError(
                    getErrorMessage(
                        error,
                        "Unable to load enquiry details."
                    )
                );
            } finally {
                if (active) {
                    setDetailsLoading(false);
                }
            }
        }

        fetchEnquiryDetails();

        return () => {
            active = false;
            controller.abort();
        };
    }, [selectedId, detailsRevision]);

    // ================== ENQUIRY METRICS ==================
    const metrics = [
        {
            label: "Total enquiries",
            value: counts.total,
            detail: "Website contact submissions",
            icon: "fa-regular fa-envelope",
            tone: "blue",
        },
        {
            label: "Received today",
            value: counts.today,
            detail: "Today's submissions",
            icon: "fa-regular fa-calendar-check",
            tone: "green",
        },
        {
            label: "This month",
            value: counts.thisMonth,
            detail: "Current calendar month",
            icon: "fa-regular fa-calendar",
            tone: "amber",
        },
        {
            label: "Unique senders",
            value: counts.uniqueSenders,
            detail: "Distinct email addresses",
            icon: "fa-solid fa-users",
            tone: "blue",
        },
    ];

    // ================== RESET FILTERS ==================
    function resetFilters() {
        setSearch("");
        setDebouncedSearch("");
        setFromDate("");
        setToDate("");
        setPage(0);
    }

    // ================== REFRESH ENQUIRIES ==================
    function refreshEnquiries() {
        setPage(0);
        setListRevision((previous) => previous + 1);
    }

    // ================== OPEN ENQUIRY DETAILS ==================
    function openEnquiry(enquiry) {
        setSelectedEnquiry(null);
        setDetailsError("");
        setSelectedId(enquiry.enquiryId || enquiry.id);
    }

    // ================== CLOSE ENQUIRY DETAILS ==================
    function closeEnquiry() {
        setSelectedId(null);
        setSelectedEnquiry(null);
        setDetailsError("");
    }

    // ================== EMPTY TABLE MESSAGE ==================
    const hasFilters = Boolean(
        debouncedSearch || fromDate || toDate
    );

    const emptyTitle = invalidDateRange
        ? "Check the date range"
        : listError
          ? "Unable to load enquiries"
          : hasFilters
            ? "No matching enquiries"
            : "No enquiries yet";

    const emptyDescription = invalidDateRange
        ? "The end date must be on or after the start date."
        : listError
          ? "Use Refresh to try loading the records again."
          : hasFilters
            ? "Try another search or date range."
            : "Website contact messages will appear here.";

    return (
        <div className="manage-jobs manage-enquiries">
            {/* ================== PAGE HEADING ================== */}
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
                    disabled={loading}
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

            {/* ================== API ERROR ================== */}
            {listError && (
                <Alert severity="error" className="mj-alert">
                    {listError}
                </Alert>
            )}

            {/* ================== ENQUIRY STATISTICS ================== */}
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

            {/* ================== ENQUIRY LIST ================== */}
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
                        {loading
                            ? "Loading enquiries..."
                            : `${total} of ${counts.total} enquiries`}
                    </span>
                </header>

                {/* ================== SEARCH AND DATE FILTERS ================== */}
                <div className="me-filters">
                    <TextField
                        label="Search enquiries"
                        placeholder="Name, email, subject or message"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                        slotProps={{
                            htmlInput: {
                                maxLength: 100,
                            },
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
                        slotProps={{
                            inputLabel: {
                                shrink: true,
                            },
                        }}
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
                        slotProps={{
                            inputLabel: {
                                shrink: true,
                            },
                        }}
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

                {/* ================== ENQUIRIES TABLE ================== */}
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
                            {/* ================== LOADING STATE ================== */}
                            {loading && (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        align="center"
                                        sx={{ py: 6 }}
                                    >
                                        <CircularProgress size={26} />

                                        <p>Loading enquiries...</p>
                                    </TableCell>
                                </TableRow>
                            )}

                            {/* ================== DATABASE ENQUIRIES ================== */}
                            {!loading &&
                                !invalidDateRange &&
                                enquiries.map((enquiry) => (
                                    <TableRow
                                        key={enquiry._id || enquiry.enquiryId}
                                        hover
                                    >
                                        <TableCell>
                                            <div className="mj-job-cell">
                                                <span
                                                    className="mj-company-avatar"
                                                    aria-hidden="true"
                                                >
                                                    {getInitials(
                                                        enquiry.name
                                                    )}
                                                </span>

                                                <div>
                                                    <strong>
                                                        {enquiry.name}
                                                    </strong>

                                                    <p>
                                                        {enquiry.email}
                                                    </p>
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
                                                {formatDate(
                                                    enquiry.submittedAt
                                                )}
                                            </time>
                                        </TableCell>

                                        <TableCell align="right">
                                            <Button
                                                type="button"
                                                size="small"
                                                variant="outlined"
                                                onClick={() =>
                                                    openEnquiry(enquiry)
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

                            {/* ================== EMPTY STATE ================== */}
                            {!loading &&
                                (invalidDateRange ||
                                    enquiries.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5}>
                                            <div className="mj-empty">
                                                <span aria-hidden="true">
                                                    <i className="fa-regular fa-envelope-open" />
                                                </span>

                                                <h3>{emptyTitle}</h3>

                                                <p>
                                                    {emptyDescription}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ================== SERVER PAGINATION ================== */}
                <TablePagination
                    component="div"
                    count={invalidDateRange ? 0 : total}
                    page={invalidDateRange ? 0 : page}
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
                    slotProps={{
                        actions: {
                            nextButton: {
                                disabled: loading || invalidDateRange,
                            },
                            previousButton: {
                                disabled: loading || invalidDateRange,
                            },
                        },
                    }}
                />
            </section>

            {/* ================== ENQUIRY DETAILS DIALOG ================== */}
            <Dialog
                open={Boolean(selectedId)}
                onClose={closeEnquiry}
                maxWidth="md"
                fullWidth
                className="me-dialog"
                aria-labelledby="me-dialog-title"
            >
                <DialogTitle id="me-dialog-title">
                    Enquiry details
                </DialogTitle>

                <DialogContent dividers>
                    {/* ================== DETAILS LOADING ================== */}
                    {detailsLoading && (
                        <div
                            style={{
                                padding: 32,
                                textAlign: "center",
                            }}
                        >
                            <CircularProgress size={26} />

                            <p>Loading enquiry details...</p>
                        </div>
                    )}

                    {/* ================== DETAILS API ERROR ================== */}
                    {!detailsLoading && detailsError && (
                        <Alert
                            severity="error"
                            action={
                                <Button
                                    type="button"
                                    color="inherit"
                                    size="small"
                                    onClick={() =>
                                        setDetailsRevision(
                                            (previous) => previous + 1
                                        )
                                    }
                                >
                                    Retry
                                </Button>
                            }
                        >
                            {detailsError}
                        </Alert>
                    )}

                    {/* ================== COMPLETE ENQUIRY ================== */}
                    {!detailsLoading &&
                        selectedEnquiry &&
                        !detailsError && (
                            <>
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
                                            {selectedEnquiry.enquiryId}
                                        </span>
                                    </div>

                                    <Chip
                                        label="Website contact"
                                        color="primary"
                                        size="small"
                                        variant="outlined"
                                    />
                                </div>

                                {/* ================== CONTACT INFORMATION ================== */}
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

                                {/* ================== COMPLETE MESSAGE ================== */}
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
                            </>
                        )}
                </DialogContent>

                <DialogActions>
                    <Button
                        type="button"
                        variant="outlined"
                        onClick={closeEnquiry}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

// ================== EXPORT ==================
export default ManageEnquiries;
