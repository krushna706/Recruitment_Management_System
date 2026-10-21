import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Autocomplete, Button, MenuItem, TextField } from "@mui/material";
import { toast } from "react-toastify";

import api from "../../services/api";
import { toTextList } from "../../utils/dataFormat";

// ================== APPLICATION OPTIONS ==================
const QUALIFICATIONS = [
    "Secondary / Class 10",
    "Higher Secondary / Class 12",
    "Diploma",
    "Bachelor’s degree",
    "Master’s degree",
    "Doctorate",
    "Other",
];

const EXPERIENCE_OPTIONS = [
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

const SKILL_OPTIONS = [
    "React.js",
    "JavaScript",
    "TypeScript",
    "Node.js",
    "Express.js",
    "MongoDB",
    "HTML",
    "CSS",
    "SQL",
    "Git",
    "Figma",
    "UI/UX Design",
    "Software Testing",
    "Digital Marketing",
    "Content Writing",
    "Communication",
    "Customer Support",
    "Recruitment",
    "Project Coordination",
];

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

// ================== RESUME VALIDATION ==================
// Frontend checks provide feedback; the backend verifies the actual format.
function validateResume(file) {
    if (!file) {
        return "Please upload your resume.";
    }

    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
        return "Upload a PDF, DOC or DOCX file.";
    }

    if (file.name.length > 255) {
        return "Resume filename cannot exceed 255 characters.";
    }

    if (file.size === 0) {
        return "This file is empty. Please choose another file.";
    }

    if (file.size > MAX_RESUME_SIZE) {
        return "Resume size must not exceed 5 MB.";
    }

    return "";
}

// ================== SKILLS NORMALIZATION ==================
function normalizeSkills(skills) {
    return [
        ...new Map(
            skills
                .map((skill) => skill.trim())
                .filter(Boolean)
                .map((skill) => [skill.toLowerCase(), skill])
        ).values(),
    ];
}

// ================== APPLICATION VALIDATION ==================
function validateApplication(values, resume) {
    const errors = {};

    if (values.name.length < 2 || values.name.length > 100) {
        errors.name = "Enter your full name using 2–100 characters.";
    }

    if (
        values.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
    ) {
        errors.email = "Enter a valid email address.";
    }

    const phoneDigits = values.phone.replace(/\D/g, "");

    if (
        values.phone.length > 25 ||
        !/^\+?[\d\s()-]+$/.test(values.phone) ||
        phoneDigits.length < 10 ||
        phoneDigits.length > 15
    ) {
        errors.phone = "Enter a valid phone number containing 10–15 digits.";
    }

    if (!QUALIFICATIONS.includes(values.qualification)) {
        errors.qualification = "Select your highest qualification.";
    }

    if (!EXPERIENCE_OPTIONS.includes(values.experience)) {
        errors.experience = "Select your total experience.";
    }

    if (!values.skills.length) {
        errors.skills = "Add at least one relevant skill.";
    } else if (
        values.skills.length > 15 ||
        values.skills.some((skill) => skill.length > 60)
    ) {
        errors.skills = "Add up to 15 skills, with a maximum of 60 characters each.";
    }

    const resumeError = validateResume(resume);

    if (resumeError) {
        errors.resume = resumeError;
    }

    return errors;
}

// ================== APPLICATION FORM ==================
function ApplicationForm({ job, user }) {
    const formRef = useRef(null);
    const fileInputRef = useRef(null);
    const submitLockRef = useRef(false);
    const mountedRef = useRef(false);

    const [values, setValues] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        qualification: QUALIFICATIONS.includes(user?.qualification)
            ? user.qualification
            : "",
        experience: EXPERIENCE_OPTIONS.includes(user?.experience)
            ? user.experience
            : "",
        skills: toTextList(user?.skills),
    });

    const [skillInput, setSkillInput] = useState("");
    const [resume, setResume] = useState(null);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [application, setApplication] = useState(null);

    const jobPath = `/jobs/${encodeURIComponent(job.id)}`;

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    // ================== INPUT HANDLERS ==================
    function clearError(field) {
        setErrors((previous) => ({
            ...previous,
            [field]: "",
        }));
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setValues((previous) => ({
            ...previous,
            [name]: value,
        }));

        clearError(name);
    }

    function handleResumeChange(event) {
        const file = event.target.files?.[0];

        event.target.value = "";

        if (!file) return;

        const error = validateResume(file);

        setResume(error ? null : file);
        setErrors((previous) => ({
            ...previous,
            resume: error,
        }));
    }

    function removeResume() {
        setResume(null);
        clearError("resume");
    }

    function focusFirstError(field) {
        window.requestAnimationFrame(() => {
            const target = formRef.current?.querySelector(
                `[data-field="${field}"] input, ` +
                `[data-field="${field}"] [role="combobox"], ` +
                `[data-field="${field}"] button`
            );

            target?.focus();
        });
    }

    // ================== SUBMIT APPLICATION ==================
    async function handleSubmit(event) {
        event.preventDefault();

        if (submitLockRef.current || application) return;

        const cleanedValues = {
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
            phone: values.phone.trim(),
            qualification: values.qualification,
            experience: values.experience,
            skills: normalizeSkills([...values.skills, skillInput]),
        };

        setValues(cleanedValues);
        setSkillInput("");

        const nextErrors = validateApplication(cleanedValues, resume);

        setErrors(nextErrors);

        const firstError = Object.keys(nextErrors)[0];

        if (firstError) {
            toast.error("Please check the highlighted fields.");
            focusFirstError(firstError);
            return;
        }

        const formData = new FormData();

        formData.append("name", cleanedValues.name);
        formData.append("email", cleanedValues.email);
        formData.append("phone", cleanedValues.phone);
        formData.append("qualification", cleanedValues.qualification);
        formData.append("experience", cleanedValues.experience);
        formData.append("skills", JSON.stringify(cleanedValues.skills));
        formData.append("resume", resume);

        submitLockRef.current = true;
        setSubmitting(true);

        try {
            // Let the browser set the multipart Content-Type and boundary.
            const { data } = await api.post(
                `/applications/jobs/${encodeURIComponent(job.id)}`,
                formData,
                {
                    timeout: 120000,
                }
            );

            if (!mountedRef.current) return;

            setApplication(data.application);
            setResume(null);

            toast.success(
                data.message || "Application submitted successfully."
            );
        } catch (error) {
            if (!mountedRef.current) return;

            const responseMessage = error.response?.data?.message;

            const fallback = error.response
                ? "Application could not be submitted. Please try again later."
                : "Submission confirmation was not received. Your application may have been saved. A retry will not create a duplicate for this job.";

            toast.error(
                typeof responseMessage === "string" && responseMessage.trim()
                    ? responseMessage
                    : fallback
            );
        } finally {
            submitLockRef.current = false;

            if (mountedRef.current) {
                setSubmitting(false);
            }
        }
    }

    // ================== SHARED INPUT PROPS ==================
    function textFieldProps(name) {
        return {
            name,
            value: values[name],
            onChange: handleChange,
            error: Boolean(errors[name]),
            helperText: errors[name],
            required: true,
            fullWidth: true,
            disabled: submitting,
            variant: "outlined",
            className: "website-text-field",
            "data-field": name,
        };
    }

    // ================== SUBMISSION CONFIRMATION ==================
    if (application) {
        return (
            <section
                className="job-apply-page website-shell job-success-page"
                aria-labelledby="application-success-title"
            >
                <div className="job-apply-container">
                    <article className="job-success-card">
                        <div className="job-success-icon" aria-hidden="true">
                            <i className="fa-solid fa-check" />
                        </div>

                        <p className="job-success-eyebrow">APPLICATION RECEIVED</p>

                        <h1 id="application-success-title">
                            You’re one step closer.
                        </h1>

                        <p className="job-success-description" role="status">
                            Your application has been submitted successfully.
                            You can follow its progress in My Applications.
                        </p>

                        <div className="job-success-opening">
                            <span className="job-success-opening-icon" aria-hidden="true">
                                <i className="fa-solid fa-briefcase" />
                            </span>

                            <div className="job-success-opening-copy">
                                <h2>{job.title}</h2>
                                {job.company && <p>{job.company}</p>}
                            </div>
                        </div>

                        <dl className="job-success-details">
                            <div>
                                <dt>Application ID</dt>
                                <dd className="job-success-reference">
                                    {application.id || application._id}
                                </dd>
                            </div>

                            <div>
                                <dt>Current status</dt>
                                <dd>
                                    <span className="job-success-status">
                                        {application.status}
                                    </span>
                                </dd>
                            </div>
                        </dl>

                        <div className="job-success-actions">
                            <Button
                                component={Link}
                                to="/manage/my-applications"
                                variant="contained"
                                disableElevation
                                className="job-success-primary"
                                endIcon={
                                    <i
                                        className="fa-solid fa-arrow-right"
                                        aria-hidden="true"
                                    />
                                }
                            >
                                My Applicatio
                            </Button>

                            <Button
                                component={Link}
                                to="/jobs"
                                variant="outlined"
                                className="job-success-secondary"
                            >
                                Explore more jobs
                            </Button>
                        </div>

                        <p className="job-success-note">
                            <i className="fa-regular fa-circle-check" aria-hidden="true" />
                            Your details and resume have been received.
                        </p>
                    </article>
                </div>
            </section>
        );
    }

    return (
        <section
            className="job-apply-page website-shell"
            aria-labelledby="application-page-title"
        >
            <div className="job-apply-container">
                <div className="job-apply-topbar">
                    <Link to={jobPath} className="job-apply-back-link">
                        <i
                            className="fa-solid fa-arrow-left"
                            aria-hidden="true"
                        />
                        Back to job details
                    </Link>

                    <span className="job-apply-topbar-label">
                        Job application
                    </span>
                </div>

                <header className="job-apply-page-heading">
                    <p className="website-section-label">TAKE THE NEXT STEP</p>

                    <h1
                        id="application-page-title"
                        className="website-section-title"
                    >
                        Your next chapter <span>starts here.</span>
                    </h1>

                    <p className="website-section-description">
                        Tell us about yourself and share the experience you’ll
                        bring to this role.
                    </p>
                </header>

                <div className="job-apply-grid">
                    <article
                        className="job-apply-card"
                        aria-labelledby="application-form-title"
                    >
                        <header className="job-apply-card-header">
                            <div>
                                <h2 id="application-form-title">
                                    Application details
                                </h2>

                                <p>Complete the information below to apply.</p>
                            </div>

                            <span className="job-apply-required">
                                * Required fields
                            </span>
                        </header>

                        <form
                            ref={formRef}
                            className="job-apply-form"
                            onSubmit={handleSubmit}
                            aria-busy={submitting}
                            noValidate
                        >
                            {/* ================== PERSONAL DETAILS ================== */}
                            <fieldset
                                className="job-apply-group"
                                disabled={submitting}
                            >
                                <legend>
                                    <span
                                        className="job-apply-section-number"
                                        aria-hidden="true"
                                    >
                                        01
                                    </span>
                                    Personal details
                                </legend>

                                <p className="job-apply-group-description">
                                    Use contact details where we can reach you.
                                </p>

                                <div className="job-apply-fields">
                                    <TextField
                                        {...textFieldProps("name")}
                                        label="Full name"
                                        autoComplete="name"
                                        slotProps={{
                                            htmlInput: { maxLength: 100 },
                                        }}
                                    />

                                    <TextField
                                        {...textFieldProps("phone")}
                                        label="Phone number"
                                        type="tel"
                                        autoComplete="tel"
                                        slotProps={{
                                            htmlInput: { maxLength: 25 },
                                        }}
                                    />

                                    <TextField
                                        {...textFieldProps("email")}
                                        className="website-text-field job-apply-full-width"
                                        label="Email address"
                                        type="email"
                                        autoComplete="email"
                                        slotProps={{
                                            htmlInput: { maxLength: 254 },
                                        }}
                                    />
                                </div>
                            </fieldset>

                            {/* ================== PROFESSIONAL BACKGROUND ================== */}
                            <fieldset
                                className="job-apply-group"
                                disabled={submitting}
                            >
                                <legend>
                                    <span
                                        className="job-apply-section-number"
                                        aria-hidden="true"
                                    >
                                        02
                                    </span>
                                    Professional background
                                </legend>

                                <p className="job-apply-group-description">
                                    Highlight your education, experience and
                                    relevant skills.
                                </p>

                                <div className="job-apply-fields">
                                    <TextField
                                        {...textFieldProps("qualification")}
                                        label="Highest qualification"
                                        select
                                    >
                                        {QUALIFICATIONS.map((item) => (
                                            <MenuItem key={item} value={item}>
                                                {item}
                                            </MenuItem>
                                        ))}
                                    </TextField>

                                    <TextField
                                        {...textFieldProps("experience")}
                                        label="Total experience"
                                        select
                                    >
                                        {EXPERIENCE_OPTIONS.map((item) => (
                                            <MenuItem key={item} value={item}>
                                                {item}
                                            </MenuItem>
                                        ))}
                                    </TextField>

                                    <Autocomplete
                                        multiple
                                        freeSolo
                                        filterSelectedOptions
                                        options={SKILL_OPTIONS}
                                        value={values.skills}
                                        inputValue={skillInput}
                                        disabled={submitting}
                                        className="job-apply-full-width"
                                        data-field="skills"
                                        onInputChange={(_, value) => {
                                            setSkillInput(value);
                                            clearError("skills");
                                        }}
                                        onChange={(_, selectedSkills) => {
                                            setValues((previous) => ({
                                                ...previous,
                                                skills: normalizeSkills(
                                                    selectedSkills
                                                ),
                                            }));

                                            clearError("skills");
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Relevant skills"
                                                required
                                                className="website-text-field"
                                                error={Boolean(errors.skills)}
                                                helperText={
                                                    errors.skills ||
                                                    "Select a skill or type your own and press Enter."
                                                }
                                            />
                                        )}
                                    />
                                </div>
                            </fieldset>

                            {/* ================== RESUME ================== */}
                            <fieldset
                                className="job-apply-group"
                                data-field="resume"
                                disabled={submitting}
                            >
                                <legend>
                                    <span
                                        className="job-apply-section-number"
                                        aria-hidden="true"
                                    >
                                        03
                                    </span>
                                    Upload your resume *
                                </legend>

                                <p className="job-apply-group-description">
                                    Add your latest resume with your experience
                                    and achievements.
                                </p>

                                <div
                                    className={`job-apply-upload ${
                                        resume ? "has-file" : ""
                                    } ${errors.resume ? "is-error" : ""}`}
                                >
                                    <span
                                        className="job-apply-upload-icon"
                                        aria-hidden="true"
                                    >
                                        <i
                                            className={`fa-solid ${
                                                resume
                                                    ? "fa-file-lines"
                                                    : "fa-arrow-up-from-bracket"
                                            }`}
                                        />
                                    </span>

                                    <div className="job-apply-upload-copy">
                                        <h3>
                                            {resume
                                                ? resume.name
                                                : "Choose your resume"}
                                        </h3>

                                        <p id="resume-help">
                                            {resume
                                                ? `${Math.max(
                                                    1,
                                                    Math.round(resume.size / 1024)
                                                )} KB · File selected`
                                                : "PDF, DOC or DOCX · Maximum 5 MB"}
                                        </p>
                                    </div>

                                    <div className="job-apply-upload-actions">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            hidden
                                            disabled={submitting}
                                            onChange={handleResumeChange}
                                        />

                                        <Button
                                            type="button"
                                            variant="outlined"
                                            disabled={submitting}
                                            className="website-button website-button-outline"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            aria-describedby={
                                                errors.resume
                                                    ? "resume-help resume-error"
                                                    : "resume-help"
                                            }
                                        >
                                            {resume ? "Change file" : "Browse files"}
                                        </Button>

                                        {resume && (
                                            <Button
                                                type="button"
                                                className="job-apply-remove"
                                                disabled={submitting}
                                                onClick={removeResume}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {errors.resume && (
                                    <p
                                        id="resume-error"
                                        className="job-apply-error"
                                        role="alert"
                                    >
                                        {errors.resume}
                                    </p>
                                )}
                            </fieldset>

                            {/* ================== SUBMIT BUTTON ================== */}
                            <div className="job-apply-submit-row">
                                <p role={submitting ? "status" : undefined}>
                                    {submitting
                                        ? "Submitting your application. Please keep this page open."
                                        : "Please review your details before submitting."}
                                </p>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    disableElevation
                                    disabled={submitting}
                                    className="website-button website-button-primary"
                                    endIcon={
                                        <i
                                            className={
                                                submitting
                                                    ? "fa-solid fa-spinner fa-spin"
                                                    : "fa-solid fa-arrow-right"
                                            }
                                            aria-hidden="true"
                                        />
                                    }
                                >
                                    {submitting
                                        ? "Submitting..."
                                        : "Submit Application"}
                                </Button>
                            </div>
                        </form>
                    </article>

                    {/* ================== JOB SUMMARY ================== */}
                    <aside
                        className="job-apply-sidebar"
                        aria-labelledby="application-job-title"
                    >
                        <div className="job-apply-summary">
                            <div className="job-apply-summary-heading">
                                <span
                                    className="job-apply-summary-icon"
                                    aria-hidden="true"
                                >
                                    <i className="fa-solid fa-briefcase" />
                                </span>

                                <p className="website-section-label">
                                    YOUR NEXT OPPORTUNITY
                                </p>
                            </div>

                            <p className="rms-job-company">{job.company}</p>

                            <h2 id="application-job-title">{job.title}</h2>

                            <div className="rms-job-tags">
                                <span>{job.type}</span>
                                <span>{job.mode}</span>
                            </div>

                            <dl className="rms-job-meta">
                                <div>
                                    <dt>
                                        <i
                                            className="fa-solid fa-location-dot"
                                            aria-hidden="true"
                                        />
                                        Location
                                    </dt>
                                    <dd>{job.location}</dd>
                                </div>

                                <div>
                                    <dt>
                                        <i
                                            className="fa-solid fa-briefcase"
                                            aria-hidden="true"
                                        />
                                        Experience
                                    </dt>
                                    <dd>{job.experience}</dd>
                                </div>

                                <div>
                                    <dt>
                                        <i
                                            className="fa-solid fa-indian-rupee-sign"
                                            aria-hidden="true"
                                        />
                                        Salary
                                    </dt>
                                    <dd>{job.salary || "Not disclosed"}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="job-apply-tips">
                            <h3>
                                <i
                                    className="fa-regular fa-lightbulb"
                                    aria-hidden="true"
                                />
                                Before you submit
                            </h3>

                            <ul>
                                <li>Check your email and phone number.</li>
                                <li>Highlight skills that match the role.</li>
                                <li>Upload a clear, up-to-date resume.</li>
                            </ul>
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    );
}

// ================== APPLICATION PAGE ==================
function JobApply({ user = null }) {
    const { id } = useParams();

    return <JobApplyContent key={id} id={id} user={user} />;
}

function JobApplyContent({ id, user }) {
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    // ================== FETCH JOB ==================
    useEffect(() => {
        const controller = new AbortController();

        async function fetchJob() {
            setLoading(true);
            setError("");
            setJob(null);

            if (!/^[a-fA-F0-9]{24}$/.test(id || "")) {
                setLoading(false);
                return;
            }

            try {
                const { data } = await api.get(
                    `/jobs/${encodeURIComponent(id)}`,
                    { signal: controller.signal }
                );

                if (controller.signal.aborted) return;

                setJob({
                    ...data.job,
                    id: String(data.job.id || data.job._id),
                });
            } catch (requestError) {
                if (controller.signal.aborted) return;

                if (requestError.response?.status !== 404) {
                    const message = requestError.response?.data?.message;

                    setError(
                        typeof message === "string" && message.trim()
                            ? message
                            : "Job details could not be loaded. Please try again."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchJob();

        return () => controller.abort();
    }, [id, refreshKey]);

    if (loading) {
        return (
            <section className="website-section website-shell">
                <div className="rms-jobs-empty" role="status">
                    <i
                        className="fa-solid fa-spinner fa-spin"
                        aria-hidden="true"
                    />
                    <h1 className="website-section-title">
                        Loading application...
                    </h1>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="website-section website-shell">
                <Alert
                    severity="error"
                    action={
                        <Button
                            type="button"
                            color="inherit"
                            onClick={() =>
                                setRefreshKey((previous) => previous + 1)
                            }
                        >
                            Retry
                        </Button>
                    }
                >
                    {error}
                </Alert>
            </section>
        );
    }

    if (!job || job.status !== "Published") {
        return (
            <section className="website-section website-shell">
                <div className="rms-jobs-empty">
                    <h1 className="website-section-title">
                        {job?.status === "Closed"
                            ? "Applications are closed."
                            : "Position not available."}
                    </h1>

                    <p>
                        Browse the available openings to find your next opportunity.
                    </p>

                    <Link
                        to="/jobs"
                        className="website-button website-button-primary job-apply-empty-link"
                    >
                        Browse Jobs
                    </Link>
                </div>
            </section>
        );
    }

    // App.jsx handles authentication and role-based access to this page.
    if (!user || user.role !== "user") {
        return (
            <section className="website-section website-shell">
                <div className="rms-jobs-empty">
                    <h1 className="website-section-title">
                        A user account is required.
                    </h1>

                    <Link
                        to={`/jobs/${encodeURIComponent(job.id)}`}
                        className="website-button website-button-primary"
                    >
                        Back to Job Details
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <ApplicationForm
            key={`${job.id}-${user._id}`}
            job={job}
            user={user}
        />
    );
}

export default JobApply;