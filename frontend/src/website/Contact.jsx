
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, CircularProgress, TextField } from "@mui/material";
import { toast } from "react-toastify";

import api from "../services/api";

// ================== COMPANY CONTACT DETAILS ==================
const companyContact = {
    phone: "7064341545",
    email: "krushna@gmail.com",
    address: "253R+8V3, Kakatpur-Astaranga Rd, Kakatpur, Odisha 752108",
};

const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    companyContact.address
)}`;

// ================== INITIAL FORM VALUES ==================
const initialValues = {
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
};

// ================== FORM VALIDATION ==================
// Match the backend Contact Joi schema.
function validateForm(values) {
    const errors = {};

    const name = values.name.trim();
    const email = values.email.trim();
    const phone = values.phone.trim();
    const subject = values.subject.trim();
    const message = values.message.trim();

    // ================== NAME VALIDATION ==================
    if (!name) {
        errors.name = "Please enter your full name.";
    } else if (name.length < 2 || name.length > 100) {
        errors.name = "Name must contain 2–100 characters.";
    }

    // ================== EMAIL VALIDATION ==================
    if (!email) {
        errors.email = "Please enter your email address.";
    } else if (
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        errors.email = "Please enter a valid email address.";
    }


    // ================== PHONE VALIDATION ==================
    // Only valid 10-digit Indian mobile numbers.
    if (!phone) {
        errors.phone = "Please enter your phone number.";
    } else if (!/^[6-9]\d{9}$/.test(phone)) {
        errors.phone = "Enter a valid 10-digit Indian mobile number.";
    }


    // ================== SUBJECT VALIDATION ==================
    if (!subject) {
        errors.subject = "Please enter a subject.";
    } else if (subject.length > 150) {
        errors.subject = "Subject cannot exceed 150 characters.";
    }

    // ================== MESSAGE VALIDATION ==================
    if (!message) {
        errors.message = "Please enter your message.";
    } else if (message.length > 3000) {
        errors.message = "Message cannot exceed 3000 characters.";
    }

    return errors;
}

// ================== API ERROR MESSAGE ==================
function getApiError(error) {
    const status = error.response?.status;

    if (status === 429) {
        return "Too many enquiries. Please try again later.";
    }

    if (status >= 500) {
        return "Our service is temporarily unavailable. Please try again later.";
    }

    return (
        error.response?.data?.message ||
        "Unable to submit your enquiry. Please try again."
    );
}

// ================== CONTACT PAGE ==================
export default function Contact() {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // ================== HANDLE INPUT CHANGE ==================
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

        setFeedback(null);
    };

    // ================== SUBMIT CONTACT ENQUIRY ==================
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSubmitting) return;

        // Remove extra whitespace before validation and submission.
        const payload = {
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
            phone: values.phone.trim(),
            subject: values.subject.trim(),
            message: values.message.trim(),
        };

        const nextErrors = validateForm(payload);

        setErrors(nextErrors);
        setFeedback(null);

        const firstInvalidField = Object.keys(nextErrors)[0];

        if (firstInvalidField) {
            event.currentTarget.elements
                .namedItem(firstInvalidField)
                ?.focus();

            return;
        }

        setIsSubmitting(true);

        try {
            // ================== SAVE ENQUIRY IN MONGODB ==================
            // Backend validates fields and generates enquiry ID.
            const { data } = await api.post(
                "/contact",
                payload
            );

            if (!data?.success || !data?.enquiryId) {
                throw new Error(
                    "The server did not confirm enquiry submission."
                );
            }

            // ================== SUCCESS RESPONSE ==================
            // Clear the form only after the server confirms submission.
            setValues({ ...initialValues });
            setErrors({});

            setFeedback({
                type: "success",
                message: "Your enquiry has been submitted successfully.",
                enquiryId: data.enquiryId,
            });

            toast.success("Enquiry submitted successfully.");
        } catch (error) {
            // ================== ERROR RESPONSE ==================
            // Preserve all form values so the user can retry.
            setFeedback({
                type: "error",
                message: getApiError(error),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ================== SHARED INPUT PROPERTIES ==================
    const getFieldProps = (name) => ({
        id: `contact-${name}`,
        name,
        value: values[name],
        onChange: handleChange,
        error: Boolean(errors[name]),
        helperText: errors[name] || undefined,
        className: "website-text-field",
        variant: "outlined",
        fullWidth: true,
        required: true,
        disabled: isSubmitting,
    });

    return (
        <div className="contact-page">
            {/* ================== CONTACT BANNER ================== */}
            <section
                className="about-hero"
                aria-labelledby="contact-title"
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

                            <li aria-current="page">Contact</li>
                        </ol>
                    </nav>

                    <div className="about-hero-content">
                        <p className="website-section-label">
                            GET IN TOUCH
                        </p>

                        <h1
                            id="contact-title"
                            className="website-section-title"
                        >
                            Let’s start a conversation.
                            <span>We’re here to help.</span>
                        </h1>

                        <p className="website-section-description contact-banner-description">
                            Questions about our organization or your next
                            opportunity? Connect with our team.
                        </p>
                    </div>
                </div>
            </section>

            {/* ================== CONTACT INFORMATION AND FORM ================== */}
            <section
                className="website-section contact-main-section"
                aria-labelledby="contact-form-title"
            >
                <div className="website-shell">
                    <div className="contact-grid">
                        {/* ================== CONTACT INFORMATION ================== */}
                        <aside
                            className="contact-information"
                            aria-labelledby="contact-information-title"
                        >
                            <p className="website-section-label">
                                LET’S CONNECT
                            </p>

                            <h2
                                id="contact-information-title"
                                className="website-section-title"
                            >
                                A question?
                                <span> We’re listening.</span>
                            </h2>

                            <p className="website-section-description">
                                Reach us by phone, email or the enquiry
                                form. Choose the way that works best for
                                you.
                            </p>

                            <ul className="contact-details">
                                <li>
                                    <span
                                        className="contact-icon"
                                        aria-hidden="true"
                                    >
                                        <i className="fa-solid fa-phone" />
                                    </span>

                                    <div>
                                        <h3>Call us</h3>

                                        <a
                                            href={`tel:+91${companyContact.phone}`}
                                        >
                                            +91 {companyContact.phone}
                                        </a>
                                    </div>
                                </li>

                                <li>
                                    <span
                                        className="contact-icon"
                                        aria-hidden="true"
                                    >
                                        <i className="fa-solid fa-envelope" />
                                    </span>

                                    <div>
                                        <h3>Email us</h3>

                                        <a
                                            href={`mailto:${companyContact.email}`}
                                        >
                                            {companyContact.email}
                                        </a>
                                    </div>
                                </li>

                                <li>
                                    <span
                                        className="contact-icon"
                                        aria-hidden="true"
                                    >
                                        <i className="fa-solid fa-location-dot" />
                                    </span>

                                    <div>
                                        <h3>Our location</h3>

                                        <address>
                                            {companyContact.address}
                                        </address>

                                        <a
                                            className="contact-map-link"
                                            href={mapUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            View on Google Maps

                                            <i
                                                className="fa-solid fa-arrow-up-right-from-square"
                                                aria-hidden="true"
                                            />

                                            <span className="contact-sr-only">
                                                {" "}(opens in a new tab)
                                            </span>
                                        </a>
                                    </div>
                                </li>
                            </ul>

                            {/* ================== CAREERS LINK ================== */}
                            <div className="contact-careers">
                                <span
                                    className="contact-icon"
                                    aria-hidden="true"
                                >
                                    <i className="fa-solid fa-briefcase" />
                                </span>

                                <h3>Your next opportunity awaits.</h3>

                                <p>
                                    Looking for a role? Explore current
                                    openings and apply from the job
                                    details page.
                                </p>

                                <Button
                                    component={Link}
                                    to="/jobs"
                                    className="website-button website-button-white"
                                    endIcon={
                                        <i
                                            className="fa-solid fa-arrow-right"
                                            aria-hidden="true"
                                        />
                                    }
                                >
                                    Explore Jobs
                                </Button>
                            </div>
                        </aside>

                        {/* ================== CONTACT FORM CARD ================== */}
                        <div className="contact-form-card">
                            <div className="contact-form-heading">
                                <span
                                    className="contact-icon contact-form-icon"
                                    aria-hidden="true"
                                >
                                    <i className="fa-regular fa-comments" />
                                </span>

                                <p className="website-section-label">
                                    SEND AN ENQUIRY
                                </p>

                                <h2
                                    id="contact-form-title"
                                    className="website-section-title"
                                >
                                    How can we help?
                                </h2>

                                <p className="website-section-description">
                                    Tell us a little about your enquiry.
                                    All fields are required.
                                </p>
                            </div>

                            {/* ================== ENQUIRY FORM ================== */}
                            <form
                                className="contact-form"
                                onSubmit={handleSubmit}
                                noValidate
                                aria-busy={isSubmitting}
                            >
                                <div className="contact-form-row">
                                    <TextField
                                        {...getFieldProps("name")}
                                        label="Full name"
                                        autoComplete="name"
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 100,
                                            },
                                        }}
                                    />

                                    <TextField
                                        {...getFieldProps("email")}
                                        label="Email address"
                                        type="email"
                                        autoComplete="email"
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 254,
                                            },
                                        }}
                                    />
                                </div>

                                <div className="contact-form-row">
                                    <TextField
                                        {...getFieldProps("phone")}
                                        label="Phone number"
                                        type="tel"
                                        autoComplete="tel"
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 10,
                                                inputMode: "numeric",
                                            },
                                        }}
                                    />

                                    <TextField
                                        {...getFieldProps("subject")}
                                        label="Subject"
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 150,
                                            },
                                        }}
                                    />
                                </div>

                                {/* ================== MESSAGE INPUT ================== */}
                                <div>
                                    <TextField
                                        {...getFieldProps("message")}
                                        label="Your message"
                                        multiline
                                        minRows={5}
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 3000,
                                            },
                                        }}
                                    />

                                    <div className="contact-message-footer">
                                        <span>
                                            Please avoid sharing passwords
                                            or sensitive information.
                                        </span>

                                        <span>
                                            {values.message.length}/3000
                                        </span>
                                    </div>
                                </div>

                                {/* ================== SUBMISSION FEEDBACK ================== */}
                                {feedback && (
                                    <div
                                        className="contact-preview-note"
                                        role={
                                            feedback.type === "error"
                                                ? "alert"
                                                : "status"
                                        }
                                        style={
                                            feedback.type === "error"
                                                ? {
                                                      background: "#fff5f5",
                                                      borderColor: "#fecaca",
                                                      color: "#b91c1c",
                                                  }
                                                : {
                                                      background: "#f0fdf4",
                                                      borderColor: "#bbf7d0",
                                                      color: "#166534",
                                                  }
                                        }
                                    >
                                        <p style={{ margin: 0 }}>
                                            {feedback.message}
                                        </p>

                                        {feedback.enquiryId && (
                                            <p
                                                style={{
                                                    margin: "6px 0 0",
                                                    fontWeight: 600,
                                                    overflowWrap: "anywhere",
                                                }}
                                            >
                                                Enquiry ID: {feedback.enquiryId}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* ================== SUBMIT BUTTON ================== */}
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disableElevation
                                    disabled={isSubmitting}
                                    className="website-button website-button-primary contact-submit"
                                    endIcon={
                                        isSubmitting ? (
                                            <CircularProgress
                                                size={18}
                                                color="inherit"
                                            />
                                        ) : (
                                            <i
                                                className="fa-solid fa-arrow-right"
                                                aria-hidden="true"
                                            />
                                        )
                                    }
                                >
                                    {isSubmitting
                                        ? "Submitting..."
                                        : "Submit Enquiry"}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
