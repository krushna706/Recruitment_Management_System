import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    Alert,
    Autocomplete,
    Button,
    MenuItem,
    TextField,
} from "@mui/material";

import { demoJobs } from "../../data/jobData";
import { toTextList } from "../../utils/dataFormat";

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

const skillOptions = [
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

function validateResume(file) {
    if (!file) {
        return "Please upload your resume.";
    }

    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
        return "Upload a PDF, DOC or DOCX file.";
    }

    if (file.size === 0) {
        return "This file is empty. Please choose another file.";
    }

    if (file.size > MAX_RESUME_SIZE) {
        return "Resume size must not exceed 5 MB.";
    }

    return "";
}

function normalizeSkills(skills) {
    return [
        ...new Map(
            skills
                .map((skill) => skill.trim())
                .filter(Boolean)
                .map((skill) => [skill.toLowerCase(), skill]),
        ).values(),
    ];
}

function ApplicationForm({ job, user }) {
    const formRef = useRef(null);
    const fileInputRef = useRef(null);

    const [values, setValues] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        qualification: qualifications.includes(user?.qualification)
            ? user.qualification
            : "",
        experience: experienceOptions.includes(user?.experience)
            ? user.experience
            : "",
        skills: toTextList(user?.skills),
    });

    const [skillInput, setSkillInput] = useState("");
    const [resume, setResume] = useState(null);
    const [errors, setErrors] = useState({});
    const [previewValidated, setPreviewValidated] = useState(false);

    const jobPath = `/jobs/${encodeURIComponent(job.id)}`;

    const clearFeedback = (field) => {
        setErrors((previous) => ({
            ...previous,
            [field]: "",
        }));

        setPreviewValidated(false);
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

        event.target.value = "";

        if (!file) return;

        const error = validateResume(file);

        setResume(error ? null : file);

        setErrors((previous) => ({
            ...previous,
            resume: error,
        }));

        setPreviewValidated(false);
    };

    const removeResume = () => {
        setResume(null);
        clearFeedback("resume");
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        const cleanedValues = {
            ...values,
            name: values.name.trim(),
            email: values.email.trim(),
            phone: values.phone.trim(),
            skills: normalizeSkills([...values.skills, skillInput]),
        };

        setValues(cleanedValues);
        setSkillInput("");
        setPreviewValidated(false);

        const nextErrors = {};

        if (cleanedValues.name.length < 2 || cleanedValues.name.length > 100) {
            nextErrors.name = "Enter your full name using 2–100 characters.";
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

        if (!qualifications.includes(cleanedValues.qualification)) {
            nextErrors.qualification = "Select your highest qualification.";
        }

        if (!experienceOptions.includes(cleanedValues.experience)) {
            nextErrors.experience = "Select your total experience.";
        }

        if (cleanedValues.skills.length === 0) {
            nextErrors.skills = "Add at least one relevant skill.";
        } else if (
            cleanedValues.skills.length > 15 ||
            cleanedValues.skills.some((skill) => skill.length > 60)
        ) {
            nextErrors.skills =
                "Add up to 15 skills, with a maximum of 60 characters each.";
        }

        const resumeError = validateResume(resume);

        if (resumeError) {
            nextErrors.resume = resumeError;
        }

        setErrors(nextErrors);

        const firstError = Object.keys(nextErrors)[0];

        if (firstError) {
            requestAnimationFrame(() => {
                const target = formRef.current?.querySelector(
                    `[data-field="${firstError}"] input, ` +
                        `[data-field="${firstError}"] [role="combobox"], ` +
                        `[data-field="${firstError}"] button`,
                );

                target?.focus();
            });

            return;
        }

        // Frontend validation only.
        // Backend integration: send job ID, name, email, phone, qualification,
        // experience, skills and resume via FormData. The server derives userId,
        // openingType and the job snapshot; it must not trust client ownership.
        setPreviewValidated(true);
    };

    const textFieldProps = (name) => ({
        name,
        value: values[name],
        onChange: handleChange,
        error: Boolean(errors[name]),
        helperText: errors[name],
        required: true,
        fullWidth: true,
        variant: "outlined",
        className: "website-text-field",
        "data-field": name,
    });

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
                            noValidate
                        >
                            <fieldset className="job-apply-group">
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
                                            htmlInput: {
                                                maxLength: 100,
                                            },
                                        }}
                                    />

                                    <TextField
                                        {...textFieldProps("phone")}
                                        label="Phone number"
                                        type="tel"
                                        autoComplete="tel"
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 25,
                                            },
                                        }}
                                    />

                                    <TextField
                                        {...textFieldProps("email")}
                                        className="website-text-field job-apply-full-width"
                                        label="Email address"
                                        type="email"
                                        autoComplete="email"
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 254,
                                            },
                                        }}
                                    />
                                </div>
                            </fieldset>

                            <fieldset className="job-apply-group">
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
                                        {qualifications.map((item) => (
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
                                        options={skillOptions}
                                        value={values.skills}
                                        inputValue={skillInput}
                                        className="job-apply-full-width"
                                        data-field="skills"
                                        onInputChange={(_, value) => {
                                            setSkillInput(value);
                                            clearFeedback("skills");
                                        }}
                                        onChange={(_, selectedSkills) => {
                                            setValues((previous) => ({
                                                ...previous,
                                                skills: normalizeSkills(
                                                    selectedSkills,
                                                ),
                                            }));

                                            clearFeedback("skills");
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

                            <fieldset
                                className="job-apply-group"
                                data-field="resume"
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
                                                      Math.round(
                                                          resume.size / 1024,
                                                      ),
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
                                            onChange={handleResumeChange}
                                        />

                                        <Button
                                            type="button"
                                            variant="outlined"
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
                                            {resume
                                                ? "Change file"
                                                : "Browse files"}
                                        </Button>

                                        {resume && (
                                            <Button
                                                type="button"
                                                className="job-apply-remove"
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

                            {previewValidated && (
                                <Alert severity="info" role="status">
                                    Your form passed the frontend checks. No
                                    application has been submitted. Submission
                                    will work after the backend is connected.
                                </Alert>
                            )}

                            <div className="job-apply-submit-row">
                                <p>
                                    Please review your details before
                                    submitting.
                                </p>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    disableElevation
                                    className="website-button website-button-primary"
                                    endIcon={
                                        <i
                                            className="fa-solid fa-arrow-right"
                                            aria-hidden="true"
                                        />
                                    }
                                >
                                    Submit Application
                                </Button>
                            </div>
                        </form>
                    </article>

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

export default function JobApply({ jobs = demoJobs, user = null }) {
    const { id } = useParams();

    const job = Array.isArray(jobs)
        ? jobs.find((item) => String(item._id || item.id) === id)
        : null;

    if (!job || job.status !== "Published") {
        return (
            <section className="website-section website-shell">
                <div className="rms-jobs-empty">
                    <h1 className="website-section-title">
                        {job && job.status === "Closed"
                            ? "Applications are closed."
                            : "Position not available."}
                    </h1>

                    <p>
                        Browse the available openings to find your next
                        opportunity.
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

    return (
        <ApplicationForm
            key={id}
            job={{
                ...job,
                id: String(job._id || job.id),
            }}
            user={user}
        />
    );
}
