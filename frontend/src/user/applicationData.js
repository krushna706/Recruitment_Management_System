// Temporary frontend data.
// Replace with authenticated API responses during backend integration.

export const applicationStatuses = [
    "Submitted",
    "Under Review",
    "Shortlisted",
    "Interview",
    "Selected",
    "Rejected",
];

export const statusClasses = {
    Submitted: "submitted",
    "Under Review": "review",
    Shortlisted: "shortlisted",
    Interview: "interview",
    Selected: "selected",
    Rejected: "rejected",
};

export const applicationStages = [
    "Submitted",
    "Under Review",
    "Shortlisted",
    "Interview",
    "Selected",
];

const demoApplicant = {
    name: "Krushna Chandra Mohanty",
    email: "candidate@example.com",
    phone: "9876543210",
    qualification: "Bachelor’s degree",
    experience: "2 years",
    skills: ["React.js", "Node.js", "Express.js", "MongoDB"],
};

export const demoApplications = [
    {
        id: "application-1001",
        jobId: "mern-developer",
        title: "MERN Stack Developer",
        company: "Sample Digital",
        location: "Hyderabad, Telangana",
        type: "Full-time",
        mode: "Remote",
        salary: "₹6–10 LPA",
        appliedAt: "2026-10-16T09:30:00+05:30",
        status: "Under Review",
        applicant: demoApplicant,
        resume: null,
        history: [
            {
                status: "Submitted",
                at: "2026-10-16T09:30:00+05:30",
                note: "Your application was received.",
            },
            {
                status: "Under Review",
                at: "2026-10-18T10:15:00+05:30",
                note: "The recruitment team is reviewing your application.",
            },
        ],
    },
    {
        id: "application-1002",
        jobId: "frontend-developer",
        title: "Frontend Developer",
        company: "Demo Technologies",
        location: "Bhubaneswar, Odisha",
        type: "Full-time",
        mode: "On-site",
        salary: "₹3–5 LPA",
        appliedAt: "2026-10-15T11:00:00+05:30",
        status: "Shortlisted",
        applicant: demoApplicant,
        resume: null,
        history: [
            {
                status: "Submitted",
                at: "2026-10-15T11:00:00+05:30",
                note: "Your application was received.",
            },
            {
                status: "Under Review",
                at: "2026-10-16T10:00:00+05:30",
                note: "Your profile was reviewed.",
            },
            {
                status: "Shortlisted",
                at: "2026-10-17T15:45:00+05:30",
                note: "You have been shortlisted. Further updates will appear here.",
            },
        ],
    },
    {
        id: "application-1003",
        jobId: "react-intern",
        title: "React Developer Intern",
        company: "Demo Technologies",
        location: "Bhubaneswar, Odisha",
        type: "Internship",
        mode: "On-site",
        salary: "₹12,000–18,000/month",
        appliedAt: "2026-10-17T14:20:00+05:30",
        status: "Submitted",
        applicant: demoApplicant,
        resume: null,
        history: [
            {
                status: "Submitted",
                at: "2026-10-17T14:20:00+05:30",
                note: "Your application was received.",
            },
        ],
    },
    {
        id: "application-1004",
        jobId: "backend-developer",
        title: "Backend Developer",
        company: "Demo Technologies",
        location: "Bengaluru, Karnataka",
        type: "Full-time",
        mode: "Hybrid",
        salary: "₹5–8 LPA",
        appliedAt: "2026-10-12T10:00:00+05:30",
        status: "Rejected",
        applicant: demoApplicant,
        resume: null,
        history: [
            {
                status: "Submitted",
                at: "2026-10-12T10:00:00+05:30",
                note: "Your application was received.",
            },
            {
                status: "Under Review",
                at: "2026-10-14T12:00:00+05:30",
                note: "Your profile was reviewed.",
            },
            {
                status: "Rejected",
                at: "2026-10-16T16:30:00+05:30",
                note: "We are not moving forward with this application.",
            },
        ],
    },
    {
        id: "application-1005",
        jobId: "qa-engineer",
        title: "QA Engineer",
        company: "Demo Technologies",
        location: "Pune, Maharashtra",
        type: "Contract",
        mode: "Remote",
        salary: "₹4–7 LPA",
        appliedAt: "2026-10-11T09:00:00+05:30",
        status: "Interview",
        applicant: demoApplicant,
        resume: null,
        interview: {
            at: "2026-10-22T11:00:00+05:30",
            mode: "Online",
            note: "The recruitment team will share joining instructions.",
        },
        history: [
            {
                status: "Submitted",
                at: "2026-10-11T09:00:00+05:30",
                note: "Your application was received.",
            },
            {
                status: "Under Review",
                at: "2026-10-13T10:00:00+05:30",
                note: "Your profile was reviewed.",
            },
            {
                status: "Shortlisted",
                at: "2026-10-15T14:00:00+05:30",
                note: "Your application was shortlisted.",
            },
            {
                status: "Interview",
                at: "2026-10-17T12:00:00+05:30",
                note: "An interview has been scheduled.",
            },
        ],
    },
    {
        id: "application-1006",
        jobId: "ui-ux-designer",
        title: "UI/UX Designer",
        company: "Sample Design Studio",
        location: "Pune, Maharashtra",
        type: "Full-time",
        mode: "Hybrid",
        salary: "₹3–6 LPA",
        appliedAt: "2026-10-09T10:30:00+05:30",
        status: "Selected",
        applicant: demoApplicant,
        resume: null,
        selection: {
            note: "You have been selected. The recruitment team will contact you with the next steps.",
        },
        history: [
            {
                status: "Submitted",
                at: "2026-10-09T10:30:00+05:30",
                note: "Your application was received.",
            },
            {
                status: "Under Review",
                at: "2026-10-10T11:00:00+05:30",
                note: "Your profile was reviewed.",
            },
            {
                status: "Shortlisted",
                at: "2026-10-11T15:00:00+05:30",
                note: "Your application was shortlisted.",
            },
            {
                status: "Interview",
                at: "2026-10-13T12:00:00+05:30",
                note: "Your application moved to the interview stage.",
            },
            {
                status: "Selected",
                at: "2026-10-15T11:30:00+05:30",
                note: "Your application was marked as selected.",
            },
        ],
    },
];

export function formatApplicationDate(value, includeTime = false) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Not available";

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(includeTime
            ? {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "Asia/Kolkata",
                  timeZoneName: "short",
              }
            : {}),
    }).format(date);
}