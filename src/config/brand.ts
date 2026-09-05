/**
 * Centralized Brand Configuration
 * Keeps brand identity, logos, colors, contact details, and UPI credentials
 * fully configurable so the brand name or visual tokens can be modified in one place.
 */

export interface BrandConfig {
  brandName: string;          // e.g. "Shoply."
  brandNameShort: string;     // e.g. "Shoply"
  logoDotColor: string;       // e.g. "#FF5A36" (Primary accent)
  tagline: string;            // e.g. "Good stuff. Better prices."
  subtagline: string;         // e.g. "Everyday products, smart finds, and little things worth buying."
  supportEmail: string;       // e.g. "support@shoply.in"
  supportPhone: string;       // e.g. "+91 82350 58525"
  upiId: string;              // e.g. "8235058525@sbi"
  upiMerchantName: string;    // e.g. "Shoply India"
  currencySymbol: string;     // e.g. "₹"
  currencyCode: string;       // e.g. "INR"
  legalEntity: string;        // e.g. "Shoply Technologies India Pvt. Ltd."
  freeShippingThreshold: number; // e.g. 499
  standardShippingFee: number;   // e.g. 40
  colors: {
    primary: string;          // #111111
    background: string;       // #FAFAF8
    cards: string;            // #FFFFFF
    borders: string;          // #E8E8E5
    mutedText: string;        // #6B6B6B
    primaryAccent: string;    // #FF5A36
    success: string;          // #198754
    warning: string;          // #F59E0B
    error: string;            // #DC3545
  };
}

export const BRAND_CONFIG: BrandConfig = {
  brandName: 'Shoply.',
  brandNameShort: 'Shoply',
  logoDotColor: '#FF5A36',
  tagline: 'Good stuff. Better prices.',
  subtagline: 'Everyday products, smart finds, and little things worth buying.',
  supportEmail: 'support@shoply.in',
  supportPhone: '+91 82350 58525',
  upiId: '8235058525@sbi',
  upiMerchantName: 'Shoply',
  currencySymbol: '₹',
  currencyCode: 'INR',
  legalEntity: 'Shoply Technologies India Pvt. Ltd.',
  freeShippingThreshold: 499,
  standardShippingFee: 40,
  colors: {
    primary: '#111111',
    background: '#FAFAF8',
    cards: '#FFFFFF',
    borders: '#E8E8E5',
    mutedText: '#6B6B6B',
    primaryAccent: '#FF5A36',
    success: '#198754',
    warning: '#F59E0B',
    error: '#DC3545',
  },
};
