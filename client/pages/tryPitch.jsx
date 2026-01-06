import React, { useState } from 'react';
import { Download, Building2, TrendingUp, Package, Users, Bell, BarChart3, ShoppingCart, Smartphone, Shield, Clock, CheckCircle2 } from 'lucide-react';

const ProposalDocument = () => {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    // Cover Page
    <div className="h-full flex flex-col justify-center items-center bg-gradient-to-br from-purple-900 via-purple-800 to-pink-200 text-white p-12">
      <Building2 className="w-24 h-24 mb-8 opacity-90" />
      <h1 className="text-5xl font-bold mb-4 text-center">Digital Transformation Proposal</h1>
      <div className="h-1 w-32 bg-pink-300 mb-6"></div>
      <h2 className="text-3xl mb-8 text-center">Prince Mega Cosmetics</h2>
      <p className="text-xl opacity-90 mb-4">Enterprise Inventory & Sales Management System</p>
      <div className="mt-12 text-center">
        <p className="text-lg opacity-75">Prepared by: Professional Software Solutions</p>
        <p className="text-sm opacity-75 mt-2">November 14, 2025</p>
      </div>
    </div>,

    // Executive Summary
    <div className="h-full p-12 bg-white overflow-y-auto">
      <h2 className="text-3xl font-bold text-purple-900 mb-6 border-b-4 border-purple-900 pb-2">Executive Summary</h2>
      <div className="space-y-6 text-gray-800">
        <p className="text-lg leading-relaxed">
          Prince Mega Cosmetics stands at a pivotal moment for growth. This proposal outlines a comprehensive 
          <span className="font-semibold text-purple-900"> digital transformation solution</span> designed to automate operations, 
          eliminate revenue leakage, and position your brand as a technology-forward leader in Nigeria's beauty industry.
        </p>
        
        <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-900">
          <h3 className="font-bold text-xl mb-3 text-purple-900">The Challenge</h3>
          <ul className="space-y-2 text-gray-700">
            <li>• Manual inventory tracking leading to expired products and stock losses</li>
            <li>• Untracked sales conversations on WhatsApp and social media</li>
            <li>• Inability to measure marketing ROI and influencer effectiveness</li>
            <li>• No centralized visibility across multiple branches</li>
            <li>• Lost revenue from customers who don't complete purchases</li>
            <li>• Inefficient staff commission calculations and reporting</li>
          </ul>
        </div>

        <div className="bg-pink-50 p-6 rounded-lg border-l-4 border-pink-400">
          <h3 className="font-bold text-xl mb-3 text-purple-900">The Solution</h3>
          <p className="text-gray-700 leading-relaxed">
            A fully integrated, cloud-based management system that transforms every aspect of your business—from 
            inventory and expiry tracking to automated sales, customer loyalty, and real-time business intelligence 
            across all branches.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Investment</p>
            <p className="text-3xl font-bold text-purple-900">₦12,000,000</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Timeline</p>
            <p className="text-3xl font-bold text-purple-900">7-10 Weeks</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">ROI Timeline</p>
            <p className="text-3xl font-bold text-purple-900">6-9 Months</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Maintenance</p>
            <p className="text-3xl font-bold text-purple-900">₦50k/month</p>
          </div>
        </div>
      </div>
    </div>,

    // Core System Features - Part 1
    <div className="h-full p-12 bg-white overflow-y-auto">
      <h2 className="text-3xl font-bold text-purple-900 mb-6 border-b-4 border-purple-900 pb-2">Core System Features (1/2)</h2>
      
      <div className="space-y-6">
        <div className="border-l-4 border-purple-600 pl-6 py-2">
          <div className="flex items-start gap-3 mb-3">
            <Package className="w-8 h-8 text-purple-600 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">1. Intelligent Inventory Management</h3>
            </div>
          </div>
          <ul className="space-y-2 text-gray-700 ml-11">
            <li>• Real-time stock tracking across all branches</li>
            <li>• Automatic expiry date monitoring with 30/60/90-day alerts</li>
            <li>• Low-stock notifications and reorder suggestions</li>
            <li>• FIFO (First-In-First-Out) batch management</li>
            <li>• Supplier management and purchase order tracking</li>
            <li>• Product categorization and SKU management</li>
          </ul>
        </div>

        <div className="border-l-4 border-pink-500 pl-6 py-2">
          <div className="flex items-start gap-3 mb-3">
            <Bell className="w-8 h-8 text-pink-500 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">2. Expiry Management System</h3>
            </div>
          </div>
          <ul className="space-y-2 text-gray-700 ml-11">
            <li>• Daily automated expiry checks via cloud functions</li>
            <li>• WhatsApp, email, and dashboard alerts for soon-to-expire items</li>
            <li>• Expired product auto-flagging (prevents accidental sales)</li>
            <li>• Monthly expiry reports for HQ and branch managers</li>
            <li>• Disposal tracking and audit trails</li>
          </ul>
        </div>

        <div className="border-l-4 border-purple-600 pl-6 py-2">
          <div className="flex items-start gap-3 mb-3">
            <ShoppingCart className="w-8 h-8 text-purple-600 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">3. Multi-Channel Sales Platform</h3>
            </div>
          </div>
          <ul className="space-y-2 text-gray-700 ml-11">
            <li>• Modern responsive e-commerce website (desktop & mobile)</li>
            <li>• In-branch POS-style sales interface for staff</li>
            <li>• Integrated payment gateways (Flutterwave & Paystack)</li>
            <li>• Digital receipts via email and WhatsApp</li>
            <li>• Cart abandonment recovery system</li>
          </ul>
        </div>

        <div className="border-l-4 border-pink-500 pl-6 py-2">
          <div className="flex items-start gap-3 mb-3">
            <Smartphone className="w-8 h-8 text-pink-500 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">4. WhatsApp Sales Automation Bot</h3>
            </div>
          </div>
          <ul className="space-y-2 text-gray-700 ml-11">
            <li>• Automated product catalog sharing</li>
            <li>• Skin-type questionnaire for personalized recommendations</li>
            <li>• In-chat ordering and payment link generation</li>
            <li>• Order tracking and delivery status updates</li>
            <li>• Automated upselling and product suggestions</li>
            <li>• 24/7 customer inquiry handling</li>
          </ul>
        </div>
      </div>
    </div>,

    // Core System Features - Part 2
    <div className="h-full p-12 bg-white overflow-y-auto">
      <h2 className="text-3xl font-bold text-purple-900 mb-6 border-b-4 border-purple-900 pb-2">Core System Features (2/2)</h2>
      
      <div className="space-y-6">
        <div className="border-l-4 border-purple-600 pl-6 py-2">
          <div className="flex items-start gap-3 mb-3">
            <TrendingUp className="w-8 h-8 text-purple-600 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">5. Customer Loyalty & Rewards Engine</h3>
            </div>
          </div>
          <ul className="space-y-2 text-gray-700 ml-11">
            <li>• Points-based rewards system (1 point per ₦100 spent)</li>
            <li>• Birthday bonuses and milestone rewards</li>
            <li>• Referral program with automated payouts</li>
            <li>• VIP tier management</li>
            <li>• Automated loyalty campaign creation</li>
            <li>• Customer retention analytics</li>
          </ul>
        </div>

        <div className="border-l-4 border-pink-500 pl-6 py-2">
          <div className="flex items-start gap-3 mb-3">
            <Users className="w-8 h-8 text-pink-500 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">6. Influencer & Affiliate Management</h3>
            </div>
          </div>
          <ul className="space-y-2 text-gray-700 ml-11">
            <li>• Self-service influencer signup portal</li>
            <li>• Unique tracking codes and links per influencer</li>
            <li>• Real-time conversion and revenue tracking</li>
            <li>• Automated commission calculations</li>
            <li>• Performance leaderboards and reports</li>
            <li>• Fraud detection for fake conversions</li>
          </ul>
        </div>

        <div className="border-l-4 border-purple-600 pl-6 py-2">
          <div className="flex items-start gap-3 mb-3">
            <BarChart3 className="w-8 h-8 text-purple-600 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">7. Business Intelligence Dashboard</h3>
            </div>
          </div>
          <ul className="space-y-2 text-gray-700 ml-11">
            <li>• Real-time sales metrics (today, MTD, YTD)</li>
            <li>• Revenue breakdown by product, category, and branch</li>
            <li>• Top-performing products and staff members</li>
            <li>• Customer acquisition and retention metrics</li>
            <li>• Marketing campaign effectiveness tracking</li>
            <li>• Predictive analytics for inventory planning</li>
            <li>• Automated monthly executive reports</li>
          </ul>
        </div>

        <div className="border-l-4 border-pink-500 pl-6 py-2">
          <div className="flex items-start gap-3 mb-3">
            <Shield className="w-8 h-8 text-pink-500 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">8. Security & Access Control</h3>
            </div>
          </div>
          <ul className="space-y-2 text-gray-700 ml-11">
            <li>• Role-based access (HQ Admin, Branch Manager, Sales Staff)</li>
            <li>• Two-factor authentication for sensitive operations</li>
            <li>• Complete audit trail of all transactions</li>
            <li>• Encrypted data storage and transmission</li>
            <li>• Daily automated backups</li>
          </ul>
        </div>
      </div>
    </div>,

    // Technical Architecture
    <div className="h-full p-12 bg-white overflow-y-auto">
      <h2 className="text-3xl font-bold text-purple-900 mb-6 border-b-4 border-purple-900 pb-2">Technical Architecture</h2>
      
      <div className="space-y-6 text-gray-800">
        <p className="text-lg leading-relaxed">
          Our solution is built on enterprise-grade, cloud-native technologies that ensure scalability, 
          reliability, and security for Prince Mega Cosmetics' operations.
        </p>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
          <h3 className="font-bold text-xl mb-4 text-purple-900">Technology Stack</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-purple-800 mb-2">Frontend</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• React.js with Vite</li>
                <li>• Progressive Web App (PWA)</li>
                <li>• Responsive design (mobile-first)</li>
                <li>• Tailwind CSS</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-purple-800 mb-2">Backend</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Node.js with Express</li>
                <li>• RESTful API architecture</li>
                <li>• Firebase Cloud Functions</li>
                <li>• WebSocket for real-time updates</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-purple-800 mb-2">Database</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Firebase Firestore (NoSQL)</li>
                <li>• Optimized indexing</li>
                <li>• Real-time synchronization</li>
                <li>• Automatic scaling</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-purple-800 mb-2">Infrastructure</p>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Firebase Hosting</li>
                <li>• Cloud storage for assets</li>
                <li>• CDN for fast delivery</li>
                <li>• 99.9% uptime guarantee</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border-2 border-purple-200">
          <h3 className="font-bold text-xl mb-4 text-purple-900">Integrations Included</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>WhatsApp Business API</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Flutterwave Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Paystack Gateway</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Email Service (Brevo)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>SMS Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Google Analytics</span>
            </div>
          </div>
        </div>

        <div className="bg-purple-900 text-white p-6 rounded-lg">
          <h3 className="font-bold text-xl mb-3">Why This Architecture?</h3>
          <ul className="space-y-2 text-sm">
            <li>✓ <span className="font-semibold">Scalable:</span> Grows with your business without infrastructure changes</li>
            <li>✓ <span className="font-semibold">Reliable:</span> Enterprise-grade uptime with automatic failover</li>
            <li>✓ <span className="font-semibold">Fast:</span> Real-time data sync across all branches</li>
            <li>✓ <span className="font-semibold">Secure:</span> Bank-level encryption and security protocols</li>
            <li>✓ <span className="font-semibold">Cost-effective:</span> Pay only for what you use, no wasted resources</li>
          </ul>
        </div>
      </div>
    </div>,

    // Investment & ROI
    <div className="h-full p-12 bg-white overflow-y-auto">
      <h2 className="text-3xl font-bold text-purple-900 mb-6 border-b-4 border-purple-900 pb-2">Investment & Return Analysis</h2>
      
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-purple-900 to-purple-700 text-white p-8 rounded-xl shadow-lg">
          <h3 className="text-2xl font-bold mb-6 text-center">Investment Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-purple-400 pb-3">
              <span className="text-lg">Software Development</span>
              <span className="text-2xl font-bold">₦11,520,000</span>
            </div>
            <div className="flex justify-between items-center border-b border-purple-400 pb-3">
              <span className="text-lg">Infrastructure Setup & Tools</span>
              <span className="text-2xl font-bold">₦80,000</span>
            </div>
            <div className="flex justify-between items-center border-b border-purple-400 pb-3">
              <span className="text-lg">First 3 Months Hosting</span>
              <span className="text-2xl font-bold">₦75,000</span>
            </div>
            <div className="flex justify-between items-center border-b border-purple-400 pb-3">
              <span className="text-lg">Training & Documentation</span>
              <span className="text-2xl font-bold">₦200,000</span>
            </div>
            <div className="flex justify-between items-center border-b border-purple-400 pb-3">
              <span className="text-lg">30-Day Post-Launch Support</span>
              <span className="text-2xl font-bold">₦125,000</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t-4 border-pink-400">
              <span className="text-2xl font-bold">TOTAL INVESTMENT</span>
              <span className="text-4xl font-bold">₦12,000,000</span>
            </div>
          </div>
        </div>

        <div className="bg-pink-50 p-6 rounded-lg border-2 border-pink-200">
          <h3 className="font-bold text-xl mb-4 text-purple-900">Ongoing Costs</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700">Monthly Maintenance & Support</span>
              <span className="font-bold text-purple-900">₦50,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Monthly Hosting & Services</span>
              <span className="font-bold text-purple-900">₦25,000 - ₦40,000</span>
            </div>
            <div className="flex justify-between pt-3 border-t-2 border-pink-300">
              <span className="font-bold text-gray-800">Total Monthly Operating Cost</span>
              <span className="font-bold text-purple-900">₦75,000 - ₦90,000</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border-2 border-green-200">
          <h3 className="font-bold text-xl mb-4 text-green-700">Expected ROI Impact</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-green-50 p-4 rounded">
              <p className="text-gray-600 mb-1">Reduced Expiry Losses</p>
              <p className="text-2xl font-bold text-green-700">15-30%</p>
              <p className="text-xs text-gray-500 mt-1">Annual savings</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-gray-600 mb-1">Sales Increase</p>
              <p className="text-2xl font-bold text-green-700">20-40%</p>
              <p className="text-xs text-gray-500 mt-1">Via WhatsApp automation</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-gray-600 mb-1">Staff Efficiency</p>
              <p className="text-2xl font-bold text-green-700">35%</p>
              <p className="text-xs text-gray-500 mt-1">Time saved per day</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-gray-600 mb-1">Customer Retention</p>
              <p className="text-2xl font-bold text-green-700">25%</p>
              <p className="text-xs text-gray-500 mt-1">Via loyalty program</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-900 text-white p-6 rounded-lg">
          <h3 className="font-bold text-xl mb-3">Conservative ROI Calculation</h3>
          <p className="mb-4 text-sm">Assuming current monthly revenue of ₦5,000,000:</p>
          <ul className="space-y-2 text-sm">
            <li>• <span className="font-semibold">Expiry loss reduction (20%):</span> ₦200,000/month saved</li>
            <li>• <span className="font-semibold">Sales increase (25%):</span> ₦1,250,000/month additional revenue</li>
            <li>• <span className="font-semibold">Better inventory decisions:</span> ₦150,000/month saved</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-purple-400">
            <p className="text-lg"><span className="font-bold">Total Monthly Impact:</span> ₦1,600,000+</p>
            <p className="text-lg"><span className="font-bold">Annual Impact:</span> ₦19,200,000+</p>
            <p className="text-2xl font-bold mt-3 text-pink-300">System pays for itself in 6-8 months</p>
          </div>
        </div>
      </div>
    </div>,

    // Implementation Timeline
    <div className="h-full p-12 bg-white overflow-y-auto">
      <h2 className="text-3xl font-bold text-purple-900 mb-6 border-b-4 border-purple-900 pb-2">Implementation Timeline</h2>
      
      <div className="space-y-6">
        <p className="text-lg text-gray-700">
          The complete system will be delivered in <span className="font-bold text-purple-900">7-10 weeks</span>, 
          following a structured phased approach with clear milestones and client acceptance gates.
        </p>

        <div className="space-y-4">
          <div className="border-l-4 border-purple-600 pl-6 py-4 bg-purple-50">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
              <h3 className="text-xl font-bold text-gray-800">Discovery & Design (Week 1-2)</h3>
            </div>
            <ul className="text-sm text-gray-700 space-y-1 ml-11">
              <li>✓ Requirements gathering and business process mapping</li>
              <li>✓ UI/UX design and prototyping</li>
              <li>✓ Database schema and architecture design</li>
              <li>✓ Project kickoff and team alignment</li>
            </ul>
            <p className="mt-2 ml-11 text-sm font-semibold text-purple-900">Deliverable: Approved design mockups and technical specifications</p>
          </div>

          <div className="border-l-4 border-pink-500 pl-6 py-4 bg-pink-50">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-pink-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
              <h3 className="text-xl font-bold text-gray-800">Core Development (Week 3-5)</h3>
            </div>
            <ul className="text-sm text-gray-700 space-y-1 ml-11">
              <li>✓ User authentication and role management</li>
              <li>✓ Inventory management system with expiry tracking</li>
              <li>✓ Sales interface (POS and online store)</li>
              <li>✓ Payment gateway integration</li>
              <li>✓ Basic dashboard and reporting</li>
            </ul>
            <p className="mt-2 ml-11 text-sm font-semibold text-pink-600">Deliverable: Working MVP on staging server</p>
          </div>

          <div className="border-l-4 border-purple-600 pl-6 py-4 bg-purple-50">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
              <h3 className="text-xl font-bold text-gray-800">Advanced Features (Week 6-7)</h3>
            </div>
            <ul className="text-sm text-gray-700 space-y-1 ml-11">
              <li>✓ WhatsApp sales bot integration</li>
              <li>✓ Loyalty and rewards system</li>
              <li>✓ Influencer/affiliate management portal</li>
              <li>✓ Advanced analytics and reporting</li>
              <li>✓ Multi-branch synchronization</li>
            </ul>
            <p className="mt-2 ml-11 text-sm font-semibold text-purple-900">Deliverable: Complete feature set ready for testing</p>
          </div>

          <div className="border-l-4 border-pink-500 pl-6 py-4 bg-pink-50">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-pink-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div>
              <h3 className="text-xl font-bold text-gray-800">Testing & Training (Week 8-9)</h3>
            </div>
            <ul className="text-sm text-gray-700 space-y-1 ml-11">
              <li>✓ Comprehensive QA and user acceptance testing</li>
              <li>✓ Bug fixes and performance optimization</li>
              <li>✓ Staff training sessions (HQ and branch level)</li>
              <li>✓ Documentation and user guides</li>
              <li>✓ Data migration from existing systems</li>
            </ul>
            <p className="mt-2 ml-11 text-sm font-semibold text-pink-600">Deliverable: Production-ready system with trained users</p>
          </div>

          <div className="border-l-4 border-green-600 pl-6 py-4 bg-green-50">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">5</div>
              <h3 className="text-xl font-bold text-gray-800">Go-Live & Stabilization (Week 10)</h3>
            </div>
            <ul className="text-sm text-gray-700 space-y-1 ml-11">
              <li>✓ Production deployment and system launch</li>
              <li>✓ Real-time monitoring and support</li>
              <li>✓ Performance tuning and optimization</li>
              <li>✓ 30-day stabilization period with priority support</li>
            </ul>
            <p className="mt-2 ml-11 text-sm font-semibold text-green-700">Deliverable: Fully operational system in production</p>
          </div>
        </div>

        <div className="bg-purple-900 text-white p-6 rounded-lg mt-6">
          <h3 className="font-bold text-xl mb-3">Payment Milestones</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-purple-400">
              <span>Contract Signing & Project Kickoff</span>
              <span className="font-bold">₦3,600,000 (30%)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-purple-400">
              <span>Core Development Complete (Phase 2)</span>
              <span className="font-bold">₦3,600,000 (30%)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-purple-400">
              <span>All Features Complete & UAT (Phase 4)</span>
              <span className="font-bold">₦3,000,000 (25%)</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Go-Live & Final Acceptance</span>
              <span className="font-bold">₦1,800,000 (15%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>,

    // Why Choose Us
    <div className="h-full p-12 bg-white overflow-y-auto">
      <h2 className="text-3xl font-bold text-purple-900 mb-6 border-b-4 border-purple-900 pb-2">Why Choose Our Solution</h2>
      
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-8 h-8 text-purple-600" />
              <h3 className="font-bold text-lg text-gray-800">Nigeria-Focused</h3>
            </div>
            <p className="text-sm text-gray-700">
              Built specifically for Nigerian businesses with local payment gateways, 
              WhatsApp integration, and understanding of local market dynamics.
            </p>
          </div>

          <div className="bg-pink-50 p-6 rounded-lg border-2 border-pink-200">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-8 h-8 text-pink-600" />
              <h3 className="font-bold text-lg text-gray-800">Industry Expertise</h3>
            </div>
            <p className="text-sm text-gray-700">
              Deep understanding of cosmetics retail challenges including expiry management, 
              shade variations, and beauty customer journey.
            </p>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-8 h-8 text-purple-600" />
              <h3 className="font-bold text-lg text-gray-800">Proven Technology</h3>
            </div>
            <p className="text-sm text-gray-700">
              Enterprise-grade tech stack (React, Node.js, Firebase) used by 
              global companies, ensuring reliability and scalability.
            </p>
          </div>

          <div className="bg-pink-50 p-6 rounded-lg border-2 border-pink-200">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-8 h-8 text-pink-600" />
              <h3 className="font-bold text-lg text-gray-800">Dedicated Support</h3>
            </div>
            <p className="text-sm text-gray-700">
              Direct access to development team, not outsourced support. 
              Quick response times and personalized assistance.
            </p>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-8 h-8 text-purple-600" />
              <h3 className="font-bold text-lg text-gray-800">Transparent Pricing</h3>
            </div>
            <p className="text-sm text-gray-700">
              All-inclusive pricing with no hidden fees. Infrastructure costs 
              covered for the first 3 months.
            </p>
          </div>

          <div className="bg-pink-50 p-6 rounded-lg border-2 border-pink-200">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-8 h-8 text-pink-600" />
              <h3 className="font-bold text-lg text-gray-800">Future-Ready</h3>
            </div>
            <p className="text-sm text-gray-700">
              Built for growth with AI-ready architecture, API-first design, 
              and modular components for easy expansion.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-900 to-pink-800 text-white p-8 rounded-xl mt-8">
          <h3 className="font-bold text-2xl mb-4 text-center">What Sets Us Apart</h3>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-4xl font-bold mb-2">7-10</p>
              <p className="text-sm">Weeks to Launch</p>
              <p className="text-xs opacity-75 mt-1">(vs 4-6 months typical)</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">24/7</p>
              <p className="text-sm">System Availability</p>
              <p className="text-xs opacity-75 mt-1">99.9% uptime guarantee</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">100%</p>
              <p className="text-sm">Custom Built</p>
              <p className="text-xs opacity-75 mt-1">No generic templates</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border-2 border-gray-300 mt-6">
          <h3 className="font-bold text-xl mb-4 text-gray-800">Service Level Agreement (SLA)</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-purple-900 mb-2">System Uptime</p>
              <p className="text-gray-700">99% monthly availability target</p>
            </div>
            <div>
              <p className="font-semibold text-purple-900 mb-2">Critical Issues</p>
              <p className="text-gray-700">24-48 hour response time</p>
            </div>
            <div>
              <p className="font-semibold text-purple-900 mb-2">Major Issues</p>
              <p className="text-gray-700">2-5 working days resolution</p>
            </div>
            <div>
              <p className="font-semibold text-purple-900 mb-2">Minor Issues</p>
              <p className="text-gray-700">5-10 working days resolution</p>
            </div>
            <div>
              <p className="font-semibold text-purple-900 mb-2">Backups</p>
              <p className="text-gray-700">Daily automated backups</p>
            </div>
            <div>
              <p className="font-semibold text-purple-900 mb-2">Updates</p>
              <p className="text-gray-700">Monthly security patches</p>
            </div>
          </div>
        </div>
      </div>
    </div>,

    // Risk Mitigation
    <div className="h-full p-12 bg-white overflow-y-auto">
      <h2 className="text-3xl font-bold text-purple-900 mb-6 border-b-4 border-purple-900 pb-2">Risk Mitigation & Guarantees</h2>
      
      <div className="space-y-6">
        <p className="text-lg text-gray-700">
          We've identified potential implementation risks and built comprehensive mitigation 
          strategies to ensure project success.
        </p>

        <div className="space-y-4">
          <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-purple-600">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-gray-800">Data Migration</h3>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">MEDIUM RISK</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">Risk:</span> Loss or corruption of existing data during migration.
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-green-700">Mitigation:</span> Phased migration with parallel 
              systems running, complete backup before migration, validation checkpoints, and rollback capability.
            </p>
          </div>

          <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-pink-500">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-gray-800">Staff Adoption</h3>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">MEDIUM RISK</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">Risk:</span> Resistance to new system from existing staff.
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-green-700">Mitigation:</span> Comprehensive training program, 
              intuitive UI design, role-specific training sessions, video tutorials, and on-site support during first week.
            </p>
          </div>

          <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-purple-600">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-gray-800">WhatsApp API Approval</h3>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">LOW RISK</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">Risk:</span> Delays in WhatsApp Business API approval.
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-green-700">Mitigation:</span> Begin verification process during 
              discovery phase, use verified WhatsApp Business Solution Provider, fallback to manual WhatsApp initially.
            </p>
          </div>

          <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-pink-500">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-gray-800">Payment Gateway Integration</h3>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">LOW RISK</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">Risk:</span> Payment processing failures or webhook reliability.
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-green-700">Mitigation:</span> Dual gateway integration 
              (Flutterwave + Paystack), idempotent webhook handling, retry logic, manual reconciliation tool.
            </p>
          </div>

          <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-purple-600">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-gray-800">System Downtime</h3>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">LOW RISK</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">Risk:</span> Service interruption affecting sales operations.
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-green-700">Mitigation:</span> Enterprise hosting with 99.9% uptime, 
              automated failover, offline-capable POS mode, real-time monitoring and alerts, 24/7 emergency support.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-lg mt-8">
          <h3 className="font-bold text-2xl mb-4 text-center">Our Guarantees</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold mb-1">On-Time Delivery</p>
                <p className="text-xs opacity-90">Meet agreed timeline or 10% discount on final payment</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold mb-1">30-Day Money-Back</p>
                <p className="text-xs opacity-90">If system doesn't meet specifications after UAT</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold mb-1">Bug-Free Launch</p>
                <p className="text-xs opacity-90">All critical bugs fixed before go-live</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold mb-1">Training Completion</p>
                <p className="text-xs opacity-90">All staff trained and certified on system usage</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,

    // Next Steps & Contact
    <div className="h-full p-12 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-200 text-white">
      <h2 className="text-4xl font-bold mb-8 text-center">Next Steps</h2>
      
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-white bg-opacity-10 backdrop-blur p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white text-purple-900 rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">1</div>
            <h3 className="text-2xl font-bold">Review & Discussion</h3>
          </div>
          <p className="ml-16 text-lg opacity-90">
            Schedule a detailed walkthrough session where we'll demo the proposed system, 
            answer technical questions, and discuss customization needs.
          </p>
        </div>

        <div className="bg-white bg-opacity-10 backdrop-blur p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white text-purple-900 rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">2</div>
            <h3 className="text-2xl font-bold">Contract & Agreement</h3>
          </div>
          <p className="ml-16 text-lg opacity-90">
            Sign service agreement outlining scope, timeline, payment schedule, and SLAs. 
            Initial 30% payment to commence project.
          </p>
        </div>

        <div className="bg-white bg-opacity-10 backdrop-blur p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white text-purple-900 rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">3</div>
            <h3 className="text-2xl font-bold">Project Kickoff</h3>
          </div>
          <p className="ml-16 text-lg opacity-90">
            Begin discovery phase within 3 business days of contract signing. 
            Meet key stakeholders and map current business processes.
          </p>
        </div>

        <div className="bg-white bg-opacity-10 backdrop-blur p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white text-purple-900 rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">4</div>
            <h3 className="text-2xl font-bold">Development & Launch</h3>
          </div>
          <p className="ml-16 text-lg opacity-90">
            7-10 week implementation following the phased timeline, with regular progress 
            updates and milestone demonstrations.
          </p>
        </div>

        <div className="bg-pink-600 p-8 rounded-xl mt-12 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Transform Prince Mega Cosmetics?</h3>
          <p className="text-xl mb-6 opacity-90">
            Let's discuss how this system will revolutionize your operations and drive growth.
          </p>
          <div className="space-y-3">
            <p className="text-lg">
              <span className="font-semibold">Contact:</span> Anyanechi Divine.
            </p>
            <p className="text-lg">
              <span className="font-semibold">Phone:</span> +234 813-6259-221
            </p>
            <p className="text-lg">
              <span className="font-semibold">Email:</span> divineanyanechi@gmail.com
            </p>
          </div>
        </div>

        <div className="bg-white bg-opacity-10 backdrop-blur p-6 rounded-xl mt-8 text-center">
          <p className="text-sm opacity-75">
            This proposal is valid for 30 days from the date of presentation.
            <br />
            All pricing in Nigerian Naira (₦). Terms and conditions apply.
          </p>
          <p className="text-xs opacity-60 mt-4">
            © 2025 Professional Software Solutions. Confidential and Proprietary.
          </p>
        </div>
      </div>
    </div>
  ];

  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-purple-900 text-white p-4 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-2xl font-bold">Prince Mega Cosmetics - Proposal</h1>
          <p className="text-sm opacity-75">Digital Transformation Solution</p>
        </div>
        <button className="bg-pink-500 hover:bg-pink-600 px-6 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Download className="w-5 h-5" />
          <span>Download PDF</span>
        </button>
      </div>

      {/* Document Viewer */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-5xl h-full bg-white rounded-lg shadow-2xl overflow-hidden">
          {pages[currentPage]}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white p-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
          >
            ← Previous
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Page {currentPage + 1} of {pages.length}
            </span>
            <div className="flex gap-1">
              {pages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentPage ? 'bg-purple-600 w-8' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
            disabled={currentPage === pages.length - 1}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalDocument;