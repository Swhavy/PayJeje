import React, { useState, useEffect } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router";


export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();

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
        scrolled
          ? "bg-background/85 backdrop-blur-xl border-[#1d3a6a]/40 py-4 shadow-lg shadow-[#060d1a]/50"
          : "bg-transparent border-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-3 group cursor-pointer text-left"
          aria-label="PayWaka Home"
        >
          {/* Green square logo with 'P' */}
          <img src="/logo.png" width={120} height={120} alt="PayWaka's Logo" />
          {/* <div className="w-10 h-10 bg-[#00c96e] rounded-xl flex items-center justify-center font-display font-extrabold text-2xl text-[#060d1a] shadow-lg shadow-[#00c96e]/25 transition-transform duration-300 group-hover:scale-105">
            P
          </div> */}
          <span className="font-display font-extrabold text-2xl tracking-tight text-[#e8f0ff]">
            Pay<span className="text-[#00c96e]">waka</span>
          </span>
        </button>

        {/* Desktop Navigation Links */}
        {location.pathname != "/auth/login" &&
        location.pathname != "/auth/register" ? (
          <>
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection("features")}
                className="text-sm font-medium text-[#7a9cc8] hover:text-[#00c96e] transition-colors duration-200 cursor-pointer"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-sm font-medium text-[#7a9cc8] hover:text-[#00c96e] transition-colors duration-200 cursor-pointer"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection("reviews")}
                className="text-sm font-medium text-[#7a9cc8] hover:text-[#00c96e] transition-colors duration-200 cursor-pointer"
              >
                Reviews
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-sm font-medium text-[#7a9cc8] hover:text-[#00c96e] transition-colors duration-200 cursor-pointer"
              >
                Pricing
              </button>
            </div>

            {/* Action Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                to="/auth/login"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#7a9cc8] hover:text-[#e8f0ff] hover:bg-[#1d3a6a]/30 transition-all duration-200 cursor-pointer"
              >
                Sign In
              </Link>
              <button
                onClick={() => scrollToSection("cta")}
                className="group px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00c96e] hover:bg-[#00e87d] text-[#060d1a] flex items-center gap-2 shadow-lg shadow-[#00c96e]/15 hover:shadow-[#00c96e]/25 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
              >
                Get Started
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </>
        ) : (
          ""
        )}

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-[#7a9cc8] hover:text-[#e8f0ff] hover:bg-[#1d3a6a]/20 rounded-lg transition-colors cursor-pointer"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-2xl border-b border-[#1d3a6a]/40 transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        {location.pathname != "/auth/login" ? (
          location.pathname != "/auth/register"
        ) : (
          <>
            <div className="px-6 py-8 flex flex-col gap-6">
              <button
                onClick={() => scrollToSection("features")}
                className="text-lg font-medium text-[#7a9cc8] hover:text-[#00c96e] text-left transition-colors cursor-pointer py-1"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-lg font-medium text-[#7a9cc8] hover:text-[#00c96e] text-left transition-colors cursor-pointer py-1"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection("reviews")}
                className="text-lg font-medium text-[#7a9cc8] hover:text-[#00c96e] text-left transition-colors cursor-pointer py-1"
              >
                Reviews
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-lg font-medium text-[#7a9cc8] hover:text-[#00c96e] text-left transition-colors cursor-pointer py-1"
              >
                Pricing
              </button>

              <hr className="border-[#1d3a6a]/30" />

              <div className="flex flex-col gap-4">
                <Link
                  to="/auth/login"
                  className="w-full py-3 rounded-xl text-center font-semibold text-[#7a9cc8] hover:text-[#e8f0ff] hover:bg-[#1d3a6a]/30 transition-all cursor-pointer"
                >
                  Sign In
                </Link>
                <button
                  onClick={() => scrollToSection("cta")}
                  className="w-full py-3 rounded-xl text-center font-semibold bg-[#00c96e] hover:bg-[#00e87d] text-[#060d1a] flex items-center justify-center gap-2 shadow-lg shadow-[#00c96e]/15 cursor-pointer"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
