
const bcrypt = require("bcrypt");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const ExpressError = require("../utils/ExpressError");

// ================== PROFILE CONFIGURATION ==================
const MAX_RESUME_SIZE = 5 * 1024 * 1024;
const RESUME_LINK_SECONDS = 60;
const MAX_AVATAR_SIZE = 3 * 1024 * 1024;

// Only these fields can be changed from the candidate profile form.
const EDITABLE_PROFILE_FIELDS = [
    "name",
    "email",
    "phone",
    "address",
    "qualification",
    "experience",
    "skills",
];

// ================== CANDIDATE ACCESS ==================
// Authentication and role middleware must run before these controllers.
function requireCandidate(req) {
    if (!req.user) {
        throw new ExpressError(401, "Please login to continue.");
    }

    if (req.user.role !== "user") {
        throw new ExpressError(
            403,
            "You do not have permission to access this profile."
        );
    }
}

// ================== SAFE PROFILE RESPONSE ==================
// Never expose passwords, Cloudinary storage IDs or session versions.
function getProfileResponse(user) {
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        qualification: user.qualification || "",
        experience: user.experience || "",
        skills: user.skills || [],
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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
    };
}

// ================== LOAD ACTIVE CANDIDATE ==================
async function loadCandidate(userId) {
    const user = await User.findOne({
        _id: userId,
        role: "user",
        status: "Active",
    }).select("+passwordHash +resume.publicId +avatar.publicId");

    if (!user) {
        throw new ExpressError(
            403,
            "Your account is no longer available for profile changes."
        );
    }

    return user;
}

// ================== GET MY PROFILE ==================
// GET /api/users/me/profile
async function getMyProfile(req, res, next) {
    try {
        requireCandidate(req);

        const user = await loadCandidate(req.user._id);

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            profile: getProfileResponse(user),
        });
    } catch (error) {
        return next(error);
    }
}

// ================== UPDATE MY PROFILE ==================
// PATCH /api/users/me/profile
// Joi validates the request body before it reaches this controller.
async function updateMyProfile(req, res, next) {
    try {
        requireCandidate(req);

        const user = await loadCandidate(req.user._id);
        const changes = {};

        // Explicit allowlist: never accept role/status from the browser.
        for (const field of EDITABLE_PROFILE_FIELDS) {
            if (Object.hasOwn(req.body, field)) {
                changes[field] = req.body[field];
            }
        }

        if (Object.keys(changes).length === 0) {
            throw new ExpressError(400, "No profile changes were provided.");
        }

        // ================== EMAIL CHANGE VERIFICATION ==================
        // Changing the login email requires the current account password.
        if (
            changes.email !== undefined &&
            changes.email !== user.email
        ) {
            if (!req.body.currentPassword) {
                throw new ExpressError(
                    400,
                    "Enter your current password to change your email."
                );
            }

            const passwordMatches = await bcrypt.compare(
                req.body.currentPassword,
                user.passwordHash
            );

            if (!passwordMatches) {
                throw new ExpressError(403, "Current password is incorrect.");
            }
        }

        // ================== ATOMIC DATABASE UPDATE ==================
        // Version guard prevents older form submissions overwriting newer ones.
        const updatedUser = await User.findOneAndUpdate(
            {
                _id: user._id,
                role: "user",
                status: "Active",
                __v: user.__v,
            },
            {
                $set: changes,
                $inc: { __v: 1 },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!updatedUser) {
            throw new ExpressError(
                409,
                "Your profile changed. Refresh the page and try again."
            );
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            profile: getProfileResponse(updatedUser),
        });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.email) {
            return next(
                new ExpressError(409, "This email address is already in use.")
            );
        }

        if (error.name === "ValidationError") {
            return next(
                new ExpressError(400, "Profile details are invalid.")
            );
        }

        return next(error);
    }
}

// ================== PRIVATE PROFILE RESUME UPLOAD ==================
// Upload a verified resume to private Cloudinary storage.
function uploadPrivateResume(file, publicId) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: "raw",
                type: "private",
                asset_folder: "recruitment_management",
                public_id: publicId,
                overwrite: false,
                timeout: 60000,
            },
            (error, result) => {
                if (error) return reject(error);

                if (!result?.public_id) {
                    return reject(
                        new Error("Resume storage did not confirm upload.")
                    );
                }

                return resolve(result);
            }
        );

        stream.on("error", reject);
        stream.end(file.buffer);
    });
}

// ================== RESUME STORAGE CLEANUP ==================
async function deletePrivateResume(publicId) {
    await cloudinary.uploader.destroy(publicId, {
        resource_type: "raw",
        type: "private",
    });
}

// Do not delete a newly uploaded resume if an uncertain DB write saved it.
async function cleanupUnlinkedResume(userId, publicId) {
    try {
        const linked = await User.exists({
            _id: userId,
            "resume.publicId": publicId,
        });

        if (!linked) {
            await deletePrivateResume(publicId);
        }
    } catch {
        // Keep the uploaded file if its database ownership is uncertain.
        console.error("Candidate resume cleanup needs review.");
    }
}

// ================== UPLOAD / REPLACE MY RESUME ==================
// POST /api/users/me/resume
// Requires uploadResume middleware (PDF/DOC/DOCX, max 5 MB).
async function uploadMyResume(req, res, next) {
    let uploadedPublicId = null;
    let resumeSaved = false;

    try {
        requireCandidate(req);

        if (!req.file?.buffer?.length) {
            throw new ExpressError(400, "Please upload a valid resume.");
        }

        const user = await loadCandidate(req.user._id);
        const previousPublicId = user.resume?.publicId || null;
        const extension = path.extname(req.file.originalname).toLowerCase();
        const publicId =
            `recruitment/profile-resumes/${user._id}/${randomUUID()}${extension}`;

        // Store the new document first; keep the previous resume on failure.
        let uploaded;

        try {
            uploaded = await uploadPrivateResume(req.file, publicId);
            uploadedPublicId = uploaded.public_id;
        } catch {
            throw new ExpressError(
                502,
                "Resume upload failed. Please try again later."
            );
        }

        // ================== ATOMIC RESUME REPLACEMENT ==================
        const updatedUser = await User.findOneAndUpdate(
            {
                _id: user._id,
                role: "user",
                status: "Active",
                __v: user.__v,
            },
            {
                $set: {
                    resume: {
                        publicId: uploadedPublicId,
                        name: req.file.originalname,
                        mimeType: req.file.mimetype,
                        size: req.file.size,
                        uploadedAt: new Date(),
                    },
                },
                $inc: { __v: 1 },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!updatedUser) {
            throw new ExpressError(
                409,
                "Your profile changed. Refresh the page and upload again."
            );
        }

        resumeSaved = true;

        // An application has its own submitted resume; it is never changed.
        // Delete only the earlier *profile* file after replacement succeeds.
        if (previousPublicId && previousPublicId !== uploadedPublicId) {
            try {
                await deletePrivateResume(previousPublicId);
            } catch {
                console.error(
                    "Previous candidate profile resume needs cleanup."
                );
            }
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            message: "Resume uploaded successfully.",
            profile: getProfileResponse(updatedUser),
        });
    } catch (error) {
        if (uploadedPublicId && !resumeSaved) {
            await cleanupUnlinkedResume(req.user?._id, uploadedPublicId);
        }

        return next(error);
    } finally {
        if (req.file) {
            delete req.file.buffer;
        }
    }
}

// ================== GET MY RESUME ==================
// GET /api/users/me/resume?mode=view|download
// Proxy the private file; never expose Cloudinary signing information.
async function getMyResume(req, res, next) {
    try {
        requireCandidate(req);

        if (Object.keys(req.query).some((key) => key !== "mode")) {
            throw new ExpressError(400, "Unsupported resume option.");
        }

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

        const user = await loadCandidate(req.user._id);
        const resume = user.resume;

        if (!resume?.publicId) {
            throw new ExpressError(
                404,
                "No profile resume has been uploaded."
            );
        }

        if (mode === "view" && resume.mimeType !== "application/pdf") {
            throw new ExpressError(
                400,
                "Preview is available only for PDF resumes. Download this file instead."
            );
        }

        const url = cloudinary.utils.private_download_url(
            resume.publicId,
            undefined,
            {
                resource_type: "raw",
                type: "private",
                attachment: false,
                expires_at: Math.floor(Date.now() / 1000) + RESUME_LINK_SECONDS,
                secure: true,
            }
        );

        // ================== READ PRIVATE FILE SAFELY ==================
        let fileBuffer;

        try {
            const response = await fetch(url, {
                signal: AbortSignal.timeout(60000),
            });

            if (!response.ok || !response.body) {
                await response.body?.cancel();
                throw new Error("Resume storage is unavailable.");
            }

            if (
                Number(response.headers.get("content-length")) >
                MAX_RESUME_SIZE
            ) {
                await response.body.cancel();
                throw new Error("Resume exceeds the permitted size.");
            }

            const reader = response.body.getReader();
            const chunks = [];
            let receivedSize = 0;

            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) break;

                    receivedSize += value.byteLength;

                    if (receivedSize > MAX_RESUME_SIZE) {
                        await reader.cancel();
                        throw new Error("Resume exceeds the permitted size.");
                    }

                    chunks.push(Buffer.from(value));
                }
            } finally {
                reader.releaseLock();
            }

            if (!receivedSize || receivedSize !== resume.size) {
                throw new Error(
                    "The complete resume could not be retrieved."
                );
            }

            fileBuffer = Buffer.concat(chunks, receivedSize);
        } catch {
            throw new ExpressError(
                502,
                "Resume could not be retrieved. Please try again later."
            );
        }

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

// ================== PUBLIC AVATAR CLOUDINARY UPLOAD ==================
// File content and its 3 MB limit are validated by uploadAvatar middleware.
function uploadAvatarToCloudinary(file, publicId) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: "image",
                type: "upload",
                folder: "recruitment_management/profile_avatars",
                public_id: publicId,
                overwrite: false,
                timeout: 60000,
            },
            (error, result) => {
                if (error) return reject(error);

                if (!result?.public_id || !result?.secure_url) {
                    return reject(
                        new Error("Avatar upload was not confirmed.")
                    );
                }

                resolve(result);
            }
        );

        stream.on("error", reject);
        stream.end(file.buffer);
    });
}

// ================== CLOUDINARY AVATAR CLEANUP ==================
async function deleteCloudinaryAvatar(publicId) {
    const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        type: "upload",
        invalidate: true,
    });

    if (!["ok", "not found"].includes(result?.result)) {
        throw new Error(
            "Cloudinary did not confirm avatar deletion."
        );
    }
}

// On an uncertain database result, check ownership before removing the upload.
async function cleanupUnlinkedAvatar(userId, publicId) {
    try {
        const linked = await User.exists({
            _id: userId,
            "avatar.publicId": publicId,
        });

        if (!linked) {
            await deleteCloudinaryAvatar(publicId);
        }
    } catch {
        console.error("Candidate avatar cleanup needs review.");
    }
}

// ================== UPLOAD / REPLACE PROFILE IMAGE ==================
// POST /api/users/me/avatar
// Run authMiddleware, role middleware, rate limiter and uploadAvatar first.
async function uploadMyAvatar(req, res, next) {
    let uploadedPublicId = null;
    let avatarSaved = false;

    try {
        requireCandidate(req);

        if (
            !req.file?.buffer?.length ||
            req.file.size > MAX_AVATAR_SIZE
        ) {
            throw new ExpressError(
                400,
                "Upload a valid image up to 3 MB."
            );
        }

        if (
            !["image/jpeg", "image/png", "image/webp"].includes(
                req.file.mimetype
            )
        ) {
            throw new ExpressError(
                400,
                "Only JPG, PNG and WebP images are allowed."
            );
        }

        const user = await loadCandidate(req.user._id);
        const previousPublicId = user.avatar?.publicId || null;
        const uniqueId = `${user._id}_${randomUUID()}`;

        // Upload first; do not remove the current image until DB update succeeds.
        let uploaded;

        try {
            uploaded = await uploadAvatarToCloudinary(
                req.file,
                uniqueId
            );

            uploadedPublicId = uploaded.public_id;
        } catch {
            throw new ExpressError(
                502,
                "Image upload failed. Please try again."
            );
        }

        // ================== ATOMIC IMAGE REPLACEMENT ==================
        // The version check prevents concurrent uploads overwriting each other.
        const updatedUser = await User.findOneAndUpdate(
            {
                _id: user._id,
                role: "user",
                status: "Active",
                __v: user.__v,
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

        if (!updatedUser) {
            throw new ExpressError(
                409,
                "Your profile changed. Refresh the page and upload again."
            );
        }

        avatarSaved = true;

        // Delete the old avatar ONLY after MongoDB confirms the new one.
        if (
            previousPublicId &&
            previousPublicId !== uploadedPublicId
        ) {
            try {
                await deleteCloudinaryAvatar(previousPublicId);
            } catch {
                console.error(
                    "Previous profile image cleanup needs review."
                );
            }
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            message: "Profile image updated successfully.",
            avatar: {
                url: updatedUser.avatar?.url || "",
            },
            profile: getProfileResponse(updatedUser),
        });
    } catch (error) {
        if (uploadedPublicId && !avatarSaved) {
            await cleanupUnlinkedAvatar(
                req.user?._id,
                uploadedPublicId
            );
        }

        return next(error);
    } finally {
        if (req.file) {
            delete req.file.buffer;
        }
    }
}

// ================== EXPORTS ==================
module.exports = {
    getMyProfile,
    updateMyProfile,
    uploadMyResume,
    getMyResume,
    uploadMyAvatar,
};
