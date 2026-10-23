const cloudinary = require("../config/cloudinary");
const ExpressError = require("./ExpressError");

// ================== VERIFIED FILE UPLOAD ==================
// Upload middleware checks bytes and size before these storage helpers run.
function uploadFile(file, publicId, image = false) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: image ? "image" : "raw",
                type: image ? "upload" : "private",
                ...(image
                    ? { folder: "recruitment_management/profile_avatars" }
                    : { asset_folder: "recruitment_management" }),
                public_id: publicId,
                overwrite: false,
                timeout: 60000,
            },
            (error, result) => {
                if (error) return reject(error);
                if (!result?.public_id || (image && !result.secure_url)) {
                    return reject(new Error("File storage did not confirm upload."));
                }
                resolve(result);
            }
        );
        stream.on("error", reject);
        stream.end(file.buffer);
    });
}

function uploadPrivateResume(file, publicId) {
    return uploadFile(file, publicId);
}
function uploadAvatar(file, publicId) {
    return uploadFile(file, publicId, true);
}

async function deleteFile(publicId, image = false) {
    const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: image ? "image" : "raw",
        type: image ? "upload" : "private",
        ...(image ? { invalidate: true } : {}),
    });
    if (!["ok", "not found"].includes(result?.result)) {
        throw new Error("File storage did not confirm deletion.");
    }
}
function deletePrivateResume(publicId) {
    return deleteFile(publicId);
}
function deleteAvatar(publicId) {
    return deleteFile(publicId, true);
}

// ================== PRIVATE RESUME RESPONSE ==================
// Controllers authorize the owner/admin before calling this shared transport.
// Keep signing information server-side; preserve the original filename.
async function sendPrivateResume(res, resume, mode, publicId) {
    if (mode === "view" && resume.mimeType !== "application/pdf") {
        throw new ExpressError(
            400,
            "Preview is available only for PDF resumes. Download this file instead."
        );
    }
    const url = cloudinary.utils.private_download_url(publicId, undefined, {
        resource_type: "raw",
        type: "private",
        attachment: false,
        expires_at: Math.floor(Date.now() / 1000) + 60,
        secure: true,
    });
    const maximumSize = 5 * 1024 * 1024;
    let buffer;
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
        if (
            !response.ok ||
            !response.body ||
            Number(response.headers.get("content-length")) > maximumSize
        ) {
            await response.body?.cancel();
            throw new Error("Resume storage is unavailable.");
        }
        const reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                size += value.byteLength;
                if (size > maximumSize) {
                    await reader.cancel();
                    throw new Error("Resume exceeds the permitted size.");
                }
                chunks.push(Buffer.from(value));
            }
        } finally {
            reader.releaseLock();
        }
        if (!size || size !== resume.size) throw new Error("Incomplete resume response.");
        buffer = Buffer.concat(chunks, size);
    } catch {
        throw new ExpressError(502, "Resume could not be retrieved. Please try again later.");
    }
    res.attachment(resume.name);
    if (mode === "view")
        res.set(
            "Content-Disposition",
            res.get("Content-Disposition").replace(/^attachment/i, "inline")
        );
    res.set("Content-Type", resume.mimeType);
    res.set("Content-Length", String(buffer.length));
    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "no-referrer");
    return res.status(200).send(buffer);
}

module.exports = {
    uploadPrivateResume,
    uploadAvatar,
    deletePrivateResume,
    deleteAvatar,
    sendPrivateResume,
};
