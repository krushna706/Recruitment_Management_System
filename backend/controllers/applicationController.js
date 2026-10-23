const mongoose = require("mongoose");
const path = require("node:path");

const Application = require("../models/Application");
const Job = require("../models/Job");
const { uploadPrivateResume: uploadResumeToCloudinary, deletePrivateResume, sendPrivateResume } = require("../utils/fileStorage");
const ExpressError = require("../utils/ExpressError");

// ================== APPLICATION CONFIGURATION ==================

const APPLICATION_STATUSES = [
    "Submitted",
    "Under Review",
    "Shortlisted",
    "Interview",
    "Selected",
    "Rejected",
];

// Final statuses cannot be changed again.
const STATUS_TRANSITIONS = {
    Submitted: ["Under Review", "Rejected"],
    "Under Review": ["Shortlisted", "Rejected"],
    Shortlisted: ["Interview", "Rejected"],
    Interview: ["Selected", "Rejected"],
    Selected: [],
    Rejected: [],
};

// Select only the information needed by application pages.
const APPLICATION_FIELDS = [
    "jobId",
    "openingType",
    "jobSnapshot",
    "applicant",
    "resume.name",
    "resume.mimeType",
    "resume.size",
    "status",
    "interview",
    "selection",
    "history.status",
    "history.message",
    "history.createdAt",
    "createdAt",
    "updatedAt",
].join(" ");

// ================== ACCOUNT ACCESS ==================
function requireAccount(req, role) {
    if (!req.user) {
        throw new ExpressError(401, "Please login to continue.");
    }

    if (req.user.role !== role) {
        throw new ExpressError(403, "Your account does not have permission to use this feature.");
    }
}

// ================== ID VALIDATION ==================
function validateObjectId(value, label) {
    if (typeof value !== "string" || !/^[a-fA-F0-9]{24}$/.test(value)) {
        throw new ExpressError(400, `Invalid ${label} ID.`);
    }
}

// ================== QUERY VALIDATION ==================
function validateQueryFields(query, allowedFields) {
    if (Object.keys(query).some((field) => !allowedFields.includes(field))) {
        throw new ExpressError(400, "Unsupported application filter.");
    }
}

function getQueryText(value, label, maximum = 200) {
    if (value === undefined) return "";

    if (typeof value !== "string" || value.length > maximum) {
        throw new ExpressError(400, `Invalid ${label}.`);
    }

    return value.trim();
}

// ================== PAGINATION VALIDATION ==================
function getPositiveInteger(value, fallback, maximum, label) {
    if (value === undefined) return fallback;

    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
        throw new ExpressError(400, `Invalid ${label}.`);
    }

    const number = Number(value);

    if (!Number.isSafeInteger(number) || number > maximum) {
        throw new ExpressError(400, `Invalid ${label}.`);
    }

    return number;
}

function getPagination(query) {
    return {
        page: getPositiveInteger(query.page, 1, 100000, "page"),
        limit: getPositiveInteger(query.limit, 10, 50, "limit"),
    };
}

// ================== STATUS FILTER ==================
function applyStatusFilter(filter, value) {
    const status = getQueryText(value, "application status", 30);

    if (!status) return;

    if (status === "Pending") {
        filter.status = {
            $in: ["Submitted", "Under Review"],
        };

        return;
    }

    if (!APPLICATION_STATUSES.includes(status)) {
        throw new ExpressError(400, "Invalid application status.");
    }

    filter.status = status;
}

// ================== OPENING TYPE FILTER ==================
function applyOpeningTypeFilter(filter, value) {
    const openingType = getQueryText(value, "opening type", 20);

    if (!openingType) return;

    if (!["client", "internal"].includes(openingType)) {
        throw new ExpressError(400, "Invalid opening type.");
    }

    filter.openingType = openingType;
}

// ================== APPLICATION SEARCH ==================
function applySearchFilter(filter, value, isAdmin = false) {
    const search = getQueryText(value, "application search");

    if (!search) return;

    // Escape special characters so search remains a literal text search.
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const expression = new RegExp(escapedSearch, "i");

    filter.$or = [{ "jobSnapshot.title": expression }, { "jobSnapshot.company": expression }];

    if (isAdmin) {
        filter.$or.push({ "applicant.name": expression }, { "applicant.email": expression });

        if (/^[a-fA-F0-9]{24}$/.test(search)) {
            filter.$or.push({
                _id: new mongoose.Types.ObjectId(search),
            });
        }
    }
}

// ================== SAFE APPLICATION RESPONSE ==================
// Explicit fields prevent storage keys and internal metadata from leaking.
function getApplicationResponse(application) {
    return {
        _id: application._id,
        id: String(application._id),
        jobId: application.jobId,
        openingType: application.openingType,
        jobSnapshot: application.jobSnapshot,
        applicant: application.applicant,

        resume: application.resume
            ? {
                  name: application.resume.name,
                  mimeType: application.resume.mimeType,
                  size: application.resume.size,
              }
            : null,

        status: application.status,

        interview: application.interview
            ? {
                  at: application.interview.at,
                  mode: application.interview.mode,
                  note: application.interview.note,
              }
            : undefined,

        selection: application.selection
            ? {
                  note: application.selection.note,
              }
            : undefined,

        history: (application.history || []).map((entry) => ({
            status: entry.status,
            message: entry.message,
            createdAt: entry.createdAt,
        })),

        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
    };
}

// ================== APPLICATION LIST QUERY ==================
async function getApplicationList(filter, page, limit) {
    const [applications, total] = await Promise.all([
        Application.find(filter)
            .select(APPLICATION_FIELDS)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),

        Application.countDocuments(filter),
    ]);

    return {
        applications: applications.map(getApplicationResponse),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

// ================== ADMIN SUMMARY COUNTS ==================
// Summary cards show overall counts, independent of table filters.
async function getApplicationCounts() {
    const groupedCounts = await Application.aggregate([
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);

    const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));

    let total = 0;

    for (const item of groupedCounts) {
        total += item.count;

        if (Object.prototype.hasOwnProperty.call(byStatus, item._id)) {
            byStatus[item._id] = item.count;
        }
    }

    return {
        total,
        pending: byStatus.Submitted + byStatus["Under Review"],
        selected: byStatus.Selected,
        rejected: byStatus.Rejected,
        byStatus,
    };
}

// ================== FAILED SUBMISSION CLEANUP ==================
// Retain the resume if the database cannot confirm the submission result.
async function cleanupUnusedResume(applicationId, storageKey) {
    try {
        const savedApplication = await Application.exists({
            _id: applicationId,
        });

        if (savedApplication) return;

        await deletePrivateResume(storageKey);
    } catch {
        console.error(`Resume cleanup needs review for application ${applicationId}.`);
    }
}

// ================== CREATE APPLICATION ==================
// POST /api/applications/jobs/:jobId
// Shared submission flow for client jobs and internal vacancies.
// Authentication, upload and Joi validation run in the router.
async function createApplication(req, res, next) {
    const applicationId = new mongoose.Types.ObjectId();

    let uploadedResume = null;
    let applicationSaved = false;

    try {
        requireAccount(req, "user");

        const { jobId } = req.params;

        validateObjectId(jobId, "job");

        if (!req.file?.buffer?.length) {
            throw new ExpressError(400, "Please upload your resume.");
        }

        // ================== AVAILABLE OPENING ==================
        // Both types use the same Job model.
        const openingFilter = {
            _id: jobId,
            openingType: { $in: ["client", "internal"] },
            status: "Published",
        };

        const availableOpening = await Job.exists(openingFilter);

        if (!availableOpening) {
            throw new ExpressError(409, "This opening is unavailable or applications are closed.");
        }

        // ================== DUPLICATE APPLICATION CHECK ==================
        // A user can apply only once to the same opening.
        const existingApplication = await Application.exists({
            userId: req.user._id,
            jobId,
        });

        if (existingApplication) {
            throw new ExpressError(409, "You have already applied for this opening.");
        }

        // ================== UPLOAD VERIFIED RESUME ==================
        const extension = path.extname(req.file.originalname).toLowerCase();
        const storageKey = `recruitment/resumes/${applicationId}${extension}`;

        try {
            uploadedResume = await uploadResumeToCloudinary(req.file, storageKey);
        } catch (error) {
            if (process.env.NODE_ENV !== "production") {
                console.error("Cloudinary upload failed:", {
                    name: error.name,
                    message: error.message,
                    http_code: error.http_code,
                    code: error.code,
                });
            }

            throw new ExpressError(
                502,
                "Resume upload could not be confirmed. Please try again later."
            );
        }

        // ================== SAVE APPLICATION TRANSACTION ==================
        // Recheck publication status after upload.
        // Writing the opening document handles concurrent admin closing.
        const application = await mongoose.connection.transaction(
            async (session) => {
                const opening = await Job.findOneAndUpdate(
                    openingFilter,
                    {
                        $inc: { __v: 1 },
                    },
                    {
                        session,
                        returnDocument: "after",
                        timestamps: false,
                    }
                );

                if (!opening) {
                    throw new ExpressError(
                        409,
                        "Applications closed before your submission completed."
                    );
                }

                const { name, email, phone, qualification, experience, skills } = req.body;

                const [createdApplication] = await Application.create(
                    [
                        {
                            _id: applicationId,

                            // Ownership and opening type come from trusted data.
                            userId: req.user._id,
                            jobId: opening._id,
                            openingType: opening.openingType,

                            // Preserve opening details at submission time.
                            jobSnapshot: {
                                title: opening.title,
                                company: opening.company || "",
                                department: opening.department,
                                location: opening.location,
                                type: opening.type || "",
                                mode: opening.mode,
                                salary: opening.salary || "",
                            },

                            applicant: {
                                name,
                                email,
                                phone,
                                qualification,
                                experience,
                                skills,
                            },

                            // Preserve the original filename for panels/downloads.
                            resume: {
                                storageKey: uploadedResume.public_id,
                                name: req.file.originalname,
                                mimeType: req.file.mimetype,
                                size: req.file.size,
                            },

                            status: "Submitted",

                            history: [
                                {
                                    status: "Submitted",
                                    message: "Application submitted successfully.",
                                    changedBy: req.user._id,
                                    createdAt: new Date(),
                                },
                            ],
                        },
                    ],
                    { session }
                );

                return createdApplication;
            },
            {
                readPreference: "primary",
                writeConcern: { w: "majority" },
            }
        );

        applicationSaved = true;

        res.set("Cache-Control", "no-store");

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully.",
            application: {
                _id: application._id,
                id: String(application._id),
                jobId: application.jobId,
                openingType: application.openingType,
                status: application.status,
                createdAt: application.createdAt,
            },
        });
    } catch (error) {
        // An uncertain transaction commit may already have succeeded.
        const uncertainCommit = error.hasErrorLabel?.("UnknownTransactionCommitResult");

        if (uploadedResume && !applicationSaved && !uncertainCommit) {
            await cleanupUnusedResume(applicationId, uploadedResume.public_id);
        }

        // The unique database index also blocks concurrent duplicates.
        if (error.code === 11000) {
            return next(new ExpressError(409, "You have already applied for this opening."));
        }

        if (error.name === "ValidationError") {
            return next(new ExpressError(400, "Application details are invalid or incomplete."));
        }

        return next(error);
    } finally {
        if (req.file) {
            delete req.file.buffer;
        }
    }
}

// ================== USER DASHBOARD SUMMARY ==================
// GET /api/applications/my/dashboard
// Calculate all counts from MongoDB, not from paginated application lists.
async function getMyDashboard(req, res, next) {
    try {
        requireAccount(req, "user");
        validateQueryFields(req.query, []);

        // Use only the verified account ID from authentication middleware.
        const userId = req.user._id;

        // ================== DATABASE QUERIES ==================
        // Status counts, latest applications and history are independent.
        const [groupedCounts, applications, activity] = await Promise.all([
            Application.aggregate([
                { $match: { userId } },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]),

            Application.find({ userId })
                .select(
                    "_id jobSnapshot.title jobSnapshot.company jobSnapshot.location status createdAt"
                )
                .sort({ createdAt: -1, _id: -1 })
                .limit(5)
                .lean(),

            Application.aggregate([
                { $match: { userId } },
                {
                    $unwind: {
                        path: "$history",
                        includeArrayIndex: "entryIndex",
                    },
                },
                { $sort: { "history.createdAt": -1, _id: -1, entryIndex: -1 } },
                { $limit: 4 },
                {
                    $project: {
                        _id: 0,
                        applicationId: "$_id",
                        title: "$jobSnapshot.title",
                        status: "$history.status",
                        message: "$history.message",
                        at: "$history.createdAt",
                        entryIndex: 1,
                    },
                },
            ]),
        ]);

        // ================== APPLICATION COUNTS ==================
        const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));

        let total = 0;

        for (const item of groupedCounts) {
            if (Object.prototype.hasOwnProperty.call(byStatus, item._id)) {
                byStatus[item._id] = item.count;
                total += item.count;
            }
        }

        const counts = {
            total,
            pending: byStatus.Submitted + byStatus["Under Review"],
            shortlisted: byStatus.Shortlisted,
            rejected: byStatus.Rejected,
        };

        // ================== SAFE DASHBOARD RESPONSE ==================
        // Send only fields used by dashboard cards. Never send resume keys.
        const recentApplications = applications.map((application) => ({
            id: String(application._id),
            title: application.jobSnapshot?.title || "Application details",
            company: application.jobSnapshot?.company || "",
            location: application.jobSnapshot?.location || "",
            status: application.status,
            appliedAt: application.createdAt,
        }));

        const recentActivity = activity.map((event) => ({
            key: `${event.applicationId}-${event.entryIndex}`,
            applicationId: String(event.applicationId),
            title: event.title || "Application details",
            status: event.status,
            message: event.message || "",
            at: event.at,
        }));

        res.set("Cache-Control", "private, no-store");

        return res.status(200).json({
            success: true,
            counts,
            recentApplications,
            recentActivity,
        });
    } catch (error) {
        return next(error);
    }
}

// ================== USER APPLICATION LIST ==================
// GET /api/applications/my
async function getMyApplications(req, res, next) {
    try {
        requireAccount(req, "user");

        validateQueryFields(req.query, ["page", "limit", "status", "search"]);

        const { page, limit } = getPagination(req.query);

        const filter = {
            userId: req.user._id,
        };

        applyStatusFilter(filter, req.query.status);
        applySearchFilter(filter, req.query.search);

        const result = await getApplicationList(filter, page, limit);

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        return next(error);
    }
}

// ================== USER APPLICATION DETAILS ==================
// GET /api/applications/my/:id
async function getMyApplication(req, res, next) {
    try {
        requireAccount(req, "user");
        validateObjectId(req.params.id, "application");

        const application = await Application.findOne({
            _id: req.params.id,
            userId: req.user._id,
        })
            .select(APPLICATION_FIELDS)
            .lean();

        if (!application) {
            throw new ExpressError(404, "Application not found.");
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            application: getApplicationResponse(application),
        });
    } catch (error) {
        return next(error);
    }
}

// ================== ADMIN APPLICATION LIST ==================
// GET /api/applications/admin
async function getAdminApplications(req, res, next) {
    try {
        requireAccount(req, "admin");

        validateQueryFields(req.query, [
            "page",
            "limit",
            "status",
            "search",
            "openingType",
            "jobId",
        ]);

        const { page, limit } = getPagination(req.query);
        const filter = {};

        applyStatusFilter(filter, req.query.status);
        applyOpeningTypeFilter(filter, req.query.openingType);
        applySearchFilter(filter, req.query.search, true);

        if (req.query.jobId !== undefined) {
            validateObjectId(req.query.jobId, "job");
            filter.jobId = req.query.jobId;
        }

        const [result, counts] = await Promise.all([
            getApplicationList(filter, page, limit),
            getApplicationCounts(),
        ]);

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            ...result,
            counts,
        });
    } catch (error) {
        return next(error);
    }
}

// ================== ADMIN JOB FILTER OPTIONS ==================
// GET /api/applications/admin/options
// Read all applied openings, not just jobs on the current table page.
async function getAdminApplicationOptions(req, res, next) {
    try {
        requireAccount(req, "admin");

        validateQueryFields(req.query, ["openingType"]);

        const filter = {};

        applyOpeningTypeFilter(filter, req.query.openingType);

        const openings = await Application.aggregate([
            {
                $match: filter,
            },
            {
                $sort: {
                    createdAt: -1,
                    _id: -1,
                },
            },
            {
                $group: {
                    _id: {
                        jobId: "$jobId",
                        openingType: "$openingType",
                    },
                    title: { $first: "$jobSnapshot.title" },
                    company: { $first: "$jobSnapshot.company" },
                },
            },
            {
                $project: {
                    _id: 0,
                    jobId: "$_id.jobId",
                    openingType: "$_id.openingType",
                    title: 1,
                    company: 1,
                },
            },
            {
                $sort: {
                    title: 1,
                    company: 1,
                    jobId: 1,
                },
            },
        ]);

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            openings,
        });
    } catch (error) {
        return next(error);
    }
}

// ================== ADMIN APPLICATION DETAILS ==================
// GET /api/applications/admin/:id
async function getAdminApplication(req, res, next) {
    try {
        requireAccount(req, "admin");
        validateObjectId(req.params.id, "application");

        const application = await Application.findById(req.params.id)
            .select(APPLICATION_FIELDS)
            .lean();

        if (!application) {
            throw new ExpressError(404, "Application not found.");
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            application: getApplicationResponse(application),
        });
    } catch (error) {
        return next(error);
    }
}

// ================== ADMIN STATUS UPDATE ==================
// PATCH /api/applications/admin/:id/status
// Joi validation must run before this controller.
async function updateApplicationStatus(req, res, next) {
    try {
        requireAccount(req, "admin");
        validateObjectId(req.params.id, "application");

        const { expectedStatus, status, message = "", interview } = req.body;

        // Load the full document for model validation and version checking.
        // The storage key is never included in the response.
        const application = await Application.findById(req.params.id).select("+resume.storageKey");

        if (!application) {
            throw new ExpressError(404, "Application not found.");
        }

        if (application.status !== expectedStatus) {
            throw new ExpressError(
                409,
                "Application status changed. Refresh the details and try again."
            );
        }

        const allowedStatuses = STATUS_TRANSITIONS[application.status] || [];

        if (!allowedStatuses.includes(status)) {
            throw new ExpressError(409, "This status change is not allowed.");
        }

        // ================== INTERVIEW DETAILS ==================
        if (status === "Interview") {
            const interviewDate = new Date(interview?.at);

            if (
                !Number.isFinite(interviewDate.getTime()) ||
                interviewDate.getTime() <= Date.now()
            ) {
                throw new ExpressError(400, "Please select a future interview date and time.");
            }

            if (!["Online", "In-person", "Phone"].includes(interview?.mode)) {
                throw new ExpressError(400, "Please select a valid interview mode.");
            }

            application.interview = {
                at: interviewDate,
                mode: interview.mode,
                note: message,
            };
        }

        // ================== SELECTION DETAILS ==================
        if (status === "Selected") {
            application.selection = {
                note: message,
            };
        }

        // Keep existing interview information as part of the application.
        application.status = status;

        application.history.push({
            status,
            message,
            changedBy: req.user._id,
            createdAt: new Date(),
        });

        // Model optimisticConcurrency prevents simultaneous overwrites.
        await application.save();

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            message: "Application status updated successfully.",
            application: getApplicationResponse(application),
        });
    } catch (error) {
        if (error.name === "VersionError") {
            return next(
                new ExpressError(
                    409,
                    "Application changed while you were updating it. Refresh and try again."
                )
            );
        }

        if (error.name === "ValidationError") {
            return next(
                new ExpressError(400, "Application update contains invalid or incomplete details.")
            );
        }

        return next(error);
    }
}

// ================== ADMIN RESUME ACCESS ==================
// GET /api/applications/:id/resume?mode=view
// GET /api/applications/:id/resume?mode=download
// View returns a PDF inline; download returns the original file as an attachment.
async function getResumeAccess(req, res, next) {
    try {
        requireAccount(req, "admin");
        validateObjectId(req.params.id, "application");

        validateQueryFields(req.query, ["mode"]);

        const mode = req.query.mode ?? "download";

        if (typeof mode !== "string" || !["view", "download"].includes(mode)) {
            throw new ExpressError(400, "Resume mode must be view or download.");
        }

        const application = await Application.findById(req.params.id)
            .select("resume.name resume.mimeType resume.size +resume.storageKey")
            .lean();

        if (!application) {
            throw new ExpressError(404, "Application not found.");
        }

        const resume = application.resume;

        if (!resume?.storageKey) {
            throw new ExpressError(404, "Resume not found.");
        }

        return await sendPrivateResume(res, resume, mode, resume.storageKey);
    } catch (error) {
        return next(error);
    }
}

// ================== EXPORTS ==================
module.exports = {
    createApplication,
    getMyDashboard,
    getMyApplications,
    getMyApplication,
    getAdminApplications,
    getAdminApplicationOptions,
    getAdminApplication,
    updateApplicationStatus,
    getResumeAccess,
};
