const multer = require("multer");
const path = require("node:path");
const CFB = require("cfb");

const ExpressError = require("../utils/ExpressError");

// ================== RESUME CONFIGURATION ==================
const MAX_RESUME_SIZE = 5 * 1024 * 1024;

const RESUME_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// ================== FILE EXTENSION CHECK ==================
function checkResumeExtension(req, file, callback) {
    const filename = file.originalname || "";
    const extension = path.extname(filename).toLowerCase();

    if (
        !filename.trim() ||
        filename.length > 255 ||
        /[\u0000-\u001f\u007f]/.test(filename)
    ) {
        return callback(
            new ExpressError(400, "Resume filename is invalid or too long.")
        );
    }

    if (!Object.prototype.hasOwnProperty.call(RESUME_TYPES, extension)) {
        return callback(
            new ExpressError(400, "Upload a PDF, DOC or DOCX resume.")
        );
    }

    return callback(null, true);
}

// ================== RECEIVE RESUME ==================
// Keep the file temporarily in memory before uploading to Cloudinary.
const receiveResume = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_RESUME_SIZE,
        files: 1,
        fields: 6,
        parts: 8,
        fieldNameSize: 50,
        fieldSize: 10 * 1024,
    },
    fileFilter: checkResumeExtension,
}).single("resume");

// ================== LEGACY DOC FORMAT CHECK ==================
// Confirm the old Office container contains a Word document.
function isWordDocument(buffer) {
    try {
        const document = CFB.read(buffer, { type: "buffer" });
        const wordStream = CFB.find(document, "WordDocument");

        return Boolean(
            wordStream?.type === 2 &&
            wordStream.content?.length >= 2 &&
            wordStream.content[0] === 0xec &&
            wordStream.content[1] === 0xa5
        );
    } catch {
        return false;
    }
}

// ================== ACTUAL FILE FORMAT CHECK ==================
// Check file bytes, not the information written inside the resume.
async function verifyResumeFormat(file) {
    const extension = path.extname(file.originalname).toLowerCase();

    // Dynamic import allows this ES module to work in CommonJS.
    const { fileTypeFromBuffer } = await import("file-type");

    let detectedType;

    try {
        detectedType = await fileTypeFromBuffer(file.buffer);
    } catch {
        throw new ExpressError(
            400,
            "The resume format could not be read. Please choose another file."
        );
    }

    const validFormat = extension === ".doc"
        ? ["cfb", "doc"].includes(detectedType?.ext) &&
          isWordDocument(file.buffer)
        : detectedType?.ext === extension.slice(1);

    if (!validFormat) {
        throw new ExpressError(
            400,
            "The file content does not match its extension. Upload a valid PDF, DOC or DOCX."
        );
    }

    // Replace the browser-provided MIME type with the verified format.
    file.mimetype = RESUME_TYPES[extension];
}

// ================== UPLOAD ERRORS ==================
function handleUploadError(error) {
    if (!(error instanceof multer.MulterError)) {
        return error;
    }

    if (error.code === "LIMIT_FILE_SIZE") {
        return new ExpressError(413, "Resume size must not exceed 5 MB.");
    }

    if (
        error.code === "LIMIT_FILE_COUNT" ||
        error.code === "LIMIT_UNEXPECTED_FILE"
    ) {
        return new ExpressError(
            400,
            "Upload only one file using the resume field."
        );
    }

    if (error.code === "LIMIT_FIELD_VALUE") {
        return new ExpressError(
            413,
            "An application field exceeds the allowed size."
        );
    }

    return new ExpressError(
        400,
        "The upload request contains too many fields or invalid field data."
    );
}

// ================== RESUME MIDDLEWARE ==================
// Use after authentication and rate limiting on the application route.
function uploadResume(req, res, next) {
    if (!req.is("multipart/form-data")) {
        return next(
            new ExpressError(
                415,
                "Submit the application using multipart/form-data."
            )
        );
    }

    receiveResume(req, res, (error) => {
        if (error) {
            delete req.file;
            return next(handleUploadError(error));
        }

        if (!req.file) {
            return next(
                new ExpressError(400, "Please upload your resume.")
            );
        }

        if (!req.file.buffer?.length) {
            delete req.file;

            return next(
                new ExpressError(400, "The resume file cannot be empty.")
            );
        }

        verifyResumeFormat(req.file)
            .then(() => next())
            .catch((verificationError) => {
                delete req.file;
                next(verificationError);
            });
    });
}

// ================== EXPORTS ==================
module.exports = {
    uploadResume,
};