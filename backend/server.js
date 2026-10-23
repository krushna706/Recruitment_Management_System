// ================== ENVIRONMENT CONFIGURATION ==================
// Load environment variables before importing application files.
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

// ================== SERVER CONFIGURATION ==================
const PORT = Number(process.env.PORT);

// ================== START SERVER ==================
async function startServer() {
    try {
        // Stop startup if the configured port is invalid.
        if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
            throw new Error("PORT must be an integer between 1 and 65535.");
        }

        // Connect to MongoDB Atlas before accepting requests.
        await connectDB();

        const server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}.`);
        });

        // Handle server startup errors, such as an occupied port.
        server.on("error", (error) => {
            if (error.code === "EADDRINUSE") {
                console.error(`Port ${PORT} is already in use.`);
            } else {
                console.error("HTTP server failed to start.");
            }

            process.exit(1);
        });
    } catch (error) {
        // Avoid logging database credentials or connection strings.
        console.error(
            "Server startup failed. Check PORT, DB_URI and MongoDB Atlas access settings."
        );

        process.exit(1);
    }
}

// ================== INITIALIZE ==================
startServer();
