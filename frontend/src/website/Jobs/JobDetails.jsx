import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";

/* ===== DEMO DATA ===== */

const jobProfiles = {
    engineering: {
        qualification:
            "Relevant technical education or equivalent practical experience.",
        responsibilities: [
            "Develop and maintain features based on project requirements.",
            "Collaborate with designers, developers and other team members.",
            "Test your work and improve application reliability.",
            "Document changes and communicate progress clearly.",
        ],
        requirements: [
            "Practical understanding of the technologies listed for this role.",
            "Ability to troubleshoot problems and explain your approach.",
            "Familiarity with Git and collaborative development.",
            "Willingness to learn and respond constructively to feedback.",
        ],
    },

    design: {
        qualification:
            "Relevant design education or a portfolio demonstrating practical design skills.",
        responsibilities: [
            "Translate user needs into practical design solutions.",
            "Create user flows, wireframes and interactive prototypes.",
            "Prepare responsive interface designs and developer handoffs.",
            "Improve designs through feedback and usability observations.",
        ],
        requirements: [
            "A portfolio showing your design process and interface work.",
            "Understanding of typography, spacing and visual hierarchy.",
            "Ability to create accessible and responsive interfaces.",
            "Clear communication and collaboration skills.",
        ],
    },

    business: {
        qualification:
            "Relevant education or practical experience in business, communication or operations.",
        responsibilities: [
            "Coordinate assigned activities and maintain accurate records.",
            "Communicate clearly with customers and internal teams.",
            "Track progress and share timely updates.",
            "Identify improvements to everyday processes.",
        ],
        requirements: [
            "Strong communication and organizational skills.",
            "Comfort working with documents, spreadsheets and digital tools.",
            "Attention to detail and a responsible approach to work.",
            "Ability to collaborate and manage priorities.",
        ],
    },

    content: {
        qualification:
            "Relevant education or a portfolio demonstrating writing and marketing experience.",
        responsibilities: [
            "Research topics and prepare content for the intended audience.",
            "Maintain a clear and consistent brand voice.",
            "Coordinate content and campaign tasks with the team.",
            "Review results and suggest improvements.",
        ],
        requirements: [
            "Clear writing, research and communication skills.",
            "Understanding of digital content and audience needs.",
            "Attention to accuracy, grammar and presentation.",
            "Ability to work with feedback and meet deadlines.",
        ],
    },
};

const demoJobs = [
    {
        id: "frontend-developer",
        title: "Frontend Developer",
        company: "Demo Technologies",
        location: "Bhubaneswar, Odisha",
        type: "Full-time",
        mode: "On-site",
        experience: "0–2 years",
        salary: "₹3–5 LPA",
        openings: 3,
        postedAt: "2026-10-15",
        profile: "engineering",
        skills: ["React", "JavaScript", "HTML", "CSS", "Git"],
        description:
            "Build responsive web interfaces with React and turn product requirements into useful, accessible experiences. Work with designers and backend developers to deliver reusable components and maintainable frontend features.",
    },
    {
        id: "backend-developer",
        title: "Backend Developer",
        company: "Demo Technologies",
        location: "Bengaluru, Karnataka",
        type: "Full-time",
        mode: "Hybrid",
        experience: "1–3 years",
        salary: "₹5–8 LPA",
        openings: 2,
        postedAt: "2026-10-13",
        profile: "engineering",
        skills: ["Node.js", "Express", "MongoDB", "REST APIs", "Git"],
        description:
            "Develop backend services and REST APIs for web applications. Work on database operations, validation and application reliability while collaborating with frontend developers.",
    },
    {
        id: "ui-ux-designer",
        title: "UI/UX Designer",
        company: "Sample Design Studio",
        location: "Pune, Maharashtra",
        type: "Full-time",
        mode: "Hybrid",
        experience: "0–2 years",
        salary: "₹3–6 LPA",
        openings: 2,
        postedAt: "2026-10-14",
        profile: "design",
        skills: ["Figma", "Wireframing", "Prototyping", "UI Design"],
        description:
            "Create clear user journeys and thoughtful interface designs. Work from early wireframes through detailed screens and collaborate with developers to bring your designs to life.",
    },
    {
        id: "mern-developer",
        title: "MERN Stack Developer",
        company: "Sample Digital",
        location: "Hyderabad, Telangana",
        type: "Full-time",
        mode: "Remote",
        experience: "2–5 years",
        salary: "₹6–10 LPA",
        openings: 4,
        postedAt: "2026-10-12",
        profile: "engineering",
        skills: ["MongoDB", "Express", "React", "Node.js", "REST APIs"],
        description:
            "Contribute across frontend and backend development. Build application features, integrate APIs and improve the reliability and maintainability of existing code.",
    },
    {
        id: "hr-intern",
        title: "HR Intern",
        company: "Sample People Services",
        location: "Bhubaneswar, Odisha",
        type: "Internship",
        mode: "On-site",
        experience: "0–1 years",
        salary: "₹10k–15k / month",
        openings: 2,
        postedAt: "2026-10-16",
        profile: "business",
        skills: ["Communication", "Recruitment", "Coordination"],
        description:
            "Gain practical exposure to recruitment and HR operations. Support candidate communication, interview scheduling and recruitment records.",
    },
    {
        id: "business-development",
        title: "Business Development Executive",
        company: "Sample Digital",
        location: "Kolkata, West Bengal",
        type: "Full-time",
        mode: "On-site",
        experience: "1–4 years",
        salary: "₹3–6 LPA",
        openings: 3,
        postedAt: "2026-10-11",
        profile: "business",
        skills: ["Sales", "Client Relations", "Communication"],
        description:
            "Identify business opportunities and build client relationships. Coordinate conversations, understand customer needs and support business development.",
    },
    {
        id: "qa-engineer",
        title: "QA Engineer",
        company: "Demo Technologies",
        location: "Pune, Maharashtra",
        type: "Contract",
        mode: "Remote",
        experience: "1–3 years",
        salary: "₹4–7 LPA",
        openings: 2,
        postedAt: "2026-10-14",
        profile: "engineering",
        skills: ["Manual Testing", "API Testing", "Test Cases", "Bug Reporting"],
        description:
            "Help the team deliver dependable software by testing features, documenting issues and verifying fixes. Contribute to test coverage and release quality.",
    },
    {
        id: "content-writer",
        title: "Content Writer",
        company: "Sample Design Studio",
        location: "Bengaluru, Karnataka",
        type: "Part-time",
        mode: "Remote",
        experience: "0–2 years",
        salary: "₹15k–25k / month",
        openings: 1,
        postedAt: "2026-10-10",
        profile: "content",
        skills: ["Writing", "Research", "Editing", "SEO"],
        description:
            "Create useful website and marketing content. Research topics, prepare clear drafts and refine content to match the audience and brand voice.",
    },
    {
        id: "digital-marketing",
        title: "Digital Marketing Executive",
        company: "Sample Digital",
        location: "Hyderabad, Telangana",
        type: "Full-time",
        mode: "Hybrid",
        experience: "1–3 years",
        salary: "₹3–5 LPA",
        openings: 2,
        postedAt: "2026-10-13",
        profile: "content",
        skills: ["SEO", "Social Media", "Analytics", "Campaign Planning"],
        description:
            "Support digital campaigns and improve audience engagement. Coordinate content, monitor performance and contribute ideas based on campaign results.",
    },
    {
        id: "react-intern",
        title: "React Developer Intern",
        company: "Demo Technologies",
        location: "Bhubaneswar, Odisha",
        type: "Internship",
        mode: "On-site",
        experience: "0–1 years",
        salary: "₹12k–18k / month",
        openings: 4,
        postedAt: "2026-10-16",
        profile: "engineering",
        skills: ["React Basics", "JavaScript", "HTML", "CSS"],
        description:
            "Build your frontend experience through guided project work. Create React components, fix interface issues and learn collaborative development practices.",
    },
    {
        id: "customer-support",
        title: "Customer Support Executive",
        company: "Sample People Services",
        location: "Kolkata, West Bengal",
        type: "Full-time",
        mode: "On-site",
        experience: "0–2 years",
        salary: "₹2.5–4 LPA",
        openings: 5,
        postedAt: "2026-10-12",
        profile: "business",
        skills: ["Customer Service", "Communication", "Problem Solving"],
        description:
            "Assist customers with questions and coordinate solutions with internal teams. Maintain clear records and provide helpful communication.",
    },
    {
        id: "project-coordinator",
        title: "Project Coordinator",
        company: "Sample Digital",
        location: "Pune, Maharashtra",
        type: "Full-time",
        mode: "Hybrid",
        experience: "2–4 years",
        salary: "₹4–7 LPA",
        openings: 1,
        postedAt: "2026-10-09",
        profile: "business",
        skills: ["Planning", "Documentation", "Coordination"],
        description:
            "Support delivery by tracking tasks, coordinating updates and maintaining documentation. Help teams stay aligned on priorities and deadlines.",
    },
];

const emptyApplication = {
    fullName: "",
    email: "",
    phone: "",
    qualification: "",
    experience: "",
    skills: "",
};

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

/* Calendar-day difference using the visitor's local date. */
function getPostedLabel(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);

    const postedDay = Date.UTC(year, month - 1, day);
    const now = new Date();

    const currentDay = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    const days = Math.floor(
        (currentDay - postedDay) / (1000 * 60 * 60 * 24)
    );

    if (!Number.isFinite(days)) return "Date unavailable";
    if (days < 0) return "Scheduled";
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";

    return `${days} days ago`;
}

function validateApplication(values, resume) {
    const errors = {};

    if (!values.fullName.trim()) {
        errors.fullName = "Please enter your full name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
        errors.email = "Please enter a valid email address.";
    }

    const phone = values.phone.trim();
    const digits = phone.replace(/\D/g, "");

    if (
        !/^\+?[\d\s()-]+$/.test(phone) ||
        digits.length < 10 ||
        digits.length > 15
    ) {
        errors.phone = "Please enter a valid phone number.";
    }

    if (!values.qualification.trim()) {
        errors.qualification = "Please enter your qualification.";
    }

    const experience = Number(values.experience);

    if (
        !values.experience.trim() ||
        !Number.isFinite(experience) ||
        experience < 0 ||
        experience > 60
    ) {
        errors.experience = "Enter experience between 0 and 60 years.";
    }

    if (!values.skills.trim()) {
        errors.skills = "Please enter your relevant skills.";
    }

    if (!resume) {
        errors.resume = "Please select your resume.";
    } else if (!/\.(pdf|doc|docx)$/i.test(resume.name)) {
        errors.resume = "Choose a PDF, DOC or DOCX file.";
    } else if (resume.size === 0 || resume.size > MAX_RESUME_SIZE) {
        errors.resume = "Choose a non-empty file up to 5 MB.";
    }

    return errors;
}

export default function JobDetails({ user = null }) {
    const { id } = useParams();

    return <JobDetailsContent key={id} id={id} user={user} />;
}

function JobDetailsContent({ id, user }) {
    const navigate = useNavigate();

    const titleRef = useRef(null);
    const formRef = useRef(null);
    const resumeRef = useRef(null);

    const [applicationOpen, setApplicationOpen] = useState(false);
    const [values, setValues] = useState(() => ({
        ...emptyApplication,
        fullName: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
    }));
    const [resume, setResume] = useState(null);
    const [errors, setErrors] = useState({});

    const job = demoJobs.find((item) => item.id === id);
    const profile = job ? jobProfiles[job.profile] : null;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
    }, []);

    const relatedJobs = job
        ? demoJobs
              .filter((item) => item.id !== job.id)
              .map((item) => ({
                  ...item,
                  relevance:
                      (item.profile === job.profile ? 4 : 0) +
                      item.skills.filter((skill) =>
                          job.skills.includes(skill)
                      ).length +
                      (item.location === job.location ? 1 : 0),
              }))
              .filter((item) => item.relevance > 0)
              .sort((first, second) => second.relevance - first.relevance)
              .slice(0, 3)
        : [];

    const handleApply = () => {
        if (!user) {
            navigate("/manage", {
                state: {
                    from: "website",
                    returnTo: `/jobs/${id}`,
                },
            });

            return;
        }

        if (user.role !== "user") {
            toast.info("Please use a candidate account to apply.");
            return;
        }

        setValues((previous) => ({
            ...previous,
            fullName: previous.fullName || user.name || "",
            email: previous.email || user.email || "",
            phone: previous.phone || user.phone || "",
        }));

        setApplicationOpen(true);
    };

    const handleClose = () => {
        setApplicationOpen(false);
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setValues((previous) => ({
            ...previous,
            [name]: value,
        }));

        setErrors((previous) => ({
            ...previous,
            [name]: "",
        }));
    };

    const handleResumeChange = (event) => {
        setResume(event.target.files?.[0] || null);

        setErrors((previous) => ({
            ...previous,
            resume: "",
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        const nextErrors = validateApplication(values, resume);
        setErrors(nextErrors);

        const firstError = Object.keys(nextErrors)[0];

        if (firstError) {
            if (firstError === "resume") {
                resumeRef.current?.focus();
            } else {
                formRef.current?.elements
                    .namedItem(firstError)
                    ?.focus();
            }

            return;
        }

        // Backend application submission will be connected here.
        toast.info(
            "Application checked. No details or files have been submitted; backend integration is pending."
        );
    };

    const fieldProps = (name) => ({
        id: `application-${name}`,
        name,
        value: values[name],
        onChange: handleChange,
        error: Boolean(errors[name]),
        helperText: errors[name] || undefined,
        required: true,
        fullWidth: true,
        variant: "outlined",
        className: "website-text-field",
    });

    if (!job) {
        return (
            <section className="website-section website-shell">
                <div className="rms-jobs-empty jd-not-found">
                    <i
                        className="fa-solid fa-briefcase"
                        aria-hidden="true"
                    />

                    <h1
                        ref={titleRef}
                        tabIndex={-1}
                        className="website-section-title"
                    >
                        Job not found.
                    </h1>

                    <p>
                        This position is unavailable or the link is incorrect.
                    </p>

                    <Button
                        component={Link}
                        to="/jobs"
                        className="website-button website-button-primary"
                    >
                        Explore Jobs
                    </Button>
                </div>
            </section>
        );
    }

    const summaryItems = [
        {
            label: "Location",
            value: job.location,
            icon: "fa-location-dot",
        },
        {
            label: "Experience",
            value: job.experience,
            icon: "fa-briefcase",
        },
        {
            label: "Salary",
            value: job.salary,
            icon: "fa-indian-rupee-sign",
        },
    ];

    return (
        <div className="jd-page">
            {/* WEBSITE BANNER */}
            <section
                className="about-hero"
                aria-labelledby="job-details-page-title"
            >
                <img
                    className="about-hero-image"
                    src="/images/about-banner.jpg"
                    alt=""
                    fetchPriority="high"
                />

                <div className="website-shell about-hero-inner">
                    <nav
                        className="about-breadcrumb"
                        aria-label="Breadcrumb"
                    >
                        <ol>
                            <li>
                                <Link to="/">Home</Link>
                            </li>

                            <li>
                                <Link to="/jobs">Jobs</Link>
                            </li>

                            <li aria-current="page">Job Details</li>
                        </ol>
                    </nav>

                    <div className="about-hero-content">
                        <p className="website-section-label">
                            YOUR NEXT CAREER MOVE
                        </p>

                        <h1
                            ref={titleRef}
                            id="job-details-page-title"
                            className="website-section-title"
                            tabIndex={-1}
                        >
                            Explore the role.
                            <span>Picture your next step.</span>
                        </h1>

                        <p className="website-section-description jd-banner-description">
                            Get to know the opportunity, understand the
                            requirements and take the next step in your career.
                        </p>
                    </div>
                </div>
            </section>

            {/* JOB CONTENT AND RELATED JOBS */}
            <section className="website-section">
                <div className="website-shell">
                    <div className="jd-container">
                        <div className="jd-layout">
                            <article
                                className="jd-content-card"
                                aria-labelledby="job-title"
                            >
                                {/* SUMMARY INSIDE ABOUT THE ROLE */}
                                <header className="jd-role-header">
                                    <p className="website-section-label">
                                        ABOUT THE ROLE
                                    </p>

                                    <div className="jd-summary-top">
                                        <div className="jd-summary-heading">
                                            <p className="jd-company">
                                                <i
                                                    className="fa-regular fa-building"
                                                    aria-hidden="true"
                                                />
                                                {job.company}
                                            </p>

                                            <h2 id="job-title">
                                                {job.title}
                                            </h2>

                                            <div className="jd-job-tags">
                                                <span>{job.type}</span>
                                                <span>{job.mode}</span>
                                            </div>
                                        </div>

                                        <div className="jd-summary-action">
                                            <Button
                                                onClick={handleApply}
                                                className="website-button website-button-primary"
                                            >
                                                Apply Now
                                            </Button>

                                            <p>
                                                {user?.role === "user"
                                                    ? "Continue your application."
                                                    : "Candidate sign-in required."}
                                            </p>
                                        </div>
                                    </div>

                                    <dl className="jd-summary-facts">
                                        {summaryItems.map((item) => (
                                            <div key={item.label}>
                                                <dt>
                                                    <i
                                                        className={`fa-solid ${item.icon}`}
                                                        aria-hidden="true"
                                                    />
                                                    {item.label}
                                                </dt>

                                                <dd>{item.value}</dd>
                                            </div>
                                        ))}
                                    </dl>

                                    <div className="jd-posting-info">
                                        <p>
                                            <i
                                                className="fa-solid fa-users"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                Openings:
                                                <strong>
                                                    {" "}{job.openings}
                                                </strong>
                                            </span>
                                        </p>

                                        <p>
                                            <i
                                                className="fa-regular fa-clock"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                Posted:
                                                {" "}
                                                <time dateTime={job.postedAt}>
                                                    {getPostedLabel(job.postedAt)}
                                                </time>
                                            </span>
                                        </p>
                                    </div>
                                </header>

                                <section className="jd-content-section">
                                    <h3 className="jd-section-title">
                                        Job description
                                    </h3>

                                    <p className="website-section-description">
                                        {job.description}
                                    </p>
                                </section>

                                <section className="jd-content-section">
                                    <h3 className="jd-section-title">
                                        What you’ll do
                                    </h3>

                                    <ul className="jd-point-list">
                                        {profile.responsibilities.map(
                                            (item) => (
                                                <li key={item}>{item}</li>
                                            )
                                        )}
                                    </ul>
                                </section>

                                <section className="jd-content-section">
                                    <h3 className="jd-section-title">
                                        What we’re looking for
                                    </h3>

                                    <ul className="jd-point-list">
                                        {profile.requirements.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </section>

                                <section className="jd-content-section">
                                    <h3 className="jd-section-title">
                                        Qualification
                                    </h3>

                                    <p className="website-section-description">
                                        {profile.qualification}
                                    </p>
                                </section>

                                <section className="jd-content-section">
                                    <h3 className="jd-section-title">
                                        Relevant skills
                                    </h3>

                                    <ul
                                        className="jd-skills"
                                        aria-label="Relevant skills"
                                    >
                                        {job.skills.map((skill) => (
                                            <li key={skill}>{skill}</li>
                                        ))}
                                    </ul>
                                </section>
                            </article>

                            {/* RELATED JOBS */}
                            <aside
                                className="jd-sidebar"
                                aria-labelledby="related-jobs-title"
                            >
                                <section className="jd-related-panel">
                                    <div className="jd-related-heading">
                                        <p className="website-section-label">
                                            KEEP EXPLORING
                                        </p>

                                        <h2
                                            id="related-jobs-title"
                                            className="jd-section-title"
                                        >
                                            Related jobs
                                        </h2>

                                        <p>
                                            More roles you might want to explore.
                                        </p>
                                    </div>

                                    {relatedJobs.length > 0 ? (
                                        <div className="jd-related-list">
                                            {relatedJobs.map((relatedJob) => (
                                                <article
                                                    key={relatedJob.id}
                                                    className="jd-related-card"
                                                >
                                                    <p className="jd-related-company">
                                                        {relatedJob.company}
                                                    </p>

                                                    <h3>
                                                        <Link
                                                            to={`/jobs/${relatedJob.id}`}
                                                        >
                                                            {relatedJob.title}
                                                        </Link>
                                                    </h3>

                                                    <p className="jd-related-location">
                                                        <i
                                                            className="fa-solid fa-location-dot"
                                                            aria-hidden="true"
                                                        />
                                                        {relatedJob.location}
                                                    </p>

                                                    <dl className="jd-related-meta">
                                                        <div>
                                                            <dt>Experience</dt>
                                                            <dd>
                                                                {relatedJob.experience}
                                                            </dd>
                                                        </div>

                                                        <div>
                                                            <dt>Salary</dt>
                                                            <dd>
                                                                {relatedJob.salary}
                                                            </dd>
                                                        </div>
                                                    </dl>

                                                    <div className="jd-related-footer">
                                                        <span>
                                                            {relatedJob.mode}
                                                        </span>

                                                        <Link
                                                            to={`/jobs/${relatedJob.id}`}
                                                            aria-label={`View details for ${relatedJob.title}`}
                                                        >
                                                            View Details
                                                            <i
                                                                className="fa-solid fa-arrow-right"
                                                                aria-hidden="true"
                                                            />
                                                        </Link>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="jd-related-empty">
                                            No related positions available
                                            right now.
                                        </p>
                                    )}

                                    <Button
                                        component={Link}
                                        to="/jobs"
                                        className="website-button website-button-outline jd-browse-button"
                                    >
                                        Browse All Jobs
                                    </Button>
                                </section>
                            </aside>
                        </div>
                    </div>
                </div>
            </section>

            {/* APPLICATION FORM */}
            <Dialog
                open={applicationOpen}
                onClose={handleClose}
                fullWidth
                maxWidth="md"
                aria-labelledby="application-title"
                className="jd-application-dialog"
            >
                <div className="website-layout jd-dialog-theme">
                    <DialogTitle
                        id="application-title"
                        className="jd-dialog-title"
                    >
                        <span>Apply for {job.title}</span>

                        <IconButton
                            aria-label="Close application form"
                            onClick={handleClose}
                            className="jd-dialog-close"
                        >
                            <i
                                className="fa-solid fa-xmark"
                                aria-hidden="true"
                            />
                        </IconButton>
                    </DialogTitle>

                    <form
                        ref={formRef}
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        <DialogContent className="jd-dialog-content">
                            <p className="jd-form-intro">
                                {job.company} · All fields are required.
                            </p>

                            <div className="jd-form-grid">
                                <TextField
                                    {...fieldProps("fullName")}
                                    label="Full name"
                                    autoComplete="name"
                                    slotProps={{
                                        htmlInput: { maxLength: 100 },
                                    }}
                                />

                                <TextField
                                    {...fieldProps("email")}
                                    label="Email address"
                                    type="email"
                                    autoComplete="email"
                                    slotProps={{
                                        htmlInput: { maxLength: 254 },
                                    }}
                                />

                                <TextField
                                    {...fieldProps("phone")}
                                    label="Phone number"
                                    type="tel"
                                    autoComplete="tel"
                                    slotProps={{
                                        htmlInput: { maxLength: 25 },
                                    }}
                                />

                                <TextField
                                    {...fieldProps("qualification")}
                                    label="Highest qualification"
                                    slotProps={{
                                        htmlInput: { maxLength: 150 },
                                    }}
                                />

                                <TextField
                                    {...fieldProps("experience")}
                                    label="Experience in years"
                                    type="number"
                                    slotProps={{
                                        htmlInput: {
                                            min: 0,
                                            max: 60,
                                            step: "any",
                                        },
                                    }}
                                />

                                <TextField
                                    {...fieldProps("skills")}
                                    label="Relevant skills"
                                    placeholder="React, Node.js, communication..."
                                    slotProps={{
                                        htmlInput: { maxLength: 500 },
                                    }}
                                />
                            </div>

                            <div className="jd-resume-field">
                                <label htmlFor="application-resume">
                                    Upload resume *
                                </label>

                                <input
                                    ref={resumeRef}
                                    id="application-resume"
                                    name="resume"
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleResumeChange}
                                    required
                                    aria-invalid={Boolean(errors.resume)}
                                    aria-describedby={
                                        errors.resume
                                            ? "resume-help resume-error"
                                            : "resume-help"
                                    }
                                />

                                <p id="resume-help">
                                    PDF, DOC or DOCX · Maximum 5 MB
                                </p>

                                {resume && (
                                    <p>Selected: {resume.name}</p>
                                )}

                                {errors.resume && (
                                    <p
                                        id="resume-error"
                                        className="jd-form-error"
                                    >
                                        {errors.resume}
                                    </p>
                                )}
                            </div>

                            <p className="jd-form-preview-note">
                                Submission is not connected yet. Checking
                                this form will not upload your resume.
                            </p>
                        </DialogContent>

                        <DialogActions className="jd-dialog-actions">
                            <Button
                                type="button"
                                onClick={handleClose}
                                className="website-button website-button-outline"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                className="website-button website-button-primary"
                            >
                                Check Application
                            </Button>
                        </DialogActions>
                    </form>
                </div>
            </Dialog>
        </div>
    );
}