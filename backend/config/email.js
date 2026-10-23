
// ================== BREVO EMAIL CONFIGURATION ==================
// Uses Node.js built-in fetch (Node.js 20+).
// No additional npm package required.

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const EMAIL_TIMEOUT_MS = 15000;
const OTP_VALIDITY_MINUTES = 10;

// ================== EMAIL SERVICE ERROR ==================
function createEmailError() {
    const error = new Error(
        "Unable to send verification email. Please try again later."
    );

    error.code = "EMAIL_SEND_FAILED";

    return error;
}

// ================== ENVIRONMENT CONFIGURATION ==================
// Read credentials only on the backend.
// Validation happens when an email is sent, not during import.
function getEmailConfig() {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();

    const senderName =
        process.env.BREVO_SENDER_NAME?.trim() ||
        "Recruitment Management System";

    if (!apiKey || !senderEmail) {
        throw new Error(
            "Brevo email configuration is incomplete."
        );
    }

    return {
        apiKey,
        senderEmail,
        senderName,
    };
}

// ================== ESCAPE HTML CONTENT ==================
// Prevent user-provided names from injecting HTML into emails.
function escapeHtml(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        (character) => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            };

            return entities[character];
        }
    );
}

// ================== PASSWORD RESET EMAIL TEMPLATE ==================
function createOtpEmailTemplate({ otp, name }) {
    const safeName = escapeHtml(
        String(name || "User").slice(0, 100)
    );

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport"
                  content="width=device-width, initial-scale=1.0" />
            <title>HireSetu Password Reset</title>
        </head>

        <body style="
            margin: 0;
            padding: 30px 12px;
            background-color: #f3f6fa;
            font-family: Arial, Helvetica, sans-serif;
            color: #1f2937;
        ">

            <table
                role="presentation"
                cellpadding="0"
                cellspacing="0"
                width="100%"
                style="
                    max-width: 560px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                "
            >
                <tr>
                    <td style="
                        padding: 26px 30px;
                        background-color: #123b63;
                        text-align: center;
                        border-radius: 12px 12px 0 0;
                    ">
                        <h1 style="
                            margin: 0;
                            color: #ffffff;
                            font-size: 26px;
                        ">
                            HireSetu
                        </h1>

                        <p style="
                            margin: 8px 0 0;
                            color: #e2e8f0;
                            font-size: 13px;
                        ">
                            Recruitment Management System
                        </p>
                    </td>
                </tr>

                <tr>
                    <td style="padding: 30px;">

                        <h2 style="
                            margin: 0 0 18px;
                            font-size: 22px;
                            color: #111827;
                        ">
                            Reset Your Password
                        </h2>

                        <p style="
                            font-size: 15px;
                            line-height: 1.7;
                        ">
                            Hello ${safeName},
                        </p>

                        <p style="
                            font-size: 14px;
                            line-height: 1.7;
                        ">
                            We received a request to reset your
                            HireSetu account password.
                            Use the verification code below
                            to continue.
                        </p>

                        <!-- ================== OTP CODE ================== -->
                        <div style="
                            margin: 25px 0;
                            padding: 22px;
                            text-align: center;
                            background-color: #f0f6ff;
                            border: 1px solid #dbeafe;
                            border-radius: 8px;
                        ">
                            <p style="
                                margin: 0 0 12px;
                                font-size: 12px;
                                color: #475569;
                            ">
                                YOUR VERIFICATION CODE
                            </p>

                            <div style="
                                font-size: 34px;
                                font-weight: bold;
                                letter-spacing: 8px;
                                color: #123b63;
                            ">
                                ${otp}
                            </div>
                        </div>

                        <p style="
                            font-size: 14px;
                            line-height: 1.7;
                        ">
                            This OTP is valid for
                            <strong>
                                ${OTP_VALIDITY_MINUTES} minutes
                            </strong>.
                        </p>

                        <p style="
                            font-size: 13px;
                            line-height: 1.7;
                            color: #64748b;
                        ">
                            If you did not request a password
                            reset, you can safely ignore
                            this email. Do not share this
                            verification code with anyone.
                        </p>

                    </td>
                </tr>

                <tr>
                    <td style="
                        padding: 20px;
                        text-align: center;
                        background-color: #f8fafc;
                        border-top: 1px solid #e5e7eb;
                        border-radius: 0 0 12px 12px;
                    ">
                        <p style="
                            margin: 0;
                            font-size: 12px;
                            color: #64748b;
                        ">
                            HireSetu - Recruitment Management System
                        </p>

                        <p style="
                            margin: 7px 0 0;
                            font-size: 11px;
                            color: #94a3b8;
                        ">
                            This is an automated security email.
                        </p>
                    </td>
                </tr>
            </table>

        </body>
        </html>
    `;
}

// ================== SEND PASSWORD RESET OTP ==================
// toEmail must come from the verified MongoDB account,
// never directly from an unverified request field.
async function sendPasswordResetOtpEmail({
    toEmail,
    otp,
    name = "",
}) {
    // ================== INPUT VALIDATION ==================
    if (
        typeof toEmail !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)
    ) {
        throw new TypeError("A valid recipient email is required.");
    }

    if (
        typeof otp !== "string" ||
        !/^\d{6}$/.test(otp)
    ) {
        throw new TypeError("OTP must contain exactly 6 digits.");
    }

    // ================== LOAD BREVO CREDENTIALS ==================
    const {
        apiKey,
        senderEmail,
        senderName,
    } = getEmailConfig();

    // ================== EMAIL REQUEST BODY ==================
    const emailData = {
        sender: {
            name: senderName,
            email: senderEmail,
        },

        to: [
            {
                email: toEmail,
            },
        ],

        subject: "HireSetu - Password Reset Verification Code",

        htmlContent: createOtpEmailTemplate({
            otp,
            name,
        }),

        tags: ["password-reset"],
    };

    // ================== BREVO API REQUEST ==================
    try {
        const response = await fetch(BREVO_API_URL, {
            method: "POST",

            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json",
                Accept: "application/json",
            },

            body: JSON.stringify(emailData),

            signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
        });

        // ================== CHECK API RESPONSE ==================
        if (!response.ok) {
            // Do not expose provider errors or API credentials
            // through the public Forgot Password endpoint.
            throw createEmailError();
        }

        const result = await response.json();

        // Brevo normally returns HTTP 201 with a messageId.
        if (!result?.messageId) {
            throw createEmailError();
        }

        // ================== SUCCESS ==================
        // This confirms API acceptance, not inbox delivery.
        return {
            accepted: true,
            messageId: result.messageId,
        };
    } catch {
        // Never include OTP or API key in error messages.
        throw createEmailError();
    }
}

// ================== EXPORTS ==================
module.exports = {
    sendPasswordResetOtpEmail,
    OTP_VALIDITY_MINUTES,
};
