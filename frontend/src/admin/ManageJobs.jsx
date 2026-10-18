import { useRef, useState } from "react";
import {
    Alert,
    Button,
    Chip,
    FormControlLabel,
    MenuItem,
    Switch,
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

const STORAGE_KEY = "rms-client-jobs-v1";

const JOB_TYPES = [
    "Full Time",
    "Part Time",
    "Contract",
    "Internship",
];

const WORK_MODES = ["On-site", "Hybrid", "Remote"];
const JOB_STATUSES = ["Draft", "Published", "Closed"];

const EMPTY_FORM = {
    company: "",
    title: "",
    department: "",
    location: "",
    type: "Full Time",
    mode: "On-site",
    experience: "",
    salary: "",
    qualification: "",
    skills: "",
    description: "",
    requirements: "",
    status: "Draft",
    featured: false,
};

const STATUS_COLORS = {
    Draft: "default",
    Published: "success",
    Closed: "error",
};

const STATUS_DESCRIPTIONS = {
    Draft:
        "Keep this job unpublished while you prepare the details.",
    Published:
        "This job stays open until you manually change its status.",
    Closed:
        "Stop new applications while retaining the job and its existing applications.",
};

// Only retain supported form fields.
// Old local records may still contain a deadline; it is ignored.
function getFormValues(source = {}) {
    return Object.fromEntries(
        Object.entries(EMPTY_FORM).map(([key, fallback]) => [
            key,
            typeof source[key] === typeof fallback
                ? source[key]
                : fallback,
        ])
    );
}

function loadJobs() {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        if (!stored) return { jobs: [], error: "" };

        const parsed = JSON.parse(stored);

        const valid =
            Array.isArray(parsed) &&
            parsed.every(
                (job) =>
                    job &&
                    typeof job.id === "string" &&
                    typeof job.company === "string" &&
                    typeof job.title === "string" &&
                    JOB_STATUSES.includes(job.status)
            );

        if (!valid) throw new Error("Invalid job data");

        return {
            jobs: parsed.map((job) => ({
                ...getFormValues(job),
                id: job.id,
                openingType: "client",
                createdAt:
                    typeof job.createdAt === "string"
                        ? job.createdAt
                        : "",
                updatedAt:
                    typeof job.updatedAt === "string"
                        ? job.updatedAt
                        : "",
            })),
            error: "",
        };
    } catch {
        return {
            jobs: [],
            error:
                "Saved jobs could not be loaded. Saving is disabled to " +
                "avoid overwriting existing data. Check browser storage and reload.",
        };
    }
}

function validateJob(form) {
    const errors = {};

    if (!form.company.trim()) {
        errors.company = "Enter the company name.";
    }

    if (!form.title.trim()) {
        errors.title = "Enter the job title.";
    }

    if (!JOB_TYPES.includes(form.type)) {
        errors.type = "Select a valid job type.";
    }

    if (!WORK_MODES.includes(form.mode)) {
        errors.mode = "Select a valid work mode.";
    }

    if (!JOB_STATUSES.includes(form.status)) {
        errors.status = "Select a valid status.";
    }

    if (form.status === "Published") {
        const requiredFields = {
            department: "Enter the department.",
            location: "Enter the location or remote hiring region.",
            experience: "Enter the experience requirement.",
            qualification: "Enter the qualification requirement.",
            skills: "Enter the required skills.",
            description: "Enter the job description.",
            requirements: "Enter the job requirements.",
        };

        Object.entries(requiredFields).forEach(([field, message]) => {
            if (!form[field].trim()) {
                errors[field] = message;
            }
        });
    }

    return errors;
}

function getInitials(company) {
    return (
        company
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word.charAt(0))
            .join("")
            .toUpperCase() || "CO"
    );
}

function FormSection({ number, title, description, children }) {
    return (
        <section className="mj-form-section">
            <div className="mj-section-heading">
                <span className="mj-section-number" aria-hidden="true">
                    {number}
                </span>

                <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                </div>
            </div>

            {children}
        </section>
    );
}

function ManageJobs() {
    const [initialData] = useState(loadJobs);
    const [jobs, setJobs] = useState(initialData.jobs);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [errors, setErrors] = useState({});
    const [editingId, setEditingId] = useState(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const formRef = useRef(null);
    const companyInputRef = useRef(null);

    const isEditing = editingId !== null;
    const publishing = form.status === "Published";

    const counts = jobs.reduce(
        (result, job) => {
            result.total += 1;
            result[job.status] += 1;
            return result;
        },
        { total: 0, Draft: 0, Published: 0, Closed: 0 }
    );

    const metrics = [
        {
            label: "Total jobs",
            value: counts.total,
            detail: "All client opportunities",
            icon: "fa-solid fa-briefcase",
            tone: "blue",
        },
        {
            label: "Published",
            value: counts.Published,
            detail: "Open for applications",
            icon: "fa-solid fa-circle-check",
            tone: "green",
        },
        {
            label: "Drafts",
            value: counts.Draft,
            detail: "Not yet published",
            icon: "fa-regular fa-file-lines",
            tone: "amber",
        },
        {
            label: "Closed",
            value: counts.Closed,
            detail: "Hiring currently stopped",
            icon: "fa-solid fa-lock",
            tone: "red",
        },
    ];

    const query = search.trim().toLowerCase();

    const filteredJobs = jobs
        .filter((job) => {
            const matchesSearch = [
                job.title,
                job.company,
                job.department,
                job.location,
            ].some((value) => value.toLowerCase().includes(query));

            const matchesStatus =
                statusFilter === "All" || job.status === statusFilter;

            return matchesSearch && matchesStatus;
        })
        .sort((first, second) =>
            second.createdAt.localeCompare(first.createdAt)
        );

    const visibleJobs = filteredJobs.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setErrors((previous) =>
            name === "status"
                ? {}
                : { ...previous, [name]: "" }
        );
    }

    function resetForm() {
        setForm({ ...EMPTY_FORM });
        setErrors({});
        setEditingId(null);
    }

    function focusForm() {
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        formRef.current?.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
        });

        companyInputRef.current?.focus({ preventScroll: true });
    }

    function handleNewJob() {
        resetForm();
        focusForm();
    }

    function handleEdit(job) {
        setForm(getFormValues(job));
        setEditingId(job.id);
        setErrors({});
        focusForm();
    }

    function handleSubmit(event) {
        event.preventDefault();

        if (initialData.error) return;

        const validationErrors = validateJob(form);

        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            toast.error("Please check the highlighted fields.");
            return;
        }

        const existingJob = isEditing
            ? jobs.find((job) => job.id === editingId)
            : null;

        if (isEditing && !existingJob) {
            toast.error("Job not found. Reload and try again.");
            return;
        }

        const normalizedForm = Object.fromEntries(
            Object.entries(form).map(([key, value]) => [
                key,
                typeof value === "string" ? value.trim() : value,
            ])
        );

        let nextJobs;

        try {
            const now = new Date().toISOString();

            const savedJob = {
                ...normalizedForm,
                id: existingJob?.id ?? window.crypto.randomUUID(),
                openingType: "client",
                createdAt: existingJob?.createdAt || now,
                updatedAt: now,
            };

            nextJobs = isEditing
                ? jobs.map((job) =>
                      job.id === editingId ? savedJob : job
                  )
                : [savedJob, ...jobs];

            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(nextJobs)
            );
        } catch {
            toast.error(
                "Could not save the job. Check browser storage and try again."
            );
            return;
        }

        setJobs(nextJobs);
        setSearch("");
        setStatusFilter("All");
        setPage(0);

        toast.success(
            isEditing
                ? "Job updated successfully."
                : "Job created successfully."
        );

        resetForm();
    }

    function field(name, label, options = {}) {
        return {
            name,
            label,
            value: form[name],
            onChange: handleChange,
            fullWidth: true,
            size: "small",
            variant: "outlined",
            ...options,
            error: Boolean(errors[name]),
            helperText: errors[name] || options.helperText,
        };
    }

    return (
        <div className="manage-jobs">
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">
                        RECRUITMENT WORKSPACE
                    </span>

                    <h1>Manage Jobs</h1>

                    <p>
                        Create opportunities. Keep your hiring organised.
                    </p>
                </div>

            </header>

            {initialData.error && (
                <Alert severity="error" className="mj-alert">
                    {initialData.error}
                </Alert>
            )}

            <section className="mj-metrics" aria-label="Job overview">
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
                aria-labelledby="mj-form-title"
            >
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span className="mj-header-icon" aria-hidden="true">
                            <i
                                className={
                                    isEditing
                                        ? "fa-regular fa-pen-to-square"
                                        : "fa-solid fa-plus"
                                }
                            />
                        </span>

                        <div>
                            <h2 id="mj-form-title">
                                {isEditing ? "Edit job details" : "Create a job"}
                            </h2>

                            <p>
                                {isEditing
                                    ? "Update the role or change its availability."
                                    : "Start with the basics and publish when ready."}
                            </p>
                        </div>
                    </div>

                    <Chip
                        label={isEditing ? "Editing" : "New opportunity"}
                        color={isEditing ? "warning" : "primary"}
                        size="small"
                        variant="outlined"
                    />
                </header>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="mj-form-body">
                        <FormSection
                            number="01"
                            title="Company & position"
                            description="Tell candidates who is hiring and where."
                        >
                            <div className="mj-form-grid">
                                <TextField
                                    {...field("company", "Company name", {
                                        required: true,
                                        inputRef: companyInputRef,
                                        placeholder: "e.g. Acme Technologies",
                                    })}
                                />

                                <TextField
                                    {...field("title", "Job title", {
                                        required: true,
                                        placeholder: "e.g. MERN Stack Developer",
                                    })}
                                />

                                <TextField
                                    {...field("department", "Department", {
                                        required: publishing,
                                        placeholder: "e.g. Engineering",
                                    })}
                                />

                                <TextField
                                    {...field("location", "Location", {
                                        required: publishing,
                                        placeholder: "e.g. Bengaluru or Remote — India",
                                    })}
                                />

                                <TextField
                                    {...field("type", "Job type")}
                                    select
                                >
                                    {JOB_TYPES.map((type) => (
                                        <MenuItem key={type} value={type}>
                                            {type}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    {...field("mode", "Work mode")}
                                    select
                                >
                                    {WORK_MODES.map((mode) => (
                                        <MenuItem key={mode} value={mode}>
                                            {mode}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </div>
                        </FormSection>

                        <FormSection
                            number="02"
                            title="Candidate requirements"
                            description="Define the experience, skills and compensation."
                        >
                            <div className="mj-form-grid">
                                <TextField
                                    {...field("experience", "Experience", {
                                        required: publishing,
                                        placeholder: "e.g. 2–4 years",
                                    })}
                                />

                                <TextField
                                    {...field("salary", "Salary", {
                                        placeholder: "e.g. ₹6–10 LPA",
                                        helperText:
                                            "Optional. Leave blank if undisclosed.",
                                    })}
                                />

                                <TextField
                                    {...field(
                                        "qualification",
                                        "Qualification",
                                        {
                                            required: publishing,
                                            placeholder: "e.g. Any graduate",
                                        }
                                    )}
                                />

                                <TextField
                                    {...field("skills", "Required skills", {
                                        required: publishing,
                                        placeholder: "React, Node.js, MongoDB",
                                    })}
                                />
                            </div>
                        </FormSection>

                        <FormSection
                            number="03"
                            title="About the role"
                            description="Write clear responsibilities and requirements."
                        >
                            <div className="mj-description-grid">
                                <TextField
                                    {...field(
                                        "description",
                                        "Job description",
                                        {
                                            required: publishing,
                                            placeholder:
                                                "Describe the role and daily responsibilities.",
                                        }
                                    )}
                                    multiline
                                    minRows={5}
                                />

                                <TextField
                                    {...field(
                                        "requirements",
                                        "Job requirements",
                                        {
                                            required: publishing,
                                            placeholder:
                                                "Describe the abilities and experience needed.",
                                        }
                                    )}
                                    multiline
                                    minRows={5}
                                />
                            </div>
                        </FormSection>

                        <FormSection
                            number="04"
                            title="Visibility & status"
                            description="Control when the job is open for applications."
                        >
                            <div className="mj-publish-grid">
                                <TextField
                                    {...field("status", "Job status")}
                                    select
                                >
                                    {JOB_STATUSES.map((status) => (
                                        <MenuItem key={status} value={status}>
                                            {status}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <div className="mj-featured-option">
                                    <div>
                                        <span className="mj-featured-heading">
                                            <i
                                                className="fa-regular fa-star"
                                                aria-hidden="true"
                                            />
                                            Homepage visibility
                                        </span>

                                        <p>
                                            Highlight this job when published.
                                        </p>
                                    </div>

                                    <FormControlLabel
                                        label="Featured"
                                        labelPlacement="start"
                                        control={
                                            <Switch
                                                name="featured"
                                                checked={form.featured}
                                                onChange={(event) =>
                                                    setForm((previous) => ({
                                                        ...previous,
                                                        featured:
                                                            event.target.checked,
                                                    }))
                                                }
                                            />
                                        }
                                    />
                                </div>
                            </div>

                            <div className="mj-status-note" role="status">
                                <i
                                    className="fa-solid fa-circle-info"
                                    aria-hidden="true"
                                />
                                <p>{STATUS_DESCRIPTIONS[form.status]}</p>
                            </div>
                        </FormSection>
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
                                    : publishing
                                      ? "Publish job"
                                      : form.status === "Closed"
                                        ? "Save closed job"
                                        : "Save draft"}
                            </Button>
                        </div>
                    </footer>
                </form>
            </section>

            <section
                className="mj-card mj-list-card"
                aria-labelledby="mj-list-title"
            >
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span className="mj-header-icon" aria-hidden="true">
                            <i className="fa-solid fa-list" />
                        </span>

                        <div>
                            <h2 id="mj-list-title">Job listings</h2>
                            <p>
                                Manage your published, draft and closed roles.
                            </p>
                        </div>
                    </div>

                    <span className="mj-result-count">
                        {filteredJobs.length} of {jobs.length} jobs
                    </span>
                </header>

                <div className="mj-table-toolbar">
                    <TextField
                        label="Search jobs"
                        placeholder="Title, company, department or location"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                        size="small"
                        fullWidth
                    />

                    <TextField
                        label="Filter by status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                        size="small"
                        select
                        fullWidth
                    >
                        <MenuItem value="All">All statuses</MenuItem>

                        {JOB_STATUSES.map((status) => (
                            <MenuItem key={status} value={status}>
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>
                </div>

                <TableContainer>
                    <Table className="mj-table" aria-label="Client jobs">
                        <TableHead>
                            <TableRow>
                                <TableCell>Job & company</TableCell>
                                <TableCell>Location & work</TableCell>
                                <TableCell>Experience & salary</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleJobs.map((job) => (
                                <TableRow
                                    key={job.id}
                                    hover
                                    selected={editingId === job.id}
                                >
                                    <TableCell>
                                        <div className="mj-job-cell">
                                            <span
                                                className="mj-company-avatar"
                                                aria-hidden="true"
                                            >
                                                {getInitials(job.company)}
                                            </span>

                                            <div>
                                                <strong>{job.title}</strong>
                                                <p>{job.company}</p>

                                                <div className="mj-job-tags">
                                                    {job.department && (
                                                        <span>
                                                            {job.department}
                                                        </span>
                                                    )}

                                                    {job.featured && (
                                                        <span className="mj-featured-tag">
                                                            <i
                                                                className="fa-solid fa-star"
                                                                aria-hidden="true"
                                                            />
                                                            Featured
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="mj-cell-primary">
                                            {job.location || "Not set"}
                                        </span>

                                        <span className="mj-cell-secondary">
                                            {job.type} · {job.mode}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <span className="mj-cell-primary">
                                            {job.experience || "Not set"}
                                        </span>

                                        <span className="mj-cell-secondary">
                                            {job.salary || "Not disclosed"}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <Chip
                                            label={job.status}
                                            color={STATUS_COLORS[job.status]}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            type="button"
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleEdit(job)}
                                            aria-label={`Edit ${job.title} at ${job.company}`}
                                            startIcon={
                                                <i
                                                    className="fa-regular fa-pen-to-square"
                                                    aria-hidden="true"
                                                />
                                            }
                                        >
                                            Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visibleJobs.length && (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <div className="mj-empty">
                                            <span aria-hidden="true">
                                                <i className="fa-solid fa-briefcase" />
                                            </span>

                                            <h3>
                                                {jobs.length
                                                    ? "No matching jobs"
                                                    : "Create your first opportunity"}
                                            </h3>

                                            <p>
                                                {jobs.length
                                                    ? "Try another search or status filter."
                                                    : "Jobs you save using the form will appear here."}
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
                    count={filteredJobs.length}
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
        </div>
    );
}

export default ManageJobs;