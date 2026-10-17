import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    Button,
    MenuItem,
    Pagination,
    TextField,
} from "@mui/material";

import JobSearchBar from "../../components/JobSearchBar";

// Frontend demo data. Replace with backend data later.
const demoJobs = [
    {
        id: "frontend-developer",
        title: "Frontend Developer",
        company: "Demo Technologies",
        department: "Engineering",
        location: "Bhubaneswar, Odisha",
        employmentType: "Full-time",
        workMode: "On-site",
        minExperience: 0,
        maxExperience: 2,
        salary: "₹3–5 LPA",
        description:
            "Build responsive React interfaces and reusable components for web applications.",
    },
    {
        id: "backend-developer",
        title: "Backend Developer",
        company: "Demo Technologies",
        department: "Engineering",
        location: "Bengaluru, Karnataka",
        employmentType: "Full-time",
        workMode: "Hybrid",
        minExperience: 1,
        maxExperience: 3,
        salary: "₹5–8 LPA",
        description:
            "Develop REST APIs, manage databases and build reliable backend services.",
    },
    {
        id: "ui-ux-designer",
        title: "UI/UX Designer",
        company: "Sample Design Studio",
        department: "Design",
        location: "Pune, Maharashtra",
        employmentType: "Full-time",
        workMode: "Hybrid",
        minExperience: 0,
        maxExperience: 2,
        salary: "₹3–6 LPA",
        description:
            "Create user journeys, wireframes and accessible designs for digital products.",
    },
    {
        id: "mern-developer",
        title: "MERN Stack Developer",
        company: "Sample Digital",
        department: "Engineering",
        location: "Hyderabad, Telangana",
        employmentType: "Full-time",
        workMode: "Remote",
        minExperience: 2,
        maxExperience: 5,
        salary: "₹6–10 LPA",
        description:
            "Build full-stack features and integrate APIs across modern web applications.",
    },
    {
        id: "hr-intern",
        title: "HR Intern",
        company: "Sample People Services",
        department: "Human Resources",
        location: "Bhubaneswar, Odisha",
        employmentType: "Internship",
        workMode: "On-site",
        minExperience: 0,
        maxExperience: 1,
        salary: "₹10k–15k / month",
        description:
            "Support recruitment, coordinate interviews and learn practical HR operations.",
    },
    {
        id: "business-development",
        title: "Business Development Executive",
        company: "Sample Digital",
        department: "Business",
        location: "Kolkata, West Bengal",
        employmentType: "Full-time",
        workMode: "On-site",
        minExperience: 1,
        maxExperience: 4,
        salary: "₹3–6 LPA",
        description:
            "Connect with prospective clients and develop lasting business relationships.",
    },
    {
        id: "qa-engineer",
        title: "QA Engineer",
        company: "Demo Technologies",
        department: "Engineering",
        location: "Pune, Maharashtra",
        employmentType: "Contract",
        workMode: "Remote",
        minExperience: 1,
        maxExperience: 3,
        salary: "₹4–7 LPA",
        description:
            "Test application features and help developers deliver reliable software.",
    },
    {
        id: "content-writer",
        title: "Content Writer",
        company: "Sample Design Studio",
        department: "Marketing",
        location: "Bengaluru, Karnataka",
        employmentType: "Part-time",
        workMode: "Remote",
        minExperience: 0,
        maxExperience: 2,
        salary: "₹15k–25k / month",
        description:
            "Write useful website and marketing content with a consistent brand voice.",
    },
    {
        id: "digital-marketing",
        title: "Digital Marketing Executive",
        company: "Sample Digital",
        department: "Marketing",
        location: "Hyderabad, Telangana",
        employmentType: "Full-time",
        workMode: "Hybrid",
        minExperience: 1,
        maxExperience: 3,
        salary: "₹3–5 LPA",
        description:
            "Support digital campaigns and improve audience engagement across channels.",
    },
    {
        id: "react-intern",
        title: "React Developer Intern",
        company: "Demo Technologies",
        department: "Engineering",
        location: "Bhubaneswar, Odisha",
        employmentType: "Internship",
        workMode: "On-site",
        minExperience: 0,
        maxExperience: 1,
        salary: "₹12k–18k / month",
        description:
            "Build frontend components with guidance and gain practical React experience.",
    },
    {
        id: "customer-support",
        title: "Customer Support Executive",
        company: "Sample People Services",
        department: "Operations",
        location: "Kolkata, West Bengal",
        employmentType: "Full-time",
        workMode: "On-site",
        minExperience: 0,
        maxExperience: 2,
        salary: "₹2.5–4 LPA",
        description:
            "Resolve customer queries and coordinate timely support with internal teams.",
    },
    {
        id: "project-coordinator",
        title: "Project Coordinator",
        company: "Sample Digital",
        department: "Operations",
        location: "Pune, Maharashtra",
        employmentType: "Full-time",
        workMode: "Hybrid",
        minExperience: 2,
        maxExperience: 4,
        salary: "₹4–7 LPA",
        description:
            "Coordinate project tasks, track delivery and keep teams informed.",
    },
];

const departments = [...new Set(demoJobs.map((job) => job.department))];
const employmentTypes = [
    ...new Set(demoJobs.map((job) => job.employmentType)),
];
const workModes = [...new Set(demoJobs.map((job) => job.workMode))];

const PAGE_SIZE = 20;

function matchesExperience(job, experience) {
    if (!experience) return true;

    if (experience === "30+") {
        return job.maxExperience > 30;
    }

    const years = Number(experience);

    return (
        Number.isFinite(years) &&
        years >= 0 &&
        years >= job.minExperience &&
        years <= job.maxExperience
    );
}

export default function Jobs() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [pagination, setPagination] = useState({
        filterKey: "",
        page: 1,
    });

    const designation = (searchParams.get("designation") || "").trim();
    const location = (searchParams.get("location") || "").trim();
    const experience = searchParams.get("experience") || "";
    const department = searchParams.get("department") || "";
    const employmentType = searchParams.get("employmentType") || "";
    const workMode = searchParams.get("workMode") || "";

    const filterKey = JSON.stringify([
        designation,
        location,
        experience,
        department,
        employmentType,
        workMode,
    ]);

    const filteredJobs = useMemo(() => {
        const titleQuery = designation.toLowerCase();
        const locationQuery = location.toLowerCase();

        return demoJobs.filter((job) => {
            const searchableText = [
                job.title,
                job.company,
                job.department,
                job.description,
            ]
                .join(" ")
                .toLowerCase();

            const searchableLocation =
                `${job.location} ${job.workMode}`.toLowerCase();

            return (
                (!titleQuery || searchableText.includes(titleQuery)) &&
                (!locationQuery ||
                    searchableLocation.includes(locationQuery)) &&
                matchesExperience(job, experience) &&
                (!department || job.department === department) &&
                (!employmentType ||
                    job.employmentType === employmentType) &&
                (!workMode || job.workMode === workMode)
            );
        });
    }, [
        designation,
        location,
        experience,
        department,
        employmentType,
        workMode,
    ]);

    const pageCount = Math.ceil(filteredJobs.length / PAGE_SIZE);

    const currentPage =
        pagination.filterKey === filterKey
            ? Math.min(pagination.page, Math.max(1, pageCount))
            : 1;

    const startIndex = (currentPage - 1) * PAGE_SIZE;

    const visibleJobs = filteredJobs.slice(
        startIndex,
        startIndex + PAGE_SIZE
    );

    const hasFilters = Boolean(
        designation ||
            location ||
            experience ||
            department ||
            employmentType ||
            workMode
    );

    const updateFilter = (name, value) => {
        const nextParams = new URLSearchParams(searchParams);

        if (value) {
            nextParams.set(name, value);
        } else {
            nextParams.delete(name);
        }

        setSearchParams(nextParams, {
            preventScrollReset: true,
        });
    };

    const clearFilters = () => {
        const nextParams = new URLSearchParams(searchParams);

        [
            "designation",
            "location",
            "experience",
            "department",
            "employmentType",
            "workMode",
        ].forEach((name) => nextParams.delete(name));

        setSearchParams(nextParams, {
            preventScrollReset: true,
        });
    };

    const handlePageChange = (_, page) => {
        setPagination({ filterKey, page });
        document.getElementById("jobs-results-title")?.focus();
    };

    const filterOptions = [
        {
            name: "department",
            label: "Department",
            value: department,
            options: departments,
        },
        {
            name: "employmentType",
            label: "Job type",
            value: employmentType,
            options: employmentTypes,
        },
        {
            name: "workMode",
            label: "Work mode",
            value: workMode,
            options: workModes,
        },
    ];

    return (
        <div className="jobs-page">
            {/* IMAGE BANNER */}
            <section
                className="about-hero"
                aria-labelledby="jobs-page-title"
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

                            <li aria-current="page">Jobs</li>
                        </ol>
                    </nav>

                    <div className="about-hero-content">
                        <p className="website-section-label">
                            FIND YOUR OPPORTUNITY
                        </p>

                        <h1
                            id="jobs-page-title"
                            className="website-section-title"
                        >
                            Your skills. Your ambitions.
                            <span>Your next opportunity.</span>
                        </h1>

                        <p className="website-section-description jobs-banner-description">
                            Discover roles that match your experience,
                            interests and the way you want to work.
                        </p>
                    </div>
                </div>
            </section>

            {/* CENTERED SEARCH CONTAINER */}
            <section
                className="website-shell jobs-search-section"
                aria-label="Search and filter jobs"
            >
                <div className="jobs-search-panel">
                    <JobSearchBar />

                    <div className="jobs-filter-row">
                        {filterOptions.map((filter) => (
                            <TextField
                                key={filter.name}
                                id={`jobs-filter-${filter.name}`}
                                select
                                fullWidth
                                size="small"
                                label={filter.label}
                                value={filter.value}
                                onChange={(event) =>
                                    updateFilter(
                                        filter.name,
                                        event.target.value
                                    )
                                }
                                className="website-text-field"
                            >
                                <MenuItem value="">All</MenuItem>

                                {filter.options.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}

                                {filter.value &&
                                    !filter.options.includes(
                                        filter.value
                                    ) && (
                                        <MenuItem value={filter.value}>
                                            {filter.value}
                                        </MenuItem>
                                    )}
                            </TextField>
                        ))}

                        <Button
                            type="button"
                            onClick={clearFilters}
                            disabled={!hasFilters}
                            className="jobs-clear-button"
                        >
                            Clear filters
                        </Button>
                    </div>
                </div>
            </section>

            {/* FLUID JOB RESULTS */}
            <section
                className="website-section jobs-results"
                aria-labelledby="jobs-results-title"
            >
                <div className="website-shell jobs-results-fluid">
                    <div className="jobs-results-header">
                        <p className="website-section-label">
                            EXPLORE OPPORTUNITIES
                        </p>

                        <h2
                            id="jobs-results-title"
                            className="website-section-title"
                            tabIndex={-1}
                        >
                            Find a role
                            <span> that fits you.</span>
                        </h2>

                        <p className="jobs-result-count" role="status">
                            {filteredJobs.length === 0
                                ? "No matching positions found."
                                : `Showing ${startIndex + 1}–${Math.min(
                                      startIndex + PAGE_SIZE,
                                      filteredJobs.length
                                  )} of ${filteredJobs.length} positions`}
                        </p>
                    </div>

                    {visibleJobs.length > 0 ? (
                        <>
                            <div className="jobs-list-grid">
                                {visibleJobs.map((job) => (
                                    <article
                                        key={job.id}
                                        className="rms-job-card jobs-position-card"
                                    >
                                        <p className="rms-job-company">
                                            {job.company}
                                        </p>

                                        {/* Department and title: same row */}
                                        <div className="jobs-title-row">
                                            <span
                                                className="jobs-department"
                                                title={job.department}
                                            >
                                                {job.department}
                                            </span>

                                            <h3 className="rms-job-title">
                                                <Link
                                                    to={`/jobs/${job.id}`}
                                                    title={job.title}
                                                >
                                                    {job.title}
                                                </Link>
                                            </h3>
                                        </div>

                                        <div className="rms-job-tags">
                                            <span>
                                                {job.employmentType}
                                            </span>

                                            <span>{job.workMode}</span>
                                        </div>

                                        <p className="jobs-card-description">
                                            {job.description}
                                        </p>

                                        {/* Experience and salary: same row */}
                                        <dl className="rms-job-meta jobs-card-meta">
                                            <div>
                                                <dt>
                                                    <i
                                                        className="fa-solid fa-briefcase"
                                                        aria-hidden="true"
                                                    />
                                                    Experience
                                                </dt>

                                                <dd>
                                                    {job.minExperience}–
                                                    {job.maxExperience} years
                                                </dd>
                                            </div>

                                            <div>
                                                <dt>
                                                    <i
                                                        className="fa-solid fa-indian-rupee-sign"
                                                        aria-hidden="true"
                                                    />
                                                    Salary
                                                </dt>

                                                <dd>{job.salary}</dd>
                                            </div>
                                        </dl>

                                        {/* Location and button: same row */}
                                        <div className="rms-job-footer">
                                            <p
                                                className="rms-job-location"
                                                title={job.location}
                                            >
                                                <i
                                                    className="fa-solid fa-location-dot"
                                                    aria-hidden="true"
                                                />

                                                <span>{job.location}</span>
                                            </p>

                                            <Button
                                                component={Link}
                                                to={`/jobs/${job.id}`}
                                                className="website-button website-button-outline jobs-details-button"
                                                aria-label={`View details for ${job.title}`}
                                            >
                                                View Details
                                            </Button>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {pageCount > 1 && (
                                <div className="jobs-pagination">
                                    <Pagination
                                        count={pageCount}
                                        page={currentPage}
                                        onChange={handlePageChange}
                                        shape="rounded"
                                        siblingCount={0}
                                        aria-label="Job results pages"
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="rms-jobs-empty jobs-empty">
                            <i
                                className="fa-solid fa-magnifying-glass"
                                aria-hidden="true"
                            />

                            <h3>
                                {hasFilters
                                    ? "No jobs match your search."
                                    : "No positions available right now."}
                            </h3>

                            <p>
                                {hasFilters
                                    ? "Try another search or clear your filters."
                                    : "Please check back later for new opportunities."}
                            </p>

                            {hasFilters && (
                                <Button
                                    type="button"
                                    onClick={clearFilters}
                                    className="website-button website-button-primary"
                                >
                                    Clear All Filters
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}