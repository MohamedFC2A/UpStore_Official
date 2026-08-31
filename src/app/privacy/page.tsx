import React from 'react';
import type { Metadata } from 'next';
import { Shield, Lock, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Read the privacy policy and data protection guidelines for UpStore Premium Digital Marketplace.',
  alternates: {
    canonical: 'https://upstore.one/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | UpStore',
    description: 'Read the privacy policy and data protection guidelines for UpStore Premium Digital Marketplace.',
    url: 'https://upstore.one/privacy',
    type: 'website',
    images: [{
      url: '/api/og?title=Privacy%20Policy%20%26%20Data%20Protection&category=PRIVACY',
      width: 1200,
      height: 630,
      alt: 'UpStore Privacy Policy',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | UpStore',
    description: 'Read the privacy policy and data protection guidelines for UpStore Premium Digital Marketplace.',
    images: ['/api/og?title=Privacy%20Policy%20%26%20Data%20Protection&category=PRIVACY'],
  },
};

export default function PrivacyPage() {
  const lastUpdated = "June 13, 2026";

  return (
    <main className="min-h-screen bg-[#FFFDF9] text-black py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none" suppressHydrationWarning>
      <div className="max-w-4xl mx-auto relative z-10 space-y-8" suppressHydrationWarning>
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#06D6A0] border-2 border-black text-black text-xs font-black tracking-widest uppercase shadow-[2px_2px_0px_0px_#000] select-none">
            <Shield className="w-4 h-4 stroke-[2.5]" />
            <span>Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight">
            Privacy <span className="bg-[#FFE600] px-3 py-0.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000]">Policy</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-700 font-bold uppercase tracking-wider">
            Last Updated: {lastUpdated} | Security Version 2.0.4
          </p>
        </div>

        {/* Introduction Alert Box */}
        <div className="rounded-3xl border-2 border-black p-6 flex gap-4 items-start bg-[#FFE600] shadow-[5px_5px_0px_0px_#000] text-black">
          <Lock className="w-6 h-6 text-black flex-shrink-0 mt-0.5 stroke-[2.5]" />
          <div className="text-xs sm:text-sm text-neutral-900 leading-relaxed font-bold">
            <strong className="text-black font-black block mb-1">PRIVACY & TRUST COMMITMENT</strong>
            At UpStore, your privacy is our highest priority. This Privacy Policy details how we collect, process, and secure your personal data when you interact with our digital marketplace platform. We operate under strict data minimization standards and never sell or lease user information to third-party advertisers.
          </div>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6 text-xs sm:text-sm text-neutral-800 leading-relaxed font-bold">
          
          {/* Section 1 */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 select-none border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#06D6A0] border border-black rounded-sm inline-block" />
              1. Information Collection Protocols
            </h2>
            <div className="space-y-3">
              <p>
                1.1. <strong className="text-black">Account Profile Data:</strong> When establishing a registered account on UpStore, we collect your display name, email address, password hashes, and referral associations.
              </p>
              <p>
                1.2. <strong className="text-black">Transaction Ledger:</strong> To fulfill digital licenses, we log metadata associated with orders, checkout amounts, payment identifiers (processed securely via Stripe and local gateways), wallet balance adjustments, and delivered licensing keys.
              </p>
              <p>
                1.3. <strong className="text-black">Client-Side Logins & Sessions:</strong> Supabase-managed cookies and browser local storage options are utilized to persist authentication states, language choices, and shopping cart selections.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 select-none border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#FFE600] border border-black rounded-sm inline-block" />
              2. Utilization of Data & System Communications
            </h2>
            <div className="space-y-3">
              <p>
                2.1. <strong className="text-black">Licensing & Account Fulfillment:</strong> Your metadata is processed to deliver purchased accounts and license credentials securely via your dashboard or automated API systems.
              </p>
              <p>
                2.2. <strong className="text-black">Technical Customer Support:</strong> Information submitted via support tickets (subject, category, message content) is processed exclusively to address platform inquiries.
              </p>
              <p>
                2.3. <strong className="text-black">Anti-Abuse & Fraud Prevention:</strong> System checks are automatically performed on transactional histories to detect duplicate accounts, referral fraud, or payment exploits, maintaining platform integrity.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 select-none border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#FF70A6] border border-black rounded-sm inline-block" />
              3. Strict Confidentiality of Support Tickets
            </h2>
            <div className="space-y-3">
              <p>
                3.1. <strong className="text-black">Isolation of Inquiries:</strong> Support inquiries and message histories are strictly isolated and confidential. Standard registered customers can only query and view tickets associated directly with their user accounts.
              </p>
              <p>
                3.2. <strong className="text-black">Authorized Administrative Access:</strong> Only designated platform administrators hold rights to view tickets globally to resolve complaints. Customer ticket records are not indexed on public pages.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 select-none border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#4CC9F0] border border-black rounded-sm inline-block" />
              4. External Integrations & Payment Gateways
            </h2>
            <div className="space-y-3">
              <p>
                4.1. <strong className="text-black">Payment Intermediaries:</strong> Financial transactions are processed via secure gateways. Gateways operate under PCI-DSS compliance regulations, securing all payment details during checkout. UpStore does not store raw credit card numbers.
              </p>
              <p>
                4.2. <strong className="text-black">Database Hosting:</strong> Our storage engine, authentication system, and real-time APIs are powered by Supabase. All connections are secured under TLS encryption.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 select-none border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#B892FF] border border-black rounded-sm inline-block" />
              5. User Rights & Data Retention
            </h2>
            <div className="space-y-3">
              <p>
                5.1. <strong className="text-black">Data Access & Rectification:</strong> You maintain rights to inspect, update, or edit your account information from the Settings tab in your user dashboard.
              </p>
              <p>
                5.2. <strong className="text-black">Account Deletion:</strong> Registered users can request complete deletion of their account profile and support ticket histories. Requests can be sent directly to our support desk.
              </p>
              <p>
                5.3. <strong className="text-black">Policy Modifications:</strong> We reserve the right to modify this Privacy Policy. Continued usage of the marketplace indicates acceptance of all published changes.
              </p>
            </div>
          </section>

          {/* Contact box */}
          <div className="rounded-3xl border-2 border-black p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#06D6A0] shadow-[5px_5px_0px_0px_#000] text-black">
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-black stroke-[2.5]" />
              <div>
                <h4 className="font-black text-black text-base">Have Privacy Inquiries?</h4>
                <p className="text-xs text-neutral-900 font-bold">Contact our Legal & Support Compliance officers.</p>
              </div>
            </div>
            <a
              href="mailto:support@upstore.one"
              className="px-5 py-2.5 bg-white border-2 border-black text-black font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_#000] hover:bg-[#FFE600] transition-all cursor-pointer"
            >
              support@upstore.one
            </a>
          </div>

        </div>

      </div>
    </main>
  );
}
