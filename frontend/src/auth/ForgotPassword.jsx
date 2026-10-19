import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";

const recoverySteps = [
    {
        title: "Find your account",
        description:
            "Enter the email address or phone number you registered with.",
    },
    {
        title: "Answer your question",
        description: "Answer the security question you selected during signup.",
    },
    {
        title: "Set a new password",
        description: "Choose a new password and return to sign in.",
    },
];

const stepContent = [
    {
        title: "Forgot your",
        accent: "password?",
        description:
            "Enter your registered email address or phone number to get started.",
        button: "Continue",
    },
    {
        title: "Verify your",
        accent: "answer.",
        description: "Answer your security question to continue.",
        button: "Continue to New Password",
    },
    {
        title: "Create a new",
        accent: "password.",
        description: "Choose a new password for your account.",
        button: "Finish Preview",
    },
];

function ForgotPassword() {
    const navigate = useNavigate();

    const [step, setStep] = useState(0);
    const [identifier, setIdentifier] = useState("");
    const [securityAnswer, setSecurityAnswer] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [showAnswer, setShowAnswer] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    // Temporary sample question for frontend preview.
    // Replace it with the user's saved question during backend integration.
    const securityQuestion = "What is your favourite food?";

    const currentContent = stepContent[step];

    function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (step === 0) {
            if (!identifier.trim()) {
                setError("Enter your email address or phone number.");
                return;
            }

            // Demo only: no database lookup.
            setStep(1);
            return;
        }

        if (step === 1) {
            if (!securityAnswer.trim()) {
                setError("Enter your security answer.");
                return;
            }

            // Demo only: any non-empty answer advances to the next step.
            setSecurityAnswer("");
            setShowAnswer(false);
            setStep(2);
            return;
        }

        if (newPassword.length < 8) {
            setError("Use a password with at least 8 characters.");
            return;
        }

        // Demo only: no password is saved or updated.
        setNewPassword("");

        toast.info("Preview complete. No password was changed.");

        navigate("/manage", { replace: true });
    }

    function restartRecovery() {
        setStep(0);
        setIdentifier("");
        setSecurityAnswer("");
        setNewPassword("");
        setShowAnswer(false);
        setShowPassword(false);
        setError("");
    }

    return (
        <div className="website-layout auth-layout">
            <main className="auth-main">
                <div className="auth-topbar">
                    <Link to="/manage" className="auth-back-link">
                        <i
                            className="fa-solid fa-arrow-left"
                            aria-hidden="true"
                        />
                        Back to Sign In
                    </Link>
                </div>

                <div className="auth-card">
                    {/* Recovery introduction */}
                    <aside
                        className="auth-introduction"
                        aria-labelledby="recovery-introduction-title"
                    >
                        <img
                            className="auth-background"
                            src="/images/about-banner.jpg"
                            alt=""
                            decoding="async"
                        />

                        <div className="auth-introduction-content">
                            <p className="website-section-label">
                                ACCOUNT RECOVERY
                            </p>

                            <h2
                                id="recovery-introduction-title"
                                className="website-section-title"
                            >
                                A fresh start.
                                <span> Back to your journey.</span>
                            </h2>

                            <p className="website-section-description">
                                Follow these steps to reset your password and
                                regain access to your account.
                            </p>

                            <ol className="auth-features auth-recovery-steps">
                                {recoverySteps.map((item, index) => (
                                    <li
                                        key={item.title}
                                        className={
                                            index <= step ? "is-active" : ""
                                        }
                                        aria-current={
                                            index === step ? "step" : undefined
                                        }
                                    >
                                        <span className="auth-feature-icon">
                                            {index < step ? (
                                                <i
                                                    className="fa-solid fa-check"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <span aria-hidden="true">
                                                    {index + 1}
                                                </span>
                                            )}
                                        </span>

                                        <div>
                                            <h3>{item.title}</h3>
                                            <p>{item.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <p className="auth-introduction-note">
                            After resetting your password, sign in to continue.
                        </p>
                    </aside>

                    {/* Recovery form */}
                    <section
                        className="auth-form-panel"
                        aria-labelledby="recovery-title"
                    >
                        <div className="auth-form-content">
                            <header className="auth-form-header">
                                <Link
                                    to="/"
                                    className="website-brand auth-brand"
                                    aria-label="Company home"
                                >
                                    <img
                                        src="/images/company_logo.svg"
                                        alt="Company logo"
                                        width="148"
                                        height="40"
                                    />
                                </Link>

                                <p
                                    className="website-section-label"
                                    aria-live="polite"
                                    aria-atomic="true"
                                >
                                    STEP {step + 1} OF 3
                                </p>

                                <h1
                                    id="recovery-title"
                                    className="website-section-title"
                                >
                                    {currentContent.title}
                                    <span> {currentContent.accent}</span>
                                </h1>

                                <p className="website-section-description">
                                    {currentContent.description}
                                </p>
                            </header>

                            <form className="auth-form" onSubmit={handleSubmit}>
                                <div className="auth-notice is-visible">
                                    Frontend preview only. Account details and
                                    answers are not verified. Use sample
                                    details; no password will be changed.
                                </div>

                                {step === 0 && (
                                    <TextField
                                        key="identifier"
                                        id="recovery-identifier"
                                        name="identifier"
                                        label="Email address or phone number"
                                        type="text"
                                        variant="outlined"
                                        className="auth-text-field"
                                        autoComplete="off"
                                        value={identifier}
                                        onChange={(event) => {
                                            setIdentifier(event.target.value);
                                            setError("");
                                        }}
                                        fullWidth
                                        required
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 254,
                                                autoCapitalize: "none",
                                                spellCheck: false,
                                            },
                                        }}
                                    />
                                )}

                                {step === 1 && (
                                    <>
                                        <div className="auth-recovery-question">
                                            <span className="auth-feature-icon">
                                                <i
                                                    className="fa-solid fa-circle-question"
                                                    aria-hidden="true"
                                                />
                                            </span>

                                            <div>
                                                <p>Sample security question</p>

                                                <h2 id="recovery-question">
                                                    {securityQuestion}
                                                </h2>
                                            </div>
                                        </div>

                                        <TextField
                                            key="security-answer"
                                            id="recovery-answer"
                                            name="securityAnswer"
                                            label="Your answer"
                                            type={
                                                showAnswer ? "text" : "password"
                                            }
                                            variant="outlined"
                                            className="auth-text-field"
                                            autoComplete="off"
                                            helperText="For this preview, enter any answer to continue."
                                            value={securityAnswer}
                                            onChange={(event) => {
                                                setSecurityAnswer(
                                                    event.target.value,
                                                );
                                                setError("");
                                            }}
                                            autoFocus
                                            fullWidth
                                            required
                                            slotProps={{
                                                htmlInput: {
                                                    maxLength: 100,
                                                    autoCapitalize: "none",
                                                    spellCheck: false,
                                                    "aria-describedby":
                                                        "recovery-question recovery-answer-helper-text",
                                                },
                                                input: {
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                type="button"
                                                                className="auth-password-toggle"
                                                                aria-label={
                                                                    showAnswer
                                                                        ? "Hide answer"
                                                                        : "Show answer"
                                                                }
                                                                aria-controls="recovery-answer"
                                                                onClick={() =>
                                                                    setShowAnswer(
                                                                        (
                                                                            current,
                                                                        ) =>
                                                                            !current,
                                                                    )
                                                                }
                                                                onMouseDown={(
                                                                    event,
                                                                ) =>
                                                                    event.preventDefault()
                                                                }
                                                                edge="end"
                                                            >
                                                                <i
                                                                    className={`fa-solid ${
                                                                        showAnswer
                                                                            ? "fa-eye-slash"
                                                                            : "fa-eye"
                                                                    }`}
                                                                    aria-hidden="true"
                                                                />
                                                            </IconButton>
                                                        </InputAdornment>
                                                    ),
                                                },
                                            }}
                                        />
                                    </>
                                )}

                                {step === 2 && (
                                    <TextField
                                        key="new-password"
                                        id="recovery-new-password"
                                        name="newPassword"
                                        label="New password"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        variant="outlined"
                                        className="auth-text-field"
                                        autoComplete="new-password"
                                        helperText="Use a sample password with at least 8 characters."
                                        value={newPassword}
                                        onChange={(event) => {
                                            setNewPassword(event.target.value);
                                            setError("");
                                        }}
                                        autoFocus
                                        fullWidth
                                        required
                                        slotProps={{
                                            htmlInput: {
                                                minLength: 8,
                                            },
                                            input: {
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            type="button"
                                                            className="auth-password-toggle"
                                                            aria-label={
                                                                showPassword
                                                                    ? "Hide password"
                                                                    : "Show password"
                                                            }
                                                            aria-controls="recovery-new-password"
                                                            onClick={() =>
                                                                setShowPassword(
                                                                    (current) =>
                                                                        !current,
                                                                )
                                                            }
                                                            onMouseDown={(
                                                                event,
                                                            ) =>
                                                                event.preventDefault()
                                                            }
                                                            edge="end"
                                                        >
                                                            <i
                                                                className={`fa-solid ${
                                                                    showPassword
                                                                        ? "fa-eye-slash"
                                                                        : "fa-eye"
                                                                }`}
                                                                aria-hidden="true"
                                                            />
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            },
                                        }}
                                    />
                                )}

                                {error && (
                                    <div
                                        className="auth-notice is-visible"
                                        role="alert"
                                    >
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    variant="contained"
                                    className="website-button website-button-primary auth-submit"
                                    disableElevation
                                    fullWidth
                                >
                                    {currentContent.button}

                                    <i
                                        className="fa-solid fa-arrow-right"
                                        aria-hidden="true"
                                    />
                                </Button>

                                {step > 0 && (
                                    <Button
                                        type="button"
                                        className="auth-restart"
                                        onClick={restartRecovery}
                                    >
                                        Start again
                                    </Button>
                                )}
                            </form>

                            <div className="auth-account-row auth-account-row-center">
                                <p className="auth-switch">
                                    Remember your password?{" "}
                                    <Link to="/manage">Sign in</Link>
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default ForgotPassword;
