import React from 'react';
import { Star, Heart, ShoppingBag } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onSelectCategory?: (categorySlug: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onViewDetails,
  onBuyNow,
  onSelectCategory,
}) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const isLiked = isInWishlist(product.id);
  const discountPercent =
    product.mrp > product.sellingPrice
      ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
      : 0;

  return (
    <div
      id={`product-card-${product.id}`}
      className="bg-white rounded-2xl border border-[#E8E8E5] overflow-hidden flex flex-col justify-between group transition-all duration-200 hover:shadow-md hover:border-neutral-300"
    >
      {/* Thumbnail and Badges Container */}
      <div
        className="relative aspect-square overflow-hidden bg-[#FAFAF8] cursor-pointer p-2 flex items-center justify-center"
        onClick={() => onViewDetails(product)}
      >
        <img
          src={product.thumbnail || product.images[0]}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300"
        />

        {/* Sale / Promo Badge */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10 pointer-events-none">
          {product.badge ? (
            <span className="bg-[#FF5A36] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
              {product.badge}
            </span>
          ) : discountPercent > 0 ? (
            <span className="bg-[#FF5A36] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
              Sale
            </span>
          ) : null}
        </div>

        {/* Wishlist Heart Button */}
        <button
          id={`wishlist-toggle-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2.5 right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all z-10 cursor-pointer shadow-2xs ${
            isLiked
              ? 'bg-white text-[#FF5A36]'
              : 'bg-white/90 text-neutral-400 hover:text-[#FF5A36] hover:bg-white'
          }`}
          title={isLiked ? 'Remove from Wishlist' : 'Add to Wishlist'}
          aria-label="Toggle wishlist"
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? 'fill-[#FF5A36]' : ''}`} />
        </button>
      </div>

      {/* Product Content Details */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          {/* Category Tag */}
          {product.categoryName && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectCategory) {
                  onSelectCategory(product.categorySlug || product.categoryId);
                }
              }}
              className="text-[10px] font-bold text-[#FF5A36] hover:text-[#E54C29] uppercase tracking-wider block mb-1 text-left cursor-pointer transition-colors"
              title={`Filter by ${product.categoryName}`}
            >
              {product.categoryName}
            </button>
          )}

          {/* Title */}
          <h3
            onClick={() => onViewDetails(product)}
            className="font-medium text-xs sm:text-sm text-[#111111] line-clamp-1 hover:text-[#FF5A36] transition-colors cursor-pointer"
            title={product.title}
          >
            {product.title}
          </h3>

          {/* Star Rating */}
          <div className="flex items-center gap-1 text-[11px] sm:text-xs text-amber-500 font-semibold mt-1">
            <div className="flex items-center">
              <Star className="w-3 h-3 fill-current" />
            </div>
            <span>{product.rating.toFixed(1)}</span>
            <span className="text-[#6B6B6B] font-normal">({product.reviewCount || 124})</span>
          </div>
        </div>

        <div>
          {/* Pricing Row */}
          <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
            <span className="text-base sm:text-lg font-black text-[#111111]">
              ₹{product.sellingPrice}
            </span>
            {product.mrp > product.sellingPrice && (
              <span className="text-xs text-[#6B6B6B] line-through">₹{product.mrp}</span>
            )}
            {discountPercent > 0 && (
              <span className="text-xs font-bold text-[#FF5A36]">{discountPercent}% OFF</span>
            )}
          </div>

          {/* Add / Action Button */}
          <div className="mt-2.5">
            <button
              id={`add-to-cart-btn-${product.id}`}
              onClick={() => addToCart(product, 1, true)}
              className="w-full h-9 sm:h-10 bg-[#111111] hover:bg-[#FF5A36] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add to Cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
