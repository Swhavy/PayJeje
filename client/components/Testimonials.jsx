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
      className="py-24 bg-[#050A08] border-b border-white/[0.06] relative overflow-hidden"
    >
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 right-0 w-[450px] h-[450px] rounded-full bg-[#10B981]/[0.05] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[450px] h-[450px] rounded-full bg-teal-400/[0.04] blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-xs font-bold tracking-wider text-emerald-400 uppercase mb-4">
              <MessageSquare className="w-3.5 h-3.5" /> LOVED BY NIGERIANS
            </div>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight text-white">
              Real people. <br className="hidden sm:block" />
              <span className="text-emerald-400">Real cash rewards.</span>
            </h2>
          </div>

          {/* Slider Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.09] text-slate-300 hover:text-white transition-all duration-200 cursor-pointer backdrop-blur-xl"
              aria-label="Previous testimonials"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.09] text-slate-300 hover:text-white transition-all duration-200 cursor-pointer backdrop-blur-xl"
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
                  className="w-full shrink-0 md:w-[calc(33.333%-16px)] flex flex-col justify-between p-6 rounded-[24px] bg-white/[0.035] border border-white/[0.09] backdrop-blur-2xl shadow-[0_24px_56px_-16px_rgba(0,0,0,0.65)] relative group transition-all duration-300 hover:border-emerald-400/35 hover:bg-white/[0.055]"
                >
                  {/* Decorative quote mark */}
                  <Quote className="absolute top-4 right-4 w-10 h-10 text-emerald-400/10 group-hover:text-emerald-400/20 transition-colors pointer-events-none" />

                  {/* Stars block */}
                  <div className="flex gap-1 mb-6">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-[#F59E0B] stroke-none"
                      />
                    ))}
                  </div>

                  {/* Testimonial Quote */}
                  <p className="text-slate-100 text-sm sm:text-base leading-relaxed mb-8 font-normal italic text-left">
                    "{t.quote}"
                  </p>

                  {/* User Profile Info Card */}
                  <div className="flex items-center gap-3 border-t border-white/[0.08] pt-4">
                    <div className="relative w-11 h-11 rounded-full overflow-hidden bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center font-display font-bold text-xs text-emerald-300 shrink-0 shadow-[0_6px_18px_rgba(16,185,129,0.2)]">
                      {t.avatarUrl ? (
                        <img
                          src={t.avatarUrl}
                          alt={t.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        t.avatarInitials
                      )}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-sm text-white">
                        {t.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
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
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                activeIndex === i
                  ? "bg-emerald-400 w-8 shadow-md shadow-emerald-500/25"
                  : "w-2.5 bg-white/15 hover:bg-white/35"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
