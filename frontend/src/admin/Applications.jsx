import usePageSEO from "../hooks/usePageSEO";
import { seoPages } from "../config/seoConfig";

import { formatDate, formatFileSize, getErrorMessage, getInitials } from "../utils/dataFormat";
import { openPrivateResume } from "../utils/fileAccess";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField } from "@mui/material";
import { toast } from "react-toastify";

import api from "../services/api";
import { toAdminApplication } from "../utils/dataFormat";

// ================== APPLICATION CONFIGURATION ==================
const STATUSES = ["Submitted", "Under Review", "Shortlisted", "Interview", "Selected", "Rejected"];

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

const INTERVIEW_MODES = ["Online", "In-person", "Phone"];

// ================== ALLOWED STATUS OPTIONS ==================
function getAllowedStatuses(status) {
    if (!NEXT_STATUS[status]) return [];

    return [NEXT_STATUS[status], "Rejected"];
}

// ================== STATUS BADGE ==================
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

// ================== DETAIL FIELD ==================
function Detail({ label, children }) {
    return (
        <div className="ap-detail">
            <dt>{label}</dt>
            <dd>{children || "Not provided"}</dd>
        </div>
    );
}

// ================== APPLICATIONS PAGE ==================
function Applications() {
    usePageSEO(seoPages.manageApplications);
    
    const [applications, setApplications] = useState([]);
    const [counts, setCounts] = useState(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [jobFilter, setJobFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [listRevision, setListRevision] = useState(0);

    const [openings, setOpenings] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [optionsError, setOptionsError] = useState("");
    const [optionsRevision, setOptionsRevision] = useState(0);

    const [selectedId, setSelectedId] = useState(null);
    const [selected, setSelected] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState("");
    const [detailsRevision, setDetailsRevision] = useState(0);

    const [nextStatus, setNextStatus] = useState("");
    const [message, setMessage] = useState("");
    const [interviewAt, setInterviewAt] = useState("");
    const [interviewMode, setInterviewMode] = useState("Online");

    const [saving, setSaving] = useState(false);
    const [resumeAction, setResumeAction] = useState("");

    // Prevent repeated clicks before React finishes updating the UI.
    const savingRef = useRef(false);
    const resumeBusyRef = useRef(false);
    const mountedRef = useRef(false);

    // ================== COMPONENT LIFECYCLE ==================
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    // ================== SEARCH DEBOUNCE ==================
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(0);
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search]);

    // ================== FETCH APPLICATION LIST ==================
    useEffect(() => {
        const controller = new AbortController();

        async function fetchApplications() {
            setLoading(true);
            setListError("");

            const params = {
                page: page + 1,
                limit: rowsPerPage,
            };

            if (debouncedSearch) {
                params.search = debouncedSearch;
            }

            if (typeFilter !== "All") {
                params.openingType = typeFilter;
            }

            if (jobFilter !== "All") {
                params.jobId = jobFilter;
            }

            if (statusFilter !== "All") {
                params.status = statusFilter;
            }

            try {
                const { data } = await api.get("/applications/admin", {
                    params,
                    signal: controller.signal,
                });

                if (controller.signal.aborted) return;

                const lastPage = Math.max(0, data.pagination.totalPages - 1);

                // A status update can remove the last row from a filtered page.
                if (page > lastPage) {
                    setPage(lastPage);
                    return;
                }

                setApplications(data.applications.map(toAdminApplication));
                setTotal(data.pagination.total);
                setCounts(data.counts);
            } catch (error) {
                if (controller.signal.aborted) return;

                setApplications([]);
                setTotal(0);
                setCounts(null);
                setListError(
                    getErrorMessage(error, "Applications could not be loaded. Please try again.")
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchApplications();

        return () => controller.abort();
    }, [page, rowsPerPage, debouncedSearch, typeFilter, jobFilter, statusFilter, listRevision]);

    // ================== FETCH JOB FILTER OPTIONS ==================
    useEffect(() => {
        const controller = new AbortController();

        async function fetchOpeningOptions() {
            setOptionsLoading(true);
            setOptionsError("");

            try {
                const { data } = await api.get("/applications/admin/options", {
                    signal: controller.signal,
                });

                if (controller.signal.aborted) return;

                setOpenings(data.openings);
            } catch (error) {
                if (controller.signal.aborted) return;

                setOptionsError(getErrorMessage(error, "Job filter options could not be loaded."));
            } finally {
                if (!controller.signal.aborted) {
                    setOptionsLoading(false);
                }
            }
        }

        fetchOpeningOptions();

        return () => controller.abort();
    }, [optionsRevision]);

    // ================== FETCH APPLICATION DETAILS ==================
    useEffect(() => {
        if (!selectedId) return;

        const controller = new AbortController();

        async function fetchDetails() {
            setDetailsLoading(true);
            setDetailsError("");
            setSelected(null);

            try {
                const { data } = await api.get(
                    `/applications/admin/${encodeURIComponent(selectedId)}`,
                    { signal: controller.signal }
                );

                if (controller.signal.aborted) return;

                setSelected(toAdminApplication(data.application));
            } catch (error) {
                if (controller.signal.aborted) return;

                setDetailsError(getErrorMessage(error, "Application details could not be loaded."));
            } finally {
                if (!controller.signal.aborted) {
                    setDetailsLoading(false);
                }
            }
        }

        fetchDetails();

        return () => controller.abort();
    }, [selectedId, detailsRevision]);

    // ================== DISPLAY VALUES ==================
    const allowedStatuses = selected ? getAllowedStatuses(selected.status) : [];

    const jobOptions = openings.filter(
        (opening) => typeFilter === "All" || opening.openingType === typeFilter
    );

    const metrics = [
        {
            label: "Total applications",
            value: counts?.total,
            detail: "Client jobs + internal vacancies",
            icon: "fa-regular fa-file-lines",
            tone: "blue",
        },
        {
            label: "Pending",
            value: counts?.pending,
            detail: "Submitted + under review",
            icon: "fa-regular fa-clock",
            tone: "amber",
        },
        {
            label: "Selected",
            value: counts?.selected,
            detail: "Completed selections",
            icon: "fa-solid fa-user-check",
            tone: "green",
        },
        {
            label: "Rejected",
            value: counts?.rejected,
            detail: "Not moving forward",
            icon: "fa-regular fa-circle-xmark",
            tone: "red",
        },
    ];

    const hasFilters =
        Boolean(debouncedSearch) ||
        typeFilter !== "All" ||
        jobFilter !== "All" ||
        statusFilter !== "All";

    // ================== RESET STATUS FORM ==================
    function resetStatusForm() {
        setNextStatus("");
        setMessage("");
        setInterviewAt("");
        setInterviewMode("Online");
    }

    // ================== OPEN APPLICATION ==================
    function openDetails(application) {
        setSelected(null);
        setDetailsError("");
        setDetailsLoading(true);
        resetStatusForm();
        setSelectedId(application.id);
    }

    // ================== CLOSE APPLICATION ==================
    function closeDetails() {
        if (savingRef.current || resumeBusyRef.current) return;

        setSelectedId(null);
        setSelected(null);
        setDetailsError("");
        resetStatusForm();
    }

    // ================== RESET FILTERS ==================
    function resetFilters() {
        setSearch("");
        setDebouncedSearch("");
        setTypeFilter("All");
        setJobFilter("All");
        setStatusFilter("All");
        setPage(0);
    }

    // ================== REFRESH PAGE DATA ==================
    function refreshApplications() {
        setListRevision((value) => value + 1);
        setOptionsRevision((value) => value + 1);
    }

    // ================== UPDATE APPLICATION STATUS ==================
    async function updateStatus(event) {
        event.preventDefault();

        if (!selected || savingRef.current || resumeBusyRef.current) {
            return;
        }

        if (!getAllowedStatuses(selected.status).includes(nextStatus)) {
            toast.error("Select a valid next status.");
            return;
        }

        const trimmedMessage = message.trim();

        if (trimmedMessage.length > 1000) {
            toast.error("Keep the update message within 1,000 characters.");
            return;
        }

        const payload = {
            expectedStatus: selected.status,
            status: nextStatus,
            message: trimmedMessage,
        };

        if (nextStatus === "Interview") {
            const interviewDate = new Date(interviewAt);

            if (
                !interviewAt ||
                !Number.isFinite(interviewDate.getTime()) ||
                interviewDate.getTime() <= Date.now() ||
                !INTERVIEW_MODES.includes(interviewMode)
            ) {
                toast.error("Select a future interview date, time and valid mode.");
                return;
            }

            payload.interview = {
                at: interviewDate.toISOString(),
                mode: interviewMode,
            };
        }

        savingRef.current = true;
        setSaving(true);

        try {
            const { data } = await api.patch(
                `/applications/admin/${encodeURIComponent(selected.id)}/status`,
                payload
            );

            if (!mountedRef.current) return;

            setSelected(toAdminApplication(data.application));
            resetStatusForm();
            setListRevision((value) => value + 1);

            toast.success(data.message || "Application status updated successfully.");
        } catch (error) {
            if (!mountedRef.current) return;

            toast.error(
                getErrorMessage(
                    error,
                    "Status update could not be confirmed. Please check the latest details."
                )
            );

            // A conflict or uncertain response requires fresh server details.
            if (error.response?.status === 409 || !error.response || error.response.status >= 500) {
                resetStatusForm();
                setDetailsRevision((value) => value + 1);
                setListRevision((value) => value + 1);
            }
        } finally {
            savingRef.current = false;

            if (mountedRef.current) {
                setSaving(false);
            }
        }
    }

    // ================== PRIVATE RESUME ACCESS ==================

    // ================== SHARED RESUME PREVIEW / DOWNLOAD ==================
    async function openResume(mode) {
        if (!selected || resumeBusyRef.current || savingRef.current) return;
        if (mode === "view" && selected.resumeMimeType !== "application/pdf") {
            toast.error("Preview is available only for PDF resumes.");
            return;
        }
        resumeBusyRef.current = true;
        setResumeAction(mode);
        try {
            await openPrivateResume({
                endpoint: `/applications/${encodeURIComponent(selected.id)}/resume`,
                filename: selected.resumeName || "Resume",
                mode,
                isActive: () => mountedRef.current,
            });
        } catch (error) {
            if (mountedRef.current) toast.error(error.message || "Resume could not be opened.");
        } finally {
            resumeBusyRef.current = false;
            if (mountedRef.current) setResumeAction("");
        }
    }

    return (
        <div className="manage-jobs applications-page">
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">CANDIDATE MANAGEMENT</span>
                    <h1>Applications</h1>
                    <p>Review candidates and keep every application moving.</p>
                </div>

                <Button
                    type="button"
                    variant="outlined"
                    onClick={refreshApplications}
                    disabled={loading}
                >
                    {loading ? "Loading..." : "Refresh"}
                </Button>
            </header>

            <section className="mj-metrics" aria-label="Application totals">
                {metrics.map((metric) => (
                    <article key={metric.label} className={`mj-metric mj-tone-${metric.tone}`}>
                        <div className="mj-metric-top">
                            <span className="mj-metric-label">{metric.label}</span>

                            <span className="mj-metric-icon" aria-hidden="true">
                                <i className={metric.icon} />
                            </span>
                        </div>

                        <strong>{metric.value ?? "—"}</strong>
                        <p>{metric.detail}</p>
                    </article>
                ))}
            </section>

            <section className="ap-stage-summary" aria-label="Recruitment stages">
                {STATUSES.map((status) => (
                    <div className="ap-stage-item" key={status}>
                        <span>{status}</span>
                        <strong>{counts?.byStatus?.[status] ?? "—"}</strong>
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
                            <p>Open an application to review details and update status.</p>
                        </div>
                    </div>

                    <span className="mj-result-count">
                        {loading
                            ? "Loading applications..."
                            : listError
                              ? "Applications unavailable"
                              : `${total} of ${counts?.total ?? total} applications`}
                    </span>
                </header>

                <div className="ap-filters">
                    <TextField
                        label="Search applications"
                        placeholder="Candidate, email, job or full application ID"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        slotProps={{ htmlInput: { maxLength: 200 } }}
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
                        disabled={optionsLoading || Boolean(optionsError)}
                        size="small"
                        select
                        fullWidth
                    >
                        <MenuItem value="All">All jobs / vacancies</MenuItem>

                        {jobOptions.map((opening) => (
                            <MenuItem
                                key={`${opening.openingType}:${opening.jobId}`}
                                value={String(opening.jobId)}
                            >
                                {opening.title} ·{" "}
                                {opening.openingType === "internal"
                                    ? "Internal vacancy"
                                    : opening.company || "Client job"}
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

                    <Button type="button" variant="outlined" onClick={resetFilters}>
                        Reset
                    </Button>
                </div>

                {optionsError && (
                    <Alert
                        severity="warning"
                        className="mj-alert"
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() => setOptionsRevision((value) => value + 1)}
                            >
                                Retry
                            </Button>
                        }
                    >
                        {optionsError}
                    </Alert>
                )}

                <TableContainer>
                    <Table
                        className="mj-table ap-table"
                        aria-label="Applications"
                        aria-busy={loading}
                    >
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
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <div className="mj-empty" role="status">
                                            <p>Loading applications...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : listError ? (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <Alert
                                            severity="error"
                                            action={
                                                <Button
                                                    color="inherit"
                                                    size="small"
                                                    onClick={refreshApplications}
                                                >
                                                    Retry
                                                </Button>
                                            }
                                        >
                                            {listError}
                                        </Alert>
                                    </TableCell>
                                </TableRow>
                            ) : applications.length ? (
                                applications.map((application) => (
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
                                                aria-label={`View application for ${application.candidate}`}
                                            >
                                                View details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <div className="mj-empty">
                                            <span aria-hidden="true">
                                                <i className="fa-regular fa-file-lines" />
                                            </span>

                                            <h3>
                                                {hasFilters
                                                    ? "No matching applications"
                                                    : "No applications yet"}
                                            </h3>

                                            <p>
                                                {hasFilters
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
                    count={total}
                    page={Math.min(page, Math.max(0, Math.ceil(total / rowsPerPage) - 1))}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25]}
                    disabled={loading || Boolean(listError)}
                />
            </section>

            <Dialog
                open={Boolean(selectedId)}
                onClose={closeDetails}
                maxWidth="md"
                fullWidth
                className="ap-dialog"
                aria-labelledby="ap-dialog-title"
            >
                <DialogTitle id="ap-dialog-title">Application details</DialogTitle>

                <DialogContent dividers>
                    {detailsLoading ? (
                        <div className="mj-empty" role="status">
                            <p>Loading application details...</p>
                        </div>
                    ) : detailsError ? (
                        <Alert
                            severity="error"
                            action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => setDetailsRevision((value) => value + 1)}
                                >
                                    Retry
                                </Button>
                            }
                        >
                            {detailsError}
                        </Alert>
                    ) : selected ? (
                        <>
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
                                    <Detail label="Qualification">{selected.qualification}</Detail>
                                    <Detail label="Experience">{selected.experience}</Detail>
                                    <Detail label="Skills">{selected.skills.join(", ")}</Detail>

                                    <Detail label="Applied on (IST)">
                                        {formatDate(selected.appliedAt, true)}
                                    </Detail>
                                </dl>
                            </section>

                            <section className="ap-detail-section">
                                <h3>Submitted resume</h3>

                                {selected.resumeName ? (
                                    <>
                                        <dl className="ap-detail-grid">
                                            <Detail label="File name">{selected.resumeName}</Detail>

                                            <Detail label="File size">
                                                {formatFileSize(selected.resumeSize)}
                                            </Detail>
                                        </dl>

                                        <div className="d-flex flex-wrap gap-2">
                                            {selected.resumeMimeType === "application/pdf" && (
                                                <Button
                                                    type="button"
                                                    variant="outlined"
                                                    onClick={() => openResume("view")}
                                                    disabled={Boolean(resumeAction) || saving}
                                                >
                                                    {resumeAction === "view"
                                                        ? "Opening..."
                                                        : "View resume"}
                                                </Button>
                                            )}

                                            <Button
                                                type="button"
                                                variant="outlined"
                                                onClick={() => openResume("download")}
                                                disabled={Boolean(resumeAction) || saving}
                                            >
                                                {resumeAction === "download"
                                                    ? "Preparing..."
                                                    : "Download resume"}
                                            </Button>
                                        </div>

                                        {selected.resumeMimeType !== "application/pdf" && (
                                            <p className="ap-muted">
                                                Download this document to open it on your device.
                                            </p>
                                        )}
                                    </>
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

                                    <Detail label="Department">{selected.department}</Detail>
                                    <Detail label="Location">{selected.location}</Detail>
                                    <Detail label="Work mode">{selected.mode}</Detail>
                                    <Detail label="Job type">{selected.type}</Detail>
                                    <Detail label="Salary">{selected.salary}</Detail>
                                </dl>
                            </section>

                            {selected.interview && (
                                <section className="ap-detail-section">
                                    <h3>Interview details</h3>

                                    <dl className="ap-detail-grid">
                                        <Detail label="Date & time (IST)">
                                            {formatDate(selected.interview.at, true)}
                                        </Detail>

                                        <Detail label="Mode">{selected.interview.mode}</Detail>
                                        <Detail label="Instructions">
                                            {selected.interview.note}
                                        </Detail>
                                    </dl>
                                </section>
                            )}

                            {selected.selection && (
                                <section className="ap-detail-section">
                                    <h3>Selection details</h3>

                                    <dl className="ap-detail-grid">
                                        <Detail label="Selection message">
                                            {selected.selection.note}
                                        </Detail>
                                    </dl>
                                </section>
                            )}

                            <section className="ap-detail-section">
                                <h3>Update application status</h3>

                                {allowedStatuses.length ? (
                                    <form
                                        onSubmit={updateStatus}
                                        className="ap-status-form"
                                        noValidate
                                    >
                                        <TextField
                                            label="Next status"
                                            value={nextStatus}
                                            onChange={(event) => setNextStatus(event.target.value)}
                                            disabled={saving}
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

                                        {nextStatus === "Interview" && (
                                            <>
                                                <TextField
                                                    label="Interview date & time"
                                                    type="datetime-local"
                                                    value={interviewAt}
                                                    onChange={(event) =>
                                                        setInterviewAt(event.target.value)
                                                    }
                                                    disabled={saving}
                                                    required
                                                    fullWidth
                                                    size="small"
                                                    slotProps={{
                                                        inputLabel: { shrink: true },
                                                    }}
                                                    helperText="Use your device's local timezone. Saved times are displayed in IST."
                                                />

                                                <TextField
                                                    label="Interview mode"
                                                    value={interviewMode}
                                                    onChange={(event) =>
                                                        setInterviewMode(event.target.value)
                                                    }
                                                    disabled={saving}
                                                    select
                                                    required
                                                    fullWidth
                                                    size="small"
                                                >
                                                    {INTERVIEW_MODES.map((mode) => (
                                                        <MenuItem key={mode} value={mode}>
                                                            {mode}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </>
                                        )}

                                        <TextField
                                            label="Update message (optional)"
                                            placeholder="Add interview instructions or a brief update for the candidate."
                                            value={message}
                                            onChange={(event) => setMessage(event.target.value)}
                                            disabled={saving}
                                            multiline
                                            minRows={3}
                                            fullWidth
                                            size="small"
                                            slotProps={{
                                                htmlInput: { maxLength: 1000 },
                                            }}
                                            helperText={`Visible to the candidate. ${message.length}/1000 characters.`}
                                        />

                                        {nextStatus === "Rejected" && (
                                            <Alert severity="warning">
                                                Rejected is a final status. Further stage changes
                                                will be disabled.
                                            </Alert>
                                        )}

                                        {nextStatus === "Selected" && (
                                            <Alert severity="info">
                                                Selected is a final status and completes this
                                                application's recruitment flow.
                                            </Alert>
                                        )}

                                        <Button
                                            type="submit"
                                            variant="contained"
                                            disableElevation
                                            disabled={
                                                saving || Boolean(resumeAction) || !nextStatus
                                            }
                                        >
                                            {saving ? "Saving..." : "Save status update"}
                                        </Button>
                                    </form>
                                ) : (
                                    <Alert
                                        severity={
                                            selected.status === "Selected" ? "success" : "info"
                                        }
                                    >
                                        This application is {selected.status.toLowerCase()}. Its
                                        recruitment flow is complete.
                                    </Alert>
                                )}
                            </section>

                            <section className="ap-detail-section">
                                <h3>Application history</h3>

                                <ol className="ap-history">
                                    {[...selected.history].reverse().map((entry, index) => (
                                        <li key={`${entry.createdAt}-${index}`}>
                                            <span className="ap-history-dot" aria-hidden="true" />

                                            <div>
                                                <strong>{entry.status}</strong>

                                                <time dateTime={entry.createdAt}>
                                                    {formatDate(entry.createdAt, true)}
                                                </time>

                                                {entry.message && <p>{entry.message}</p>}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        </>
                    ) : null}
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={closeDetails}
                        variant="outlined"
                        disabled={saving || Boolean(resumeAction)}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Applications;
