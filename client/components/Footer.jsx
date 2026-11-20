import React from "react";
import { Facebook, Instagram, Send, Twitter, Shield, Heart } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#040806] border-t border-white/[0.07] pt-20 pb-8 relative overflow-hidden">
      {/* Subtle bottom-right green light glow */}
      <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-[#10B981]/[0.05] blur-[90px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8 mb-16">
          
          {/* Logo & Tagline column */}
          <div className="lg:col-span-2 flex flex-col items-start text-left">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-3 mb-6 group cursor-pointer"
            >
              <div className="w-9 h-9 bg-[#10B981] rounded-xl flex items-center justify-center font-display font-extrabold text-xl text-[#02261E] shadow-lg shadow-emerald-500/20">
                P
              </div>
              <span className="font-display font-black text-xl tracking-tight text-white">
                Pay<span className="text-emerald-400">waka</span>
              </span>
            </button>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6">
              Nigeria's premiere financial super app. Earn high-yield points, settle electricity, DSTV, and airtime with absolute convenience and zero extra charge.
            </p>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-emerald-400/20 text-xs font-semibold text-emerald-400 backdrop-blur-xl">
              <Shield className="w-3.5 h-3.5" /> Licensed by CBN & NDIC Insured
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="text-left">
            <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-6">Product</h4>
            <ul className="flex flex-col gap-3.5">
              <li><a href="#features" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">Bill Payments</a></li>
              <li><a href="#features" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">Waka Rewards</a></li>
              <li><a href="#app-showcase" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">Mobile App</a></li>
              <li><a href="#pricing" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">Subscription Tier</a></li>
            </ul>
          </div>

          {/* Column 2: Company */}
          <div className="text-left">
            <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-6">Company</h4>
            <ul className="flex flex-col gap-3.5">
              <li><a href="#" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">About Us</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">Careers</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">Press Kit</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">Trust & Safety</a></li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div className="text-left">
            <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-6">Legal</h4>
            <ul className="flex flex-col gap-3.5">
              <li><a href="#" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">Cookies Settings</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">NDPR Compliance</a></li>
            </ul>
          </div>

          {/* Column 4: Connect */}
          <div className="text-left">
            <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-6">Connect</h4>
            <ul className="flex flex-col gap-3.5">
              <li><a href="mailto:support@paywaka.com" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">support@paywaka.com</a></li>
              <li><span className="text-sm text-slate-400">+234 (0) 1 450 9924</span></li>
              <li><span className="text-sm text-slate-400">Lagos, Nigeria</span></li>
            </ul>
          </div>

        </div>

        <hr className="border-white/[0.08] mb-8" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span>© {currentYear} PayWaka Technologies Limited. All rights reserved.</span>
          </div>

          {/* Made with love in Nigeria */}
          <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.07]">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 animate-pulse" />
            <span>in Nigeria</span>
          </div>

          {/* Social Icons with custom glowing hover properties */}
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-emerald-400 hover:border-emerald-400/35 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all cursor-pointer"
              aria-label="Follow us on Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-emerald-400 hover:border-emerald-400/35 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all cursor-pointer"
              aria-label="Follow us on Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-emerald-400 hover:border-emerald-400/35 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all cursor-pointer"
              aria-label="Follow us on Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-emerald-400 hover:border-emerald-400/35 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all cursor-pointer"
              aria-label="Join our Telegram community"
            >
              <Send className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
