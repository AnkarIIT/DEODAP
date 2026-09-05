import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, ArrowRight, X, Clock } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand';

interface OrderSuccessModalProps {
  order: any;
  onClose: () => void;
  onTrackOrder: (orderId: string) => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onTrackOrder,
}) => {
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF5A36', '#111111', '#198754', '#FFAA00'],
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  }, []);

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden my-8 p-6 text-center border border-[#E8E8E5] animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-100 text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#FFF1EE] text-[#FF5A36] flex items-center justify-center mx-auto mb-4 border border-[#FFD9D0]">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-[#111111] mb-1">
          Order Placed Successfully!
        </h2>
        <p className="text-xs text-[#6B6B6B] mb-5">
          Thank you for shopping with {BRAND_CONFIG.brandNameShort}. Your order is being packed.
        </p>

        {/* Order Details Card */}
        <div className="bg-[#FAFAF8] rounded-2xl p-4 border border-[#E8E8E5] text-left text-xs space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-[#6B6B6B]">Order Number</span>
            <span className="font-mono font-bold text-[#111111]">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B6B6B]">Payment Mode</span>
            <span className="font-bold text-[#111111]">
              {order.paymentMethod === 'UPI_MANUAL' ? 'UPI Scan & Pay' : 'Online Gateway'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B6B6B]">Total Amount</span>
            <span className="font-bold text-[#111111]">₹{order.totalAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B6B6B]">Estimated Dispatch</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Within 24 Hours</span>
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="space-y-2">
          <button
            onClick={() => {
              onClose();
              onTrackOrder(order.id);
            }}
            className="w-full h-12 bg-[#111111] hover:bg-neutral-800 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98"
          >
            <span>Track Order Status</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full h-11 bg-white hover:bg-neutral-50 text-[#111111] border border-[#E8E8E5] rounded-xl font-bold text-xs transition-all cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};
