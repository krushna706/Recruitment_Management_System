import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { TextField, InputAdornment, IconButton, Button } from "@mui/material";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";

// ================== INTRODUCTION CONTENT ==================
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

// ================== LOGIN DESTINATION ==================
function getLoginDestination(user, location) {
    if (user.role === "admin") {
        return "/manage/dashboard";
    }

    const returnTo = location.state?.returnTo;

    // Accept only approved internal user destinations.
    if (typeof returnTo === "string") {
        const safeJobPath = /^\/jobs\/[a-zA-Z0-9_-]+$/;
        const safeCareerPath = /^\/careers\/[a-fA-F0-9]{24}\/apply$/;
        const safePanelPath =
            /^\/manage\/(?:dashboard|profile|my-applications(?:\/[a-zA-Z0-9_-]+)?)(?:[?#][^\s\\]*)?$/;

        if (
            safeJobPath.test(returnTo) ||
            safeCareerPath.test(returnTo) ||
            safePanelPath.test(returnTo)
        ) {
            return returnTo;
        }
    }

    const searchParams = new URLSearchParams(location.search);

    return searchParams.get("from") === "website" ? "/" : "/manage/dashboard";
}

// ================== LOGIN ERROR MESSAGE ==================
function getLoginErrorMessage(error) {
    if (error.response?.status === 429) {
        const retryAfter = error.response.headers["retry-after"];
        let seconds = Number(retryAfter);

        // Also support an HTTP-date Retry-After value.
        if (!Number.isFinite(seconds) && retryAfter) {
            seconds = (Date.parse(retryAfter) - Date.now()) / 1000;
        }

        if (Number.isFinite(seconds) && seconds > 0) {
            const minutes = Math.ceil(seconds / 60);

            return `Too many login attempts. Please try again after ${
                minutes
            } minute${minutes === 1 ? "" : "s"}.`;
        }

        return "Too many login attempts. Please try again later.";
    }

    if (error.code === "ECONNABORTED") {
        return "The request timed out. Please try again.";
    }

    if (!error.response) {
        return "Unable to connect to the server. Please try again.";
    }

    return error.response.data?.message || "Unable to login. Please try again.";
}

// ================== LOGIN PAGE ==================
function Login() {
    const location = useLocation();
    const { user, loading, authError, refreshUser, login } = useAuth();

    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Prevent duplicate submissions before React updates the button.
    const submitLock = useRef(false);

    // ================== SESSION ERROR FEEDBACK ==================
    useEffect(() => {
        if (authError) {
            toast.error(authError, { toastId: "auth-session-error" });
        }
    }, [authError]);

    // ================== LOGIN SUBMISSION ==================
    async function handleSubmit(event) {
        event.preventDefault();

        if (submitLock.current || loading || authError) {
            return;
        }

        const formData = new FormData(event.currentTarget);

        const email = String(formData.get("email") || "")
            .trim()
            .toLowerCase();

        const password = String(formData.get("password") || "");

        if (!email || !password) {
            toast.error("Email and password are required.");
            return;
        }

        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error("Enter a valid email address.");
            return;
        }

        // Match the backend bcrypt input limit without changing the password.
        if (new TextEncoder().encode(password).length > 72) {
            toast.error("Password cannot exceed 72 UTF-8 bytes.");
            return;
        }

        submitLock.current = true;
        setIsSubmitting(true);

        try {
            const data = await login({ email, password });

            toast.success(data.message || "Login successful.");
            // Updated auth state triggers the redirect below.
        } catch (error) {
            toast.error(getLoginErrorMessage(error));
        } finally {
            submitLock.current = false;
            setIsSubmitting(false);
        }
    }

    // ================== EXISTING SESSION REDIRECT ==================
    if (!loading && !authError && user) {
        return <Navigate to={getLoginDestination(user, location)} replace />;
    }

    const formDisabled = loading || isSubmitting || Boolean(authError);

    return (
        <div className="website-layout auth-layout">
            <main className="auth-main">
                <div className="auth-topbar">
                    <Link to="/" className="auth-back-link">
                        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                        Back to Home
                    </Link>
                </div>

                <div className="auth-card">
                    {/* Introduction */}
                    <aside className="auth-introduction" aria-labelledby="login-introduction-title">
                        <img
                            className="auth-background"
                            src="/images/about-banner.jpg"
                            alt=""
                            decoding="async"
                        />

                        <div className="auth-introduction-content">
                            <p className="website-section-label">PEOPLE. PURPOSE. POSSIBILITIES.</p>

                            <h2 id="login-introduction-title" className="website-section-title">
                                Your next opportunity.
                                <span> Your next chapter.</span>
                            </h2>

                            <p className="website-section-description">
                                Discover opportunities, share your potential and take the next step
                                in your career.
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
                    <section className="auth-form-panel" aria-labelledby="login-title">
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

                                <h1 id="login-title" className="website-section-title">
                                    Welcome <span>back.</span>
                                </h1>

                                <p className="website-section-description">
                                    Sign in to continue your journey.
                                </p>
                            </header>

                            <form
                                className="auth-form"
                                onSubmit={handleSubmit}
                                aria-busy={loading || isSubmitting}
                                noValidate
                            >
                                <TextField
                                    id="login-email"
                                    name="email"
                                    label="Email address"
                                    type="email"
                                    variant="outlined"
                                    className="auth-text-field"
                                    autoComplete="username"
                                    disabled={formDisabled}
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
                                    disabled={formDisabled}
                                    fullWidth
                                    required
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 72,
                                        },
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        type="button"
                                                        className="auth-password-toggle"
                                                        disabled={formDisabled}
                                                        aria-label={
                                                            showPassword
                                                                ? "Hide password"
                                                                : "Show password"
                                                        }
                                                        aria-pressed={showPassword}
                                                        aria-controls="login-password"
                                                        onClick={() =>
                                                            setShowPassword((current) => !current)
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

                                {authError && !loading && (
                                    <Button
                                        type="button"
                                        variant="outlined"
                                        onClick={refreshUser}
                                        fullWidth
                                    >
                                        Retry session check
                                    </Button>
                                )}

                                <Button
                                    type="submit"
                                    variant="contained"
                                    className="website-button website-button-primary auth-submit"
                                    disabled={formDisabled}
                                    disableElevation
                                    fullWidth
                                >
                                    {loading
                                        ? "Checking session..."
                                        : isSubmitting
                                          ? "Signing in..."
                                          : "Sign In"}

                                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
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

                                {/* Available for both User and Admin accounts. */}
                                <Link to="/manage/forgot-password" className="auth-forgot-link">
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
