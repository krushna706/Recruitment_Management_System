
const express = require("express");

const adminController = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");
const validateMiddleware = require("../middleware/validateMiddleware");

const { rateLimit } = require("express-rate-limit");
const { uploadAvatar } = require("../middleware/uploadMiddleware");



const {
    userStatusSchema,
    adminCreateSchema,
    adminEditSchema,
    adminStatusSchema,
    adminProfileSchema,
    adminPasswordChangeSchema,
} = require("../validations/schema");


// ================== ROUTER SETUP ==================
const router = express.Router();


// ================== ADMIN AVATAR RATE LIMITER ==================
// Prevent excessive Cloudinary uploads.
const adminAvatarLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many image uploads. Please try again later.",
    },
});


// ================== ADMIN ACCESS PROTECTION ==================
// All routes require a valid JWT and an active admin account.
router.use(authMiddleware, roleMiddleware("admin"));

// ================== MANAGE USERS ==================

// GET /api/admin/users
// Fetch registered users with search, status filter and pagination.
router.get(
    "/users",
    adminController.getUsers
);


 // ================== CANDIDATE PROFILE RESUME ==================
 // GET /api/admin/users/:id/resume?mode=view|download
 // Only authenticated admins can view/download candidate resumes.
 router.get(
     "/users/:id/resume",
     adminController.getUserProfileResume
 );

// ================== USER DETAILS ==================
// GET /api/admin/users/:id
// Fetch candidate profile and application history.
router.get(
    "/users/:id",
    adminController.getUserDetails
);

// ================== ACTIVATE / DEACTIVATE USER ==================
// PATCH /api/admin/users/:id/status
// Validate status before updating the MongoDB user account.
router.patch(
    "/users/:id/status",
    validateMiddleware(userStatusSchema),
    adminController.updateUserStatus
);

// ================== MANAGE ADMINS ==================
// All routes are protected by JWT authentication and admin role.

// ================== GET ALL ADMINS ==================
// GET /api/admin/admins
// Fetch admin accounts with search, filters and pagination.
router.get(
    "/admins",
    adminController.getAdmins
);

// ================== CREATE ADMIN ==================
// POST /api/admin/admins
// Only authenticated admins can create another admin.
router.post(
    "/admins",
    validateMiddleware(adminCreateSchema),
    adminController.createAdmin
);

// ================== GET ADMIN DETAILS ==================
// GET /api/admin/admins/:id
router.get(
    "/admins/:id",
    adminController.getAdminDetails
);

// ================== UPDATE ADMIN DETAILS ==================
// PATCH /api/admin/admins/:id
// Update name, email and phone.
router.patch(
    "/admins/:id",
    validateMiddleware(adminEditSchema),
    adminController.updateAdmin
);

// ================== ACTIVATE / DEACTIVATE ADMIN ==================
// PATCH /api/admin/admins/:id/status
// Verify password and protect the last active admin.
router.patch(
    "/admins/:id/status",
    validateMiddleware(adminStatusSchema),
    adminController.updateAdminStatus
);


// ================== ADMIN PROFILE ==================
// All routes require authenticated active admin access.

// ================== GET MY ADMIN PROFILE ==================
// GET /api/admin/me/profile
router.get(
    "/me/profile",
    adminController.getMyAdminProfile
);

// ================== UPDATE MY ADMIN PROFILE ==================
// PATCH /api/admin/me/profile
router.patch(
    "/me/profile",
    validateMiddleware(adminProfileSchema),
    adminController.updateMyAdminProfile
);

// ================== CHANGE ADMIN PASSWORD ==================
// PATCH /api/admin/me/password
router.patch(
    "/me/password",
    validateMiddleware(adminPasswordChangeSchema),
    adminController.changeMyAdminPassword
);

// ================== UPLOAD / REPLACE ADMIN AVATAR ==================
// POST /api/admin/me/avatar
// Validate image format and maximum 3 MB file size.
router.post(
    "/me/avatar",
    adminAvatarLimiter,
    uploadAvatar,
    adminController.uploadMyAdminAvatar
);



// ================== EXPORT ==================
module.exports = router;
