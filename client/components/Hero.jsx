import React, { useState, useEffect } from "react";
import { ArrowRight, Star, ChevronDown, CheckCircle } from "lucide-react";

export default function Hero() {
  const [particles, setParticles] = useState([]);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [splineLoaded, setSplineLoaded] = useState(false);

  useEffect(() => {
    // Generate random background drifting particles
    const generated = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 4 + 2}px`,
      delay: `${Math.random() * 8}s`,
      duration: `${Math.random() * 15 + 15}s`,
      color: i % 3 === 0 ? "bg-emerald-300" : "bg-emerald-500",
    }));
    setParticles(generated);

    // Simulate spline load
    const timer = setTimeout(() => {
      setSplineLoaded(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim() && email.includes("@")) {
      setIsSubmitted(true);
    }
  };

  const handleScrollDown = () => {
    const partnersSection = document.getElementById("partners");
    if (partnersSection) {
      partnersSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen bg-[#040806] flex flex-col justify-center overflow-hidden pt-28 pb-16">
      {/* Floating Particle Field */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`particle absolute opacity-35 ${p.color}`}
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              bottom: "-20px",
              animation: `drift ${p.duration} linear infinite`,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Obsidian-Emerald Radial Atmospheric Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-emerald-500/12 blur-[130px] pointer-events-none animate-breathe" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[480px] h-[480px] rounded-full bg-emerald-600/10 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 w-full relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-grow">
        {/* Left Column: Core Content */}
        <div className="lg:col-span-7 flex flex-col justify-center text-left">
          {/* Join Badge (Frosted Glass) */}
          <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-white/[0.05] backdrop-blur-xl border border-emerald-400/25 text-xs font-semibold tracking-wide text-slate-100 mb-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400">✦</span> Join 50,000+ users earning daily
          </div>

          {/* Heading */}
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl xl:text-7xl tracking-tight leading-[1.06] text-white mb-6">
            Earn Money <br />
            <span
              className="text-emerald-400 relative inline-block drop-shadow-[0_0_40px_rgba(16,185,129,0.35)]"
            >
              While You Pay Bills
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-slate-300 text-base sm:text-lg md:text-xl leading-relaxed max-w-xl mb-8">
            Complete simple tasks, earn points, and use them to pay your bills, buy airtime, or convert directly to cash. It's that simple.
          </p>

          {/* Interactive Form with Obsidian Glassmorphism */}
          <div className="max-w-lg w-full mb-8">
            {!isSubmitted ? (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.10] shadow-[0_24px_56px_-18px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] focus-within:border-emerald-400/50 transition-all duration-300"
              >
                <input
                  type="email"
                  required
                  placeholder="Phone number or email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent text-white placeholder-slate-400 px-4 py-3 rounded-xl flex-grow focus:outline-none text-sm font-medium"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#02261E] font-bold text-sm flex items-center justify-center gap-2 shadow-[0_12px_28px_-10px_rgba(16,185,129,0.55),inset_0_1px_0_rgba(255,255,255,0.28)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-400/30 backdrop-blur-xl animate-float">
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm text-white">Welcome to the family!</h4>
                  <p className="text-xs text-slate-300">We've sent a link to {email} to unlock your bonus.</p>
                </div>
              </div>
            )}
          </div>

          {/* Trust Stars Row — Real User Avatars */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex -space-x-2.5">
              {[
                { src: "/landing/avatar-1.jpg", alt: "PayWaka member Adaeze" },
                { src: "/landing/avatar-2.jpg", alt: "PayWaka member Tunde" },
                { src: "/landing/avatar-3.jpg", alt: "PayWaka member Chioma" },
                { src: "/landing/avatar-4.jpg", alt: "PayWaka member Emeka" },
              ].map((av) => (
                <img
                  key={av.src}
                  src={av.src}
                  alt={av.alt}
                  className="w-9 h-9 rounded-full object-cover object-top ring-2 ring-[#040806] border border-emerald-400/30"
                />
              ))}
            </div>
            <div className="text-sm">
              <div className="flex items-center gap-1 mb-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 stroke-none" />
                ))}
                <span className="font-semibold text-white ml-1">4.8★</span>
              </div>
              <p className="text-xs text-slate-400">Trusted by 50,000+ Nigerians nationwide</p>
            </div>
          </div>
        </div>

        {/* Right Column: Frosted Editorial Human Card over Interactive Spline 3D Depth Layer */}
        <div className="lg:col-span-5 relative w-full flex items-center justify-center py-4">
          {/* Ambient Spline / Ring Backdrop Layer */}
          <div className="absolute inset-0 pointer-events-none opacity-45 flex items-center justify-center overflow-hidden">
            <div className="w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-400/10 blur-2xl animate-pulse-ring" />
            <div className="absolute inset-0 opacity-60">
              <spline-viewer
                src="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
                className="w-full h-full object-cover"
                hint-loading="false"
              />
            </div>
          </div>

          {/* Editorial Frosted Glass Portrait Frame */}
          <div className="relative z-10 w-full max-w-[390px] mx-auto">
            <div className="rounded-[28px] overflow-hidden border border-white/15 bg-white/[0.04] backdrop-blur-2xl p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.16)]">
              <div className="relative aspect-[4/5] rounded-[22px] overflow-hidden">
                <img
                  src="/landing/hero-user.jpg"
                  alt="Nigerian PayWaka user paying bills effortlessly with her smartphone"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#040806]/90 via-transparent to-black/15 pointer-events-none" />

                {/* Floating Glass Telemetry Badge Top Right */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#060E0A]/75 backdrop-blur-xl border border-white/15 text-[11px] font-bold text-white shadow-lg absolute top-3.5 right-3.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Zero Fee · 0.8s</span>
                </div>

                {/* Floating Frosted Cashback Pill Bottom Left */}
                <div className="absolute bottom-3.5 inset-x-3.5 rounded-2xl bg-[#07110C]/80 backdrop-blur-2xl border border-emerald-400/25 px-4 py-3 flex items-center justify-between gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300 block">
                      Instant Reward
                    </span>
                    <span className="text-sm font-extrabold text-white tabular-nums">
                      +₦1,250 Cashback
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/35 text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider shrink-0">
                    Settled
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <button
        onClick={handleScrollDown}
        className="mt-8 sm:mt-0 sm:absolute sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 flex flex-col items-center gap-1.5 text-xs font-semibold tracking-widest text-slate-400 hover:text-emerald-400 transition-all duration-300 cursor-pointer z-20 group"
      >
        <span>SCROLL TO EXPLORE</span>
        <ChevronDown className="w-5 h-5 text-emerald-400 animate-bounce group-hover:translate-y-1 transition-transform" />
      </button>
    </section>
  );
}
