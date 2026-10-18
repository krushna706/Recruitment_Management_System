import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Button,
    InputAdornment,
    MenuItem,
    Pagination,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
} from "@mui/material";

import {
    applicationStatuses,
    demoApplications,
    formatApplicationDate,
    statusClasses,
} from "./applicationData";

const PAGE_SIZE = 5;

function MyApplications({ applications = demoApplications }) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);

    const applicationList = Array.isArray(applications)
        ? applications
        : [];

    const query = search.trim().toLowerCase();

    const filteredApplications = applicationList
        .filter((application) => {
            const matchesSearch =
                `${application.title} ${application.company}`
                    .toLowerCase()
                    .includes(query);

            const matchesStatus =
                !status || application.status === status;

            return matchesSearch && matchesStatus;
        })
        .sort(
            (first, second) =>
                new Date(second.appliedAt) - new Date(first.appliedAt)
        );

    const pageCount = Math.ceil(filteredApplications.length / PAGE_SIZE);
    const currentPage = Math.min(page, Math.max(1, pageCount));

    const startIndex = (currentPage - 1) * PAGE_SIZE;

    const visibleApplications = filteredApplications.slice(
        startIndex,
        startIndex + PAGE_SIZE
    );

    const hasFilters = search !== "" || status !== "";

    const clearFilters = () => {
        setSearch("");
        setStatus("");
        setPage(1);
    };

    const getDetailsPath = (id) =>
        `/manage/my-applications/${encodeURIComponent(id)}`;

    const renderStatus = (application) => (
        <span
            className={`panel-status panel-status-${
                statusClasses[application.status] || "submitted"
            }`}
        >
            <span aria-hidden="true" />
            {application.status}
        </span>
    );

    return (
        <div className="my-applications-page">
            <header className="panel-page-heading">
                <div>
                    <h1 className="panel-page-title">My Applications</h1>

                    <p className="panel-page-description">
                        Track your applications and follow their progress.
                    </p>
                </div>

                <Button
                    component={Link}
                    to="/jobs"
                    variant="outlined"
                    className="panel-button panel-button-outline"
                    startIcon={
                        <i
                            className="fa-solid fa-magnifying-glass"
                            aria-hidden="true"
                        />
                    }
                >
                    Browse Jobs
                </Button>
            </header>

            <section
                className="panel-card applications-toolbar"
                aria-label="Filter applications"
            >
                <TextField
                    label="Search applications"
                    placeholder="Job title or company"
                    size="small"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                    className="panel-field"
                    fullWidth
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <i
                                        className="fa-solid fa-magnifying-glass"
                                        aria-hidden="true"
                                    />
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                <TextField
                    select
                    label="Application status"
                    size="small"
                    value={status}
                    onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(1);
                    }}
                    className="panel-field"
                    fullWidth
                    slotProps={{
                        inputLabel: {
                            shrink: true,
                        },
                        select: {
                            displayEmpty: true,
                        },
                    }}
                >
                    <MenuItem value="">All statuses</MenuItem>

                    {applicationStatuses.map((item) => (
                        <MenuItem value={item} key={item}>
                            {item}
                        </MenuItem>
                    ))}
                </TextField>

                <Button
                    type="button"
                    className="panel-button applications-reset"
                    disabled={!hasFilters}
                    onClick={clearFilters}
                >
                    Clear filters
                </Button>
            </section>

            <section
                className="panel-card applications-results"
                aria-labelledby="application-list-title"
            >
                <header className="panel-card-header">
                    <div>
                        <h2
                            className="panel-card-title"
                            id="application-list-title"
                        >
                            Your applications
                        </h2>

                        <p
                            className="panel-card-description"
                            role="status"
                            aria-live="polite"
                        >
                            {filteredApplications.length}{" "}
                            {filteredApplications.length === 1
                                ? "application"
                                : "applications"}{" "}
                            {hasFilters ? "match your filters." : "in total."}
                        </p>
                    </div>

                    <span className="applications-sort-note">
                        <i
                            className="fa-solid fa-arrow-down-wide-short"
                            aria-hidden="true"
                        />
                        Newest first
                    </span>
                </header>

                {visibleApplications.length > 0 ? (
                    <>
                        {/* Desktop and tablet table */}
                        <TableContainer className="applications-table-container">
                            <Table
                                className="applications-table"
                                aria-labelledby="application-list-title"
                            >
                                <TableHead>
                                    <TableRow>
                                        <TableCell scope="col">
                                            Job details
                                        </TableCell>

                                        <TableCell scope="col">
                                            Applied on
                                        </TableCell>

                                        <TableCell scope="col" align="right">
                                            Status & action
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {visibleApplications.map((application) => (
                                        <TableRow key={application.id}>
                                            <TableCell>
                                                <div className="applications-job">
                                                    <span
                                                        className="applications-job-icon"
                                                        aria-hidden="true"
                                                    >
                                                        <i className="fa-solid fa-briefcase" />
                                                    </span>

                                                    <div className="applications-job-copy">
                                                        <h3>
                                                            <Link
                                                                to={getDetailsPath(
                                                                    application.id
                                                                )}
                                                            >
                                                                {application.title}
                                                            </Link>
                                                        </h3>

                                                        <p>
                                                            {application.company}
                                                        </p>

                                                        <div className="applications-job-meta">
                                                            <span>
                                                                <i
                                                                    className="fa-solid fa-location-dot"
                                                                    aria-hidden="true"
                                                                />
                                                                {application.location}
                                                            </span>

                                                            <span className="applications-mode">
                                                                {application.mode}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <time
                                                    className="applications-date"
                                                    dateTime={application.appliedAt}
                                                >
                                                    {formatApplicationDate(
                                                        application.appliedAt
                                                    )}
                                                </time>
                                            </TableCell>

                                            <TableCell align="right">
                                                <div className="applications-row-action">
                                                    {renderStatus(application)}

                                                    <Link
                                                        to={getDetailsPath(
                                                            application.id
                                                        )}
                                                        className="panel-text-link"
                                                        aria-label={`View application for ${application.title}`}
                                                    >
                                                        View details
                                                        <i
                                                            className="fa-solid fa-arrow-right"
                                                            aria-hidden="true"
                                                        />
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Mobile cards with explicit field labels */}
                        <ul className="applications-mobile-list">
                            {visibleApplications.map((application) => (
                                <li key={application.id}>
                                    <span className="applications-mobile-label">
                                        Job details
                                    </span>

                                    <div className="applications-job">
                                        <span
                                            className="applications-job-icon"
                                            aria-hidden="true"
                                        >
                                            <i className="fa-solid fa-briefcase" />
                                        </span>

                                        <div className="applications-job-copy">
                                            <h3>
                                                <Link
                                                    to={getDetailsPath(
                                                        application.id
                                                    )}
                                                >
                                                    {application.title}
                                                </Link>
                                            </h3>

                                            <p>{application.company}</p>

                                            <div className="applications-job-meta">
                                                <span>
                                                    <i
                                                        className="fa-solid fa-location-dot"
                                                        aria-hidden="true"
                                                    />
                                                    {application.location}
                                                </span>

                                                <span className="applications-mode">
                                                    {application.mode}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="applications-mobile-facts">
                                        <div>
                                            <span className="applications-mobile-label">
                                                Applied on
                                            </span>

                                            <time
                                                className="applications-date"
                                                dateTime={application.appliedAt}
                                            >
                                                {formatApplicationDate(
                                                    application.appliedAt
                                                )}
                                            </time>
                                        </div>

                                        <div>
                                            <span className="applications-mobile-label">
                                                Current status
                                            </span>

                                            {renderStatus(application)}
                                        </div>
                                    </div>

                                    <Link
                                        to={getDetailsPath(application.id)}
                                        className="panel-text-link applications-mobile-details"
                                        aria-label={`View application for ${application.title}`}
                                    >
                                        View details
                                        <i
                                            className="fa-solid fa-arrow-right"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <footer className="applications-pagination">
                            <p>
                                Showing {startIndex + 1}–
                                {Math.min(
                                    startIndex + PAGE_SIZE,
                                    filteredApplications.length
                                )}{" "}
                                of {filteredApplications.length}
                            </p>

                            {pageCount > 1 && (
                                <Pagination
                                    count={pageCount}
                                    page={currentPage}
                                    onChange={(_, nextPage) =>
                                        setPage(nextPage)
                                    }
                                    shape="rounded"
                                    color="primary"
                                    siblingCount={0}
                                    aria-label="Application pages"
                                />
                            )}
                        </footer>
                    </>
                ) : (
                    <div className="panel-empty-state">
                        <i
                            className="fa-regular fa-folder-open"
                            aria-hidden="true"
                        />

                        <h3>
                            {applicationList.length
                                ? "No matching applications."
                                : "No applications yet."}
                        </h3>

                        <p>
                            {applicationList.length
                                ? "Try another search or clear your filters."
                                : "Explore available roles and take your next step."}
                        </p>

                        {applicationList.length ? (
                            <Button
                                onClick={clearFilters}
                                className="panel-button panel-button-primary"
                                variant="contained"
                                disableElevation
                            >
                                Clear filters
                            </Button>
                        ) : (
                            <Button
                                component={Link}
                                to="/jobs"
                                className="panel-button panel-button-primary"
                                variant="contained"
                                disableElevation
                            >
                                Browse Jobs
                            </Button>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

export default MyApplications;