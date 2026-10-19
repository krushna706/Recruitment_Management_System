import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
    Alert,
    Button,
    Chip,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";

const ADMIN_STORAGE_KEY = "rms-demo-admins-v1";
const PROFILE_STORAGE_PREFIX = "rms-demo-admin-profile-v1:";

function getInitials(name = "") {
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join("")
            .toUpperCase() || "AD"
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

function readProfile(user, userId) {
    const baseProfile = {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: "admin",
        status: user.status || "",
        createdAt: user.createdAt || "",
        updatedAt: "",
    };

    try {
        // Use editable contact details from Manage Admins, if available.
        const storedAdmins = window.localStorage.getItem(
            ADMIN_STORAGE_KEY
        );

        let adminRecord = null;

        if (storedAdmins) {
            const admins = JSON.parse(storedAdmins);

            if (!Array.isArray(admins)) {
                throw new Error("Invalid admin records");
            }

            adminRecord = admins.find(
                (admin) => admin?.id === userId
            );
        }

        const storedProfile = window.localStorage.getItem(
            `${PROFILE_STORAGE_PREFIX}${userId}`
        );

        let savedProfile = null;

        if (storedProfile) {
            savedProfile = JSON.parse(storedProfile);

            if (
                !savedProfile ||
                typeof savedProfile.name !== "string" ||
                typeof savedProfile.phone !== "string" ||
                typeof savedProfile.updatedAt !== "string"
            ) {
                throw new Error("Invalid saved profile");
            }
        }

        const adminUpdatedAt = Date.parse(
            adminRecord?.updatedAt || ""
        ) || 0;

        const profileUpdatedAt = Date.parse(
            savedProfile?.updatedAt || ""
        ) || 0;

        const latestContact =
            adminRecord && adminUpdatedAt > profileUpdatedAt
                ? adminRecord
                : savedProfile || adminRecord;

        return {
            profile: {
                ...baseProfile,
                name: latestContact?.name ?? baseProfile.name,
                phone: latestContact?.phone ?? baseProfile.phone,
                createdAt:
                    baseProfile.createdAt ||
                    adminRecord?.createdAt ||
                    "",
                updatedAt: latestContact?.updatedAt || "",
            },
            error: "",
        };
    } catch {
        return {
            profile: baseProfile,
            error:
                "Saved profile details could not be loaded. Saving is disabled " +
                "to avoid overwriting existing data. Check browser storage and reload.",
        };
    }
}

function Detail({ label, value }) {
    return (
        <div className="mu-detail">
            <dt>{label}</dt>
            <dd>{value || "Not provided"}</dd>
        </div>
    );
}

function AdminProfileContent({ user, userId }) {
    const [initialData] = useState(() =>
        readProfile(user, userId)
    );

    const [profile, setProfile] = useState(initialData.profile);

    const [form, setForm] = useState({
        name: initialData.profile.name,
        phone: initialData.profile.phone,
    });

    const [errors, setErrors] = useState({});

    const hasChanges =
        form.name.trim() !== profile.name.trim() ||
        form.phone.trim() !== profile.phone.trim();

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

    function resetForm() {
        setForm({
            name: profile.name,
            phone: profile.phone,
        });

        setErrors({});
    }

    function handleSubmit(event) {
        event.preventDefault();

        if (initialData.error || !hasChanges) return;

        const validationErrors = {};

        if (form.name.trim().length < 2) {
            validationErrors.name =
                "Enter a name with at least 2 characters.";
        }

        if (
            form.phone.trim() &&
            !/^\+?[0-9\s()-]{7,20}$/.test(form.phone.trim())
        ) {
            validationErrors.phone =
                "Enter a valid phone number.";
        }

        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            toast.error("Please check the highlighted fields.");
            return;
        }

        const savedContact = {
            name: form.name.trim(),
            phone: form.phone.trim(),
            updatedAt: new Date().toISOString(),
        };

        try {
            window.localStorage.setItem(
                `${PROFILE_STORAGE_PREFIX}${userId}`,
                JSON.stringify(savedContact)
            );
        } catch {
            toast.error(
                "Could not save the profile. Check browser storage."
            );
            return;
        }

        setProfile((previous) => ({
            ...previous,
            ...savedContact,
        }));

        setForm({
            name: savedContact.name,
            phone: savedContact.phone,
        });

        setErrors({});
        toast.success("Profile saved in this browser.");
    }

    return (
        <div className="manage-jobs admin-profile">
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">
                        MY ACCOUNT
                    </span>

                    <h1>Admin Profile</h1>

                    <p>
                        Review your account and keep your contact details updated.
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

            {initialData.error && (
                <Alert severity="error" className="mj-alert">
                    {initialData.error}
                </Alert>
            )}

            <section
                className="mu-profile-banner admin-profile-banner"
                aria-label="Profile summary"
            >
                <span className="mu-avatar" aria-hidden="true">
                    {getInitials(profile.name)}
                </span>

                <div className="mu-profile-copy">
                    <h2>{profile.name || "Administrator"}</h2>
                    <p>{profile.email || "Email not available"}</p>

                    <span>
                        Manage your personal administration account
                    </span>
                </div>

                <Chip
                    label="Admin"
                    color="primary"
                    variant="outlined"
                    size="small"
                />
            </section>

            <div className="admin-profile-grid">
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
                                <TextField
                                    label="Full name"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    size="small"
                                    autoComplete="name"
                                    error={Boolean(errors.name)}
                                    helperText={errors.name}
                                />

                                <TextField
                                    label="Phone number"
                                    name="phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={handleChange}
                                    fullWidth
                                    size="small"
                                    autoComplete="tel"
                                    error={Boolean(errors.phone)}
                                    helperText={
                                        errors.phone ||
                                        "Optional contact number."
                                    }
                                />

                                <TextField
                                    label="Email address"
                                    value={profile.email}
                                    fullWidth
                                    size="small"
                                    slotProps={{
                                        input: { readOnly: true },
                                        inputLabel: { shrink: true },
                                    }}
                                    helperText="Managed through your account settings."
                                />

                                <TextField
                                    label="Account role"
                                    value="Admin"
                                    fullWidth
                                    size="small"
                                    slotProps={{
                                        input: { readOnly: true },
                                    }}
                                    helperText="Assigned administration role."
                                />
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
                                    disabled={!hasChanges}
                                >
                                    Cancel changes
                                </Button>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    disableElevation
                                    disabled={
                                        !hasChanges ||
                                        Boolean(initialData.error)
                                    }
                                    startIcon={
                                        <i
                                            className="fa-regular fa-floppy-disk"
                                            aria-hidden="true"
                                        />
                                    }
                                >
                                    Save changes
                                </Button>
                            </div>
                        </footer>
                    </form>
                </section>

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

                                <p>Your administration account.</p>
                            </div>
                        </div>
                    </header>

                    <div className="mj-form-body">
                        <dl className="mu-detail-grid admin-account-details">
                            <Detail
                                label="Account ID"
                                value={String(userId)}
                            />

                            <Detail
                                label="Role"
                                value="Administrator"
                            />

                            <Detail
                                label="Account status"
                                value={profile.status || "Not available"}
                            />

                            <Detail
                                label="Created on"
                                value={formatDate(profile.createdAt)}
                            />

                            <Detail
                                label="Profile last updated"
                                value={formatDate(profile.updatedAt)}
                            />
                        </dl>
                    </div>
                </section>
            </div>
        </div>
    );
}

function AdminProfile({ user }) {
    const outletContext = useOutletContext();
    const currentUser = user ?? outletContext?.user;
    const userId = currentUser?.id ?? currentUser?._id;

    if (currentUser?.role !== "admin" || !userId) {
        return (
            <Alert severity="error">
                An authenticated admin account is required to view this profile.
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