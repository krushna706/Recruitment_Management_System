import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";

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

function Login() {
    const location = useLocation();

    const [showPassword, setShowPassword] = useState(false);
    const [notice, setNotice] = useState("");

    function handleSubmit(event) {
        event.preventDefault();

        // Connect backend login here later.
        setNotice(
            "Sign-in is not available yet. Please try again once the service is connected."
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
                        aria-labelledby="login-introduction-title"
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
                                id="login-introduction-title"
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

                    {/* Login form */}
                    <section
                        className="auth-form-panel"
                        aria-labelledby="login-title"
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
                                    id="login-title"
                                    className="website-section-title"
                                >
                                    Welcome <span>back.</span>
                                </h1>

                                <p className="website-section-description">
                                    Sign in to continue your journey.
                                </p>
                            </header>

                            <form
                                className="auth-form"
                                onSubmit={handleSubmit}
                                onChange={() => setNotice("")}
                            >
                                <TextField
                                    id="login-email"
                                    name="email"
                                    label="Email address"
                                    type="email"
                                    variant="outlined"
                                    className="auth-text-field"
                                    autoComplete="username"
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
                                    id="login-password"
                                    name="password"
                                    label="Password"
                                    type={showPassword ? "text" : "password"}
                                    variant="outlined"
                                    className="auth-text-field"
                                    autoComplete="current-password"
                                    fullWidth
                                    required
                                    slotProps={{
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
                                                        aria-controls="login-password"
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
                                    Sign In
                                    <i
                                        className="fa-solid fa-arrow-right"
                                        aria-hidden="true"
                                    />
                                </Button>
                            </form>

                            <div className="auth-account-row">
                                <p className="auth-switch">
                                    New here?{" "}
                                    <Link
                                        to={{
                                            pathname: "/manage/signup",
                                            search: location.search,
                                        }}
                                        state={location.state}
                                    >
                                        Create an account
                                    </Link>
                                </p>

                                <Link
                                    to="/manage/forgot-password"
                                    className="auth-forgot-link"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default Login;