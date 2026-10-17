import { Outlet } from "react-router-dom";

import WebsiteNavbar from "../components/WebsiteNavbar";
import WebsiteFooter from "../components/WebsiteFooter";


function WebsiteLayout() {
    return (
        <div className="website-layout">

            <WebsiteNavbar />

            {/* Expands to keep the footer at the bottom */}
            <main id="website-content" className="website-main" tabIndex={-1} >
                <Outlet />
            </main>

            <WebsiteFooter />
        </div>
    );
}

export default WebsiteLayout;