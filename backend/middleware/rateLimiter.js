const { rateLimit } = require("express-rate-limit");
const { createHash } = require("node:crypto");

// ================== LOGIN IP LIMITER ==================
// Limit login requests from the same IP address.
const loginIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many login attempts. Please try again later.",
    },
});

// ================== LOGIN ACCOUNT LIMITER ==================
// Run after login validation so the email is normalized.
// Successful responses are removed from this counter.
const loginAccountLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,

    keyGenerator: (req) => {
        return createHash("sha256").update(req.body.email).digest("hex");
    },

    message: {
        success: false,
        message: "Too many login attempts. Please try again later.",
    },
});

// ================== SIGNUP IP LIMITER ==================
// Count both successful and unsuccessful signup requests.
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many signup attempts. Please try again later.",
    },
});

// ================== APPLICATION SUBMISSION LIMITER ==================
// Run after authentication and before receiving the resume.
// Limit each account independently, including failed submissions.
const applicationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    keyGenerator: (req) => {
        return String(req.user._id);
    },

    message: {
        success: false,
        message: "Too many application attempts. Please try again later.",
    },
});

// ================== SENSITIVE ACCOUNT ACTIONS ==================
// Apply after authentication, before password comparison or admin mutations.
const accountActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => String(req.user._id),
    message: {
        success: false,
        message: "Too many account verification attempts. Please try again later.",
    },
});

// ================== EXPORTS ==================
module.exports = {
    loginIpLimiter,
    loginAccountLimiter,
    signupLimiter,
    applicationLimiter,
    accountActionLimiter,
};
