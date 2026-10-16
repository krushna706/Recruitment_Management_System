import React from 'react';
import Hero from './Hero';
import AboutSection from './AboutSection';
import FeaturedJobs from './FeaturedJobs';

function HomePage() {
    return (
        <>
          <Hero />
          <AboutSection />
          <FeaturedJobs />
        </>
    );
}

export default HomePage;