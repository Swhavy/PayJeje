/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Check,
  Bell,
  Wifi,
  Battery,
  ArrowRight,
  Smartphone,
  Sparkles,
  Zap,
  Tv,
  Users,
  Wallet,
} from "lucide-react";
import ScrollFadeUp from "./ScrollFadeUp";

export default function AppShowcase() {
  const [activeEarn, setActiveEarn] = useState(false);

  return (
    <section id="app-showcase" className="py-24 bg-[#040806] border-b border-white/[0.07] relative overflow-hidden">
      {/* Background radial glow specifically behind the phone */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-emerald-500/8 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">
          
          {/* Left: CSS Smartphone Mockup + Floating Entrepreneur Glass Vignette */}
          <div className="lg:col-span-5 flex flex-col sm:block items-center relative order-2 lg:order-1">
            <ScrollFadeUp className="relative w-full max-w-[330px] mx-auto">
              
              {/* Outer Phone Frame */}
              <div className="relative mx-auto w-[306px] h-[612px] bg-[#040806] border-[8px] border-[#111C17] rounded-[42px] shadow-[0_32px_90px_-20px_rgba(16,185,129,0.28)] overflow-hidden flex flex-col justify-between">
                
                {/* Dynamic Island Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-between px-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-950" />
                  <div className="w-8 h-1 bg-white/15 rounded-full" />
                </div>

                {/* Simulated Screen Content */}
                <div className="flex-grow pt-10 pb-4 px-4 bg-[#040806] flex flex-col justify-between select-none font-sans overflow-y-auto no-scrollbar">
                  
                  {/* Status Bar */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-2 mb-3">
                    <span>10:23 AM</span>
                    <div className="flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                      <div className="flex items-center gap-0.5">
                        <span className="text-[9px]">LTE</span>
                        <Battery className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="flex justify-between items-center px-1 mb-3">
                    <div className="flex items-center gap-2">
                      <img src="/logo.png" alt="PayWaka" className="w-7 h-7 object-contain shrink-0" />
                      <span className="font-display font-extrabold text-sm tracking-tight text-white">
                        Pay<span className="text-emerald-400">waka</span>
                      </span>
                    </div>
                    <div className="relative">
                      <Bell className="w-4 h-4 text-slate-400" />
                      <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-rose-400 rounded-full" />
                    </div>
                  </div>

                  {/* Lush Satin Emerald Hero Card (matching Dashboard & Reference 2) */}
                  <div className="pw-wallet-hero-card p-4 mb-3.5">
                    <div className="relative z-10 flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-bold tracking-[0.12em] text-white/85 uppercase">
                          WALLET BALANCE
                        </span>
                        <div className="text-2xl font-extrabold text-white mt-0.5 tabular-nums">
                          ₦48,200.50
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white">
                        <Wallet className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="relative z-10 flex justify-between items-center border-t border-white/20 pt-2.5 mt-2.5">
                      <div>
                        <span className="text-[8px] font-bold tracking-wider text-white/80 block">WAKA POINTS</span>
                        <span className="text-xs font-extrabold text-white tabular-nums">1,240 pts</span>
                      </div>
                      <span className="text-[9px] font-bold bg-white text-[#046C4E] px-2.5 py-1 rounded-full shadow-sm">
                        + Top Up
                      </span>
                    </div>
                  </div>

                  {/* Interactive Quick Earn Button */}
                  <button
                    onClick={() => setActiveEarn(!activeEarn)}
                    className="w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-500/25 transition-all cursor-pointer mb-3.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    {activeEarn ? "Earning Mode: Active" : "Trigger Quick Earn"}
                  </button>

                  {/* Bill Categories Grid */}
                  <div className="mb-3.5">
                    <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block px-1 mb-2">
                      Pay &amp; Earn Rewards
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Power", Icon: Zap, cls: "pw-tile" },
                        { label: "Airtime", Icon: Smartphone, cls: "pw-tile-neutral" },
                        { label: "Cable", Icon: Tv, cls: "pw-tile-gold" },
                        { label: "Data", Icon: Wifi, cls: "pw-tile" },
                      ].map((svc) => (
                        <div
                          key={svc.label}
                          className="p-2 rounded-xl pw-panel flex flex-col items-center justify-center gap-1"
                        >
                          <div className={`w-7 h-7 ${svc.cls}`}>
                            <svc.Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[8px] font-bold text-slate-300">{svc.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transaction History Mockup */}
                  <div>
                    <div className="flex justify-between items-center px-1 mb-2">
                      <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                        Recent Activity
                      </span>
                      <span className="text-[8px] text-emerald-400 font-semibold">View All</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="p-2.5 rounded-xl pw-panel flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 pw-tile">
                            <Zap className="w-3 h-3" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-white">Ikeja Electric</span>
                            <span className="text-[8px] text-slate-400">Bill Payment</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end tabular-nums">
                          <span className="text-[10px] font-bold text-rose-400">-₦15,000</span>
                          <span className="text-[8px] font-bold text-emerald-400">+225 pts</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl pw-panel flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 pw-tile">
                            <Users className="w-3 h-3" />
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-white">Adaeze O.</span>
                            <span className="text-[8px] text-slate-400">Referral Credit</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end tabular-nums">
                          <span className="text-[10px] font-bold text-emerald-400">+₦500</span>
                          <span className="text-[8px] font-bold text-emerald-400">+50 pts</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Home Indicator */}
                <div className="w-full h-5 bg-[#040806] flex items-center justify-center pb-2">
                  <div className="w-24 h-1 bg-white/15 rounded-full" />
                </div>
              </div>

              {/* Floating Editorial Lifestyle Card (Desktop/Tablet) */}
              <div className="hidden sm:block absolute -bottom-5 -right-8 w-44 rounded-2xl overflow-hidden border border-white/15 bg-[#07110C]/85 backdrop-blur-2xl p-1.5 shadow-[0_24px_56px_-12px_rgba(0,0,0,0.85)] z-20">
                <div className="relative aspect-[4/5] rounded-xl overflow-hidden">
                  <img
                    src="/landing/showcase-entrepreneur.jpg"
                    alt="Nigerian entrepreneur managing instant PayWaka payments on his phone"
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#040806]/90 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-2 inset-x-2.5 text-left">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 block">
                      Zero Convenience Fee
                    </span>
                    <span className="text-[11px] font-bold text-white">
                      Built for creators
                    </span>
                  </div>
                </div>
              </div>
            </ScrollFadeUp>

            {/* Mobile Portrait Pill Card */}
            <div className="sm:hidden mt-5 pw-glass-hero p-2.5 flex items-center gap-3 w-full max-w-[306px]">
              <img
                src="/landing/showcase-entrepreneur.jpg"
                alt="Nigerian entrepreneur using PayWaka"
                className="w-12 h-12 rounded-xl object-cover object-top shrink-0"
              />
              <div className="text-left min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Built for Creators
                </span>
                <p className="text-xs font-semibold text-white truncate">
                  Zero convenience fees on utilities
                </p>
              </div>
            </div>
          </div>

          {/* Right: Feature bullet list */}
          <div className="lg:col-span-7 flex flex-col justify-center order-1 lg:order-2 text-left">
            <ScrollFadeUp>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/25 text-xs font-bold tracking-wider text-emerald-400 uppercase mb-4">
                <Smartphone className="w-3.5 h-3.5" /> SMARTPHONE FIRST EXPERIENCE
              </div>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight text-white mb-6">
                Your personal ATM <br />
                <span className="text-emerald-400">inside your pocket.</span>
              </h2>
              <p className="text-slate-400 text-base leading-relaxed mb-8">
                Ditch outdated apps that charge you for doing them a favor. PayWaka turns utility operations into cash-flowing events.
              </p>

              {/* Custom Bullet List */}
              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-4">
                  <div className="pw-tile w-7 h-7 rounded-full shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Direct Cash Withdrawals</h4>
                    <p className="text-slate-400 text-sm mt-0.5">Convert your earned points directly back into Naira and withdraw instantly to any Nigerian commercial bank account with zero delay.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="pw-tile w-7 h-7 rounded-full shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Automatic Cashback Triggers</h4>
                    <p className="text-slate-400 text-sm mt-0.5">No claim forms or point-counting rules. Points are settled immediately after bill receipts are approved automatically.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="pw-tile w-7 h-7 rounded-full shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Local Payment Integrations</h4>
                    <p className="text-slate-400 text-sm mt-0.5">Optimized specifically for MTN, Airtel, Glo, DSTV, GOTV, and major Nigerian power distribution companies (IKEDC, EKEDC, AEDC, etc.).</p>
                  </div>
                </div>
              </div>

              {/* Secondary Action CTA */}
              <button 
                onClick={() => {
                  const element = document.getElementById("cta");
                  if (element) element.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-10 inline-flex items-center gap-2 font-bold text-sm text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer group"
              >
                Scan to download the Android APK 
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
              </button>
            </ScrollFadeUp>
          </div>

        </div>
      </div>
    </section>
  );
}
