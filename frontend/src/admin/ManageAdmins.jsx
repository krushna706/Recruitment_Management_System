import { useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
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

const STORAGE_KEY = "rms-demo-admins-v1";

const EMPTY_FORM = {
    name: "",
    email: "",
    phone: "",
};

const DEMO_ADMINS = [
    {
        id: "demo-account",
        name: "Krushna Chandra Mohanty",
        email: "admin@example.com",
        phone: "",
        role: "admin",
        status: "Active",
        isInitialAdmin: true,
        accessVerifiedAt: "2026-10-18T10:00:00+05:30",
        createdAt: "2026-10-10T09:00:00+05:30",
        updatedAt: "",
    },
    {
        id: "admin-demo-2",
        name: "Sample Recruitment Admin",
        email: "recruitment@example.com",
        phone: "",
        role: "admin",
        status: "Active",
        isInitialAdmin: false,
        accessVerifiedAt: "",
        createdAt: "2026-10-15T11:00:00+05:30",
        updatedAt: "",
    },
];

function loadAdmins() {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            return { admins: DEMO_ADMINS, error: "" };
        }

        const parsed = JSON.parse(stored);

        const valid =
            Array.isArray(parsed) &&
            parsed.every(
                (admin) =>
                    admin &&
                    ["id", "name", "email", "createdAt"].every(
                        (key) => typeof admin[key] === "string"
                    ) &&
                    admin.role === "admin" &&
                    ["Active", "Inactive"].includes(admin.status) &&
                    typeof admin.isInitialAdmin === "boolean" &&
                    typeof admin.accessVerifiedAt === "string"
            );

        if (!valid) {
            throw new Error("Invalid admin data");
        }

        return { admins: parsed, error: "" };
    } catch {
        return {
            admins: [],
            error:
                "Saved admins could not be loaded. Saving is disabled " +
                "to avoid overwriting existing records. Check browser storage and reload.",
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

function formatDate(value) {
    const date = new Date(value);

    if (!value || Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
    }).format(date);
}

function validateAdmin(form, admins, editingId) {
    const errors = {};
    const normalizedEmail = form.email.trim().toLowerCase();

    if (form.name.trim().length < 2) {
        errors.name = "Enter a name with at least 2 characters.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        errors.email = "Enter a valid email address.";
    } else if (
        admins.some(
            (admin) =>
                admin.id !== editingId &&
                admin.email.trim().toLowerCase() === normalizedEmail
        )
    ) {
        errors.email = "An admin with this email already exists.";
    }

    if (
        form.phone.trim() &&
        !/^\+?[0-9\s()-]{7,20}$/.test(form.phone.trim())
    ) {
        errors.phone = "Enter a valid phone number.";
    }

    return errors;
}

function ManageAdmins({ user }) {
    const outletContext = useOutletContext();
    const currentUser = user ?? outletContext?.user;
    const currentUserId = currentUser?.id ?? currentUser?._id;

    const [initialData] = useState(loadAdmins);
    const [admins, setAdmins] = useState(initialData.admins);

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [editingId, setEditingId] = useState(null);
    const [errors, setErrors] = useState({});

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [statusAction, setStatusAction] = useState(null);

    const formRef = useRef(null);
    const nameInputRef = useRef(null);

    const isEditing = editingId !== null;
    const isAuthorized = currentUser?.role === "admin";

    const actionAdmin = admins.find(
        (admin) => admin.id === statusAction?.id
    );

    const activeAdmins = admins.filter(
        (admin) => admin.status === "Active"
    );

    const verifiedActiveAdmins = activeAdmins.filter(
        (admin) => Boolean(admin.accessVerifiedAt)
    );

    const metrics = [
        {
            label: "Total admins",
            value: admins.length,
            detail: "Administration accounts",
            icon: "fa-solid fa-user-shield",
            tone: "blue",
        },
        {
            label: "Active",
            value: activeAdmins.length,
            detail: "Accounts enabled",
            icon: "fa-solid fa-user-check",
            tone: "green",
        },
        {
            label: "Inactive",
            value: admins.length - activeAdmins.length,
            detail: "Accounts deactivated",
            icon: "fa-solid fa-user-slash",
            tone: "red",
        },
        {
            label: "Access pending",
            value: activeAdmins.length - verifiedActiveAdmins.length,
            detail: "First login not verified",
            icon: "fa-regular fa-clock",
            tone: "amber",
        },
    ];

    const query = search.trim().toLowerCase();

    const filteredAdmins = admins
        .filter((admin) => {
            const matchesSearch = [
                admin.name,
                admin.email,
                admin.phone,
            ].some((value) =>
                String(value || "").toLowerCase().includes(query)
            );

            return (
                matchesSearch &&
                (statusFilter === "All" ||
                    admin.status === statusFilter)
            );
        })
        .sort((first, second) =>
            second.createdAt.localeCompare(first.createdAt)
        );

    const visibleAdmins = filteredAdmins.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    function getDeactivationReason(admin) {
        if (!currentUserId) {
            return "Current admin identity is unavailable.";
        }

        if (admin.id === currentUserId) {
            return "You cannot deactivate your own account here.";
        }

        if (admin.status !== "Active") return "";

        if (activeAdmins.length <= 1) {
            return "At least one active admin must remain.";
        }

        if (
            admin.isInitialAdmin &&
            !admins.some(
                (other) =>
                    other.id !== admin.id &&
                    other.status === "Active" &&
                    Boolean(other.accessVerifiedAt)
            )
        ) {
            return "Verify another active admin's login before deactivating the initial admin.";
        }

        return "";
    }

    function persistAdmins(nextAdmins) {
        if (!isAuthorized || initialData.error) return false;

        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(nextAdmins)
            );

            setAdmins(nextAdmins);
            return true;
        } catch {
            toast.error(
                "Could not save the changes. Check browser storage."
            );
            return false;
        }
    }

    function resetForm() {
        setForm({ ...EMPTY_FORM });
        setEditingId(null);
        setErrors({});
    }

    function focusForm() {
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        formRef.current?.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
        });

        nameInputRef.current?.focus({ preventScroll: true });
    }

    function handleNewAdmin() {
        resetForm();
        focusForm();
    }

    function handleEdit(admin) {
        setForm({
            name: admin.name,
            email: admin.email,
            phone: admin.phone || "",
        });

        setEditingId(admin.id);
        setErrors({});
        focusForm();
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setErrors((previous) => ({
            ...previous,
            [name]: "",
        }));
    }

    function handleSubmit(event) {
        event.preventDefault();

        if (!isAuthorized || initialData.error) return;

        const validationErrors = validateAdmin(
            form,
            admins,
            editingId
        );

        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            toast.error("Please check the highlighted fields.");
            return;
        }

        const existingAdmin = isEditing
            ? admins.find((admin) => admin.id === editingId)
            : null;

        if (isEditing && !existingAdmin) {
            toast.error("Admin not found. Reload and try again.");
            return;
        }

        const email = form.email.trim().toLowerCase();
        const emailChanged =
            existingAdmin &&
            existingAdmin.email.toLowerCase() !== email;

        const now = new Date().toISOString();

        let id;

        try {
            id = existingAdmin?.id ?? window.crypto.randomUUID();
        } catch {
            toast.error("Could not create an account ID.");
            return;
        }

        const savedAdmin = {
            ...existingAdmin,
            id,
            name: form.name.trim(),
            email,
            phone: form.phone.trim(),
            role: "admin",
            status: existingAdmin?.status ?? "Active",
            isInitialAdmin: existingAdmin?.isInitialAdmin ?? false,
            accessVerifiedAt: emailChanged
                ? ""
                : existingAdmin?.accessVerifiedAt || "",
            createdAt: existingAdmin?.createdAt || now,
            updatedAt: now,
        };

        const nextAdmins = isEditing
            ? admins.map((admin) =>
                  admin.id === editingId ? savedAdmin : admin
              )
            : [savedAdmin, ...admins];

        if (!persistAdmins(nextAdmins)) return;

        toast.success(
            isEditing
                ? "Admin details updated."
                : "Demo admin record created."
        );

        resetForm();
        setSearch("");
        setStatusFilter("All");
        setPage(0);
    }

    function requestStatusChange(admin) {
        if (admin.status === "Active") {
            const reason = getDeactivationReason(admin);

            if (reason) {
                toast.info(reason);
                return;
            }
        }

        setStatusAction({
            id: admin.id,
            expectedStatus: admin.status,
            nextStatus:
                admin.status === "Active" ? "Inactive" : "Active",
        });
    }

    function confirmStatusChange() {
        if (!actionAdmin || !statusAction || !isAuthorized) return;

        if (actionAdmin.status !== statusAction.expectedStatus) {
            toast.error("Account status changed. Please try again.");
            setStatusAction(null);
            return;
        }

        if (statusAction.nextStatus === "Inactive") {
            const reason = getDeactivationReason(actionAdmin);

            if (reason) {
                toast.error(reason);
                setStatusAction(null);
                return;
            }
        }

        const nextAdmins = admins.map((admin) =>
            admin.id === actionAdmin.id
                ? {
                      ...admin,
                      status: statusAction.nextStatus,
                      // Reactivated admins must verify access again.
                      accessVerifiedAt:
                          statusAction.nextStatus === "Active"
                              ? ""
                              : admin.accessVerifiedAt,
                      updatedAt: new Date().toISOString(),
                  }
                : admin
        );

        if (!persistAdmins(nextAdmins)) return;

        toast.success(
            statusAction.nextStatus === "Active"
                ? "Admin activated."
                : "Admin deactivated."
        );

        setStatusAction(null);
        setPage(0);
    }

    function field(name, label, options = {}) {
        return {
            name,
            label,
            value: form[name],
            onChange: handleChange,
            fullWidth: true,
            size: "small",
            ...options,
            error: Boolean(errors[name]),
            helperText: errors[name] || options.helperText,
        };
    }

    if (!isAuthorized) {
        return (
            <Alert severity="error">
                An authenticated admin account is required to manage admins.
            </Alert>
        );
    }

    return (
        <div className="manage-jobs manage-admins">
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">
                        ADMINISTRATION
                    </span>

                    <h1>Manage Admins</h1>

                    <p>
                        Manage your administration team and account access.
                    </p>
                </div>

                <Button
                    variant="contained"
                    disableElevation
                    onClick={handleNewAdmin}
                    startIcon={
                        <i
                            className="fa-solid fa-plus"
                            aria-hidden="true"
                        />
                    }
                >
                    Add admin
                </Button>
            </header>

            {initialData.error && (
                <Alert severity="error" className="mj-alert">
                    {initialData.error}
                </Alert>
            )}

            <section
                className="mj-metrics"
                aria-label="Admin overview"
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
                ref={formRef}
                className="mj-card mj-form-card"
                aria-labelledby="ma-form-title"
            >
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span
                            className="mj-header-icon"
                            aria-hidden="true"
                        >
                            <i className="fa-solid fa-user-shield" />
                        </span>

                        <div>
                            <h2 id="ma-form-title">
                                {isEditing
                                    ? "Edit admin details"
                                    : "Add an administrator"}
                            </h2>

                            <p>
                                Add contact details for an administration account.
                            </p>
                        </div>
                    </div>

                    <Chip
                        label={isEditing ? "Editing" : "Admin account"}
                        color={isEditing ? "warning" : "primary"}
                        variant="outlined"
                        size="small"
                    />
                </header>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="mj-form-body">
                        <div className="mj-form-grid">
                            <TextField
                                {...field("name", "Full name", {
                                    required: true,
                                    inputRef: nameInputRef,
                                    placeholder: "Enter admin name",
                                })}
                            />

                            <TextField
                                {...field("email", "Email address", {
                                    required: true,
                                    type: "email",
                                    placeholder: "admin@company.com",
                                })}
                            />

                            <TextField
                                {...field("phone", "Phone number", {
                                    type: "tel",
                                    helperText: "Optional contact number.",
                                })}
                            />

                            <TextField
                                label="Account role"
                                value="Admin"
                                fullWidth
                                size="small"
                                disabled
                                helperText="Administration access."
                            />
                        </div>

                        <div className="mj-status-note">
                            <i
                                className="fa-solid fa-circle-info"
                                aria-hidden="true"
                            />

                            <p>
                                New administrators must verify access by
                                successfully signing in before replacing
                                the initial admin.
                            </p>
                        </div>
                    </div>

                    <footer className="mj-form-footer">
                        <p>
                            <span>*</span> Required fields
                        </p>

                        <div className="mj-form-actions">
                            <Button
                                type="button"
                                variant="outlined"
                                onClick={resetForm}
                            >
                                {isEditing ? "Cancel edit" : "Reset"}
                            </Button>

                            <Button
                                type="submit"
                                variant="contained"
                                disableElevation
                                disabled={Boolean(initialData.error)}
                                startIcon={
                                    <i
                                        className="fa-regular fa-floppy-disk"
                                        aria-hidden="true"
                                    />
                                }
                            >
                                {isEditing
                                    ? "Save changes"
                                    : "Add admin"}
                            </Button>
                        </div>
                    </footer>
                </form>
            </section>

            <section
                className="mj-card"
                aria-labelledby="ma-list-title"
            >
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span
                            className="mj-header-icon"
                            aria-hidden="true"
                        >
                            <i className="fa-solid fa-users-gear" />
                        </span>

                        <div>
                            <h2 id="ma-list-title">Admin accounts</h2>
                            <p>
                                Review access verification and manage availability.
                            </p>
                        </div>
                    </div>

                    <span className="mj-result-count">
                        {filteredAdmins.length} of {admins.length} admins
                    </span>
                </header>

                <div className="ma-filters">
                    <TextField
                        label="Search admins"
                        placeholder="Name, email or phone"
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
                        <MenuItem value="All">All admins</MenuItem>
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="Inactive">Inactive</MenuItem>
                    </TextField>

                    <Button
                        variant="outlined"
                        onClick={() => {
                            setSearch("");
                            setStatusFilter("All");
                            setPage(0);
                        }}
                    >
                        Reset
                    </Button>
                </div>

                <TableContainer>
                    <Table
                        className="mj-table ma-table"
                        aria-label="Administrator accounts"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Administrator</TableCell>
                                <TableCell>Contact</TableCell>
                                <TableCell>Access verification</TableCell>
                                <TableCell>Created on</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleAdmins.map((admin) => {
                                const reason =
                                    admin.status === "Active"
                                        ? getDeactivationReason(admin)
                                        : "";

                                return (
                                    <TableRow
                                        key={admin.id}
                                        hover
                                        selected={editingId === admin.id}
                                    >
                                        <TableCell>
                                            <div className="mj-job-cell">
                                                <span
                                                    className="mj-company-avatar"
                                                    aria-hidden="true"
                                                >
                                                    {getInitials(admin.name)}
                                                </span>

                                                <div>
                                                    <strong>{admin.name}</strong>

                                                    <div className="mj-job-tags">
                                                        <span>Admin</span>

                                                        {admin.isInitialAdmin && (
                                                            <span>Initial admin</span>
                                                        )}

                                                        {admin.id === currentUserId && (
                                                            <span>You</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="mj-cell-primary">
                                                {admin.email}
                                            </span>

                                            <span className="mj-cell-secondary">
                                                {admin.phone || "Phone not provided"}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                label={
                                                    admin.accessVerifiedAt
                                                        ? "Verified"
                                                        : "Pending login"
                                                }
                                                color={
                                                    admin.accessVerifiedAt
                                                        ? "success"
                                                        : "warning"
                                                }
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <time dateTime={admin.createdAt}>
                                                {formatDate(admin.createdAt)}
                                            </time>
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                label={admin.status}
                                                color={
                                                    admin.status === "Active"
                                                        ? "success"
                                                        : "default"
                                                }
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>

                                        <TableCell align="right">
                                            <div className="ma-actions">
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => handleEdit(admin)}
                                                    aria-label={`Edit ${admin.name}`}
                                                >
                                                    Edit
                                                </Button>

                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color={
                                                        admin.status === "Active"
                                                            ? "error"
                                                            : "success"
                                                    }
                                                    disabled={Boolean(reason)}
                                                    onClick={() =>
                                                        requestStatusChange(admin)
                                                    }
                                                    aria-label={`${
                                                        admin.status === "Active"
                                                            ? "Deactivate"
                                                            : "Activate"
                                                    } ${admin.name}`}
                                                >
                                                    {admin.status === "Active"
                                                        ? "Deactivate"
                                                        : "Activate"}
                                                </Button>
                                            </div>

                                            {reason && (
                                                <p className="ma-action-note">
                                                    {reason}
                                                </p>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {!visibleAdmins.length && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="mj-empty">
                                            <span aria-hidden="true">
                                                <i className="fa-solid fa-user-shield" />
                                            </span>

                                            <h3>No matching admins</h3>
                                            <p>
                                                Try another search or account status.
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
                    count={filteredAdmins.length}
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
                open={Boolean(actionAdmin)}
                onClose={() => setStatusAction(null)}
                maxWidth="xs"
                fullWidth
                className="ma-dialog"
                aria-labelledby="ma-status-title"
                aria-describedby="ma-status-description"
            >
                <DialogTitle id="ma-status-title">
                    {statusAction?.nextStatus === "Inactive"
                        ? "Deactivate admin?"
                        : "Activate admin?"}
                </DialogTitle>

                <DialogContent>
                    <p id="ma-status-description">
                        {statusAction?.nextStatus === "Inactive"
                            ? `Deactivate ${actionAdmin?.name}'s administration account?`
                            : `Activate ${actionAdmin?.name}'s administration account?`}
                    </p>

                    <p className="ma-dialog-note">
                        Account records will be retained.
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
                        onClick={confirmStatusChange}
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

export default ManageAdmins;