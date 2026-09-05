import React from 'react';
import { Mail, Phone, MapPin, QrCode, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand';
import { LegalSection } from './LegalView';

interface FooterProps {
  onSelectCategory?: (slug: string) => void;
  onNavigate?: (view: 'store' | 'orders' | 'wishlist' | 'account' | 'legal') => void;
  onOpenLegal?: (section: LegalSection) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory, onNavigate, onOpenLegal }) => {
  return (
    <footer className="bg-white border-t border-[#E8E8E5] px-4 sm:px-8 pt-12 pb-24 md:pb-12 text-xs text-[#6B6B6B]">
      <div className="max-w-[1280px] mx-auto space-y-10">
        {/* 4 Columns Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Column 1: Brand Info */}
          <div className="md:col-span-4 space-y-3">
            <div className="flex items-center select-none">
              <span className="text-2xl font-black tracking-tight text-[#111111]">
                {BRAND_CONFIG.brandNameShort}
                <span style={{ color: BRAND_CONFIG.logoDotColor }}>.</span>
              </span>
            </div>
            <p className="text-sm font-semibold text-[#111111]">
              Good stuff. Better prices.
            </p>
            <p className="text-xs text-[#6B6B6B] leading-relaxed max-w-sm">
              Everyday products, smart finds, and little things worth buying. Made for modern Indian households with direct warehouse pricing and express delivery.
            </p>
          </div>

          {/* Column 2: Shop Links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#111111]">
              Shop
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate('store');
                    if (onSelectCategory) onSelectCategory('all');
                  }}
                  className="hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  All Products
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate('store');
                    if (onSelectCategory) onSelectCategory('electronics');
                  }}
                  className="hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Smart Gadgets
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate('store');
                    if (onSelectCategory) onSelectCategory('home-kitchen');
                  }}
                  className="hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Home & Kitchen
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate('store');
                    if (onSelectCategory) onSelectCategory('lifestyle');
                  }}
                  className="hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Lifestyle Finds
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate('store');
                    const dealsEl = document.getElementById('catalog-grid-header');
                    if (dealsEl) dealsEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-[#FF5A36] font-semibold text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Today's Deals
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Help & Support */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#111111]">
              Help & Support
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate('orders');
                  }}
                  className="hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Track Order
                </button>
              </li>
              <li>
                <span className="text-[#6B6B6B]">Free Shipping on Orders over ₹{BRAND_CONFIG.freeShippingThreshold}</span>
              </li>
              <li>
                <span className="text-[#6B6B6B]">7-Day Easy Replacement Policy</span>
              </li>
              <li>
                <span className="text-[#6B6B6B]">100% UPI & Online Payment Protection</span>
              </li>
              <li>
                <span className="text-[#6B6B6B]">FAQ & Help Center</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Company & Legal */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#111111]">
              Company
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onOpenLegal && onOpenLegal('about')}
                  className="hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal && onOpenLegal('privacy')}
                  className="hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal && onOpenLegal('terms')}
                  className="hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal && onOpenLegal('refund')}
                  className="hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Refund & Returns
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal && onOpenLegal('shipping')}
                  className="hover:text-[#FF5A36] transition-colors cursor-pointer"
                >
                  Cancellation & Shipping
                </button>
              </li>
            </ul>
          </div>

          {/* Column 5: Connect & Official Verification */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#111111]">
              Customer Care
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#111111]" />
                <a href={`mailto:${BRAND_CONFIG.supportEmail}`} className="hover:text-[#FF5A36] transition-colors">
                  {BRAND_CONFIG.supportEmail}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#111111]" />
                <span>{BRAND_CONFIG.supportPhone} (10am – 7pm)</span>
              </div>
              <div className="flex items-center gap-2">
                <QrCode className="w-3.5 h-3.5 text-[#FF5A36]" />
                <span>UPI ID: <strong className="text-[#111111]">{BRAND_CONFIG.upiId}</strong></span>
              </div>
              <div className="flex items-start gap-2 pt-1 text-[11px] text-[#6B6B6B]">
                <MapPin className="w-3.5 h-3.5 text-[#111111] shrink-0 mt-0.5" />
                <span>Warehouse Hub: Surat B2B Logistics Corridor, Gujarat, India</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods & Security Strip */}
        <div className="pt-6 border-t border-[#E8E8E5] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-[#6B6B6B]">
            <span className="mr-1 text-neutral-400">Accepted:</span>
            <span className="px-2.5 py-1 bg-[#FAFAF8] border border-[#E8E8E5] rounded-md text-[#111111]">UPI</span>
            <span className="px-2.5 py-1 bg-[#FAFAF8] border border-[#E8E8E5] rounded-md text-[#111111]">Google Pay</span>
            <span className="px-2.5 py-1 bg-[#FAFAF8] border border-[#E8E8E5] rounded-md text-[#111111]">PhonePe</span>
            <span className="px-2.5 py-1 bg-[#FAFAF8] border border-[#E8E8E5] rounded-md text-[#111111]">Paytm</span>
            <span className="px-2.5 py-1 bg-[#FAFAF8] border border-[#E8E8E5] rounded-md text-[#111111]">RuPay</span>
            <span className="px-2.5 py-1 bg-[#FAFAF8] border border-[#E8E8E5] rounded-md text-[#111111]">Visa</span>
            <span className="px-2.5 py-1 bg-[#FAFAF8] border border-[#E8E8E5] rounded-md text-[#111111]">Mastercard</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>

        {/* Bottom Copyright Notice */}
        <div className="text-center text-[11px] text-[#6B6B6B] pt-2">
          © {new Date().getFullYear()} {BRAND_CONFIG.legalEntity}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
