import React, { useState } from "react";
import { Check } from "lucide-react";
import { PRICING_TIERS } from "./data";
import ScrollFadeUp from "./ScrollFadeUp";

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  // Calculates price based on toggle (20% discount if annual)
  const calculatePrice = (monthlyPrice) => {
    if (monthlyPrice === 0) return 0;
    if (isAnnual) {
      // 20% savings
      return Math.round(monthlyPrice * 0.8);
    }
    return monthlyPrice;
  };

  return (
    <section id="pricing" className="py-24 bg-background border-b border-[#1d3a6a]/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-[#00c96e]/2 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#003d20]/50 border border-[#00c96e]/30 text-xs font-bold tracking-wider text-[#00c96e] uppercase mb-4">
            PRICING OPTIONS
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight text-[#e8f0ff]">
            Fair, simple pricing. <br />
            <span className="text-[#00c96e]">No hidden surprises.</span>
          </h2>
          <p className="text-[#7a9cc8] text-sm sm:text-base leading-relaxed mt-4">
            Earn more rewards on your terms. Start with our free plan and upgrade anytime to double or triple your daily cashback points.
          </p>

          {/* Monthly / Annual Toggle switch */}
          <div className="flex items-center gap-4 mt-10 p-1.5 rounded-full bg-[#0f2040]/75 border border-[#1d3a6a]/50">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
                !isAnnual
                  ? "bg-[#00c96e] text-[#060d1a] shadow-md shadow-[#00c96e]/15"
                  : "text-[#7a9cc8] hover:text-[#e8f0ff]"
              }`}
            >
              Billed Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                isAnnual
                  ? "bg-[#00c96e] text-[#060d1a] shadow-md shadow-[#00c96e]/15"
                  : "text-[#7a9cc8] hover:text-[#e8f0ff]"
              }`}
            >
              Billed Annually
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide ${
                isAnnual ? "bg-background text-[#00c96e]" : "bg-[#00c96e]/10 text-[#00c96e]"
              }`}>
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PRICING_TIERS.map((tier, index) => {
            const displayPrice = calculatePrice(tier.monthlyPrice);
            return (
              <ScrollFadeUp
                key={tier.name}
                delay={index * 100}
                className="flex"
              >
                <div
                  className={`w-full p-8 rounded-[24px] backdrop-blur-md flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                    tier.isPopular
                      ? "bg-gradient-to-br from-[#0f2040] to-[#0a1628] border-2 border-[#00c96e] shadow-[0_20px_50px_rgba(0,201,110,0.15)] relative"
                      : "bg-gradient-to-br from-[#0f2040]/70 to-[#0a1628]/70 border border-[#1d3a6a]/70 hover:border-[#1d3a6a]"
                  }`}
                >
                  {/* "Most Popular" Banner Badge */}
                  {tier.isPopular && (
                    <span className="absolute top-0 right-8 -translate-y-1/2 px-4 py-1 rounded-full bg-[#00c96e] text-[#060d1a] text-[10px] font-black uppercase tracking-wider shadow-lg">
                      Most Popular
                    </span>
                  )}

                  {/* Top Portion: Title & Price */}
                  <div>
                    <h3 className="font-display font-extrabold text-xl text-[#e8f0ff] mb-2 text-left">
                      {tier.name}
                    </h3>
                    <p className="text-[#7a9cc8] text-xs leading-relaxed mb-6 text-left">
                      {tier.description}
                    </p>

                    <div className="flex items-baseline gap-1.5 mb-8 text-left">
                      <span className="font-display font-extrabold text-4xl sm:text-5xl text-[#e8f0ff]">
                        ₦{displayPrice.toLocaleString()}
                      </span>
                      <span className="text-[#7a9cc8] text-xs font-semibold uppercase tracking-wide">
                        / month
                      </span>
                    </div>

                    <hr className="border-[#1d3a6a]/30 mb-8" />

                    {/* Features checklist */}
                    <ul className="flex flex-col gap-4 text-left">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#00c96e]/10 border border-[#00c96e]/30 flex items-center justify-center text-[#00c96e] shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-[#e8f0ff]/95 text-xs sm:text-sm leading-tight">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Purchase Button CTA */}
                  <div className="mt-10">
                    <button
                      onClick={() => {
                        const ctaSection = document.getElementById("cta");
                        if (ctaSection) ctaSection.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer ${
                        tier.isPopular
                          ? "bg-[#00c96e] hover:bg-[#00e87d] text-[#060d1a] shadow-lg shadow-[#00c96e]/15"
                          : "bg-[#152c52] hover:bg-[#1d3a6a] border border-[#1d3a6a]/60 text-[#e8f0ff]"
                      }`}
                    >
                      {tier.monthlyPrice === 0 ? "Get Started Free" : "Subscribe Now"}
                    </button>
                    {isAnnual && tier.monthlyPrice > 0 && (
                      <p className="text-center text-[10px] text-[#00c96e] font-bold tracking-wide uppercase mt-3">
                        Billed annually (₦{(displayPrice * 12).toLocaleString()} / year)
                      </p>
                    )}
                  </div>

                </div>
              </ScrollFadeUp>
            );
          })}
        </div>

      </div>
    </section>
  );
}
