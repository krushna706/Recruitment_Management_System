const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { randomUUID } = require("node:crypto");
const User = require("../models/User");
const Application = require("../models/Application");
const Job = require("../models/Job");
const { uploadAvatar: uploadAdminAvatar, deleteAvatar: deleteAdminAvatar, sendPrivateResume } = require("../utils/fileStorage");
const ExpressError = require("../utils/ExpressError");

// ================== ADMIN ACCESS ==================
// Routes must also use authMiddleware and roleMiddleware("admin").
function requireAdmin(req) {
    if (!req.user) {
        throw new ExpressError(401, "Please login to continue.");
    }

    if (req.user.role !== "admin") {
        throw new ExpressError(403, "Admin access is required.");
    }
}

// ================== QUERY VALIDATION ==================
function validateQuery(query, allowedFields) {
    if (Object.keys(query).some((key) => !allowedFields.includes(key))) {
        throw new ExpressError(400, "Unsupported user filter.");
    }
}

function positiveInteger(value, defaultValue, maximum, label) {
    if (value === undefined) return defaultValue;

    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
        throw new ExpressError(400, `${label} must be a positive whole number.`);
    }

    const number = Number(value);

    if (!Number.isSafeInteger(number) || number > maximum) {
        throw new ExpressError(400, `${label} cannot exceed ${maximum}.`);
    }

    return number;
}

function getUserId(value) {
    if (typeof value !== "string" || !/^[a-fA-F0-9]{24}$/.test(value)) {
        throw new ExpressError(400, "Invalid user ID.");
    }

    return new mongoose.Types.ObjectId(value);
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ================== SAFE USER RESPONSE ==================
// Exclude password hashes, session versions and Cloudinary public IDs.
function toUserResponse(user, applicationCount = 0) {
    return {
        id: String(user._id),
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        qualification: user.qualification || "",
        experience: user.experience || "",
        skills: user.skills || [],
        avatar: {
            url: user.avatar?.url || "",
        },
        resume: user.resume
            ? {
                  name: user.resume.name,
                  mimeType: user.resume.mimeType,
                  size: user.resume.size,
                  uploadedAt: user.resume.uploadedAt,
              }
            : null,
        role: user.role,
        status: user.status,
        joinedAt: user.createdAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt || null,
        applicationCount,
    };
}

// ================== USER COUNTS ==================
// Calculate counts from the complete database, not only the current page.
async function getUserCounts() {
    const [total, active, applicantCounts] = await Promise.all([
        User.countDocuments({ role: "user" }),

        User.countDocuments({
            role: "user",
            status: "Active",
        }),

        Application.aggregate([
            {
                $group: {
                    _id: "$userId",
                },
            },
            {
                $count: "total",
            },
        ]),
    ]);

    return {
        total,
        active,
        inactive: total - active,
        applicants: applicantCounts[0]?.total || 0,
    };
}

// ================== LIST REGISTERED USERS ==================
// GET /api/admin/users
// Search, filters and pagination are processed by MongoDB.
async function getUsers(req, res, next) {
    try {
        requireAdmin(req);

        validateQuery(req.query, ["page", "limit", "search", "status"]);

        const page = positiveInteger(req.query.page, 1, 100000, "Page");

        const limit = positiveInteger(req.query.limit, 5, 100, "Page size");

        const status = req.query.status ?? "All";

        if (!["All", "Active", "Inactive"].includes(status)) {
            throw new ExpressError(400, "Invalid account status filter.");
        }

        // ================== ROLE AND STATUS FILTER ==================
        // Never include admin accounts in candidate management.
        const filter = {
            role: "user",
        };

        if (status !== "All") {
            filter.status = status;
        }

        // ================== SEARCH FILTER ==================
        if (req.query.search !== undefined) {
            if (typeof req.query.search !== "string" || req.query.search.length > 100) {
                throw new ExpressError(400, "Search cannot exceed 100 characters.");
            }

            const search = req.query.search.trim();

            if (search) {
                const regex = new RegExp(escapeRegex(search), "i");

                filter.$or = [
                    { name: regex },
                    { email: regex },
                    { phone: regex },
                    { address: regex },
                ];

                // Allow searching by exact MongoDB user ID.
                if (/^[a-fA-F0-9]{24}$/.test(search)) {
                    filter.$or.push({
                        _id: new mongoose.Types.ObjectId(search),
                    });
                }
            }
        }

        // ================== FETCH MONGODB USERS ==================
        const [users, total, counts] = await Promise.all([
            User.find(filter)
                .select(
                    "name email phone address qualification experience " +
                        "skills avatar.url resume.name resume.mimeType " +
                        "resume.size resume.uploadedAt role status " +
                        "createdAt updatedAt lastLoginAt"
                )
                .sort({
                    createdAt: -1,
                    _id: -1,
                })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            User.countDocuments(filter),

            getUserCounts(),
        ]);

        // ================== APPLICATION COUNTS PER USER ==================
        // Fetch counts for the current page in one aggregation.
        const applicationTotals = users.length
            ? await Application.aggregate([
                  {
                      $match: {
                          userId: {
                              $in: users.map((user) => user._id),
                          },
                      },
                  },
                  {
                      $group: {
                          _id: "$userId",
                          count: { $sum: 1 },
                      },
                  },
              ])
            : [];

        const totalsByUser = new Map(
            applicationTotals.map((entry) => [String(entry._id), entry.count])
        );

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,

            users: users.map((user) =>
                toUserResponse(user, totalsByUser.get(String(user._id)) || 0)
            ),

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

// ================== USER PROFILE AND APPLICATION HISTORY ==================
// GET /api/admin/users/:id?page=1&limit=10
// Application ownership is based on userId, not email matching.
async function getUserDetails(req, res, next) {
    try {
        requireAdmin(req);

        validateQuery(req.query, ["page", "limit"]);

        const userId = getUserId(req.params.id);

        const page = positiveInteger(req.query.page, 1, 100000, "Page");

        const limit = positiveInteger(req.query.limit, 10, 50, "Page size");

        // ================== FETCH CANDIDATE PROFILE ==================
        const user = await User.findOne({
            _id: userId,
            role: "user",
        })
            .select(
                "name email phone address qualification experience " +
                    "skills avatar.url resume.name resume.mimeType " +
                    "resume.size resume.uploadedAt role status " +
                    "createdAt updatedAt lastLoginAt"
            )
            .lean();

        if (!user) {
            throw new ExpressError(404, "Candidate account not found.");
        }

        // ================== FETCH APPLICATION HISTORY ==================
        const [applications, totalApplications] = await Promise.all([
            Application.find({ userId })
                .select("openingType jobSnapshot.title " + "jobSnapshot.company status createdAt")
                .sort({
                    createdAt: -1,
                    _id: -1,
                })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            Application.countDocuments({ userId }),
        ]);

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,

            user: toUserResponse(user, totalApplications),

            applications: applications.map((application) => ({
                id: String(application._id),
                _id: application._id,
                openingType: application.openingType,
                title: application.jobSnapshot?.title || "Job unavailable",
                company: application.jobSnapshot?.company || "",
                status: application.status,
                appliedAt: application.createdAt,
            })),

            pagination: {
                page,
                limit,
                total: totalApplications,
                totalPages: Math.ceil(totalApplications / limit),
            },
        });
    } catch (error) {
        return next(error);
    }
}

// ================== ACTIVATE / DEACTIVATE CANDIDATE ==================
// PATCH /api/admin/users/:id/status
// Joi route validation will also check the request body.
async function updateUserStatus(req, res, next) {
    try {
        requireAdmin(req);

        const userId = getUserId(req.params.id);

        const { expectedStatus, status } = req.body || {};

        // ================== STATUS VALIDATION ==================
        if (
            !req.body ||
            Object.keys(req.body).some((key) => !["expectedStatus", "status"].includes(key)) ||
            !["Active", "Inactive"].includes(expectedStatus) ||
            !["Active", "Inactive"].includes(status) ||
            expectedStatus === status
        ) {
            throw new ExpressError(400, "Provide a valid account status change.");
        }

        // ================== ATOMIC STATUS UPDATE ==================
        // Prevent conflicting admin actions.
        // Revoke old sessions whenever account access changes.
        const user = await User.findOneAndUpdate(
            {
                _id: userId,
                role: "user",
                status: expectedStatus,
            },
            {
                $set: {
                    status,
                },

                $inc: {
                    tokenVersion: 1,
                    __v: 1,
                },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!user) {
            const exists = await User.exists({
                _id: userId,
                role: "user",
            });

            throw new ExpressError(
                exists ? 409 : 404,
                exists
                    ? "Account status changed. Refresh and try again."
                    : "Candidate account not found."
            );
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,

            message:
                status === "Active"
                    ? "User activated successfully."
                    : "User deactivated successfully.",

            user: toUserResponse(user),
        });
    } catch (error) {
        return next(error);
    }
}

// ================== ADMIN PROFILE RESUME ACCESS ==================
// GET /api/admin/users/:id/resume?mode=view|download
// Only authenticated admins can access candidate profile resumes.
async function getUserProfileResume(req, res, next) {
    try {
        requireAdmin(req);

        const userId = getUserId(req.params.id);

        validateQuery(req.query, ["mode"]);

        const mode = req.query.mode ?? "download";

        if (typeof mode !== "string" || !["view", "download"].includes(mode)) {
            throw new ExpressError(400, "Resume mode must be view or download.");
        }

        // ================== FETCH CANDIDATE RESUME ==================
        // Fetch private storage ID only on this authorized endpoint.
        const user = await User.findOne({
            _id: userId,
            role: "user",
        })
            .select("resume.name resume.mimeType resume.size +resume.publicId")
            .lean();

        if (!user) {
            throw new ExpressError(404, "Candidate not found.");
        }

        const resume = user.resume;

        if (!resume?.publicId) {
            throw new ExpressError(404, "Candidate profile resume not found.");
        }

        return await sendPrivateResume(res, resume, mode, resume.publicId);
    } catch (error) {
        return next(error);
    }
}

// ================== SAFE ADMIN RESPONSE ==================
// Never expose password hashes, token versions or Cloudinary public IDs.
function toAdminResponse(admin) {
    return {
        id: String(admin._id),
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone || "",
        role: admin.role,
        status: admin.status,

        // Frontend shows default avatar when this URL is empty.
        avatar: {
            url: admin.avatar?.url || "",
        },

        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
        lastLoginAt: admin.lastLoginAt || null,
        createdBy: admin.createdBy || null,
    };
}

// ================== ADMIN DATABASE ERRORS ==================
function handleAdminError(error, next) {
    if (error.code === 11000 && error.keyPattern?.email) {
        return next(new ExpressError(409, "This email address is already in use."));
    }

    if (error.name === "ValidationError") {
        return next(new ExpressError(400, "Admin details are invalid."));
    }

    if (error.name === "VersionError" || error.hasErrorLabel?.("TransientTransactionError")) {
        return next(new ExpressError(409, "Account changed. Refresh and try again."));
    }

    return next(error);
}

// ================== VERIFY ACTING ADMIN PASSWORD ==================
// Sensitive administration actions require reauthentication.
async function verifyActingAdminPassword(adminId, password) {
    const admin = await User.findOne({
        _id: adminId,
        role: "admin",
        status: "Active",
    }).select("+passwordHash +mustChangePassword");

    if (!admin) {
        throw new ExpressError(403, "Admin account is unavailable.");
    }

    if (typeof password !== "string") {
        throw new ExpressError(400, "Enter your current password.");
    }

    const matches = await bcrypt.compare(password, admin.passwordHash);

    if (!matches) {
        throw new ExpressError(403, "Current password is incorrect.");
    }

    if (admin.mustChangePassword) {
        throw new ExpressError(403, "Change your initial password before managing admins.");
    }

    return admin;
}

// ================== ADMIN STATISTICS ==================
async function getAdminCounts() {
    const [total, active] = await Promise.all([
        User.countDocuments({ role: "admin" }),

        User.countDocuments({
            role: "admin",
            status: "Active",
        }),
    ]);

    return {
        total,
        active,
        inactive: total - active,
    };
}

// ================== GET ALL ADMINS ==================
// GET /api/admin/admins
// Supports searching, status filtering and pagination.
async function getAdmins(req, res, next) {
    try {
        requireAdmin(req);

        validateQuery(req.query, ["page", "limit", "search", "status"]);

        const page = positiveInteger(req.query.page, 1, 100000, "Page");

        const limit = positiveInteger(req.query.limit, 10, 100, "Page size");

        const status = req.query.status ?? "All";

        if (!["All", "Active", "Inactive"].includes(status)) {
            throw new ExpressError(400, "Invalid admin status filter.");
        }

        // ================== ADMIN FILTER ==================
        const filter = { role: "admin" };

        if (status !== "All") {
            filter.status = status;
        }

        // ================== SEARCH FILTER ==================
        if (req.query.search !== undefined) {
            if (typeof req.query.search !== "string" || req.query.search.length > 100) {
                throw new ExpressError(400, "Search cannot exceed 100 characters.");
            }

            const search = req.query.search.trim();

            if (search) {
                const regex = new RegExp(escapeRegex(search), "i");

                filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
            }
        }

        // ================== FETCH ADMINS ==================
        const [admins, total, counts] = await Promise.all([
            User.find(filter)
                .select(
                    "name email phone role status avatar.url " +
                        "createdAt updatedAt lastLoginAt createdBy"
                )
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),

            User.countDocuments(filter),

            getAdminCounts(),
        ]);

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,

            admins: admins.map(toAdminResponse),

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

// ================== GET ADMIN DETAILS ==================
// GET /api/admin/admins/:id
async function getAdminDetails(req, res, next) {
    try {
        requireAdmin(req);

        const adminId = getUserId(req.params.id);

        const admin = await User.findOne({
            _id: adminId,
            role: "admin",
        })
            .select(
                "name email phone role status avatar.url " +
                    "createdAt updatedAt lastLoginAt createdBy"
            )
            .lean();

        if (!admin) {
            throw new ExpressError(404, "Admin account not found.");
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            admin: toAdminResponse(admin),
        });
    } catch (error) {
        return next(error);
    }
}

// ================== CREATE ADMIN ==================
// POST /api/admin/admins
// Public registration must never create admin accounts.
async function createAdmin(req, res, next) {
    try {
        requireAdmin(req);

        const { name, email, phone, password, currentPassword } = req.body;

        // Verify the currently logged-in administrator.
        await verifyActingAdminPassword(req.user._id, currentPassword);

        // ================== HASH ADMIN PASSWORD ==================
        const passwordHash = await bcrypt.hash(password, 12);

        // ================== SAVE ADMIN ==================
        const admin = await User.create({
            name,
            email,
            phone,
            passwordHash,
            role: "admin",
            status: "Active",
            tokenVersion: 0,
            mustChangePassword: true,
            createdBy: req.user._id,
        });

        res.set("Cache-Control", "no-store");

        return res.status(201).json({
            success: true,
            message: "Admin created successfully. Initial password change is required.",
            admin: toAdminResponse(admin),
        });
    } catch (error) {
        return handleAdminError(error, next);
    }
}

// ================== EDIT ADMIN DETAILS ==================
// PATCH /api/admin/admins/:id
// Only name, email and phone are editable.
async function updateAdmin(req, res, next) {
    try {
        requireAdmin(req);

        const adminId = getUserId(req.params.id);
        const changes = {};

        for (const field of ["name", "email", "phone"]) {
            if (Object.hasOwn(req.body, field)) {
                changes[field] = req.body[field];
            }
        }

        if (!Object.keys(changes).length) {
            throw new ExpressError(400, "No admin changes provided.");
        }

        // ================== EMAIL CHANGE SECURITY ==================
        if (changes.email !== undefined) {
            await verifyActingAdminPassword(req.user._id, req.body.currentPassword);
        }

        const existing = await User.findOne({
            _id: adminId,
            role: "admin",
        }).select("email __v");

        if (!existing) {
            throw new ExpressError(404, "Admin account not found.");
        }

        const emailChanged = changes.email !== undefined && changes.email !== existing.email;

        // ================== ATOMIC ADMIN UPDATE ==================
        const updated = await User.findOneAndUpdate(
            {
                _id: adminId,
                role: "admin",
                __v: existing.__v,
            },
            {
                $set: changes,
                ...(emailChanged ? { $unset: { passwordReset: "" } } : {}),
                $inc: {
                    __v: 1,
                    ...(emailChanged ? { tokenVersion: 1 } : {}),
                },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!updated) {
            throw new ExpressError(409, "Admin changed. Refresh and try again.");
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            message: "Admin updated successfully.",
            admin: toAdminResponse(updated),
        });
    } catch (error) {
        return handleAdminError(error, next);
    }
}

// ================== ADMIN STATUS GUARD ==================
// A shared MongoDB document serializes admin status changes.
// This prevents concurrent requests from disabling every admin.
async function lockAdminStatusGuard(session) {
    await mongoose.connection
        .collection("system_guards")
        .updateOne({ _id: "admin-access" }, { $inc: { revision: 1 } }, { session });
}

// ================== ACTIVATE / DEACTIVATE ADMIN ==================
// PATCH /api/admin/admins/:id/status
async function updateAdminStatus(req, res, next) {
    let session;

    try {
        requireAdmin(req);

        const adminId = getUserId(req.params.id);

        const { expectedStatus, status, currentPassword } = req.body || {};

        // ================== VALIDATE STATUS ==================
        if (
            !["Active", "Inactive"].includes(expectedStatus) ||
            !["Active", "Inactive"].includes(status) ||
            expectedStatus === status ||
            typeof currentPassword !== "string"
        ) {
            throw new ExpressError(
                400,
                "Provide a valid admin status change and current password."
            );
        }

        if (status === "Inactive" && String(adminId) === String(req.user._id)) {
            throw new ExpressError(409, "You cannot deactivate your own account here.");
        }

        const actingAdmin = await verifyActingAdminPassword(req.user._id, currentPassword);

        // Initialize the shared guard before starting the transaction.
        await mongoose.connection
            .collection("system_guards")
            .updateOne(
                { _id: "admin-access" },
                { $setOnInsert: { revision: 0 } },
                { upsert: true }
            );

        session = await mongoose.startSession();
        let updatedAdmin = null;

        // ================== ATOMIC STATUS TRANSACTION ==================
        await session.withTransaction(async () => {
            await lockAdminStatusGuard(session);

            // Serialize with account changes and recheck the actor inside the transaction.
            const actor = await User.updateOne(
                {
                    _id: actingAdmin._id,
                    role: "admin",
                    status: "Active",
                    passwordHash: actingAdmin.passwordHash,
                    mustChangePassword: false,
                },
                { $inc: { __v: 1 } },
                { session }
            );
            if (actor.matchedCount !== 1) {
                throw new ExpressError(403, "Your admin access changed. Please login again.");
            }

            const target = await User.findOne({
                _id: adminId,
                role: "admin",
            }).session(session);

            if (!target) {
                throw new ExpressError(404, "Admin account not found.");
            }

            if (target.status !== expectedStatus) {
                throw new ExpressError(409, "Admin status changed. Refresh and try again.");
            }

            // ================== LAST ACTIVE ADMIN PROTECTION ==================
            if (status === "Inactive") {
                const activeCount = await User.countDocuments({
                    role: "admin",
                    status: "Active",
                }).session(session);

                if (activeCount <= 1) {
                    throw new ExpressError(409, "Cannot deactivate the last active admin.");
                }

                // Verify replacement access before retiring
                // an initially provisioned administrator.
                if (!target.createdBy) {
                    const replacement = await User.exists({
                        _id: { $ne: adminId },
                        role: "admin",
                        status: "Active",
                        lastLoginAt: { $ne: null },
                        mustChangePassword: false,
                    }).session(session);

                    if (!replacement) {
                        throw new ExpressError(
                            409,
                            "Another active admin must login successfully before replacing the initial admin."
                        );
                    }
                }
            }

            // ================== SAVE STATUS + REVOKE SESSIONS ==================
            updatedAdmin = await User.findOneAndUpdate(
                {
                    _id: adminId,
                    role: "admin",
                    status: expectedStatus,
                },
                {
                    $set: { status },
                    $inc: {
                        tokenVersion: 1,
                        __v: 1,
                    },
                },
                {
                    returnDocument: "after",
                    runValidators: true,
                    session,
                }
            );

            if (!updatedAdmin) {
                throw new ExpressError(409, "Admin changed. Refresh and try again.");
            }
        });

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,

            message:
                status === "Active"
                    ? "Admin activated successfully."
                    : "Admin deactivated successfully.",

            admin: toAdminResponse(updatedAdmin),
        });
    } catch (error) {
        return handleAdminError(error, next);
    } finally {
        if (session) {
            await session.endSession();
        }
    }
}

// ================== GET MY ADMIN PROFILE ==================
// GET /api/admin/me/profile
async function getMyAdminProfile(req, res, next) {
    try {
        requireAdmin(req);

        const admin = await User.findOne({
            _id: req.user._id,
            role: "admin",
            status: "Active",
        }).select("+mustChangePassword");

        if (!admin) {
            throw new ExpressError(403, "Admin profile is unavailable.");
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            profile: {
                ...toAdminResponse(admin),
                mustChangePassword: Boolean(admin.mustChangePassword),
            },
        });
    } catch (error) {
        return next(error);
    }
}

// ================== UPDATE MY ADMIN PROFILE ==================
// PATCH /api/admin/me/profile
// Admins can update their own name and phone.
async function updateMyAdminProfile(req, res, next) {
    try {
        requireAdmin(req);

        const changes = {};

        // ================== ALLOWED PROFILE FIELDS ==================
        // Never allow role, status or password changes here.
        for (const field of ["name", "phone"]) {
            if (Object.hasOwn(req.body, field)) {
                changes[field] = req.body[field];
            }
        }

        if (!Object.keys(changes).length) {
            throw new ExpressError(400, "No profile changes provided.");
        }

        const current = await User.findOne({
            _id: req.user._id,
            role: "admin",
            status: "Active",
        }).select("__v");

        if (!current) {
            throw new ExpressError(403, "Admin profile is unavailable.");
        }

        // ================== ATOMIC PROFILE UPDATE ==================
        const updated = await User.findOneAndUpdate(
            {
                _id: current._id,
                role: "admin",
                status: "Active",
                __v: current.__v,
            },
            {
                $set: changes,
                $inc: { __v: 1 },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).select("+mustChangePassword");

        if (!updated) {
            throw new ExpressError(409, "Profile changed. Refresh and try again.");
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            message: "Admin profile updated successfully.",
            profile: {
                ...toAdminResponse(updated),
                mustChangePassword: Boolean(updated.mustChangePassword),
            },
        });
    } catch (error) {
        return handleAdminError(error, next);
    }
}

// ================== CHANGE MY ADMIN PASSWORD ==================
// PATCH /api/admin/me/password
// Verify existing password and revoke all previous JWT sessions.
async function changeMyAdminPassword(req, res, next) {
    try {
        requireAdmin(req);

        const { currentPassword, newPassword } = req.body || {};

        // ================== PASSWORD VALIDATION ==================
        // Same minimum 6-character rule as normal user signup.
        if (
            typeof currentPassword !== "string" ||
            typeof newPassword !== "string" ||
            newPassword.length < 6 ||
            Buffer.byteLength(newPassword, "utf8") > 72 ||
            currentPassword === newPassword
        ) {
            throw new ExpressError(
                400,
                "Enter a different new password with at least 6 characters."
            );
        }

        // ================== VERIFY CURRENT PASSWORD ==================
        // Do not use the management-only password helper here.
        // An admin with mustChangePassword=true must be able to change it.
        const admin = await User.findOne({
            _id: req.user._id,
            role: "admin",
            status: "Active",
        }).select("+passwordHash +tokenVersion");

        if (!admin) {
            throw new ExpressError(403, "Admin account is unavailable.");
        }

        const matches = await bcrypt.compare(currentPassword, admin.passwordHash);

        if (!matches) {
            throw new ExpressError(403, "Current password is incorrect.");
        }

        // ================== HASH NEW PASSWORD ==================
        const passwordHash = await bcrypt.hash(newPassword, 12);

        // ================== ATOMIC PASSWORD UPDATE ==================
        const updated = await User.findOneAndUpdate(
            {
                _id: admin._id,
                role: "admin",
                status: "Active",
                passwordHash: admin.passwordHash,
                tokenVersion: admin.tokenVersion,
            },
            {
                $set: {
                    passwordHash,
                    passwordChangedAt: new Date(),
                    mustChangePassword: false,
                },
                $unset: { passwordReset: "" },
                $inc: {
                    tokenVersion: 1,
                    __v: 1,
                },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!updated) {
            throw new ExpressError(409, "Account changed. Please login again.");
        }

        // ================== CLEAR AUTHENTICATION COOKIE ==================
        // Previous tokens are invalid after tokenVersion increments.
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        });

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            message: "Password changed successfully. Please login again.",
            requiresLogin: true,
        });
    } catch (error) {
        return handleAdminError(error, next);
    }
}

// ================== CLEANUP FAILED AVATAR UPDATE ==================
// Do not delete an uploaded image if MongoDB already references it.
async function cleanupAdminAvatar(adminId, publicId) {
    try {
        const linked = await User.exists({
            _id: adminId,
            "avatar.publicId": publicId,
        });

        if (!linked) {
            await deleteAdminAvatar(publicId);
        }
    } catch {
        console.error("Admin avatar cleanup needs review.");
    }
}

// ================== UPLOAD / REPLACE MY ADMIN AVATAR ==================
// POST /api/admin/me/avatar
// uploadAvatar middleware validates actual file content and max 3 MB.
async function uploadMyAdminAvatar(req, res, next) {
    const MAX_AVATAR_SIZE = 3 * 1024 * 1024;

    let uploadedPublicId = null;
    let avatarSaved = false;

    try {
        requireAdmin(req);

        // ================== VALIDATE IMAGE ==================
        if (
            !req.file?.buffer?.length ||
            req.file.size > MAX_AVATAR_SIZE ||
            !["image/jpeg", "image/png", "image/webp"].includes(req.file.mimetype)
        ) {
            throw new ExpressError(400, "Upload a valid JPG, PNG or WebP image up to 3 MB.");
        }

        // ================== GET EXISTING AVATAR ==================
        const admin = await User.findOne({
            _id: req.user._id,
            role: "admin",
            status: "Active",
        }).select("+avatar.publicId");

        if (!admin) {
            throw new ExpressError(403, "Admin profile is unavailable.");
        }

        const previousPublicId = admin.avatar?.publicId || null;

        // ================== UPLOAD NEW AVATAR ==================
        // Keep previous avatar until MongoDB confirms replacement.
        let uploaded;

        try {
            uploaded = await uploadAdminAvatar(req.file, `${admin._id}_${randomUUID()}`);

            uploadedPublicId = uploaded.public_id;
        } catch {
            throw new ExpressError(502, "Profile image upload failed. Please try again.");
        }

        // ================== ATOMIC AVATAR REPLACEMENT ==================
        const updated = await User.findOneAndUpdate(
            {
                _id: admin._id,
                role: "admin",
                status: "Active",
                __v: admin.__v,
            },
            {
                $set: {
                    avatar: {
                        url: uploaded.secure_url,
                        publicId: uploadedPublicId,
                    },
                },
                $inc: { __v: 1 },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!updated) {
            throw new ExpressError(409, "Profile changed. Refresh and upload again.");
        }

        avatarSaved = true;

        // ================== DELETE PREVIOUS AVATAR ==================
        // Delete only after successful MongoDB update.
        if (previousPublicId && previousPublicId !== uploadedPublicId) {
            try {
                await deleteAdminAvatar(previousPublicId);
            } catch {
                console.error("Previous admin avatar needs cleanup.");
            }
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            message: "Admin profile image updated successfully.",
            avatar: {
                url: updated.avatar?.url || "",
            },
            profile: toAdminResponse(updated),
        });
    } catch (error) {
        // ================== FAILED UPLOAD CLEANUP ==================
        if (uploadedPublicId && !avatarSaved) {
            await cleanupAdminAvatar(req.user?._id, uploadedPublicId);
        }

        return handleAdminError(error, next);
    } finally {
        if (req.file) {
            delete req.file.buffer;
        }
    }
}

// ================== ADMIN DASHBOARD ==================
// GET /api/admin/dashboard
async function getAdminDashboard(req, res, next) {
    try {
        // ================== ADMIN ACCESS ==================
        requireAdmin(req);
        validateQuery(req.query, []);

        // ================== FETCH DASHBOARD DATA ==================
        const [
            jobGroups,
            applicationGroups,
            registeredUsers,
            latestApplications,
            statusHistory,
            latestPublishedJobs,
        ] = await Promise.all([
            // ================== JOB STATISTICS ==================
            Job.aggregate([
                {
                    $group: {
                        _id: "$openingType",
                        total: { $sum: 1 },
                        published: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "Published"] }, 1, 0],
                            },
                        },
                    },
                },
            ]),

            // ================== APPLICATION STATISTICS ==================
            Application.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]),

            // ================== REGISTERED CANDIDATES ==================
            User.countDocuments({ role: "user" }),

            // ================== RECENT APPLICATIONS ==================
            Application.find()
                .select(
                    "applicant.name jobSnapshot.title " +
                        "jobSnapshot.company openingType status createdAt"
                )
                .sort({ createdAt: -1, _id: -1 })
                .limit(5)
                .lean(),

            // ================== APPLICATION STATUS HISTORY ==================
            Application.aggregate([
                { $unwind: "$history" },
                {
                    $sort: {
                        "history.createdAt": -1,
                        _id: -1,
                    },
                },
                { $limit: 6 },
                {
                    $project: {
                        candidate: "$applicant.name",
                        jobTitle: "$jobSnapshot.title",
                        status: "$history.status",
                        at: "$history.createdAt",
                    },
                },
            ]),

            // ================== RECENT PUBLISHED JOBS ==================
            Job.find({
                publishedAt: { $type: "date" },
            })
                .select("title openingType publishedAt")
                .sort({ publishedAt: -1, _id: -1 })
                .limit(6)
                .lean(),
        ]);

        // ================== JOB COUNTS ==================
        const clientJobs = {
            total: 0,
            published: 0,
        };

        const internalVacancies = {
            total: 0,
            published: 0,
        };

        for (const group of jobGroups) {
            if (group._id === "client") {
                clientJobs.total = group.total;
                clientJobs.published = group.published;
            }

            if (group._id === "internal") {
                internalVacancies.total = group.total;
                internalVacancies.published = group.published;
            }
        }

        // ================== APPLICATION STATUS COUNTS ==================
        const statusCounts = {
            Submitted: 0,
            "Under Review": 0,
            Shortlisted: 0,
            Interview: 0,
            Selected: 0,
            Rejected: 0,
        };

        let totalApplications = 0;

        for (const group of applicationGroups) {
            totalApplications += group.count;

            if (Object.hasOwn(statusCounts, group._id)) {
                statusCounts[group._id] = group.count;
            }
        }

        // Pending = Submitted + Under Review.
        const pending = statusCounts.Submitted + statusCounts["Under Review"];

        // ================== RECENT APPLICATIONS ==================
        const recentApplications = latestApplications.map((application) => ({
            id: String(application._id),

            candidate: application.applicant?.name || "Unknown candidate",

            title: application.jobSnapshot?.title || "Job unavailable",

            company:
                application.jobSnapshot?.company ||
                (application.openingType === "internal" ? "Internal Vacancy" : ""),

            openingType: application.openingType,
            status: application.status,
            appliedAt: application.createdAt,
        }));

        // ================== ACTIVITY DISPLAY CONFIG ==================
        const activityConfig = {
            Submitted: {
                title: "New application received",
                icon: "fa-regular fa-file-lines",
                tone: "blue",
            },

            "Under Review": {
                title: "Application moved to review",
                icon: "fa-regular fa-clock",
                tone: "amber",
            },

            Shortlisted: {
                title: "Candidate shortlisted",
                icon: "fa-solid fa-user-check",
                tone: "green",
            },

            Interview: {
                title: "Interview scheduled",
                icon: "fa-solid fa-calendar-check",
                tone: "purple",
            },

            Selected: {
                title: "Candidate selected",
                icon: "fa-solid fa-circle-check",
                tone: "green",
            },

            Rejected: {
                title: "Application rejected",
                icon: "fa-regular fa-circle-xmark",
                tone: "red",
            },
        };

        // ================== APPLICATION ACTIVITIES ==================
        const applicationActivities = statusHistory.map((entry) => {
            const config = activityConfig[entry.status] || {
                title: "Application updated",
                icon: "fa-regular fa-file-lines",
                tone: "blue",
            };

            return {
                id: `application-${entry._id}-` + `${entry.status}-${new Date(entry.at).getTime()}`,

                title: config.title,

                description: `${entry.candidate || "Candidate"} · ` + `${entry.jobTitle || "Job"}`,

                at: entry.at,
                icon: config.icon,
                tone: config.tone,
                path: "/manage/manage-applications",
            };
        });

        // ================== JOB PUBLICATION ACTIVITIES ==================
        const jobActivities = latestPublishedJobs.map((job) => ({
            id: `job-${job._id}`,

            title: job.openingType === "internal" ? "Vacancy published" : "Client job published",

            description: `${job.title} published for applications.`,

            at: job.publishedAt,
            icon: "fa-solid fa-briefcase",
            tone: "purple",

            path:
                job.openingType === "internal" ? "/manage/manage-vacancies" : "/manage/manage-jobs",
        }));

        // ================== RECENT ACTIVITIES ==================
        const recentActivities = [...applicationActivities, ...jobActivities]
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
            .slice(0, 4);

        // ================== DASHBOARD RESPONSE ==================
        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,

            stats: {
                clientJobs,
                internalVacancies,

                applications: {
                    total: totalApplications,
                    pending,
                    shortlisted: statusCounts.Shortlisted,
                    selected: statusCounts.Selected,
                    rejected: statusCounts.Rejected,
                },

                registeredUsers,
            },

            statusCounts,
            recentApplications,
            recentActivities,
        });
    } catch (error) {
        return next(error);
    }
}

// ================== EXPORTS ==================
module.exports = {
    getUsers,
    getUserDetails,
    updateUserStatus,
    getUserProfileResume,
    getAdmins,
    getAdminDetails,
    createAdmin,
    updateAdmin,
    updateAdminStatus,
    getMyAdminProfile,
    updateMyAdminProfile,
    changeMyAdminPassword,
    uploadMyAdminAvatar,
    getAdminDashboard,
};
