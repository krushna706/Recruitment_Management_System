
const bcrypt = require("bcrypt");
const {
    createHash,
    createHmac,
    randomBytes,
    randomInt,
    timingSafeEqual,
} = require("node:crypto");

const User = require("../models/User");
const ExpressError = require("../utils/ExpressError");

const {
    sendPasswordResetOtpEmail,
    OTP_VALIDITY_MINUTES,
} = require("../config/email");

// ================== PASSWORD RESET CONFIGURATION ==================
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_WINDOW_MS = 60 * 60 * 1000;
const MAX_OTP_REQUESTS_PER_HOUR = 10;
const MAX_WRONG_OTP_ATTEMPTS = 5;
const RESET_TOKEN_VALIDITY_MS = 10 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

const GENERIC_REQUEST_MESSAGE =
    "If an active account matches these details, a verification code will be sent to its registered email.";

const INVALID_OTP_MESSAGE =
    "Invalid or expired verification code.";

// ================== NO-CACHE RESPONSE ==================
function sendNoCache(res, status, payload) {
    res.set("Cache-Control", "no-store");
    return res.status(status).json(payload);
}

// ================== LOOK UP ACCOUNT ==================
// Phone numbers may not be unique in older data.
// Fail closed when the phone number matches multiple accounts.
async function findRecoveryAccount(identifier) {
    const normalized = identifier.trim().toLowerCase();

    if (normalized.includes("@")) {
        return User.findOne({
            email: normalized,
            status: "Active",
        }).select("+passwordReset");
    }

    const matches = await User.find({
        phone: normalized,
        status: "Active",
    })
        .select("+passwordReset")
        .limit(2);

    return matches.length === 1 ? matches[0] : null;
}

// ================== CRYPTOGRAPHIC HELPERS ==================
// HMAC protects the small 6-digit OTP space if database data is exposed.
function otpDigest(userId, otp) {
    const secret = process.env.JWT_SECRET;

    if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
        throw new Error("JWT_SECRET is missing or too short.");
    }

    return createHmac("sha256", secret)
        .update(`hire-setu:password-reset:${userId}:${otp}`)
        .digest("hex");
}

// ================== RESET TOKEN HASH ==================
function tokenDigest(resetToken) {
    return createHash("sha256")
        .update(resetToken)
        .digest("hex");
}

// ================== CONSTANT-TIME HASH COMPARISON ==================
function sameHash(first, second) {
    if (
        !/^[a-f0-9]{64}$/.test(first || "") ||
        !/^[a-f0-9]{64}$/.test(second || "")
    ) {
        return false;
    }

    return timingSafeEqual(
        Buffer.from(first, "hex"),
        Buffer.from(second, "hex")
    );
}


// ================== MASK REGISTERED EMAIL ==================
// Show first 2 and last 2 characters for longer email names.
function maskedEmail(email) {
    const [local, domain] = String(email || "")
        .trim()
        .split("@");

    if (!local || !domain) {
        return "****";
    }

    // ================== SHORT EMAIL PROTECTION ==================
    if (local.length < 8) {
        return `${local.slice(0, 1)}****@${domain}`;
    }

    // ================== STANDARD EMAIL MASKING ==================
    return `${local.slice(0, 2)}****${local.slice(-2)}@${domain}`;
}


// ================== REQUEST / RESEND EMAIL OTP ==================
// POST /api/auth/forgot-password/request
async function requestPasswordResetOtp(req, res, next) {
    try {
        const account = await findRecoveryAccount(
            req.body.identifier
        );

        // ================== ACCOUNT PRIVACY ==================
        // Do not disclose whether an account exists.
        if (!account) {
            return sendNoCache(res, 200, {
                success: true,
                message: GENERIC_REQUEST_MESSAGE,
                resendCooldownSeconds: 60,
            });
        }

        // ================== CHECK REQUEST LIMITS ==================
        const nowMs = Date.now();
        const previous = account.passwordReset || {};

        const previousStartMs =
            previous.requestWindowStartedAt
                ? new Date(
                    previous.requestWindowStartedAt
                ).getTime()
                : NaN;

        const inCurrentWindow =
            Number.isFinite(previousStartMs) &&
            previousStartMs <= nowMs &&
            nowMs - previousStartMs < OTP_WINDOW_MS;

        const previousRequests = inCurrentWindow
            ? Number(previous.requestsInWindow) || 0
            : 0;

        const cooldownUntil = previous.resendAvailableAt
            ? new Date(previous.resendAvailableAt).getTime()
            : 0;

        // ================== MAXIMUM 10 REQUESTS / HOUR ==================
        // ================== 60-SECOND RESEND COOLDOWN ==================
        if (
            previousRequests >= MAX_OTP_REQUESTS_PER_HOUR ||
            cooldownUntil > nowMs
        ) {
            return sendNoCache(res, 200, {
                success: true,
                message: GENERIC_REQUEST_MESSAGE,
                resendCooldownSeconds: 60,
            });
        }

        // ================== GENERATE SECURE 6-DIGIT OTP ==================
        const otp = String(
            randomInt(0, 1_000_000)
        ).padStart(6, "0");

        const hash = otpDigest(account._id, otp);

        // ================== PREPARE OTP METADATA ==================
        const resetState = {
            otpHash: hash,

            otpExpiresAt: new Date(
                nowMs + OTP_VALIDITY_MINUTES * 60 * 1000
            ),

            failedAttempts: 0,

            resendAvailableAt: new Date(
                nowMs + OTP_COOLDOWN_MS
            ),

            requestWindowStartedAt: inCurrentWindow
                ? previous.requestWindowStartedAt
                : new Date(nowMs),

            requestsInWindow: previousRequests + 1,

            verificationTokenHash: null,
            verificationExpiresAt: null,
        };

        // ================== ATOMIC OTP RESERVATION ==================
        // Version check prevents simultaneous requests
        // from bypassing cooldown or hourly limits.
        const reserved = await User.updateOne(
            {
                _id: account._id,
                status: "Active",
                __v: account.__v ?? { $exists: false },
            },
            {
                $set: {
                    passwordReset: resetState,
                },
                $inc: {
                    __v: 1,
                },
            },
            {
                runValidators: true,
            }
        );

        if (reserved.modifiedCount !== 1) {
            return sendNoCache(res, 200, {
                success: true,
                message: GENERIC_REQUEST_MESSAGE,
                resendCooldownSeconds: 60,
            });
        }

        // ================== SEND OTP USING BREVO ==================
        try {
            await sendPasswordResetOtpEmail({
                toEmail: account.email,
                otp,
                name: account.name,
            });
        } catch (error) {
            // ================== HANDLE EMAIL FAILURE ==================
            // Invalidate this OTP if sending was not confirmed.
            // Keep the request count/cooldown to prevent abuse.
            await User.updateOne(
                {
                    _id: account._id,
                    "passwordReset.otpHash": hash,
                },
                {
                    $set: {
                        "passwordReset.otpHash": null,
                        "passwordReset.otpExpiresAt": null,
                    },
                }
            ).catch(() => {});

            console.error(
                "Password reset email request failed:",
                error.code || "EMAIL_SEND_FAILED"
            );
        }

        // ================== GENERIC SUCCESS RESPONSE ==================
        return sendNoCache(res, 200, {
            success: true,
            message: GENERIC_REQUEST_MESSAGE,
            resendCooldownSeconds: 60,
        });
    } catch (error) {
        return next(error);
    }
}

// ================== VERIFY PASSWORD RESET OTP ==================
// POST /api/auth/forgot-password/verify
async function verifyPasswordResetOtp(req, res, next) {
    try {
        const { identifier, otp } = req.body;

        // ================== FIND ACCOUNT ==================
        const account = await findRecoveryAccount(identifier);

        if (!account) {
            return next(
                new ExpressError(400, INVALID_OTP_MESSAGE)
            );
        }

        const stored = account.passwordReset;
        const now = new Date();

        const currentHash = stored?.otpHash;

        // ================== CHECK OTP EXPIRY / ATTEMPTS ==================
        if (
            !currentHash ||
            !stored?.otpExpiresAt ||
            new Date(stored.otpExpiresAt) <= now ||
            (stored.failedAttempts || 0) >=
                MAX_WRONG_OTP_ATTEMPTS
        ) {
            return next(
                new ExpressError(400, INVALID_OTP_MESSAGE)
            );
        }

        // ================== VERIFY OTP HASH ==================
        const incomingHash = otpDigest(
            account._id,
            otp
        );

        // ================== INCORRECT OTP ==================
        if (!sameHash(currentHash, incomingHash)) {
            await User.updateOne(
                {
                    _id: account._id,
                    status: "Active",

                    "passwordReset.otpHash": currentHash,

                    "passwordReset.otpExpiresAt": {
                        $gt: now,
                    },

                    "passwordReset.failedAttempts": {
                        $lt: MAX_WRONG_OTP_ATTEMPTS,
                    },
                },
                {
                    $inc: {
                        "passwordReset.failedAttempts": 1,
                    },
                }
            );

            return next(
                new ExpressError(400, INVALID_OTP_MESSAGE)
            );
        }

        // ================== GENERATE RESET AUTHORIZATION ==================
        // This token is NOT a JWT login session.
        // It can only be used once to reset the password.
        const resetToken = randomBytes(32).toString("hex");

        const verificationHash = tokenDigest(resetToken);

        // ================== MARK OTP VERIFIED ==================
        const verified = await User.updateOne(
            {
                _id: account._id,
                status: "Active",

                "passwordReset.otpHash": currentHash,

                "passwordReset.otpExpiresAt": {
                    $gt: now,
                },

                "passwordReset.failedAttempts": {
                    $lt: MAX_WRONG_OTP_ATTEMPTS,
                },
            },
            {
                $set: {
                    // OTP cannot be reused after verification.
                    "passwordReset.otpHash": null,
                    "passwordReset.otpExpiresAt": null,

                    // Store only a hash of the reset token.
                    "passwordReset.verificationTokenHash":
                        verificationHash,

                    "passwordReset.verificationExpiresAt":
                        new Date(
                            now.getTime() +
                                RESET_TOKEN_VALIDITY_MS
                        ),
                },

                $inc: {
                    __v: 1,
                },
            },
            {
                runValidators: true,
            }
        );

        if (verified.modifiedCount !== 1) {
            return next(
                new ExpressError(400, INVALID_OTP_MESSAGE)
            );
        }

        // ================== SUCCESSFUL OTP VERIFICATION ==================
        return sendNoCache(res, 200, {
            success: true,

            message:
                "Verification successful. Set your new password.",

            resetToken,

            resetExpiresInSeconds:
                RESET_TOKEN_VALIDITY_MS / 1000,

            // Reveal only after successful OTP verification.
            maskedEmail: maskedEmail(account.email),
        });
    } catch (error) {
        return next(error);
    }
}

// ================== RESET ACCOUNT PASSWORD ==================
// POST /api/auth/forgot-password/reset
async function resetPassword(req, res, next) {
    try {
        const { resetToken, newPassword } = req.body;

        const hash = tokenDigest(resetToken);
        const now = new Date();

        // ================== HASH NEW PASSWORD ==================
        const passwordHash = await bcrypt.hash(
            newPassword,
            BCRYPT_ROUNDS
        );

        // ================== ATOMIC PASSWORD RESET ==================
        // Only a valid, unexpired, unused reset token works.
        const updated = await User.updateOne(
            {
                status: "Active",

                "passwordReset.verificationTokenHash": hash,

                "passwordReset.verificationExpiresAt": {
                    $gt: now,
                },
            },
            {
                $set: {
                    passwordHash,

                    passwordChangedAt: now,

                    // Email-verified password reset also
                    // satisfies initial admin password change.
                    mustChangePassword: false,

                    // Clear OTP authorization.
                    "passwordReset.otpHash": null,
                    "passwordReset.otpExpiresAt": null,

                    // Invalidate reset token permanently.
                    "passwordReset.verificationTokenHash": null,
                    "passwordReset.verificationExpiresAt": null,
                },

                $inc: {
                    // Revoke all old JWT sessions.
                    tokenVersion: 1,
                    __v: 1,
                },
            },
            {
                runValidators: true,
            }
        );

        if (updated.modifiedCount !== 1) {
            return next(
                new ExpressError(
                    400,
                    "Password reset session has expired or was already used."
                )
            );
        }

        // ================== CLEAR CURRENT LOGIN COOKIE ==================
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        });

        // ================== PASSWORD RESET SUCCESS ==================
        return sendNoCache(res, 200, {
            success: true,

            message:
                "Password reset successful. Please log in again.",

            requiresLogin: true,
        });
    } catch (error) {
        return next(error);
    }
}

// ================== EXPORTS ==================
module.exports = {
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPassword,
};
