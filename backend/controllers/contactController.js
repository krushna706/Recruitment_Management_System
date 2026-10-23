const mongoose = require("mongoose");

const Contact = require("../models/Contact");
const ExpressError = require("../utils/ExpressError");

// ================== ENQUIRY CONFIGURATION ==================
const MAX_PAGE = 100000;
const MAX_LIMIT = 100;

const ENQUIRY_FIELDS = [
    "enquiryId",
    "name",
    "email",
    "phone",
    "subject",
    "message",
    "submittedAt",
].join(" ");

// ================== ADMIN ACCESS ==================
// Authentication and role middleware must protect admin routes.
function requireAdmin(req) {
    if (!req.user) {
        throw new ExpressError(401, "Please login to continue.");
    }

    if (req.user.role !== "admin") {
        throw new ExpressError(403, "You do not have permission to manage enquiries.");
    }
}

// ================== QUERY VALIDATION ==================
function validateQueryFields(query, allowedFields) {
    const unknownFields = Object.keys(query).filter((field) => !allowedFields.includes(field));

    if (unknownFields.length) {
        throw new ExpressError(400, "Unsupported enquiry filter.");
    }
}

// ================== PAGINATION ==================
function getPositiveInteger(value, fallback, maximum, label) {
    if (value === undefined) return fallback;

    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
        throw new ExpressError(400, `${label} must be a positive whole number.`);
    }

    const number = Number(value);

    if (!Number.isSafeInteger(number) || number > maximum) {
        throw new ExpressError(400, `${label} cannot exceed ${maximum}.`);
    }

    return number;
}

// ================== SAFE SEARCH ==================
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ================== DATE VALIDATION ==================
// Date filters represent calendar dates in Asia/Kolkata.
function getDateFilter(value, label) {
    if (value === undefined || value === "") {
        return null;
    }

    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new ExpressError(400, `${label} must use YYYY-MM-DD format.`);
    }

    const parsed = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        throw new ExpressError(400, `Invalid ${label}.`);
    }

    return value;
}

// ================== INDIA DATE BOUNDARY ==================
// Convert an Indian calendar day into its UTC start timestamp.
function getIndiaDayStart(date) {
    return new Date(`${date}T00:00:00+05:30`);
}

// ================== CURRENT INDIA DATE ==================
function getIndiaToday() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return `${values.year}-${values.month}-${values.day}`;
}

// ================== ADMIN ENQUIRY FILTERS ==================
function getEnquiryFilters(query) {
    validateQueryFields(query, ["page", "limit", "search", "fromDate", "toDate"]);

    const filter = {};

    // ================== SEARCH FILTER ==================
    if (query.search !== undefined) {
        if (typeof query.search !== "string") {
            throw new ExpressError(400, "Search must be text.");
        }

        const search = query.search.trim();

        if (search.length > 100) {
            throw new ExpressError(400, "Search cannot exceed 100 characters.");
        }

        if (search) {
            const regex = new RegExp(escapeRegex(search), "i");

            filter.$or = [
                { enquiryId: regex },
                { name: regex },
                { email: regex },
                { phone: regex },
                { subject: regex },
                { message: regex },
            ];
        }
    }

    // ================== DATE RANGE FILTER ==================
    const fromDate = getDateFilter(query.fromDate, "From date");

    const toDate = getDateFilter(query.toDate, "To date");

    if (fromDate && toDate && fromDate > toDate) {
        throw new ExpressError(400, "To date must be on or after From date.");
    }

    if (fromDate || toDate) {
        filter.submittedAt = {};

        if (fromDate) {
            filter.submittedAt.$gte = getIndiaDayStart(fromDate);
        }

        if (toDate) {
            const nextDay = new Date(getIndiaDayStart(toDate).getTime() + 24 * 60 * 60 * 1000);

            filter.submittedAt.$lt = nextDay;
        }
    }

    return filter;
}

// ================== SAFE ENQUIRY RESPONSE ==================
function getEnquiryResponse(enquiry) {
    return {
        _id: enquiry._id,
        id: enquiry.enquiryId,
        enquiryId: enquiry.enquiryId,
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        subject: enquiry.subject,
        message: enquiry.message,
        submittedAt: enquiry.submittedAt,
    };
}

// ================== SUBMIT CONTACT ENQUIRY ==================
// POST /api/contact
// Public endpoint. Joi validation and rate limiting run in the router.
async function submitEnquiry(req, res, next) {
    try {
        // Explicit allowlist prevents client-supplied system fields.
        const enquiry = await Contact.create({
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            subject: req.body.subject,
            message: req.body.message,
        });

        // Enquiry ID and submittedAt are generated by MongoDB schema.
        res.set("Cache-Control", "no-store");

        return res.status(201).json({
            success: true,
            message: "Your enquiry has been submitted successfully.",
            enquiryId: enquiry.enquiryId,
            submittedAt: enquiry.submittedAt,
        });
    } catch (error) {
        return next(error);
    }
}

// ================== ADMIN ENQUIRY STATISTICS ==================
// Calculate metrics from the complete database, not just one page.
async function getEnquiryCounts() {
    const today = getIndiaToday();
    const monthStart = `${today.slice(0, 7)}-01`;

    const todayStart = getIndiaDayStart(today);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const monthStartDate = getIndiaDayStart(monthStart);

    const [total, todayCount, monthCount, uniqueSenderResult] = await Promise.all([
        Contact.countDocuments(),

        Contact.countDocuments({
            submittedAt: {
                $gte: todayStart,
                $lt: tomorrowStart,
            },
        }),

        Contact.countDocuments({
            submittedAt: {
                $gte: monthStartDate,
                $lt: tomorrowStart,
            },
        }),

        Contact.aggregate([
            {
                $group: {
                    _id: "$email",
                },
            },
            {
                $count: "total",
            },
        ]),
    ]);

    return {
        total,
        today: todayCount,
        thisMonth: monthCount,
        uniqueSenders: uniqueSenderResult[0]?.total || 0,
    };
}

// ================== GET ADMIN ENQUIRIES ==================
// GET /api/contact/admin
// Supports search, date filters and server-side pagination.
async function getAdminEnquiries(req, res, next) {
    try {
        requireAdmin(req);

        const filter = getEnquiryFilters(req.query);

        const page = getPositiveInteger(req.query.page, 1, MAX_PAGE, "Page");

        const limit = getPositiveInteger(req.query.limit, 10, MAX_LIMIT, "Page size");

        const [enquiries, total, counts] = await Promise.all([
            Contact.find(filter)
                .select(ENQUIRY_FIELDS)
                .sort({
                    submittedAt: -1,
                    _id: -1,
                })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            Contact.countDocuments(filter),

            getEnquiryCounts(),
        ]);

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,

            enquiries: enquiries.map(getEnquiryResponse),

            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },

            counts,
        });
    } catch (error) {
        return next(error);
    }
}

// ================== GET SINGLE ENQUIRY ==================
// GET /api/contact/admin/:id
// Allow lookup by MongoDB ID or generated enquiry reference.
async function getAdminEnquiry(req, res, next) {
    try {
        requireAdmin(req);

        const id = req.params.id;

        if (typeof id !== "string") {
            throw new ExpressError(400, "Invalid enquiry ID.");
        }

        let filter;

        if (/^[a-fA-F0-9]{24}$/.test(id)) {
            filter = {
                _id: new mongoose.Types.ObjectId(id),
            };
        } else if (/^ENQ-[A-F0-9]{16}$/.test(id)) {
            filter = {
                enquiryId: id,
            };
        } else {
            throw new ExpressError(400, "Invalid enquiry ID.");
        }

        const enquiry = await Contact.findOne(filter).select(ENQUIRY_FIELDS).lean();

        if (!enquiry) {
            throw new ExpressError(404, "Enquiry not found.");
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            enquiry: getEnquiryResponse(enquiry),
        });
    } catch (error) {
        return next(error);
    }
}

// ================== EXPORTS ==================
module.exports = {
    submitEnquiry,
    getAdminEnquiries,
    getAdminEnquiry,
};
