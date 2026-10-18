import { Link, useParams } from "react-router-dom";
import {
    Alert,
    Button,
    Chip,
    Step,
    StepContent,
    StepLabel,
    Stepper,
} from "@mui/material";

import {
    applicationStages,
    demoApplications,
    formatApplicationDate,
    statusClasses,
} from "./applicationData";

function ApplicationStatus({ applications = demoApplications }) {
    const { id } = useParams();

    const application = Array.isArray(applications)
        ? applications.find((item) => String(item.id) === id)
        : null;

    if (!application) {
        return (
            <div className="panel-card panel-empty-state">
                <i
                    className="fa-regular fa-folder-open"
                    aria-hidden="true"
                />

                <h1 className="panel-page-title">
                    Application not found.
                </h1>

                <p>
                    Return to your applications to view an available record.
                </p>

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

    const applicant = application.applicant || {};

    const history = [...(application.history || [])].sort(
        (first, second) => new Date(first.at) - new Date(second.at)
    );

    const isRejected = application.status === "Rejected";
    const latestIndex = history.length - 1;
    const latestEvent = history[latestIndex];

    const timeline = history.map((event) => ({
        ...event,
        recorded: true,
    }));

    const currentStage = applicationStages.indexOf(application.status);

    if (!isRejected && currentStage >= 0) {
        applicationStages.slice(currentStage + 1).forEach((stage) => {
            timeline.push({
                status: stage,
                recorded: false,
            });
        });
    }

    const resumeUrl = application.resume?.url;

    const canOpenResume =
        typeof resumeUrl === "string" &&
        (/^https:\/\//i.test(resumeUrl) ||
            /^\/(?!\/)/.test(resumeUrl));

    return (
        <div className="application-status-page">
            <Link
                to="/manage/my-applications"
                className="application-back-link"
            >
                <i
                    className="fa-solid fa-arrow-left"
                    aria-hidden="true"
                />
                Back to My Applications
            </Link>

            <header className="panel-page-heading">
                <div>
                    <h1 className="panel-page-title">
                        Application details
                    </h1>

                    <p className="panel-page-description">
                        Your submitted information and recruitment progress.
                    </p>
                </div>
            </header>

            <section
                className="application-overview"
                aria-labelledby="application-job-heading"
            >
                <div className="application-overview-top">
                    <div className="application-job-heading">
                        <span
                            className="application-overview-icon"
                            aria-hidden="true"
                        >
                            <i className="fa-solid fa-briefcase" />
                        </span>

                        <div>
                            <p className="application-field-label">
                                Applied position
                            </p>

                            <h2 id="application-job-heading">
                                {application.title}
                            </h2>

                            <p className="application-company">
                                {application.company}
                            </p>
                        </div>
                    </div>

                    <div className="application-current-status">
                        <span className="application-field-label">
                            Current status
                        </span>

                        <span
                            className={`panel-status panel-status-${
                                statusClasses[application.status] ||
                                "submitted"
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
                            <i
                                className="fa-solid fa-location-dot"
                                aria-hidden="true"
                            />
                            Location
                        </dt>
                        <dd>{application.location || "Not specified"}</dd>
                    </div>

                    <div>
                        <dt>
                            <i
                                className="fa-solid fa-indian-rupee-sign"
                                aria-hidden="true"
                            />
                            Salary
                        </dt>
                        <dd>{application.salary || "Not specified"}</dd>
                    </div>

                    <div>
                        <dt>
                            <i
                                className="fa-regular fa-clock"
                                aria-hidden="true"
                            />
                            Employment type
                        </dt>
                        <dd>{application.type || "Not specified"}</dd>
                    </div>

                    <div>
                        <dt>
                            <i
                                className="fa-solid fa-laptop"
                                aria-hidden="true"
                            />
                            Work mode
                        </dt>
                        <dd>{application.mode || "Not specified"}</dd>
                    </div>
                </dl>

                <div className="application-reference-row">
                    <p>
                        <span>Application ID:</span>
                        <strong>{application.id}</strong>
                    </p>

                    <p>
                        <span>Applied on:</span>
                        <time dateTime={application.appliedAt}>
                            {formatApplicationDate(application.appliedAt)}
                        </time>
                    </p>
                </div>
            </section>

            <div className="application-details-grid">
                <div className="application-details-main">
                    {application.status === "Interview" &&
                        application.interview && (
                            <section className="application-update">
                                <span
                                    className="application-update-icon"
                                    aria-hidden="true"
                                >
                                    <i className="fa-regular fa-calendar-check" />
                                </span>

                                <div>
                                    <h2>Interview details</h2>

                                    <dl className="application-update-facts">
                                        <div>
                                            <dt>Date & time</dt>
                                            <dd>
                                                {formatApplicationDate(
                                                    application.interview.at,
                                                    true
                                                )}
                                            </dd>
                                        </div>

                                        <div>
                                            <dt>Interview mode</dt>
                                            <dd>
                                                {application.interview.mode}
                                            </dd>
                                        </div>
                                    </dl>

                                    <p>{application.interview.note}</p>
                                </div>
                            </section>
                        )}

                    {application.status === "Selected" &&
                        application.selection && (
                            <Alert
                                severity="success"
                                className="application-feedback"
                            >
                                <strong>Selection update</strong>
                                {application.selection.note}
                            </Alert>
                        )}

                    {isRejected && (
                        <Alert
                            severity="info"
                            className="application-feedback"
                        >
                            <strong>Application update</strong>
                            This application is no longer moving forward.
                            You can continue exploring other opportunities.
                        </Alert>
                    )}

                    <section
                        className="panel-card"
                        aria-labelledby="applicant-details-title"
                    >
                        <header className="panel-card-header">
                            <div>
                                <h2
                                    id="applicant-details-title"
                                    className="panel-card-title"
                                >
                                    Submitted details
                                </h2>

                                <p className="panel-card-description">
                                    Information provided when you applied.
                                </p>
                            </div>

                            <span
                                className="application-section-icon"
                                aria-hidden="true"
                            >
                                <i className="fa-regular fa-user" />
                            </span>
                        </header>

                        <div className="application-card-body">
                            <section className="application-detail-section">
                                <h3>Personal information</h3>

                                <dl className="application-personal-grid">
                                    <div>
                                        <dt>Full name</dt>
                                        <dd>
                                            {applicant.name || "Not provided"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>Email address</dt>
                                        <dd>
                                            {applicant.email || "Not provided"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>Phone number</dt>
                                        <dd>
                                            {applicant.phone || "Not provided"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>Submitted on</dt>
                                        <dd>
                                            {formatApplicationDate(
                                                application.appliedAt,
                                                true
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                            </section>

                            <section className="application-detail-section">
                                <h3>Professional background</h3>

                                <dl className="application-personal-grid">
                                    <div>
                                        <dt>Highest qualification</dt>
                                        <dd>
                                            {applicant.qualification ||
                                                "Not provided"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>Total experience</dt>
                                        <dd>
                                            {applicant.experience ||
                                                "Not provided"}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="application-skills">
                                    <h4>Relevant skills</h4>

                                    {applicant.skills?.length ? (
                                        <div className="application-skill-list">
                                            {applicant.skills.map((skill) => (
                                                <Chip
                                                    key={skill}
                                                    label={skill}
                                                    size="small"
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p>No skills provided.</p>
                                    )}
                                </div>
                            </section>

                            <section className="application-detail-section">
                                <h3>Submitted resume</h3>

                                <div className="application-resume">
                                    <span
                                        className="application-resume-icon"
                                        aria-hidden="true"
                                    >
                                        <i className="fa-regular fa-file-lines" />
                                    </span>

                                    <div>
                                        <h4>
                                            {application.resume?.name ||
                                                "No resume available"}
                                        </h4>

                                        <p>
                                            {canOpenResume
                                                ? "Document submitted with this application."
                                                : "No document is attached to this demo record."}
                                        </p>
                                    </div>

                                    {canOpenResume && (
                                        <Button
                                            component="a"
                                            href={resumeUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            variant="outlined"
                                            className="panel-button panel-button-outline"
                                        >
                                            View resume
                                        </Button>
                                    )}
                                </div>
                            </section>
                        </div>
                    </section>
                </div>

                <section
                    className="panel-card application-progress"
                    aria-labelledby="application-progress-title"
                >
                    <header className="panel-card-header">
                        <div>
                            <h2
                                id="application-progress-title"
                                className="panel-card-title"
                            >
                                Application progress
                            </h2>

                            <p className="panel-card-description">
                                {latestEvent
                                    ? `Last updated: ${formatApplicationDate(
                                          latestEvent.at
                                      )}`
                                    : "No updates available yet."}
                            </p>
                        </div>

                        <span
                            className="application-section-icon"
                            aria-hidden="true"
                        >
                            <i className="fa-solid fa-list-check" />
                        </span>
                    </header>

                    <div className="application-card-body">
                        {timeline.length ? (
                            <Stepper
                                orientation="vertical"
                                nonLinear
                                activeStep={latestIndex}
                                className="application-stepper"
                            >
                                {timeline.map((event, index) => (
                                    <Step
                                        key={`${event.status}-${index}`}
                                        expanded
                                        completed={
                                            event.recorded &&
                                            index !== latestIndex &&
                                            event.status !== "Rejected"
                                        }
                                        disabled={!event.recorded}
                                    >
                                        <StepLabel
                                            error={
                                                event.status === "Rejected"
                                            }
                                        >
                                            {event.status}

                                            {event.recorded &&
                                                index === latestIndex && (
                                                    <span className="application-current-label">
                                                        Current
                                                    </span>
                                                )}
                                        </StepLabel>

                                        <StepContent>
                                            {event.recorded ? (
                                                <>
                                                    <time dateTime={event.at}>
                                                        {formatApplicationDate(
                                                            event.at,
                                                            true
                                                        )}
                                                    </time>

                                                    {event.note && (
                                                        <p>{event.note}</p>
                                                    )}
                                                </>
                                            ) : (
                                                <p>Not reached yet</p>
                                            )}
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