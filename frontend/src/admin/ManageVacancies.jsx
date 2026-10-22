import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Button,
    Chip,
    MenuItem,
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

import api from "../services/api";

// ================== VACANCY CONFIGURATION ==================
const JOB_TYPES = ["Full Time", "Part Time", "Contract", "Internship"];
const WORK_MODES = ["On-site", "Hybrid", "Remote"];
const STATUSES = ["Draft", "Published", "Closed"];

const EMPTY_FORM = {
    title: "",
    department: "",
    type: "",
    mode: "On-site",
    experience: "",
    location: "",
    description: "",
    status: "Draft",
};

const FIELD_LIMITS = {
    title: 150,
    department: 100,
    experience: 100,
    location: 200,
    description: 20000,
};

const FIELD_LABELS = {
    title: "Vacancy title",
    department: "Department",
    experience: "Experience",
    location: "Location",
    description: "Vacancy description",
};

const STATUS_COLORS = {
    Draft: "default",
    Published: "success",
    Closed: "error",
};

const STATUS_DESCRIPTIONS = {
    Draft: "Save an incomplete vacancy and publish it when the details are ready.",
    Published: "This vacancy stays open until you manually close it.",
    Closed: "Stop new applications while keeping the vacancy and existing applications.",
};

// ================== FORM VALUES ==================
// Copy only editable fields into the form.
function getFormValues(source = {}) {
    return Object.fromEntries(
        Object.entries(EMPTY_FORM).map(([key, fallback]) => [
            key,
            typeof source[key] === "string" ? source[key] : fallback,
        ])
    );
}

// ================== RESPONSE FORMATTING ==================
function normalizeVacancy(source) {
    return {
        ...source,
        ...getFormValues(source),
        id: String(source.id || source._id || ""),
    };
}

// ================== ERROR MESSAGE ==================
function getErrorMessage(error, fallback) {
    return error.response?.data?.message || fallback;
}

// ================== FRONTEND VALIDATION ==================
// Backend Joi validation remains authoritative.
function validateVacancy(form) {
    const errors = {};

    if (!form.title.trim()) {
        errors.title = "Enter the vacancy title.";
    }

    if (form.type && !JOB_TYPES.includes(form.type)) {
        errors.type = "Select a valid job type.";
    }

    if (!WORK_MODES.includes(form.mode)) {
        errors.mode = "Select a valid work mode.";
    }

    if (!STATUSES.includes(form.status)) {
        errors.status = "Select a valid status.";
    }

    if (form.status === "Published") {
        if (!JOB_TYPES.includes(form.type)) {
            errors.type = "Select a job type before publishing.";
        }

        const requiredFields = {
            department: "Enter the department.",
            experience: "Enter the required experience.",
            location: "Enter the location or remote hiring region.",
            description: "Enter the vacancy description.",
        };

        Object.entries(requiredFields).forEach(([field, message]) => {
            if (!form[field].trim()) {
                errors[field] = message;
            }
        });
    }

    Object.entries(FIELD_LIMITS).forEach(([field, limit]) => {
        if (form[field].trim().length > limit) {
            errors[field] =
                `${FIELD_LABELS[field]} cannot exceed ${limit} characters.`;
        }
    });

    return errors;
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

// ================== MANAGE VACANCIES ==================
function ManageVacancies() {
    const [vacancies, setVacancies] = useState([]);
    const [counts, setCounts] = useState(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [errors, setErrors] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [revision, setRevision] = useState(0);

    const formRef = useRef(null);
    const titleInputRef = useRef(null);
    const mountedRef = useRef(false);
    const savingRef = useRef(false);
    const editBusyRef = useRef(false);
    const editControllerRef = useRef(null);

    const isEditing = editingId !== null;
    const publishing = form.status === "Published";
    const formBusy = saving || editLoading;
    const hasFilters = Boolean(debouncedSearch) || statusFilter !== "All";

    // ================== COMPONENT LIFECYCLE ==================
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            editControllerRef.current?.abort();
        };
    }, []);

    // ================== SEARCH DEBOUNCE ==================
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(0);
        }, 350);

        return () => window.clearTimeout(timer);
    }, [search]);

    // ================== FETCH VACANCIES ==================
    useEffect(() => {
        const controller = new AbortController();

        async function fetchVacancies() {
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
                const { data } = await api.get("/jobs/admin/vacancies", {
                    params,
                    signal: controller.signal,
                });

                if (controller.signal.aborted) return;

                const lastPage = Math.max(
                    0,
                    data.pagination.totalPages - 1
                );

                if (page > lastPage) {
                    setPage(lastPage);
                    return;
                }

                setVacancies(data.vacancies.map(normalizeVacancy));
                setTotal(data.pagination.total);
                setCounts(data.counts);
            } catch (error) {
                if (controller.signal.aborted) return;

                setVacancies([]);
                setTotal(0);
                setCounts(null);
                setListError(
                    getErrorMessage(
                        error,
                        "Vacancies could not be loaded. Please try again."
                    )
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchVacancies();

        return () => controller.abort();
    }, [
        page,
        rowsPerPage,
        debouncedSearch,
        statusFilter,
        revision,
    ]);

    // ================== OVERVIEW CARDS ==================
    const metrics = [
        {
            label: "Total vacancies",
            value: counts?.total,
            detail: "All internal opportunities",
            icon: "fa-solid fa-building",
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

    // ================== FORM CHANGES ==================
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

    function clearForm() {
        setForm({ ...EMPTY_FORM });
        setErrors({});
        setEditingId(null);
    }

    function resetForm() {
        if (savingRef.current || editBusyRef.current) return;

        clearForm();
    }

    // ================== FORM FOCUS ==================
    function focusForm() {
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        formRef.current?.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
        });

        titleInputRef.current?.focus({ preventScroll: true });
    }

    useEffect(() => {
        if (editingId && !editLoading) {
            focusForm();
        }
    }, [editingId, editLoading]);

    // ================== FETCH EDIT DETAILS ==================
    async function handleEdit(vacancy) {
        if (savingRef.current || editBusyRef.current) return;

        editBusyRef.current = true;
        setEditLoading(true);

        const controller = new AbortController();
        editControllerRef.current = controller;

        try {
            const { data } = await api.get(
                `/jobs/admin/vacancies/${encodeURIComponent(vacancy.id)}`,
                { signal: controller.signal }
            );

            if (controller.signal.aborted || !mountedRef.current) return;

            setForm(getFormValues(data.vacancy));
            setEditingId(String(data.vacancy.id || data.vacancy._id));
            setErrors({});
        } catch (error) {
            if (controller.signal.aborted || !mountedRef.current) return;

            toast.error(
                getErrorMessage(
                    error,
                    "Vacancy details could not be loaded."
                )
            );
        } finally {
            editBusyRef.current = false;

            if (editControllerRef.current === controller) {
                editControllerRef.current = null;
            }

            if (mountedRef.current) {
                setEditLoading(false);
            }
        }
    }

    // ================== CREATE OR UPDATE VACANCY ==================
    async function handleSubmit(event) {
        event.preventDefault();

        if (savingRef.current || editBusyRef.current) return;

        const validationErrors = validateVacancy(form);

        if (Object.keys(validationErrors).length) {
            setErrors(validationErrors);
            toast.error("Please check the highlighted fields.");
            return;
        }

        const payload = Object.fromEntries(
            Object.entries(getFormValues(form)).map(([key, value]) => [
                key,
                value.trim(),
            ])
        );

        savingRef.current = true;
        setSaving(true);

        try {
            const response = isEditing
                ? await api.put(
                      `/jobs/admin/vacancies/${encodeURIComponent(editingId)}`,
                      payload
                  )
                : await api.post("/jobs/admin/vacancies", payload);

            if (!mountedRef.current) return;

            toast.success(
                response.data.message || "Vacancy saved successfully."
            );

            clearForm();
            setSearch("");
            setDebouncedSearch("");
            setStatusFilter("All");
            setPage(0);
            setRevision((value) => value + 1);
        } catch (error) {
            if (!mountedRef.current) return;

            const uncertainResult =
                !error.response || error.response.status >= 500;

            toast.error(
                uncertainResult
                    ? "Save could not be confirmed. Check the refreshed vacancy list before submitting again."
                    : getErrorMessage(error, "Vacancy could not be saved.")
            );

            if (uncertainResult || error.response?.status === 409) {
                setRevision((value) => value + 1);
            }
        } finally {
            savingRef.current = false;

            if (mountedRef.current) {
                setSaving(false);
            }
        }
    }

    // ================== SHARED INPUT PROPERTIES ==================
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
            ...(FIELD_LIMITS[name]
                ? {
                      slotProps: {
                          htmlInput: {
                              maxLength: FIELD_LIMITS[name],
                          },
                      },
                  }
                : {}),
            ...options,
            error: Boolean(errors[name]),
            helperText: errors[name] || options.helperText,
        };
    }

    function optionalLabel(label) {
        return publishing ? label : `${label} (optional)`;
    }

    return (
        <div className="manage-jobs manage-vacancies">
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">INTERNAL RECRUITMENT</span>
                    <h1>Manage Vacancies</h1>
                    <p>Build your team and manage career opportunities.</p>
                </div>

                <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setRevision((value) => value + 1)}
                    disabled={loading || formBusy}
                >
                    {loading ? "Loading..." : "Refresh listings"}
                </Button>
            </header>

            <section className="mj-metrics" aria-label="Vacancy overview">
                {metrics.map((metric) => (
                    <article
                        key={metric.label}
                        className={`mj-metric mj-tone-${metric.tone}`}
                    >
                        <div className="mj-metric-top">
                            <span className="mj-metric-label">{metric.label}</span>

                            <span className="mj-metric-icon" aria-hidden="true">
                                <i className={metric.icon} />
                            </span>
                        </div>

                        <strong>{metric.value ?? "—"}</strong>
                        <p>{metric.detail}</p>
                    </article>
                ))}
            </section>

            <section
                ref={formRef}
                className="mj-card mj-form-card"
                aria-labelledby="mv-form-title"
                aria-busy={formBusy}
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
                            <h2 id="mv-form-title">
                                {isEditing ? "Edit vacancy" : "Create a vacancy"}
                            </h2>

                            <p>
                                {isEditing
                                    ? "Update the details or change the hiring status."
                                    : "Add the details candidates need to explore this role."}
                            </p>
                        </div>
                    </div>

                    <Chip
                        label={
                            editLoading
                                ? "Loading details..."
                                : isEditing
                                  ? "Editing"
                                  : "Internal opportunity"
                        }
                        color={isEditing ? "warning" : "primary"}
                        size="small"
                        variant="outlined"
                    />
                </header>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="mj-form-body">
                        <FormSection
                            number="01"
                            title="Vacancy details"
                            description="Add the information shown on your Careers listing."
                        >
                            <div className="mj-form-grid">
                                <TextField
                                    {...field("title", "Vacancy title", {
                                        required: true,
                                        inputRef: titleInputRef,
                                        placeholder: "e.g. Frontend Developer",
                                    })}
                                />

                                <TextField
                                    {...field(
                                        "department",
                                        optionalLabel("Department"),
                                        {
                                            required: publishing,
                                            placeholder: "e.g. Engineering",
                                        }
                                    )}
                                />

                                <TextField
                                    {...field(
                                        "type",
                                        optionalLabel("Job type"),
                                        {
                                            required: publishing,
                                        }
                                    )}
                                    select
                                >
                                    <MenuItem value="">Not selected</MenuItem>

                                    {JOB_TYPES.map((type) => (
                                        <MenuItem key={type} value={type}>{type}</MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    {...field("mode", "Work mode", {
                                        required: true,
                                    })}
                                    select
                                >
                                    {WORK_MODES.map((mode) => (
                                        <MenuItem key={mode} value={mode}>{mode}</MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    {...field(
                                        "experience",
                                        optionalLabel("Experience"),
                                        {
                                            required: publishing,
                                            placeholder: "e.g. 0–2 years",
                                        }
                                    )}
                                />

                                <TextField
                                    {...field(
                                        "location",
                                        optionalLabel("Location"),
                                        {
                                            required: publishing,
                                            placeholder: "e.g. Bhubaneswar, Odisha",
                                        }
                                    )}
                                />

                                <TextField
                                    {...field("status", "Vacancy status", {
                                        required: true,
                                    })}
                                    select
                                >
                                    {STATUSES.map((status) => (
                                        <MenuItem key={status} value={status}>{status}</MenuItem>
                                    ))}
                                </TextField>
                            </div>
                        </FormSection>

                        <FormSection
                            number="02"
                            title="Description"
                            description="Explain the role and include any additional candidate requirements."
                        >
                            <TextField
                                {...field(
                                    "description",
                                    optionalLabel("Vacancy description"),
                                    {
                                        required: publishing,
                                        placeholder:
                                            "Describe the role and responsibilities.\n\n" +
                                            "Include education, skills, salary and other requirements here.",
                                        helperText:
                                            `${form.description.length}/20000 characters. ` +
                                            "Include additional requirements here when needed.",
                                    }
                                )}
                                multiline
                                minRows={6}
                            />

                            <div className="mj-status-note" role="status">
                                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                <p>{STATUS_DESCRIPTIONS[form.status]}</p>
                            </div>
                        </FormSection>
                    </div>

                    <footer className="mj-form-footer">
                        <p>
                            <span>*</span>{" "}
                            {publishing ? "Required to publish" : "Required to save"}
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
                                {saving
                                    ? "Saving..."
                                    : isEditing
                                      ? "Save changes"
                                      : publishing
                                        ? "Publish vacancy"
                                        : form.status === "Closed"
                                          ? "Save closed vacancy"
                                          : "Save draft"}
                            </Button>
                        </div>
                    </footer>
                </form>
            </section>

            <section className="mj-card mj-list-card" aria-labelledby="mv-list-title">
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span className="mj-header-icon" aria-hidden="true">
                            <i className="fa-solid fa-list" />
                        </span>

                        <div>
                            <h2 id="mv-list-title">Vacancy listings</h2>
                            <p>Review positions and manage their availability.</p>
                        </div>
                    </div>

                    <span className="mj-result-count">
                        {loading
                            ? "Loading vacancies..."
                            : listError
                              ? "Vacancies unavailable"
                              : `${total} of ${counts?.total ?? total} vacancies`}
                    </span>
                </header>

                <div className="mj-table-toolbar">
                    <TextField
                        label="Search vacancies"
                        placeholder="Title, department, location or description"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        slotProps={{ htmlInput: { maxLength: 200 } }}
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

                        {STATUSES.map((status) => (
                            <MenuItem key={status} value={status}>{status}</MenuItem>
                        ))}
                    </TextField>
                </div>

                <TableContainer>
                    <Table
                        className="mj-table"
                        aria-label="Internal company vacancies"
                        aria-busy={loading}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Vacancy & department</TableCell>
                                <TableCell>Location & work mode</TableCell>
                                <TableCell>Job type</TableCell>
                                <TableCell>Experience</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="mj-empty" role="status">
                                            <p>Loading vacancies...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : listError ? (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <Alert
                                            severity="error"
                                            action={
                                                <Button
                                                    color="inherit"
                                                    size="small"
                                                    onClick={() => setRevision((value) => value + 1)}
                                                >
                                                    Retry
                                                </Button>
                                            }
                                        >
                                            {listError}
                                        </Alert>
                                    </TableCell>
                                </TableRow>
                            ) : vacancies.length ? (
                                vacancies.map((vacancy) => (
                                    <TableRow
                                        key={vacancy.id}
                                        hover
                                        selected={editingId === vacancy.id}
                                    >
                                        <TableCell>
                                            <div className="mj-job-cell">
                                                <span
                                                    className="mj-company-avatar"
                                                    aria-hidden="true"
                                                >
                                                    <i className="fa-solid fa-building" />
                                                </span>

                                                <div>
                                                    <strong>{vacancy.title}</strong>
                                                    <p>{vacancy.department || "Department not set"}</p>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="mj-cell-primary">
                                                {vacancy.location || "Not set"}
                                            </span>
                                            <span className="mj-cell-secondary">{vacancy.mode}</span>
                                        </TableCell>

                                        <TableCell>
                                            <span className="mj-cell-primary">
                                                {vacancy.type || "Not set"}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <span className="mj-cell-primary">
                                                {vacancy.experience || "Not set"}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                label={vacancy.status}
                                                color={STATUS_COLORS[vacancy.status] || "default"}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>

                                        <TableCell align="right">
                                            <Button
                                                type="button"
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleEdit(vacancy)}
                                                disabled={formBusy}
                                                aria-label={`Edit ${vacancy.title}`}
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
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="mj-empty">
                                            <span aria-hidden="true">
                                                <i className="fa-solid fa-building" />
                                            </span>

                                            <h3>
                                                {hasFilters ? "No matching vacancies" : "Build your team"}
                                            </h3>

                                            <p>
                                                {hasFilters
                                                    ? "Try another search or status filter."
                                                    : "Create your first vacancy using the form above."}
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
                    page={Math.min(
                        page,
                        Math.max(0, Math.ceil(total / rowsPerPage) - 1)
                    )}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25]}
                    disabled={loading || Boolean(listError)}
                />
            </section>
        </div>
    );
}

export default ManageVacancies;