import { getErrorMessage } from "../utils/dataFormat";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Chip, FormControlLabel, MenuItem, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField } from "@mui/material";
import { toast } from "react-toastify";

import api from "../services/api";
import { getExperienceRange } from "../utils/dataFormat";

// ================== JOB CONFIGURATION ==================
const JOB_TYPES = ["Full Time", "Part Time", "Contract", "Internship"];
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
    openings: "",
    qualification: "",
    skills: "",
    shortDescription: "",
    description: "",
    requirements: "",
    status: "Draft",
    featured: false,
};

const FIELD_LIMITS = {
    company: 150,
    title: 150,
    department: 100,
    location: 200,
    experience: 100,
    salary: 100,
    qualification: 500,
    skills: 10000,
    shortDescription: 150,
    description: 20000,
    requirements: 10000,
};

const STATUS_COLORS = {
    Draft: "default",
    Published: "success",
    Closed: "error",
};

const STATUS_DESCRIPTIONS = {
    Draft: "Keep this job unpublished while you prepare the details.",
    Published: "This job stays open until you manually change its status.",
    Closed: "Stop new applications while retaining the job and its existing applications.",
};

// ================== FORM VALUES ==================
// Convert API values into editable input values.
function getFormValues(source = {}) {
    return Object.fromEntries(
        Object.entries(EMPTY_FORM).map(([key, fallback]) => {
            if (key === "openings") {
                return [key, Number.isInteger(source[key]) ? String(source[key]) : ""];
            }

            if (key === "skills" && Array.isArray(source[key])) {
                return [key, source[key].join(", ")];
            }

            if (key === "requirements" && Array.isArray(source[key])) {
                return [key, source[key].join("\n")];
            }

            return [key, typeof source[key] === typeof fallback ? source[key] : fallback];
        })
    );
}

// ================== FORM VALIDATION ==================
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

    Object.entries(FIELD_LIMITS).forEach(([name, limit]) => {
        if (form[name].trim().length > limit) {
            errors[name] = `Use no more than ${limit} characters.`;
        }
    });

    const openings = form.openings.trim();

    if (openings && (!/^\d+$/.test(openings) || Number(openings) < 1 || Number(openings) > 10000)) {
        errors.openings = "Enter a whole number between 1 and 10,000.";
    }

    const skills = [
        ...new Set(
            form.skills
                .split(/[,\n]/)
                .map((skill) => skill.trim())
                .filter(Boolean)
        ),
    ];

    if (skills.length > 50) {
        errors.skills = "A maximum of 50 skills is allowed.";
    }

    if (skills.some((skill) => skill.length > 100)) {
        errors.skills = "Each skill cannot exceed 100 characters.";
    }

    if (form.status === "Published") {
        const requiredFields = {
            department: "Enter the department.",
            location: "Enter the location or remote hiring region.",
            experience: "Enter the experience requirement.",
            qualification: "Enter the qualification requirement.",
            skills: "Enter the required skills.",
            shortDescription: "Enter a short description for job cards.",
            description: "Enter the full job description.",
            requirements: "Enter the job requirements.",
        };

        Object.entries(requiredFields).forEach(([name, message]) => {
            if (!form[name].trim()) {
                errors[name] = message;
            }
        });

        if (!skills.length) {
            errors.skills = "Add at least one skill before publishing.";
        }

        if (form.experience.trim()) {
            const range = getExperienceRange(form.experience);

            if (
                !range ||
                !Number.isFinite(range.min) ||
                (range.max !== Infinity && !Number.isFinite(range.max))
            ) {
                errors.experience = "Use Fresher, 2 years, 2–4 years or 5+ years.";
            }
        }
    }

    return errors;
}

// ================== RESPONSE HELPERS ==================

function getInitials(company = "") {
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

// ================== FORM SECTION ==================
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

// ================== MANAGE JOBS ==================
function ManageJobs() {
    const [jobs, setJobs] = useState([]);
    const [counts, setCounts] = useState(null);
    const [total, setTotal] = useState(0);

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [errors, setErrors] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [editingVersion, setEditingVersion] = useState(null);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [listError, setListError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    const formRef = useRef(null);
    const companyInputRef = useRef(null);
    const listRequestRef = useRef(null);
    const editRequestRef = useRef(null);
    const busyRef = useRef(false);
    const mountedRef = useRef(false);

    const isEditing = editingId !== null;
    const publishing = form.status === "Published";
    const formBusy = saving || editLoading;

    // ================== REQUEST CLEANUP ==================
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            listRequestRef.current?.abort();
            editRequestRef.current?.abort();
        };
    }, []);

    // ================== SEARCH DEBOUNCE ==================
    // Wait briefly before requesting results while typing.
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(0);
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search]);

    // ================== FETCH JOBS ==================
    useEffect(() => {
        const controller = new AbortController();

        listRequestRef.current = controller;

        async function fetchJobs() {
            setLoading(true);
            setListError("");

            const params = {
                page: page + 1,
                limit: rowsPerPage,
            };

            if (debouncedSearch) {
                params.search = debouncedSearch;
            }

            if (statusFilter !== "All") {
                params.status = statusFilter;
            }

            try {
                const { data } = await api.get("/jobs/admin", {
                    params,
                    signal: controller.signal,
                });

                if (controller.signal.aborted) return;

                const lastPage = Math.max(data.pagination.totalPages - 1, 0);

                if (page > lastPage) {
                    setPage(lastPage);
                    return;
                }

                setJobs(
                    data.jobs.map((job) => ({
                        ...job,
                        id: String(job.id || job._id),
                    }))
                );

                setCounts(data.counts);
                setTotal(data.pagination.total);
            } catch (error) {
                if (controller.signal.aborted) return;

                setJobs([]);
                setListError(getErrorMessage(error, "Jobs could not be loaded. Please try again."));
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchJobs();

        return () => controller.abort();
    }, [debouncedSearch, statusFilter, page, rowsPerPage, refreshKey]);

    // ================== OVERVIEW CARDS ==================
    const metrics = [
        {
            label: "Total jobs",
            value: counts?.total,
            detail: "All client opportunities",
            icon: "fa-solid fa-briefcase",
            tone: "blue",
        },
        {
            label: "Published",
            value: counts?.published,
            detail: "Open for applications",
            icon: "fa-solid fa-circle-check",
            tone: "green",
        },
        {
            label: "Drafts",
            value: counts?.draft,
            detail: "Not yet published",
            icon: "fa-regular fa-file-lines",
            tone: "amber",
        },
        {
            label: "Closed",
            value: counts?.closed,
            detail: "Hiring currently stopped",
            icon: "fa-solid fa-lock",
            tone: "red",
        },
    ];

    // ================== FORM HANDLERS ==================
    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setErrors((previous) => (name === "status" ? {} : { ...previous, [name]: "" }));
    }

    function resetForm() {
        setForm({ ...EMPTY_FORM });
        setErrors({});
        setEditingId(null);
        setEditingVersion(null);
    }

    function focusForm() {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        formRef.current?.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
        });
    }

    // Focus after edit inputs become enabled.
    useEffect(() => {
        if (editingId && !editLoading) {
            companyInputRef.current?.focus({ preventScroll: true });
        }
    }, [editingId, editLoading]);

    // ================== FETCH JOB FOR EDITING ==================
    async function handleEdit(job) {
        if (busyRef.current) return;

        busyRef.current = true;
        setEditLoading(true);

        const controller = new AbortController();
        editRequestRef.current = controller;

        try {
            const { data } = await api.get(`/jobs/admin/${encodeURIComponent(job.id)}`, {
                signal: controller.signal,
            });

            if (controller.signal.aborted || !mountedRef.current) return;

            setForm(getFormValues(data.job));
            setEditingVersion(data.job.version);
            setEditingId(String(data.job.id || data.job._id));
            setErrors({});
            focusForm();
        } catch (error) {
            if (controller.signal.aborted || !mountedRef.current) return;

            toast.error(getErrorMessage(error, "Job details could not be loaded."));
        } finally {
            busyRef.current = false;

            if (mountedRef.current) {
                setEditLoading(false);
            }
        }
    }

    // ================== CREATE OR UPDATE JOB ==================
    async function handleSubmit(event) {
        event.preventDefault();

        if (busyRef.current) return;

        const validationErrors = validateJob(form);

        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            toast.error("Please check the highlighted fields.");
            return;
        }

        const payload = Object.fromEntries(
            Object.entries(form).map(([key, value]) => [
                key,
                typeof value === "string" ? value.trim() : value,
            ])
        );

        payload.openings = payload.openings ? Number(payload.openings) : null;

        if (isEditing) payload.version = editingVersion;

        busyRef.current = true;
        setSaving(true);

        try {
            const response = isEditing
                ? await api.put(`/jobs/admin/${encodeURIComponent(editingId)}`, payload)
                : await api.post("/jobs/admin", payload);

            if (!mountedRef.current) return;

            toast.success(
                response.data.message ||
                    (isEditing ? "Job updated successfully." : "Job created successfully.")
            );

            // Cancel an older list request before refreshing saved data.
            listRequestRef.current?.abort();
            setLoading(true);
            resetForm();
            setPage(0);
            setRefreshKey((previous) => previous + 1);
        } catch (error) {
            if (!mountedRef.current) return;

            const fallback = error.response
                ? "The job could not be saved. Please try again."
                : "Save confirmation was not received. Refresh the job list before retrying to check whether it was saved.";

            toast.error(getErrorMessage(error, fallback));
        } finally {
            busyRef.current = false;

            if (mountedRef.current) {
                setSaving(false);
            }
        }
    }

    // ================== SHARED INPUT PROPS ==================
    function field(name, label, options = {}) {
        return {
            name,
            label,
            value: form[name],
            onChange: handleChange,
            fullWidth: true,
            size: "small",
            variant: "outlined",
            disabled: formBusy,
            slotProps: {
                htmlInput: {
                    maxLength: FIELD_LIMITS[name],
                },
            },
            ...options,
            error: Boolean(errors[name]),
            helperText: errors[name] || options.helperText,
        };
    }

    const submitLabel = saving
        ? "Saving..."
        : isEditing
          ? "Save changes"
          : publishing
            ? "Publish job"
            : form.status === "Closed"
              ? "Save closed job"
              : "Save draft";

    return (
        <div className="manage-jobs">
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">RECRUITMENT WORKSPACE</span>
                    <h1>Manage Jobs</h1>
                    <p>Create opportunities. Keep your hiring organised.</p>
                </div>
            </header>

            <section className="mj-metrics" aria-label="Job overview">
                {metrics.map((metric) => (
                    <article key={metric.label} className={`mj-metric mj-tone-${metric.tone}`}>
                        <div className="mj-metric-top">
                            <span className="mj-metric-label">{metric.label}</span>

                            <span className="mj-metric-icon" aria-hidden="true">
                                <i className={metric.icon} />
                            </span>
                        </div>

                        <strong>{listError ? "—" : (metric.value ?? "—")}</strong>
                        <p>{metric.detail}</p>
                    </article>
                ))}
            </section>

            <section
                ref={formRef}
                className="mj-card mj-form-card"
                aria-labelledby="mj-form-title"
                aria-busy={formBusy}
            >
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span className="mj-header-icon" aria-hidden="true">
                            <i
                                className={
                                    isEditing ? "fa-regular fa-pen-to-square" : "fa-solid fa-plus"
                                }
                            />
                        </span>

                        <div>
                            <h2 id="mj-form-title">
                                {isEditing ? "Edit job details" : "Create a job"}
                            </h2>

                            <p>
                                {editLoading
                                    ? "Loading the latest job details..."
                                    : isEditing
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
                                    {...field("type", "Job type", {
                                        required: true,
                                    })}
                                    select
                                >
                                    {JOB_TYPES.map((type) => (
                                        <MenuItem key={type} value={type}>
                                            {type}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    {...field("mode", "Work mode", {
                                        required: true,
                                    })}
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
                                        placeholder: "e.g. Fresher or 2–4 years",
                                    })}
                                />

                                <TextField
                                    {...field("openings", "Openings (optional)", {
                                        helperText: "Leave blank if unspecified.",
                                    })}
                                    type="number"
                                    slotProps={{
                                        htmlInput: {
                                            min: 1,
                                            max: 10000,
                                            step: 1,
                                        },
                                    }}
                                />

                                <TextField
                                    {...field("salary", "Salary (optional)", {
                                        placeholder: "e.g. ₹6–10 LPA",
                                        helperText: "Leave blank if undisclosed.",
                                    })}
                                />

                                <TextField
                                    {...field("qualification", "Qualification", {
                                        required: publishing,
                                        placeholder: "e.g. Any graduate",
                                    })}
                                />

                                <TextField
                                    {...field("skills", "Required skills", {
                                        required: publishing,
                                        placeholder: "React, Node.js, MongoDB",
                                        helperText: "Separate skills with commas.",
                                    })}
                                />
                            </div>
                        </FormSection>

                        <FormSection
                            number="03"
                            title="About the role"
                            description="Add a short card summary and complete job details."
                        >
                            <div className="mj-description-grid">
                                <TextField
                                    {...field("shortDescription", "Short description", {
                                        required: publishing,
                                        placeholder:
                                            "Write a brief summary for homepage and job cards.",
                                        helperText: `${form.shortDescription.length}/150 characters. Used on job cards.`,
                                    })}
                                    multiline
                                    minRows={3}
                                />

                                <TextField
                                    {...field("description", "Full job description", {
                                        required: publishing,
                                        placeholder:
                                            "Describe the role and daily responsibilities.",
                                        helperText: "Displayed on the Job Details page.",
                                    })}
                                    multiline
                                    minRows={5}
                                />

                                <TextField
                                    {...field("requirements", "Job requirements", {
                                        required: publishing,
                                        placeholder:
                                            "Describe the abilities and experience needed.",
                                    })}
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
                                    {...field("status", "Job status", {
                                        required: true,
                                    })}
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
                                            <i className="fa-regular fa-star" aria-hidden="true" />
                                            Homepage visibility
                                        </span>

                                        <p>Highlight this job when published.</p>
                                    </div>

                                    <FormControlLabel
                                        label="Featured"
                                        labelPlacement="start"
                                        control={
                                            <Switch
                                                name="featured"
                                                checked={form.featured}
                                                disabled={formBusy}
                                                onChange={(event) => {
                                                    const checked = event.target.checked;

                                                    setForm((previous) => ({
                                                        ...previous,
                                                        featured: checked,
                                                    }));
                                                }}
                                            />
                                        }
                                    />
                                </div>
                            </div>

                            <div className="mj-status-note" role="status">
                                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                <p>{STATUS_DESCRIPTIONS[form.status]}</p>
                            </div>
                        </FormSection>
                    </div>

                    <footer className="mj-form-footer">
                        <p>
                            <span>*</span> Required fields. Additional fields become required when
                            publishing.
                        </p>

                        <div className="mj-form-actions">
                            <Button
                                type="button"
                                variant="outlined"
                                onClick={resetForm}
                                disabled={formBusy}
                            >
                                {isEditing ? "Cancel edit" : "Reset"}
                            </Button>

                            <Button
                                type="submit"
                                variant="contained"
                                disableElevation
                                disabled={formBusy}
                                startIcon={
                                    <i className="fa-regular fa-floppy-disk" aria-hidden="true" />
                                }
                            >
                                {submitLabel}
                            </Button>
                        </div>
                    </footer>
                </form>
            </section>

            <section
                className="mj-card mj-list-card"
                aria-labelledby="mj-list-title"
                aria-busy={loading}
            >
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span className="mj-header-icon" aria-hidden="true">
                            <i className="fa-solid fa-list" />
                        </span>

                        <div>
                            <h2 id="mj-list-title">Job listings</h2>
                            <p>Manage your published, draft and closed roles.</p>
                        </div>
                    </div>

                    <span className="mj-result-count">
                        {loading
                            ? "Loading..."
                            : listError
                              ? "Unavailable"
                              : `${total} matching jobs`}
                    </span>

                    <Button
                        type="button"
                        variant="outlined"
                        size="small"
                        disabled={loading || formBusy}
                        onClick={() => setRefreshKey((previous) => previous + 1)}
                    >
                        Refresh
                    </Button>
                </header>

                {listError && (
                    <Alert severity="error" className="mj-alert">
                        {listError}
                    </Alert>
                )}

                <div className="mj-table-toolbar">
                    <TextField
                        label="Search jobs"
                        placeholder="Title, company, department or location"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        slotProps={{ htmlInput: { maxLength: 200 } }}
                        disabled={formBusy}
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
                        disabled={formBusy}
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
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <p role="status">Loading jobs...</p>
                                    </TableCell>
                                </TableRow>
                            )}

                            {!loading && listError && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <p>Use Refresh to load the jobs again.</p>
                                    </TableCell>
                                </TableRow>
                            )}

                            {!loading &&
                                !listError &&
                                jobs.map((job) => (
                                    <TableRow key={job.id} hover selected={editingId === job.id}>
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
                                                            <span>{job.department}</span>
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
                                                color={STATUS_COLORS[job.status] || "default"}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>

                                        <TableCell align="right">
                                            <Button
                                                type="button"
                                                size="small"
                                                variant="outlined"
                                                disabled={formBusy}
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

                            {!loading && !listError && !jobs.length && (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <div className="mj-empty">
                                            <span aria-hidden="true">
                                                <i className="fa-solid fa-briefcase" />
                                            </span>

                                            <h3>
                                                {counts?.total
                                                    ? "No matching jobs"
                                                    : "Create your first opportunity"}
                                            </h3>

                                            <p>
                                                {counts?.total
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
                    count={total}
                    page={page}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25]}
                    disabled={loading || formBusy || Boolean(listError)}
                />
            </section>
        </div>
    );
}

export default ManageJobs;
