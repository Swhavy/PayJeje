import { useState } from "react";
import { ArrowRight, CheckCircle2, Menu, X } from "lucide-react";

export default function HeroLanding() {
  const [email, setEmail] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const partners = [
    { name: "VISA", src: "/partners/visa.png" },
    { name: "Mastercard", src: "/partners/mastercard.png" },
    { name: "MTN", src: "/partners/mtn.png" },
    { name: "Airtel", src: "/partners/airtel.png" },
    { name: "Stripe", src: "/partners/stripe.png" },
    { name: "Interswitch", src: "/partners/interswitch.png" },
  ];

  const features = [
    {
      title: "Earn Rewards",
      description:
        "Get points for every bill you pay. Redeem for cash or discounts.",
      icon: "💰",
    },
    {
      title: "Instant Payments",
      description: "Pay electricity, airtime, and more in seconds. No waiting.",
      icon: "⚡",
    },
    {
      title: "Secure & Safe",
      description:
        "Your data and money are protected with bank-grade security.",
      icon: "🔒",
    },
    {
      title: "Exclusive Deals",
      description: "Access special offers from partner merchants daily.",
      icon: "🎁",
    },
  ];

  const steps = [
    {
      number: 1,
      title: "Sign Up",
      description:
        "Sign up to y&apos;eat all details and emviter your pay bills, envicommonlisting your soomers.",
      image: "/steps/step-1.png",
    },
    {
      number: 2,
      title: "Pay Bills",
      description:
        "Pay electricity, airtime, and more in second ansertisns you up to payments.",
      image: "/steps/step-2.png",
    },
    {
      number: 3,
      title: "Earn & Redeem",
      description:
        "Protectionssoorneornae chanoe, manan, and prociacled with gains money, earn mooro, eate more.",
      image: "/steps/step-3.png",
    },
  ];

  const testimonials = [
    {
      name: "Amara Johnson",
      role: "Business Owner",
      image: "/testimonials/user-1.png",
      text: "Paywaka has revolutionized how I manage my bills. I now earn rewards while paying my expenses.",
    },
    {
      name: "Chisom Okonkwo",
      role: "Student",
      image: "/testimonials/user-2.png",
      text: "As a student, earning points for my daily expenses is a game-changer. Highly recommended!",
    },
    {
      name: "Adeola Hassan",
      role: "Freelancer",
      image: "/testimonials/user-3.png",
      text: "The instant payment feature saves me so much time. Best fintech app I&apos;ve used so far.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a1f3a] overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-[#0a1f3a]/90 border-b border-[#1a3a52]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#00FF41] to-[#00cc33] rounded-lg flex items-center justify-center">
              <span className="text-[#001a2e] font-bold text-lg">₱</span>
            </div>
            <span className="text-xl font-bold text-[#e8f0f8]">Paywaka</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-[#8aa6b8] hover:text-[#e8f0f8] transition-colors text-sm"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-[#8aa6b8] hover:text-[#e8f0f8] transition-colors text-sm"
            >
              How it Works
            </a>
            <a
              href="#reviews"
              className="text-[#8aa6b8] hover:text-[#e8f0f8] transition-colors text-sm"
            >
              Reviews
            </a>
            <a
              href="#pricing"
              className="text-[#8aa6b8] hover:text-[#e8f0f8] transition-colors text-sm"
            >
              Pricing
            </a>
            <button className="px-6 py-2 text-[#e8f0f8] border border-[#1a3a52] rounded-lg hover:border-[#00FF41] transition-colors text-sm">
              Sign In
            </button>
            <button className="px-6 py-2 bg-[#00FF41] text-[#001a2e] rounded-lg font-semibold text-sm hover:bg-[#00cc33] transition-colors">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-[#e8f0f8]" />
            ) : (
              <Menu className="w-6 h-6 text-[#e8f0f8]" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a1f3a] border-t border-[#1a3a52] p-4 space-y-4">
            <a
              href="#features"
              className="block text-[#8aa6b8] hover:text-[#e8f0f8]"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="block text-[#8aa6b8] hover:text-[#e8f0f8]"
            >
              How it Works
            </a>
            <a
              href="#reviews"
              className="block text-[#8aa6b8] hover:text-[#e8f0f8]"
            >
              Reviews
            </a>
            <button className="w-full px-4 py-2 bg-[#00FF41] text-[#001a2e] rounded-lg font-semibold">
              Get Started
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-6">
        {/* Gradient Background Elements */}
        <div className="absolute top-40 right-0 w-96 h-96 bg-[#00FF41]/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#00FF41]/5 rounded-full blur-3xl -z-10"></div>

        <div className="max-w-6xl mx-auto">
          {/* Top Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a3a52] border border-[#00FF41]/30 rounded-full">
              <span className="text-[#00FF41] text-sm">✨</span>
              <span className="text-[#8aa6b8] text-sm">
                Join 50,000+ users earning daily
              </span>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-center mb-6 leading-tight">
            <span className="text-[#e8f0f8]">Earn Money</span>
            <br />
            <span className="bg-gradient-to-r from-[#00FF41] to-[#00cc33] bg-clip-text text-transparent">
              While You Pay Your Bills
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-center text-[#8aa6b8] text-lg md:text-xl max-w-3xl mx-auto mb-10">
            Complete simple tasks, earn points, and use them to pay your bills,
            buy airtime, or convert to cash. It&apos;s that simple with Paywaka.
          </p>

          {/* CTA Section */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <div className="flex-1 max-w-sm flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 px-6 py-3 bg-[#1a3a52] border border-[#2a4a62] rounded-lg text-[#e8f0f8] placeholder-[#8aa6b8] focus:border-[#00FF41] focus:outline-none focus:ring-1 focus:ring-[#00FF41] transition-all"
              />
              <button className="px-8 py-3 bg-[#00FF41] text-[#001a2e] rounded-lg font-semibold hover:bg-[#00cc33] transition-all flex items-center gap-2 whitespace-nowrap">
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Trust Logos */}
          <div className="mb-16">
            <p className="text-center text-[#8aa6b8] text-sm mb-6 uppercase tracking-wide">
              Trusted by these payment partners
            </p>
            <div className="flex flex-wrap justify-center gap-8 items-center">
              {[
                "VISA",
                "Mastercard",
                "MTN",
                "Airtel",
                "Stripe",
                "Interswitch",
              ].map((partner) => (
                <div
                  key={partner}
                  className="text-[#8aa6b8] text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity"
                >
                  {partner}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 border-t border-[#1a3a52]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-[#e8f0f8] mb-16">
            Features
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-gradient-to-br from-[#1a3a52]/50 to-[#0a1f3a] border border-[#1a3a52] rounded-2xl hover:border-[#00FF41]/50 transition-all group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-[#e8f0f8] mb-2">
                  {feature.title}
                </h3>
                <p className="text-[#8aa6b8] text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section
        id="how-it-works"
        className="py-20 px-6 border-t border-[#1a3a52]"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-[#e8f0f8] mb-16">
            How it Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                {/* Step Number */}
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#00FF41] to-[#00cc33] text-[#001a2e] font-bold text-xl mb-6">
                  {step.number}
                </div>

                {/* Visual Placeholder */}
                <div className="w-full h-48 bg-gradient-to-br from-[#1a3a52]/50 to-[#0a1f3a] border border-[#1a3a52] rounded-xl mb-6 flex items-center justify-center overflow-hidden">
                  <div className="text-center">
                    <div className="text-6xl mb-2">
                      {step.number === 1 && "👤"}
                      {step.number === 2 && "⚡"}
                      {step.number === 3 && "💰"}
                    </div>
                    <p className="text-[#8aa6b8] text-sm">
                      Step {step.number} Visual
                    </p>
                  </div>
                </div>

                {/* Step Content */}
                <h3 className="text-xl font-semibold text-[#e8f0f8] mb-2 text-center">
                  {step.title}
                </h3>
                <p className="text-[#8aa6b8] text-sm text-center">
                  {step.description}
                </p>

                {/* Step Connector */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute left-1/2 transform translate-x-1/2 w-px h-20 bg-gradient-to-b from-[#00FF41] to-transparent mt-8"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="reviews" className="py-20 px-6 border-t border-[#1a3a52]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-[#e8f0f8] mb-16">
            What Our Users Say
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-6 bg-gradient-to-br from-[#1a3a52]/50 to-[#0a1f3a] border border-[#1a3a52] rounded-2xl hover:border-[#00FF41]/30 transition-all"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00FF41] to-[#00cc33] flex items-center justify-center text-[#001a2e] font-bold text-lg">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-[#e8f0f8] font-semibold">
                      {testimonial.name}
                    </h4>
                    <p className="text-[#8aa6b8] text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-[#8aa6b8] italic">
                  &quot;{testimonial.text}&quot;
                </p>
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-[#00FF41]">
                      ★
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="py-20 px-6 border-t border-[#1a3a52]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-[#e8f0f8] mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-[#8aa6b8] mb-8 text-lg">
            Join thousands of users who are already saving money and earning
            rewards with Paywaka.
          </p>
          <button className="px-8 py-4 bg-[#00FF41] text-[#001a2e] rounded-lg font-semibold text-lg hover:bg-[#00cc33] transition-all inline-flex items-center gap-2">
            Start Earning Now <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a3a52] py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-[#00FF41] to-[#00cc33] rounded-lg flex items-center justify-center">
                <span className="text-[#001a2e] font-bold">₱</span>
              </div>
              <span className="text-lg font-bold text-[#e8f0f8]">Paywaka</span>
            </div>
            <p className="text-[#8aa6b8] text-sm">
              Earn money while paying your bills.
            </p>
          </div>
          <div>
            <h4 className="text-[#e8f0f8] font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-[#8aa6b8] hover:text-[#00FF41] text-sm transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[#8aa6b8] hover:text-[#00FF41] text-sm transition-colors"
                >
                  How it Works
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[#8aa6b8] hover:text-[#00FF41] text-sm transition-colors"
                >
                  Pricing
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#e8f0f8] font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-[#8aa6b8] hover:text-[#00FF41] text-sm transition-colors"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[#8aa6b8] hover:text-[#00FF41] text-sm transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[#8aa6b8] hover:text-[#00FF41] text-sm transition-colors"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#e8f0f8] font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-[#8aa6b8] hover:text-[#00FF41] text-sm transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-[#8aa6b8] hover:text-[#00FF41] text-sm transition-colors"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#1a3a52] pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-[#8aa6b8] text-sm">
            &copy; 2024 Paywaka. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a
              href="#"
              className="text-[#8aa6b8] hover:text-[#00FF41] text-sm transition-colors"
            >
              Twitter
            </a>
            <a
              href="#"
              className="text-[#8aa6b8] hover:text-[#00FF41] text-sm transition-colors"
            >
              Facebook
            </a>
            <a
              href="#"
              className="text-[#8aa6b8] hover:text-[#00FF41] text-sm transition-colors"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
