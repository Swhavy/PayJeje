/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ArrowRight, ShieldCheck, CheckCircle } from "lucide-react";
import ScrollFadeUp from "./ScrollFadeUp";

export default function CTA() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim() && email.includes("@")) {
      setIsSubmitted(true);
    }
  };

  return (
    <section
      id="cta"
      className="relative py-28 overflow-hidden bg-gradient-to-tr from-[#003d20] via-[#0a1628] to-[#060d1a] border-b border-[#1d3a6a]/30"
    >
      {/* Circuit Board SVG Pattern overlay (5% opacity) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none z-0">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <pattern id="circuit" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M10 10 h80 v80 h-80 z" fill="none" stroke="#00c96e" strokeWidth="1" />
            <circle cx="10" cy="10" r="2" fill="#00c96e" />
            <circle cx="90" cy="10" r="2" fill="#00c96e" />
            <circle cx="90" cy="90" r="2" fill="#00c96e" />
            <circle cx="10" cy="90" r="2" fill="#00c96e" />
            <path d="M50 10 v40 h40" fill="none" stroke="#00c96e" strokeWidth="1" />
            <path d="M10 50 h40 v40" fill="none" stroke="#00c96e" strokeWidth="1" />
            <circle cx="50" cy="50" r="3" fill="#00c96e" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#circuit)" />
        </svg>
      </div>

      {/* Floating glowing background orbs */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-[#00c96e]/10 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 rounded-full bg-[#00a8ff]/10 blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <ScrollFadeUp flex-col items-center>
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#003d20]/50 border border-[#00c96e]/30 text-xs font-bold text-[#00c96e] uppercase tracking-wider mb-6">
            <ShieldCheck className="w-4 h-4" /> NO CREDIT CARD REQUIRED
          </div>

          {/* Heading */}
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight text-[#e8f0ff] mb-6 max-w-2xl mx-auto">
            Start earning today. <br />
            <span className="text-[#00c96e] drop-shadow-[0_0_30px_rgba(0,201,110,0.2)]">It's 100% free.</span>
          </h2>

          {/* Subheading */}
          <p className="text-[#7a9cc8] text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-10">
            Join 50,000+ Nigerians who pay bills smarter, faster, and earn real cashback points on every single Naira spent.
          </p>

          {/* Centered Email Form */}
          <div className="max-w-md mx-auto w-full mb-6">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-[#0f2040]/80 backdrop-blur-md border border-[#1d3a6a]/60 shadow-2xl focus-within:border-[#00c96e]/50 transition-all duration-300">
                <input
                  type="email"
                  required
                  placeholder="Enter your phone or email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent text-[#e8f0ff] placeholder-[#3d5a80] px-4 py-3.5 rounded-xl flex-grow focus:outline-none text-sm font-medium"
                />
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-xl bg-[#00c96e] hover:bg-[#00e87d] text-[#060d1a] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#00c96e]/15 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer shrink-0"
                >
                  Join Waitlist
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#003d20]/50 border border-[#00c96e]/30 backdrop-blur-md animate-float max-w-md mx-auto">
                <CheckCircle className="w-6 h-6 text-[#00c96e] shrink-0" />
                <div className="text-left">
                  <h4 className="font-semibold text-sm text-[#e8f0ff]">You're on the list!</h4>
                  <p className="text-xs text-[#7a9cc8]">We've sent a priority welcome pass to {email}.</p>
                </div>
              </div>
            )}
          </div>

          {/* Trust points */}
          <p className="text-xs font-semibold tracking-wide text-[#3d5a80]/80 uppercase">
            No Credit Card Required <span className="mx-2">•</span> 50,000+ users <span className="mx-2">•</span> Cancel anytime
          </p>

        </ScrollFadeUp>
      </div>
    </section>
  );
}
