import React from 'react';
import { Home, LayoutGrid, Tag, Package, User } from 'lucide-react';

interface MobileBottomNavProps {
  activeView: 'store' | 'orders' | 'wishlist' | 'account' | 'legal';
  setActiveView: (view: 'store' | 'orders' | 'wishlist' | 'account' | 'legal') => void;
  onOpenCategories?: () => void;
  onOpenDeals?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  setActiveView,
  onOpenCategories,
  onOpenDeals,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E8E8E5] md:hidden shadow-lg safe-area-pb">
      <div className="grid grid-cols-5 items-center h-14 max-w-md mx-auto px-2">
        {/* Home */}
        <button
          onClick={() => setActiveView('store')}
          className={`flex flex-col items-center justify-center py-1 cursor-pointer transition-colors ${
            activeView === 'store' ? 'text-[#FF5A36]' : 'text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Home</span>
        </button>

        {/* Categories */}
        <button
          onClick={() => {
            setActiveView('store');
            if (onOpenCategories) {
              onOpenCategories();
            } else {
              const el = document.getElementById('shop-by-category-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="flex flex-col items-center justify-center py-1 cursor-pointer text-[#6B6B6B] hover:text-[#111111] transition-colors"
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Categories</span>
        </button>

        {/* Deals */}
        <button
          onClick={() => {
            setActiveView('store');
            if (onOpenDeals) onOpenDeals();
            const el = document.getElementById('catalog-grid-header');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center justify-center py-1 cursor-pointer text-[#6B6B6B] hover:text-[#111111] transition-colors"
        >
          <Tag className="w-5 h-5 text-[#FF5A36]" />
          <span className="text-[10px] font-medium mt-0.5 text-[#FF5A36]">Deals</span>
        </button>

        {/* Orders */}
        <button
          onClick={() => setActiveView('orders')}
          className={`flex flex-col items-center justify-center py-1 cursor-pointer transition-colors ${
            activeView === 'orders' ? 'text-[#FF5A36]' : 'text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Orders</span>
        </button>

        {/* Account */}
        <button
          onClick={() => setActiveView('account')}
          className={`flex flex-col items-center justify-center py-1 cursor-pointer transition-colors ${
            activeView === 'account' ? 'text-[#FF5A36]' : 'text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Account</span>
        </button>
      </div>
    </nav>
  );
};
