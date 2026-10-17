import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import WebsiteLayout from "./layouts/WebsiteLayout";

import HomePage from "./website/Home/HomePage";
import Jobs from "./website/Jobs/Jobs";
import JobDetails from "./website/Jobs/JobDetails";
import JobApply from "./website/Jobs/JobApply";
import About from "./website/About";
import Careers from "./website/Careers";
import Contact from "./website/Contact";

import Login from "./auth/Login";
import Signup from "./auth/Signup";
import ForgotPassword  from "./auth/ForgotPassword";

import NotFound from "./components/NotFound";

import "./css/website.css";

function App() {
    return (
        <BrowserRouter>
            {/* Shared notifications for the entire application */}
            <ToastContainer position="top-right" autoClose={3000} />

            <Routes>
                {/* Authentication pages use their own AuthLayout */}
                <Route path="/manage" element={<Login />} />
                <Route path="/manage/signup" element={<Signup />} />
                <Route path="/manage/forgot-password" element={<ForgotPassword  />} />

                {/* Public website pages share navbar and footer */}
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
            </Routes>
        </BrowserRouter>
    );
}

export default App;