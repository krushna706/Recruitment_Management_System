import { useRef, useState } from "react";
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

const STORAGE_KEY = "rms-internal-vacancies-v1";

const WORK_MODES = ["On-site", "Hybrid", "Remote"];
const STATUSES = ["Draft", "Published", "Closed"];

const EMPTY_FORM = {
    title: "",
    department: "",
    mode: "On-site",
    experience: "",
    location: "",
    description: "",
    status: "Draft",
};

const STATUS_COLORS = {
    Draft: "default",
    Published: "success",
    Closed: "error",
};

const STATUS_DESCRIPTIONS = {
    Draft:
        "Save an incomplete vacancy and publish it when the details are ready.",
    Published:
        "This vacancy stays open until you manually close it.",
    Closed:
        "Stop new applications while keeping the vacancy and existing applications.",
};

function getFormValues(source = {}) {
    return Object.fromEntries(
        Object.entries(EMPTY_FORM).map(([key, fallback]) => [
            key,
            typeof source[key] === "string"
                ? source[key]
                : fallback,
        ])
    );
}

// Preserve information from the previous form by moving it
// into the description when older saved records are loaded.
function normalizeVacancy(source) {
    const form = getFormValues(source);

    const previousDetails = [
        ["Qualification", source.qualification],
        ["Skills", source.skills],
        ["Requirements", source.requirements],
        ["Salary", source.salary],
        ["Job type", source.type],
    ]
        .filter(
            ([, value]) =>
                typeof value === "string" && value.trim()
        )
        .map(([label, value]) => `${label}: ${value.trim()}`);

    return {
        ...form,
        description: [
            form.description.trim(),
            ...previousDetails,
        ]
            .filter(Boolean)
            .join("\n\n"),
        id: source.id,
        openingType: "internal",
        createdAt:
            typeof source.createdAt === "string"
                ? source.createdAt
                : "",
        updatedAt:
            typeof source.updatedAt === "string"
                ? source.updatedAt
                : "",
    };
}

function loadVacancies() {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            return { vacancies: [], error: "" };
        }

        const parsed = JSON.parse(stored);

        const valid =
            Array.isArray(parsed) &&
            parsed.every(
                (vacancy) =>
                    vacancy &&
                    typeof vacancy.id === "string" &&
                    typeof vacancy.title === "string" &&
                    STATUSES.includes(vacancy.status)
            );

        if (!valid) {
            throw new Error("Invalid vacancy data");
        }

        return {
            vacancies: parsed.map(normalizeVacancy),
            error: "",
        };
    } catch {
        return {
            vacancies: [],
            error:
                "Saved vacancies could not be loaded. Saving is disabled " +
                "to avoid overwriting existing data. Check browser storage and reload.",
        };
    }
}

function validateVacancy(form) {
    const errors = {};

    if (!form.title.trim()) {
        errors.title = "Enter the vacancy title.";
    }

    if (!WORK_MODES.includes(form.mode)) {
        errors.mode = "Select a valid work mode.";
    }

    if (!STATUSES.includes(form.status)) {
        errors.status = "Select a valid status.";
    }

    if (form.status === "Published") {
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

    return errors;
}

function FormSection({ number, title, description, children }) {
    return (
        <section className="mj-form-section">
            <div className="mj-section-heading">
                <span
                    className="mj-section-number"
                    aria-hidden="true"
                >
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

function ManageVacancies() {
    const [initialData] = useState(loadVacancies);

    const [vacancies, setVacancies] = useState(
        initialData.vacancies
    );

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [errors, setErrors] = useState({});
    const [editingId, setEditingId] = useState(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    const formRef = useRef(null);
    const titleInputRef = useRef(null);

    const isEditing = editingId !== null;
    const publishing = form.status === "Published";

    const counts = vacancies.reduce(
        (result, vacancy) => {
            result.total += 1;
            result[vacancy.status] += 1;
            return result;
        },
        {
            total: 0,
            Draft: 0,
            Published: 0,
            Closed: 0,
        }
    );

    const metrics = [
        {
            label: "Total vacancies",
            value: counts.total,
            detail: "All internal opportunities",
            icon: "fa-solid fa-building",
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

    const filteredVacancies = vacancies
        .filter((vacancy) => {
            const matchesSearch = [
                vacancy.title,
                vacancy.department,
                vacancy.location,
                vacancy.mode,
            ].some((value) =>
                value.toLowerCase().includes(query)
            );

            const matchesStatus =
                statusFilter === "All" ||
                vacancy.status === statusFilter;

            return matchesSearch && matchesStatus;
        })
        .sort((first, second) =>
            second.createdAt.localeCompare(first.createdAt)
        );

    const visibleVacancies = filteredVacancies.slice(
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

        titleInputRef.current?.focus({
            preventScroll: true,
        });
    }

    function handleNewVacancy() {
        resetForm();
        focusForm();
    }

    function handleEdit(vacancy) {
        setForm(getFormValues(vacancy));
        setEditingId(vacancy.id);
        setErrors({});
        focusForm();
    }

    function handleSubmit(event) {
        event.preventDefault();

        if (initialData.error) return;

        const validationErrors = validateVacancy(form);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Please check the highlighted fields.");
            return;
        }

        const existingVacancy = isEditing
            ? vacancies.find(
                  (vacancy) => vacancy.id === editingId
              )
            : null;

        if (isEditing && !existingVacancy) {
            toast.error("Vacancy not found. Reload and try again.");
            return;
        }

        const normalizedForm = Object.fromEntries(
            Object.entries(form).map(([key, value]) => [
                key,
                value.trim(),
            ])
        );

        let nextVacancies;

        try {
            const now = new Date().toISOString();

            const savedVacancy = {
                ...normalizedForm,
                id:
                    existingVacancy?.id ??
                    window.crypto.randomUUID(),
                openingType: "internal",
                createdAt: existingVacancy?.createdAt || now,
                updatedAt: now,
            };

            nextVacancies = isEditing
                ? vacancies.map((vacancy) =>
                      vacancy.id === editingId
                          ? savedVacancy
                          : vacancy
                  )
                : [savedVacancy, ...vacancies];

            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(nextVacancies)
            );
        } catch {
            toast.error(
                "Could not save the vacancy. Check browser storage and try again."
            );
            return;
        }

        setVacancies(nextVacancies);
        setSearch("");
        setStatusFilter("All");
        setPage(0);

        toast.success(
            isEditing
                ? "Vacancy updated successfully."
                : "Vacancy created successfully."
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
        <div className="manage-jobs manage-vacancies">
            <header className="mj-heading">
                <div>
                    <span className="mj-eyebrow">
                        INTERNAL RECRUITMENT
                    </span>

                    <h1>Manage Vacancies</h1>

                    <p>
                        Build your team and manage career opportunities.
                    </p>
                </div>

            </header>

            {initialData.error && (
                <Alert severity="error" className="mj-alert">
                    {initialData.error}
                </Alert>
            )}

            <section
                className="mj-metrics"
                aria-label="Vacancy overview"
            >
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
                aria-labelledby="mv-form-title"
            >
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span
                            className="mj-header-icon"
                            aria-hidden="true"
                        >
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
                                {isEditing
                                    ? "Edit vacancy"
                                    : "Create a vacancy"}
                            </h2>

                            <p>
                                {isEditing
                                    ? "Update the details or change the hiring status."
                                    : "Add the details candidates need to explore this role."}
                            </p>
                        </div>
                    </div>

                    <Chip
                        label={isEditing ? "Editing" : "Internal opportunity"}
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
                                    {...field("department", "Department", {
                                        required: publishing,
                                        placeholder: "e.g. Engineering",
                                    })}
                                />

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

                                <TextField
                                    {...field("experience", "Experience", {
                                        required: publishing,
                                        placeholder: "e.g. 0–2 years",
                                    })}
                                />

                                <TextField
                                    {...field("location", "Location", {
                                        required: publishing,
                                        placeholder: "e.g. Bhubaneswar, Odisha",
                                    })}
                                />

                                <TextField
                                    {...field("status", "Vacancy status", {
                                        required: true,
                                    })}
                                    select
                                >
                                    {STATUSES.map((status) => (
                                        <MenuItem key={status} value={status}>
                                            {status}
                                        </MenuItem>
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
                                    "Vacancy description",
                                    {
                                        required: publishing,
                                        placeholder:
                                            "Describe the role and responsibilities.\n\n" +
                                            "You can also include education, skills, " +
                                            "salary and other requirements here.",
                                        helperText:
                                            "Include education, skills and other details here when needed.",
                                    }
                                )}
                                multiline
                                minRows={6}
                            />

                            <div className="mj-status-note" role="status">
                                <i
                                    className="fa-solid fa-circle-info"
                                    aria-hidden="true"
                                />

                                <p>
                                    {STATUS_DESCRIPTIONS[form.status]}
                                </p>
                            </div>
                        </FormSection>
                    </div>

                    <footer className="mj-form-footer">
                        <p>
                            <span>*</span>{" "}
                            {publishing
                                ? "Required to publish"
                                : "Required to save"}
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
                                      ? "Publish vacancy"
                                      : form.status === "Closed"
                                        ? "Save closed vacancy"
                                        : "Save draft"}
                            </Button>
                        </div>
                    </footer>
                </form>
            </section>

            <section
                className="mj-card mj-list-card"
                aria-labelledby="mv-list-title"
            >
                <header className="mj-card-header">
                    <div className="mj-card-heading">
                        <span
                            className="mj-header-icon"
                            aria-hidden="true"
                        >
                            <i className="fa-solid fa-list" />
                        </span>

                        <div>
                            <h2 id="mv-list-title">Vacancy listings</h2>
                            <p>
                                Review positions and manage their availability.
                            </p>
                        </div>
                    </div>

                    <span className="mj-result-count">
                        {filteredVacancies.length} of{" "}
                        {vacancies.length} vacancies
                    </span>
                </header>

                <div className="mj-table-toolbar">
                    <TextField
                        label="Search vacancies"
                        placeholder="Title, department, location or work mode"
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

                        {STATUSES.map((status) => (
                            <MenuItem key={status} value={status}>
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>
                </div>

                <TableContainer>
                    <Table
                        className="mj-table"
                        aria-label="Internal company vacancies"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Vacancy & department</TableCell>
                                <TableCell>Location & work mode</TableCell>
                                <TableCell>Experience</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleVacancies.map((vacancy) => (
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

                                                <p>
                                                    {vacancy.department ||
                                                        "Department not set"}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="mj-cell-primary">
                                            {vacancy.location || "Not set"}
                                        </span>

                                        <span className="mj-cell-secondary">
                                            {vacancy.mode}
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
                                            color={
                                                STATUS_COLORS[vacancy.status]
                                            }
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
                            ))}

                            {visibleVacancies.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <div className="mj-empty">
                                            <span aria-hidden="true">
                                                <i className="fa-solid fa-building" />
                                            </span>

                                            <h3>
                                                {vacancies.length
                                                    ? "No matching vacancies"
                                                    : "Build your team"}
                                            </h3>

                                            <p>
                                                {vacancies.length
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
                    count={filteredVacancies.length}
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

export default ManageVacancies;