import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";

const features = [
    {
        icon: "fa-magnifying-glass",
        title: "Explore opportunities",
        description: "Find roles that match your skills and interests.",
    },
    {
        icon: "fa-file-lines",
        title: "Keep applications organized",
        description: "View your applications together in one place.",
    },
    {
        icon: "fa-arrow-trend-up",
        title: "Follow your progress",
        description: "Stay informed about your application status.",
    },
];

const securityQuestions = [
    {
        id: "favorite_food",
        label: "What is your favourite food?",
    },
    {
        id: "childhood_nickname",
        label: "What was your childhood nickname?",
    },
    {
        id: "first_school",
        label: "What was the name of your first school?",
    },
    {
        id: "favorite_place",
        label: "What is your favourite place?",
    },
];

function Signup() {
    const location = useLocation();

    const [showPassword, setShowPassword] = useState(false);
    const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);
    const [securityQuestion, setSecurityQuestion] = useState("");
    const [questionError, setQuestionError] = useState("");
    const [answerError, setAnswerError] = useState("");
    const [notice, setNotice] = useState("");

    function handleSubmit(event) {
        event.preventDefault();
        setNotice("");

        const form = event.currentTarget;
        const formData = new FormData(form);

        const securityAnswer = String(
            formData.get("securityAnswer") || ""
        ).trim();

        const isValidQuestion = securityQuestions.some(
            (question) => question.id === securityQuestion
        );

        setQuestionError(
            isValidQuestion ? "" : "Please select a security question."
        );

        setAnswerError(
            securityAnswer.length >= 3
                ? ""
                : "Enter an answer with at least 3 characters."
        );

        if (!isValidQuestion || securityAnswer.length < 3) {
            return;
        }

        // Connect backend signup here later.
        // The backend must validate all fields and assign role: user.
        // Never log or store passwords/security answers in browser storage.

        setNotice(
            "Account creation is not available yet. Please try again once the service is connected."
        );
    }

    return (
        <div className="website-layout auth-layout">
            <main className="auth-main">
                <div className="auth-topbar">
                    <Link to="/" className="auth-back-link">
                        <i
                            className="fa-solid fa-arrow-left"
                            aria-hidden="true"
                        />
                        Back to Home
                    </Link>
                </div>

                <div className="auth-card">
                    {/* Introduction */}
                    <aside
                        className="auth-introduction"
                        aria-labelledby="signup-introduction-title"
                    >
                        <img
                            className="auth-background"
                            src="/images/about-banner.jpg"
                            alt=""
                            decoding="async"
                        />

                        <div className="auth-introduction-content">
                            <p className="website-section-label">
                                PEOPLE. PURPOSE. POSSIBILITIES.
                            </p>

                            <h2
                                id="signup-introduction-title"
                                className="website-section-title"
                            >
                                Your next opportunity.
                                <span> Your next chapter.</span>
                            </h2>

                            <p className="website-section-description">
                                Discover opportunities, share your potential
                                and take the next step in your career.
                            </p>

                            <ul className="auth-features">
                                {features.map((feature) => (
                                    <li key={feature.title}>
                                        <span className="auth-feature-icon">
                                            <i
                                                className={`fa-solid ${feature.icon}`}
                                                aria-hidden="true"
                                            />
                                        </span>

                                        <div>
                                            <h3>{feature.title}</h3>
                                            <p>{feature.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p className="auth-introduction-note">
                            Great possibilities begin with a simple step.
                        </p>
                    </aside>

                    {/* Signup form */}
                    <section
                        className="auth-form-panel"
                        aria-labelledby="signup-title"
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

                                <h1
                                    id="signup-title"
                                    className="website-section-title"
                                >
                                    Create your
                                    <span> account.</span>
                                </h1>

                                <p className="website-section-description">
                                    Join us to apply for roles and
                                    follow your progress.
                                </p>
                            </header>

                            <form
                                className="auth-form"
                                onSubmit={handleSubmit}
                                onChange={() => setNotice("")}
                            >
                                <TextField
                                    id="signup-name"
                                    name="name"
                                    label="Full name"
                                    variant="outlined"
                                    className="auth-text-field"
                                    autoComplete="name"
                                    fullWidth
                                    required
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 100,
                                            pattern: ".*\\S.*",
                                            title: "Please enter your name.",
                                        },
                                    }}
                                />

                                <TextField
                                    id="signup-email"
                                    name="email"
                                    label="Email address"
                                    type="email"
                                    variant="outlined"
                                    className="auth-text-field"
                                    autoComplete="email"
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

                                <TextField
                                    id="signup-phone"
                                    name="phone"
                                    label="Phone number"
                                    type="tel"
                                    variant="outlined"
                                    className="auth-text-field"
                                    autoComplete="tel"
                                    fullWidth
                                    required
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 25,
                                            pattern: ".*[0-9].*",
                                            title:
                                                "Please enter a phone number containing digits.",
                                        },
                                    }}
                                />

                                <TextField
                                    id="signup-password"
                                    name="password"
                                    label="Password"
                                    type={showPassword ? "text" : "password"}
                                    variant="outlined"
                                    className="auth-text-field"
                                    autoComplete="new-password"
                                    helperText="Use at least 8 characters."
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
                                                        aria-controls="signup-password"
                                                        onClick={() =>
                                                            setShowPassword(
                                                                (current) => !current
                                                            )
                                                        }
                                                        onMouseDown={(event) =>
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

                                <TextField
                                    id="signup-security-question"
                                    name="securityQuestion"
                                    label="Security question"
                                    variant="outlined"
                                    className="auth-text-field"
                                    value={securityQuestion}
                                    onChange={(event) => {
                                        setSecurityQuestion(event.target.value);
                                        setQuestionError("");
                                        setNotice("");
                                    }}
                                    error={Boolean(questionError)}
                                    helperText={
                                        questionError ||
                                        "Choose a question for password recovery."
                                    }
                                    select
                                    fullWidth
                                    required
                                >
                                    {securityQuestions.map((question) => (
                                        <MenuItem
                                            key={question.id}
                                            value={question.id}
                                            sx={{ whiteSpace: "normal" }}
                                        >
                                            {question.label}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    id="signup-security-answer"
                                    name="securityAnswer"
                                    label="Security answer"
                                    type={
                                        showSecurityAnswer
                                            ? "text"
                                            : "password"
                                    }
                                    variant="outlined"
                                    className="auth-text-field"
                                    autoComplete="off"
                                    error={Boolean(answerError)}
                                    helperText={
                                        answerError ||
                                        "Remember your answer. Avoid answers others can easily guess."
                                    }
                                    onChange={() => setAnswerError("")}
                                    fullWidth
                                    required
                                    slotProps={{
                                        htmlInput: {
                                            minLength: 3,
                                            maxLength: 100,
                                            pattern: ".*\\S.*",
                                            autoCapitalize: "none",
                                            spellCheck: false,
                                        },
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        type="button"
                                                        className="auth-password-toggle"
                                                        aria-label={
                                                            showSecurityAnswer
                                                                ? "Hide security answer"
                                                                : "Show security answer"
                                                        }
                                                        aria-controls="signup-security-answer"
                                                        onClick={() =>
                                                            setShowSecurityAnswer(
                                                                (current) => !current
                                                            )
                                                        }
                                                        onMouseDown={(event) =>
                                                            event.preventDefault()
                                                        }
                                                        edge="end"
                                                    >
                                                        <i
                                                            className={`fa-solid ${
                                                                showSecurityAnswer
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

                                <div
                                    className={`auth-notice ${
                                        notice ? "is-visible" : ""
                                    }`}
                                    role="status"
                                    aria-live="polite"
                                    aria-atomic="true"
                                >
                                    {notice}
                                </div>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    className="website-button website-button-primary auth-submit"
                                    disableElevation
                                    fullWidth
                                >
                                    Create Account
                                    <i
                                        className="fa-solid fa-arrow-right"
                                        aria-hidden="true"
                                    />
                                </Button>
                            </form>

                            <div className="auth-account-row auth-account-row-center">
                                <p className="auth-switch">
                                    Already have an account?{" "}
                                    <Link
                                        to={{
                                            pathname: "/manage",
                                            search: location.search,
                                        }}
                                        state={location.state}
                                    >
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default Signup;