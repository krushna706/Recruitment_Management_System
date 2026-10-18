import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useMediaQuery } from "@mui/material";
import { toast } from "react-toastify";

import PanelHeader from "../components/PanelHeader";
import PanelSidebar from "../components/PanelSidebar";

import "../css/panel.css";

function PanelLayout({ user = null, onLogout }) {
    const isMobile = useMediaQuery("(max-width: 991.98px)");

    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const toggleSidebar = () => {
        if (isMobile) {
            setMobileOpen((previous) => !previous);
            return;
        }

        setSidebarCollapsed((previous) => !previous);
    };

    const handleLogout = async () => {
        if (isLoggingOut) return;

        if (!onLogout) {
            toast.info(
                "Logout will work after authentication is connected."
            );
            return;
        }

        try {
            setIsLoggingOut(true);
            await onLogout();
        } catch {
            toast.error("Unable to log out. Please try again.");
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div
            className={`panel-layout ${
                sidebarCollapsed ? "is-sidebar-collapsed" : ""
            }`}
        >
            <PanelHeader
                user={user}
                isSidebarOpen={
                    isMobile ? mobileOpen : !sidebarCollapsed
                }
                onToggleSidebar={toggleSidebar}
                onLogout={handleLogout}
                isLoggingOut={isLoggingOut}
            />

            <div className="panel-body">
                <PanelSidebar
                    isMobile={isMobile}
                    mobileOpen={mobileOpen}
                    collapsed={sidebarCollapsed}
                    onClose={() => setMobileOpen(false)}
                />

                <main className="panel-main">
                    <Outlet context={{ user }} />
                </main>
            </div>
        </div>
    );
}

export default PanelLayout;