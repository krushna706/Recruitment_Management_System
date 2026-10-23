const express = require("express");

const jobController = require("../controllers/jobController");

const authMiddleware = require("../middleware/authMiddleware");
const validateMiddleware = require("../middleware/validateMiddleware");

const { roleMiddleware } = require("../middleware/roleMiddleware");
const { clientJobSchema, vacancySchema } = require("../validations/schema");

// ================== ROUTER SETUP ==================
const router = express.Router();

// ================== ADMIN VACANCY ROUTES ==================
// Keep these routes before /admin/:id.
router.get("/admin/vacancies", authMiddleware, roleMiddleware("admin"), jobController.getAdminVacancies);
router.get("/admin/vacancies/:id", authMiddleware, roleMiddleware("admin"), jobController.getAdminVacancy);
router.post("/admin/vacancies", authMiddleware, roleMiddleware("admin"), validateMiddleware(vacancySchema.fork("version", (rule) => rule.forbidden())), jobController.createVacancy);
router.put("/admin/vacancies/:id", authMiddleware, roleMiddleware("admin"), validateMiddleware(vacancySchema.fork("version", (rule) => rule.required())), jobController.updateVacancy);

// ================== ADMIN CLIENT JOB ROUTES ==================
router.get("/admin", authMiddleware, roleMiddleware("admin"), jobController.getAdminJobs);
router.get("/admin/:id", authMiddleware, roleMiddleware("admin"), jobController.getAdminJob);
router.post("/admin", authMiddleware, roleMiddleware("admin"), validateMiddleware(clientJobSchema.fork("version", (rule) => rule.forbidden())), jobController.createJob);
router.put("/admin/:id", authMiddleware, roleMiddleware("admin"), validateMiddleware(clientJobSchema.fork("version", (rule) => rule.required())), jobController.updateJob);

// ================== PUBLIC CAREERS ROUTES ==================
// Keep /vacancies before /:id.
router.get("/vacancies", jobController.getPublicVacancies);
router.get("/vacancies/:id", jobController.getPublicVacancy);

// ================== PUBLIC CLIENT JOB ROUTES ==================
router.get("/", jobController.getPublicJobs);
router.get("/:id", jobController.getPublicJob);

// ================== EXPORT ==================
module.exports = router;
