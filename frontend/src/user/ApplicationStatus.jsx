import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Button, Chip, Step, StepContent, StepLabel, Stepper } from "@mui/material";

import api from "../services/api";

// ================== STATUS DISPLAY ==================
const STATUS_CLASSES = {
    Submitted: "submitted",
    "Under Review": "review",
    Shortlisted: "shortlisted",
    Interview: "interview",
    Selected: "selected",
    Rejected: "rejected",
};

// ================== DATE FORMAT ==================
function formatDate(value, includeTime = false) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        ...(includeTime
            ? {
                hour: "2-digit",
                minute: "2-digit",
            }
            : {}),
    });
}

// ================== APPLICATION DETAILS ==================
function ApplicationStatus() {
    const { id } = useParams();

    // Reset page state when opening another application.
    return <ApplicationDetails key={id} id={id} />;
}

function ApplicationDetails({ id }) {
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    // ================== FETCH APPLICATION ==================
    useEffect(() => {
        const controller = new AbortController();

        async function fetchApplication() {
            setLoading(true);
            setError("");
            setApplication(null);

            if (!/^[a-fA-F0-9]{24}$/.test(id || "")) {
                setLoading(false);
                return;
            }

            try {
                const { data } = await api.get(
                    `/applications/my/${encodeURIComponent(id)}`,
                    { signal: controller.signal }
                );

                if (controller.signal.aborted) return;

                setApplication(data.application);
            } catch (requestError) {
                if (controller.signal.aborted) return;

                if (requestError.response?.status !== 404) {
                    const message = requestError.response?.data?.message;

                    setError(
                        typeof message === "string" && message.trim()
                            ? message
                            : "Application details could not be loaded."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchApplication();

        return () => controller.abort();
    }, [id, refreshKey]);

    // ================== LOADING ==================
    if (loading) {
        return (
            <div className="panel-card panel-empty-state" role="status">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                <h1 className="panel-page-title">Loading application...</h1>
                <p>Please wait while we fetch your details.</p>
            </div>
        );
    }

    // ================== REQUEST ERROR ==================
    if (error) {
        return (
            <div className="panel-card panel-empty-state">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                <h1 className="panel-page-title">Unable to load application.</h1>
                <p role="alert">{error}</p>

                <Button
                    type="button"
                    variant="contained"
                    disableElevation
                    className="panel-button panel-button-primary"
                    onClick={() => setRefreshKey((previous) => previous + 1)}
                >
                    Try again
                </Button>

                <Link to="/manage/my-applications" className="application-back-link">
                    Back to My Applications
                </Link>
            </div>
        );
    }

    // ================== APPLICATION NOT FOUND ==================
    if (!application) {
        return (
            <div className="panel-card panel-empty-state">
                <i className="fa-regular fa-folder-open" aria-hidden="true" />
                <h1 className="panel-page-title">Application not found.</h1>
                <p>Return to your applications to view an available record.</p>

                <Button
                    component={Link}
                    to="/manage/my-applications"
                    variant="contained"
                    disableElevation
                    className="panel-button panel-button-primary"
                >
                    My Applications
                </Button>
            </div>
        );
    }

    const job = application.jobSnapshot || {};
    const applicant = application.applicant || {};
    const resume = application.resume;
    const applicationId = application.id || application._id;

    const history = [...(application.history || [])].sort(
        (first, second) =>
            new Date(first.createdAt) - new Date(second.createdAt)
    );

    const latestIndex = history.length - 1;
    const latestEvent = history[latestIndex];

    return (
        <div className="application-status-page">
            <Link to="/manage/my-applications" className="application-back-link">
                <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                Back to My Applications
            </Link>

            <header className="panel-page-heading">
                <div>
                    <h1 className="panel-page-title">Application details</h1>

                    <p className="panel-page-description">
                        Your submitted information and recruitment progress.
                    </p>
                </div>
            </header>

            {/* ================== JOB OVERVIEW ================== */}
            <section
                className="application-overview"
                aria-labelledby="application-job-heading"
            >
                <div className="application-overview-top">
                    <div className="application-job-heading">
                        <span className="application-overview-icon" aria-hidden="true">
                            <i className="fa-solid fa-briefcase" />
                        </span>

                        <div>
                            <p className="application-field-label">Applied position</p>
                            <h2 id="application-job-heading">{job.title}</h2>

                            <p className="application-company">
                                {job.company ||
                                    (application.openingType === "internal"
                                        ? "Internal vacancy"
                                        : "Company not specified")}
                            </p>
                        </div>
                    </div>

                    <div className="application-current-status">
                        <span className="application-field-label">Current status</span>

                        <span
                            className={`panel-status panel-status-${
                                STATUS_CLASSES[application.status] || "submitted"
                            }`}
                        >
                            <span aria-hidden="true" />
                            {application.status}
                        </span>
                    </div>
                </div>

                <dl className="application-overview-facts">
                    <div>
                        <dt>
                            <i className="fa-solid fa-location-dot" aria-hidden="true" />
                            Location
                        </dt>
                        <dd>{job.location || "Not specified"}</dd>
                    </div>

                    {job.salary && (
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
                    )}

                    <div>
                        <dt>
                            <i className="fa-regular fa-clock" aria-hidden="true" />
                            Employment type
                        </dt>
                        <dd>{job.type || "Not specified"}</dd>
                    </div>

                    <div>
                        <dt>
                            <i className="fa-solid fa-laptop" aria-hidden="true" />
                            Work mode
                        </dt>
                        <dd>{job.mode || "Not specified"}</dd>
                    </div>
                </dl>

                <div className="application-reference-row">
                    <p>
                        <span>Application ID:</span>
                        <strong>{applicationId}</strong>
                    </p>

                    <p>
                        <span>Applied on:</span>
                        <time dateTime={application.createdAt}>
                            {formatDate(application.createdAt)}
                        </time>
                    </p>
                </div>
            </section>

            <div className="application-details-grid">
                <div className="application-details-main">
                    {/* ================== RECRUITMENT UPDATES ================== */}
                    {application.status === "Interview" && application.interview && (
                        <section className="application-update">
                            <span className="application-update-icon" aria-hidden="true">
                                <i className="fa-regular fa-calendar-check" />
                            </span>

                            <div>
                                <h2>Interview details</h2>

                                <dl className="application-update-facts">
                                    <div>
                                        <dt>Date & time</dt>
                                        <dd>{formatDate(application.interview.at, true)}</dd>
                                    </div>

                                    <div>
                                        <dt>Interview mode</dt>
                                        <dd>{application.interview.mode}</dd>
                                    </div>
                                </dl>

                                <p>{application.interview.note}</p>
                            </div>
                        </section>
                    )}

                    {application.status === "Selected" && application.selection && (
                        <Alert severity="success" className="application-feedback">
                            <strong>Selection update</strong>
                            {application.selection.note}
                        </Alert>
                    )}

                    {application.status === "Rejected" && (
                        <Alert severity="info" className="application-feedback">
                            <strong>Application update</strong>
                            This application is no longer moving forward. You
                            can continue exploring other opportunities.
                        </Alert>
                    )}

                    {/* ================== SUBMITTED DETAILS ================== */}
                    <section
                        className="panel-card"
                        aria-labelledby="applicant-details-title"
                    >
                        <header className="panel-card-header">
                            <div>
                                <h2 id="applicant-details-title" className="panel-card-title">
                                    Submitted details
                                </h2>

                                <p className="panel-card-description">
                                    Information provided when you applied.
                                </p>
                            </div>

                            <span className="application-section-icon" aria-hidden="true">
                                <i className="fa-regular fa-user" />
                            </span>
                        </header>

                        <div className="application-card-body">
                            <section className="application-detail-section">
                                <h3>Personal information</h3>

                                <dl className="application-personal-grid">
                                    <div>
                                        <dt>Full name</dt>
                                        <dd>{applicant.name || "Not provided"}</dd>
                                    </div>

                                    <div>
                                        <dt>Email address</dt>
                                        <dd>{applicant.email || "Not provided"}</dd>
                                    </div>

                                    <div>
                                        <dt>Phone number</dt>
                                        <dd>{applicant.phone || "Not provided"}</dd>
                                    </div>

                                    <div>
                                        <dt>Submitted on</dt>
                                        <dd>{formatDate(application.createdAt, true)}</dd>
                                    </div>
                                </dl>
                            </section>

                            <section className="application-detail-section">
                                <h3>Professional background</h3>

                                <dl className="application-personal-grid">
                                    <div>
                                        <dt>Highest qualification</dt>
                                        <dd>{applicant.qualification || "Not provided"}</dd>
                                    </div>

                                    <div>
                                        <dt>Total experience</dt>
                                        <dd>{applicant.experience || "Not provided"}</dd>
                                    </div>
                                </dl>

                                <div className="application-skills">
                                    <h4>Relevant skills</h4>

                                    {applicant.skills?.length ? (
                                        <div className="application-skill-list">
                                            {applicant.skills.map((skill) => (
                                                <Chip key={skill} label={skill} size="small" />
                                            ))}
                                        </div>
                                    ) : (
                                        <p>No skills provided.</p>
                                    )}
                                </div>
                            </section>

                            {/* ================== RESUME INFORMATION ================== */}
                            <section className="application-detail-section">
                                <h3>Submitted resume</h3>

                                <div className="application-resume">
                                    <span className="application-resume-icon" aria-hidden="true">
                                        <i className="fa-regular fa-file-lines" />
                                    </span>

                                    <div>
                                        <h4>{resume?.name || "No resume available"}</h4>

                                        <p>
                                            {resume?.name
                                                ? "Document submitted with this application."
                                                : "No document information is available."}
                                        </p>

                                        {resume?.size > 0 && (
                                            <p>
                                                {Math.max(1, Math.round(resume.size / 1024))} KB
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </section>
                </div>

                {/* ================== RECORDED STATUS HISTORY ================== */}
                <section
                    className="panel-card application-progress"
                    aria-labelledby="application-progress-title"
                >
                    <header className="panel-card-header">
                        <div>
                            <h2 id="application-progress-title" className="panel-card-title">
                                Application progress
                            </h2>

                            <p className="panel-card-description">
                                {latestEvent
                                    ? `Last updated: ${formatDate(latestEvent.createdAt)}`
                                    : "No updates available yet."}
                            </p>
                        </div>

                        <span className="application-section-icon" aria-hidden="true">
                            <i className="fa-solid fa-list-check" />
                        </span>
                    </header>

                    <div className="application-card-body">
                        {history.length ? (
                            <Stepper
                                orientation="vertical"
                                nonLinear
                                activeStep={latestIndex}
                                className="application-stepper"
                            >
                                {history.map((event, index) => (
                                    <Step
                                        key={`${event.status}-${event.createdAt}-${index}`}
                                        expanded
                                        completed={
                                            index < latestIndex &&
                                            event.status !== "Rejected"
                                        }
                                    >
                                        <StepLabel error={event.status === "Rejected"}>
                                            {event.status}

                                            {index === latestIndex && (
                                                <span className="application-current-label">
                                                    Current
                                                </span>
                                            )}
                                        </StepLabel>

                                        <StepContent>
                                            <time dateTime={event.createdAt}>
                                                {formatDate(event.createdAt, true)}
                                            </time>

                                            {event.message && <p>{event.message}</p>}
                                        </StepContent>
                                    </Step>
                                ))}
                            </Stepper>
                        ) : (
                            <p className="panel-card-description">
                                Status history is not available yet.
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default ApplicationStatus;