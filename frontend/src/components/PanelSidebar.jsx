import { Link, NavLink } from "react-router-dom";
import {
    Drawer,
    IconButton,
    useMediaQuery,
} from "@mui/material";



const navigationItems = [
    {
        label: "Dashboard",
        path: "/manage/dashboard",
        icon: "fa-solid fa-table-columns",
        end: true,
    },
    {
        label: "My Applications",
        path: "/manage/my-applications",
        icon: "fa-regular fa-file-lines",
        end: false,
    },
    {
        label: "Profile",
        path: "/manage/profile",
        icon: "fa-regular fa-user",
        end: false,
    },
];

function SidebarContent({
    isMobile = false,
    collapsed = false,
    onClose,
}) {
    return (
        <>
            {isMobile && (
                <div className="panel-sidebar-mobile-header">
                    <span>Menu</span>

                    <IconButton
                        type="button"
                        className="panel-sidebar-close"
                        aria-label="Close navigation"
                        onClick={onClose}
                    >
                        <i
                            className="fa-solid fa-xmark"
                            aria-hidden="true"
                        />
                    </IconButton>
                </div>
            )}

            <nav
                className="panel-sidebar-nav"
                aria-label="User panel navigation"
            >
                <p className="panel-nav-label">WORKSPACE</p>

                <ul className="panel-nav-list">
                    {navigationItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                end={item.end}
                                onClick={onClose}
                                tabIndex={collapsed ? -1 : undefined}
                                className={({ isActive }) =>
                                    `panel-nav-link ${
                                        isActive ? "is-active" : ""
                                    }`
                                }
                            >
                                <span
                                    className="panel-nav-icon"
                                    aria-hidden="true"
                                >
                                    <i className={item.icon} />
                                </span>

                                <span className="panel-nav-text">
                                    {item.label}
                                </span>

                                <i
                                    className="fa-solid fa-chevron-right panel-nav-arrow"
                                    aria-hidden="true"
                                />
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
               <div className="panel-sidebar-bottom">
                    <Link
                        to="/"
                        className="panel-sidebar-home"
                        onClick={onClose}
                        tabIndex={collapsed ? -1 : undefined}
                    >
                        <span className="panel-nav-icon" aria-hidden="true">
                            <i className="fa-solid fa-arrow-left" />
                        </span>

                        <span>Back to website</span>

                        <i
                            className="fa-solid fa-arrow-up-right-from-square"
                            aria-hidden="true"
                        />
                    </Link>
                </div>
        </>
    );
}

function PanelSidebar({
    isMobile,
    mobileOpen,
    collapsed,
    onClose,
}) {
    const reduceMotion = useMediaQuery(
        "(prefers-reduced-motion: reduce)"
    );

    if (isMobile) {
        return (
            <Drawer
                anchor="left"
                open={mobileOpen}
                onClose={onClose}
                transitionDuration={
                    reduceMotion ? 0 : { enter: 280, exit: 240 }
                }
                slotProps={{
                    paper: {
                        id: "panel-sidebar",
                        className:
                            "panel-sidebar panel-sidebar-drawer",
                        "aria-label": "User navigation",
                    },
                }}
            >
                <SidebarContent
                    isMobile
                    onClose={onClose}
                />
            </Drawer>
        );
    }

    return (
        <aside
            id="panel-sidebar"
            className={`panel-sidebar panel-sidebar-desktop ${
                collapsed ? "is-collapsed" : ""
            }`}
            aria-label="User navigation"
            aria-hidden={collapsed ? "true" : undefined}
        >
            <SidebarContent collapsed={collapsed} />
        </aside>
    );
}

export default PanelSidebar;