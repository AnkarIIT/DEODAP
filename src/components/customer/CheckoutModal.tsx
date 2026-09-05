import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Truck,
  QrCode,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  CreditCard,
  MapPin,
  Lock,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Address } from '../../types';
import { BRAND_CONFIG } from '../../config/brand';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: any, paymentDetails?: any) => void;
}

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Gujarat',
  'Haryana',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal',
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onOrderSuccess }) => {
  const { items, subtotal, shippingFee, discount, totalAmount, appliedCoupon, clearCart } = useCart();
  const { user } = useAuth();

  const [fullName, setFullName] = useState(user?.name || 'Rahul Kumar');
  const [phone, setPhone] = useState(user?.phone || '9876543210');
  const [email, setEmail] = useState(user?.email || 'rahul@example.com');
  const [street, setStreet] = useState('House No. 120, Street 4, Laxmi Nagar');
  const [city, setCity] = useState('New Delhi');
  const [state, setState] = useState('Delhi');
  const [pincode, setPincode] = useState('110092');
  const [landmark, setLandmark] = useState('Near Metro Station');
  const [paymentMethod, setPaymentMethod] = useState<'UPI_MANUAL' | 'MOCK_GATEWAY'>('UPI_MANUAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName || !phone || !street || !pincode) {
      setErrorMsg('Please complete all delivery address fields.');
      return;
    }

    if (phone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (pincode.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const address: Address = {
        fullName,
        phone,
        street,
        city,
        state,
        pincode,
        landmark,
      };

      const orderPayload = {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        address,
        paymentMethod,
        couponCode: appliedCoupon?.code,
      };

      const res = await api.createOrder(orderPayload);
      clearCart();
      onClose();
      onOrderSuccess(res.order, res.payment);
    } catch (err: any) {
      setErrorMsg(err.message || 'Order creation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col border border-[#E8E8E5]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E8E5] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#FF5A36]" />
            <h2 className="font-bold text-[#111111] text-base sm:text-lg">
              Secure Checkout • {BRAND_CONFIG.brandNameShort}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper (1. Address -> 2. Delivery -> 3. Payment) */}
        <div className="bg-[#FAFAF8] px-5 py-3 border-b border-[#E8E8E5] flex items-center justify-center gap-3 sm:gap-6 text-xs font-semibold text-[#6B6B6B]">
          <span className="flex items-center gap-1.5 text-[#111111] font-bold">
            <span className="w-5 h-5 rounded-full bg-[#111111] text-white flex items-center justify-center text-[10px]">1</span>
            Address
          </span>
          <span className="text-[#E8E8E5]">&gt;</span>
          <span className="flex items-center gap-1.5 text-[#111111] font-bold">
            <span className="w-5 h-5 rounded-full bg-[#111111] text-white flex items-center justify-center text-[10px]">2</span>
            Delivery
          </span>
          <span className="text-[#E8E8E5]">&gt;</span>
          <span className="flex items-center gap-1.5 text-[#FF5A36] font-bold">
            <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white flex items-center justify-center text-[10px]">3</span>
            Payment (UPI)
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitOrder} className="overflow-y-auto p-5 sm:p-8 flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Address and Payment */}
            <div className="md:col-span-7 space-y-6">
              {/* Shipping Address Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-[#E8E8E5]">
                  <MapPin className="w-4 h-4 text-[#111111]" />
                  <h3 className="font-bold text-sm text-[#111111] uppercase tracking-wider">
                    Shipping Address
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Kumar"
                      className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:bg-white focus:border-[#111111] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile number"
                      className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:bg-white focus:border-[#111111] outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="For tracking updates & invoice"
                    className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:bg-white focus:border-[#111111] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">Street Address / House No. *</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="House / Flat No., Building, Street, Area"
                    className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:bg-white focus:border-[#111111] outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">PIN Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6 digits"
                      className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:bg-white focus:border-[#111111] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:bg-white focus:border-[#111111] outline-hidden"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-[#111111] mb-1">State *</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-2 py-2 text-xs font-medium text-[#111111] focus:bg-white focus:border-[#111111] outline-hidden"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection (NO COD - ONLY UPI & ONLINE) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b border-[#E8E8E5]">
                  <QrCode className="w-4 h-4 text-[#FF5A36]" />
                  <h3 className="font-bold text-sm text-[#111111] uppercase tracking-wider">
                    Payment Method
                  </h3>
                </div>

                {/* UPI Option (Recommended) */}
                <div
                  onClick={() => setPaymentMethod('UPI_MANUAL')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    paymentMethod === 'UPI_MANUAL'
                      ? 'border-[#FF5A36] bg-[#FFF1EE]/40'
                      : 'border-[#E8E8E5] hover:border-neutral-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'UPI_MANUAL'}
                    onChange={() => setPaymentMethod('UPI_MANUAL')}
                    className="mt-1 accent-[#FF5A36]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-[#111111]">
                        Instant UPI (GPay / PhonePe / Paytm / BHIM)
                      </span>
                      <span className="text-[10px] bg-[#FF5A36] text-white px-2 py-0.5 rounded-full font-bold">
                        FASTEST
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                      Pay directly via QR code or UPI ID: <strong className="text-[#111111]">{BRAND_CONFIG.upiId}</strong>. Zero convenience fees.
                    </p>
                  </div>
                </div>

                {/* Instant Card / Netbanking Simulation Option */}
                <div
                  onClick={() => setPaymentMethod('MOCK_GATEWAY')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    paymentMethod === 'MOCK_GATEWAY'
                      ? 'border-[#FF5A36] bg-[#FFF1EE]/40'
                      : 'border-[#E8E8E5] hover:border-neutral-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'MOCK_GATEWAY'}
                    onChange={() => setPaymentMethod('MOCK_GATEWAY')}
                    className="mt-1 accent-[#FF5A36]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-[#111111]">
                        Cards / Netbanking / Instant Simulation
                      </span>
                      <span className="text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full font-medium">
                        Instant
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                      Automated 1-click test checkout gateway for instant order confirmation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="md:col-span-5 bg-[#FAFAF8] rounded-2xl border border-[#E8E8E5] p-5 space-y-4">
              <h4 className="font-bold text-xs text-[#111111] uppercase tracking-wider pb-2 border-b border-[#E8E8E5]">
                Order Summary ({items.length} item{items.length > 1 ? 's' : ''})
              </h4>

              {/* Items preview list */}
              <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar divide-y divide-[#E8E8E5]/60">
                {items.map((it) => (
                  <div key={it.productId} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="font-bold text-[#111111]">{it.quantity}x</span>
                      <span className="truncate text-neutral-700">{it.productTitle}</span>
                    </div>
                    <span className="font-semibold text-[#111111] shrink-0">₹{it.unitPrice * it.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-2 border-t border-[#E8E8E5] text-xs text-[#6B6B6B]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#111111]">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>
                    {shippingFee === 0 ? (
                      <strong className="text-emerald-600">FREE</strong>
                    ) : (
                      <span className="font-semibold text-[#111111]">₹{shippingFee}</span>
                    )}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#FF5A36]">
                    <span>Coupon Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-[#111111] pt-2 border-t border-[#E8E8E5]">
                  <span>Total Payable</span>
                  <span className="text-[#FF5A36]">₹{totalAmount}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-[#111111] hover:bg-neutral-800 disabled:bg-neutral-400 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
              >
                {isSubmitting ? (
                  <span>Processing Order...</span>
                ) : (
                  <>
                    <span>{paymentMethod === 'UPI_MANUAL' ? 'Continue to UPI Payment' : 'Pay & Confirm Order'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center text-[11px] text-[#6B6B6B] flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Encrypted & Safe Payments</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
