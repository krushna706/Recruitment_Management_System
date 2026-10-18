import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
    Alert,
    Autocomplete,
    Avatar,
    Button,
    MenuItem,
    TextField,
} from "@mui/material";

// Temporary frontend preview.
// Actual profile and resume details will come from the backend.
const demoProfile = {
    id: "demo-user",
    name: "Krushna Chandra Mohanty",
    email: "candidate@example.com",
    phone: "9876543210",
    address: "Bhubaneswar, Odisha",
    qualification: "Bachelor’s degree",
    experience: "2 years",
    skills: ["React.js", "Node.js", "Express.js", "MongoDB"],
    role: "user",
    resume: null,
};

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
    Object.entries(skillGroups).flatMap(([group, skills]) =>
        skills.map((skill) => [skill, group])
    )
);

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

function normalizeSkills(skills) {
    return [
        ...new Map(
            skills
                .filter((skill) => typeof skill === "string")
                .map((skill) => skill.trim())
                .filter(Boolean)
                .map((skill) => [skill.toLowerCase(), skill])
        ).values(),
    ];
}

function createProfile(user) {
    return {
        name: user.name || "",
        email: user.email || "",
        phone: String(user.phone || ""),
        address: user.address || "",
        qualification: user.qualification || "",
        experience: user.experience || "",
        skills: normalizeSkills(
            Array.isArray(user.skills) ? user.skills : []
        ),
    };
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "";
    }

    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function validateResume(file) {
    if (!(file instanceof File)) {
        return "Please choose a valid file.";
    }

    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
        return "Choose a PDF, DOC or DOCX file.";
    }

    if (file.size === 0) {
        return "This file is empty. Please choose another file.";
    }

    if (file.size > MAX_RESUME_SIZE) {
        return "Resume size must not exceed 5 MB.";
    }

    return "";
}

function getResumeAccessUrl(value) {
    if (typeof value !== "string") {
        return null;
    }

    const url = value.trim();

    // Backend-provided HTTPS link or same-origin authorized endpoint.
    if (/^https:\/\//i.test(url) || /^\/(?![\\/])/.test(url)) {
        return url;
    }

    return null;
}

// Temporary browser preview only.
// This does not upload the file to a server or Cloudinary.
function useFileUrl(file) {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (!(file instanceof Blob)) {
            return;
        }

        const url = URL.createObjectURL(file);

        setPreview({
            file,
            url,
        });

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    if (!file || preview?.file !== file) {
        return null;
    }

    return preview?.url ?? null;
}

function ProfileForm({ user }) {
    const formRef = useRef(null);
    const fileInputRef = useRef(null);

    const [savedProfile, setSavedProfile] = useState(() =>
        createProfile(user)
    );

    const [values, setValues] = useState(() =>
        createProfile(user)
    );

    const [skillInput, setSkillInput] = useState("");
    const [errors, setErrors] = useState({});
    const [feedback, setFeedback] = useState("");

    // Existing resume from the profile API.
    // Expected shape: { name, size, url }
    const [currentResume, setCurrentResume] = useState(
        () => user.resume || null
    );

    const [replacementFile, setReplacementFile] = useState(null);

    const currentLocalUrl = useFileUrl(currentResume?.file);
    const replacementUrl = useFileUrl(replacementFile);

    const currentResumeUrl =
        currentLocalUrl || getResumeAccessUrl(currentResume?.url);

    const hasChanges =
        JSON.stringify(values) !== JSON.stringify(savedProfile) ||
        skillInput.trim() !== "" ||
        Boolean(replacementFile);

    const displayName = savedProfile.name || "Your account";
    const roleLabel = user.role === "admin" ? "Admin" : "User";

    const clearFeedback = (field) => {
        setErrors((previous) => ({
            ...previous,
            [field]: "",
        }));

        setFeedback("");
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setValues((previous) => ({
            ...previous,
            [name]: value,
        }));

        clearFeedback(name);
    };

    const handleResumeChange = (event) => {
        const file = event.target.files?.[0];

        // Allow selecting the same file again.
        event.target.value = "";

        if (!file) {
            return;
        }

        const error = validateResume(file);

        setErrors((previous) => ({
            ...previous,
            resume: error,
        }));

        setFeedback("");

        if (error) {
            return;
        }

        // Keep the existing resume until Save Changes.
        setReplacementFile(file);
    };

    const cancelReplacement = () => {
        setReplacementFile(null);
        clearFeedback("resume");
    };

    const discardChanges = () => {
        setValues({
            ...savedProfile,
            skills: [...savedProfile.skills],
        });

        setReplacementFile(null);
        setSkillInput("");
        setErrors({});
        setFeedback("");
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        const cleanedValues = {
            ...values,
            name: values.name.trim(),
            email: values.email.trim(),
            phone: values.phone.trim(),
            address: values.address.trim(),
            skills: normalizeSkills([
                ...values.skills,
                skillInput,
            ]),
        };

        setValues(cleanedValues);
        setSkillInput("");
        setFeedback("");

        const nextErrors = {};

        if (
            cleanedValues.name.length < 2 ||
            cleanedValues.name.length > 100
        ) {
            nextErrors.name =
                "Enter your name using 2–100 characters.";
        }

        if (
            cleanedValues.email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedValues.email)
        ) {
            nextErrors.email = "Enter a valid email address.";
        }

        const phoneDigits = cleanedValues.phone.replace(/\D/g, "");

        if (
            !/^\+?[\d\s()-]+$/.test(cleanedValues.phone) ||
            phoneDigits.length < 10 ||
            phoneDigits.length > 15
        ) {
            nextErrors.phone = "Enter a valid phone number.";
        }

        if (cleanedValues.address.length > 500) {
            nextErrors.address =
                "Use no more than 500 characters.";
        }

        if (
            cleanedValues.qualification &&
            !qualifications.includes(cleanedValues.qualification)
        ) {
            nextErrors.qualification =
                "Select a valid qualification.";
        }

        if (
            cleanedValues.experience &&
            !experienceOptions.includes(cleanedValues.experience)
        ) {
            nextErrors.experience =
                "Select a valid experience option.";
        }

        if (
            cleanedValues.skills.length > 20 ||
            cleanedValues.skills.some((skill) => skill.length > 60)
        ) {
            nextErrors.skills =
                "Add up to 20 skills, using no more than 60 characters each.";
        }

        if (replacementFile) {
            const resumeError = validateResume(replacementFile);

            if (resumeError) {
                nextErrors.resume = resumeError;
            }
        }

        setErrors(nextErrors);

        const firstError = Object.keys(nextErrors)[0];

        if (firstError) {
            requestAnimationFrame(() => {
                const target = formRef.current?.querySelector(
                    `[data-field="${firstError}"] input, ` +
                    `[data-field="${firstError}"] textarea, ` +
                    `[data-field="${firstError}"] [role="combobox"], ` +
                    `[data-field="${firstError}"] button`
                );

                target?.focus();
            });

            return;
        }

        /*
            FRONTEND PREVIEW ONLY.

            Backend integration:
            1. Send profile fields and replacementFile using FormData.
            2. Backend validates and uploads the resume to Cloudinary.
            3. Backend saves resume metadata in MongoDB.
            4. Update the UI only after the API succeeds.
        */

        setSavedProfile({
            ...cleanedValues,
            skills: [...cleanedValues.skills],
        });

        if (replacementFile) {
            setCurrentResume({
                name: replacementFile.name,
                size: replacementFile.size,
                file: replacementFile,
                url: null,
            });

            setReplacementFile(null);
        }

        setFeedback(
            "Changes are saved in this page preview only. No information " +
            "or file has been uploaded. Refreshing or leaving this page " +
            "will reset the preview."
        );
    };

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
    });

    return (
        <div className="profile-page">
            <header className="panel-page-heading">
                <div>
                    <h1 className="panel-page-title">
                        My Profile
                    </h1>

                    <p className="panel-page-description">
                        Your details, skills and career story.
                    </p>
                </div>

                {hasChanges && (
                    <span
                        className="profile-unsaved"
                        role="status"
                    >
                        <span aria-hidden="true" />
                        Unsaved changes
                    </span>
                )}
            </header>

            <div className="profile-grid">
                <aside className="profile-sidebar">
                    <section
                        className="panel-card profile-summary"
                        aria-labelledby="profile-name"
                    >
                        <div
                            className="profile-summary-cover"
                            aria-hidden="true"
                        />

                        <div className="profile-summary-body">
                            <Avatar
                                src={
                                    user.avatarUrl ||
                                    "/images/default-avatar.svg"
                                }
                                alt={displayName}
                                className="profile-avatar"
                            >
                                {displayName.charAt(0).toUpperCase()}
                            </Avatar>

                            <h2 id="profile-name">
                                {displayName}
                            </h2>

                            <span className="profile-role">
                                {roleLabel}
                            </span>

                            <dl className="profile-summary-details">
                                {[
                                    [
                                        "Email address",
                                        savedProfile.email,
                                        "fa-regular fa-envelope",
                                    ],
                                    [
                                        "Phone number",
                                        savedProfile.phone,
                                        "fa-solid fa-phone",
                                    ],
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
                                            <i
                                                className={icon}
                                                aria-hidden="true"
                                            />
                                            {label}
                                        </dt>

                                        <dd>
                                            {value || "Not provided"}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </section>

                    <div className="profile-note">
                        <i
                            className="fa-regular fa-lightbulb"
                            aria-hidden="true"
                        />

                        <div>
                            <h3>
                                Keep your next step in focus.
                            </h3>

                            <p>
                                Highlight relevant skills and maintain
                                an up-to-date resume. Existing applications
                                retain their original submitted details.
                            </p>
                        </div>
                    </div>
                </aside>

                <form
                    ref={formRef}
                    className="profile-form"
                    onSubmit={handleSubmit}
                    noValidate
                >
                    <section
                        className="panel-card"
                        aria-labelledby="profile-personal-title"
                    >
                        <header className="panel-card-header">
                            <div>
                                <h2
                                    id="profile-personal-title"
                                    className="panel-card-title"
                                >
                                    Personal information
                                </h2>

                                <p className="panel-card-description">
                                    Fields marked with * are required.
                                </p>
                            </div>

                            <span
                                className="profile-section-icon"
                                aria-hidden="true"
                            >
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
                                            maxLength: 25,
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

                    <section
                        className="panel-card"
                        aria-labelledby="profile-professional-title"
                    >
                        <header className="panel-card-header">
                            <div>
                                <h2
                                    id="profile-professional-title"
                                    className="panel-card-title"
                                >
                                    Professional background
                                </h2>

                                <p className="panel-card-description">
                                    Education, experience and the skills
                                    you bring.
                                </p>
                            </div>

                            <span
                                className="profile-section-icon"
                                aria-hidden="true"
                            >
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
                                    <MenuItem value="">
                                        Not specified
                                    </MenuItem>

                                    {qualifications.map((item) => (
                                        <MenuItem
                                            key={item}
                                            value={item}
                                        >
                                            {item}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    {...fieldProps("experience")}
                                    label="Total experience"
                                    select
                                >
                                    <MenuItem value="">
                                        Not specified
                                    </MenuItem>

                                    {experienceOptions.map((item) => (
                                        <MenuItem
                                            key={item}
                                            value={item}
                                        >
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
                                    groupBy={(option) =>
                                        skillCategory[option] || "Other"
                                    }
                                    value={values.skills}
                                    inputValue={skillInput}
                                    className="profile-full-width"
                                    data-field="skills"
                                    slotProps={{
                                        paper: {
                                            className:
                                                "profile-skills-menu",
                                        },
                                    }}
                                    onInputChange={(_, value) => {
                                        setSkillInput(value);
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
                                                "Choose up to 20 skills, or type a custom skill and press Enter."
                                            }
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </section>

                    <section
                        className="panel-card"
                        data-field="resume"
                        aria-labelledby="profile-resume-title"
                    >
                        <header className="panel-card-header">
                            <div>
                                <h2
                                    id="profile-resume-title"
                                    className="panel-card-title"
                                >
                                    My resume
                                </h2>

                                <p className="panel-card-description">
                                    Review your current resume or
                                    choose a replacement.
                                </p>
                            </div>

                            <span
                                className="profile-section-icon"
                                aria-hidden="true"
                            >
                                <i className="fa-regular fa-file-lines" />
                            </span>
                        </header>

                        <div className="profile-card-body profile-resume-body">
                            {currentResume && (
                                <div className="profile-current-resume">
                                    <div className="profile-resume-topline">
                                        <span>Current resume</span>

                                        <span className="profile-resume-badge">
                                            {currentResume.file
                                                ? "Preview only"
                                                : "On profile"}
                                        </span>
                                    </div>

                                    <div className="profile-resume-file">
                                        <span
                                            className="profile-file-icon"
                                            aria-hidden="true"
                                        >
                                            <i className="fa-regular fa-file-lines" />
                                        </span>

                                        <div className="profile-file-copy">
                                            <h3>
                                                {currentResume.name ||
                                                    "Resume"}
                                            </h3>

                                            <p>
                                                {[
                                                    formatFileSize(
                                                        currentResume.size
                                                    ),
                                                    currentResumeUrl
                                                        ? "Ready to open"
                                                        : "File link not available",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" · ")}
                                            </p>
                                        </div>

                                        {currentResumeUrl && (
                                            <Button
                                                component="a"
                                                href={currentResumeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                variant="outlined"
                                                className="panel-button panel-button-outline"
                                            >
                                                Open resume
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div
                                className={`profile-upload ${
                                    errors.resume ? "is-error" : ""
                                }`}
                            >
                                <span
                                    className="profile-upload-icon"
                                    aria-hidden="true"
                                >
                                    <i className="fa-solid fa-arrow-up-from-bracket" />
                                </span>

                                <div className="profile-upload-copy">
                                    <h3>
                                        {currentResume
                                            ? "Update your resume"
                                            : "Upload your resume"}
                                    </h3>

                                    <p id="profile-resume-help">
                                        PDF, DOC or DOCX · Maximum 5 MB
                                    </p>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    hidden
                                    onChange={handleResumeChange}
                                />

                                <Button
                                    type="button"
                                    variant="outlined"
                                    className="panel-button panel-button-outline"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    aria-describedby={
                                        errors.resume
                                            ? "profile-resume-help profile-resume-error"
                                            : "profile-resume-help"
                                    }
                                >
                                    Choose file
                                </Button>
                            </div>

                            {errors.resume && (
                                <p
                                    id="profile-resume-error"
                                    className="profile-error"
                                    role="alert"
                                >
                                    {errors.resume}
                                </p>
                            )}

                            {replacementFile && (
                                <div
                                    className="profile-replacement"
                                    role="status"
                                >
                                    <div className="profile-file-copy">
                                        <span className="profile-replacement-label">
                                            {currentResume
                                                ? "Selected replacement"
                                                : "Selected resume"}
                                        </span>

                                        <h3>{replacementFile.name}</h3>

                                        <p>
                                            {formatFileSize(
                                                replacementFile.size
                                            )}{" "}
                                            · Save Changes to use this file
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
                                            className="profile-text-button"
                                            onClick={cancelReplacement}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {feedback && (
                        <Alert
                            severity="info"
                            role="status"
                            className="profile-feedback"
                        >
                            {feedback}
                        </Alert>
                    )}

                    <div className="profile-save-bar">
                        <p>
                            Review your information before saving changes.
                        </p>

                        <div className="profile-save-actions">
                            <Button
                                type="button"
                                className="panel-button profile-discard-button"
                                disabled={!hasChanges}
                                onClick={discardChanges}
                            >
                                Discard changes
                            </Button>

                            <Button
                                type="submit"
                                variant="contained"
                                disableElevation
                                disabled={!hasChanges}
                                className="panel-button panel-button-primary"
                                startIcon={
                                    <i
                                        className="fa-regular fa-floppy-disk"
                                        aria-hidden="true"
                                    />
                                }
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Profile({ user }) {
    const outletContext = useOutletContext();

    const currentUser =
        user ?? outletContext?.user ?? demoProfile;

    return (
        <ProfileForm
            key={
                currentUser._id ||
                currentUser.id ||
                "profile-preview"
            }
            user={currentUser}
        />
    );
}

export default Profile;