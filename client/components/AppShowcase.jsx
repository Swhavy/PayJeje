/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Check, Bell, Wifi, Battery, ArrowRight, Smartphone, Sparkles } from "lucide-react";
import ScrollFadeUp from "./ScrollFadeUp";

export default function AppShowcase() {
  const [activeEarn, setActiveEarn] = useState(false);

  return (
    <section id="app-showcase" className="py-24 bg-background border-b border-[#1d3a6a]/30 relative overflow-hidden">
      {/* Background radial glow specifically behind the phone */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#00c96e]/5 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left: CSS Smartphone Mockup */}
          <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
            <ScrollFadeUp className="relative w-full max-w-[320px]">
              
              {/* Outer Phone Frame */}
              <div className="relative mx-auto w-[310px] h-[620px] bg-background border-[8px] border-[#152c52] rounded-[42px] shadow-[0_30px_100px_rgba(0,201,110,0.15)] overflow-hidden flex flex-col justify-between">
                
                {/* Dynamic Island Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-between px-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#152c52]/80" />
                  <div className="w-8 h-1 bg-[#152c52]/80 rounded-full" />
                </div>

                {/* Simulated Screen Content */}
                <div className="flex-grow pt-10 pb-4 px-4 bg-background flex flex-col justify-between select-none font-sans overflow-y-auto no-scrollbar">
                  
                  {/* Status Bar */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#7a9cc8] px-2 mb-4">
                    <span>10:23 AM</span>
                    <div className="flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5 text-[#00c96e]" />
                      <div className="flex items-center gap-0.5">
                        <span className="text-[9px]">LTE</span>
                        <Battery className="w-4 h-4 text-[#7a9cc8]" />
                      </div>
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="flex justify-between items-center px-2 mb-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md bg-[#00c96e] flex items-center justify-center font-display font-black text-xs text-[#060d1a]">P</div>
                      <span className="font-display font-bold text-sm tracking-tight">Paywaka</span>
                    </div>
                    <div className="relative">
                      <Bell className="w-4 h-4 text-[#7a9cc8] hover:text-[#00c96e] transition-colors" />
                      <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#ff5c6c] rounded-full" />
                    </div>
                  </div>

                  {/* Wallet Card Dashboard Container */}
                  <div className="rounded-2xl bg-gradient-to-br from-[#003d20] to-[#0f2040] border border-[#00c96e]/30 p-4 mb-4 shadow-lg shadow-[#060d1a]/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#00c96e]/5 rounded-full blur-xl pointer-events-none" />
                    <span className="text-[10px] font-bold tracking-widest text-[#7a9cc8] uppercase">Main Balance</span>
                    <div className="text-2xl font-black text-[#e8f0ff] mt-1 mb-2">₦48,200<span className="text-xs text-[#7a9cc8]">.50</span></div>
                    
                    <div className="flex justify-between items-center border-t border-[#1d3a6a]/40 pt-2 mt-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-[#7a9cc8]">WAKA POINTS</span>
                        <span className="font-mono text-xs font-extrabold text-[#00c96e]">1,240 pts</span>
                      </div>
                      <div className="text-[9px] text-[#00a8ff] font-semibold bg-[#00a8ff]/10 px-1.5 py-0.5 rounded border border-[#00a8ff]/20">≈ ₦1,240</div>
                    </div>
                  </div>

                  {/* Interactive Quick Earn Button */}
                  <button
                    onClick={() => setActiveEarn(!activeEarn)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00c96e] to-[#00a8ff] text-[#060d1a] font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#00c96e]/15 hover:scale-102 transition-all relative overflow-hidden cursor-pointer mb-4"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    {activeEarn ? "Earning Mode: Active! ✔" : "Trigger Quick Earn"}
                    <span className="absolute inset-y-0 w-8 bg-white/20 skew-x-12 animate-shimmer" />
                  </button>

                  {/* Bill Categories Grid */}
                  <div className="mb-4">
                    <span className="text-[10px] font-bold tracking-wider text-[#3d5a80] uppercase block px-1 mb-2">Pay & Earn Rewards</span>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-xl bg-[#0f2040]/50 border border-[#1d3a6a]/40 flex flex-col items-center justify-center gap-1 group cursor-pointer hover:border-[#00c96e]/30">
                        <div className="w-7 h-7 rounded-lg bg-[#00c96e]/10 flex items-center justify-center text-[#00c96e] text-xs">⚡</div>
                        <span className="text-[8px] font-bold text-[#7a9cc8]">Power</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0f2040]/50 border border-[#1d3a6a]/40 flex flex-col items-center justify-center gap-1 group cursor-pointer hover:border-[#00c96e]/30">
                        <div className="w-7 h-7 rounded-lg bg-[#00a8ff]/10 flex items-center justify-center text-[#00a8ff] text-xs">📱</div>
                        <span className="text-[8px] font-bold text-[#7a9cc8]">Airtime</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0f2040]/50 border border-[#1d3a6a]/40 flex flex-col items-center justify-center gap-1 group cursor-pointer hover:border-[#00c96e]/30">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 text-xs">📺</div>
                        <span className="text-[8px] font-bold text-[#7a9cc8]">Cable</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0f2040]/50 border border-[#1d3a6a]/40 flex flex-col items-center justify-center gap-1 group cursor-pointer hover:border-[#00c96e]/30">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 text-xs">🌐</div>
                        <span className="text-[8px] font-bold text-[#7a9cc8]">Data</span>
                      </div>
                    </div>
                  </div>

                  {/* Transaction History Mockup */}
                  <div>
                    <div className="flex justify-between items-center px-1 mb-2">
                      <span className="text-[10px] font-bold tracking-wider text-[#3d5a80] uppercase">Recent Activity</span>
                      <span className="text-[8px] text-[#00c96e] font-semibold cursor-pointer">View All</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="p-2.5 rounded-xl bg-[#152c52]/30 border border-[#1d3a6a]/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-[#003d20] flex items-center justify-center text-[10px]">⚡</div>
                          <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-[#e8f0ff]">Ikeja Electric</span>
                            <span className="text-[8px] text-[#7a9cc8]">Bill Payment</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-[#ff5c6c]">-₦15,000</span>
                          <span className="text-[8px] font-mono text-[#00c96e] font-bold">+225 pts</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#152c52]/30 border border-[#1d3a6a]/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-[#003d20] flex items-center justify-center text-[10px]">👥</div>
                          <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-[#e8f0ff]">Adaeze O.</span>
                            <span className="text-[8px] text-[#7a9cc8]">Referral Credit</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-[#00c96e]">+₦500</span>
                          <span className="text-[8px] font-mono text-[#00c96e] font-bold">+50 pts</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Home Indicator */}
                <div className="w-full h-5 bg-background flex items-center justify-center pb-2">
                  <div className="w-24 h-1 bg-[#152c52] rounded-full" />
                </div>
              </div>

              {/* Float Decorative Ring Behind Smartphone */}
              <div className="absolute inset-x-0 -bottom-10 h-20 bg-gradient-to-t from-[#060d1a] to-transparent z-20 pointer-events-none" />
            </ScrollFadeUp>
          </div>

          {/* Right: Feature bullet list */}
          <div className="lg:col-span-7 flex flex-col justify-center order-1 lg:order-2 text-left">
            <ScrollFadeUp>
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#003d20]/50 border border-[#00c96e]/30 text-xs font-bold tracking-wider text-[#00c96e] uppercase mb-4">
                <Smartphone className="w-3.5 h-3.5" /> SMARTPHONE FIRST EXPERIENCE
              </div>
              <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight text-[#e8f0ff] mb-6">
                Your personal ATM <br />
                <span className="text-[#00c96e]">inside your pocket.</span>
              </h2>
              <p className="text-[#7a9cc8] text-base leading-relaxed mb-8">
                Ditch outdated apps that charge you for doing them a favor. PayWaka turns utility operations into cash-flowing events.
              </p>

              {/* Custom Bullet List */}
              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#00c96e]/10 border border-[#00c96e]/40 flex items-center justify-center text-[#00c96e] shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#e8f0ff] text-base">Direct Cash Withdrawals</h4>
                    <p className="text-[#7a9cc8] text-sm mt-0.5">Convert your earned points directly back into Naira and withdraw instantly to any Nigerian commercial bank account with zero delay.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#00c96e]/10 border border-[#00c96e]/40 flex items-center justify-center text-[#00c96e] shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#e8f0ff] text-base">Automatic Cashback Triggers</h4>
                    <p className="text-[#7a9cc8] text-sm mt-0.5">No claim forms or point-counting rules. Points are settled immediately after bill receipts are approved automatically.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#00c96e]/10 border border-[#00c96e]/40 flex items-center justify-center text-[#00c96e] shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#e8f0ff] text-base">Local Payment Integrations</h4>
                    <p className="text-[#7a9cc8] text-sm mt-0.5">Optimized specifically for MTN, Airtel, Glo, DSTV, GOTV, and major Nigerian power distribution companies (IKEDC, EKEDC, AEDC, etc.).</p>
                  </div>
                </div>
              </div>

              {/* Secondary Action CTA */}
              <button 
                onClick={() => {
                  const element = document.getElementById("cta");
                  if (element) element.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-10 inline-flex items-center gap-2 font-bold text-sm text-[#00c96e] hover:text-[#00e87d] transition-all cursor-pointer group"
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
