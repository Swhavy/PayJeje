import React, { useState, useEffect } from "react";
import { Shield, Gift, Share2, Award, Zap } from "lucide-react";
import ScrollFadeUp from "./ScrollFadeUp";

export default function Features() {
  const [points, setPoints] = useState(1150);

  // Auto-incrementing points for "Earn While You Pay" card
  useEffect(() => {
    const timer = setInterval(() => {
      setPoints((prev) => {
        if (prev >= 1500) return 1100;
        return prev + 10;
      });
    }, 200);
    return () => clearInterval(timer);
  }, []);

  // 3D Tilt effect handlers
  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    
    // Calculate rotation angles
    const rotateX = -(y - yc) / 20; // limit degrees
    const rotateY = (x - xc) / 20;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    card.style.borderColor = "rgba(52, 211, 153, 0.45)";
    card.style.boxShadow = "0 25px 50px -12px rgba(16, 185, 129, 0.18)";
  };

  const handleMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)";
    card.style.borderColor = "rgba(255, 255, 255, 0.08)";
    card.style.boxShadow = "none";
  };

  return (
    <section id="features" className="py-24 bg-[#040806] relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-1/3 left-0 w-[500px] h-[500px] rounded-full bg-emerald-500/6 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-0 w-[500px] h-[500px] rounded-full bg-emerald-600/5 blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/25 text-xs font-bold tracking-wider text-emerald-400 uppercase mb-4 backdrop-blur-md">
            <Zap className="w-3 h-3 animate-pulse" /> WHAT WE OFFER
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight text-white mb-4">
            Everything you need, <br />
            <span className="text-emerald-400">nothing you don't.</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-xl">
            We built a streamlined transactional layer with rewarding mechanics to turn boring bills into instant earnings.
          </p>

          {/* Animated Gradient Accent Line */}
          <div className="w-40 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent mt-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-200 to-transparent animate-line-glow" />
          </div>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          
          {/* Card 1: Earn While You Pay (Large, spans 4 cols) */}
          <ScrollFadeUp className="md:col-span-4" delay={50}>
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="h-full p-6 sm:p-8 rounded-[24px] pw-glass-hero relative overflow-hidden transition-all duration-300 ease-out flex flex-col justify-between group"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 relative z-10">
                  <div className="pw-tile w-12 h-12 mb-5">
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-extrabold text-2xl text-white mb-3">
                    Earn While You Pay
                  </h3>
                  <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-md">
                    Every bill payment earns you active points. Watch your points stack up in real-time, then cash them out or use them for future discounts.
                  </p>
                </div>

                {/* Editorial Human Lifestyle Image Framed in Frosted Bezel */}
                <div className="lg:col-span-5">
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] shadow-xl">
                    <img
                      src="/landing/lifestyle-bills.jpg"
                      alt="Friends paying everyday bills effortlessly with PayWaka"
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#040806]/75 via-transparent to-transparent pointer-events-none" />
                    <span className="absolute bottom-2.5 left-3 px-2.5 py-0.5 rounded-full bg-[#060E0A]/80 backdrop-blur-md border border-emerald-400/25 text-[10px] font-bold text-emerald-300">
                      Instant Cashback Loop
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Points Visualization */}
              <div className="mt-6 relative h-28 pw-panel flex items-center justify-between px-6 sm:px-8 overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-2/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
                
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-1">YOUR WAKA POINTS</span>
                  <span className="font-sans tabular-nums text-3xl font-extrabold text-emerald-400 tracking-tight transition-all">
                    {points.toLocaleString()} <span className="text-xs text-slate-400">pts</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-full bg-emerald-500/12 border border-emerald-400/30 text-xs font-bold text-emerald-300 animate-pulse">
                    +10 PTS EARNED
                  </div>
                </div>
              </div>
            </div>
          </ScrollFadeUp>

          {/* Card 2: Instant Bill Payments */}
          <ScrollFadeUp className="md:col-span-2" delay={150}>
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="h-full p-7 sm:p-8 rounded-[24px] pw-card relative overflow-hidden transition-all duration-300 ease-out flex flex-col justify-between"
            >
              <div>
                <div className="pw-tile w-12 h-12 mb-6">
                  <div className="animate-bounce">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-display font-extrabold text-2xl text-white mb-3">
                  Instant Bills
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Fast, zero-fee utility payments, internet, DSTV, and airtime top-ups in just one click. No convenience fee, ever.
                </p>
              </div>

              <div className="mt-8 flex gap-2 overflow-hidden justify-center py-2.5 pw-panel">
                <span className="text-[10px] font-mono text-emerald-300 tracking-tight animate-pulse px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/20">
                  ⚡ ZERO_FEE_PIPELINE
                </span>
              </div>
            </div>
          </ScrollFadeUp>

          {/* Card 3: Secure Transactions */}
          <ScrollFadeUp className="md:col-span-2" delay={100}>
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="h-full p-7 sm:p-8 rounded-[24px] pw-card relative overflow-hidden transition-all duration-300 ease-out flex flex-col justify-between"
            >
              <div>
                <div className="pw-tile w-12 h-12 mb-6 relative">
                  <div className="absolute inset-0 rounded-xl border border-dashed border-emerald-400/35 animate-rotate-slow" />
                  <Shield className="w-5 h-5 relative z-10" />
                </div>
                <h3 className="font-display font-extrabold text-2xl text-white mb-3">
                  Secured
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Bank-grade encryptions, 2FA, and CBN-compliant licensing protect your money on every transaction, leaving nothing to chance.
                </p>
              </div>

              <div className="mt-8 py-2.5 px-3 pw-panel flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono text-[9px] text-slate-300 tracking-widest uppercase">PCI-DSS COMPLIANT</span>
              </div>
            </div>
          </ScrollFadeUp>

          {/* Card 4: Gift Card Rewards */}
          <ScrollFadeUp className="md:col-span-2" delay={200}>
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="h-full p-7 sm:p-8 rounded-[24px] pw-card relative overflow-hidden transition-all duration-300 ease-out flex flex-col justify-between"
            >
              <div>
                <div className="pw-tile-gold w-12 h-12 mb-6">
                  <Gift className="w-5 h-5" />
                </div>
                <h4 className="font-display font-extrabold text-2xl text-white mb-3">
                  Gift Rewards
                </h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Redeem points for premium global gift cards (Amazon, Netflix, Spotify) or fuel vouchers at local filling stations.
                </p>
              </div>

              {/* Shimmering virtual gift card mockup */}
              <div className="mt-8 relative h-20 bg-gradient-to-r from-amber-500/12 to-emerald-500/12 rounded-xl border border-amber-400/25 overflow-hidden flex flex-col justify-between p-3 backdrop-blur-md">
                <div className="absolute inset-y-0 w-8 bg-white/10 skew-x-12 animate-shimmer" />
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-amber-400 uppercase">WAKA CARD</span>
                  <span className="text-[10px] font-bold text-amber-400 tabular-nums">₦10,000</span>
                </div>
                <div className="font-mono text-[8px] text-amber-300/75 text-left">•••• •••• •••• 9924</div>
              </div>
            </div>
          </ScrollFadeUp>

          {/* Card 5: Refer & Earn */}
          <ScrollFadeUp className="md:col-span-2" delay={250}>
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="h-full p-7 sm:p-8 rounded-[24px] pw-card relative overflow-hidden transition-all duration-300 ease-out flex flex-col justify-between"
            >
              <div>
                <div className="pw-tile w-12 h-12 mb-6">
                  <Share2 className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="font-display font-extrabold text-2xl text-white mb-3">
                  Refer & Earn
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Share the love. Get ₦500 bonus cashback when your referee makes their first bill payment. Passive income, unlocked.
                </p>
              </div>

              {/* Referral Network Connection Animation */}
              <div className="mt-8 relative h-20 pw-panel overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full px-4" viewBox="0 0 200 60">
                  <g className="stroke-emerald-400/25 stroke-1" strokeDasharray="3 3">
                    <line x1="20" y1="30" x2="100" y2="30" />
                    <line x1="100" y1="30" x2="180" y2="15" />
                    <line x1="100" y1="30" x2="180" y2="45" />
                  </g>
                  <circle cx="20" cy="30" r="3" fill="#34D399" className="animate-ping" />
                  <circle cx="100" cy="30" r="5" fill="#10B981" />
                  <circle cx="180" cy="15" r="3" fill="#34D399" />
                  <circle cx="180" cy="45" r="3" fill="#34D399" />
                  <path d="M 20 30 Q 60 30 100 30 T 180 15" fill="none" stroke="#34D399" strokeWidth="1.5" strokeDasharray="10 100" strokeDashoffset="0" className="animate-shimmer" />
                </svg>
              </div>
            </div>
          </ScrollFadeUp>

        </div>

      </div>
    </section>
  );
}
