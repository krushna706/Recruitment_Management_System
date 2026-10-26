import usePageSEO from "../hooks/usePageSEO";
import { seoPages } from "../config/seoConfig";


import { formatDate, formatFileSize } from "../utils/dataFormat";
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

// ================== APPLICATION PAGE ==================
function ApplicationStatus() {
    const { id } = useParams();

    return <ApplicationDetails key={id} id={id} />;
}

// ================== APPLICATION DETAILS ==================
function ApplicationDetails({ id }) {
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    
    usePageSEO({
        ...seoPages.applicationStatus,

        title: application?.jobSnapshot?.title
            ? `Application Status - ${application.jobSnapshot.title}`
            : seoPages.applicationStatus.title,
    });


    // ================== FETCH APPLICATION ==================
    // The backend verifies ownership using the logged-in user's account.
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
                const { data } = await api.get(`/applications/my/${encodeURIComponent(id)}`, {
                    signal: controller.signal,
                });

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
                    onClick={() => setRefreshKey((value) => value + 1)}
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

    // ================== SAVED APPLICATION INFORMATION ==================
    const opening = application.jobSnapshot || {};
    const applicant = application.applicant || {};
    const resume = application.resume;
    const applicationId = application.id || application._id;

    // Opening type is used for navigation only, not as a visible label.
    const isInternal = application.openingType === "internal";

    const canLinkToClientJob =
        application.openingType === "client" &&
        /^[a-fA-F0-9]{24}$/.test(String(application.jobId || ""));

    const openingPath = isInternal
        ? "/careers"
        : canLinkToClientJob
          ? `/jobs/${encodeURIComponent(application.jobId)}`
          : "/jobs";

    const openingLinkLabel = isInternal
        ? "Browse Careers"
        : canLinkToClientJob
          ? "View job"
          : "Browse Jobs";

    const history = (Array.isArray(application.history) ? [...application.history] : []).sort(
        (first, second) => new Date(first.createdAt) - new Date(second.createdAt)
    );

    const skills = Array.isArray(applicant.skills) ? applicant.skills : [];

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

                <div className="d-flex flex-wrap gap-2">
                    <Button
                        component={Link}
                        to={openingPath}
                        variant="outlined"
                        className="panel-button panel-button-outline"
                    >
                        {openingLinkLabel}
                    </Button>

                    <Button
                        type="button"
                        variant="outlined"
                        className="panel-button panel-button-outline"
                        onClick={() => setRefreshKey((value) => value + 1)}
                    >
                        Refresh status
                    </Button>
                </div>
            </header>

            {/* ================== OPENING OVERVIEW ================== */}
            <section className="application-overview" aria-labelledby="application-job-heading">
                <div className="application-overview-top">
                    <div className="application-job-heading">
                        <span className="application-overview-icon" aria-hidden="true">
                            <i className="fa-solid fa-briefcase" />
                        </span>

                        <div>
                            <p className="application-field-label">Applied position</p>

                            <h2 id="application-job-heading">
                                {opening.title || "Opening details"}
                            </h2>

                            {opening.company && (
                                <p className="application-company">{opening.company}</p>
                            )}
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
                        <dd>{opening.location || "Not specified"}</dd>
                    </div>

                    <div>
                        <dt>
                            <i className="fa-solid fa-building" aria-hidden="true" />
                            Department
                        </dt>
                        <dd>{opening.department || "Not specified"}</dd>
                    </div>

                    <div>
                        <dt>
                            <i className="fa-regular fa-clock" aria-hidden="true" />
                            Job type
                        </dt>
                        <dd>{opening.type || "Not specified"}</dd>
                    </div>

                    <div>
                        <dt>
                            <i className="fa-solid fa-laptop" aria-hidden="true" />
                            Work mode
                        </dt>
                        <dd>{opening.mode || "Not specified"}</dd>
                    </div>

                    {opening.salary && (
                        <div>
                            <dt>
                                <i className="fa-solid fa-indian-rupee-sign" aria-hidden="true" />
                                Salary
                            </dt>
                            <dd>{opening.salary}</dd>
                        </div>
                    )}
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
                    {/* ================== INTERVIEW DETAILS ================== */}
                    {application.interview && (
                        <section className="application-update">
                            <span className="application-update-icon" aria-hidden="true">
                                <i className="fa-regular fa-calendar-check" />
                            </span>

                            <div>
                                <h2>
                                    {application.status === "Interview"
                                        ? "Interview details"
                                        : "Recorded interview details"}
                                </h2>

                                <dl className="application-update-facts">
                                    <div>
                                        <dt>Date & time (IST)</dt>
                                        <dd>{formatDate(application.interview.at, true)}</dd>
                                    </div>

                                    <div>
                                        <dt>Interview mode</dt>
                                        <dd>{application.interview.mode}</dd>
                                    </div>
                                </dl>

                                {application.interview.note && <p>{application.interview.note}</p>}
                            </div>
                        </section>
                    )}

                    {/* ================== FINAL STATUS FEEDBACK ================== */}
                    {application.status === "Selected" && (
                        <Alert severity="success" className="application-feedback">
                            <strong>Selection update</strong>
                            <p>
                                {application.selection?.note ||
                                    "Your application has been selected."}
                            </p>
                        </Alert>
                    )}

                    {application.status === "Rejected" && (
                        <Alert severity="info" className="application-feedback">
                            <strong>Application update</strong>
                            <p>
                                This application is no longer moving forward. You can continue
                                exploring other opportunities.
                            </p>
                        </Alert>
                    )}

                    {/* ================== SUBMITTED DETAILS ================== */}
                    <section className="panel-card" aria-labelledby="applicant-details-title">
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
                                        <dt>Submitted on (IST)</dt>
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

                                    {skills.length ? (
                                        <div className="application-skill-list">
                                            {skills.map((skill) => (
                                                <Chip key={skill} label={skill} size="small" />
                                            ))}
                                        </div>
                                    ) : (
                                        <p>No skills provided.</p>
                                    )}
                                </div>
                            </section>

                            {/* ================== ORIGINAL RESUME INFORMATION ================== */}
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

                                        {resume?.size > 0 && <p>{formatFileSize(resume.size)}</p>}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </section>
                </div>

                {/* ================== STATUS HISTORY ================== */}
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
                                            index < latestIndex && event.status !== "Rejected"
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
