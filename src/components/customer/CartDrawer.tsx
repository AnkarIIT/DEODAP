import React from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ShoppingBag,
  Tag,
  Truck,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { BRAND_CONFIG } from '../../config/brand';

interface CartDrawerProps {
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onCheckout }) => {
  const {
    items,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    subtotal,
    shippingFee,
    discount,
    totalAmount,
    appliedCoupon,
    couponCodeInput,
    setCouponCodeInput,
    couponError,
    applyCoupon,
    removeCoupon,
  } = useCart();

  if (!isCartOpen) return null;

  const totalItemCount = items.reduce((s, i) => s + i.quantity, 0);
  const remainingForFreeShipping = Math.max(0, BRAND_CONFIG.freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / BRAND_CONFIG.freeShippingThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-900/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#E8E8E5] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[#111111] text-lg">
              Your Cart ({totalItemCount})
            </h2>
          </div>
          <button
            id="cart-drawer-close-btn"
            onClick={closeCart}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className="bg-[#FAFAF8] px-5 py-2.5 border-b border-[#E8E8E5]">
          <div className="flex items-center justify-between text-xs font-semibold text-[#111111] mb-1.5">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-[#111111]" />
              {remainingForFreeShipping > 0 ? (
                <span>
                  Add <strong className="text-[#FF5A36]">₹{remainingForFreeShipping}</strong> more for <strong>FREE Delivery!</strong>
                </span>
              ) : (
                <span className="text-emerald-600 font-bold">🎉 You unlocked FREE Express Delivery!</span>
              )}
            </span>
            <span className="text-[10px] text-[#6B6B6B]">{freeShippingProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#E8E8E5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF5A36] transition-all duration-300"
              style={{ width: `${freeShippingProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 divide-y divide-[#E8E8E5]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#FAFAF8] border border-[#E8E8E5] flex items-center justify-center text-neutral-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111111]">Your cart is waiting.</h3>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  Add smart everyday finds and deals to your bag.
                </p>
              </div>
              <button
                onClick={closeCart}
                className="h-11 px-6 bg-[#111111] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-98"
              >
                START SHOPPING
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="pt-3 first:pt-0 flex gap-3 sm:gap-4 items-center">
                {/* Thumbnail */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] p-1.5 shrink-0 flex items-center justify-center">
                  <img
                    src={item.productThumbnail}
                    alt={item.productTitle}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold text-[#111111] truncate" title={item.productTitle}>
                    {item.productTitle}
                  </h4>
                  <div className="text-xs sm:text-sm font-bold text-[#111111] mt-0.5">
                    ₹{item.unitPrice}
                  </div>

                  {/* Quantity Stepper & Remove */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-[#E8E8E5] rounded-lg bg-[#FAFAF8] overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-neutral-200 text-neutral-600 cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-[#111111]">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-neutral-200 text-neutral-600 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-neutral-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Bottom / Summary Area */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-[#E8E8E5] bg-white space-y-3 shrink-0">
            {/* Promo Code Input */}
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Have a promo code?"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-[#111111] uppercase placeholder:normal-case placeholder:font-normal placeholder:text-[#6B6B6B] focus:border-[#111111] outline-hidden"
                  />
                </div>
                <button
                  onClick={() => applyCoupon(couponCodeInput)}
                  className="px-4 bg-[#111111] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {appliedCoupon && (
                <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  <span>Coupon <strong>{appliedCoupon.code}</strong> applied!</span>
                  <button onClick={removeCoupon} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
              )}
              {couponError && <p className="text-[11px] text-red-600">{couponError}</p>}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-[#6B6B6B] pt-1">
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
                  <span>Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#111111] pt-2 border-t border-[#E8E8E5]">
                <span>Total</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              id="cart-checkout-btn"
              onClick={() => {
                closeCart();
                onCheckout();
              }}
              className="w-full h-12 bg-[#111111] hover:bg-neutral-800 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-xs"
            >
              <span>Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Continue Shopping Link */}
            <div className="text-center pt-1">
              <button
                onClick={closeCart}
                className="text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] underline cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
