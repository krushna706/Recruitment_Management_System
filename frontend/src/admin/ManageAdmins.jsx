import usePageSEO from "../hooks/usePageSEO";
import { seoPages } from "../config/seoConfig";

import { formatDate, getErrorMessage as getApiError } from "../utils/dataFormat";

import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Alert, Avatar, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField } from "@mui/material";
import { toast } from "react-toastify";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// ================== ADMIN CONFIGURATION ==================
const DEFAULT_AVATAR = "/images/default-avatar.svg";

const EMPTY_FORM = {
    name: "",
    email: "",
    phone: "",
    password: "",
    currentPassword: "",
};

const INITIAL_COUNTS = {
    total: 0,
    active: 0,
    inactive: 0,
};

// ================== ADMIN AVATAR ==================
// Show Cloudinary image or existing default profile image.
function AdminAvatar({ admin }) {
    return (
        <Avatar
            src={admin?.avatar?.url || DEFAULT_AVATAR}
            alt={admin?.name || "Administrator"}
            variant="rounded"
            className="mj-company-avatar"
        />
    );
}

// ================== ADMIN STATUS ==================
function AdminStatus({ status }) {
    return (
        <Chip
            label={status}
            color={status === "Active" ? "success" : "default"}
            variant="outlined"
            size="small"
        />
    );
}

// ================== ADMIN FORM VALIDATION ==================
function validateAdmin(form, isEditing, emailChanged) {
    const errors = {};

    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (name.length < 2 || name.length > 100) {
        errors.name = "Enter a name containing 2–100 characters.";
    }

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = "Enter a valid email address.";
    }

    // Same Indian mobile rule as Signup and User Profile.
    if (!/^[6-9]\d{9}$/.test(phone)) {
        errors.phone = "Enter a valid 10-digit Indian mobile number.";
    }

    // ================== ADMIN PASSWORD VALIDATION ==================
    if (!isEditing) {
        if (form.password.length < 6 || new TextEncoder().encode(form.password).length > 72) {
            errors.password =
                "Password must have at least 6 characters and not exceed 72 UTF-8 bytes.";
        }
    }

    // Creation and sensitive email changes require reauthentication.
    if (!isEditing || emailChanged) {
        if (!form.currentPassword) {
            errors.currentPassword = "Enter your current admin password.";
        }
    }

    return errors;
}

// ================== ADMIN DETAILS HELPER ==================
function AdminDetail({ label, value }) {
    return (
        <div className="mu-detail">
            <dt>{label}</dt>
            <dd>{value || "Not provided"}</dd>
        </div>
    );
}

// ================== MANAGE ADMINS PAGE ==================
function ManageAdmins({ user: propUser }) {
    usePageSEO(seoPages.manageAdmins);
    
    const navigate = useNavigate();
    const outletContext = useOutletContext();

    const { user: authUser, updateUserProfile, refreshUser } = useAuth();

    const currentUser = authUser ?? propUser ?? outletContext?.user;

    const currentUserId = String(currentUser?._id || currentUser?.id || "");

    const isAuthorized = currentUser?.role === "admin";

    const formRef = useRef(null);
    const nameInputRef = useRef(null);

    // ================== ADMIN DATA ==================
    const [admins, setAdmins] = useState([]);
    const [counts, setCounts] = useState(INITIAL_COUNTS);
    const [total, setTotal] = useState(0);

    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [listRevision, setListRevision] = useState(0);

    // ================== ADMIN FORM ==================
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [editingId, setEditingId] = useState(null);
    const [editingOriginal, setEditingOriginal] = useState(null);

    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // ================== SEARCH AND PAGINATION ==================
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    // ================== ADMIN DETAILS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState("");

    // ================== STATUS CHANGE ==================
    const [statusAction, setStatusAction] = useState(null);
    const [statusPassword, setStatusPassword] = useState("");
    const [statusSaving, setStatusSaving] = useState(false);

    // ================== DERIVED VALUES ==================
    const isEditing = Boolean(editingId);

    const emailChanged = Boolean(
        isEditing &&
        editingOriginal &&
        form.email.trim().toLowerCase() !== editingOriginal.email.toLowerCase()
    );

    const hasFormChanges = isEditing
        ? Boolean(
              editingOriginal &&
              (form.name.trim() !== editingOriginal.name ||
                  form.email.trim().toLowerCase() !== editingOriginal.email.toLowerCase() ||
                  form.phone.trim() !== (editingOriginal.phone || ""))
          )
        : true;

    // ================== DEBOUNCED SEARCH ==================
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 350);

        return () => clearTimeout(timer);
    }, [search]);

    // ================== FETCH ADMINS FROM MONGODB ==================
    useEffect(() => {
        if (!isAuthorized) return;

        const controller = new AbortController();
        let active = true;

        async function fetchAdmins() {
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

                const { data } = await api.get("/admin/admins", {
                    params,
                    signal: controller.signal,
                });

                if (!active) return;

                if (
                    !data?.success ||
                    !Array.isArray(data.admins) ||
                    !data.pagination ||
                    !data.counts
                ) {
                    throw new Error("Invalid admin API response.");
                }

                const nextTotal = Number(data.pagination.total);

                if (!Number.isSafeInteger(nextTotal) || nextTotal < 0) {
                    throw new Error("Invalid pagination data.");
                }

                // ================== PAGE CORRECTION ==================
                const lastPage = Math.max(0, Math.ceil(nextTotal / rowsPerPage) - 1);

                if (page > lastPage) {
                    setPage(lastPage);
                    return;
                }

                setAdmins(data.admins);
                setTotal(nextTotal);

                setCounts({
                    total: Number(data.counts.total) || 0,
                    active: Number(data.counts.active) || 0,
                    inactive: Number(data.counts.inactive) || 0,
                });
            } catch (error) {
                if (!active) return;

                setAdmins([]);
                setTotal(0);
                setListError(getApiError(error, "Unable to load admin accounts."));
            } finally {
                if (active) setLoading(false);
            }
        }

        fetchAdmins();

        return () => {
            active = false;
            controller.abort();
        };
    }, [isAuthorized, page, rowsPerPage, debouncedSearch, statusFilter, listRevision]);

    // ================== FETCH SINGLE ADMIN ==================
    useEffect(() => {
        if (!selectedId || !isAuthorized) return;

        const controller = new AbortController();
        let active = true;

        async function fetchAdminDetails() {
            setDetailsLoading(true);
            setDetailsError("");
            setSelectedAdmin(null);

            try {
                const { data } = await api.get(`/admin/admins/${encodeURIComponent(selectedId)}`, {
                    signal: controller.signal,
                });

                if (!active) return;

                if (!data?.success || !data.admin) {
                    throw new Error("Invalid admin details response.");
                }

                setSelectedAdmin(data.admin);
            } catch (error) {
                if (!active) return;

                setDetailsError(getApiError(error, "Unable to load admin details."));
            } finally {
                if (active) setDetailsLoading(false);
            }
        }

        fetchAdminDetails();

        return () => {
            active = false;
            controller.abort();
        };
    }, [selectedId, isAuthorized, listRevision]);

    // ================== ADMIN METRICS ==================
    const metrics = [
        {
            label: "Total admins",
            value: counts.total,
            detail: "Administration accounts",
            icon: "fa-solid fa-user-shield",
            tone: "blue",
        },
        {
            label: "Active",
            value: counts.active,
            detail: "Accounts enabled",
            icon: "fa-solid fa-user-check",
            tone: "green",
        },
        {
            label: "Inactive",
            value: counts.inactive,
            detail: "Accounts deactivated",
            icon: "fa-solid fa-user-slash",
            tone: "red",
        },
        {
            label: "Search results",
            value: total,
            detail: "Matching current filters",
            icon: "fa-solid fa-magnifying-glass",
            tone: "amber",
        },
    ];

    // ================== RESET FORM ==================
    function resetForm() {
        setForm({ ...EMPTY_FORM });
        setEditingId(null);
        setEditingOriginal(null);
        setErrors({});
    }

    // ================== FOCUS ADMIN FORM ==================
    function focusForm() {
        formRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });

        nameInputRef.current?.focus({
            preventScroll: true,
        });
    }

    // ================== NEW ADMIN ==================
    function handleNewAdmin() {
        resetForm();
        focusForm();
    }

    // ================== EDIT ADMIN ==================
    function handleEdit(admin) {
        setEditingId(admin.id);
        setEditingOriginal(admin);

        setForm({
            name: admin.name,
            email: admin.email,
            phone: admin.phone || "",
            password: "",
            currentPassword: "",
        });

        setErrors({});
        focusForm();
    }

    // ================== HANDLE FORM INPUT ==================
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

    // ================== SAVE ADMIN ACCOUNT ==================
    async function handleSubmit(event) {
        event.preventDefault();

        if (!isAuthorized || saving || !hasFormChanges) {
            return;
        }

        const nextErrors = validateAdmin(form, isEditing, emailChanged);

        setErrors(nextErrors);

        if (Object.keys(nextErrors).length) {
            toast.error("Please check the highlighted fields.");
            return;
        }

        setSaving(true);

        try {
            const normalized = {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim(),
            };

            let response;

            if (isEditing) {
                // ================== UPDATE EXISTING ADMIN ==================
                // Send only changed fields.
                const changes = {};

                if (normalized.name !== editingOriginal.name) {
                    changes.name = normalized.name;
                }

                if (normalized.phone !== (editingOriginal.phone || "")) {
                    changes.phone = normalized.phone;
                }

                if (emailChanged) {
                    changes.email = normalized.email;
                    changes.currentPassword = form.currentPassword;
                }

                response = await api.patch(
                    `/admin/admins/${encodeURIComponent(editingId)}`,
                    changes
                );
            } else {
                // ================== CREATE NEW ADMIN ==================
                // Initial password must be changed after first login.
                response = await api.post("/admin/admins", {
                    ...normalized,
                    password: form.password,
                    currentPassword: form.currentPassword,
                });
            }

            const data = response.data;

            if (!data?.success || !data.admin) {
                throw new Error("Server did not confirm the admin update.");
            }

            const editedSelf = isEditing && String(data.admin.id) === currentUserId;

            // ================== SYNC CURRENT ADMIN PROFILE ==================
            if (editedSelf && !emailChanged) {
                updateUserProfile(data.admin);
            }

            toast.success(
                data.message ||
                    (isEditing ? "Admin updated successfully." : "Admin created successfully.")
            );

            resetForm();
            setSearch("");
            setDebouncedSearch("");
            setStatusFilter("All");
            setPage(0);
            setListRevision((previous) => previous + 1);

            // Own email change invalidates previous JWT sessions.
            if (editedSelf && emailChanged) {
                await refreshUser();

                navigate("/manage", {
                    replace: true,
                });
            }
        } catch (error) {
            toast.error(getApiError(error, "Unable to save admin details."));
        } finally {
            setSaving(false);
        }
    }

    // ================== VIEW ADMIN DETAILS ==================
    function openAdminDetails(admin) {
        setDetailsError("");
        setSelectedAdmin(null);
        setSelectedId(admin.id);
    }

    function closeAdminDetails() {
        setSelectedId(null);
        setSelectedAdmin(null);
        setDetailsError("");
    }

    // ================== REQUEST STATUS CHANGE ==================
    function requestStatusChange(admin) {
        if (statusSaving) return;

        if (admin.status === "Active" && String(admin.id) === currentUserId) {
            toast.info("You cannot deactivate your own account here.");
            return;
        }

        if (admin.status === "Active" && counts.active <= 1) {
            toast.info("The last active admin cannot be deactivated.");
            return;
        }

        setStatusPassword("");

        setStatusAction({
            id: admin.id,
            name: admin.name,
            expectedStatus: admin.status,
            nextStatus: admin.status === "Active" ? "Inactive" : "Active",
        });
    }

    // ================== CONFIRM ADMIN STATUS CHANGE ==================
    async function confirmStatusChange() {
        if (!statusAction || statusSaving) return;

        if (!statusPassword) {
            toast.error("Enter your current admin password.");
            return;
        }

        setStatusSaving(true);

        try {
            // ================== SECURE STATUS UPDATE ==================
            const { data } = await api.patch(
                `/admin/admins/${encodeURIComponent(statusAction.id)}/status`,
                {
                    expectedStatus: statusAction.expectedStatus,
                    status: statusAction.nextStatus,
                    currentPassword: statusPassword,
                }
            );

            if (!data?.success || !data.admin) {
                throw new Error("Server did not confirm account status.");
            }

            toast.success(data.message || "Admin status updated successfully.");

            setStatusAction(null);
            setStatusPassword("");
            setPage(0);
            setListRevision((previous) => previous + 1);
        } catch (error) {
            toast.error(getApiError(error, "Unable to change admin account status."));

            if ([404, 409].includes(error.response?.status)) {
                setStatusAction(null);
                setStatusPassword("");
                setListRevision((previous) => previous + 1);
            }
        } finally {
            setStatusSaving(false);
        }
    }

    // ================== SHARED FIELD PROPERTIES ==================
    function field(name, label, options = {}) {
        return {
            name,
            label,
            value: form[name],
            onChange: handleChange,
            fullWidth: true,
            size: "small",
            disabled: saving,
            ...options,
            error: Boolean(errors[name]),
            helperText: errors[name] || options.helperText,
        };
    }

    // ================== ADMIN AUTHORIZATION ==================
    if (!isAuthorized) {
        return (
            <Alert severity="error">
                An authenticated admin account is required to manage admins.
            </Alert>
        );
    }

    return (
        <div className="manage-jobs manage-admins">
            {/* ================== PAGE HEADER ================== */}
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">ADMINISTRATION</span>

                    <h1>Manage Admins</h1>

                    <p>Manage your administration team and account access.</p>
                </div>

                <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setListRevision((previous) => previous + 1)}
                    disabled={loading}
                    startIcon={<i className="fa-solid fa-arrows-rotate" aria-hidden="true" />}
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

            {/* ================== ADMIN STATISTICS ================== */}
            <section className="mj-metrics" aria-label="Admin overview">
                {metrics.map((metric) => (
                    <article key={metric.label} className={`mj-metric mj-tone-${metric.tone}`}>
                        <div className="mj-metric-top">
                            <span className="mj-metric-label">{metric.label}</span>

                            <span className="mj-metric-icon" aria-hidden="true">
                                <i className={metric.icon} />
                            </span>
                        </div>

                        <strong>{metric.value}</strong>
                        <p>{metric.detail}</p>
                    </article>
                ))}
            </section>

            {/* ================== ADMIN FORM ================== */}
            <section ref={formRef} className="mj-card mj-form-card" aria-labelledby="ma-form-title">
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span className="mj-header-icon" aria-hidden="true">
                            <i className="fa-solid fa-user-shield" />
                        </span>

                        <div>
                            <h2 id="ma-form-title">
                                {isEditing ? "Edit admin details" : "Add an administrator"}
                            </h2>

                            <p>
                                {isEditing
                                    ? "Update administrator contact details."
                                    : "Create a secure administration account."}
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
                            {/* ================== ADMIN NAME ================== */}
                            <TextField
                                {...field("name", "Full name", {
                                    required: true,
                                    inputRef: nameInputRef,
                                    autoComplete: "name",
                                    placeholder: "Enter admin name",
                                    slotProps: {
                                        htmlInput: {
                                            maxLength: 100,
                                        },
                                    },
                                })}
                            />

                            {/* ================== ADMIN EMAIL ================== */}
                            <TextField
                                {...field("email", "Email address", {
                                    required: true,
                                    type: "email",
                                    autoComplete: "email",
                                    placeholder: "admin@company.com",
                                    slotProps: {
                                        htmlInput: {
                                            maxLength: 254,
                                        },
                                    },
                                })}
                            />

                            {/* ================== ADMIN PHONE ================== */}
                            <TextField
                                {...field("phone", "Phone number", {
                                    required: !isEditing,
                                    type: "tel",
                                    autoComplete: "tel",
                                    helperText: "10-digit Indian mobile number.",
                                    slotProps: {
                                        htmlInput: {
                                            maxLength: 10,
                                            inputMode: "numeric",
                                        },
                                    },
                                })}
                            />

                            {/* ================== ACCOUNT ROLE ================== */}
                            <TextField
                                label="Account role"
                                value="Admin"
                                fullWidth
                                size="small"
                                disabled
                                helperText="Administrator access."
                            />

                            {/* ================== INITIAL PASSWORD ================== */}
                            {!isEditing && (
                                <TextField
                                    {...field("password", "Initial password", {
                                        type: "password",
                                        required: true,
                                        autoComplete: "new-password",
                                        helperText:
                                            "Minimum 6 characters. Admin must change it after first login.",
                                    })}
                                />
                            )}

                            {/* ================== CURRENT ADMIN PASSWORD ================== */}
                            {(!isEditing || emailChanged) && (
                                <TextField
                                    {...field("currentPassword", "Your current password", {
                                        type: "password",
                                        required: true,
                                        autoComplete: "current-password",
                                        helperText: "Verify your identity before this action.",
                                    })}
                                />
                            )}
                        </div>

                        {/* ================== SECURITY INFORMATION ================== */}
                        <div className="mj-status-note">
                            <i className="fa-solid fa-circle-info" aria-hidden="true" />

                            <p>
                                New administrators must change their initial password and
                                successfully log in before replacing the initial admin. Their
                                profile photo can be uploaded from Admin Profile.
                            </p>
                        </div>
                    </div>

                    {/* ================== FORM ACTIONS ================== */}
                    <footer className="mj-form-footer">
                        <p>
                            <span>*</span> Required fields
                        </p>

                        <div className="mj-form-actions">
                            {isEditing && (
                                <Button
                                    type="button"
                                    variant="outlined"
                                    disabled={saving}
                                    onClick={handleNewAdmin}
                                >
                                    Add new
                                </Button>
                            )}

                            <Button
                                type="button"
                                variant="outlined"
                                disabled={saving}
                                onClick={resetForm}
                            >
                                {isEditing ? "Cancel edit" : "Reset"}
                            </Button>

                            <Button
                                type="submit"
                                variant="contained"
                                disableElevation
                                disabled={saving || !hasFormChanges}
                                startIcon={
                                    saving ? (
                                        <CircularProgress size={16} color="inherit" />
                                    ) : (
                                        <i
                                            className="fa-regular fa-floppy-disk"
                                            aria-hidden="true"
                                        />
                                    )
                                }
                            >
                                {saving ? "Saving..." : isEditing ? "Save changes" : "Add admin"}
                            </Button>
                        </div>
                    </footer>
                </form>
            </section>

            {/* ================== ADMIN ACCOUNTS ================== */}
            <section className="mj-card" aria-labelledby="ma-list-title">
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span className="mj-header-icon" aria-hidden="true">
                            <i className="fa-solid fa-users-gear" />
                        </span>

                        <div>
                            <h2 id="ma-list-title">Admin accounts</h2>

                            <p>
                                Review administrators, login verification and account availability.
                            </p>
                        </div>
                    </div>

                    <span className="mj-result-count">
                        {loading ? "Loading admins..." : `${total} of ${counts.total} admins`}
                    </span>
                </header>

                {/* ================== SEARCH AND FILTER ================== */}
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
                        <MenuItem value="All">All admins</MenuItem>
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="Inactive">Inactive</MenuItem>
                    </TextField>

                    <Button
                        type="button"
                        variant="outlined"
                        onClick={() => {
                            setSearch("");
                            setDebouncedSearch("");
                            setStatusFilter("All");
                            setPage(0);
                        }}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== ADMIN TABLE ================== */}
                <TableContainer>
                    <Table className="mj-table ma-table" aria-label="Administrator accounts">
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
                            {/* ================== LOADING ================== */}
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                        <CircularProgress size={26} />
                                        <p>Loading admin accounts...</p>
                                    </TableCell>
                                </TableRow>
                            )}

                            {/* ================== ADMIN RECORDS ================== */}
                            {!loading &&
                                admins.map((admin) => {
                                    const isSelf = String(admin.id) === currentUserId;

                                    const isInitial = !admin.createdBy;

                                    const cannotDeactivate =
                                        admin.status === "Active" && (isSelf || counts.active <= 1);

                                    return (
                                        <TableRow key={admin.id} hover>
                                            <TableCell>
                                                <div className="mj-job-cell">
                                                    <AdminAvatar admin={admin} />

                                                    <div>
                                                        <strong>{admin.name}</strong>

                                                        <div className="mj-job-tags">
                                                            <span>Admin</span>

                                                            {isInitial && (
                                                                <span>Initial admin</span>
                                                            )}

                                                            {isSelf && <span>You</span>}
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
                                                        admin.lastLoginAt
                                                            ? "Logged in"
                                                            : "Pending login"
                                                    }
                                                    color={
                                                        admin.lastLoginAt ? "success" : "warning"
                                                    }
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <time dateTime={admin.createdAt || ""}>
                                                    {formatDate(admin.createdAt)}
                                                </time>
                                            </TableCell>

                                            <TableCell>
                                                <AdminStatus status={admin.status} />
                                            </TableCell>

                                            <TableCell align="right">
                                                <div className="ma-actions">
                                                    <Button
                                                        type="button"
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => openAdminDetails(admin)}
                                                    >
                                                        View
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => handleEdit(admin)}
                                                    >
                                                        Edit
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        size="small"
                                                        variant="outlined"
                                                        disabled={statusSaving || cannotDeactivate}
                                                        color={
                                                            admin.status === "Active"
                                                                ? "error"
                                                                : "success"
                                                        }
                                                        onClick={() => requestStatusChange(admin)}
                                                    >
                                                        {admin.status === "Active"
                                                            ? "Deactivate"
                                                            : "Activate"}
                                                    </Button>
                                                </div>

                                                {cannotDeactivate && (
                                                    <p className="ma-action-note">
                                                        {isSelf
                                                            ? "Your own account cannot be deactivated here."
                                                            : "The last active admin must remain enabled."}
                                                    </p>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                            {/* ================== EMPTY STATE ================== */}
                            {!loading && admins.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="mj-empty">
                                            <span aria-hidden="true">
                                                <i className="fa-solid fa-user-shield" />
                                            </span>

                                            <h3>
                                                {listError
                                                    ? "Unable to load admins"
                                                    : "No matching admins"}
                                            </h3>

                                            <p>
                                                {listError
                                                    ? "Refresh to try again."
                                                    : "Try another search or status filter."}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ================== PAGINATION ================== */}
                <TablePagination
                    component="div"
                    count={total}
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

            {/* ================== ADMIN DETAILS DIALOG ================== */}
            <Dialog
                open={Boolean(selectedId)}
                onClose={closeAdminDetails}
                maxWidth="sm"
                fullWidth
                className="ma-dialog"
            >
                <DialogTitle>Administrator details</DialogTitle>

                <DialogContent dividers>
                    {detailsLoading && (
                        <div
                            style={{
                                textAlign: "center",
                                padding: 24,
                            }}
                        >
                            <CircularProgress size={26} />
                            <p>Loading admin details...</p>
                        </div>
                    )}

                    {!detailsLoading && detailsError && (
                        <Alert severity="error">{detailsError}</Alert>
                    )}

                    {!detailsLoading && !detailsError && selectedAdmin && (
                        <>
                            <div
                                className="mj-job-cell"
                                style={{
                                    marginBottom: 24,
                                    alignItems: "center",
                                }}
                            >
                                <AdminAvatar admin={selectedAdmin} />

                                <div>
                                    <strong>{selectedAdmin.name}</strong>

                                    <p>{selectedAdmin.email}</p>
                                </div>
                            </div>

                            <dl className="mu-detail-grid">
                                <AdminDetail label="Phone" value={selectedAdmin.phone} />

                                <AdminDetail label="Role" value="Administrator" />

                                <AdminDetail label="Status" value={selectedAdmin.status} />

                                <AdminDetail
                                    label="Created on"
                                    value={formatDate(selectedAdmin.createdAt)}
                                />

                                <AdminDetail
                                    label="Last login"
                                    value={formatDate(selectedAdmin.lastLoginAt, true)}
                                />

                                <AdminDetail label="Account ID" value={selectedAdmin.id} />
                            </dl>
                        </>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button type="button" variant="outlined" onClick={closeAdminDetails}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ================== STATUS CONFIRMATION ================== */}
            <Dialog
                open={Boolean(statusAction)}
                onClose={() => {
                    if (!statusSaving) {
                        setStatusAction(null);
                        setStatusPassword("");
                    }
                }}
                maxWidth="xs"
                fullWidth
                className="ma-dialog"
            >
                <DialogTitle>
                    {statusAction?.nextStatus === "Inactive"
                        ? "Deactivate admin?"
                        : "Activate admin?"}
                </DialogTitle>

                <DialogContent>
                    <p>
                        {statusAction?.nextStatus === "Inactive"
                            ? `Deactivate ${statusAction.name}'s account?`
                            : `Activate ${statusAction?.name}'s account?`}
                    </p>

                    <p className="ma-dialog-note">
                        Existing account records will be retained. Current sessions will be revoked.
                    </p>

                    <TextField
                        label="Your current password"
                        type="password"
                        value={statusPassword}
                        onChange={(event) => setStatusPassword(event.target.value)}
                        required
                        fullWidth
                        size="small"
                        autoComplete="current-password"
                        disabled={statusSaving}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>

                <DialogActions>
                    <Button
                        type="button"
                        disabled={statusSaving}
                        onClick={() => {
                            setStatusAction(null);
                            setStatusPassword("");
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="button"
                        variant="contained"
                        disableElevation
                        disabled={statusSaving || !statusPassword}
                        color={statusAction?.nextStatus === "Inactive" ? "error" : "success"}
                        onClick={confirmStatusChange}
                        startIcon={
                            statusSaving ? <CircularProgress size={16} color="inherit" /> : null
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
export default ManageAdmins;
