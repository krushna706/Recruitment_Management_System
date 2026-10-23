import { formatFileSize, normalizeSkills, getErrorMessage as getApiError } from "../utils/dataFormat";
import { openPrivateResume } from "../utils/fileAccess";

import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Alert, Autocomplete, Avatar, Button, CircularProgress, MenuItem, TextField } from "@mui/material";
import { toast } from "react-toastify";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// ================== PROFILE OPTIONS ==================
const qualifications = [
    "Secondary / Class 10",
    "Higher Secondary / Class 12",
    "Diploma",
    "Bachelor’s degree",
    "Master’s degree",
    "Doctorate",
    "Other",
];

const experienceOptions = [
    "Fresher",
    "Less than 1 year",
    "1 year",
    "2 years",
    "3 years",
    "4 years",
    "5 years",
    "6–10 years",
    "More than 10 years",
];

const skillGroups = {
    "Frontend Development": [
        "HTML",
        "CSS",
        "JavaScript",
        "TypeScript",
        "React.js",
        "Next.js",
        "Vue.js",
        "Angular",
        "Redux",
        "React Router",
        "Material UI",
        "Bootstrap",
        "Tailwind CSS",
        "Sass",
        "Responsive Web Design",
        "Web Accessibility",
    ],
    "Backend Development": [
        "Node.js",
        "Express.js",
        "REST API Development",
        "GraphQL",
        "Socket.IO",
        "Java",
        "Spring Boot",
        "Python",
        "Django",
        "FastAPI",
        "PHP",
        "Laravel",
        "C#",
        "ASP.NET Core",
        "Go",
    ],
    Databases: [
        "MongoDB",
        "Mongoose",
        "MySQL",
        "PostgreSQL",
        "SQLite",
        "Redis",
        "Firebase",
        "SQL",
        "Database Design",
    ],
    "Cloud & DevOps": [
        "Git",
        "GitHub",
        "GitLab",
        "Docker",
        "Kubernetes",
        "AWS",
        "Microsoft Azure",
        "Google Cloud",
        "Linux",
        "Nginx",
        "CI/CD",
        "VPS Deployment",
    ],
    "Testing & Tools": [
        "Postman",
        "Jest",
        "Vitest",
        "React Testing Library",
        "Cypress",
        "Playwright",
        "Selenium",
        "Manual Testing",
        "API Testing",
        "Vite",
        "Webpack",
        "npm",
        "phpMyAdmin",
    ],
    "Design & Product": [
        "Figma",
        "UI/UX Design",
        "Wireframing",
        "Prototyping",
        "User Research",
        "Adobe Photoshop",
        "Adobe Illustrator",
        "Product Management",
    ],
    "Business & Communication": [
        "Communication",
        "Problem Solving",
        "Team Leadership",
        "Client Handling",
        "Project Coordination",
        "Recruitment",
        "Customer Support",
        "Digital Marketing",
        "SEO",
        "Content Writing",
        "Microsoft Excel",
    ],
};

const skillOptions = Object.values(skillGroups).flat();

const skillCategory = Object.fromEntries(
    Object.entries(skillGroups).flatMap(([group, skills]) => skills.map((skill) => [skill, group]))
);

const MAX_AVATAR_SIZE = 3 * 1024 * 1024;
const MAX_RESUME_SIZE = 5 * 1024 * 1024;
const DEFAULT_AVATAR = "/images/default-avatar.svg";

const PROFILE_FIELDS = [
    "name",
    "email",
    "phone",
    "address",
    "qualification",
    "experience",
    "skills",
];

// ================== PROFILE HELPERS ==================

function createProfile(user = {}) {
    return {
        name: user.name || "",
        email: user.email || "",
        phone: String(user.phone || ""),
        address: user.address || "",
        qualification: user.qualification || "",
        experience: user.experience || "",
        skills: normalizeSkills(Array.isArray(user.skills) ? user.skills : []),
    };
}

function validateResume(file) {
    if (!file) return "Please choose a valid resume.";

    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
        return "Choose a PDF, DOC or DOCX file.";
    }

    if (!file.size) return "The resume file is empty.";

    if (file.size > MAX_RESUME_SIZE) {
        return "Resume size must not exceed 5 MB.";
    }

    return "";
}

function validateAvatar(file) {
    if (!file) return "Please choose a valid image.";

    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
        return "Choose a JPG, JPEG, PNG or WebP image.";
    }

    if (!file.size) return "The image file is empty.";

    if (file.size > MAX_AVATAR_SIZE) {
        return "Profile image size must not exceed 3 MB.";
    }

    return "";
}

// ================== TEMPORARY FILE PREVIEW ==================
// Revoke object URLs when the selected file changes.
function useFileUrl(file) {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (!file) return undefined;

        const url = URL.createObjectURL(file);
        setPreview({ file, url });

        return () => URL.revokeObjectURL(url);
    }, [file]);

    return preview?.file === file ? preview.url : null;
}

// ================== CHANGED PROFILE FIELDS ==================
// Send only modified fields to the backend.
function getChangedFields(values, original) {
    return Object.fromEntries(
        PROFILE_FIELDS.filter(
            (field) => JSON.stringify(values[field]) !== JSON.stringify(original[field])
        ).map((field) => [field, values[field]])
    );
}

// ================== PROFILE FORM ==================
function ProfileForm({ user }) {
    const { updateUserProfile } = useAuth();

    const formRef = useRef(null);
    const avatarInputRef = useRef(null);
    const resumeInputRef = useRef(null);

    // ================== FORM STATES ==================
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [errors, setErrors] = useState({});

    const [savedProfile, setSavedProfile] = useState(() => createProfile(user));

    const [values, setValues] = useState(() => createProfile(user));

    const [currentResume, setCurrentResume] = useState(null);
    const [resumeBusy, setResumeBusy] = useState(false);

    async function handleResume() {
        if (!currentResume || resumeBusy) return;
        setResumeBusy(true);
        try {
            await openPrivateResume({
                endpoint: "/users/me/resume",
                filename: currentResume.name,
                mode: currentResume.mimeType === "application/pdf" ? "view" : "download",
            });
        } catch (error) {
            toast.error(error.message || "Resume could not be opened.");
        } finally {
            setResumeBusy(false);
        }
    }

    const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || user.avatar?.url || "");

    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [replacementFile, setReplacementFile] = useState(null);
    const [skillInput, setSkillInput] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");

    // ================== PREVIEW STATES ==================
    const avatarPreview = useFileUrl(selectedAvatar);
    const replacementUrl = useFileUrl(replacementFile);

    const emailChanged = values.email.trim().toLowerCase() !== savedProfile.email;

    const hasChanges =
        Object.keys(getChangedFields(values, savedProfile)).length > 0 ||
        Boolean(skillInput.trim() || replacementFile || selectedAvatar);

    const displayName = savedProfile.name || "Your account";

    // ================== LOAD PROFILE FROM MONGODB ==================
    useEffect(() => {
        let active = true;

        async function loadProfile() {
            setLoading(true);
            setLoadError("");

            try {
                const { data } = await api.get("/users/me/profile");

                if (!active) return;

                const profile = createProfile(data.profile);

                setSavedProfile(profile);
                setValues(profile);
                setCurrentResume(data.profile.resume || null);
                setAvatarUrl(data.profile.avatar?.url || "");

                updateUserProfile(data.profile);
            } catch (error) {
                if (active) {
                    setLoadError(getApiError(error, "Unable to load your profile. Please retry."));
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadProfile();

        return () => {
            active = false;
        };
    }, [user._id, updateUserProfile]);

    // ================== CLEAR FIELD FEEDBACK ==================
    const clearFeedback = (field) => {
        setErrors((previous) => ({
            ...previous,
            [field]: "",
        }));

        setFeedback(null);
    };

    // ================== HANDLE TEXT INPUT ==================
    const handleChange = (event) => {
        const { name, value } = event.target;

        setValues((previous) => ({
            ...previous,
            [name]: value,
        }));

        clearFeedback(name);
    };

    // ================== SELECT PROFILE IMAGE ==================
    const handleAvatarChange = (event) => {
        const file = event.target.files?.[0];

        event.target.value = "";

        if (!file) return;

        const error = validateAvatar(file);

        setErrors((previous) => ({
            ...previous,
            avatar: error,
        }));

        setFeedback(null);
        setSelectedAvatar(error ? null : file);
    };

    // ================== SELECT RESUME ==================
    const handleResumeChange = (event) => {
        const file = event.target.files?.[0];

        event.target.value = "";

        if (!file) return;

        const error = validateResume(file);

        setErrors((previous) => ({
            ...previous,
            resume: error,
        }));

        setFeedback(null);
        setReplacementFile(error ? null : file);
    };

    // ================== DISCARD CHANGES ==================
    const discardChanges = () => {
        setValues({
            ...savedProfile,
            skills: [...savedProfile.skills],
        });

        setSelectedAvatar(null);
        setReplacementFile(null);
        setSkillInput("");
        setCurrentPassword("");
        setErrors({});
        setFeedback(null);
    };

    // ================== FRONTEND VALIDATION ==================
    function validateProfile(cleanedValues) {
        const nextErrors = {};

        if (cleanedValues.name.length < 2 || cleanedValues.name.length > 100) {
            nextErrors.name = "Enter your name using 2–100 characters.";
        }

        if (
            cleanedValues.email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedValues.email)
        ) {
            nextErrors.email = "Enter a valid email address.";
        }

        // Match the Signup form's 10-digit Indian mobile rule.
        if (!/^[6-9]\d{9}$/.test(cleanedValues.phone)) {
            nextErrors.phone = "Enter a valid 10-digit Indian mobile number.";
        }

        if (cleanedValues.address.length > 500) {
            nextErrors.address = "Use no more than 500 characters.";
        }

        if (cleanedValues.qualification && !qualifications.includes(cleanedValues.qualification)) {
            nextErrors.qualification = "Select a valid qualification.";
        }

        if (cleanedValues.experience && !experienceOptions.includes(cleanedValues.experience)) {
            nextErrors.experience = "Select a valid experience option.";
        }

        if (
            cleanedValues.skills.length > 15 ||
            cleanedValues.skills.some((skill) => skill.length > 60)
        ) {
            nextErrors.skills = "Add up to 15 skills, using no more than 60 characters each.";
        }

        // Sensitive email changes require reauthentication.
        if (cleanedValues.email !== savedProfile.email && !currentPassword) {
            nextErrors.currentPassword = "Enter your current password to change email.";
        }

        if (selectedAvatar) {
            nextErrors.avatar = validateAvatar(selectedAvatar);
        }

        if (replacementFile) {
            nextErrors.resume = validateResume(replacementFile);
        }

        return Object.fromEntries(Object.entries(nextErrors).filter(([, message]) => message));
    }

    // ================== SAVE PROFILE + FILES ==================
    // Persist each request separately.
    // Failed uploads remain selected for retry.
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving || loading) return;

        const cleanedValues = {
            ...values,
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
            phone: values.phone.trim(),
            address: values.address.trim(),
            skills: normalizeSkills([...values.skills, skillInput]),
        };

        const nextErrors = validateProfile(cleanedValues);

        setValues(cleanedValues);
        setSkillInput("");
        setErrors(nextErrors);
        setFeedback(null);

        const firstError = Object.keys(nextErrors)[0];

        if (firstError) {
            requestAnimationFrame(() => {
                formRef.current
                    ?.querySelector(
                        `[data-field="${firstError}"] input, ` +
                            `[data-field="${firstError}"] button, ` +
                            `[data-field="${firstError}"] [role="combobox"]`
                    )
                    ?.focus();
            });

            return;
        }

        setSaving(true);
        let completedSteps = 0;

        try {
            // ================== UPDATE PROFILE DETAILS ==================
            const changes = getChangedFields(cleanedValues, savedProfile);

            if (Object.keys(changes).length > 0) {
                if (changes.email !== undefined) {
                    changes.currentPassword = currentPassword;
                }

                const { data } = await api.patch("/users/me/profile", changes);

                const profile = createProfile(data.profile);

                setSavedProfile(profile);
                setValues(profile);
                setCurrentPassword("");

                updateUserProfile(data.profile);

                completedSteps += 1;
            }

            // ================== UPLOAD PROFILE RESUME ==================
            if (replacementFile) {
                const formData = new FormData();

                formData.append("resume", replacementFile);

                const { data } = await api.post("/users/me/resume", formData, {
                    timeout: 60000,
                });

                setCurrentResume(data.profile.resume || null);

                setReplacementFile(null);
                updateUserProfile(data.profile);

                completedSteps += 1;
            }

            // ================== UPLOAD PROFILE IMAGE ==================
            // Backend saves new image first, then removes old avatar.
            if (selectedAvatar) {
                const formData = new FormData();

                formData.append("avatar", selectedAvatar);

                const { data } = await api.post("/users/me/avatar", formData, {
                    timeout: 60000,
                });

                setAvatarUrl(data.profile.avatar?.url || "");

                setSelectedAvatar(null);

                // Update the shared AuthContext so header changes too.
                updateUserProfile(data.profile);

                completedSteps += 1;
            }

            if (completedSteps) {
                toast.success("Profile updated successfully.");
            }
        } catch (error) {
            const message = getApiError(error, "Unable to save your changes. Please try again.");

            setFeedback({
                type: "error",
                message: completedSteps
                    ? `Some changes were saved, but the remaining update failed. ${message}`
                    : message,
            });
        } finally {
            setSaving(false);
        }
    };

    // ================== SHARED INPUT PROPERTIES ==================
    const fieldProps = (name) => ({
        name,
        value: values[name],
        onChange: handleChange,
        error: Boolean(errors[name]),
        helperText: errors[name],
        fullWidth: true,
        size: "small",
        variant: "outlined",
        className: "panel-field",
        "data-field": name,
        disabled: saving,
    });

    // ================== LOADING STATE ==================
    if (loading) {
        return (
            <div className="profile-page panel-loading-state" role="status">
                <CircularProgress size={28} />

                <p>Loading your profile...</p>
            </div>
        );
    }

    // ================== API ERROR STATE ==================
    if (loadError) {
        return (
            <div className="profile-page">
                <Alert severity="error">{loadError}</Alert>

                <Button
                    variant="outlined"
                    onClick={() => window.location.reload()}
                    className="panel-space-top"
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="profile-page">
            {/* ================== PAGE HEADER ================== */}
            <header className="panel-page-heading">
                <div>
                    <h1 className="panel-page-title">My Profile</h1>

                    <p className="panel-page-description">Your details, skills and career story.</p>
                </div>

                {hasChanges && (
                    <span className="profile-unsaved" role="status">
                        <span aria-hidden="true" />
                        Unsaved changes
                    </span>
                )}
            </header>

            <div className="profile-grid">
                {/* ================== PROFILE SUMMARY ================== */}
                <aside className="profile-sidebar">
                    <section className="panel-card profile-summary" aria-labelledby="profile-name">
                        <div className="profile-summary-cover" aria-hidden="true" />

                        <div className="profile-summary-body">
                            <Avatar
                                src={avatarPreview || avatarUrl || DEFAULT_AVATAR}
                                alt={displayName}
                                className="profile-avatar"
                            >
                                {displayName.charAt(0).toUpperCase()}
                            </Avatar>

                            {/* ================== PROFILE PHOTO CONTROL ================== */}
                            <div data-field="avatar" className="profile-upload-control">
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                    hidden
                                    aria-label="Choose profile image"
                                    onChange={handleAvatarChange}
                                />

                                <Button
                                    type="button"
                                    size="small"
                                    className="profile-text-button"
                                    disabled={saving}
                                    onClick={() => avatarInputRef.current?.click()}
                                    startIcon={
                                        <i className="fa-solid fa-camera" aria-hidden="true" />
                                    }
                                >
                                    {avatarUrl ? "Change photo" : "Upload photo"}
                                </Button>

                                {selectedAvatar && (
                                    <div>
                                        <p className="profile-upload-note">
                                            {selectedAvatar.name}
                                            {" · "}
                                            Save Changes to upload
                                        </p>

                                        <Button
                                            type="button"
                                            size="small"
                                            disabled={saving}
                                            className="profile-text-button"
                                            onClick={() => {
                                                setSelectedAvatar(null);
                                                clearFeedback("avatar");
                                            }}
                                        >
                                            Cancel photo
                                        </Button>
                                    </div>
                                )}

                                <p className="profile-upload-hint">JPG, PNG or WebP · Max 3 MB</p>

                                {errors.avatar && (
                                    <p className="profile-error" role="alert">
                                        {errors.avatar}
                                    </p>
                                )}
                            </div>

                            <h2 id="profile-name">{displayName}</h2>

                            <span className="profile-role">User</span>

                            <dl className="profile-summary-details">
                                {[
                                    ["Email address", savedProfile.email, "fa-regular fa-envelope"],
                                    ["Phone number", savedProfile.phone, "fa-solid fa-phone"],
                                    [
                                        "Qualification",
                                        savedProfile.qualification,
                                        "fa-solid fa-graduation-cap",
                                    ],
                                    [
                                        "Experience",
                                        savedProfile.experience,
                                        "fa-solid fa-briefcase",
                                    ],
                                ].map(([label, value, icon]) => (
                                    <div key={label}>
                                        <dt>
                                            <i className={icon} aria-hidden="true" />
                                            {label}
                                        </dt>

                                        <dd>{value || "Not provided"}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </section>

                    <div className="profile-note">
                        <i className="fa-regular fa-lightbulb" aria-hidden="true" />

                        <div>
                            <h3>Keep your next step in focus.</h3>

                            <p>
                                Highlight relevant skills and maintain an up-to-date resume.
                                Existing applications retain their original submitted details.
                            </p>
                        </div>
                    </div>
                </aside>

                {/* ================== PROFILE FORM ================== */}
                <form ref={formRef} className="profile-form" onSubmit={handleSubmit} noValidate>
                    {/* ================== PERSONAL INFORMATION ================== */}
                    <section className="panel-card" aria-labelledby="profile-personal-title">
                        <header className="panel-card-header">
                            <div>
                                <h2 id="profile-personal-title" className="panel-card-title">
                                    Personal information
                                </h2>

                                <p className="panel-card-description">
                                    Fields marked with * are required.
                                </p>
                            </div>

                            <span className="profile-section-icon" aria-hidden="true">
                                <i className="fa-regular fa-user" />
                            </span>
                        </header>

                        <div className="profile-card-body">
                            <div className="profile-fields">
                                <TextField
                                    {...fieldProps("name")}
                                    label="Full name"
                                    required
                                    autoComplete="name"
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 100,
                                        },
                                    }}
                                />

                                <TextField
                                    {...fieldProps("phone")}
                                    label="Phone number"
                                    type="tel"
                                    required
                                    autoComplete="tel"
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 10,
                                            inputMode: "numeric",
                                        },
                                    }}
                                />

                                <TextField
                                    {...fieldProps("email")}
                                    label="Email address"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className="panel-field profile-full-width"
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 254,
                                        },
                                    }}
                                />

                                {/* Require password for email changes. */}
                                {emailChanged && (
                                    <TextField
                                        label="Current password (required to change email)"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(event) => {
                                            setCurrentPassword(event.target.value);

                                            clearFeedback("currentPassword");
                                        }}
                                        error={Boolean(errors.currentPassword)}
                                        helperText={errors.currentPassword}
                                        required
                                        fullWidth
                                        size="small"
                                        disabled={saving}
                                        className="panel-field profile-full-width"
                                        data-field="currentPassword"
                                        autoComplete="current-password"
                                    />
                                )}

                                <TextField
                                    {...fieldProps("address")}
                                    label="Address"
                                    autoComplete="street-address"
                                    multiline
                                    minRows={2}
                                    maxRows={5}
                                    className="panel-field profile-full-width"
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 500,
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ================== PROFESSIONAL BACKGROUND ================== */}
                    <section className="panel-card" aria-labelledby="profile-professional-title">
                        <header className="panel-card-header">
                            <div>
                                <h2 id="profile-professional-title" className="panel-card-title">
                                    Professional background
                                </h2>

                                <p className="panel-card-description">
                                    Education, experience and the skills you bring.
                                </p>
                            </div>

                            <span className="profile-section-icon" aria-hidden="true">
                                <i className="fa-solid fa-briefcase" />
                            </span>
                        </header>

                        <div className="profile-card-body">
                            <div className="profile-fields">
                                <TextField
                                    {...fieldProps("qualification")}
                                    label="Highest qualification"
                                    select
                                >
                                    <MenuItem value="">Not specified</MenuItem>

                                    {qualifications.map((item) => (
                                        <MenuItem key={item} value={item}>
                                            {item}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    {...fieldProps("experience")}
                                    label="Total experience"
                                    select
                                >
                                    <MenuItem value="">Not specified</MenuItem>

                                    {experienceOptions.map((item) => (
                                        <MenuItem key={item} value={item}>
                                            {item}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <Autocomplete
                                    multiple
                                    freeSolo
                                    filterSelectedOptions
                                    size="small"
                                    options={skillOptions}
                                    groupBy={(option) => skillCategory[option] || "Other"}
                                    value={values.skills}
                                    inputValue={skillInput}
                                    disabled={saving}
                                    className="profile-full-width"
                                    data-field="skills"
                                    slotProps={{
                                        paper: {
                                            className: "profile-skills-menu",
                                        },
                                    }}
                                    onInputChange={(_, input) => {
                                        setSkillInput(input);
                                        clearFeedback("skills");
                                    }}
                                    onChange={(_, skills) => {
                                        setValues((previous) => ({
                                            ...previous,
                                            skills: normalizeSkills(skills),
                                        }));

                                        clearFeedback("skills");
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Relevant skills"
                                            className="panel-field"
                                            error={Boolean(errors.skills)}
                                            helperText={
                                                errors.skills ||
                                                "Choose up to 15 skills, or type a custom skill and press Enter."
                                            }
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ================== PROFILE RESUME ================== */}
                    <section
                        className="panel-card"
                        data-field="resume"
                        aria-labelledby="profile-resume-title"
                    >
                        <header className="panel-card-header">
                            <div>
                                <h2 id="profile-resume-title" className="panel-card-title">
                                    My resume
                                </h2>

                                <p className="panel-card-description">
                                    Review your current resume or choose a replacement.
                                </p>
                            </div>

                            <span className="profile-section-icon" aria-hidden="true">
                                <i className="fa-regular fa-file-lines" />
                            </span>
                        </header>

                        <div className="profile-card-body profile-resume-body">
                            {currentResume && (
                                <div className="profile-current-resume">
                                    <div className="profile-resume-topline">
                                        <span>Current resume</span>

                                        <span className="profile-resume-badge">On profile</span>
                                    </div>

                                    <div className="profile-resume-file">
                                        <span className="profile-file-icon" aria-hidden="true">
                                            <i className="fa-regular fa-file-lines" />
                                        </span>

                                        <div className="profile-file-copy">
                                            <h3>{currentResume.name || "Resume"}</h3>

                                            <p>
                                                {formatFileSize(currentResume.size)}
                                                {" · "}
                                                Ready to open
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            disabled={resumeBusy}
                                            onClick={handleResume}
                                            variant="outlined"
                                            className="panel-button panel-button-outline"
                                        >
                                            {currentResume.mimeType === "application/pdf"
                                                ? "Open resume"
                                                : "Download resume"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className={`profile-upload ${errors.resume ? "is-error" : ""}`}>
                                <span className="profile-upload-icon" aria-hidden="true">
                                    <i className="fa-solid fa-arrow-up-from-bracket" />
                                </span>

                                <div className="profile-upload-copy">
                                    <h3>
                                        {currentResume
                                            ? "Update your resume"
                                            : "Upload your resume"}
                                    </h3>

                                    <p id="profile-resume-help">PDF, DOC or DOCX · Maximum 5 MB</p>
                                </div>

                                <input
                                    ref={resumeInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    hidden
                                    onChange={handleResumeChange}
                                />

                                <Button
                                    type="button"
                                    variant="outlined"
                                    disabled={saving}
                                    className="panel-button panel-button-outline"
                                    onClick={() => resumeInputRef.current?.click()}
                                >
                                    Choose file
                                </Button>
                            </div>

                            {errors.resume && (
                                <p className="profile-error" role="alert">
                                    {errors.resume}
                                </p>
                            )}

                            {replacementFile && (
                                <div className="profile-replacement" role="status">
                                    <div className="profile-file-copy">
                                        <span className="profile-replacement-label">
                                            {currentResume
                                                ? "Selected replacement"
                                                : "Selected resume"}
                                        </span>

                                        <h3>{replacementFile.name}</h3>

                                        <p>
                                            {formatFileSize(replacementFile.size)}
                                            {" · "}
                                            Save Changes to upload
                                        </p>
                                    </div>

                                    <div className="profile-replacement-actions">
                                        {replacementUrl && (
                                            <Button
                                                component="a"
                                                href={replacementUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="profile-text-button"
                                            >
                                                Open file
                                            </Button>
                                        )}

                                        <Button
                                            type="button"
                                            disabled={saving}
                                            className="profile-text-button"
                                            onClick={() => {
                                                setReplacementFile(null);
                                                clearFeedback("resume");
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ================== FORM FEEDBACK ================== */}
                    {feedback && (
                        <Alert severity={feedback.type} role="alert" className="profile-feedback">
                            {feedback.message}
                        </Alert>
                    )}

                    {/* ================== SAVE ACTIONS ================== */}
                    <div className="profile-save-bar">
                        <p>Review your information before saving changes.</p>

                        <div className="profile-save-actions">
                            <Button
                                type="button"
                                className="panel-button profile-discard-button"
                                disabled={!hasChanges || saving}
                                onClick={discardChanges}
                            >
                                Discard changes
                            </Button>

                            <Button
                                type="submit"
                                variant="contained"
                                disableElevation
                                disabled={!hasChanges || saving}
                                className="panel-button panel-button-primary"
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
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ================== EXPORT ==================
function Profile({ user: propUser }) {
    const { user: authUser } = useAuth();
    const outletContext = useOutletContext();

    const currentUser = authUser ?? propUser ?? outletContext?.user;

    if (!currentUser?._id) {
        return <Alert severity="error">Please sign in to view your profile.</Alert>;
    }

    return <ProfileForm key={currentUser._id} user={currentUser} />;
}

export default Profile;
