import React, { useState, useEffect } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";


export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();
  const pathLower = location.pathname.toLowerCase();
  const isAuthRoute = pathLower.startsWith("/auth/");
  const isLoginRoute = pathLower.startsWith("/auth/login");

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // height of navbar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        isAuthRoute
          ? "bg-background/80 backdrop-blur-2xl border-border/70 py-3"
          : scrolled
            ? "bg-[#040806]/80 backdrop-blur-2xl border-white/[0.08] py-3.5 shadow-[0_12px_36px_-12px_rgba(0,0,0,0.8)]"
            : "bg-transparent border-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        {isAuthRoute ? (
          <Link
            to="/"
            className="flex items-center gap-2.5 group text-left min-h-10 py-0.5"
            aria-label="PayWaka Home"
          >
            <img
              src="/logo.png"
              alt="PayWaka Logo"
              className="h-9 w-9 object-contain shrink-0 transition-transform duration-300 group-hover:scale-105"
            />
            <span className="font-display font-extrabold text-xl tracking-tight text-foreground">
              Pay<span className="text-brand-400">waka</span>
            </span>
          </Link>
        ) : (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
            aria-label="PayWaka Home"
          >
            <img
              src="/logo.png"
              alt="PayWaka Logo"
              className="h-9 w-9 object-contain shrink-0 transition-transform duration-300 group-hover:scale-105"
            />
            <span className="font-display font-extrabold text-xl tracking-tight text-white">
              Pay<span className="text-emerald-400">waka</span>
            </span>
          </button>
        )}

        {/* Auth Route Contextual Navigation (Desktop & Mobile — no empty hamburger) */}
        {isAuthRoute ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              Home
            </Link>
            <Link
              to={isLoginRoute ? "/auth/register" : "/auth/login"}
              className="inline-flex items-center gap-1.5 min-h-9 px-4 py-2 rounded-full text-xs sm:text-sm font-bold bg-brand-500 hover:bg-brand-400 text-brand-foreground shadow-sm transition-all"
            >
              <span>{isLoginRoute ? "Create Account" : "Sign In"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection("features")}
                className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors duration-200 cursor-pointer"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors duration-200 cursor-pointer"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection("reviews")}
                className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors duration-200 cursor-pointer"
              >
                Reviews
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors duration-200 cursor-pointer"
              >
                Pricing
              </button>
            </div>

            {/* Action Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/auth/login"
                className="px-4 py-2.5 rounded-full text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/[0.07] border border-transparent hover:border-white/10 transition-all duration-200 cursor-pointer"
              >
                Sign In
              </Link>
              <button
                onClick={() => scrollToSection("cta")}
                className="group px-5 py-2.5 rounded-full text-sm font-bold bg-[#10B981] hover:bg-[#34D399] text-[#02261E] flex items-center gap-2 shadow-[0_12px_28px_-10px_rgba(16,185,129,0.6),inset_0_1px_0_rgba(255,255,255,0.28)] transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
              >
                Get Started
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center p-2 text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer"
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </>
        )}
      </div>

      {/* Mobile Menu Dropdown (Landing page only) */}
      {!isAuthRoute && (
        <div
          className={`md:hidden absolute top-full left-0 right-0 bg-[#050A08]/95 backdrop-blur-2xl border-b border-white/[0.08] transition-all duration-300 ease-in-out ${
            isOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="px-6 py-7 flex flex-col gap-4">
            <button
              onClick={() => scrollToSection("features")}
              className="text-base font-semibold text-slate-200 hover:text-emerald-400 text-left transition-colors cursor-pointer py-2"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-base font-semibold text-slate-200 hover:text-emerald-400 text-left transition-colors cursor-pointer py-2"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("reviews")}
              className="text-base font-semibold text-slate-200 hover:text-emerald-400 text-left transition-colors cursor-pointer py-2"
            >
              Reviews
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-base font-semibold text-slate-200 hover:text-emerald-400 text-left transition-colors cursor-pointer py-2"
            >
              Pricing
            </button>

            <hr className="border-white/[0.08]" />

            <div className="flex flex-col gap-3 pt-1">
              <Link
                to="/auth/login"
                onClick={() => setIsOpen(false)}
                className="w-full py-3 rounded-full text-center font-semibold text-slate-200 hover:text-white bg-white/[0.05] border border-white/10 transition-all cursor-pointer"
              >
                Sign In
              </Link>
              <button
                onClick={() => scrollToSection("cta")}
                className="w-full py-3 rounded-full text-center font-bold bg-[#10B981] hover:bg-[#34D399] text-[#02261E] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
