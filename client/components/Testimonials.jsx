import React, { useState, useEffect } from "react";
import {
  Star,
  Quote,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { TESTIMONIALS } from "./data";
import ScrollFadeUp from "./ScrollFadeUp";

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size to handle slide sizes dynamically
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalSlides = isMobile ? TESTIMONIALS.length : TESTIMONIALS.length - 2;

  // Auto-play interval
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= totalSlides - 1) return 0;
        return prev + 1;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, totalSlides]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
  };

  return (
    <section
      id="reviews"
      className="py-24 bg-card border-b border-[#1d3a6a]/30 relative overflow-hidden"
    >
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 right-0 w-[450px] h-[450px] rounded-full bg-[#00c96e]/2 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[450px] h-[450px] rounded-full bg-[#00a8ff]/2 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#003d20]/50 border border-[#00c96e]/30 text-xs font-bold tracking-wider text-[#00c96e] uppercase mb-4">
              <MessageSquare className="w-3.5 h-3.5" /> LOVED BY NIGERIANS
            </div>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight text-[#e8f0ff]">
              Real people. <br className="hidden sm:block" />
              <span className="text-[#00c96e]">Real cash rewards.</span>
            </h2>
          </div>

          {/* Slider Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              className="p-3 rounded-xl bg-[#0f2040] hover:bg-[#152c52] border border-[#1d3a6a]/50 text-[#7a9cc8] hover:text-[#e8f0ff] transition-all duration-200 cursor-pointer"
              aria-label="Previous testimonials"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="p-3 rounded-xl bg-[#0f2040] hover:bg-[#152c52] border border-[#1d3a6a]/50 text-[#7a9cc8] hover:text-[#e8f0ff] transition-all duration-200 cursor-pointer"
              aria-label="Next testimonials"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carousel Viewport Wrapper */}
        <ScrollFadeUp>
          <div
            className="overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Sliding Track */}
            <div
              className="flex transition-transform duration-700 ease-in-out gap-6"
              style={{
                transform: `translateX(-${activeIndex * (isMobile ? 100 : 34)}%)`,
                width: isMobile ? `${TESTIMONIALS.length * 100}%` : "100%",
              }}
            >
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.id}
                  className="w-full shrink-0 md:w-[calc(33.333%-16px)] flex flex-col justify-between p-6 rounded-[24px] bg-gradient-to-br from-[#0f2040]/75 to-[#0a1628]/75 border border-[#1d3a6a]/60 backdrop-blur-md shadow-xl relative group transition-all duration-300 hover:border-[#00c96e]/40"
                >
                  {/* Decorative quote mark */}
                  <Quote className="absolute top-4 right-4 w-10 h-10 text-[#1d3a6a]/20 group-hover:text-[#00c96e]/10 transition-colors pointer-events-none" />

                  {/* Stars block */}
                  <div className="flex gap-1 mb-6">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-[#f5a623] stroke-none"
                      />
                    ))}
                  </div>

                  {/* Testimonial Quote */}
                  <p className="text-[#e8f0ff] text-sm sm:text-base leading-relaxed mb-8 font-normal italic text-left">
                    "{t.quote}"
                  </p>

                  {/* User Profile Info Card */}
                  <div className="flex items-center gap-3 border-t border-[#1d3a6a]/30 pt-4">
                    <div className="w-10 h-10 rounded-full bg-[#00c96e]/10 border border-[#00c96e]/30 flex items-center justify-center font-display font-bold text-xs text-[#00c96e]">
                      {t.avatarInitials}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-sm text-[#e8f0ff]">
                        {t.name}
                      </h4>
                      <p className="text-[11px] text-[#7a9cc8] font-semibold uppercase tracking-wider">
                        {t.city}, Nigeria
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollFadeUp>

        {/* Carousel Dot Pagination Indicator */}
        <div className="flex items-center justify-center gap-2 mt-12">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                activeIndex === i
                  ? "bg-[#00c96e] w-8 shadow-md shadow-[#00c96e]/25"
                  : "bg-[#1d3a6a] hover:bg-[#7a9cc8]"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
