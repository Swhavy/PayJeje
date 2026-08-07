/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PARTNERS = [
  "Visa",
  "Mastercard",
  "MTN",
  "Airtel",
  "Stripe",
  "Interswitch",
  "Flutterwave",
  "Paystack",
];

export const STATS = [
  { value: 50000, suffix: "+", label: "Active Users" },
  { value: 2000000000, suffix: "+", label: "₦ Processed" },
  { value: 4.8, suffix: "★", label: "App Store Rating" },
  { value: 99.9, suffix: "%", label: "Uptime SLA" },
];

export const STEPS = [
  {
    id: "step-1",
    number: "01",
    title: "Create Free Account",
    description: "Download the PayWaka app or sign up on web in under 60 seconds with just your phone number.",
  },
  {
    id: "step-2",
    number: "02",
    title: "Pay Bills Instantly",
    description: "Purchase airtime, data, electricity tokens, DSTV, or transfer funds instantly with zero extra fees.",
  },
  {
    id: "step-3",
    number: "03",
    title: "Earn & Redeem",
    description: "Earn instant cashback points on every single naira spent. Use points to pay your next bill or cash out directly.",
  },
];

export const TESTIMONIALS = [
  {
    id: 1,
    stars: 5,
    quote: "I paid my DSTV and got cashback the same day. PayWaka is too good! I am literally earning while keeping the lights on.",
    avatarInitials: "AO",
    name: "Adaeze O.",
    city: "Lagos",
  },
  {
    id: 2,
    stars: 5,
    quote: "No more paying convenience fees to pay electricity. I bought airtime, earned points, and paid my power bill with it. Total game-changer for Nigerian fintech!",
    avatarInitials: "BA",
    name: "Babajide A.",
    city: "Ibadan",
  },
  {
    id: 3,
    stars: 5,
    quote: "The referral program is insane. I've referred 10 of my friends and basically pay my monthly utility bills for free now. Everyone needs to download this.",
    avatarInitials: "CN",
    name: "Chioma N.",
    city: "Abuja",
  },
  {
    id: 4,
    stars: 5,
    quote: "I was highly skeptical about earning real money while paying everyday bills, but it actually works! Cashout to my bank account took less than 2 seconds.",
    avatarInitials: "EK",
    name: "Emeka K.",
    city: "Enugu",
  },
  {
    id: 5,
    stars: 5,
    quote: "I use PayWaka to manage bill payments for my small business. The 1.5% cashback from bulk utility payments adds up to thousands of Naira saved every month.",
    avatarInitials: "FS",
    name: "Funmilayo S.",
    city: "Port Harcourt",
  },
  {
    id: 6,
    stars: 5,
    quote: "Customer service is top-notch, and the user interface? Cleanest app in Africa right now. Makes financial tasks feel like playing a high-reward game.",
    avatarInitials: "CE",
    name: "Chidi E.",
    city: "Kano",
  },
];

export const PRICING_TIERS = [
  {
    name: "Waka Starter",
    monthlyPrice: 0,
    description: "Perfect for individuals starting out with bills.",
    features: [
      "Standard Cashback (0.5% back on bills)",
      "Zero fees on airtime & data purchase",
      "Standard transfer speeds",
      "Email & Chat support",
      "Up to ₦50,000 monthly transactions",
    ],
  },
  {
    name: "Waka Pro",
    monthlyPrice: 999,
    description: "For active users who want to maximize their daily rewards.",
    isPopular: true,
    features: [
      "Double Cashback (1.5% back on all bills)",
      "Guaranteed zero convenience fees on all bills",
      "Priority processing on all bank transfers",
      "24/7 Priority support channel",
      "Exclusive partner discount vouchers",
      "Unlimited transaction volume",
    ],
  },
  {
    name: "Waka Business",
    monthlyPrice: 4999,
    description: "For merchants, landlords, and teams doing bulk bill management.",
    features: [
      "Ultra Cashback (3.0% back on bulk utilities)",
      "Dedicated account manager",
      "Custom bulk disbursement panel & API access",
      "Comprehensive monthly financial statements",
      "Sub-account access for up to 5 employees",
      "Custom branding on transaction receipts",
    ],
  },
];
