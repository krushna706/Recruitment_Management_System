import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import WebsiteLayout from "./layouts/WebsiteLayout";
import PanelLayout from "./layouts/PanelLayout";

// Public website
import HomePage from "./website/Home/HomePage";
import Jobs from "./website/Jobs/Jobs";
import JobDetails from "./website/Jobs/JobDetails";
import JobApply from "./website/Jobs/JobApply";
import About from "./website/About";
import Careers from "./website/Careers";
import Contact from "./website/Contact";

// Authentication
import Login from "./auth/Login";
import Signup from "./auth/Signup";
import ForgotPassword from "./auth/ForgotPassword";

// Panel configuration
import { panelPages, getPanelRole } from "./config/panelConfig";

// Shared
import NotFound from "./components/NotFound";

import "./css/website.css";

/* ===== FRONTEND DEMO ACCOUNT ===== */

// Change role to "user" or "admin".
// Replace this with verified authentication data later.
const demoUser = {
    id: "demo-account",
    name: "Krushna Chandra Mohanty",
    email: "candidate@example.com",
    phone: "9876543210",
    role: "admin",
    avatarUrl: "/images/default-avatar.svg",
};

/* ===== ACCESS DENIED ===== */

function AccessDenied() {
    return (
        <section className="panel-card panel-empty-state">
            <h1 className="panel-page-title">Access denied</h1>

            <p>
                Your account does not have permission to open this page.
            </p>

            <Link to="/" className="panel-text-link">
                Back to website
            </Link>
        </section>
    );
}

/* ===== PANEL ENTRY CHECK ===== */

function PanelAccess({ user }) {
    const location = useLocation();

    if (!user) {
        const returnTo =
            location.pathname + location.search + location.hash;

        return <Navigate to="/manage" replace state={{ returnTo }} />;
    }

    if (!getPanelRole(user.role)) {
        return <AccessDenied />;
    }

    return <Outlet />;
}

/* ===== ROLE-BASED DASHBOARD AND PROFILE ===== */

function RolePage({ user, page }) {
    const roleConfig = getPanelRole(user?.role);
    const PageComponent = roleConfig?.[page];

    if (!PageComponent) {
        return <AccessDenied />;
    }

    return <PageComponent user={user} />;
}

/* ===== INDIVIDUAL PAGE ACCESS ===== */

function PanelPage({ user, page }) {
    if (!user || !page.allowedRoles.includes(user.role)) {
        return <AccessDenied />;
    }

    const PageComponent = page.component;

    return <PageComponent user={user} />;
}

/* ===== APP ROUTES ===== */

function App() {
    const user = demoUser;
    const roleConfig = getPanelRole(user?.role);

    const panelUser = user
        ? {
              ...user,
              roleLabel: roleConfig?.label || "Unknown role",
          }
        : null;

    return (
        <BrowserRouter>
            <ToastContainer position="top-right" autoClose={3000} />

            <Routes>
                {/* Authentication */}
                <Route path="/manage" element={<Login />} />
                <Route path="/manage/signup" element={<Signup />} />
                <Route path="/manage/forgot-password" element={<ForgotPassword />} />

                {/* Public website */}
                <Route element={<WebsiteLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/jobs/:id" element={<JobDetails />} />
                    <Route path="/jobs/:id/apply" element={<JobApply />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/careers" element={<Careers />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="*" element={<NotFound />} />
                </Route>

                {/* Shared user/admin panel */}
                <Route element={<PanelAccess user={panelUser} />}>
                    <Route path="/manage" element={<PanelLayout user={panelUser} />}>
                        <Route path="dashboard" element={<RolePage user={panelUser} page="dashboard" />} />
                        <Route path="profile" element={<RolePage user={panelUser} page="profile" />} />

                        {panelPages.map((page) => (
                            <Route key={page.path} path={page.path} element={<PanelPage user={panelUser} page={page} />} />
                        ))}

                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;