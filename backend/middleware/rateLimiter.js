const { rateLimit } = require("express-rate-limit");
const { createHash } = require("node:crypto");

// ================== LOGIN IP LIMITER ==================
// Limit all login requests from the same IP address.
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
// Apply after login validation to use the normalized email.
// Successful responses are removed from this counter.
const loginAccountLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,

    // Avoid storing the raw email as the rate-limit key.
    keyGenerator: (req) => {
        return createHash("sha256")
            .update(req.body.email)
            .digest("hex");
    },

    message: {
        success: false,
        message: "Too many login attempts. Please try again later.",
    },
});

// ================== SIGNUP IP LIMITER ==================
// Count all signup requests, including unsuccessful requests.
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

// ================== EXPORTS ==================
module.exports = {
    loginIpLimiter,
    loginAccountLimiter,
    signupLimiter,
};