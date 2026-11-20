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
      className="relative py-28 overflow-hidden bg-gradient-to-tr from-[#042416] via-[#06120D] to-[#040806] border-b border-white/[0.06]"
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
      <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-[#10B981]/15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 rounded-full bg-teal-400/10 blur-[110px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <ScrollFadeUp flex-col items-center>

          {/* Community portrait row */}
          <div className="flex items-center justify-center mb-5">
            <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.09] backdrop-blur-xl">
              <div className="flex -space-x-2">
                {["/landing/avatar-1.jpg", "/landing/avatar-2.jpg", "/landing/avatar-3.jpg", "/landing/avatar-4.jpg"].map((src, idx) => (
                  <img
                    key={src}
                    src={src}
                    alt={`PayWaka community member ${idx + 1}`}
                    className="w-7 h-7 rounded-full object-cover object-top ring-2 ring-[#06120D]"
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-200 pr-1">
                50,000+ verified Nigerians
              </span>
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-6">
            <ShieldCheck className="w-4 h-4" /> NO CREDIT CARD REQUIRED
          </div>

          {/* Heading */}
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight text-white mb-6 max-w-2xl mx-auto">
            Start earning today. <br />
            <span className="text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.25)]">It's 100% free.</span>
          </h2>

          {/* Subheading */}
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-10">
            Join 50,000+ Nigerians who pay bills smarter, faster, and earn real cashback points on every single Naira spent.
          </p>

          {/* Centered Email Form */}
          <div className="max-w-md mx-auto w-full mb-6">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.1] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.75)] focus-within:border-emerald-400/50 transition-all duration-300">
                <input
                  type="email"
                  required
                  placeholder="Enter your phone or email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent text-white placeholder-slate-400 px-4 py-3.5 rounded-xl flex-grow focus:outline-none text-sm font-medium"
                />
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#02261E] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer shrink-0"
                >
                  Join Waitlist
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 backdrop-blur-2xl animate-float max-w-md mx-auto">
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="text-left">
                  <h4 className="font-semibold text-sm text-white">You're on the list!</h4>
                  <p className="text-xs text-slate-300">We've sent a priority welcome pass to {email}.</p>
                </div>
              </div>
            )}
          </div>

          {/* Trust points */}
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            No Credit Card Required <span className="mx-2">•</span> 50,000+ users <span className="mx-2">•</span> Cancel anytime
          </p>

        </ScrollFadeUp>
      </div>
    </section>
  );
}
