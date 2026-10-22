
const mongoose = require("mongoose");

const User = require("../models/User");
const Application = require("../models/Application");
const cloudinary = require("../config/cloudinary");
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
        throw new ExpressError(
            400,
            `${label} must be a positive whole number.`
        );
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

        validateQuery(req.query, [
            "page",
            "limit",
            "search",
            "status",
        ]);

        const page = positiveInteger(
            req.query.page,
            1,
            100000,
            "Page"
        );

        const limit = positiveInteger(
            req.query.limit,
            5,
            100,
            "Page size"
        );

        const status = req.query.status ?? "All";

        if (!["All", "Active", "Inactive"].includes(status)) {
            throw new ExpressError(
                400,
                "Invalid account status filter."
            );
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
            if (
                typeof req.query.search !== "string" ||
                req.query.search.length > 100
            ) {
                throw new ExpressError(
                    400,
                    "Search cannot exceed 100 characters."
                );
            }

            const search = req.query.search.trim();

            if (search) {
                const regex = new RegExp(
                    escapeRegex(search),
                    "i"
                );

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
            applicationTotals.map((entry) => [
                String(entry._id),
                entry.count,
            ])
        );

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,

            users: users.map((user) =>
                toUserResponse(
                    user,
                    totalsByUser.get(String(user._id)) || 0
                )
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

        const page = positiveInteger(
            req.query.page,
            1,
            100000,
            "Page"
        );

        const limit = positiveInteger(
            req.query.limit,
            10,
            50,
            "Page size"
        );

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
            throw new ExpressError(
                404,
                "Candidate account not found."
            );
        }

        // ================== FETCH APPLICATION HISTORY ==================
        const [applications, totalApplications] =
            await Promise.all([
                Application.find({ userId })
                    .select(
                        "openingType jobSnapshot.title " +
                        "jobSnapshot.company status createdAt"
                    )
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

            user: toUserResponse(
                user,
                totalApplications
            ),

            applications: applications.map((application) => ({
                id: String(application._id),
                _id: application._id,
                openingType: application.openingType,
                title:
                    application.jobSnapshot?.title ||
                    "Job unavailable",
                company:
                    application.jobSnapshot?.company || "",
                status: application.status,
                appliedAt: application.createdAt,
            })),

            pagination: {
                page,
                limit,
                total: totalApplications,
                totalPages: Math.ceil(
                    totalApplications / limit
                ),
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
            Object.keys(req.body).some(
                (key) =>
                    !["expectedStatus", "status"].includes(key)
            ) ||
            !["Active", "Inactive"].includes(expectedStatus) ||
            !["Active", "Inactive"].includes(status) ||
            expectedStatus === status
        ) {
            throw new ExpressError(
                400,
                "Provide a valid account status change."
            );
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

         if (
             typeof mode !== "string" ||
             !["view", "download"].includes(mode)
         ) {
             throw new ExpressError(
                 400,
                 "Resume mode must be view or download."
             );
         }

         // ================== FETCH CANDIDATE RESUME ==================
         // Fetch private storage ID only on this authorized endpoint.
         const user = await User.findOne({
             _id: userId,
             role: "user",
         })
             .select(
                 "resume.name resume.mimeType resume.size +resume.publicId"
             )
             .lean();

         if (!user) {
             throw new ExpressError(404, "Candidate not found.");
         }

         const resume = user.resume;

         if (!resume?.publicId) {
             throw new ExpressError(
                 404,
                 "Candidate profile resume not found."
             );
         }

         if (
             mode === "view" &&
             resume.mimeType !== "application/pdf"
         ) {
             throw new ExpressError(
                 400,
                 "Preview is available only for PDF resumes."
             );
         }

         // ================== PRIVATE CLOUDINARY ACCESS ==================
         // Generate a short-lived signed URL on the server.
         // Never expose this URL directly to the frontend.
         const signedUrl = cloudinary.utils.private_download_url(
             resume.publicId,
             undefined,
             {
                 resource_type: "raw",
                 type: "private",
                 attachment: false,
                 expires_at: Math.floor(Date.now() / 1000) + 60,
                 secure: true,
             }
         );

         // ================== DOWNLOAD PRIVATE FILE ==================
         const maxSize = 5 * 1024 * 1024;
         let fileBuffer;

         try {
             const response = await fetch(signedUrl, {
                 signal: AbortSignal.timeout(60000),
             });

             if (!response.ok || !response.body) {
                 await response.body?.cancel();
                 throw new Error("Resume storage unavailable.");
             }

             const contentLength = Number(
                 response.headers.get("content-length")
             );

             if (contentLength > maxSize) {
                 await response.body.cancel();
                 throw new Error("Resume exceeds size limit.");
             }

             const reader = response.body.getReader();
             const chunks = [];
             let receivedSize = 0;

             try {
                 while (true) {
                     const { done, value } = await reader.read();

                     if (done) break;

                     receivedSize += value.byteLength;

                     if (receivedSize > maxSize) {
                         await reader.cancel();
                         throw new Error("Resume exceeds size limit.");
                     }

                     chunks.push(Buffer.from(value));
                 }
             } finally {
                 reader.releaseLock();
             }

             if (
                 !receivedSize ||
                 receivedSize !== resume.size
             ) {
                 throw new Error("Incomplete resume received.");
             }

             fileBuffer = Buffer.concat(
                 chunks,
                 receivedSize
             );
         } catch {
             throw new ExpressError(
                 502,
                 "Resume could not be retrieved. Please try again."
             );
         }

         // ================== SECURE FILE RESPONSE ==================
         res.attachment(resume.name);

         if (mode === "view") {
             res.set(
                 "Content-Disposition",
                 res.get("Content-Disposition").replace(
                     /^attachment/i,
                     "inline"
                 )
             );
         }

         res.set("Content-Type", resume.mimeType);
         res.set("Content-Length", String(fileBuffer.length));
         res.set("Cache-Control", "private, no-store");
         res.set("X-Content-Type-Options", "nosniff");
         res.set("Referrer-Policy", "no-referrer");

         return res.status(200).send(fileBuffer);
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
};
