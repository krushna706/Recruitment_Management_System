import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, TextField } from "@mui/material";
import { toast } from "react-toastify";

const companyContact = {
    phone: "7064341545",
    email: "krushna@gmail.com",
    address: "253R+8V3, Kakatpur-Astaranga Rd, Kakatpur, Odisha 752108",
};

const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    companyContact.address
)}`;

const initialValues = {
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
};

function validateForm(values) {
    const errors = {};

    if (!values.name.trim()) {
        errors.name = "Please enter your full name.";
    }

    if (!values.email.trim()) {
        errors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
        errors.email = "Please enter a valid email address.";
    }

    const phone = values.phone.trim();
    const digits = phone.replace(/\D/g, "");

    if (!phone) {
        errors.phone = "Please enter your phone number.";
    } else if (
        !/^\+?[\d\s()-]+$/.test(phone) ||
        digits.length < 10 ||
        digits.length > 15
    ) {
        errors.phone = "Please enter a valid phone number.";
    }

    if (!values.subject.trim()) {
        errors.subject = "Please enter a subject.";
    }

    if (!values.message.trim()) {
        errors.message = "Please enter your message.";
    }

    return errors;
}

export default function Contact() {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [previewChecked, setPreviewChecked] = useState(false);

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

        setPreviewChecked(false);
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        const nextErrors = validateForm(values);
        setErrors(nextErrors);
        setPreviewChecked(false);

        const firstInvalidField = Object.keys(nextErrors)[0];

        if (firstInvalidField) {
            event.currentTarget.elements
                .namedItem(firstInvalidField)
                ?.focus();

            return;
        }

        // Frontend preview only.
        // Connect the contact API here during backend development.
        // Clear the form only after a successful API response.
        setPreviewChecked(true);

        toast.info(
            "Form checked. Your enquiry has not been sent because submission is not connected yet."
        );
    };

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
    });

    return (
        <div className="contact-page">
            {/* BANNER — REUSES THE ABOUT PAGE DESIGN */}
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

            {/* CONTACT INFORMATION AND FORM */}
            <section
                className="website-section contact-main-section"
                aria-labelledby="contact-form-title"
            >
                <div className="website-shell">
                    <div className="contact-grid">
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

                                        <a href={`tel:+91${companyContact.phone}`}>
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

                                        <a href={`mailto:${companyContact.email}`}>
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

                            <form
                                className="contact-form"
                                onSubmit={handleSubmit}
                                noValidate
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
                                                maxLength: 25,
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

                                <p
                                    className="contact-preview-note"
                                    role="status"
                                >
                                    {previewChecked
                                        ? "Your form is ready. No enquiry has been sent or saved in this preview."
                                        : "Preview mode: this form checks your details but does not send an enquiry yet."}
                                </p>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    disableElevation
                                    className="website-button website-button-primary contact-submit"
                                    endIcon={
                                        <i
                                            className="fa-solid fa-arrow-right"
                                            aria-hidden="true"
                                        />
                                    }
                                >
                                    Check enquiry
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}