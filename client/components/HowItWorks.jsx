import React from "react";
import { UserPlus, CreditCard, Gift } from "lucide-react";
import { STEPS } from "./data";
import ScrollFadeUp from "./ScrollFadeUp";

export default function HowItWorks() {
  // Map icons dynamically to step numbers
  const getStepIcon = (num) => {
    switch (num) {
      case "01":
        return <UserPlus className="w-6 h-6 text-[#00c96e]" />;
      case "02":
        return <CreditCard className="w-6 h-6 text-[#00c96e]" />;
      case "03":
        return <Gift className="w-6 h-6 text-[#00c96e]" />;
      default:
        return null;
    }
  };

  return (
    <section
      id="how-it-works"
      className="py-24 bg-gradient-to-b from-[#060d1a] via-[#0a1628] to-[#060d1a] border-b border-[#1d3a6a]/30 relative overflow-hidden"
    >
      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#00a8ff]/2 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#003d20]/50 border border-[#00c96e]/30 text-xs font-bold tracking-wider text-[#00c96e] uppercase mb-4">
            FLOW PROCESS
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight text-[#e8f0ff]">
            Up and running in <span className="text-[#00c96e]">3 steps</span>
          </h2>
          <p className="text-[#7a9cc8] text-sm sm:text-base leading-relaxed mt-4 max-w-lg">
            No complicated verifications or hidden terms. Simply hook up your account, process payments, and stack earnings instantly.
          </p>
        </div>

        {/* Steps Container Row */}
        <div className="relative">
          {/* Connecting Animated Dashed Line (Desktop Only) */}
          <div className="hidden lg:block absolute top-[52px] left-[15%] right-[15%] h-0.5 bg-[#1d3a6a]/30 border-t border-dashed border-[#1d3a6a]/60 z-0">
            {/* Travelling glowing dot */}
            <div className="absolute top-[-3px] w-2 h-2 rounded-full bg-[#00c96e] shadow-[0_0_12px_#00c96e] animate-traveling-dot" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8 relative z-10">
            {STEPS.map((step, index) => (
              <ScrollFadeUp
                key={step.id}
                delay={index * 150}
                className="flex flex-col items-center text-center px-6 relative"
              >
                {/* Large Backdrop Step Number */}
                <span className="absolute -top-12 lg:-top-16 font-display font-black text-7xl sm:text-8xl md:text-9xl text-[#1d3a6a]/15 select-none pointer-events-none -z-10 tracking-tighter">
                  {step.number}
                </span>

                {/* Step Icon in Green Gradient Circle */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#003d20]/90 to-[#0a1628]/95 border border-[#00c96e]/40 shadow-lg shadow-[#00c96e]/10 flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 rounded-full border border-dashed border-[#00c96e]/20 animate-rotate-slow" />
                  {getStepIcon(step.number)}
                </div>

                {/* Step Titles & Copy */}
                <h3 className="font-display font-extrabold text-xl text-[#e8f0ff] mb-3">
                  {step.title}
                </h3>
                <p className="text-[#7a9cc8] text-sm md:text-base leading-relaxed">
                  {step.description}
                </p>
              </ScrollFadeUp>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
