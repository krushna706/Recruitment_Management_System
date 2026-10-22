
const express = require("express");
const { rateLimit } = require("express-rate-limit");

const contactController = require("../controllers/contactController");

const authMiddleware = require("../middleware/authMiddleware");
const validateMiddleware = require("../middleware/validateMiddleware");

const { roleMiddleware } = require("../middleware/roleMiddleware");
const { contactEnquirySchema } = require("../validations/schema");

// ================== ROUTER SETUP ==================
const router = express.Router();

// ================== CONTACT RATE LIMITER ==================
// Limit public contact submissions to prevent spam.
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many enquiries. Please try again later.",
    },
});

// ================== PUBLIC CONTACT FORM ==================
// POST /api/contact
// Validate and save enquiries in MongoDB.
router.post(
    "/",
    contactLimiter,
    validateMiddleware(contactEnquirySchema),
    contactController.submitEnquiry
);

// ================== ADMIN ACCESS PROTECTION ==================
// All admin enquiry routes require an active admin account.
router.use(
    "/admin",
    authMiddleware,
    roleMiddleware("admin")
);

// ================== MANAGE ENQUIRIES ==================
// GET /api/contact/admin
// Supports search, date filters and pagination.
router.get(
    "/admin",
    contactController.getAdminEnquiries
);

// ================== SINGLE ENQUIRY DETAILS ==================
// GET /api/contact/admin/:id
// Retrieve an enquiry using MongoDB ID or enquiry reference.
router.get(
    "/admin/:id",
    contactController.getAdminEnquiry
);

// ================== EXPORT ==================
module.exports = router;
