import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    Alert,
    Autocomplete,
    Button,
    MenuItem,
    TextField,
} from "@mui/material";

const demoJobs = [
    {
        id: "frontend-developer",
        title: "Frontend Developer",
        company: "Demo Technologies",
        location: "Bhubaneswar, Odisha",
        experience: "0–2 years",
        salary: "₹3–5 LPA",
        employmentType: "Full-time",
        workMode: "On-site",
    },
    {
        id: "backend-developer",
        title: "Backend Developer",
        company: "Demo Technologies",
        location: "Bengaluru, Karnataka",
        experience: "1–3 years",
        salary: "₹5–8 LPA",
        employmentType: "Full-time",
        workMode: "Hybrid",
    },
    {
        id: "ui-ux-designer",
        title: "UI/UX Designer",
        company: "Sample Design Studio",
        location: "Pune, Maharashtra",
        experience: "0–2 years",
        salary: "₹3–6 LPA",
        employmentType: "Full-time",
        workMode: "Hybrid",
    },
    {
        id: "mern-developer",
        title: "MERN Stack Developer",
        company: "Sample Digital",
        location: "Hyderabad, Telangana",
        experience: "2–5 years",
        salary: "₹6–10 LPA",
        employmentType: "Full-time",
        workMode: "Remote",
    },
    {
        id: "hr-intern",
        title: "HR Intern",
        company: "Sample People Services",
        location: "Bhubaneswar, Odisha",
        experience: "0–1 year",
        salary: "₹10,000–15,000/month",
        employmentType: "Internship",
        workMode: "On-site",
    },
    {
        id: "business-development",
        title: "Business Development Executive",
        company: "Sample Digital",
        location: "Kolkata, West Bengal",
        experience: "1–4 years",
        salary: "₹3–6 LPA",
        employmentType: "Full-time",
        workMode: "On-site",
    },
    {
        id: "qa-engineer",
        title: "QA Engineer",
        company: "Demo Technologies",
        location: "Pune, Maharashtra",
        experience: "1–3 years",
        salary: "₹4–7 LPA",
        employmentType: "Contract",
        workMode: "Remote",
    },
    {
        id: "content-writer",
        title: "Content Writer",
        company: "Sample Design Studio",
        location: "Bengaluru, Karnataka",
        experience: "0–2 years",
        salary: "₹15,000–25,000/month",
        employmentType: "Part-time",
        workMode: "Remote",
    },
    {
        id: "digital-marketing",
        title: "Digital Marketing Executive",
        company: "Sample Digital",
        location: "Hyderabad, Telangana",
        experience: "1–3 years",
        salary: "₹3–5 LPA",
        employmentType: "Full-time",
        workMode: "Hybrid",
    },
    {
        id: "react-intern",
        title: "React Developer Intern",
        company: "Demo Technologies",
        location: "Bhubaneswar, Odisha",
        experience: "0–1 year",
        salary: "₹12,000–18,000/month",
        employmentType: "Internship",
        workMode: "On-site",
    },
    {
        id: "customer-support",
        title: "Customer Support Executive",
        company: "Sample People Services",
        location: "Kolkata, West Bengal",
        experience: "0–2 years",
        salary: "₹2.5–4 LPA",
        employmentType: "Full-time",
        workMode: "On-site",
    },
    {
        id: "project-coordinator",
        title: "Project Coordinator",
        company: "Sample Digital",
        location: "Pune, Maharashtra",
        experience: "2–4 years",
        salary: "₹4–7 LPA",
        employmentType: "Full-time",
        workMode: "Hybrid",
    },
];

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
        return "This file is empty. Please select another file.";
    }

    if (file.size > MAX_RESUME_SIZE) {
        return "Resume size must not exceed 5 MB.";
    }

    return "";
}

function ApplicationForm({ job, user }) {
    const formRef = useRef(null);
    const fileInputRef = useRef(null);

    const [values, setValues] = useState({
        fullName: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        qualification: "",
        experience: "",
        skills: [],
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

        // Allow selecting the same file again after removing it.
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

        // Include a custom skill even if the user did not press Enter.
        const uniqueSkills = [
            ...new Map(
                [...values.skills, skillInput]
                    .map((skill) => skill.trim())
                    .filter(Boolean)
                    .map((skill) => [skill.toLowerCase(), skill])
            ).values(),
        ];

        const cleanedValues = {
            ...values,
            fullName: values.fullName.trim(),
            email: values.email.trim(),
            phone: values.phone.trim(),
            skills: uniqueSkills,
        };

        setValues(cleanedValues);
        setSkillInput("");

        const nextErrors = {};

        if (
            cleanedValues.fullName.length < 2 ||
            cleanedValues.fullName.length > 100
        ) {
            nextErrors.fullName = "Enter your full name, using 2–100 characters.";
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

        if (uniqueSkills.length === 0) {
            nextErrors.skills = "Add at least one relevant skill.";
        } else if (
            uniqueSkills.length > 15 ||
            uniqueSkills.some((skill) => skill.length > 60)
        ) {
            nextErrors.skills =
                "Add up to 15 skills, with a maximum of 60 characters each.";
        }

        const resumeError = validateResume(resume);

        if (resumeError) {
            nextErrors.resume = resumeError;
        }

        setErrors(nextErrors);
        setPreviewValidated(false);

        const firstError = Object.keys(nextErrors)[0];

        if (firstError) {
            requestAnimationFrame(() => {
                const target = formRef.current?.querySelector(
                    `[data-field="${firstError}"] input, ` +
                    `[data-field="${firstError}"] [role="combobox"], ` +
                    `[data-field="${firstError}"] button`
                );

                target?.focus();
            });

            return;
        }

        // Frontend preview only.
        // Connect the application API here during backend development.
        // Send the job ID, validated fields and resume using FormData.
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
        <div className="job-apply-page">
            <section className="about-hero">
                <img
                    className="about-hero-image"
                    src="/images/about-banner.jpg"
                    alt=""
                />

                <div className="website-shell about-hero-inner">
                    <nav
                        className="about-breadcrumb"
                        aria-label="Breadcrumb"
                    >
                        <ol>
                            <li>
                                <Link to="/">Home</Link>
                            </li>
                            <li>
                                <Link to="/jobs">Jobs</Link>
                            </li>
                            <li>
                                <Link to={jobPath}>Job Details</Link>
                            </li>
                            <li aria-current="page">Apply</li>
                        </ol>
                    </nav>

                    <div className="about-hero-content">
                        <p className="website-section-label">
                            TAKE THE NEXT STEP
                        </p>

                        <h1 className="website-section-title">
                            Your next opportunity.
                            <span>Start with your application.</span>
                        </h1>
                    </div>
                </div>
            </section>

            <section
                className="website-section website-shell"
                aria-labelledby="application-title"
            >
                <div className="job-apply-container">
                    <Link to={jobPath} className="auth-back-link">
                        <i
                            className="fa-solid fa-arrow-left"
                            aria-hidden="true"
                        />
                        Back to job details
                    </Link>

                    <div className="job-apply-grid">
                        <article className="job-apply-card">
                            <header className="job-apply-header">
                                <p className="website-section-label">
                                    YOUR APPLICATION
                                </p>

                                <h2
                                    id="application-title"
                                    className="website-section-title"
                                >
                                    Let’s get to know you.
                                </h2>

                                <p className="website-section-description">
                                    Share your details and resume for the{" "}
                                    {job.title} position.
                                </p>

                                <p className="job-apply-required">
                                    Fields marked with * are required.
                                </p>
                            </header>

                            <form
                                ref={formRef}
                                className="job-apply-form"
                                onSubmit={handleSubmit}
                                noValidate
                            >
                                <fieldset className="job-apply-group">
                                    <legend>Personal details</legend>

                                    <div className="job-apply-fields">
                                        <TextField
                                            {...textFieldProps("fullName")}
                                            label="Full name"
                                            autoComplete="name"
                                            slotProps={{
                                                htmlInput: {
                                                    maxLength: 100,
                                                },
                                            }}
                                        />

                                        <TextField
                                            {...textFieldProps("email")}
                                            label="Email address"
                                            type="email"
                                            autoComplete="email"
                                            slotProps={{
                                                htmlInput: {
                                                    maxLength: 254,
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
                                    </div>
                                </fieldset>

                                <fieldset className="job-apply-group">
                                    <legend>Professional details</legend>

                                    <div className="job-apply-fields">
                                        <TextField
                                            {...textFieldProps("qualification")}
                                            label="Highest qualification"
                                            select
                                        >
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
                                            {...textFieldProps("experience")}
                                            label="Total experience"
                                            select
                                        >
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
                                                    skills: selectedSkills,
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
                                    <legend>Resume *</legend>

                                    <div
                                        className={`job-apply-upload ${
                                            errors.resume ? "is-error" : ""
                                        }`}
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
                                                    : "Add your latest resume"}
                                            </h3>

                                            <p id="resume-help">
                                                {resume
                                                    ? `${(
                                                          resume.size / 1024
                                                      ).toFixed(0)} KB · Ready for review`
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
                                                    : "Choose file"}
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
                                        Your form passed the frontend checks.
                                        No application has been submitted.
                                        Submission will work after the backend
                                        is connected.
                                    </Alert>
                                )}

                                <div className="job-apply-submit-row">
                                    <p>
                                        Review your information before
                                        submitting your application.
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
                                <p className="website-section-label">
                                    YOU’RE APPLYING FOR
                                </p>

                                <p className="rms-job-company">
                                    {job.company}
                                </p>

                                <h2 id="application-job-title">
                                    {job.title}
                                </h2>

                                <div className="rms-job-tags">
                                    <span>{job.employmentType}</span>
                                    <span>{job.workMode}</span>
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
                                        <dd>{job.salary}</dd>
                                    </div>
                                </dl>

                                <Link
                                    to={jobPath}
                                    className="job-apply-details-link"
                                >
                                    Review job description
                                    <i
                                        className="fa-solid fa-arrow-right"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </div>

                            <div className="job-apply-tip">
                                <i
                                    className="fa-regular fa-lightbulb"
                                    aria-hidden="true"
                                />

                                <div>
                                    <h3>Make your application count.</h3>
                                    <p>
                                        Keep your resume up to date and
                                        highlight skills relevant to this role.
                                    </p>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default function JobApply({ jobs = demoJobs, user = null }) {
    const { id } = useParams();

    const job = Array.isArray(jobs)
        ? jobs.find((item) => String(item._id || item.id) === id)
        : null;

    if (!job) {
        return (
            <section className="website-section website-shell">
                <div className="rms-jobs-empty">
                    <h1 className="website-section-title">
                        Position not found.
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