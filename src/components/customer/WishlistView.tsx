import React from 'react';
import { Heart, ShoppingBag, Zap, Trash2, ArrowRight } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { Product } from '../../types';

interface WishlistViewProps {
  onExploreProducts: () => void;
  onViewDetails: (product: Product) => void;
  onBuyNow: (product: Product) => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  onExploreProducts,
  onViewDetails,
  onBuyNow,
}) => {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (wishlist.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center px-4">
        <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-4 text-red-500">
          <Heart className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-gray-900 mb-1">Your Wishlist is Empty</h3>
        <p className="text-xs text-gray-500 mb-6">
          Save items you love to keep track of wholesale dropship price drops!
        </p>
        <button
          onClick={onExploreProducts}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full shadow-md shadow-indigo-600/20 transition-all text-xs cursor-pointer inline-flex items-center gap-2"
        >
          <span>Explore Trending Products</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Wishlist</h1>
          <p className="text-xs text-gray-500">Items you have bookmarked</p>
        </div>
        <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
          {wishlist.length} Items Saved
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {wishlist.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="relative aspect-square bg-gray-50 cursor-pointer" onClick={() => onViewDetails(product)}>
              <img
                src={product.thumbnail}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromWishlist(product.id);
                }}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/90 hover:bg-white text-red-500 shadow-xs cursor-pointer"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                  {product.categoryName}
                </p>
                <h3
                  onClick={() => onViewDetails(product)}
                  className="font-bold text-gray-800 text-xs line-clamp-2 hover:text-indigo-600 cursor-pointer mb-2"
                >
                  {product.title}
                </h3>
              </div>

              <div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-base font-black text-gray-900">₹{product.sellingPrice}</span>
                  {product.mrp > product.sellingPrice && (
                    <span className="text-xs text-gray-400 line-through">₹{product.mrp}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addToCart(product, 1, true)}
                    className="py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ShoppingBag className="w-3 h-3 text-gray-600" />
                    <span>Cart</span>
                  </button>
                  <button
                    onClick={() => onBuyNow(product)}
                    className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Buy</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
