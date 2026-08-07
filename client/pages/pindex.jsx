import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Star,
  Smartphone,
  Zap,
  Gift,
  Users,
  CheckCircle,
  ArrowRight,
  Play,
  Shield,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function HomePage() {
  const [email, setEmail] = useState("");

  const features = [
    {
      icon: Star,
      title: "Earn Points",
      description:
        "Complete surveys, watch videos, and earn points for every activity",
      color: "text-yellow-600 dark:text-yellow-400",
    },
    {
      icon: Smartphone,
      title: "Buy Airtime & Data",
      description: "Purchase airtime and data bundles at competitive rates",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: Zap,
      title: "Pay Bills",
      description: "Pay electricity, water, and other utility bills seamlessly",
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      icon: Gift,
      title: "Gift Cards",
      description: "Redeem points for gift cards from popular brands",
      color: "text-green-600 dark:text-green-400",
    },
    {
      icon: Users,
      title: "Refer & Earn",
      description: "Invite friends and earn bonus points for every referral",
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description:
        "Your data and transactions are protected with bank-level security",
      color: "text-red-600 dark:text-red-400",
    },
  ];

  const stats = [
    { number: "50K+", label: "Active Users", icon: Users },
    { number: "₦2M+", label: "Paid Out", icon: TrendingUp },
    { number: "99.9%", label: "Uptime", icon: Shield },
    { number: "4.8★", label: "User Rating", icon: Star },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Student",
      content:
        "Paywaka has helped me earn extra income while studying. The platform is easy to use and payments are always on time!",
      avatar: "👩‍🎓",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Freelancer",
      content:
        "I love how I can pay my bills and buy airtime all in one place. The point system is a great bonus!",
      avatar: "👨‍💻",
      rating: 5,
    },
    {
      name: "Aisha Okafor",
      role: "Teacher",
      content:
        "The referral program is amazing. I've earned thousands of points just by inviting my colleagues.",
      avatar: "👩‍🏫",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border px-4 py-3 sticky top-0 z-50 backdrop-blur-sm bg-card/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Paywaka Logo"
              width={70}
              height={70}
              className="rounded-full"
            />
            <span className="text-xl font-bold text-foreground">
              Pay
              <span className="text-green-600 dark:text-green-400">waka</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              to="/how-it-works"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              How it Works
            </Link>
            <Link
              to="/testimonials"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Reviews
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/auth/login">
              <Button
                /*   variant="ghost" */
                className="text-foreground hover:bg-muted"
              >
                Sign In
              </Button>
            </Link>
            <Link to="/auth/register">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-6 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800">
            🎉 Join 50,000+ users earning daily
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Earn Money While You
            <br />
            Pay Your Bills
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Complete simple tasks, earn points, and use them to pay bills, buy
            airtime, or convert to cash. It's that simple with Paywaka!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1 max-w-md">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
              />
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              Free to join
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              Instant payments
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              24/7 support
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-3">
                  <stat.icon className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {stat.number}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need in One Platform
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From earning points to paying bills, Paywaka provides all the
              tools you need to manage your finances.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-card border-border hover:shadow-lg transition-all duration-300 group"
              >
                <CardHeader>
                  <div
                    className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-foreground">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How Paywaka Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Get started in just 3 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Sign Up & Verify
              </h3>
              <p className="text-muted-foreground">
                Create your free account and verify your phone number to get
                started
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Complete Tasks
              </h3>
              <p className="text-muted-foreground">
                Take surveys, watch videos, and complete simple tasks to earn
                points
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Spend or Cash Out
              </h3>
              <p className="text-muted-foreground">
                Use your points to pay bills, buy airtime, or convert to cash
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of satisfied users earning with Paywaka
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <span className="text-3xl mr-3">{testimonial.avatar}</span>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {testimonial.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground">{testimonial.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Earning?
          </h2>
          <p className="text-xl mb-8 text-green-100">
            Join thousands of users who are already earning money with Paywaka
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/register">
              <Button
                /* size="lg" */
                className="bg-white text-green-600 hover:bg-gray-100"
              >
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              /*  size="lg" */
              /*  variant="outline" */
              className="border-white text-white hover:bg-white hover:text-green-600 bg-transparent"
            >
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Link to="/" className="flex items-center gap-3 mb-4">
                <img
                  src="/logo.png"
                  alt="Paywaka Logo"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <span className="text-xl font-bold text-foreground">
                  Pay
                  <span className="text-green-600 dark:text-green-400">
                    waka
                  </span>
                </span>
              </Link>
              <p className="text-muted-foreground">
                Earn money while paying your bills. The smart way to manage your
                finances.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    How it Works
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    Disclaimer
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 Paywaka. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
