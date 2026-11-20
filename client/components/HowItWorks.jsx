import React from "react";
import { UserPlus, CreditCard, Gift } from "lucide-react";
import { STEPS } from "./data";
import ScrollFadeUp from "./ScrollFadeUp";

export default function HowItWorks() {
  // Map icons dynamically to step numbers
  const getStepIcon = (num) => {
    switch (num) {
      case "01":
        return <UserPlus className="w-6 h-6 text-emerald-400" />;
      case "02":
        return <CreditCard className="w-6 h-6 text-emerald-400" />;
      case "03":
        return <Gift className="w-6 h-6 text-emerald-400" />;
      default:
        return null;
    }
  };

  return (
    <section
      id="how-it-works"
      className="py-24 bg-gradient-to-b from-[#040806] via-[#07100C] to-[#040806] border-b border-white/[0.07] relative overflow-hidden"
    >
      {/* Decorative Orb */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-emerald-500/6 blur-[110px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/25 text-xs font-bold tracking-wider text-emerald-400 uppercase mb-4">
            FLOW PROCESS
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight text-white">
            Up and running in <span className="text-emerald-400">3 steps</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed mt-4 max-w-lg">
            No complicated verifications or hidden terms. Simply hook up your account, process payments, and stack earnings instantly.
          </p>
        </div>

        {/* Steps Container Row */}
        <div className="relative">
          {/* Connecting Animated Dashed Line (Desktop Only) */}
          <div className="hidden lg:block absolute top-[52px] left-[15%] right-[15%] h-0.5 bg-white/[0.08] border-t border-dashed border-emerald-400/35 z-0">
            {/* Travelling glowing dot */}
            <div className="absolute top-[-3px] w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34D399] animate-traveling-dot" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8 relative z-10">
            {STEPS.map((step, index) => (
              <ScrollFadeUp
                key={step.id}
                delay={index * 150}
                className="flex flex-col items-center text-center px-6 relative"
              >
                {/* Large Backdrop Step Number */}
                <span className="absolute -top-12 lg:-top-16 font-display font-black text-7xl sm:text-8xl md:text-9xl text-emerald-400/[0.08] select-none pointer-events-none -z-10 tracking-tighter">
                  {step.number}
                </span>

                {/* Step Icon in Frosted Emerald Circle */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-b from-emerald-950/90 to-[#060C09] border border-emerald-400/35 shadow-[0_12px_28px_-10px_rgba(16,185,129,0.45)] flex items-center justify-center mb-6 relative backdrop-blur-md">
                  <div className="absolute inset-0 rounded-full border border-dashed border-emerald-400/25 animate-rotate-slow" />
                  {getStepIcon(step.number)}
                </div>

                {/* Step Titles & Copy */}
                <h3 className="font-display font-extrabold text-xl text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-400 text-sm md:text-base leading-relaxed">
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
