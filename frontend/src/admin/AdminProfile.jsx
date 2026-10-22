
import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
    Alert,
    Avatar,
    Button,
    Chip,
    CircularProgress,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// ================== PROFILE CONFIGURATION ==================
const DEFAULT_AVATAR = "/images/default-avatar.svg";
const MAX_AVATAR_SIZE = 3 * 1024 * 1024;
const MAX_PASSWORD_BYTES = 72;

// ================== DATE FORMATTING ==================
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

// ================== API ERROR MESSAGE ==================
function getApiError(error, fallback) {
    return error.response?.data?.message || fallback;
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

// ================== AVATAR VALIDATION ==================
function validateAvatar(file) {
    if (!file) {
        return "Please choose a profile image.";
    }

    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
        return "Choose a JPG, JPEG, PNG or WebP image.";
    }

    if (
        !["image/jpeg", "image/png", "image/webp"].includes(
            file.type
        )
    ) {
        return "Invalid image format.";
    }

    if (!file.size || file.size > MAX_AVATAR_SIZE) {
        return "Profile image must not exceed 3 MB.";
    }

    return "";
}

// ================== TEMPORARY IMAGE PREVIEW ==================
// Revoke local object URLs to avoid memory leaks.
function useAvatarPreview(file) {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (!file) return undefined;

        const url = URL.createObjectURL(file);

        setPreview({
            file,
            url,
        });

        return () => URL.revokeObjectURL(url);
    }, [file]);

    return preview?.file === file ? preview.url : null;
}

// ================== ADMIN PROFILE CONTENT ==================
function AdminProfileContent({ user, userId }) {
    const navigate = useNavigate();

    const { updateUserProfile, refreshUser } = useAuth();

    const avatarInputRef = useRef(null);

    // ================== PROFILE STATES ==================
    const [profile, setProfile] = useState(null);

    const [form, setForm] = useState({
        name: user.name || "",
        phone: user.phone || "",
    });

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [reloadRevision, setReloadRevision] = useState(0);

    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // ================== AVATAR STATES ==================
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [avatarError, setAvatarError] = useState("");
    const [avatarUploading, setAvatarUploading] = useState(false);

    const avatarPreview = useAvatarPreview(selectedAvatar);

    // ================== PASSWORD STATES ==================
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordSaving, setPasswordSaving] = useState(false);

    // ================== DERIVED VALUES ==================
    const hasChanges = Boolean(
        profile &&
        (
            form.name.trim() !== profile.name ||
            form.phone.trim() !== (profile.phone || "")
        )
    );

    const displayName = profile?.name || user.name || "Administrator";

    const avatarUrl =
        avatarPreview ||
        profile?.avatar?.url ||
        DEFAULT_AVATAR;

    const isBusy =
        saving || avatarUploading || passwordSaving;

    // ================== FETCH ADMIN PROFILE ==================
    // MongoDB is the source of truth, not localStorage.
    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        async function loadProfile() {
            setLoading(true);
            setLoadError("");

            try {
                const { data } = await api.get(
                    "/admin/me/profile",
                    {
                        signal: controller.signal,
                    }
                );

                if (!active) return;

                if (!data?.success || !data.profile) {
                    throw new Error("Invalid admin profile response.");
                }

                const admin = data.profile;

                setProfile(admin);

                setForm({
                    name: admin.name || "",
                    phone: admin.phone || "",
                });

                // Sync header name and avatar with MongoDB.
                updateUserProfile(admin);
            } catch (error) {
                if (!active) return;

                setLoadError(
                    getApiError(
                        error,
                        "Unable to load your admin profile."
                    )
                );
            } finally {
                if (active) setLoading(false);
            }
        }

        loadProfile();

        return () => {
            active = false;
            controller.abort();
        };
    }, [userId, reloadRevision, updateUserProfile]);

    // ================== HANDLE PROFILE INPUT ==================
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

    // ================== RESET PROFILE FORM ==================
    function resetForm() {
        if (!profile) return;

        setForm({
            name: profile.name || "",
            phone: profile.phone || "",
        });

        setErrors({});
    }

    // ================== UPDATE ADMIN PROFILE ==================
    async function handleSubmit(event) {
        event.preventDefault();

        if (!profile || !hasChanges || isBusy) return;

        const name = form.name.trim();
        const phone = form.phone.trim();

        const nextErrors = {};

        // ================== NAME VALIDATION ==================
        if (name.length < 2 || name.length > 100) {
            nextErrors.name =
                "Enter a name containing 2–100 characters.";
        }

        // ================== PHONE VALIDATION ==================
        // Same 10-digit Indian mobile rule as Signup.
        if (
            phone !== (profile.phone || "") &&
            !/^[6-9]\d{9}$/.test(phone)
        ) {
            nextErrors.phone =
                "Enter a valid 10-digit Indian mobile number.";
        }

        setErrors(nextErrors);

        if (Object.keys(nextErrors).length) {
            toast.error("Please check the highlighted fields.");
            return;
        }

        // Send only changed fields.
        const changes = {};

        if (name !== profile.name) {
            changes.name = name;
        }

        if (phone !== (profile.phone || "")) {
            changes.phone = phone;
        }

        if (!Object.keys(changes).length) return;

        setSaving(true);

        try {
            // ================== SAVE TO MONGODB ==================
            const { data } = await api.patch(
                "/admin/me/profile",
                changes
            );

            if (!data?.success || !data.profile) {
                throw new Error(
                    "The server did not confirm the profile update."
                );
            }

            const updated = data.profile;

            setProfile((previous) => ({
                ...previous,
                ...updated,
            }));

            setForm({
                name: updated.name || "",
                phone: updated.phone || "",
            });

            setErrors({});

            // Update shared header details.
            updateUserProfile(updated);

            toast.success("Admin profile updated successfully.");
        } catch (error) {
            toast.error(
                getApiError(
                    error,
                    "Unable to update admin profile."
                )
            );
        } finally {
            setSaving(false);
        }
    }

    // ================== SELECT ADMIN PROFILE IMAGE ==================
    function handleAvatarChange(event) {
        const file = event.target.files?.[0];

        event.target.value = "";

        if (!file) return;

        const error = validateAvatar(file);

        setAvatarError(error);
        setSelectedAvatar(error ? null : file);
    }

    // ================== CANCEL SELECTED IMAGE ==================
    function cancelAvatar() {
        if (avatarUploading) return;

        setSelectedAvatar(null);
        setAvatarError("");
    }

    // ================== UPLOAD / REPLACE ADMIN AVATAR ==================
    async function handleAvatarUpload() {
        if (!selectedAvatar || !profile || isBusy) return;

        const error = validateAvatar(selectedAvatar);

        if (error) {
            setAvatarError(error);
            return;
        }

        setAvatarUploading(true);
        setAvatarError("");

        try {
            const formData = new FormData();

            formData.append("avatar", selectedAvatar);

            // ================== CLOUDINARY AVATAR API ==================
            // Backend uploads new image, updates MongoDB,
            // then deletes the previous Cloudinary image.
            const { data } = await api.post(
                "/admin/me/avatar",
                formData,
                {
                    timeout: 60000,
                }
            );

            if (!data?.success || !data.profile) {
                throw new Error(
                    "The server did not confirm image upload."
                );
            }

            // ================== UPDATE PROFILE IMAGE ==================
            setProfile((previous) => ({
                ...previous,
                ...data.profile,
            }));

            setSelectedAvatar(null);

            // Shared AuthContext updates the PanelHeader image.
            updateUserProfile(data.profile);

            toast.success(
                "Profile image updated successfully."
            );
        } catch (error) {
            const message = getApiError(
                error,
                "Unable to upload profile image."
            );

            setAvatarError(message);
            toast.error(message);
        } finally {
            setAvatarUploading(false);
        }
    }

    // ================== HANDLE PASSWORD INPUT ==================
    function handlePasswordChange(event) {
        const { name, value } = event.target;

        setPasswordForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setPasswordErrors((previous) => ({
            ...previous,
            [name]: "",
        }));
    }

    // ================== CHANGE ADMIN PASSWORD ==================
    async function handlePasswordSubmit(event) {
        event.preventDefault();

        if (isBusy) return;

        const {
            currentPassword,
            newPassword,
            confirmPassword,
        } = passwordForm;

        const nextErrors = {};

        if (!currentPassword) {
            nextErrors.currentPassword =
                "Enter your current password.";
        }

        if (
            newPassword.length < 6 ||
            new TextEncoder().encode(newPassword).length >
                MAX_PASSWORD_BYTES
        ) {
            nextErrors.newPassword =
                "Password must contain at least 6 characters and not exceed 72 UTF-8 bytes.";
        }

        if (
            currentPassword &&
            newPassword === currentPassword
        ) {
            nextErrors.newPassword =
                "New password must be different from your current password.";
        }

        if (confirmPassword !== newPassword) {
            nextErrors.confirmPassword =
                "New passwords do not match.";
        }

        setPasswordErrors(nextErrors);

        if (Object.keys(nextErrors).length) {
            toast.error("Please check your password details.");
            return;
        }

        setPasswordSaving(true);

        try {
            // ================== PASSWORD CHANGE API ==================
            const { data } = await api.patch(
                "/admin/me/password",
                {
                    currentPassword,
                    newPassword,
                }
            );

            if (!data?.success) {
                throw new Error(
                    "The server did not confirm password change."
                );
            }

            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });

            setPasswordErrors({});

            // ================== SESSION INVALIDATION ==================
            // Backend increments tokenVersion and clears JWT cookie.
            // Refreshing authentication state removes the old session.
            if (data.requiresLogin) {
                await refreshUser();

                toast.success(
                    "Password changed. Please sign in again."
                );

                navigate("/manage", {
                    replace: true,
                });

                return;
            }

            toast.success("Password updated successfully.");
        } catch (error) {
            toast.error(
                getApiError(
                    error,
                    "Unable to change password."
                )
            );
        } finally {
            setPasswordSaving(false);
        }
    }

    // ================== LOADING STATE ==================
    if (loading) {
        return (
            <div
                className="manage-jobs admin-profile"
                role="status"
                style={{
                    padding: 32,
                    textAlign: "center",
                }}
            >
                <CircularProgress size={28} />
                <p>Loading admin profile...</p>
            </div>
        );
    }

    // ================== API ERROR STATE ==================
    if (loadError || !profile) {
        return (
            <div className="manage-jobs admin-profile">
                <Alert severity="error">
                    {loadError || "Admin profile is unavailable."}
                </Alert>

                <Button
                    variant="outlined"
                    sx={{ mt: 2 }}
                    onClick={() =>
                        setReloadRevision(
                            (previous) => previous + 1
                        )
                    }
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="manage-jobs admin-profile">
            {/* ================== PAGE HEADING ================== */}
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">
                        MY ACCOUNT
                    </span>

                    <h1>Admin Profile</h1>

                    <p>
                        Manage your profile, photo and account security.
                    </p>
                </div>

                <span className="mj-result-count">
                    <i
                        className="fa-solid fa-user-shield"
                        aria-hidden="true"
                    />{" "}
                    Administrator
                </span>
            </header>

            {/* ================== INITIAL PASSWORD ALERT ================== */}
            {profile.mustChangePassword && (
                <Alert
                    severity="warning"
                    className="mj-alert"
                    sx={{ mb: 2 }}
                >
                    You are using an initial admin password.
                    Change your password before managing other admins.
                </Alert>
            )}

            {/* ================== ADMIN PROFILE BANNER ================== */}
            <section
                className="mu-profile-banner admin-profile-banner"
                aria-label="Profile summary"
            >
                {/* ================== PROFILE IMAGE ================== */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        flexShrink: 0,
                    }}
                >
                    <Avatar
                        src={avatarUrl}
                        alt={displayName}
                        className="mu-avatar"
                    />

                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        hidden
                        onChange={handleAvatarChange}
                    />

                    <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        disabled={isBusy}
                        onClick={() =>
                            avatarInputRef.current?.click()
                        }
                        startIcon={
                            <i
                                className="fa-solid fa-camera"
                                aria-hidden="true"
                            />
                        }
                        sx={{
                            fontSize: 11,
                            textTransform: "none",
                        }}
                    >
                        Change photo
                    </Button>
                </div>

                {/* ================== ADMIN DETAILS ================== */}
                <div className="mu-profile-copy">
                    <h2>{displayName}</h2>

                    <p>
                        {profile.email || "Email not available"}
                    </p>

                    <span>
                        Manage your personal administration account
                    </span>

                    {/* ================== SELECTED IMAGE ACTIONS ================== */}
                    {selectedAvatar && (
                        <div
                            style={{
                                marginTop: 12,
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <Button
                                type="button"
                                size="small"
                                variant="contained"
                                disableElevation
                                disabled={isBusy}
                                onClick={handleAvatarUpload}
                                startIcon={
                                    avatarUploading ? (
                                        <CircularProgress
                                            size={15}
                                            color="inherit"
                                        />
                                    ) : (
                                        <i
                                            className="fa-solid fa-cloud-arrow-up"
                                            aria-hidden="true"
                                        />
                                    )
                                }
                            >
                                {avatarUploading
                                    ? "Uploading..."
                                    : "Save photo"}
                            </Button>

                            <Button
                                type="button"
                                size="small"
                                disabled={isBusy}
                                onClick={cancelAvatar}
                            >
                                Cancel
                            </Button>

                            <span
                                style={{
                                    fontSize: 11,
                                    overflowWrap: "anywhere",
                                }}
                            >
                                {selectedAvatar.name}
                            </span>
                        </div>
                    )}

                    {avatarError && (
                        <p
                            role="alert"
                            style={{
                                color: "#b91c1c",
                                fontSize: 12,
                                marginTop: 8,
                            }}
                        >
                            {avatarError}
                        </p>
                    )}

                    <span
                        style={{
                            display: "block",
                            marginTop: 6,
                        }}
                    >
                        JPG, PNG or WebP · Max 3 MB
                    </span>
                </div>

                <Chip
                    label={profile.status || "Admin"}
                    color={
                        profile.status === "Active"
                            ? "success"
                            : "default"
                    }
                    variant="outlined"
                    size="small"
                />
            </section>

            <div className="admin-profile-grid">
                {/* ================== PERSONAL INFORMATION ================== */}
                <section
                    className="mj-card"
                    aria-labelledby="admin-profile-form-title"
                >
                    <header className="mj-card-header">
                        <div className="mj-card-heading">
                            <span
                                className="mj-header-icon"
                                aria-hidden="true"
                            >
                                <i className="fa-regular fa-user" />
                            </span>

                            <div>
                                <h2 id="admin-profile-form-title">
                                    Personal information
                                </h2>

                                <p>
                                    Update your name and contact number.
                                </p>
                            </div>
                        </div>
                    </header>

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="mj-form-body">
                            <div className="mj-form-grid">
                                {/* ================== ADMIN NAME ================== */}
                                <TextField
                                    label="Full name"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    size="small"
                                    autoComplete="name"
                                    disabled={isBusy}
                                    error={Boolean(errors.name)}
                                    helperText={errors.name}
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 100,
                                        },
                                    }}
                                />

                                {/* ================== ADMIN PHONE ================== */}
                                <TextField
                                    label="Phone number"
                                    name="phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={handleChange}
                                    fullWidth
                                    size="small"
                                    autoComplete="tel"
                                    disabled={isBusy}
                                    error={Boolean(errors.phone)}
                                    helperText={
                                        errors.phone ||
                                        "10-digit Indian mobile number."
                                    }
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 10,
                                            inputMode: "numeric",
                                        },
                                    }}
                                />

                                {/* ================== ADMIN EMAIL ================== */}
                                <TextField
                                    label="Email address"
                                    value={profile.email || ""}
                                    fullWidth
                                    size="small"
                                    slotProps={{
                                        input: {
                                            readOnly: true,
                                        },
                                        inputLabel: {
                                            shrink: true,
                                        },
                                    }}
                                    helperText="Email is managed through Manage Admins."
                                />

                                {/* ================== ADMIN ROLE ================== */}
                                <TextField
                                    label="Account role"
                                    value="Admin"
                                    fullWidth
                                    size="small"
                                    slotProps={{
                                        input: {
                                            readOnly: true,
                                        },
                                    }}
                                    helperText="Assigned administrator role."
                                />
                            </div>
                        </div>

                        {/* ================== SAVE PROFILE ================== */}
                        <footer className="mj-form-footer">
                            <p>
                                <span>*</span> Required fields
                            </p>

                            <div className="mj-form-actions">
                                <Button
                                    type="button"
                                    variant="outlined"
                                    disabled={!hasChanges || isBusy}
                                    onClick={resetForm}
                                >
                                    Cancel changes
                                </Button>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    disableElevation
                                    disabled={!hasChanges || isBusy}
                                    startIcon={
                                        saving ? (
                                            <CircularProgress
                                                size={16}
                                                color="inherit"
                                            />
                                        ) : (
                                            <i
                                                className="fa-regular fa-floppy-disk"
                                                aria-hidden="true"
                                            />
                                        )
                                    }
                                >
                                    {saving
                                        ? "Saving..."
                                        : "Save changes"}
                                </Button>
                            </div>
                        </footer>
                    </form>
                </section>

                {/* ================== ACCOUNT AND SECURITY COLUMN ================== */}
                <div
                    style={{
                        display: "grid",
                        gap: 24,
                        alignContent: "start",
                    }}
                >
                    {/* ================== ACCOUNT INFORMATION ================== */}
                    <section
                        className="mj-card"
                        aria-labelledby="admin-account-title"
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
                                    <h2 id="admin-account-title">
                                        Account information
                                    </h2>

                                    <p>
                                        Your administration account.
                                    </p>
                                </div>
                            </div>
                        </header>

                        <div className="mj-form-body">
                            <dl className="mu-detail-grid admin-account-details">
                                <Detail
                                    label="Account ID"
                                    value={String(profile.id || profile._id)}
                                />

                                <Detail
                                    label="Role"
                                    value="Administrator"
                                />

                                <Detail
                                    label="Account status"
                                    value={profile.status}
                                />

                                <Detail
                                    label="Created on"
                                    value={formatDate(profile.createdAt)}
                                />

                                <Detail
                                    label="Profile last updated"
                                    value={formatDate(profile.updatedAt)}
                                />

                                <Detail
                                    label="Last login"
                                    value={formatDate(profile.lastLoginAt)}
                                />
                            </dl>
                        </div>
                    </section>

                    {/* ================== CHANGE PASSWORD ================== */}
                    <section
                        className="mj-card"
                        aria-labelledby="admin-password-title"
                    >
                        <header className="mj-card-header">
                            <div className="mj-card-heading">
                                <span
                                    className="mj-header-icon"
                                    aria-hidden="true"
                                >
                                    <i className="fa-solid fa-lock" />
                                </span>

                                <div>
                                    <h2 id="admin-password-title">
                                        Change password
                                    </h2>

                                    <p>
                                        Keep your admin account secure.
                                    </p>
                                </div>
                            </div>
                        </header>

                        <form
                            onSubmit={handlePasswordSubmit}
                            noValidate
                        >
                            <div
                                className="mj-form-body"
                                style={{
                                    display: "grid",
                                    gap: 18,
                                }}
                            >
                                {/* ================== CURRENT PASSWORD ================== */}
                                <TextField
                                    label="Current password"
                                    name="currentPassword"
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    fullWidth
                                    size="small"
                                    disabled={isBusy}
                                    autoComplete="current-password"
                                    error={Boolean(
                                        passwordErrors.currentPassword
                                    )}
                                    helperText={
                                        passwordErrors.currentPassword
                                    }
                                />

                                {/* ================== NEW PASSWORD ================== */}
                                <TextField
                                    label="New password"
                                    name="newPassword"
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    fullWidth
                                    size="small"
                                    disabled={isBusy}
                                    autoComplete="new-password"
                                    error={Boolean(
                                        passwordErrors.newPassword
                                    )}
                                    helperText={
                                        passwordErrors.newPassword ||
                                        "Minimum 6 characters."
                                    }
                                />

                                {/* ================== CONFIRM NEW PASSWORD ================== */}
                                <TextField
                                    label="Confirm new password"
                                    name="confirmPassword"
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    fullWidth
                                    size="small"
                                    disabled={isBusy}
                                    autoComplete="new-password"
                                    error={Boolean(
                                        passwordErrors.confirmPassword
                                    )}
                                    helperText={
                                        passwordErrors.confirmPassword
                                    }
                                />
                            </div>

                            {/* ================== PASSWORD SAVE ================== */}
                            <footer className="mj-form-footer">
                                <p>
                                    You will need to sign in again.
                                </p>

                                <div className="mj-form-actions">
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disableElevation
                                        disabled={isBusy}
                                        startIcon={
                                            passwordSaving ? (
                                                <CircularProgress
                                                    size={16}
                                                    color="inherit"
                                                />
                                            ) : (
                                                <i
                                                    className="fa-solid fa-key"
                                                    aria-hidden="true"
                                                />
                                            )
                                        }
                                    >
                                        {passwordSaving
                                            ? "Updating..."
                                            : "Update password"}
                                    </Button>
                                </div>
                            </footer>
                        </form>
                    </section>
                </div>
            </div>
        </div>
    );
}

// ================== ADMIN PROFILE EXPORT ==================
function AdminProfile({ user: propUser }) {
    const { user: authUser } = useAuth();
    const outletContext = useOutletContext();

    const currentUser =
        authUser ?? propUser ?? outletContext?.user;

    const userId =
        currentUser?._id ?? currentUser?.id;

    if (currentUser?.role !== "admin" || !userId) {
        return (
            <Alert severity="error">
                An authenticated admin account is required
                to view this profile.
            </Alert>
        );
    }

    return (
        <AdminProfileContent
            key={String(userId)}
            user={currentUser}
            userId={String(userId)}
        />
    );
}

export default AdminProfile;
