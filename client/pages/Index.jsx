import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Partners from "../components/Partners";
import Stats from "../components/Stats";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import AppShowcase from "../components/AppShowcase";
import Testimonials from "../components/Testimonials";
import Pricing from "../components/Pricing";
import CTA from "../components/CTA";
import Footer from "../components/Footer";
import "../index.css";

export default function HomePage() {
  return (
    <div className="dark bg-background min-h-screen text-foreground selection:bg-[#00c96e] selection:text-[#060d1a]">
      {/* 1. Navigation */}
      <Navbar />

      {/* 2. Hero viewport area */}
      <Hero />

      {/* 3. Partners infinite marquee strip */}
      <Partners />

      {/* 4. Numbers and Stats section */}
      <Stats />

      {/* 5. Features asymmetric bento grid */}
      <Features />

      {/* 6. Cinematic process timeline */}
      <HowItWorks />

      {/* 7. Interactive device mockups */}
      <AppShowcase />

      {/* 8. Nigerian user reviews slider */}
      <Testimonials />

      {/* 9. Dynamic comparison and pricing models */}
      <Pricing />

      {/* 10. Floating circuit board CTA section */}
      <CTA />

      {/* 11. Comprehensive Brand footer with license badge */}
      <Footer />
    </div>
  );
}
