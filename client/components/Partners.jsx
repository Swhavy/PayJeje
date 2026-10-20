import React from "react";
import { PARTNERS } from "./data";

// Beautiful SVG logo representations for the payment partners to look incredibly professional
const getPartnerLogo = (name) => {
  switch (name) {
    case "Visa":
      return (
        <svg
          className="h-6 w-auto fill-current"
          viewBox="0 0 100 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M38.1 3.5l-6.2 16.5-1.5-7.5C29.6 8.5 25.5 4.3 20.8 4l.1-.2h10.4c1.3 0 2.4.9 2.7 2.1l2.3 12.1L42.5 3.5h6.2l-9.2 24.5H33.3L25.1 7.1c-.2-.7-.7-1.3-1.4-1.6-1.9-.9-4.2-1.7-6.5-2L17 3h10.5c1.3 0 2.5.9 2.7 2.2l1.6 8.4 6.3-13.6h6.2zM80.9 3.5c-1.3 0-2.4.8-2.9 2L71.3 21 68.6 7.4c-.2-1.2-1.2-2.1-2.4-2.1H56.5L56 5.5c1.9.9 4.1 1.6 6.3 2.1l6.1 20.4h6.3l8.6-20.4c.5-1.1 1.5-1.7 2.7-1.7h3.8l.1-.3h-9.1zm-13.4 0H51.2l-5.3 24.5h6.3l5.3-24.5zm-33.1 8c-1.8-1-4.2-1.6-6.6-1.6-6.6 0-11.2 3.5-11.2 8.5 0 3.7 3.3 5.8 5.8 7 2.6 1.2 3.5 2 3.5 3.1 0 1.7-2.1 2.5-4 2.5-3.3 0-5.2-.8-6.7-1.5l-.9-.4-.7 4.3c1.2.6 3.4 1.1 5.7 1.1 6.6 0 10.9-3.2 10.9-8.3 0-2.8-1.7-4.9-5.5-6.7-2.3-1.2-3.1-2-3.1-2.9 0-1 .9-2 2.9-2 2 0 3.5.4 4.6.9l.6.3.7-4.3z" />
        </svg>
      );
    case "Mastercard":
      return (
        <svg
          className="h-7 w-auto fill-current"
          viewBox="0 0 100 60"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="35" cy="30" r="25" fillOpacity="0.8" />
          <circle cx="65" cy="30" r="25" fillOpacity="0.8" />
          <path d="M50 11a24.9 24.9 0 0 1 0 38c3.5-5.2 5-11.7 5-19s-1.5-13.8-5-19z" />
        </svg>
      );
    case "MTN":
      return (
        <div className="flex items-center gap-1.5 font-sans font-black tracking-tighter text-lg bg-[#e8f0ff]/10 px-2.5 py-1 rounded-md border border-[#e8f0ff]/20">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          MTN
        </div>
      );
    case "Airtel":
      return (
        <div className="flex items-center gap-1 font-display font-extrabold tracking-tighter text-lg text-rose-500">
          <span className="text-[#e8f0ff]">air</span>tel
        </div>
      );
    case "Stripe":
      return (
        <svg
          className="h-6 w-auto fill-current"
          viewBox="0 0 100 41"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M44 19.3c0-3.3-1.8-5.3-5-5.3-3.4 0-5.4 2.2-5.4 5.3 0 3.6 2.1 5.3 5.3 5.3 3.2 0 5.1-1.8 5.1-5.3zm-14.7 0c0-5.8 4.2-10 10-10 6.1 0 10 3.9 10 10s-3.9 10-10 10c-5.8 0-10-4.1-10-10zm25.7-14h4.7v5.3h-4.7V5.3zm0 8.7h4.7v24.5h-4.7V14zm11 0h4.6v3.2c1.2-2.3 3.5-3.8 6.4-3.8 5.2 0 8 3.5 8 9.2v15.9h-4.6V23.1c0-3.6-1.5-5.3-4.4-5.3-2.6 0-4.8 2-4.8 5.3v14.9h-4.6V14zM24 18.5c0-2-1.3-3-3.2-3-2.3 0-3.5 1.1-3.5 3 0 3.3 8.3 2.1 8.3 8c0 3.7-3.1 5.8-7.3 5.8-3.1 0-5.8-.9-7.3-1.8l1.3-3.7c1.7 1 3.8 1.8 6 1.8 1.9 0 3-.9 3-2.1 0-3.4-8.3-2.1-8.3-8 0-3.8 3-5.7 7.7-5.7 2.6 0 4.8.7 6.1 1.4L24 18.5zm55 4.5c0-2.3-1.5-3.7-4-3.7-2.3 0-4.1 1.4-4.1 3.7h8.1zm-8.1 4c0 2.5 1.8 4 4.3 4 2 0 3.7-.8 4.6-1.6l1.3 3.3c-1.4 1.4-3.8 2.3-6.6 2.3-5.5 0-8.8-3.6-8.8-9.3 0-5.8 3.5-10 8.6-10 5.4 0 7.8 3.8 7.8 8.8v2.5H70.9z" />
        </svg>
      );
    case "Interswitch":
      return (
        <div className="flex items-center gap-2 font-display font-bold tracking-tight text-md">
          <svg
            className="w-5 h-5 fill-[#00c96e]"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2L2 22h20L12 2zm0 4l6.5 13H5.5L12 6z" />
          </svg>
          <span className="text-white">Interswitch</span>
        </div>
      );
    case "Flutterwave":
      return (
        <div className="flex items-center gap-1 font-sans font-black tracking-wider text-sm text-[#00a8ff]">
          flutter<span className="text-amber-500">wave</span>
        </div>
      );
    case "Paystack":
      return (
        <div className="flex items-center gap-1 font-display font-extrabold tracking-tight text-md text-[#00c96e]">
          pay<span className="text-white">stack</span>
        </div>
      );
    default:
      return <span className="font-semibold text-sm">{name}</span>;
  }
};

export default function Partners() {
  // Duplicate partners array to ensure continuous marquee loop without blank space
  const doubledPartners = [...PARTNERS, ...PARTNERS, ...PARTNERS];

  return (
    <section
      id="partners"
      className="bg-card border-y border-[#1d3a6a]/30 py-8 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 mb-4">
        <h3 className="text-center text-xs font-bold tracking-widest text-[#3d5a80]/80 uppercase">
          TRUSTED BY THESE NIGERIAN & GLOBAL INFRASTRUCTURE PARTNERS
        </h3>
      </div>

      {/* Marquee Outer Container with horizontal edge-fade overlay masks */}
      <div className="relative w-full overflow-hidden py-4">
        {/* Edge gradient mask overlay (desktop-only CSS style layer) */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0a1628] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0a1628] to-transparent z-10 pointer-events-none" />

        {/* Marquee Inner Track */}
        <div className="flex w-max items-center gap-16 animate-marquee hover:[animation-play-state:paused] cursor-pointer">
          {doubledPartners.map((partner, index) => (
            <div
              key={`${partner}-${index}`}
              className="text-[#e8f0ff]/40 hover:text-[#e8f0ff] transition-all duration-300 transform hover:scale-105 select-none flex items-center justify-center shrink-0"
              title={partner}
            >
              {getPartnerLogo(partner)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
