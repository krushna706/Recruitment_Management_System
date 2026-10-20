const express = require("express");

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const validateMiddleware = require("../middleware/validateMiddleware");

const { loginIpLimiter, loginAccountLimiter, signupLimiter } = require("../middleware/rateLimiter");
const { signupSchema, loginSchema } = require("../validations/schema");

// ================== ROUTER SETUP ==================
const router = express.Router();

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