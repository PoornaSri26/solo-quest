import React from 'react';
import { Hero } from '../components/Hero';
import SectionBetrayal from '../components/scroll-sections/SectionBetrayal';
import SectionThreeLaws from '../components/scroll-sections/SectionThreeLaws';
import SectionLivePreview from '../components/scroll-sections/SectionLivePreview';
import SectionRankLadder from '../components/scroll-sections/SectionRankLadder';
import SectionConsequence from '../components/scroll-sections/SectionConsequence';
import SectionRegistration from '../components/scroll-sections/SectionRegistration';
import { Divider } from '../components/Divider';
import { Footer } from '../components/Footer';

const LandingPage: React.FC = () => {
  return (
    <section className="hero">
      {/* Hero Section */}
      <Hero />

      <Divider />

      {/* Scroll Sections */}
      <SectionBetrayal />
      <SectionThreeLaws />
      <SectionLivePreview />
      <SectionRankLadder />
      <SectionConsequence />
      <SectionRegistration />

      <Footer />
    </section>
  );
};

export default LandingPage;
