import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import WebsiteLayout from "./layouts/WebsiteLayout";

import HomePage from "./website/Home/HomePage";
import Jobs from "./website/Jobs/Jobs";
import JobDetails from "./website/Jobs/JobDetails";
import About from "./website/About";
import Careers from "./website/Careers";
import Contact from "./website/Contact";

import NotFound from "./components/NotFound";



function App() {
    return (
        <BrowserRouter>
            {/* Shared notifications for the entire application */}
            <ToastContainer position="top-right" autoClose={3000} />

            <Routes>
                {/* Public website pages share the same layout */}
                <Route element={<WebsiteLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/jobs/:id" element={<JobDetails />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/careers" element={<Careers />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;