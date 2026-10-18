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

const STORAGE_KEY = "rms-demo-users-v1";

// Same demo application store used by Applications.jsx.
const APPLICATIONS_KEY = "rms-demo-applications-v1";

const APPLICATION_STATUSES = [
    "Submitted",
    "Under Review",
    "Shortlisted",
    "Interview",
    "Selected",
    "Rejected",
];

const APPLICATION_COLORS = {
    Submitted: "info",
    "Under Review": "warning",
    Shortlisted: "primary",
    Interview: "secondary",
    Selected: "success",
    Rejected: "error",
};

const DEMO_USERS = [
    {
        id: "user-1001",
        name: "Aarav Sharma",
        email: "aarav@example.com",
        phone: "9000000001",
        address: "Bengaluru, Karnataka",
        qualification: "B.Tech — Computer Science",
        experience: "2 years",
        skills: "React, Node.js, Express, MongoDB",
        resumeUrl: "",
        role: "user",
        status: "Active",
        joinedAt: "2026-10-14T10:00:00+05:30",
        updatedAt: "",
    },
    {
        id: "user-1002",
        name: "Priya Das",
        email: "priya@example.com",
        phone: "9000000002",
        address: "Bhubaneswar, Odisha",
        qualification: "B.Sc — Computer Science",
        experience: "1 year",
        skills: "React, JavaScript, CSS",
        resumeUrl: "",
        role: "user",
        status: "Active",
        joinedAt: "2026-10-13T12:30:00+05:30",
        updatedAt: "",
    },
    {
        id: "user-1003",
        name: "Rohan Patel",
        email: "rohan@example.com",
        phone: "9000000003",
        address: "Pune, Maharashtra",
        qualification: "Bachelor of Design",
        experience: "2 years",
        skills: "Figma, Prototyping, User Research",
        resumeUrl: "",
        role: "user",
        status: "Active",
        joinedAt: "2026-10-12T09:15:00+05:30",
        updatedAt: "",
    },
    {
        id: "user-1004",
        name: "Ananya Mishra",
        email: "ananya@example.com",
        phone: "9000000004",
        address: "Hyderabad, Telangana",
        qualification: "BCA",
        experience: "Fresher",
        skills: "JavaScript, HTML, CSS",
        resumeUrl: "",
        role: "user",
        status: "Inactive",
        joinedAt: "2026-10-11T11:00:00+05:30",
        updatedAt: "",
    },
];

// Initial history matching the demo records in Applications.jsx.
// Once that page saves data, its storage becomes the source.
const DEMO_APPLICATIONS = [
    {
        id: "application-1001",
        userId: "user-1001",
        email: "aarav@example.com",
        title: "MERN Stack Developer",
        company: "Sample Digital",
        openingType: "client",
        appliedAt: "2026-10-18T10:30:00+05:30",
        status: "Submitted",
    },
    {
        id: "application-1002",
        userId: "user-1002",
        email: "priya@example.com",
        title: "Frontend Developer",
        company: "",
        openingType: "internal",
        appliedAt: "2026-10-17T09:15:00+05:30",
        status: "Under Review",
    },
    {
        id: "application-1003",
        userId: "user-1003",
        email: "rohan@example.com",
        title: "UI/UX Designer",
        company: "Sample Design Studio",
        openingType: "client",
        appliedAt: "2026-10-15T12:00:00+05:30",
        status: "Shortlisted",
    },
];

function loadUsers() {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            return { users: DEMO_USERS, error: "" };
        }

        const parsed = JSON.parse(stored);

        const valid =
            Array.isArray(parsed) &&
            parsed.every(
                (user) =>
                    user &&
                    ["id", "name", "email", "joinedAt"].every(
                        (key) => typeof user[key] === "string"
                    ) &&
                    user.role === "user" &&
                    ["Active", "Inactive"].includes(user.status)
            );

        if (!valid) throw new Error("Invalid user data");

        return { users: parsed, error: "" };
    } catch {
        return {
            users: [],
            error:
                "Saved users could not be loaded. Existing data has not " +
                "been overwritten. Check browser storage and reload.",
        };
    }
}

function loadApplications() {
    try {
        const stored = window.localStorage.getItem(APPLICATIONS_KEY);

        if (!stored) {
            return { applications: DEMO_APPLICATIONS, error: "" };
        }

        const parsed = JSON.parse(stored);

        const valid =
            Array.isArray(parsed) &&
            parsed.every(
                (application) =>
                    application &&
                    ["id", "title", "appliedAt"].every(
                        (key) => typeof application[key] === "string"
                    ) &&
                    (
                        typeof application.userId === "string" ||
                        typeof application.email === "string"
                    ) &&
                    APPLICATION_STATUSES.includes(application.status) &&
                    ["client", "internal"].includes(application.openingType)
            );

        if (!valid) throw new Error("Invalid application data");

        return { applications: parsed, error: "" };
    } catch {
        return {
            applications: [],
            error:
                "Application history could not be loaded. User account details are still available.",
        };
    }
}

function belongsToUser(application, user) {
    if (application.userId) {
        return application.userId === user.id;
    }

    // Compatibility with the earlier frontend demo.
    // Production records must be linked through userId.
    return (
        typeof application.email === "string" &&
        application.email.trim().toLowerCase() ===
            user.email.trim().toLowerCase()
    );
}

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

function getResumeUrl(value) {
    if (typeof value !== "string" || !value) return "";

    try {
        const url = new URL(value);
        return url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

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

function Detail({ label, value }) {
    return (
        <div className="mu-detail">
            <dt>{label}</dt>
            <dd>{value || "Not provided"}</dd>
        </div>
    );
}

function ManageUsers() {
    const [initialData] = useState(loadUsers);
    const [users, setUsers] = useState(initialData.users);
    const [applicationData, setApplicationData] = useState(loadApplications);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const [selectedId, setSelectedId] = useState(null);
    const [statusAction, setStatusAction] = useState(null);

    const selectedUser = users.find((user) => user.id === selectedId);
    const actionUser = users.find(
        (user) => user.id === statusAction?.userId
    );

    const applications = applicationData.applications;

    const activeCount = users.filter(
        (user) => user.status === "Active"
    ).length;

    const applicantsCount = users.filter((user) =>
        applications.some((application) =>
            belongsToUser(application, user)
        )
    ).length;

    const metrics = [
        {
            label: "Registered users",
            value: users.length,
            detail: "Candidate accounts",
            icon: "fa-solid fa-users",
            tone: "blue",
        },
        {
            label: "Active users",
            value: activeCount,
            detail: "Accounts enabled",
            icon: "fa-solid fa-user-check",
            tone: "green",
        },
        {
            label: "Inactive users",
            value: users.length - activeCount,
            detail: "Accounts deactivated",
            icon: "fa-solid fa-user-slash",
            tone: "red",
        },
        {
            label: "Applicants",
            value: applicationData.error ? "—" : applicantsCount,
            detail: "Users with applications",
            icon: "fa-regular fa-file-lines",
            tone: "amber",
        },
    ];

    const query = search.trim().toLowerCase();

    const filteredUsers = users
        .filter((user) => {
            const matchesSearch = [
                user.name,
                user.email,
                user.phone,
                user.address,
                user.id,
            ].some((value) =>
                String(value || "").toLowerCase().includes(query)
            );

            return (
                matchesSearch &&
                (statusFilter === "All" || user.status === statusFilter)
            );
        })
        .sort((first, second) =>
            second.joinedAt.localeCompare(first.joinedAt)
        );

    const visibleUsers = filteredUsers.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const userApplications = selectedUser
        ? applications
              .filter((application) =>
                  belongsToUser(application, selectedUser)
              )
              .sort((first, second) =>
                  second.appliedAt.localeCompare(first.appliedAt)
              )
        : [];

    const resumeUrl = getResumeUrl(selectedUser?.resumeUrl);

    function openProfile(user) {
        setApplicationData(loadApplications());
        setSelectedId(user.id);
    }

    function requestStatusChange(user) {
        setStatusAction({
            userId: user.id,
            expectedStatus: user.status,
            nextStatus: user.status === "Active" ? "Inactive" : "Active",
        });
    }

    function saveStatusChange() {
        if (!statusAction || !actionUser || initialData.error) return;

        if (actionUser.status !== statusAction.expectedStatus) {
            toast.error("The account status changed. Please try again.");
            setStatusAction(null);
            return;
        }

        const nextUsers = users.map((user) =>
            user.id === actionUser.id
                ? {
                      ...user,
                      status: statusAction.nextStatus,
                      updatedAt: new Date().toISOString(),
                  }
                : user
        );

        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(nextUsers)
            );
        } catch {
            toast.error(
                "Could not save the account status. Check browser storage."
            );
            return;
        }

        setUsers(nextUsers);
        setPage(0);
        setStatusAction(null);

        toast.success(
            statusAction.nextStatus === "Active"
                ? "User activated successfully."
                : "User deactivated successfully."
        );
    }

    function resetFilters() {
        setSearch("");
        setStatusFilter("All");
        setPage(0);
    }

    return (
        <div className="manage-jobs manage-users">
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">USER MANAGEMENT</span>
                    <h1>Manage Users</h1>
                    <p>
                        Review candidate profiles and manage account access.
                    </p>
                </div>

                <span className="mj-result-count">
                    Candidate accounts
                </span>
            </header>

            {initialData.error && (
                <Alert severity="error" className="mj-alert">
                    {initialData.error}
                </Alert>
            )}

            {applicationData.error && (
                <Alert severity="warning" className="mj-alert">
                    {applicationData.error}
                </Alert>
            )}

            <section className="mj-metrics" aria-label="User overview">
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

            <section className="mj-card" aria-labelledby="mu-list-title">
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span className="mj-header-icon" aria-hidden="true">
                            <i className="fa-solid fa-users" />
                        </span>

                        <div>
                            <h2 id="mu-list-title">Registered candidates</h2>
                            <p>
                                View profiles, application history and account status.
                            </p>
                        </div>
                    </div>

                    <span className="mj-result-count">
                        {filteredUsers.length} of {users.length} users
                    </span>
                </header>

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
                        <MenuItem value="All">All users</MenuItem>
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="Inactive">Inactive</MenuItem>
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
                    <Table className="mj-table mu-table" aria-label="Registered users">
                        <TableHead>
                            <TableRow>
                                <TableCell>Candidate</TableCell>
                                <TableCell>Contact</TableCell>
                                <TableCell>Applications</TableCell>
                                <TableCell>Joined on</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleUsers.map((user) => {
                                const applicationCount = applications.filter(
                                    (application) =>
                                        belongsToUser(application, user)
                                ).length;

                                return (
                                    <TableRow key={user.id} hover>
                                        <TableCell>
                                            <div className="mj-job-cell">
                                                <span
                                                    className="mj-company-avatar"
                                                    aria-hidden="true"
                                                >
                                                    {getInitials(user.name)}
                                                </span>

                                                <div>
                                                    <strong>{user.name}</strong>
                                                    <p>
                                                        {user.address || "Location not provided"}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="mj-cell-primary">
                                                {user.email}
                                            </span>
                                            <span className="mj-cell-secondary">
                                                {user.phone || "Phone not provided"}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <span className="mu-count">
                                                {applicationData.error
                                                    ? "—"
                                                    : applicationCount}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <time dateTime={user.joinedAt}>
                                                {formatDate(user.joinedAt)}
                                            </time>
                                        </TableCell>

                                        <TableCell>
                                            <UserStatus status={user.status} />
                                        </TableCell>

                                        <TableCell align="right">
                                            <div className="mu-actions">
                                                <Button
                                                    type="button"
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => openProfile(user)}
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
                                                    color={
                                                        user.status === "Active"
                                                            ? "error"
                                                            : "success"
                                                    }
                                                    onClick={() =>
                                                        requestStatusChange(user)
                                                    }
                                                    aria-label={`${
                                                        user.status === "Active"
                                                            ? "Deactivate"
                                                            : "Activate"
                                                    } ${user.name}`}
                                                >
                                                    {user.status === "Active"
                                                        ? "Deactivate"
                                                        : "Activate"}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {!visibleUsers.length && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="mj-empty">
                                            <span aria-hidden="true">
                                                <i className="fa-solid fa-users" />
                                            </span>

                                            <h3>
                                                {users.length
                                                    ? "No matching users"
                                                    : "No registered users"}
                                            </h3>

                                            <p>
                                                {users.length
                                                    ? "Try another search or account status."
                                                    : "New candidate accounts will appear here."}
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
                    count={filteredUsers.length}
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

            {/* USER PROFILE */}

            <Dialog
                open={Boolean(selectedUser)}
                onClose={() => setSelectedId(null)}
                maxWidth="md"
                fullWidth
                className="mu-dialog"
                aria-labelledby="mu-profile-title"
            >
                {selectedUser && (
                    <>
                        <DialogTitle id="mu-profile-title">
                            Candidate profile
                        </DialogTitle>

                        <DialogContent dividers>
                            <div className="mu-profile-banner">
                                <span className="mu-avatar" aria-hidden="true">
                                    {getInitials(selectedUser.name)}
                                </span>

                                <div className="mu-profile-copy">
                                    <h2>{selectedUser.name}</h2>
                                    <p>{selectedUser.email}</p>
                                    <span>{selectedUser.id}</span>
                                </div>

                                <UserStatus status={selectedUser.status} />
                            </div>

                            <section className="mu-section">
                                <h3>Personal & contact information</h3>

                                <dl className="mu-detail-grid">
                                    <Detail label="Full name" value={selectedUser.name} />
                                    <Detail label="Email" value={selectedUser.email} />
                                    <Detail label="Phone" value={selectedUser.phone} />
                                    <Detail label="Address" value={selectedUser.address} />
                                    <Detail
                                        label="Registered on"
                                        value={formatDate(selectedUser.joinedAt, true)}
                                    />
                                    <Detail
                                        label="Account status"
                                        value={selectedUser.status}
                                    />
                                </dl>
                            </section>

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
                                        value={selectedUser.skills}
                                    />
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
                                        Open profile resume
                                    </Button>
                                ) : (
                                    <p className="mu-muted">
                                        No profile resume is available.
                                    </p>
                                )}
                            </section>

                            <section className="mu-section">
                                <div className="mu-section-heading">
                                    <h3>Application history</h3>

                                    {!applicationData.error && (
                                        <span className="mu-count">
                                            {userApplications.length}
                                        </span>
                                    )}
                                </div>

                                {applicationData.error ? (
                                    <Alert severity="warning">
                                        {applicationData.error}
                                    </Alert>
                                ) : userApplications.length ? (
                                    <TableContainer className="mu-history-container">
                                        <Table
                                            size="small"
                                            className="mu-history-table"
                                            aria-label={`${selectedUser.name}'s applications`}
                                        >
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Position</TableCell>
                                                    <TableCell>Applied on</TableCell>
                                                    <TableCell>Status</TableCell>
                                                </TableRow>
                                            </TableHead>

                                            <TableBody>
                                                {userApplications.map((application) => (
                                                    <TableRow key={application.id}>
                                                        <TableCell>
                                                            <strong>
                                                                {application.title}
                                                            </strong>

                                                            <span className="mu-history-company">
                                                                {application.openingType ===
                                                                "internal"
                                                                    ? "Internal vacancy"
                                                                    : application.company ||
                                                                      "Client job"}
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
                                                                    ]
                                                                }
                                                                variant="outlined"
                                                                size="small"
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
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
                                            This candidate has not submitted any applications.
                                        </p>
                                    </div>
                                )}
                            </section>

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
                                            Changing account access preserves the profile
                                            and existing applications.
                                        </p>
                                    </div>

                                    <Button
                                        variant="outlined"
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

            {/* ACCOUNT STATUS CONFIRMATION */}

            <Dialog
                open={Boolean(actionUser)}
                onClose={() => setStatusAction(null)}
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
                    <p id="mu-status-description" className="mu-confirm-text">
                        {statusAction?.nextStatus === "Inactive"
                            ? `Mark ${actionUser?.name}'s account as inactive?`
                            : `Restore ${actionUser?.name}'s account to active status?`}
                    </p>

                    <p className="mu-muted">
                        Their profile and application history will be retained.
                    </p>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setStatusAction(null)}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        disableElevation
                        color={
                            statusAction?.nextStatus === "Inactive"
                                ? "error"
                                : "success"
                        }
                        onClick={saveStatusChange}
                    >
                        {statusAction?.nextStatus === "Inactive"
                            ? "Deactivate"
                            : "Activate"}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default ManageUsers;