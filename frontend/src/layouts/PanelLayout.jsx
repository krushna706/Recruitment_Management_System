import { Outlet } from "react-router-dom";

import PanelHeader from "../components/PanelHeader";
import PanelSidebar from "../components/PanelSidebar";

import "../css/panel.css";

function PanelLayout() {
    return (
        <div className="panel-layout">
            <PanelHeader />

            <div className="panel-body">
                <PanelSidebar />

                <main id="panel-content" className="panel-main" tabIndex={-1} >
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default PanelLayout;