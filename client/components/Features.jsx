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
    card.style.borderColor = "rgba(0, 201, 110, 0.5)";
    card.style.boxShadow = "0 25px 50px -12px rgba(0, 201, 110, 0.15)";
  };

  const handleMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)";
    card.style.borderColor = "rgba(29, 58, 106, 0.35)";
    card.style.boxShadow = "none";
  };

  return (
    <section id="features" className="py-24 bg-[#060d1a] relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-1/3 left-0 w-[500px] h-[500px] rounded-full bg-[#00c96e]/2 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-0 w-[500px] h-[500px] rounded-full bg-[#00a8ff]/2 blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#003d20]/50 border border-[#00c96e]/30 text-xs font-bold tracking-wider text-[#00c96e] uppercase mb-4">
            <Zap className="w-3 h-3 animate-pulse" /> WHAT WE OFFER
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight text-[#e8f0ff] mb-4">
            Everything you need, <br />
            <span className="text-[#00c96e]">nothing you don't.</span>
          </h2>
          <p className="text-[#7a9cc8] text-base sm:text-lg leading-relaxed max-w-xl">
            We built a streamlined transactional layer with rewarding mechanics to turn boring bills into instant earnings.
          </p>

          {/* Animated Gradient Accent Line */}
          <div className="w-40 h-1 bg-gradient-to-r from-transparent via-[#00c96e] to-transparent mt-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00a8ff] to-transparent animate-line-glow" />
          </div>
        </div>

        {/* Asymmetric Bento Grid (Linear.app Style) */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          
          {/* Card 1: Earn While You Pay (Large, 2 cols width / spans 3 in 6-col grid) */}
          <ScrollFadeUp className="md:col-span-4" delay={50}>
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="h-full p-8 rounded-[24px] bg-gradient-to-br from-[#003d20] to-[#0a1628] border border-[#00c96e]/30 relative overflow-hidden transition-all duration-300 ease-out flex flex-col justify-between group hover:border-[#00c96e]/60 shadow-[0_0_20px_rgba(0,201,110,0.05)]"
            >
              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-radial-gradient from-[#00c96e]/5 to-transparent opacity-50 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#00c96e]/10 border border-[#00c96e]/30 flex items-center justify-center text-[#00c96e] mb-6 shadow-[0_0_15px_rgba(0,201,110,0.15)]">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="font-display font-extrabold text-2xl text-[#e8f0ff] mb-3">
                  Earn While You Pay
                </h3>
                <p className="text-[#7a9cc8] text-sm md:text-base leading-relaxed max-w-md">
                  Every bill payment earns you active points. Watch your points stack up in real-time, then cash them out or use them for future discounts.
                </p>
              </div>

              {/* Dynamic Points Visualization */}
              <div className="mt-8 relative h-32 bg-[#060d1a]/55 rounded-2xl border border-[#1d3a6a]/40 flex items-center justify-between px-8 overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
                <div className="absolute right-0 top-0 bottom-0 w-2/3 bg-gradient-to-l from-[#00c96e]/10 to-transparent pointer-events-none" />
                
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-wider text-[#3d5a80] uppercase mb-1">YOUR WAKA POINTS</span>
                  <span className="font-mono text-3xl font-black text-[#00c96e] tracking-tight transition-all drop-shadow-[0_0_10px_rgba(0,201,110,0.3)]">
                    {points.toLocaleString()} <span className="text-xs text-[#7a9cc8]">pts</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-[#00c96e]/10 border border-[#00c96e]/30 text-xs font-bold text-[#00c96e] animate-pulse shadow-[0_0_10px_rgba(0,201,110,0.1)]">
                    +10 PTS EARNED
                  </div>
                </div>
              </div>
            </div>
          </ScrollFadeUp>

          {/* Card 2: Instant Bill Payments (Medium, 1 col width / spans 2 in 6-col grid) */}
          <ScrollFadeUp className="md:col-span-2" delay={150}>
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="h-full p-8 rounded-[24px] bg-gradient-to-br from-[#0f2040] to-[#0a1628] border border-[#1d3a6a]/70 relative overflow-hidden transition-all duration-300 ease-out flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#00a8ff]/10 border border-[#00a8ff]/30 flex items-center justify-center text-[#00a8ff] mb-6">
                  {/* Lightning bolt with custom electric animation wrapper */}
                  <div className="animate-bounce">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-display font-extrabold text-2xl text-[#e8f0ff] mb-3">
                  Instant Bills
                </h3>
                <p className="text-[#7a9cc8] text-sm leading-relaxed">
                  Fast, zero-fee utility payments, internet, DSTV, and airtime top-ups in just one click. No convenience fee, ever.
                </p>
              </div>

              <div className="mt-8 flex gap-2 overflow-hidden justify-center py-2 bg-[#060d1a]/30 rounded-xl border border-[#1d3a6a]/20">
                <span className="text-[10px] font-mono text-[#00a8ff] tracking-tight animate-pulse px-2 py-0.5 rounded-md bg-[#00a8ff]/10 border border-[#00a8ff]/10">⚡ ZERO_FEE_PIPELINE</span>
              </div>
            </div>
          </ScrollFadeUp>

          {/* Card 3: Secure Transactions (Medium, spans 2 in 6-col) */}
          <ScrollFadeUp className="md:col-span-2" delay={100}>
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="h-full p-8 rounded-[24px] bg-gradient-to-br from-[#0f2040] to-[#0a1628] border border-[#1d3a6a]/70 relative overflow-hidden transition-all duration-300 ease-out flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#00c96e]/10 border border-[#00c96e]/30 flex items-center justify-center text-[#00c96e] mb-6 relative">
                  {/* Animated shield with rotating outer ring */}
                  <div className="absolute inset-0 rounded-xl border-2 border-dashed border-[#00c96e]/30 animate-rotate-slow" />
                  <svg className="w-5 h-5 fill-none stroke-current stroke-2 relative z-10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3 className="font-display font-extrabold text-2xl text-[#e8f0ff] mb-3">
                  Secured
                </h3>
                <p className="text-[#7a9cc8] text-sm leading-relaxed">
                  Bank-grade encryptions, 2FA, and CBN-compliant licensing protect your money on every transaction, leaving nothing to chance.
                </p>
              </div>

              <div className="mt-8 py-2 px-3 rounded-xl bg-[#060d1a]/40 border border-[#1d3a6a]/20 flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00c96e] animate-ping" />
                <span className="font-mono text-[9px] text-[#7a9cc8] tracking-widest uppercase">PCI-DSS COMPLIANT</span>
              </div>
            </div>
          </ScrollFadeUp>

          {/* Card 4: Gift Card Rewards (Medium, spans 2 in 6-col) */}
          <ScrollFadeUp className="md:col-span-2" delay={200}>
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="h-full p-8 rounded-[24px] bg-gradient-to-br from-[#0f2040] to-[#0a1628] border border-[#1d3a6a]/70 relative overflow-hidden transition-all duration-300 ease-out flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-6">
                  <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M12 22V7M12 7H2M12 7h10M12 7a3 3 0 0 1-3-3 3 3 0 0 1 3-3 3 3 0 0 1 3 3 3 3 0 0 1-3 3z" />
                  </svg>
                </div>
                <h4 className="font-display font-extrabold text-2xl text-[#e8f0ff] mb-3">
                  Gift Rewards
                </h4>
                <p className="text-[#7a9cc8] text-sm leading-relaxed">
                  Redeem points for premium global gift cards (Amazon, Netflix, Spotify) or fuel vouchers at local filling stations.
                </p>
              </div>

              {/* Shimmering virtual gift card mockup */}
              <div className="mt-8 relative h-20 bg-gradient-to-r from-amber-500/10 to-amber-600/20 rounded-xl border border-amber-500/20 overflow-hidden flex flex-col justify-between p-3">
                <div className="absolute inset-y-0 w-8 bg-white/10 skew-x-12 animate-shimmer" />
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-amber-500 uppercase">WAKA CARD</span>
                  <span className="text-[10px] font-bold text-amber-500">₦10,000</span>
                </div>
                <div className="font-mono text-[8px] text-amber-500/60 text-left">•••• •••• •••• 9924</div>
              </div>
            </div>
          </ScrollFadeUp>

          {/* Card 5: Refer & Earn (Large, spans 2 cols width / spans 2 in 6-col grid) */}
          <ScrollFadeUp className="md:col-span-2" delay={250}>
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="h-full p-8 rounded-[24px] bg-gradient-to-br from-[#0f2040] to-[#0a1628] border border-[#1d3a6a]/70 relative overflow-hidden transition-all duration-300 ease-out flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-500 mb-6">
                  <Share2 className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="font-display font-extrabold text-2xl text-[#e8f0ff] mb-3">
                  Refer & Earn
                </h3>
                <p className="text-[#7a9cc8] text-sm leading-relaxed">
                  Share the love. Get ₦500 bonus cashback when your referee makes their first bill payment. Passive income, unlocked.
                </p>
              </div>

              {/* Referral Network Connection Animation */}
              <div className="mt-8 relative h-20 bg-[#060d1a]/60 rounded-xl border border-[#1d3a6a]/30 overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full px-4" viewBox="0 0 200 60">
                  <g className="stroke-[#00c96e]/20 stroke-1" strokeDasharray="3 3">
                    <line x1="20" y1="30" x2="100" y2="30" />
                    <line x1="100" y1="30" x2="180" y2="15" />
                    <line x1="100" y1="30" x2="180" y2="45" />
                  </g>
                  {/* Glowing moving signals */}
                  <circle cx="20" cy="30" r="3" fill="#00c96e" className="animate-ping" />
                  <circle cx="100" cy="30" r="5" fill="#00a8ff" />
                  <circle cx="180" cy="15" r="3" fill="#00c96e" />
                  <circle cx="180" cy="45" r="3" fill="#00c96e" />

                  {/* Pulsing signal line dash animation overlay */}
                  <path d="M 20 30 Q 60 30 100 30 T 180 15" fill="none" stroke="#00c96e" strokeWidth="1.5" strokeDasharray="10 100" strokeDashoffset="0" className="animate-shimmer" />
                </svg>
              </div>
            </div>
          </ScrollFadeUp>

        </div>

      </div>
    </section>
  );
}
