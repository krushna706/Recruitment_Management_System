import usePageSEO from "../hooks/usePageSEO";
import { seoPages } from "../config/seoConfig";

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Button, CircularProgress, IconButton, InputAdornment, TextField } from "@mui/material";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// ================== RECOVERY CONFIGURATION ==================
const OTP_LENGTH = 6;
const OTP_VALIDITY_MINUTES = 10;
const DEFAULT_RESEND_SECONDS = 60;

// ================== RECOVERY STEPS ==================
const recoverySteps = [
    {
        title: "Find your account",
        description: "Enter your registered email address or mobile number.",
    },
    {
        title: "Verify email OTP",
        description: "Enter the 6-digit code sent to your registered email.",
    },
    {
        title: "Set a new password",
        description: "Create a new password and return to sign in.",
    },
];

const stepContent = [
    {
        title: "Forgot your",
        accent: "password?",
        description: "Enter your registered email or phone number to begin account recovery.",
        button: "Send verification code",
    },
    {
        title: "Verify your",
        accent: "email OTP.",
        description: "Enter the 6-digit verification code from your email inbox.",
        button: "Verify OTP",
    },
    {
        title: "Create a new",
        accent: "password.",
        description: "Choose a secure password to regain access to your account.",
        button: "Reset password",
    },
];

// ================== API ERROR MESSAGE ==================
function getErrorMessage(error, fallback) {
    if (error.response?.status === 429) {
        return "Too many requests. Please try again later.";
    }

    if (error.code === "ECONNABORTED") {
        return "The request timed out. Please try again.";
    }

    if (!error.response) {
        return "Unable to connect to the server. Please try again.";
    }

    return error.response.data?.message || fallback;
}

// ================== ACCOUNT IDENTIFIER VALIDATION ==================
function validIdentifier(value) {
    return (
        /^[6-9]\d{9}$/.test(value) ||
        (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254)
    );
}

// ================== PASSWORD VISIBILITY CONTROL ==================
function PasswordVisibility({ visible, onToggle, label }) {
    return (
        <InputAdornment position="end">
            <IconButton
                type="button"
                className="auth-password-toggle"
                aria-label={visible ? `Hide ${label}` : `Show ${label}`}
                onClick={onToggle}
                onMouseDown={(event) => event.preventDefault()}
                edge="end"
            >
                <i
                    className={`fa-solid ${visible ? "fa-eye-slash" : "fa-eye"}`}
                    aria-hidden="true"
                />
            </IconButton>
        </InputAdornment>
    );
}

// ================== FORGOT PASSWORD PAGE ==================
function ForgotPassword() {
    usePageSEO(seoPages.forgotPassword);
    
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const submitLock = useRef(false);

    // ================== FORM STATE ==================
    const [step, setStep] = useState(0);
    const [identifier, setIdentifier] = useState("");
    const [otp, setOtp] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [maskedEmail, setMaskedEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);

    // ================== RESEND COOLDOWN ==================
    const [resendAt, setResendAt] = useState(0);
    const [resendSeconds, setResendSeconds] = useState(0);

    useEffect(() => {
        if (step !== 1 || !resendAt) return undefined;

        const updateRemaining = () => {
            setResendSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
        };

        updateRemaining();
        const timer = setInterval(updateRemaining, 1000);
        return () => clearInterval(timer);
    }, [step, resendAt]);

    function startCooldown(seconds = DEFAULT_RESEND_SECONDS) {
        setResendAt(Date.now() + seconds * 1000);
        setResendSeconds(seconds);
    }

    // ================== REQUEST OTP ==================
    async function requestOtp(isResend = false) {
        const normalized = identifier.trim().toLowerCase();

        if (!validIdentifier(normalized)) {
            setError("Enter a valid email address or 10-digit Indian mobile number.");
            return;
        }

        if (submitLock.current) return;
        submitLock.current = true;
        setBusy(true);
        setError("");

        try {
            const { data } = await api.post(
                "/auth/forgot-password/request",
                { identifier: normalized },
                { skipSessionHandling: true }
            );

            if (!data?.success) {
                throw new Error("OTP request was not confirmed.");
            }

            setIdentifier(normalized);
            setOtp("");
            setResetToken("");
            setNotice(
                data.message ||
                    "If your account is active, an OTP will be sent to its registered email."
            );
            startCooldown(Number(data.resendCooldownSeconds) || DEFAULT_RESEND_SECONDS);
            setStep(1);

            if (isResend) {
                toast.info("If the account is eligible, a new OTP has been requested.");
            }
        } catch (requestError) {
            setError(getErrorMessage(requestError, "Unable to request OTP."));
        } finally {
            submitLock.current = false;
            setBusy(false);
        }
    }

    // ================== VERIFY EMAIL OTP ==================
    async function verifyOtp() {
        if (!/^\d{6}$/.test(otp)) {
            setError("Enter the complete 6-digit OTP.");
            return;
        }

        if (submitLock.current) return;
        submitLock.current = true;
        setBusy(true);
        setError("");

        try {
            const { data } = await api.post(
                "/auth/forgot-password/verify",
                { identifier, otp },
                { skipSessionHandling: true }
            );

            if (!data?.success || !/^[a-f0-9]{64}$/.test(data.resetToken || "")) {
                throw new Error("OTP verification was not confirmed.");
            }

            setResetToken(data.resetToken);
            setMaskedEmail(data.maskedEmail || "");
            setOtp("");
            setNotice("");
            setStep(2);
            toast.success("OTP verified successfully.");
        } catch (verificationError) {
            setError(getErrorMessage(verificationError, "Invalid or expired OTP."));
        } finally {
            submitLock.current = false;
            setBusy(false);
        }
    }

    // ================== RESET PASSWORD ==================
    async function resetPassword() {
        if (newPassword.length < 6 || new TextEncoder().encode(newPassword).length > 72) {
            setError("Password must be at least 6 characters and at most 72 UTF-8 bytes.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New password and confirm password do not match.");
            return;
        }

        if (!resetToken) {
            setError("Reset verification has expired. Start again.");
            return;
        }

        if (submitLock.current) return;
        submitLock.current = true;
        setBusy(true);
        setError("");

        try {
            const { data } = await api.post(
                "/auth/forgot-password/reset",
                { resetToken, newPassword },
                { skipSessionHandling: true }
            );

            if (!data?.success) {
                throw new Error("Password reset was not confirmed.");
            }

            setResetToken("");
            setNewPassword("");
            setConfirmPassword("");
            await refreshUser();
            toast.success("Password reset successful. Please sign in with your new password.");
            navigate("/manage", { replace: true });
        } catch (resetError) {
            setError(getErrorMessage(resetError, "Unable to reset password."));
        } finally {
            submitLock.current = false;
            setBusy(false);
        }
    }

    // ================== FORM SUBMISSION ==================
    function handleSubmit(event) {
        event.preventDefault();
        if (busy || submitLock.current) return;

        if (step === 0) requestOtp();
        else if (step === 1) verifyOtp();
        else resetPassword();
    }

    // ================== RESEND OTP ==================
    function handleResend() {
        if (step !== 1 || resendSeconds > 0 || busy) return;
        requestOtp(true);
    }

    // ================== RESTART RECOVERY ==================
    function restartRecovery() {
        if (busy) return;
        setStep(0);
        setIdentifier("");
        setOtp("");
        setResetToken("");
        setMaskedEmail("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
        setResendAt(0);
        setResendSeconds(0);
        setError("");
        setNotice("");
    }

    const currentContent = stepContent[step];

    return (
        <div className="website-layout auth-layout">
            <main className="auth-main">
                {/* ================== RETURN TO LOGIN ================== */}
                <div className="auth-topbar">
                    <Link to="/manage" className="auth-back-link">
                        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                        Back to Sign In
                    </Link>
                </div>

                <div className="auth-card">
                    {/* ================== RECOVERY INTRODUCTION ================== */}
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
                            <p className="website-section-label">ACCOUNT RECOVERY</p>
                            <h2 id="recovery-introduction-title" className="website-section-title">
                                A fresh start.
                                <span> Back to your journey.</span>
                            </h2>
                            <p className="website-section-description">
                                Follow these steps to reset your password and regain access to your
                                account.
                            </p>

                            <ol className="auth-features auth-recovery-steps">
                                {recoverySteps.map((item, index) => (
                                    <li
                                        key={item.title}
                                        className={index <= step ? "is-active" : ""}
                                        aria-current={index === step ? "step" : undefined}
                                    >
                                        <span className="auth-feature-icon">
                                            {index < step ? (
                                                <i
                                                    className="fa-solid fa-check"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <span aria-hidden="true">{index + 1}</span>
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

                    {/* ================== RECOVERY FORM ================== */}
                    <section className="auth-form-panel" aria-labelledby="recovery-title">
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
                                <h1 id="recovery-title" className="website-section-title">
                                    {currentContent.title}
                                    <span> {currentContent.accent}</span>
                                </h1>
                                <p className="website-section-description">
                                    {currentContent.description}
                                </p>
                            </header>

                            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                                {/* ================== ACCOUNT IDENTIFIER ================== */}
                                {step === 0 && (
                                    <TextField
                                        id="recovery-identifier"
                                        name="identifier"
                                        label="Email address or phone number"
                                        type="text"
                                        variant="outlined"
                                        className="auth-text-field"
                                        autoComplete="username"
                                        value={identifier}
                                        disabled={busy}
                                        onChange={(event) => {
                                            setIdentifier(event.target.value);
                                            setError("");
                                        }}
                                        fullWidth
                                        required
                                        autoFocus
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 254,
                                                autoCapitalize: "none",
                                                spellCheck: false,
                                            },
                                        }}
                                    />
                                )}

                                {/* ================== VERIFY EMAIL OTP ================== */}
                                {step === 1 && (
                                    <>
                                        <div className="auth-recovery-question" role="status">
                                            <span className="auth-feature-icon">
                                                <i
                                                    className="fa-solid fa-envelope-circle-check"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <div>
                                                <p>Email verification</p>
                                                <h2>Check your registered email inbox</h2>
                                                <p>
                                                    If an active account matches, an OTP has been
                                                    requested. Check Inbox and Spam. Codes expire in{" "}
                                                    {OTP_VALIDITY_MINUTES} minutes.
                                                </p>
                                            </div>
                                        </div>

                                        {notice && (
                                            <div className="auth-notice is-visible" role="status">
                                                {notice}
                                            </div>
                                        )}

                                        <TextField
                                            id="recovery-otp"
                                            name="otp"
                                            label="6-digit verification code"
                                            value={otp}
                                            onChange={(event) => {
                                                setOtp(
                                                    event.target.value
                                                        .replace(/\D/g, "")
                                                        .slice(0, OTP_LENGTH)
                                                );
                                                setError("");
                                            }}
                                            variant="outlined"
                                            className="auth-text-field"
                                            autoComplete="one-time-code"
                                            fullWidth
                                            required
                                            autoFocus
                                            disabled={busy}
                                            helperText="Use the OTP from your registered email. Maximum 5 incorrect attempts."
                                            slotProps={{
                                                htmlInput: {
                                                    maxLength: OTP_LENGTH,
                                                    inputMode: "numeric",
                                                    pattern: "[0-9]*",
                                                },
                                            }}
                                        />

                                        <Button
                                            type="button"
                                            className="auth-restart"
                                            onClick={handleResend}
                                            disabled={busy || resendSeconds > 0}
                                        >
                                            {resendSeconds > 0
                                                ? `Resend OTP in ${resendSeconds}s`
                                                : "Resend OTP"}
                                        </Button>
                                    </>
                                )}

                                {/* ================== NEW PASSWORD ================== */}
                                {step === 2 && (
                                    <>
                                        {maskedEmail && (
                                            <div className="auth-recovery-question" role="status">
                                                <span className="auth-feature-icon">
                                                    <i
                                                        className="fa-solid fa-shield-halved"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <div>
                                                    <p>OTP verified for</p>
                                                    <h2>{maskedEmail}</h2>
                                                    <p>
                                                        Your reset authorization expires in 10
                                                        minutes.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <TextField
                                            id="recovery-new-password"
                                            name="newPassword"
                                            label="New password"
                                            type={showPassword ? "text" : "password"}
                                            variant="outlined"
                                            className="auth-text-field"
                                            autoComplete="new-password"
                                            value={newPassword}
                                            disabled={busy}
                                            onChange={(event) => {
                                                setNewPassword(event.target.value);
                                                setError("");
                                            }}
                                            fullWidth
                                            autoFocus
                                            required
                                            helperText="Minimum 6 characters, maximum 72 UTF-8 bytes."
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <PasswordVisibility
                                                            visible={showPassword}
                                                            onToggle={() =>
                                                                setShowPassword(
                                                                    (previous) => !previous
                                                                )
                                                            }
                                                            label="new password"
                                                        />
                                                    ),
                                                },
                                            }}
                                        />

                                        <TextField
                                            id="recovery-confirm-password"
                                            name="confirmPassword"
                                            label="Confirm new password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            variant="outlined"
                                            className="auth-text-field"
                                            autoComplete="new-password"
                                            value={confirmPassword}
                                            disabled={busy}
                                            onChange={(event) => {
                                                setConfirmPassword(event.target.value);
                                                setError("");
                                            }}
                                            fullWidth
                                            required
                                            slotProps={{
                                                input: {
                                                    endAdornment: (
                                                        <PasswordVisibility
                                                            visible={showConfirmPassword}
                                                            onToggle={() =>
                                                                setShowConfirmPassword(
                                                                    (previous) => !previous
                                                                )
                                                            }
                                                            label="confirm password"
                                                        />
                                                    ),
                                                },
                                            }}
                                        />
                                    </>
                                )}

                                {/* ================== VALIDATION / API ERROR ================== */}
                                {error && (
                                    <div className="auth-notice is-visible" role="alert">
                                        {error}
                                    </div>
                                )}

                                {/* ================== MAIN ACTION ================== */}
                                <Button
                                    type="submit"
                                    variant="contained"
                                    className="website-button website-button-primary auth-submit"
                                    disableElevation
                                    disabled={busy}
                                    fullWidth
                                >
                                    {busy ? (
                                        <>
                                            <CircularProgress size={18} color="inherit" />
                                            Please wait...
                                        </>
                                    ) : (
                                        <>
                                            {currentContent.button}
                                            <i
                                                className="fa-solid fa-arrow-right"
                                                aria-hidden="true"
                                            />
                                        </>
                                    )}
                                </Button>

                                {step > 0 && (
                                    <Button
                                        type="button"
                                        className="auth-restart"
                                        onClick={restartRecovery}
                                        disabled={busy}
                                    >
                                        Start again
                                    </Button>
                                )}
                            </form>

                            <div className="auth-account-row auth-account-row-center">
                                <p className="auth-switch">
                                    Remember your password? <Link to="/manage">Sign in</Link>
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
