
const express = require("express");

const adminController = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");
const validateMiddleware = require("../middleware/validateMiddleware");

const { userStatusSchema } = require("../validations/schema");

// ================== ROUTER SETUP ==================
const router = express.Router();

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

// ================== EXPORT ==================
module.exports = router;
