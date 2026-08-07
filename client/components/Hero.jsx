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
      size: `${Math.random() * 5 + 3}px`,
      delay: `${Math.random() * 8}s`,
      duration: `${Math.random() * 15 + 15}s`,
      color: Math.random() > 0.5 ? "bg-[#00c96e]" : "bg-[#00a8ff]",
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
    <section className="relative min-h-screen bg-gradient-hero flex flex-col justify-center overflow-hidden pt-28 pb-16">
      {/* Floating Particle Field */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`particle absolute opacity-40 ${p.color}`}
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

      {/* Behind-Text Radial Glow (Breathing) */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#00c96e]/10 blur-[120px] pointer-events-none animate-breathe" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#00a8ff]/10 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 w-full relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-grow">
        {/* Left Column: Core Content */}
        <div className="lg:col-span-7 flex flex-col justify-center text-left">
          {/* Join Badge */}
          <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-[#152c52]/60 border border-[#1d3a6a]/70 text-xs font-semibold tracking-wide text-[#e8f0ff] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#00c96e] animate-pulse" />
            <span className="text-[#00c96e]">✦</span> Join 50,000+ users earning daily
          </div>

          {/* Heading */}
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl xl:text-7xl tracking-tight leading-[1.08] text-[#e8f0ff] mb-6">
            Earn Money <br />
            <span 
              className="text-[#00c96e] relative inline-block drop-shadow-[0_0_40px_rgba(0,201,110,0.35)]"
              style={{ textShadow: "0 0 60px rgba(0,201,110,0.4)" }}
            >
              While You Pay Bills
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-[#7a9cc8] text-base sm:text-lg md:text-xl leading-relaxed max-w-xl mb-8">
            Complete simple tasks, earn points, and use them to pay your bills, buy airtime, or convert directly to cash. It's that simple.
          </p>

          {/* Interactive Form with Glassmorphism */}
          <div className="max-w-md w-full mb-8">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl bg-[#0f2040]/70 backdrop-blur-md border border-[#1d3a6a]/60 shadow-2xl focus-within:border-[#00c96e]/50 transition-all duration-300">
                <input
                  type="email"
                  required
                  placeholder="Enter your phone number or email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent text-[#e8f0ff] placeholder-[#3d5a80] px-4 py-3 rounded-xl flex-grow focus:outline-none text-sm font-medium"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#00c96e] hover:bg-[#00e87d] text-[#060d1a] font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#00c96e]/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#003d20]/50 border border-[#00c96e]/30 backdrop-blur-md animate-float">
                <CheckCircle className="w-6 h-6 text-[#00c96e] shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm text-[#e8f0ff]">Welcome to the family!</h4>
                  <p className="text-xs text-[#7a9cc8]">We've sent a link to {email} to unlock your bonus.</p>
                </div>
              </div>
            )}
          </div>

          {/* Trust Stars Row */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border border-[#0a1628] bg-amber-500 font-extrabold text-[10px] flex items-center justify-center text-[#060d1a]">A</div>
              <div className="w-8 h-8 rounded-full border border-[#0a1628] bg-[#00a8ff] font-extrabold text-[10px] flex items-center justify-center text-[#060d1a]">B</div>
              <div className="w-8 h-8 rounded-full border border-[#0a1628] bg-[#00c96e] font-extrabold text-[10px] flex items-center justify-center text-[#060d1a]">C</div>
              <div className="w-8 h-8 rounded-full border border-[#0a1628] bg-rose-500 font-extrabold text-[10px] flex items-center justify-center text-[#060d1a]">D</div>
            </div>
            <div className="text-sm">
              <div className="flex items-center gap-1 mb-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#f5a623] stroke-none" />
                ))}
                <span className="font-semibold text-[#e8f0ff] ml-1">4.8★</span>
              </div>
              <p className="text-xs text-[#7a9cc8]">Trusted by 50,000+ Nigerians nationwide</p>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Spline 3D Orb */}
        <div className="lg:col-span-5 relative w-full h-[350px] sm:h-[450px] lg:h-[550px] flex items-center justify-center">
          {/* Subtle Backing Pulse Ring to prevent blank space if spline is loading */}
          <div className="absolute w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] rounded-full bg-gradient-to-tr from-[#00c96e]/10 to-[#00a8ff]/5 border border-[#00c96e]/20 blur-sm pointer-events-none flex items-center justify-center">
            <div className="w-[180px] h-[180px] sm:w-[240px] sm:h-[240px] rounded-full bg-[#060d1a]/80 border border-[#00a8ff]/10 flex items-center justify-center">
              <div className="w-[120px] h-[120px] rounded-full bg-[#00c96e]/5 blur-md animate-pulse-ring" />
            </div>
          </div>

          {/* Spline Custom Element */}
          <div className="w-full h-full relative z-10 transition-opacity duration-1000">
            <spline-viewer
              src="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
              className="w-full h-full object-cover"
              hint-loading="false"
            />
          </div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <button
        onClick={handleScrollDown}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-xs font-semibold tracking-widest text-[#7a9cc8] hover:text-[#00c96e] transition-all duration-300 cursor-pointer z-20 group"
      >
        <span>SCROLL TO EXPLORE</span>
        <ChevronDown className="w-5 h-5 text-[#00c96e] animate-bounce group-hover:translate-y-1 transition-transform" />
      </button>
    </section>
  );
}
