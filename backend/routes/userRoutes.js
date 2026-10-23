const { accountActionLimiter } = require("../middleware/rateLimiter");

const express = require("express");
const { rateLimit } = require("express-rate-limit");

const userController = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");
const validateMiddleware = require("../middleware/validateMiddleware");

const { roleMiddleware } = require("../middleware/roleMiddleware");
const { uploadResume, uploadAvatar } = require("../middleware/uploadMiddleware");
const { profileUpdateSchema } = require("../validations/schema");

const ExpressError = require("../utils/ExpressError");

// ================== ROUTER SETUP ==================
const router = express.Router();

// ================== PROFILE UPLOAD RATE LIMITER ==================
// Limit file uploads separately for each authenticated user.
const profileUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    keyGenerator: (req) => String(req.user._id),

    message: {
        success: false,
        message: "Too many file uploads. Please try again later.",
    },
});

// ================== USER ACCESS PROTECTION ==================
// All routes require an active authenticated candidate account.
router.use(authMiddleware, roleMiddleware("user"));

// ================== MY PROFILE ==================
// GET /api/users/me/profile
router.get("/me/profile", userController.getMyProfile);

// PATCH /api/users/me/profile
router.patch("/me/profile", accountActionLimiter, validateMiddleware(profileUpdateSchema), userController.updateMyProfile);

// ================== MY RESUME ==================
// GET /api/users/me/resume?mode=view|download
router.get("/me/resume", userController.getMyResume);

// POST /api/users/me/resume
router.post(
    "/me/resume",
    profileUploadLimiter,
    uploadResume,
    (req, res, next) => {
        // Profile resume uploads must not contain extra form fields.
        if (Object.keys(req.body || {}).length > 0) {
            return next(new ExpressError(400, "Submit only the resume file."));
        }

        return next();
    },
    userController.uploadMyResume
);

// ================== MY PROFILE IMAGE ==================
// POST /api/users/me/avatar
router.post("/me/avatar", profileUploadLimiter, uploadAvatar, userController.uploadMyAvatar);

// ================== EXPORT ==================
module.exports = router;
