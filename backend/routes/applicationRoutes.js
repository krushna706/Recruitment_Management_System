const express = require("express");

const applicationController = require("../controllers/applicationController");

const authMiddleware = require("../middleware/authMiddleware");
const validateMiddleware = require("../middleware/validateMiddleware");

const { roleMiddleware } = require("../middleware/roleMiddleware");
const { applicationLimiter } = require("../middleware/rateLimiter");
const { uploadResume } = require("../middleware/uploadMiddleware");
const { applicationSchema, applicationStatusSchema } = require("../validations/schema");

const router = express.Router();

// ================== USER APPLICATIONS ==================
// Keep /my/dashboard before /my/:id so dashboard is not treated as an application ID.
router.get("/my/dashboard", authMiddleware, roleMiddleware("user"), applicationController.getMyDashboard);
router.get("/my", authMiddleware, roleMiddleware("user"), applicationController.getMyApplications);
router.get("/my/:id", authMiddleware, roleMiddleware("user"), applicationController.getMyApplication);

// ================== ADMIN APPLICATIONS ==================
// Keep /admin/options before /admin/:id to avoid treating options as an ID.
router.get("/admin", authMiddleware, roleMiddleware("admin"), applicationController.getAdminApplications);
router.get("/admin/options", authMiddleware, roleMiddleware("admin"), applicationController.getAdminApplicationOptions);
router.get("/admin/:id", authMiddleware, roleMiddleware("admin"), applicationController.getAdminApplication);
router.patch("/admin/:id/status", authMiddleware, roleMiddleware("admin"), validateMiddleware(applicationStatusSchema), applicationController.updateApplicationStatus);

// ================== ADMIN RESUME ACCESS ==================
router.get("/:id/resume", authMiddleware, roleMiddleware("admin"), applicationController.getResumeAccess);

// ================== SUBMIT APPLICATION ==================
// Parse uploaded form data before validating its text fields.
router.post("/jobs/:jobId", authMiddleware, roleMiddleware("user"), applicationLimiter, uploadResume, validateMiddleware(applicationSchema, { jsonFields: ["skills"] }), applicationController.createApplication);

// ================== EXPORT ==================
module.exports = router;
