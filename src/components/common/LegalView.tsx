import React from 'react';
import { ArrowLeft, ScrollText, ShieldCheck, RotateCcw, Truck, Building2, UserCheck } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand';

export type LegalSection = 'about' | 'terms' | 'privacy' | 'refund' | 'shipping';

interface LegalViewProps {
  initialSection?: LegalSection;
  onNavigate: (view: 'store' | 'orders' | 'wishlist' | 'account' | 'legal') => void;
}

interface PolicySection {
  id: LegalSection;
  label: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

const legalEntity = BRAND_CONFIG.legalEntity;
const supportEmail = BRAND_CONFIG.supportEmail;
const supportPhone = BRAND_CONFIG.supportPhone;

export const LegalView: React.FC<LegalViewProps> = ({ initialSection = 'about', onNavigate }) => {
  const [active, setActive] = React.useState<LegalSection>(initialSection);

  React.useEffect(() => {
    setActive(initialSection);
  }, [initialSection]);

  const sections: PolicySection[] = [
    {
      id: 'about',
      label: 'About Us',
      icon: <Building2 className="w-3.5 h-3.5" />,
      title: `About ${BRAND_CONFIG.brandNameShort}`,
      content: (
        <div className="space-y-4">
          <p>
            {BRAND_CONFIG.brandNameShort} is an Indian online retail brand built to bring everyday products,
            smart finds, and little things worth buying directly to modern Indian households. We operate on a
            direct-to-customer model powered by {BRAND_CONFIG.brandNameShort}&apos;s own catalogue engine, serving
            verified product catalogues with straightforward, warehouse-driven pricing.
          </p>
          <p>
            Our philosophy is simple: {BRAND_CONFIG.tagline?.toLowerCase().startsWith('good') ? BRAND_CONFIG.tagline : 'Good stuff. Better prices.'}{' '}
            We curate products across home &amp; kitchen, electronics, lifestyle, and everyday essentials, and
            ship them from our warehouse hub in Gujarat at transparent prices — no hidden fees, no inflated
            showroom markups.
          </p>
          <h3 className="font-bold text-sm text-[#111111] pt-2">Who We Are</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Retail brand, platform and technology team based in India, servicing nationwide pin-code delivery.</li>
            <li>Products curated and verified before publishing to storefront — quality and margin filtered.</li>
            <li>Payments handled via secure NPCI UPI flows and Cash on Delivery where available.</li>
            <li>Customer support on chat and phone during business hours.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">Business Details</h3>
          <div className="rounded-2xl border border-[#E8E8E5] bg-[#FAFAF8] p-4 text-xs space-y-2">
            <p><strong className="text-[#111111]">Legal Entity:</strong> {legalEntity}</p>
            <p><strong className="text-[#111111]">Warehouse Hub:</strong> Surat B2B Logistics Corridor, Surat, Gujarat, India</p>
            <p><strong className="text-[#111111]">Registered business address:</strong> {legalEntity}, Surat, Gujarat, India</p>
            <p><strong className="text-[#111111]">Email:</strong> {supportEmail}</p>
            <p><strong className="text-[#111111]">Phone:</strong> {supportPhone} (10am – 7pm IST)</p>
          </div>
          <h3 className="font-bold text-sm text-[#111111] pt-2">Grievance Officer</h3>
          <p>
            As required under the Consumer Protection (E-Commerce) Rules, 2020, any customer complaints or
            grievances may be addressed to our designated Grievance Officer:
          </p>
          <div className="rounded-2xl border border-[#E8E8E5] bg-[#FAFAF8] p-4 text-xs space-y-1.5">
            <p><strong className="text-[#111111]">Grievance Officer:</strong> Customer Experience Lead</p>
            <p><strong className="text-[#111111]">Email:</strong> {supportEmail}</p>
            <p><strong className="text-[#111111]">Phone:</strong> {supportPhone}</p>
            <p><strong className="text-[#111111]">Resolution commitment:</strong> acknowledged within 48 hours and resolved within the timelines prescribed by law.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'terms',
      label: 'Terms & Conditions',
      icon: <ScrollText className="w-3.5 h-3.5" />,
      title: 'Terms & Conditions',
      content: (
        <div className="space-y-4">
          <p>
            These Terms &amp; Conditions govern your use of the {BRAND_CONFIG.brandNameShort} website, mobile
            experience, and all products purchased through it. By accessing the storefront or placing an order,
            you agree to be bound by these terms.
          </p>
          <h3 className="font-bold text-sm text-[#111111] pt-2">1. Eligibility &amp; Account</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>You must be at least 18 years old, or have consent of a parent or guardian, to place an order.</li>
            <li>Account information (name, phone, email, delivery address) must be accurate and kept current.</li>
            <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">2. Products, Pricing &amp; Offers</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>All prices are listed in INR ({BRAND_CONFIG.currencySymbol}) and include applicable display pricing; taxes are applied at checkout as applicable.</li>
            <li>Free shipping is provided on orders of {BRAND_CONFIG.currencySymbol}{BRAND_CONFIG.freeShippingThreshold} or more; otherwise a standard shipping fee of {BRAND_CONFIG.currencySymbol}{BRAND_CONFIG.standardShippingFee} applies.</li>
            <li>Deals, discounts and coupons are subject to the specific terms communicated with each offer and may be withdrawn any time.</li>
            <li>While we work to keep catalogue data accurate, minor differences in colour, finish or imagery are possible and not grounds for dispute.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">3. Orders &amp; Acceptance</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>An order is placed when you complete checkout; it is accepted once our system confirms it and creates an order number.</li>
            <li>We reserve the right to cancel any order for reasons including suspected fraud, pricing errors, or stock unavailability, with a full refund where payment was collected.</li>
            <li>Order statuses — from &ldquo;Payment Pending&rdquo; through &ldquo;Paid&rdquo;, &ldquo;Processing&rdquo;, &ldquo;Shipped&rdquo; and &ldquo;Delivered&rdquo; — are reflected in your account and tracking timeline.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">4. Payment &amp; Cancellation</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>We accept UPI (Google Pay, PhonePe, Paytm) and Cash on Delivery where the product allows COD.</li>
            <li>For UPI orders, an NPCI QR code is generated; you confirm payment by submitting the UTR reference, and we verify it manually before confirming the order.</li>
            <li>Orders may be cancelled before dispatch. Refunds for cancelled or unfulfilled paid orders are initiated within 3–5 working days to the original payment method.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">5. Limitation of Liability</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To the maximum extent permitted by law, {BRAND_CONFIG.brandNameShort}&apos;s aggregate liability for any claim is limited to the amount paid by you for the relevant order.</li>
            <li>We are not liable for delays caused by courier partners, natural events, strikes or circumstances beyond our reasonable control.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">6. Governing Law</h3>
          <p>
            These terms are governed by the laws of India. Any disputes shall be subject to the exclusive
            jurisdiction of the courts at Surat, Gujarat.
          </p>
        </div>
      ),
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      title: 'Privacy Policy',
      content: (
        <div className="space-y-4">
          <p>
            At {BRAND_CONFIG.brandNameShort}, we respect your privacy. This policy explains what personal data
            we collect, why we collect it, and how we protect it, in line with the Information Technology Act,
            2000 and the IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or
            Information) Rules, 2011.
          </p>
          <h3 className="font-bold text-sm text-[#111111] pt-2">1. What We Collect</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Account details: name, email, phone number and password (stored encrypted).</li>
            <li>Order details: delivery address, order items, payment method and transaction references.</li>
            <li>Device &amp; usage: basic technical information required for security, rate-limiting and improving the storefront.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">2. How We Use It</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To process and deliver your orders, verify payments and handle returns.</li>
            <li>To communicate order status, support responses and service notifications.</li>
            <li>To prevent fraud and maintain a secure platform.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">3. What We Do NOT Do</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>We never store your UPI PIN, card numbers or bank credentials. Payment happens through secure NPCI/aggregator flows only.</li>
            <li>We never sell or rent your personal information to third parties.</li>
            <li>We do not use automated credit scoring on your personal data.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">4. Data Retention &amp; Security</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Data is stored in secured, access-controlled databases with encrypted session tokens.</li>
            <li>We retain data only as long as needed for order, legal and accounting obligations, after which it is securely deleted or anonymised.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">5. Third-Party Services</h3>
          <p>
            We use trusted service providers for hosting, payments and delivery. These partners receive only the
            data necessary to perform their function and are bound by confidentiality obligations.
          </p>
          <h3 className="font-bold text-sm text-[#111111] pt-2">6. Your Rights</h3>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time by writing to{' '}
            {supportEmail}. We respond to verified requests within 30 days.
          </p>
        </div>
      ),
    },
    {
      id: 'refund',
      label: 'Refund & Returns',
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      title: 'Refund & Return Policy',
      content: (
        <div className="space-y-4">
          <p>
            We want you to be happy with your purchase. If something is not right, you can raise a return request
            quickly from your order page.
          </p>
          <h3 className="font-bold text-sm text-[#111111] pt-2">1. Return Window</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Eligible for <strong className="text-[#111111]">7 calendar days</strong> from the date of delivery.</li>
            <li>Returns are available for delivered orders only; orders still in transit must first be received.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">2. What Can Be Returned</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Damaged, defective, or incorrect items received.</li>
            <li>Items where packaging is visibly tampered and contents damaged.</li>
            <li>Not eligible: products used, washed, altered, or missing their original packaging/free items.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">3. How to Raise a Return</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Go to &ldquo;My Orders&rdquo; → select your order → &ldquo;Request Return&rdquo;.</li>
            <li>Choose the reason, add details, and submit. You will receive an update from support.</li>
            <li>Our team reviews each request; approved requests qualify for a reverse pickup or self-ship as communicated.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">4. Refunds</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>After the item is received and quality-checked, refunds are initiated to the original payment method.</li>
            <li>UPI payments are refunded to the same UPI handle; COD orders are refunded via UPI/bank transfer after verification of your details.</li>
            <li>Refunds generally settle within <strong className="text-[#111111]">2–7 working days</strong> depending on your bank.</li>
            <li>If a refund is rejected, our team will reach out with a clear reason.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'shipping',
      label: 'Cancellation & Shipping',
      icon: <Truck className="w-3.5 h-3.5" />,
      title: 'Cancellation & Shipping Policy',
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-[#111111] pt-2">1. Shipping &amp; Delivery</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>We ship across India through our logistics partners.</li>
            <li><strong className="text-[#111111]">Free shipping</strong> on orders of {BRAND_CONFIG.currencySymbol}{BRAND_CONFIG.freeShippingThreshold} or more; otherwise a flat fee of {BRAND_CONFIG.currencySymbol}{BRAND_CONFIG.standardShippingFee} applies.</li>
            <li>Estimated delivery windows are shown at checkout. Delivery times may vary by pin-code, remote locations and courier partner performance.</li>
            <li>Delivery attempts follow the courier partner&apos;s policy; failed deliveries may be retried or returned, subject to charges.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">2. Order Processing</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Orders are processed once payment is confirmed (UPI verification approved, or COD accepted).</li>
            <li>Dispatch usually occurs within the timeline shown in your tracking timeline after order confirmation.</li>
            <li>Track every milestone — placed, paid, processing, shipped, out for delivery, delivered — from &ldquo;My Orders&rdquo;.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">3. Cancellation</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>You may cancel an order from your order page <strong className="text-[#111111]">before it is dispatched</strong>.</li>
            <li>Once shipped, cancellation is handled via our return process after delivery instead.</li>
            <li>We may cancel orders in case of stock unavailability, pricing errors or suspected fraud — with a full refund where a payment was collected.</li>
            <li>For paid orders cancelled before dispatch, refunds are initiated within 3–5 working days to the original payment method.</li>
          </ul>
          <h3 className="font-bold text-sm text-[#111111] pt-2">4. Delivery Issues &amp; Support</h3>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Wrong or damaged delivery? Raise a return request or contact support at {supportEmail} / {supportPhone}.</li>
            <li>In case of disputes not resolved to your satisfaction, you may escalate through our Grievance Officer as listed in About Us.</li>
          </ul>
        </div>
      ),
    },
  ];

  const activeSection = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
      {/* Back + Title */}
      <div className="flex items-center justify-between gap-4 pb-4">
        <button
          onClick={() => onNavigate('store')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Store
        </button>
        <span className="text-[11px] font-semibold text-[#6B6B6B] bg-white border border-[#E8E8E5] px-2.5 py-0.5 rounded-full">
          Last updated: Sept 2026
        </span>
      </div>

      {/* Section pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-5">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
              active === s.id
                ? 'bg-[#111111] text-white shadow-2xs'
                : 'bg-white border border-[#E8E8E5] text-[#111111] hover:border-neutral-400'
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] shadow-xs">
        <div className="px-6 sm:px-10 py-6 sm:py-8 border-b border-[#E8E8E5] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] flex items-center justify-center text-[#111111]">
            {activeSection.icon}
          </div>
          <h1 className="text-lg sm:text-xl font-black text-[#111111] tracking-tight">
            {activeSection.title}
          </h1>
        </div>
        <div className="px-6 sm:px-10 py-6 sm:py-8 text-xs sm:text-[13px] text-[#6B6B6B] leading-relaxed">
          {activeSection.content}
        </div>
      </div>

      {/* Contact strip */}
      <div className="mt-5 rounded-3xl border border-[#E8E8E5] bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#6B6B6B]">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFF1EE] flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-[#FF5A36]" />
          </div>
          <div>
            <p className="font-bold text-[#111111]">Need help with an order or policy?</p>
            <p className="mt-0.5">
              Write to us at <a className="text-[#FF5A36] font-semibold" href={`mailto:${supportEmail}`}>{supportEmail}</a> or call{' '}
              <span className="font-semibold text-[#111111]">{supportPhone}</span> (10am – 7pm IST).
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('orders')}
          className="h-10 px-5 rounded-xl bg-[#111111] text-white text-xs font-bold transition-colors hover:bg-neutral-800 cursor-pointer shrink-0"
        >
          Go to My Orders
        </button>
      </div>
    </div>
  );
};

