import React from 'react';
import { User, Package, Heart, ShieldCheck, MapPin, Phone, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BRAND_CONFIG } from '../../config/brand';

interface AccountViewProps {
  onNavigate: (view: 'store' | 'orders' | 'wishlist' | 'account') => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
      {/* Account Profile Header */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] flex items-center justify-center text-[#111111]">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111111]">{user?.name || 'Rahul Kumar'}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B6B6B] mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {user?.email || 'rahul@example.com'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {user?.phone || '+91 98765 43210'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#FFF1EE] text-[#FF5A36] text-xs font-bold rounded-full">
              Verified Buyer
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Orders Card */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-white rounded-2xl border border-[#E8E8E5] p-5 hover:border-neutral-400 transition-all cursor-pointer flex items-center justify-between shadow-2xs hover:shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] flex items-center justify-center text-[#111111]">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#111111]">My Orders</h3>
              <p className="text-xs text-[#6B6B6B]">Track shipments and view past invoices</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#6B6B6B]" />
        </div>

        {/* Wishlist Card */}
        <div
          onClick={() => onNavigate('wishlist')}
          className="bg-white rounded-2xl border border-[#E8E8E5] p-5 hover:border-neutral-400 transition-all cursor-pointer flex items-center justify-between shadow-2xs hover:shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] flex items-center justify-center text-[#FF5A36]">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#111111]">Saved Wishlist</h3>
              <p className="text-xs text-[#6B6B6B]">Products you saved for later</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#6B6B6B]" />
        </div>
      </div>

      {/* Default Delivery Address */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5]">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#FF5A36]" />
            <h3 className="font-bold text-sm text-[#111111]">Primary Shipping Address</h3>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            Default
          </span>
        </div>
        <div className="text-xs text-[#6B6B6B] space-y-1">
          <p className="font-bold text-[#111111]">{user?.name || 'Rahul Kumar'}</p>
          <p>House No. 120, Street 4, Laxmi Nagar</p>
          <p>Near Metro Station, New Delhi - 110092, Delhi, India</p>
          <p>Phone: +91 98765 43210</p>
        </div>
      </div>

      {/* Storefront Navigation */}
      <div className="bg-[#FAFAF8] rounded-3xl border border-[#E8E8E5] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#111111]" />
          <h3 className="font-bold text-sm text-[#111111]">Storefront</h3>
        </div>
        <p className="text-xs text-[#6B6B6B]">
          Jump back to the customer storefront to continue shopping.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate('store')}
            className="h-10 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-[#111111] text-white shadow-xs"
          >
            Browse Storefront
          </button>
        </div>
      </div>
    </div>
  );
};
