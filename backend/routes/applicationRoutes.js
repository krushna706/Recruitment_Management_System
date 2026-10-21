const express = require("express");

const applicationController = require("../controllers/applicationController");
const authMiddleware = require("../middleware/authMiddleware");
const validateMiddleware = require("../middleware/validateMiddleware");

const { roleMiddleware } = require("../middleware/roleMiddleware");
const { applicationLimiter } = require("../middleware/rateLimiter");
const { uploadResume } = require("../middleware/uploadMiddleware");
const { applicationSchema } = require("../validations/schema");

// ================== ROUTER SETUP ==================
const router = express.Router();

// ================== SUBMIT JOB APPLICATION ==================
// POST /api/applications/jobs/:jobId
// Authenticate, authorize and rate-limit before receiving the resume.
router.post("/jobs/:jobId", authMiddleware, roleMiddleware("user"), applicationLimiter, uploadResume, validateMiddleware(applicationSchema, { jsonFields: ["skills"] }), applicationController.createApplication);

// ================== EXPORT ==================
module.exports = router;