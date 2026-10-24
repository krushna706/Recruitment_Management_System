const path = require("node:path");
const fs = require("node:fs");
const { createHash } = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Contact = require("../models/Contact");
const data = require("./demoData.json");

// ================== DEMO CONFIGURATION ==================
// Default: validate locally. --apply is the only mode that writes records.
const apply = process.argv.includes("--apply");
const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const dateBefore = (days) => new Date(now - days * day);
const demoId = (kind, index) => new mongoose.Types.ObjectId(
    createHash("sha256").update(`hiresetu-demo-v1:${kind}:${index}`).digest("hex").slice(0, 24)
);

// ================== SAMPLE PDF ==================
// A small real PDF, with fictional details and no extra package dependency.
function makeResume(candidate) {
    const lines = [
        candidate.name, "SAMPLE RESUME - FICTIONAL DEMO DATA",
        candidate.email, candidate.address, "",
        "PROFILE", "Professional with two years of relevant experience.",
        "SKILLS", candidate.skills.join(", "), "",
        "EXPERIENCE", "Demo Practice Studio | Associate | 2024 - 2026",
        "Delivered assigned work, documented processes and collaborated with colleagues.",
        "Supported quality reviews and communicated progress to the team.", "",
        "EDUCATION", "Bachelor degree - fictional demonstration profile",
        "This document is for portfolio testing only."
    ];
    const escape = (text) => text.replace(/[^\x20-\x7e]/g, " ").replace(/[\\()]/g, "\\$&");
    const stream = "BT /F1 12 Tf 50 790 Td 20 TL\n" +
        lines.map((line, index) => `${index ? "T* " : ""}(${escape(line)}) Tj`).join("\n") + "\nET";
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
        offsets.push(Buffer.byteLength(pdf));
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 6\n0000000000 65535 f \n`;
    pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
    pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(pdf);
}

// ================== BUILD RELATED RECORDS ==================
function buildRecords(adminId, passwordHash) {
    const users = data.candidates.map((candidate, index) => new User({
        ...candidate, _id: demoId("user", index), passwordHash,
        role: "user", status: "Active", createdAt: dateBefore(50),
        updatedAt: dateBefore(50), tokenVersion: 0
    }));
    const jobs = data.jobs.map((job, index) => new Job({
        ...job, _id: demoId("job", index),
        company: job.openingType === "internal" ? process.env.COMPANY_NAME || "HireSetu" : job.company,
        createdBy: adminId, updatedBy: adminId,
        createdAt: dateBefore(45 - index / 2),
        updatedAt: dateBefore(job.status === "Closed" ? 1 : 40 - index / 2),
        publishedAt: job.status === "Draft" ? null : dateBefore(40 - index / 2),
        closedAt: job.status === "Closed" ? dateBefore(1) : null
    }));
    const applications = data.applications.map(([userIndex, jobIndex, status], index) => {
        const candidate = users[userIndex];
        const job = jobs[jobIndex];
        if (job.status === "Draft") throw new Error("Demo application cannot reference a draft.");
        const stages = ["Submitted", "Under Review", "Shortlisted", "Interview", "Selected"];
        const historyStatuses = status === "Rejected" ? ["Submitted", "Under Review", "Rejected"] :
            stages.slice(0, stages.indexOf(status) + 1);
        const submittedAt = dateBefore(22 - index / 3);
        const history = historyStatuses.map((stage, step) => ({
            status: stage, message: step ? `Demo review: application moved to ${stage}.` : "Application submitted successfully.",
            changedBy: step ? adminId : candidate._id,
            createdAt: new Date(submittedAt.getTime() + step * day)
        }));
        const pdf = makeResume(data.candidates[userIndex]);
        const snapshot = Object.fromEntries(
            ["title", "company", "department", "location", "type", "mode", "salary"].map((key) => [key, job[key]])
        );
        return new Application({
            _id: demoId("application", index), userId: candidate._id, jobId: job._id,
            openingType: job.openingType, jobSnapshot: snapshot,
            applicant: Object.fromEntries(["name", "email", "phone", "qualification", "experience", "skills"]
                .map((key) => [key, candidate[key]])),
            resume: {
                storageKey: `recruitment_management/demo_v1/applications/${demoId("application", index)}.pdf`,
                name: `${candidate.name.replaceAll(" ", "_")}_Resume.pdf`,
                mimeType: "application/pdf", size: pdf.length
            },
            status, history,
            interview: ["Interview", "Selected"].includes(status) ? {
                at: status === "Interview" ? new Date(now + (2 + index % 4) * day) :
                    new Date(submittedAt.getTime() + 3.5 * day),
                mode: "Online", note: "Demo interview. Recruiter will share meeting details separately."
            } : undefined,
            selection: status === "Selected" ? { note: "Selected following the demo interview and review." } : undefined,
            createdAt: submittedAt, updatedAt: history.at(-1).createdAt
        });
    });
    const contacts = data.enquiries.map((contact, index) => new Contact({
        ...contact, _id: demoId("contact", index), enquiryId: `ENQ-DEMO-V1-${String(index + 1).padStart(3, "0")}`,
        submittedAt: dateBefore(12 - index), createdAt: dateBefore(12 - index), updatedAt: dateBefore(12 - index)
    }));
    return { users, jobs, applications, contacts };
}

// ================== PREFLIGHT ==================
// Reject conflicting demo emails/phones before creating any database records.
async function checkConflicts(records) {
    for (const user of records.users) {
        const matches = await User.find({ $or: [{ email: user.email }, { phone: user.phone }, { _id: user._id }] });
        for (const existing of matches) {
            if (!existing._id.equals(user._id) || existing.email !== user.email ||
                existing.phone !== user.phone || existing.role !== "user") {
                throw new Error(`Demo account conflict for ${user.email}. Resolve before retrying.`);
            }
        }
    }
    for (const application of records.applications) {
        const existing = await Application.findOne({ userId: application.userId, jobId: application.jobId });
        if (existing && !existing._id.equals(application._id)) {
            throw new Error("A candidate already applied to a demo opening. No records were overwritten.");
        }
    }
}

// ================== INSERT ONLY ==================
// Stable IDs make reruns skip existing demo records, including edited ones.
async function insertMissing(Model, documents) {
    let added = 0;
    for (const document of documents) {
        if (await Model.exists({ _id: document._id })) continue;
        await document.save({ timestamps: false });
        added++;
    }
    console.log(`${Model.modelName}: ${added} added, ${documents.length - added} skipped.`);
}

// ================== MAIN ==================
async function main() {
    const password = process.env.DEMO_USER_PASSWORD;
    if (apply && (!password || password.length < 6 || Buffer.byteLength(password) > 72)) {
        throw new Error("Set DEMO_USER_PASSWORD: minimum 6 characters, maximum 72 UTF-8 bytes.");
    }
    if (apply && (!process.env.DB_URI || !process.env.DEMO_ADMIN_EMAIL)) {
        throw new Error("Set DB_URI and DEMO_ADMIN_EMAIL in backend/.env.");
    }
    const hash = await bcrypt.hash(password || "DryRunOnly-NotSaved", 12);
    let adminId = demoId("validation-admin", 0);
    if (apply) {
        // Use the existing connection URI; never import server.js or start the website.
        await mongoose.connect(process.env.DB_URI, { autoIndex: false, serverSelectionTimeoutMS: 15000 });
        const admin = await User.findOne({ email: process.env.DEMO_ADMIN_EMAIL.trim().toLowerCase(), role: "admin", status: "Active" });
        if (!admin) throw new Error("DEMO_ADMIN_EMAIL must identify an existing active admin.");
        adminId = admin._id;
    }
    const records = buildRecords(adminId, hash);
    for (const documents of Object.values(records)) {
        for (const document of documents) await document.validate();
    }
    const pairs = records.applications.map((item) => `${item.userId}:${item.jobId}`);
    if (new Set(pairs).size !== pairs.length) throw new Error("Duplicate application in dataset.");
    console.log("Validated: 20 openings, 12 candidates, 25 applications and 8 enquiries.");

    if (!apply) {
        const preview = path.join(__dirname, "demo-resume-preview.pdf");
        fs.writeFileSync(preview, makeResume(data.candidates[0]));
        console.log("Dry run complete. No database connection or uploads. Resume preview:", preview);
        return;
    }

    await checkConflicts(records);
    const cloudinary = require("../config/cloudinary");
    // Check credentials before database inserts. No emails or SMS are sent.
    await cloudinary.api.ping();
    await insertMissing(User, records.users);
    await insertMissing(Job, records.jobs);

    let added = 0;
    for (let index = 0; index < records.applications.length; index++) {
        const application = records.applications[index];
        if (await Application.exists({ _id: application._id })) continue;
        const pdf = makeResume(data.candidates[data.applications[index][0]]);
        // Each application owns a different private file; deletion cannot affect another resume.
        await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                public_id: application.resume.storageKey,
                asset_folder: "recruitment_management",
                resource_type: "raw", type: "private",
                overwrite: false, timeout: 60000
            }, (error, result) => {
                if (error) return reject(error);
                if (!result?.public_id || result.bytes !== pdf.length) {
                    return reject(new Error("Demo resume upload could not be confirmed."));
                }
                application.resume.storageKey = result.public_id;
                resolve();
            });
            stream.on("error", reject);
            stream.end(pdf);
        });
        await application.save({ timestamps: false });
        added++;
    }
    console.log(`Application: ${added} added, ${25 - added} skipped.`);
    await insertMissing(Contact, records.contacts);
    console.log("Demo data ready. Existing records were not updated or deleted.");
}

main().catch((error) => {
    // Avoid printing connection strings, secrets or complete provider responses.
    console.error("Demo seed failed:", error.name, error.code || "");
    console.error(error.message?.replace(/mongodb(?:\+srv)?:\/\/\S+/g, "[database URI hidden]"));
    console.error("Successful inserts remain saved. Fix the issue and rerun; existing IDs are skipped.");
    process.exitCode = 1;
}).finally(async () => {
    await mongoose.disconnect();
});
