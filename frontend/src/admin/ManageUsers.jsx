
import { useEffect, useState } from "react";
import {
    Alert,
    Avatar,
    Button,
    Chip,
    CircularProgress,
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

import api from "../services/api";
import { toTextList } from "../utils/dataFormat";

// ================== CONFIGURATION ==================
const DEFAULT_AVATAR = "/images/default-avatar.svg";
const HISTORY_PAGE_SIZE = 5;

const INITIAL_COUNTS = {
    total: 0,
    active: 0,
    inactive: 0,
    applicants: 0,
};

const APPLICATION_COLORS = {
    Submitted: "info",
    "Under Review": "warning",
    Shortlisted: "primary",
    Interview: "secondary",
    Selected: "success",
    Rejected: "error",
};

// ================== DATE FORMATTING ==================
function formatDate(value, includeTime = false) {
    const date = new Date(value);

    if (!value || Number.isNaN(date.getTime())) {
        return "Not available";
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

// ================== API ERROR MESSAGE ==================
function getErrorMessage(error, fallback) {
    return error.response?.data?.message || fallback;
}


 // ================== ADMIN RESUME URL ==================
 // Access private resumes through the authenticated backend API.
 function getAdminResumeUrl(userId, mode = "download") {
     const baseURL = String(api.defaults.baseURL || "")
         .replace(/\/+$/, "");

     return `${baseURL}/admin/users/${encodeURIComponent(userId)}/resume?mode=${mode}`;
 }

// ================== CANDIDATE AVATAR ==================
// Show the Cloudinary image when available.
// Otherwise display the existing default avatar.
function CandidateAvatar({ user, large = false }) {
    const imageUrl = user?.avatar?.url || DEFAULT_AVATAR;

    return (
        <Avatar
            key={imageUrl}
            src={imageUrl}
            alt={user?.name || "Candidate"}
            className={large ? "mu-avatar" : "mj-company-avatar"}
        />
    );
}

// ================== ACCOUNT STATUS ==================
function UserStatus({ status }) {
    return (
        <Chip
            label={status}
            color={status === "Active" ? "success" : "default"}
            size="small"
            variant="outlined"
        />
    );
}

// ================== PROFILE DETAILS ==================
function Detail({ label, value }) {
    return (
        <div className="mu-detail">
            <dt>{label}</dt>
            <dd>{value || "Not provided"}</dd>
        </div>
    );
}

// ================== MANAGE USERS PAGE ==================
function ManageUsers() {
    // ================== MONGODB USERS ==================
    const [users, setUsers] = useState([]);
    const [counts, setCounts] = useState(INITIAL_COUNTS);
    const [total, setTotal] = useState(0);

    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [listRevision, setListRevision] = useState(0);

    // ================== SEARCH AND FILTERS ==================
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    // ================== USER DETAILS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    const [userApplications, setUserApplications] = useState([]);
    const [applicationTotal, setApplicationTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(0);

    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState("");
    const [detailsRevision, setDetailsRevision] = useState(0);

    // ================== STATUS UPDATE ==================
    const [statusAction, setStatusAction] = useState(null);
    const [statusSaving, setStatusSaving] = useState(false);

    // ================== DEBOUNCED SEARCH ==================
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search]);

    // ================== FETCH REGISTERED USERS ==================
    // MongoDB handles search, filtering and pagination.
    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        async function fetchUsers() {
            setLoading(true);
            setListError("");

            try {
                const params = {
                    page: page + 1,
                    limit: rowsPerPage,
                    status: statusFilter,
                };

                if (debouncedSearch) {
                    params.search = debouncedSearch;
                }

                // ================== MANAGE USERS API ==================
                const { data } = await api.get(
                    "/admin/users",
                    {
                        params,
                        signal: controller.signal,
                    }
                );

                if (!active) return;

                if (
                    !data?.success ||
                    !Array.isArray(data.users) ||
                    !data.pagination ||
                    !data.counts
                ) {
                    throw new Error("Invalid users API response.");
                }

                const nextTotal = Number(data.pagination.total);

                if (
                    !Number.isSafeInteger(nextTotal) ||
                    nextTotal < 0
                ) {
                    throw new Error("Invalid pagination response.");
                }

                // ================== PAGE CORRECTION ==================
                const lastPage = Math.max(
                    0,
                    Math.ceil(nextTotal / rowsPerPage) - 1
                );

                if (page > lastPage) {
                    setPage(lastPage);
                    return;
                }

                setUsers(data.users);
                setTotal(nextTotal);

                setCounts({
                    total: Number(data.counts.total) || 0,
                    active: Number(data.counts.active) || 0,
                    inactive: Number(data.counts.inactive) || 0,
                    applicants: Number(data.counts.applicants) || 0,
                });
            } catch (error) {
                if (!active) return;

                setUsers([]);
                setTotal(0);
                setCounts(INITIAL_COUNTS);

                setListError(
                    getErrorMessage(
                        error,
                        "Unable to load registered users. Please try again."
                    )
                );
            } finally {
                if (active) setLoading(false);
            }
        }

        fetchUsers();

        return () => {
            active = false;
            controller.abort();
        };
    }, [
        debouncedSearch,
        statusFilter,
        page,
        rowsPerPage,
        listRevision,
    ]);

    // ================== FETCH USER DETAILS ==================
    // Load the selected candidate and their application history.
    useEffect(() => {
        if (!selectedId) return;

        const controller = new AbortController();
        let active = true;

        async function fetchUserDetails() {
            setDetailsLoading(true);
            setDetailsError("");

            try {
                const { data } = await api.get(
                    `/admin/users/${encodeURIComponent(selectedId)}`,
                    {
                        params: {
                            page: historyPage + 1,
                            limit: HISTORY_PAGE_SIZE,
                        },
                        signal: controller.signal,
                    }
                );

                if (!active) return;

                if (
                    !data?.success ||
                    !data.user ||
                    !Array.isArray(data.applications)
                ) {
                    throw new Error("Invalid user details response.");
                }

                const historyTotal = Number(
                    data.pagination?.total
                ) || 0;

                const lastPage = Math.max(
                    0,
                    Math.ceil(
                        historyTotal / HISTORY_PAGE_SIZE
                    ) - 1
                );

                if (historyPage > lastPage) {
                    setHistoryPage(lastPage);
                    return;
                }

                setSelectedUser(data.user);
                setUserApplications(data.applications);
                setApplicationTotal(historyTotal);
            } catch (error) {
                if (!active) return;

                setDetailsError(
                    getErrorMessage(
                        error,
                        "Unable to load candidate details."
                    )
                );
            } finally {
                if (active) setDetailsLoading(false);
            }
        }

        fetchUserDetails();

        return () => {
            active = false;
            controller.abort();
        };
    }, [selectedId, historyPage, detailsRevision]);

    // ================== DASHBOARD METRICS ==================
    // These counts represent all users, not only the current page.
    const metrics = [
        {
            label: "Registered users",
            value: counts.total,
            detail: "Candidate accounts",
            icon: "fa-solid fa-users",
            tone: "blue",
        },
        {
            label: "Active users",
            value: counts.active,
            detail: "Accounts enabled",
            icon: "fa-solid fa-user-check",
            tone: "green",
        },
        {
            label: "Inactive users",
            value: counts.inactive,
            detail: "Accounts deactivated",
            icon: "fa-solid fa-user-slash",
            tone: "red",
        },
        {
            label: "Applicants",
            value: counts.applicants,
            detail: "Users with applications",
            icon: "fa-regular fa-file-lines",
            tone: "amber",
        },
    ];

    // ================== RESET FILTERS ==================
    function resetFilters() {
        setSearch("");
        setDebouncedSearch("");
        setStatusFilter("All");
        setPage(0);
    }

    // ================== REFRESH USERS ==================
    function refreshUsers() {
        setListRevision((previous) => previous + 1);
    }

    // ================== OPEN USER PROFILE ==================
    function openProfile(user) {
        setSelectedUser(null);
        setUserApplications([]);
        setApplicationTotal(0);
        setHistoryPage(0);
        setDetailsError("");
        setSelectedId(user.id);
    }

    // ================== CLOSE USER PROFILE ==================
    function closeProfile() {
        if (statusSaving) return;

        setSelectedId(null);
        setSelectedUser(null);
        setUserApplications([]);
        setHistoryPage(0);
        setDetailsError("");
    }

    // ================== REQUEST STATUS CHANGE ==================
    function requestStatusChange(user) {
        if (statusSaving || !user) return;

        setStatusAction({
            userId: user.id,
            name: user.name,
            expectedStatus: user.status,
            nextStatus:
                user.status === "Active"
                    ? "Inactive"
                    : "Active",
        });
    }

    // ================== ACTIVATE / DEACTIVATE USER ==================
    // Persist changes only through the protected MongoDB API.
    async function saveStatusChange() {
        if (!statusAction || statusSaving) return;

        setStatusSaving(true);

        try {
            const { data } = await api.patch(
                `/admin/users/${encodeURIComponent(statusAction.userId)}/status`,
                {
                    expectedStatus: statusAction.expectedStatus,
                    status: statusAction.nextStatus,
                }
            );

            if (!data?.success || !data.user) {
                throw new Error(
                    "The server did not confirm the account update."
                );
            }

            // ================== UPDATE VISIBLE ACCOUNT ==================
            setUsers((previous) =>
                previous.map((user) =>
                    user.id === statusAction.userId
                        ? {
                              ...user,
                              status: data.user.status,
                              updatedAt: data.user.updatedAt,
                          }
                        : user
                )
            );

            if (selectedId === statusAction.userId) {
                setSelectedUser((previous) =>
                    previous
                        ? {
                              ...previous,
                              status: data.user.status,
                              updatedAt: data.user.updatedAt,
                          }
                        : previous
                );

                setDetailsRevision(
                    (previous) => previous + 1
                );
            }

            setStatusAction(null);

            // Refresh database counts and filtered records.
            setListRevision(
                (previous) => previous + 1
            );

            toast.success(
                data.message ||
                "Account status updated successfully."
            );
        } catch (error) {
            const message = getErrorMessage(
                error,
                "Unable to update account status."
            );

            toast.error(message);

            // On conflicting status changes, reload current records.
            if (
                error.response?.status === 409 ||
                error.response?.status === 404
            ) {
                setStatusAction(null);
                setListRevision(
                    (previous) => previous + 1
                );

                if (selectedId) {
                    setDetailsRevision(
                        (previous) => previous + 1
                    );
                }
            }
        } finally {
            setStatusSaving(false);
        }
    }

    // ================== EMPTY STATE ==================
    const hasFilters = Boolean(
        debouncedSearch || statusFilter !== "All"
    );

    const emptyTitle = listError
        ? "Unable to load users"
        : hasFilters
          ? "No matching users"
          : "No registered users";

    const emptyDescription = listError
        ? "Refresh the page to try again."
        : hasFilters
          ? "Try another search or account status."
          : "New candidate accounts will appear here.";

    return (
        <div className="manage-jobs manage-users">
            {/* ================== PAGE HEADER ================== */}
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">
                        USER MANAGEMENT
                    </span>

                    <h1>Manage Users</h1>

                    <p>
                        Review candidate profiles and manage account access.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outlined"
                    onClick={refreshUsers}
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

            {/* ================== USER STATISTICS ================== */}
            <section
                className="mj-metrics"
                aria-label="User overview"
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

            {/* ================== REGISTERED USERS ================== */}
            <section
                className="mj-card"
                aria-labelledby="mu-list-title"
            >
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span
                            className="mj-header-icon"
                            aria-hidden="true"
                        >
                            <i className="fa-solid fa-users" />
                        </span>

                        <div>
                            <h2 id="mu-list-title">
                                Registered candidates
                            </h2>

                            <p>
                                View profiles, application history and
                                account status.
                            </p>
                        </div>
                    </div>

                    <span className="mj-result-count">
                        {loading
                            ? "Loading users..."
                            : `${total} of ${counts.total} users`}
                    </span>
                </header>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="mu-filters">
                    <TextField
                        label="Search users"
                        placeholder="Name, email, phone or location"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                        size="small"
                        fullWidth
                        slotProps={{
                            htmlInput: {
                                maxLength: 100,
                            },
                        }}
                    />

                    <TextField
                        label="Account status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                        select
                        size="small"
                        fullWidth
                    >
                        <MenuItem value="All">
                            All users
                        </MenuItem>

                        <MenuItem value="Active">
                            Active
                        </MenuItem>

                        <MenuItem value="Inactive">
                            Inactive
                        </MenuItem>
                    </TextField>

                    <Button
                        type="button"
                        variant="outlined"
                        onClick={resetFilters}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== USERS TABLE ================== */}
                <TableContainer>
                    <Table
                        className="mj-table mu-table"
                        aria-label="Registered users"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Candidate</TableCell>
                                <TableCell>Contact</TableCell>
                                <TableCell>Applications</TableCell>
                                <TableCell>Joined on</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {/* ================== LOADING STATE ================== */}
                            {loading && (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        align="center"
                                        sx={{ py: 6 }}
                                    >
                                        <CircularProgress size={26} />
                                        <p>Loading registered users...</p>
                                    </TableCell>
                                </TableRow>
                            )}

                            {/* ================== MONGODB USER RECORDS ================== */}
                            {!loading &&
                                users.map((user) => (
                                    <TableRow key={user.id} hover>
                                        <TableCell>
                                            <div className="mj-job-cell">
                                                <CandidateAvatar
                                                    user={user}
                                                />

                                                <div>
                                                    <strong>
                                                        {user.name}
                                                    </strong>

                                                    <p>
                                                        {user.address ||
                                                            "Location not provided"}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="mj-cell-primary">
                                                {user.email}
                                            </span>

                                            <span className="mj-cell-secondary">
                                                {user.phone ||
                                                    "Phone not provided"}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <span className="mu-count">
                                                {user.applicationCount ?? 0}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <time
                                                dateTime={user.joinedAt || ""}
                                            >
                                                {formatDate(
                                                    user.joinedAt
                                                )}
                                            </time>
                                        </TableCell>

                                        <TableCell>
                                            <UserStatus
                                                status={user.status}
                                            />
                                        </TableCell>

                                        <TableCell align="right">
                                            <div className="mu-actions">
                                                <Button
                                                    type="button"
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() =>
                                                        openProfile(user)
                                                    }
                                                    aria-label={`View ${user.name}'s profile`}
                                                    startIcon={
                                                        <i
                                                            className="fa-regular fa-eye"
                                                            aria-hidden="true"
                                                        />
                                                    }
                                                >
                                                    View
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="outlined"
                                                    size="small"
                                                    disabled={statusSaving}
                                                    color={
                                                        user.status === "Active"
                                                            ? "error"
                                                            : "success"
                                                    }
                                                    onClick={() =>
                                                        requestStatusChange(user)
                                                    }
                                                >
                                                    {user.status === "Active"
                                                        ? "Deactivate"
                                                        : "Activate"}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                            {/* ================== EMPTY STATE ================== */}
                            {!loading && users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="mj-empty">
                                            <span aria-hidden="true">
                                                <i className="fa-solid fa-users" />
                                            </span>

                                            <h3>{emptyTitle}</h3>
                                            <p>{emptyDescription}</p>
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
                    count={total}
                    page={page}
                    onPageChange={(_, nextPage) =>
                        setPage(nextPage)
                    }
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25]}
                />
            </section>

            {/* ================== USER PROFILE DIALOG ================== */}
            <Dialog
                open={Boolean(selectedId)}
                onClose={closeProfile}
                maxWidth="md"
                fullWidth
                className="mu-dialog"
                aria-labelledby="mu-profile-title"
            >
                <DialogTitle id="mu-profile-title">
                    Candidate profile
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
                            <p>Loading candidate profile...</p>
                        </div>
                    )}

                    {/* ================== DETAILS ERROR ================== */}
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

                    {/* ================== CANDIDATE PROFILE ================== */}
                    {!detailsLoading &&
                        !detailsError &&
                        selectedUser && (
                            <>
                                {/* ================== PROFILE BANNER ================== */}
                                <div className="mu-profile-banner">
                                    <CandidateAvatar
                                        user={selectedUser}
                                        large
                                    />

                                    <div className="mu-profile-copy">
                                        <h2>{selectedUser.name}</h2>
                                        <p>{selectedUser.email}</p>
                                        <span>{selectedUser.id}</span>
                                    </div>

                                    <UserStatus
                                        status={selectedUser.status}
                                    />
                                </div>

                                {/* ================== PERSONAL DETAILS ================== */}
                                <section className="mu-section">
                                    <h3>
                                        Personal & contact information
                                    </h3>

                                    <dl className="mu-detail-grid">
                                        <Detail
                                            label="Full name"
                                            value={selectedUser.name}
                                        />

                                        <Detail
                                            label="Email"
                                            value={selectedUser.email}
                                        />

                                        <Detail
                                            label="Phone"
                                            value={selectedUser.phone}
                                        />

                                        <Detail
                                            label="Address"
                                            value={selectedUser.address}
                                        />

                                        <Detail
                                            label="Registered on"
                                            value={formatDate(
                                                selectedUser.joinedAt,
                                                true
                                            )}
                                        />

                                        <Detail
                                            label="Account status"
                                            value={selectedUser.status}
                                        />
                                    </dl>
                                </section>

                                {/* ================== PROFESSIONAL DETAILS ================== */}
                                <section className="mu-section">
                                    <h3>Professional profile</h3>

                                    <dl className="mu-detail-grid">
                                        <Detail
                                            label="Qualification"
                                            value={selectedUser.qualification}
                                        />

                                        <Detail
                                            label="Experience"
                                            value={selectedUser.experience}
                                        />

                                        <Detail
                                            label="Skills"
                                            value={toTextList(
                                                selectedUser.skills
                                            ).join(", ")}
                                        />

                                        <Detail
                                            label="Last login"
                                            value={formatDate(
                                                selectedUser.lastLoginAt,
                                                true
                                            )}
                                        />
                                    </dl>


                            {/* ================== PROFILE RESUME ================== */}
                            {selectedUser.resume ? (
                                <div className="mu-access-card">
                                    <div>
                                        <strong>{selectedUser.resume.name}</strong>

                                        <p>
                                            Candidate profile resume · Secure access
                                        </p>
                                    </div>

                                    <div className="mu-actions">
                                        {/* ================== VIEW PDF RESUME ================== */}
                                        {selectedUser.resume.mimeType ===
                                            "application/pdf" && (
                                            <Button
                                                component="a"
                                                href={getAdminResumeUrl(
                                                    selectedUser.id,
                                                    "view"
                                                )}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                variant="outlined"
                                                size="small"
                                                startIcon={
                                                    <i className="fa-regular fa-eye" />
                                                }
                                            >
                                                View Resume
                                            </Button>
                                        )}

                                        {/* ================== DOWNLOAD RESUME ================== */}
                                        <Button
                                            component="a"
                                            href={getAdminResumeUrl(
                                                selectedUser.id,
                                                "download"
                                            )}
                                            variant="outlined"
                                            size="small"
                                            startIcon={
                                                <i className="fa-solid fa-download" />
                                            }
                                        >
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="mu-muted">
                                    No profile resume is available.
                                </p>
                            )}

                                </section>

                                {/* ================== APPLICATION HISTORY ================== */}
                                <section className="mu-section">
                                    <div className="mu-section-heading">
                                        <h3>Application history</h3>

                                        <span className="mu-count">
                                            {applicationTotal}
                                        </span>
                                    </div>

                                    {userApplications.length ? (
                                        <TableContainer className="mu-history-container">
                                            <Table
                                                size="small"
                                                className="mu-history-table"
                                                aria-label={`${selectedUser.name}'s applications`}
                                            >
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>
                                                            Position
                                                        </TableCell>

                                                        <TableCell>
                                                            Applied on
                                                        </TableCell>

                                                        <TableCell>
                                                            Status
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>

                                                <TableBody>
                                                    {userApplications.map(
                                                        (application) => (
                                                            <TableRow
                                                                key={application.id}
                                                            >
                                                                <TableCell>
                                                                    <strong>
                                                                        {application.title}
                                                                    </strong>

                                                                    <span className="mu-history-company">
                                                                        {application.openingType === "internal"
                                                                            ? "Internal vacancy"
                                                                            : application.company || "Client job"}
                                                                    </span>
                                                                </TableCell>

                                                                <TableCell>
                                                                    {formatDate(
                                                                        application.appliedAt
                                                                    )}
                                                                </TableCell>

                                                                <TableCell>
                                                                    <Chip
                                                                        label={application.status}
                                                                        color={
                                                                            APPLICATION_COLORS[
                                                                                application.status
                                                                            ] || "default"
                                                                        }
                                                                        size="small"
                                                                        variant="outlined"
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : (
                                        <div className="mu-empty-history">
                                            <i
                                                className="fa-regular fa-file-lines"
                                                aria-hidden="true"
                                            />

                                            <p>
                                                This candidate has not submitted
                                                any applications.
                                            </p>
                                        </div>
                                    )}

                                    {/* ================== HISTORY PAGINATION ================== */}
                                    {applicationTotal > HISTORY_PAGE_SIZE && (
                                        <TablePagination
                                            component="div"
                                            count={applicationTotal}
                                            page={historyPage}
                                            rowsPerPage={HISTORY_PAGE_SIZE}
                                            rowsPerPageOptions={[
                                                HISTORY_PAGE_SIZE,
                                            ]}
                                            onPageChange={(_, nextPage) =>
                                                setHistoryPage(nextPage)
                                            }
                                        />
                                    )}
                                </section>

                                {/* ================== ACCOUNT ACCESS ================== */}
                                <section className="mu-section">
                                    <h3>Account access</h3>

                                    <div className="mu-access-card">
                                        <div>
                                            <strong>
                                                {selectedUser.status === "Active"
                                                    ? "Account is active"
                                                    : "Account is inactive"}
                                            </strong>

                                            <p>
                                                Changing account access
                                                preserves the profile and
                                                existing applications.
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outlined"
                                            disabled={statusSaving}
                                            color={
                                                selectedUser.status === "Active"
                                                    ? "error"
                                                    : "success"
                                            }
                                            onClick={() =>
                                                requestStatusChange(selectedUser)
                                            }
                                        >
                                            {selectedUser.status === "Active"
                                                ? "Deactivate user"
                                                : "Activate user"}
                                        </Button>
                                    </div>
                                </section>
                            </>
                        )}
                </DialogContent>

                <DialogActions>
                    <Button
                        variant="outlined"
                        onClick={closeProfile}
                        disabled={statusSaving}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ================== ACCOUNT STATUS CONFIRMATION ================== */}
            <Dialog
                open={Boolean(statusAction)}
                onClose={() => {
                    if (!statusSaving) {
                        setStatusAction(null);
                    }
                }}
                maxWidth="xs"
                fullWidth
                className="mu-dialog"
                aria-labelledby="mu-status-title"
                aria-describedby="mu-status-description"
            >
                <DialogTitle id="mu-status-title">
                    {statusAction?.nextStatus === "Inactive"
                        ? "Deactivate user?"
                        : "Activate user?"}
                </DialogTitle>

                <DialogContent>
                    <p
                        id="mu-status-description"
                        className="mu-confirm-text"
                    >
                        {statusAction?.nextStatus === "Inactive"
                            ? `Mark ${statusAction.name}'s account as inactive?`
                            : `Restore ${statusAction?.name}'s account to active status?`}
                    </p>

                    <p className="mu-muted">
                        Their profile and application history will be retained.
                    </p>
                </DialogContent>

                <DialogActions>
                    <Button
                        type="button"
                        disabled={statusSaving}
                        onClick={() => setStatusAction(null)}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        variant="contained"
                        disableElevation
                        disabled={statusSaving}
                        color={
                            statusAction?.nextStatus === "Inactive"
                                ? "error"
                                : "success"
                        }
                        onClick={saveStatusChange}
                        startIcon={
                            statusSaving ? (
                                <CircularProgress
                                    size={16}
                                    color="inherit"
                                />
                            ) : null
                        }
                    >
                        {statusSaving
                            ? "Saving..."
                            : statusAction?.nextStatus === "Inactive"
                              ? "Deactivate"
                              : "Activate"}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

// ================== EXPORT ==================
export default ManageUsers;
