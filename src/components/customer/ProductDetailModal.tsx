import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  ShoppingBag,
  Zap,
  CheckCircle2,
  MapPin,
  Heart,
  Share2,
  Minus,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Product, Review } from '../../types';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { api } from '../../lib/api';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onBuyNow: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onBuyNow,
}) => {
  if (!product) return null;

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews' | 'shipping'>('description');
  const [pincodeInput, setPincodeInput] = useState<string>('110001');
  const [pincodeStatus, setPincodeStatus] = useState<any>({
    serviceable: true,
    deliveryDays: '3–5 Days',
    courierPartner: 'Delhivery Express',
    message: 'Delivery available in 3–5 days to 110001',
  });
  const [checkingPin, setCheckingPin] = useState<boolean>(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewComment, setNewReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = useState<string>('');

  const isLiked = isInWishlist(product.id);
  const images = product.images && product.images.length > 0 ? product.images : [product.thumbnail];

  useEffect(() => {
    // Load product reviews
    api.getProduct(product.id).then((res) => {
      if (res.reviews) setReviews(res.reviews);
    }).catch(console.error);
  }, [product.id]);

  const handlePincodeCheck = async () => {
    if (!pincodeInput || pincodeInput.length !== 6) return;
    setCheckingPin(true);
    try {
      const res = await api.checkPincode(pincodeInput);
      setPincodeStatus(res);
    } catch (err: any) {
      setPincodeStatus({ serviceable: false, message: err.message || 'Invalid PIN code' });
    } finally {
      setCheckingPin(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      const res = await api.addReview({
        productId: product.id,
        rating: newReviewRating,
        title: 'Verified Customer Review',
        comment: newReviewComment,
      });
      setReviews((prev) => [res.review, ...prev]);
      setNewReviewComment('');
      setReviewSuccess('Thank you! Your verified review has been published.');
      setTimeout(() => setReviewSuccess(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const discountPercent =
    product.mrp > product.sellingPrice
      ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col border border-[#E8E8E5]">
        {/* Top Header Bar with Breadcrumb and Close */}
        <div className="px-5 py-3.5 border-b border-[#E8E8E5] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#6B6B6B] overflow-hidden">
            <span>Home</span>
            <span>&gt;</span>
            <span className="capitalize">{product.categoryName || 'Products'}</span>
            <span>&gt;</span>
            <span className="text-[#111111] font-semibold truncate max-w-[200px] sm:max-w-md">
              {product.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-[#6B6B6B] hover:text-[#111111] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-8 flex-1">
          {/* Main 2-Column Product Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-10 items-start">
            {/* Left: Gallery with Thumbnails */}
            <div className="md:col-span-6 flex flex-col sm:flex-row gap-3">
              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="flex sm:flex-col gap-2 order-2 sm:order-1 overflow-x-auto sm:overflow-y-auto max-h-[400px] no-scrollbar">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 overflow-hidden shrink-0 transition-all bg-[#FAFAF8] p-1 cursor-pointer ${
                        selectedImageIndex === idx
                          ? 'border-[#111111]'
                          : 'border-[#E8E8E5] hover:border-neutral-400'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {/* Main Active Image Showcase */}
              <div className="flex-1 aspect-square bg-[#FAFAF8] rounded-2xl border border-[#E8E8E5] p-4 flex items-center justify-center relative overflow-hidden order-1 sm:order-2">
                <img
                  src={images[selectedImageIndex] || product.thumbnail}
                  alt={product.title}
                  className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                />

                {/* Heart toggle on main image */}
                <button
                  onClick={() => toggleWishlist(product)}
                  className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-xs border border-[#E8E8E5] transition-all cursor-pointer ${
                    isLiked ? 'text-[#FF5A36]' : 'text-neutral-400 hover:text-[#FF5A36]'
                  }`}
                  title={isLiked ? 'Remove from wishlist' : 'Save to wishlist'}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF5A36]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Right: Product Information & Purchase Controls */}
            <div className="md:col-span-6 space-y-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#111111] leading-snug">
                  {product.title}
                </h2>

                {/* Rating & Reviews Count */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <span className="text-xs font-bold text-[#111111]">{product.rating.toFixed(1)}</span>
                  <span className="text-xs text-[#6B6B6B]">
                    ({product.reviewCount || 128} reviews)
                  </span>
                </div>
              </div>

              {/* Price Block */}
              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#111111]">
                  ₹{product.sellingPrice}
                </span>
                {product.mrp > product.sellingPrice && (
                  <span className="text-sm sm:text-base text-[#6B6B6B] line-through">
                    ₹{product.mrp}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-xs sm:text-sm font-bold text-[#FF5A36] bg-[#FFF1EE] px-2.5 py-0.5 rounded-full">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              {/* In Stock Badge */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>In Stock • Ready to dispatch from Surat warehouse</span>
              </div>

              {/* Pincode Availability Checker */}
              <div className="p-3.5 bg-[#FAFAF8] rounded-2xl border border-[#E8E8E5] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#111111]">Delivery Availability:</span>
                  <span className="text-neutral-500">Free over ₹499</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit PIN"
                    className="flex-1 bg-white border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs font-semibold text-[#111111] focus:border-[#111111] outline-hidden"
                  />
                  <button
                    onClick={handlePincodeCheck}
                    disabled={checkingPin || pincodeInput.length !== 6}
                    className="h-9 px-4 bg-[#111111] hover:bg-neutral-800 disabled:bg-neutral-300 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    {checkingPin ? 'Checking...' : 'Check'}
                  </button>
                </div>
                {pincodeStatus && (
                  <p className="text-[11px] text-[#6B6B6B] pt-0.5 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-[#111111]" />
                    <span>{pincodeStatus.message || `Delivery in 3–5 days to ${pincodeInput}`}</span>
                  </p>
                )}
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#111111]">Quantity:</span>
                <div className="flex items-center border border-[#E8E8E5] rounded-xl bg-[#FAFAF8] overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 flex items-center justify-center hover:bg-neutral-200 text-neutral-700 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-xs font-bold text-[#111111]">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-neutral-200 text-neutral-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons: [ ADD TO CART ] (coral #FF5A36) and [ BUY NOW ] (black #111111) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  id="modal-add-to-cart-btn"
                  onClick={() => {
                    addToCart(product, quantity, true);
                    onClose();
                  }}
                  className="h-12 bg-[#FF5A36] hover:bg-[#E54C29] text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-xs"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>ADD TO CART</span>
                </button>

                <button
                  id="modal-buy-now-btn"
                  onClick={() => {
                    addToCart(product, quantity, false);
                    onClose();
                    onBuyNow(product);
                  }}
                  className="h-12 bg-[#111111] hover:bg-neutral-800 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-xs"
                >
                  <Zap className="w-4 h-4" />
                  <span>BUY NOW</span>
                </button>
              </div>

              {/* Trust Reassurance Strip */}
              <div className="pt-4 border-t border-[#E8E8E5] grid grid-cols-3 gap-2 text-center text-[11px] text-[#6B6B6B]">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#111111]" />
                  <span>Secure checkout</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <RotateCcw className="w-4 h-4 text-[#111111]" />
                  <span>Easy returns</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Truck className="w-4 h-4 text-[#111111]" />
                  <span>Delivery tracking</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Tabs: Description, Specifications, Reviews, Shipping & Returns */}
          <div className="pt-6 border-t border-[#E8E8E5]">
            <div className="flex items-center gap-4 sm:gap-8 border-b border-[#E8E8E5] overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('description')}
                className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'description'
                    ? 'text-[#111111] border-b-2 border-[#111111]'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('specifications')}
                className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'specifications'
                    ? 'text-[#111111] border-b-2 border-[#111111]'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                Specifications
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'reviews'
                    ? 'text-[#111111] border-b-2 border-[#111111]'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                Reviews ({reviews.length || product.reviewCount || 128})
              </button>
              <button
                onClick={() => setActiveTab('shipping')}
                className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'shipping'
                    ? 'text-[#111111] border-b-2 border-[#111111]'
                    : 'text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                Shipping & Returns
              </button>
            </div>

            {/* Tab Contents */}
            <div className="py-5 text-sm text-[#111111] leading-relaxed">
              {activeTab === 'description' && (
                <div className="space-y-4">
                  <p className="text-[#6B6B6B]">{product.description}</p>
                  {product.features && product.features.length > 0 && (
                    <div className="pt-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#111111] mb-2">Key Highlights</h4>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#6B6B6B]">
                        {product.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A36]"></span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'specifications' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E8E5]">
                    <span className="text-[#6B6B6B] block">Category</span>
                    <span className="font-bold text-[#111111]">{product.categoryName || 'General'}</span>
                  </div>
                  <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E8E5]">
                    <span className="text-[#6B6B6B] block">Weight</span>
                    <span className="font-bold text-[#111111]">{product.weightGrams ? `${product.weightGrams}g` : '350g'}</span>
                  </div>
                  <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E8E5]">
                    <span className="text-[#6B6B6B] block">Warranty</span>
                    <span className="font-bold text-[#111111]">6 Months Replacement Warranty</span>
                  </div>
                  <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E8E5]">
                    <span className="text-[#6B6B6B] block">Dispatch</span>
                    <span className="font-bold text-[#111111]">Within 24 Hours</span>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Submit Review Form */}
                  <form onSubmit={handleReviewSubmit} className="p-4 bg-[#FAFAF8] rounded-2xl border border-[#E8E8E5] space-y-3">
                    <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">Leave a Review</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#6B6B6B]">Your Rating:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            onClick={() => setNewReviewRating(star)}
                            className={`w-4 h-4 cursor-pointer ${
                              star <= newReviewRating ? 'text-amber-500 fill-current' : 'text-neutral-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      placeholder="Share your genuine experience with this product..."
                      className="w-full bg-white border border-[#E8E8E5] rounded-xl p-3 text-xs text-[#111111] focus:border-[#111111] outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingReview || !newReviewComment.trim()}
                      className="px-4 py-2 bg-[#111111] hover:bg-neutral-800 disabled:bg-neutral-300 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                    </button>
                    {reviewSuccess && (
                      <p className="text-xs text-emerald-600 font-semibold">{reviewSuccess}</p>
                    )}
                  </form>

                  {/* Reviews List */}
                  <div className="space-y-3">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="p-4 bg-white rounded-2xl border border-[#E8E8E5]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-[#111111]">{rev.userName || 'Verified Buyer'}</span>
                          <span className="text-[11px] text-[#6B6B6B]">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center text-amber-500 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < rev.rating ? 'fill-current' : 'text-neutral-200'}`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-[#6B6B6B]">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className="space-y-3 text-xs text-[#6B6B6B]">
                  <p>
                    We provide Pan-India express logistics through surface and air express networks (Delhivery, Bluedart, Xpressbees).
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Dispatched within 24–48 hours of payment confirmation.</li>
                    <li>Average metro transit: 2–3 business days. Rest of India: 4–6 days.</li>
                    <li>7-day return window from the date of physical delivery if defective or damaged.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
