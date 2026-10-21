const mongoose = require("mongoose");
const path = require("node:path");

const Application = require("../models/Application");
const Job = require("../models/Job");
const cloudinary = require("../config/cloudinary");
const ExpressError = require("../utils/ExpressError");

// ================== JOB ID VALIDATION ==================
function validateJobId(jobId) {
    if (
        typeof jobId !== "string" ||
        !/^[a-fA-F0-9]{24}$/.test(jobId)
    ) {
        throw new ExpressError(400, "Invalid job ID.");
    }
}

// ================== PRIVATE RESUME UPLOAD ==================
// Upload the original document without image transformations.
function uploadResumeToCloudinary(file, storageKey) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "raw",
                type: "private",
                asset_folder: "recruitment_management",
                public_id: storageKey,
                overwrite: false,
                timeout: 60000,
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                if (!result?.public_id) {
                    return reject(
                        new Error("Cloudinary did not return a file identifier.")
                    );
                }

                return resolve(result);
            }
        );

        uploadStream.on("error", reject);
        uploadStream.end(file.buffer);
    });
}

// ================== FAILED SUBMISSION CLEANUP ==================
// Never remove a resume if the database shows a saved application.
// If the database cannot confirm the result, retain the file.
async function cleanupUnusedResume(applicationId, storageKey) {
    try {
        const savedApplication = await Application.exists({
            _id: applicationId,
        });

        if (savedApplication) {
            return;
        }

        await cloudinary.uploader.destroy(storageKey, {
            resource_type: "raw",
            type: "private",
        });
    } catch {
        console.error(
            `Resume cleanup needs review for application ${applicationId}.`
        );
    }
}

// ================== CREATE APPLICATION ==================
// Authentication, user role, upload and Joi validation run in the router.
// The job ID comes from the route; account ownership comes from req.user.
async function createApplication(req, res, next) {
    const applicationId = new mongoose.Types.ObjectId();

    let uploadedResume = null;
    let applicationSaved = false;

    try {
        if (!req.user) {
            throw new ExpressError(401, "Please login to apply.");
        }

        if (req.user.role !== "user") {
            throw new ExpressError(
                403,
                "Only user accounts can submit applications."
            );
        }

        const { jobId } = req.params;

        validateJobId(jobId);

        if (!req.file?.buffer?.length) {
            throw new ExpressError(400, "Please upload your resume.");
        }

        // ================== INITIAL JOB CHECK ==================
        const availableJob = await Job.exists({
            _id: jobId,
            openingType: "client",
            status: "Published",
        });

        if (!availableJob) {
            throw new ExpressError(
                409,
                "This job is unavailable or applications are closed."
            );
        }

        // Avoid uploading another resume for an existing application.
        const existingApplication = await Application.exists({
            userId: req.user._id,
            jobId,
        });

        if (existingApplication) {
            throw new ExpressError(
                409,
                "You have already applied for this job."
            );
        }

        // ================== UPLOAD VERIFIED RESUME ==================
        const extension = path.extname(
            req.file.originalname
        ).toLowerCase();

        // Each application gets its own file; previous resumes stay unchanged.
        const storageKey = `recruitment/resumes/${applicationId}${extension}`;

        try {
            uploadedResume = await uploadResumeToCloudinary(
                req.file,
                storageKey
            );
        }catch (error) {
    // Show the upload failure reason during development.
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
        // Recheck and write to the job in the same transaction as application
        // creation, so a concurrent close cannot bypass the open-job check.
        const application = await mongoose.connection.transaction(
            async (session) => {
                const job = await Job.findOneAndUpdate(
                    {
                        _id: jobId,
                        openingType: "client",
                        status: "Published",
                    },
                    {
                        $inc: { __v: 1 },
                    },
                    {
                        session,
                        returnDocument: "after",
                        timestamps: false,
                    }
                );

                if (!job) {
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
                            userId: req.user._id,
                            jobId: job._id,
                            openingType: job.openingType,

                            jobSnapshot: {
                                title: job.title,
                                company: job.company,
                                department: job.department,
                                location: job.location,
                                type: job.type,
                                mode: job.mode,
                            },

                            applicant: {
                                name,
                                email,
                                phone,
                                qualification,
                                experience,
                                skills,
                            },

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
                status: application.status,
                createdAt: application.createdAt,
            },
        });
    } catch (error) {
        // An uncertain commit may still have succeeded. Keep its resume.
        const uncertainCommit =
            error.hasErrorLabel?.("UnknownTransactionCommitResult");

        if (uploadedResume && !applicationSaved && !uncertainCommit) {
            await cleanupUnusedResume(
                applicationId,
                uploadedResume.public_id
            );
        }

        // The unique database index also handles simultaneous submissions.
        if (error.code === 11000) {
            return next(
                new ExpressError(
                    409,
                    "You have already applied for this job."
                )
            );
        }

        if (error.name === "ValidationError") {
            return next(
                new ExpressError(
                    400,
                    "Application details are invalid or incomplete."
                )
            );
        }

        return next(error);
    } finally {
        // Release this request's reference to the uploaded file buffer.
        if (req.file) {
            delete req.file.buffer;
        }
    }
}

// ================== EXPORTS ==================
module.exports = {
    createApplication,
};