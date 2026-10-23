import { useLocation, useNavigate } from "react-router-dom";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

const experienceOptions = [
    { value: "", label: "Any experience" },
    { value: "0", label: "Fresher" },
    ...Array.from({ length: 30 }, (_, index) => {
        const years = index + 1;

        return {
            value: String(years),
            label: `${years} ${years === 1 ? "year" : "years"}`,
        };
    }),
    { value: "30+", label: "More than 30 years" },
];

function JobSearchBar() {
    const navigate = useNavigate();
    const location = useLocation();

    const params = new URLSearchParams(location.search);

    const designation = params.get("designation") || "";
    const jobLocation = params.get("location") || "";

    const requestedExperience = params.get("experience") || "";

    const experience = experienceOptions.some((option) => option.value === requestedExperience)
        ? requestedExperience
        : "";

    // Reinitialize fields when URL filters change, including Back/Forward.
    const formKey = JSON.stringify([designation, experience, jobLocation]);

    function handleSearch(event) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const searchParams = new URLSearchParams();

        const nextDesignation = String(formData.get("designation") || "").trim();

        const nextExperience = String(formData.get("experience") || "");

        const nextLocation = String(formData.get("location") || "").trim();

        if (nextDesignation) {
            searchParams.set("designation", nextDesignation);
        }

        if (nextExperience) {
            searchParams.set("experience", nextExperience);
        }

        if (nextLocation) {
            searchParams.set("location", nextLocation);
        }

        const query = searchParams.toString();

        navigate({
            pathname: "/jobs",
            search: query ? `?${query}` : "",
        });
    }

    return (
        <form
            key={formKey}
            className="job-search-bar"
            role="search"
            aria-label="Search job openings"
            onSubmit={handleSearch}
        >
            <div className="job-search-field">
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />

                <input
                    name="designation"
                    type="search"
                    aria-label="Job title or designation"
                    placeholder="Job title or designation"
                    defaultValue={designation}
                    maxLength={100}
                />
            </div>

            <div className="job-search-field">
                <i className="fa-solid fa-briefcase" aria-hidden="true" />

                <Select
                    name="experience"
                    defaultValue={experience}
                    variant="outlined"
                    className="job-search-select"
                    displayEmpty
                    fullWidth
                    inputProps={{
                        "aria-label": "Experience",
                    }}
                    renderValue={(selected) => {
                        if (selected === "") {
                            return <span className="job-search-placeholder">Experience</span>;
                        }

                        return experienceOptions.find((option) => option.value === selected)?.label;
                    }}
                    MenuProps={{
                        disableScrollLock: true,
                        slotProps: {
                            paper: {
                                className: "job-search-menu",
                            },
                        },
                        anchorOrigin: {
                            vertical: "bottom",
                            horizontal: "left",
                        },
                        transformOrigin: {
                            vertical: "top",
                            horizontal: "left",
                        },
                    }}
                >
                    {experienceOptions.map((option) => (
                        <MenuItem key={option.value || "any"} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </Select>
            </div>

            <div className="job-search-field">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />

                <input
                    name="location"
                    type="text"
                    aria-label="City or location"
                    placeholder="City or location"
                    defaultValue={jobLocation}
                    maxLength={100}
                />
            </div>

            <button
                type="submit"
                className="website-button website-button-primary job-search-submit"
            >
                Search Jobs
                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
        </form>
    );
}

export default JobSearchBar;
