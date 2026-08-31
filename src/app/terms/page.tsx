import React from 'react';
import type { Metadata } from 'next';
import { ShieldAlert, Scale, ScrollText, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service & Conditions',
  description: 'Read the terms of service and usage conditions for UpStore Premium Digital Marketplace.',
  alternates: {
    canonical: 'https://upstore.one/terms',
  },
  openGraph: {
    title: 'Terms of Service & Conditions | UpStore',
    description: 'Read the terms of service and usage conditions for UpStore Premium Digital Marketplace.',
    url: 'https://upstore.one/terms',
    type: 'website',
    images: [{
      url: '/api/og?title=Terms%20of%20Service%20%26%20Conditions&category=LEGAL',
      width: 1200,
      height: 630,
      alt: 'UpStore Terms of Service',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service & Conditions | UpStore',
    description: 'Read the terms of service and usage conditions for UpStore Premium Digital Marketplace.',
    images: ['/api/og?title=Terms%20of%20Service%20%26%20Conditions&category=LEGAL'],
  },
};

export default function TermsPage() {
  const lastUpdated = "June 5, 2026";

  return (
    <main className="min-h-screen bg-[#FFFDF9] text-black py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none" suppressHydrationWarning>
      <div className="max-w-4xl mx-auto relative z-10 space-y-8" suppressHydrationWarning>
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFE600] border-2 border-black text-black text-xs font-black tracking-widest uppercase shadow-[2px_2px_0px_0px_#000] select-none">
            <ScrollText className="w-4 h-4 stroke-[2.5]" />
            <span>Legal Framework</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight">
            Terms of Service & <span className="bg-[#FFE600] px-3 py-0.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000]">Conditions</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-700 font-bold uppercase tracking-wider">
            Last Updated: {lastUpdated} | Corporate Version 4.1.2
          </p>
        </div>

        {/* Introduction Alert Box */}
        <div className="rounded-3xl border-2 border-black p-6 flex gap-4 items-start bg-[#FFE600] shadow-[5px_5px_0px_0px_#000] text-black">
          <Scale className="w-6 h-6 text-black flex-shrink-0 mt-0.5 stroke-[2.5]" />
          <div className="text-xs sm:text-sm text-neutral-900 leading-relaxed font-bold">
            <strong className="text-black font-black block mb-1">IMPORTANT LEGAL NOTICE</strong>
            Please read these Terms of Service ("Terms") carefully before accessing or using the UpStore digital marketplace ("Platform"). These Terms constitute a binding legal agreement between you ("User" or "Licensee") and UpStore Digital Technologies Ltd. ("Company", "We", or "Us"). Accessing the platform implies irrevocable acceptance of these regulations.
          </div>
        </div>

        {/* Terms Sections */}
        <div className="space-y-6 text-xs sm:text-sm text-neutral-800 leading-relaxed font-bold">
          
          {/* Section 1 */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 select-none border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#06D6A0] border border-black rounded-sm inline-block" />
              1. Platform Admission & Account Security
            </h2>
            <div className="space-y-3">
              <p>
                1.1. <strong className="text-black">Eligibility:</strong> You must be at least eighteen (18) years of age or the age of legal majority in your jurisdiction to establish an account or purchase services. Any registration by unauthorized minors is strictly prohibited.
              </p>
              <p>
                1.2. <strong className="text-black">Account Integrity:</strong> Users are solely responsible for maintaining the confidentiality of their credentials. You agree to assume full administrative and civil liability for all transactions executed through your account.
              </p>
              <p>
                1.3. <strong className="text-black">Access Revocation:</strong> The Company reserves the absolute right to suspend, terminate, or restrict access to any account at its sole discretion, without prior notice, in the event of suspected platform abuse, credential sharing, or security breaches.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 select-none border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#FFE600] border border-black rounded-sm inline-block" />
              2. Digital License & Delivery Policy
            </h2>
            <div className="space-y-3">
              <p>
                2.1. <strong className="text-black">Scope of License:</strong> All purchases of subscriptions, game keys, tokens, or software licenses are delivered as a non-exclusive, non-transferable, revocable personal license. Commercial redistribution is strictly prohibited.
              </p>
              <p>
                2.2. <strong className="text-black">Delivery Parameters:</strong> Orders are registered in the User Dashboard immediately after payment validation. Credentials, license keys, or access details are delivered through the dashboard and, where applicable, to the registered email address once the order is fulfilled. The Company is not responsible for delays caused by network latencies, email spam filters, manual review, or system maintenance.
              </p>
              <p>
                2.3. <strong className="text-black">Product Lifespan & Warranty:</strong> Digital accounts and subscriptions carry a strict replacement warranty as indicated at checkout. Once a product warranty period expires, the Company has no obligation to replace or restore access to the digital asset.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 select-none border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#FF70A6] border border-black rounded-sm inline-block" />
              3. Anti-Fraud & Strict Refund Restrictions
            </h2>
            <div className="space-y-3">
              <p>
                3.1. <strong className="text-black">Finality of Sales:</strong> Due to the volatile and instantaneous nature of digital keys, accounts, and codes, <strong className="text-black">all transactions are final and non-refundable</strong> once delivery has been initiated. Refunds are only evaluated if a key or account is proven defective on arrival and supported by verifiable technical evidence.
              </p>
              <p>
                3.2. <strong className="text-black">Disputes and Chargebacks:</strong> Initiating an unauthorized chargeback or payment dispute with any payment provider will result in the immediate and permanent termination of your platform account. The Company reserves the right to report fraudulent chargeback actions to credit registries and international fraud databases.
              </p>
              <p>
                3.3. <strong className="text-black">Verification Checks:</strong> To maintain platform security, the Company utilizes automated risk scoring. We reserve the right to temporarily lock transactions for manual review or request identity verification documents in high-risk scenarios.
              </p>
            </div>
          </section>

          {/* Section 4 (Highlighted Referral rules) */}
          <section className="rounded-3xl border-2 border-black bg-[#4CC9F0] p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000] text-black">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 select-none border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-white border border-black rounded-sm inline-block" />
              4. Referral Program Guidelines & Anti-Abuse Rules
            </h2>
            <div className="space-y-3">
              <p>
                4.1. <strong className="text-black">Reward Trigger:</strong> The Referral Campaign awards wallet credits to the referrer only when the referred user registers a unique account and successfully completes their first purchase on the platform.
              </p>
              <p>
                4.2. <strong className="text-black">Verification and IP Constraints:</strong> To ensure the integrity of the referral program, the Company enforces strict security checks. Referral rewards will be disqualified automatically if:
              </p>
              <ul className="space-y-2 ps-2 text-xs font-black text-neutral-900">
                <li className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-black flex-shrink-0 stroke-[2.5]" />
                  <span>The referred account shares the same IP address or network subnet as the referrer.</span>
                </li>
                <li className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-black flex-shrink-0 stroke-[2.5]" />
                  <span>The system detects matching device fingerprints, hardware IDs, or browser fingerprints.</span>
                </li>
                <li className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-black flex-shrink-0 stroke-[2.5]" />
                  <span>The system flags emulators, virtual machines, proxy services, or VPNs utilized to spoof coordinates.</span>
                </li>
                <li className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-black flex-shrink-0 stroke-[2.5]" />
                  <span>Self-referrals are attempted using alternate email addresses.</span>
                </li>
              </ul>
              <p>
                4.3. <strong className="text-black">Disqualification:</strong> Disqualification decisions are processed by automated security protocols and audited by compliance officers. All disqualification actions are final and non-negotiable. Attempted manipulation of program parameters will lead to permanent wallet credit forfeiture and account bans.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 select-none border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#B892FF] border border-black rounded-sm inline-block" />
              5. Limitation of Liability & Warranties
            </h2>
            <div className="space-y-3">
              <p>
                5.1. <strong className="text-black">"As-Is" Provision:</strong> The Platform and all digital goods delivered through it are provided on an "as-is" and "as-available" basis without any express or implied warranties, including warranties of merchantability or fitness for a particular purpose.
              </p>
              <p>
                5.2. <strong className="text-black">Liability Ceiling:</strong> Under no circumstances shall UpStore Digital Technologies Ltd., its directors, or its affiliates be liable for any indirect, incidental, punitive, or consequential damages resulting from the use or inability to use delivered accounts. Our total liability is strictly limited to the purchasing price of the disputed item.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-4 shadow-[5px_5px_0px_0px_#000]">
            <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2 select-none border-b-2 border-black pb-3">
              <span className="w-2.5 h-4 bg-[#06D6A0] border border-black rounded-sm inline-block" />
              6. Governing Jurisdiction & Amendments
            </h2>
            <div className="space-y-3">
              <p>
                6.1. <strong className="text-black">Governing Law:</strong> These Terms and any transaction arising from platform access shall be governed and interpreted under the commercial statutes of the International Chamber of Commerce (ICC), without giving effect to conflicts of laws principles.
              </p>
              <p>
                6.2. <strong className="text-black">Amendments:</strong> The Company reserves the unilateral right to amend these Terms at any time. Your continued utilization of the Platform following amendments constitutes active compliance and agreement with the updated terms.
              </p>
            </div>
          </section>

        </div>

        {/* Footer legal note */}
        <div className="text-center mt-12 text-xs text-neutral-700 font-black select-none flex items-center justify-center gap-1.5 bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000]">
          <ShieldAlert className="w-4 h-4 text-black stroke-[2.5]" />
          <span>UPSTORE DIGITAL SECURITY AND COMPLIANCE DIVISION. © 2026. ALL RIGHTS RESERVED.</span>
        </div>

      </div>
    </main>
  );
}
