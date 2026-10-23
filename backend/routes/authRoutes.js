
const express = require("express");
const { rateLimit } = require("express-rate-limit");

const authController = require("../controllers/authController");
const passwordResetController = require("../controllers/passwordResetController");

const authMiddleware = require("../middleware/authMiddleware");
const validateMiddleware = require("../middleware/validateMiddleware");

const {
    loginIpLimiter,
    loginAccountLimiter,
    signupLimiter,
} = require("../middleware/rateLimiter");

const {
    signupSchema,
    loginSchema,
    forgotPasswordRequestSchema,
    forgotPasswordVerifySchema,
    forgotPasswordResetSchema,
} = require("../validations/schema");

// ================== ROUTER SETUP ==================
const router = express.Router();

// ================== FORGOT PASSWORD RATE LIMITERS ==================

// ================== OTP REQUEST LIMITER ==================
// Maximum 30 OTP request API calls per IP per hour.
// Additional 10 requests/account/hour enforced in controller.
const forgotPasswordRequestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Too many password reset requests. Please try again later.",
    },
});

// ================== OTP VERIFICATION LIMITER ==================
// Maximum 60 verification requests per IP per 15 minutes.
// Additional 5 incorrect attempts per OTP enforced in controller.
const forgotPasswordVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Too many OTP verification attempts. Please try again later.",
    },
});

// ================== PASSWORD RESET LIMITER ==================
// Maximum 20 password reset submissions per IP per 15 minutes.
const forgotPasswordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        success: false,
        message:
            "Too many password reset attempts. Please try again later.",
    },
});

// ================== SIGNUP ==================
// POST /api/auth/signup
// Public registration creates normal user accounts only.
router.post(
    "/signup",
    signupLimiter,
    validateMiddleware(signupSchema),
    authController.signup
);

// ================== LOGIN ==================
// POST /api/auth/login
// Validate and normalize the email before account-based limiting.
router.post(
    "/login",
    loginIpLimiter,
    validateMiddleware(loginSchema),
    loginAccountLimiter,
    authController.login
);

// ================== FORGOT PASSWORD - REQUEST OTP ==================
// POST /api/auth/forgot-password/request
// Public route for User and Admin.
// Send 6-digit OTP to the registered email address.
router.post(
    "/forgot-password/request",
    forgotPasswordRequestLimiter,
    validateMiddleware(forgotPasswordRequestSchema),
    passwordResetController.requestPasswordResetOtp
);

// ================== FORGOT PASSWORD - VERIFY OTP ==================
// POST /api/auth/forgot-password/verify
// Verify OTP and generate short-lived password reset authorization.
router.post(
    "/forgot-password/verify",
    forgotPasswordVerifyLimiter,
    validateMiddleware(forgotPasswordVerifySchema),
    passwordResetController.verifyPasswordResetOtp
);

// ================== FORGOT PASSWORD - RESET PASSWORD ==================
// POST /api/auth/forgot-password/reset
// Change password using a verified single-use reset token.
router.post(
    "/forgot-password/reset",
    forgotPasswordResetLimiter,
    validateMiddleware(forgotPasswordResetSchema),
    passwordResetController.resetPassword
);

// ================== LOGOUT ==================
// POST /api/auth/logout
// Require authentication before revoking the account's sessions.
router.post(
    "/logout",
    authMiddleware,
    authController.logout
);

// ================== CURRENT USER ==================
// GET /api/auth/me
// Restore frontend authentication state after a page refresh.
router.get(
    "/me",
    authMiddleware,
    authController.getCurrentUser
);

// ================== EXPORT ==================
module.exports = router;