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

// ================== SIGNUP ERROR MESSAGE ==================
function getSignupErrorMessage(error) {
    if (error.response?.status === 429) {
        const retryAfter = error.response.headers["retry-after"];
        let seconds = Number(retryAfter);

        // Support both seconds and HTTP-date header values.
        if (!Number.isFinite(seconds) && retryAfter) {
            seconds = (Date.parse(retryAfter) - Date.now()) / 1000;
        }

        if (Number.isFinite(seconds) && seconds > 0) {
            const minutes = Math.ceil(seconds / 60);

            return `Too many signup attempts. Please try again after ${
                minutes
            } minute${minutes === 1 ? "" : "s"}.`;
        }

        return "Too many signup attempts. Please try again later.";
    }

    // A timeout does not prove that account creation failed.
    if (error.code === "ECONNABORTED") {
        return "The request timed out. Your account may have been created. Try signing in before submitting again.";
    }

    if (!error.response) {
        return "Unable to confirm account creation. Check your connection and try signing in before submitting again.";
    }

    return (
        error.response.data?.message ||
        "Unable to create your account. Please try again."
    );
}

// ================== SIGNUP PAGE ==================
function Signup() {
    const location = useLocation();
    const { user, loading, authError, refreshUser, signup } = useAuth();

    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Prevent duplicate submissions before the button updates.
    const submitLock = useRef(false);

    // ================== SESSION ERROR FEEDBACK ==================
    useEffect(() => {
        if (authError) {
            toast.error(authError, { toastId: "auth-session-error" });
        }
    }, [authError]);

    // ================== SIGNUP SUBMISSION ==================
    async function handleSubmit(event) {
        event.preventDefault();

        if (submitLock.current || loading || authError) {
            return;
        }

        const formData = new FormData(event.currentTarget);

        const name = String(formData.get("name") || "").trim();
        const email = String(formData.get("email") || "")
            .trim()
            .toLowerCase();
        const phone = String(formData.get("phone") || "").trim();
        const password = String(formData.get("password") || "");

        if (name.length < 2 || name.length > 100) {
            toast.error("Name must contain between 2 and 100 characters.");
            return;
        }

        if (
            !email ||
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            toast.error("Enter a valid email address.");
            return;
        }

        if (!/^[6-9]\d{9}$/.test(phone)) {
            toast.error(
                "Enter a valid 10-digit Indian mobile number without +91."
            );
            return;
        }

        if (password.length < 6) {
            toast.error("Password must contain at least 6 characters.");
            return;
        }

        if (new TextEncoder().encode(password).length > 72) {
            toast.error("Password cannot exceed 72 UTF-8 bytes.");
            return;
        }

        submitLock.current = true;
        setIsSubmitting(true);

        try {
            // Send only the fields accepted by the public signup endpoint.
            const data = await signup({ name, email, phone, password });

            toast.success(data.message || "Account created successfully.");
            // Auth state updates automatically after successful signup.
        } catch (error) {
            toast.error(getSignupErrorMessage(error));
        } finally {
            submitLock.current = false;
            setIsSubmitting(false);
        }
    }

    // ================== AUTHENTICATED REDIRECT ==================
    if (!loading && !authError && user) {
        // Reuse Login's destination rules while preserving navigation intent.
        // Login detects the existing session without making a login request.
        return (
            <Navigate
                to={{ pathname: "/manage", search: location.search }}
                state={location.state}
                replace
            />
        );
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

                                <h1 id="signup-title" className="website-section-title">
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
                                aria-busy={loading || isSubmitting}
                                noValidate
                            >
                                <TextField
                                    id="signup-name"
                                    name="name"
                                    label="Full name"
                                    variant="outlined"
                                    className="auth-text-field"
                                    autoComplete="name"
                                    disabled={formDisabled}
                                    fullWidth
                                    required
                                    slotProps={{
                                        htmlInput: {
                                            minLength: 2,
                                            maxLength: 100,
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
                                    id="signup-phone"
                                    name="phone"
                                    label="Phone number"
                                    type="tel"
                                    variant="outlined"
                                    className="auth-text-field"
                                    autoComplete="tel-national"
                                    disabled={formDisabled}
                                    fullWidth
                                    required
                                    slotProps={{
                                        htmlInput: {
                                            inputMode: "numeric",
                                            maxLength: 10,
                                            pattern: "[6-9][0-9]{9}",
                                            title:
                                                "Enter a valid 10-digit Indian mobile number.",
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
                                    disabled={formDisabled}
                                    fullWidth
                                    required
                                    slotProps={{
                                        htmlInput: {
                                            minLength: 6,
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
                                          ? "Creating account..."
                                          : "Create Account"}

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