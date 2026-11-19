import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  FileText,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export const PrivacyPolicy = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-slate-800 font-sans pb-12">
      {/* Top Navbar */}
      <header className="bg-[#061944] text-white border-b border-[#1B2A5E] sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center space-x-1.5 text-xs font-bold"
              title="Return to Login"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center flex-shrink-0 shadow-xs">
              <img src="/logo.png" alt="Athahar Roadways" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black tracking-wide uppercase text-white leading-tight">
                ATHAHAR ROADWAYS
              </h1>
              <p className="text-[10px] text-[#FF8A00] font-black tracking-wider uppercase">
                Privacy Policy &bull; Legal Compliance
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Copy public link to share"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-200" />
                  <span className="hidden sm:inline">Copy Link</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-[#3956D4] hover:bg-[#2D3661] text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Print Privacy Policy or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Hero Card */}
        <div className="bg-gradient-to-r from-[#061944] via-[#102256] to-[#2D3661] text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-900/40 relative overflow-hidden">
          <div className="h-1 highway-accent-line absolute top-0 left-0 right-0" />
          <div className="flex items-center space-x-2 text-[10px] sm:text-xs font-mono font-black uppercase text-[#FF8A00] tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>OFFICIAL PRIVACY POLICY &bull; CLOUD TRANSPORT ERP</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            Privacy Policy &amp; Terms of Data Protection
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 font-medium mt-2 max-w-2xl leading-relaxed">
            This Privacy Policy governs the manner in which <strong>ATHAHAR ROADWAYS</strong> collects, uses, protects, and discloses information gathered from logistics clients, fleet operators, drivers, consignors, consignees, and terminal users.
          </p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-4 pt-4 border-t border-white/10 text-xs text-blue-200/80 font-mono">
            <span><strong>Effective Date:</strong> November 2026</span>
            <span>&bull;</span>
            <span><strong>Last Updated:</strong> 19 November 2026</span>
            <span>&bull;</span>
            <span><strong>Jurisdiction:</strong> Sangli, Maharashtra, India</span>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-sm border border-[#E1E5EE] space-y-8 text-sm leading-relaxed text-slate-700">
          {/* Section 1 */}
          <section className="space-y-3">
            <h3 className="text-lg font-black text-[#061944] uppercase tracking-wide flex items-center space-x-2">
              <span className="w-2 h-5 bg-[#3956D4] rounded-sm"></span>
              <span>1. Introduction &amp; Corporate Identity</span>
            </h3>
            <p>
              <strong>ATHAHAR ROADWAYS</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates transport godowns, freight forwarding terminals, and the enterprise logistics operating platform headquartered at <strong>Next to Parvati Crane, Vakhar Bhag, Sangli - 416416, Maharashtra</strong>.
            </p>
            <p>
              We are committed to safeguarding the privacy and operational confidentiality of our commercial consignors, consignees, vehicle owners, drivers, and software operators.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h3 className="text-lg font-black text-[#061944] uppercase tracking-wide flex items-center space-x-2">
              <span className="w-2 h-5 bg-[#3956D4] rounded-sm"></span>
              <span>2. Information We Collect</span>
            </h3>
            <p>
              In order to provide transportation, inward storage, cross stock-out, and outward delivery services, we collect and process the following operational information:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs sm:text-sm text-slate-600">
              <li>
                <strong>Consignment &amp; Lorry Receipt (LR) Details:</strong> Lorry receipt numbers, date of dispatch, destination stations (CT To), package counts, product weight, freight amounts (To Pay, Paid, T.B.B.), and commercial invoice references.
              </li>
              <li>
                <strong>Consignor &amp; Consignee Data:</strong> Business names, trade addresses, telephone numbers, and delivery point contacts.
              </li>
              <li>
                <strong>Fleet &amp; Driver Records:</strong> Vehicle registration numbers, driver names, phone numbers, driving license credentials, and vehicle owner information for trip assignment and security verification.
              </li>
              <li>
                <strong>Terminal Operator Credentials:</strong> Operator email address, account display names, login session tokens, and role permissions authenticated securely via Firebase Authentication.
              </li>
              <li>
                <strong>Operational Expenses &amp; Financial Vouchers:</strong> Diesel/fuel bills, garage maintenance receipts, local cartage, and hamali charges recorded for internal terminal bookkeeping.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h3 className="text-lg font-black text-[#061944] uppercase tracking-wide flex items-center space-x-2">
              <span className="w-2 h-5 bg-[#3956D4] rounded-sm"></span>
              <span>3. How We Use Collected Information</span>
            </h3>
            <p>The information collected is used exclusively for legitimate business and logistics purposes, including:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs sm:text-sm text-slate-600">
              <li>Generating Lorry Receipts (LRs), inward arrivals manifests, and outward gate passes.</li>
              <li>Warehouse inventory management and real-time godown pending stock tracking.</li>
              <li>Reconciling freight dues, agency commissions, and generating accounting registers.</li>
              <li>Communicating delivery alerts and dispatch updates with consignors and consignees.</li>
              <li>Preventing unauthorized terminal access, fraudulent claims, or lost consignment disputes.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h3 className="text-lg font-black text-[#061944] uppercase tracking-wide flex items-center space-x-2">
              <span className="w-2 h-5 bg-[#3956D4] rounded-sm"></span>
              <span>4. Data Security &amp; Storage</span>
            </h3>
            <p>
              We apply industry-standard technical, physical, and administrative safeguards to protect your records:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center space-x-2 text-[#061944] font-bold text-xs uppercase">
                  <Lock className="w-4 h-4 text-[#3956D4]" />
                  <span>Encrypted Transmission</span>
                </div>
                <p className="text-xs text-slate-600">
                  All platform communications are strictly encrypted using HTTPS/TLS protocols.
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center space-x-2 text-[#061944] font-bold text-xs uppercase">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Secure Firebase Cloud Infrastructure</span>
                </div>
                <p className="text-xs text-slate-600">
                  Data is managed on enterprise Google Cloud / Firebase platforms with granular access control rules.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h3 className="text-lg font-black text-[#061944] uppercase tracking-wide flex items-center space-x-2">
              <span className="w-2 h-5 bg-[#3956D4] rounded-sm"></span>
              <span>5. Third-Party Sharing &amp; Disclosure</span>
            </h3>
            <p>
              <strong>We do not sell, rent, trade, or monetize commercial client data to any external advertising or data brokerage networks.</strong>
            </p>
            <p className="text-xs sm:text-sm text-slate-600">
              Information is only shared with:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-xs sm:text-sm text-slate-600">
              <li>Authorized delivery partners and assigned drivers strictly for physical delivery completion.</li>
              <li>Government, tax, or law enforcement authorities when mandated under applicable Indian statutory laws (e.g., GST E-Way Bill checks, RTO compliance).</li>
              <li>Hosting and database cloud providers (Google Firebase &amp; Vercel) operating under strict confidentiality obligations.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h3 className="text-lg font-black text-[#061944] uppercase tracking-wide flex items-center space-x-2">
              <span className="w-2 h-5 bg-[#3956D4] rounded-sm"></span>
              <span>6. Data Retention &amp; User Rights</span>
            </h3>
            <p>
              Consignment records and financial vouchers are retained as required by Indian commercial transportation and accounting laws. Customers and registered business parties may contact us to review, update, or rectify any inaccuracies in their contact records.
            </p>
          </section>

          {/* Section 7 - Contact & Grievance */}
          <section className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-lg font-black text-[#061944] uppercase tracking-wide flex items-center space-x-2">
              <span className="w-2 h-5 bg-[#3956D4] rounded-sm"></span>
              <span>7. Contact Information &amp; Grievance Office</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              If you have any questions, concerns, or requests regarding this Privacy Policy or data handling practices, please contact our administrative desk:
            </p>

            <div className="bg-[#061944] text-white p-5 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 font-black text-sm uppercase text-[#FF8A00]">
                <Building2 className="w-4 h-4" />
                <span>ATHAHAR ROADWAYS &bull; HEADQUARTERS</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
                  <span>Next to Parvati Crane, Vakhar Bhag, Sangli - 416416, Maharashtra</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>+91 9370229449 / +91 9850329449</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>admin@athaharroadways.com</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 font-medium space-y-1">
          <p>&copy; 2026 ATHAHAR ROADWAYS. All rights reserved. Sangli Terminal Operating System.</p>
          <div className="flex items-center justify-center space-x-4 pt-1">
            <Link to="/login" className="text-[#3956D4] hover:underline font-bold">
              Sign In to Godown
            </Link>
            <span>&bull;</span>
            <button onClick={handleCopyLink} className="text-[#3956D4] hover:underline font-bold cursor-pointer">
              Copy Policy Link
            </button>
            <span>&bull;</span>
            <button onClick={handlePrint} className="text-[#3956D4] hover:underline font-bold cursor-pointer">
              Print Document
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
