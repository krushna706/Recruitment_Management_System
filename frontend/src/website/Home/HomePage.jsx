import usePageSEO from "../../hooks/usePageSEO";
import { seoPages } from "../../config/seoConfig";

import Hero from "./Hero";
import AboutSection from "./AboutSection";
import FeaturedJobs from "./FeaturedJobs";

export default function HomePage() {
    usePageSEO(seoPages.home);
    
    return (
        <div className="rms-home">
            <Hero />
            <AboutSection />
            <FeaturedJobs />
        </div>
    );
}
