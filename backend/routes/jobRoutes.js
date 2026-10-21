const express = require("express");

const jobController = require("../controllers/jobController");
const authMiddleware = require("../middleware/authMiddleware");
const validateMiddleware = require("../middleware/validateMiddleware");

const { roleMiddleware } = require("../middleware/roleMiddleware");
const { clientJobSchema } = require("../validations/schema");

// ================== ROUTER SETUP ==================
const router = express.Router();

// ================== ADMIN JOB ROUTES ==================
// Keep /admin routes before /:id so "admin" is not treated as a job ID.
// Every admin operation requires authentication and the admin role.

// GET /api/jobs/admin
// List client jobs, including drafts and closed jobs.
router.get("/admin", authMiddleware, roleMiddleware("admin"), jobController.getAdminJobs);

// GET /api/jobs/admin/:id
// Load a client job for the admin edit form.
router.get("/admin/:id", authMiddleware, roleMiddleware("admin"), jobController.getAdminJob);

// POST /api/jobs/admin
// Create a client job using validated form fields.
router.post("/admin", authMiddleware, roleMiddleware("admin"), validateMiddleware(clientJobSchema), jobController.createJob);

// PUT /api/jobs/admin/:id
// Update the complete form, including manual close or reopen.
router.put("/admin/:id", authMiddleware, roleMiddleware("admin"), validateMiddleware(clientJobSchema), jobController.updateJob);

// ================== PUBLIC JOB ROUTES ==================
// These routes do not require login.
// The controller restricts which jobs and fields are returned.

// GET /api/jobs
// List published client jobs.
router.get("/", jobController.getPublicJobs);

// GET /api/jobs/:id
// Show published or closed job details; drafts remain private.
router.get("/:id", jobController.getPublicJob);

// ================== EXPORT ==================
module.exports = router;