import Hero from "./Hero";
import AboutSection from "./AboutSection";
import FeaturedJobs from "./FeaturedJobs";

export default function HomePage() {
    return (
        <div className="rms-home">
            <Hero />
            <AboutSection />
            <FeaturedJobs />
        </div>
    );
}