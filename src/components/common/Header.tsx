import React, { useState } from 'react';
import {
  ShoppingBag,
  Heart,
  Search,
  User,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Package,
  Menu,
  X,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { Category } from '../../types';
import { BRAND_CONFIG } from '../../config/brand';

interface HeaderProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categorySlug: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeView: 'store' | 'orders' | 'wishlist' | 'admin' | 'account';
  setActiveView: (view: 'store' | 'orders' | 'wishlist' | 'admin' | 'account') => void;
  onOpenDeals?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  activeView,
  setActiveView,
  onOpenDeals,
}) => {
  const { user, isAdmin, switchRole } = useAuth();
  const { totalQuantity, openCart } = useCart();
  const { wishlistCount } = useWishlist();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E8E8E5] transition-shadow">
      {/* Sleek Top Bar (Role Switcher + Express Delivery Ribbon) */}
      <div className="bg-[#111111] text-white text-[11px] sm:text-xs px-4 sm:px-8 py-1.5 transition-colors">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center space-x-3 text-neutral-300 overflow-x-auto no-scrollbar whitespace-nowrap">
            <span className="inline-flex items-center text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
              Fast Express Dispatch
            </span>
            <span className="hidden md:inline text-neutral-600">|</span>
            <span className="hidden md:inline-flex items-center gap-1 text-neutral-300">
              <Truck className="w-3.5 h-3.5 text-[#FF5A36]" /> Free Delivery over ₹{BRAND_CONFIG.freeShippingThreshold}
            </span>
            <span className="hidden md:inline text-neutral-600">|</span>
            <span className="hidden md:inline-flex items-center gap-1 text-neutral-300">
              <RotateCcw className="w-3.5 h-3.5 text-neutral-400" /> 7-Day Easy Returns
            </span>
          </div>

          {/* Quick Demo Switcher */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-neutral-400 text-[11px] hidden sm:inline">Role View:</span>
            <button
              id="header-switch-customer-btn"
              onClick={() => {
                if (user?.role !== 'CUSTOMER') switchRole('CUSTOMER');
                setActiveView('store');
              }}
              className={`px-2.5 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                activeView !== 'admin'
                  ? 'bg-[#FF5A36] text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              Customer Store
            </button>
            <button
              id="header-switch-admin-btn"
              onClick={() => {
                if (user?.role !== 'ADMIN') switchRole('ADMIN');
                setActiveView('admin');
              }}
              className={`px-2.5 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeView === 'admin'
                  ? 'bg-[#FF5A36] text-white shadow-xs'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-[#FF5A36]" />
              Admin Operations
              {user?.role === 'ADMIN' && (
                <span className="bg-emerald-500 text-[9px] px-1 rounded text-white font-bold ml-0.5">ACTIVE</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Desktop & Tablet Header */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-3">
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-1.5 -ml-1 text-neutral-800 hover:text-neutral-950 focus:outline-hidden cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Brand Logo / Wordmark */}
          <div
            id="brand-logo-btn"
            onClick={() => {
              setActiveView('store');
              onSelectCategory('all');
            }}
            className="flex items-center cursor-pointer select-none group shrink-0"
          >
            <span className="text-2xl sm:text-[28px] font-black tracking-tight text-[#111111] font-sans">
              {BRAND_CONFIG.brandNameShort}
              <span style={{ color: BRAND_CONFIG.logoDotColor }}>.</span>
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 text-sm font-semibold text-[#111111]">
            {/* Categories Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="flex items-center gap-1 py-1 hover:text-[#FF5A36] transition-colors cursor-pointer"
              >
                <span>Categories</span>
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              </button>

              {categoryDropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E8E8E5] py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setCategoryDropdownOpen(false)}
                >
                  <button
                    onClick={() => {
                      onSelectCategory('all');
                      setActiveView('store');
                      setCategoryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-neutral-50 transition-colors cursor-pointer ${
                      selectedCategory === 'all' ? 'text-[#FF5A36] bg-neutral-50' : 'text-[#111111]'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        onSelectCategory(cat.slug);
                        setActiveView('store');
                        setCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-neutral-50 transition-colors cursor-pointer ${
                        selectedCategory === cat.slug ? 'text-[#FF5A36] bg-neutral-50' : 'text-[#111111]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setActiveView('store');
                if (onOpenDeals) onOpenDeals();
                const dealsEl = document.getElementById('catalog-grid-header');
                if (dealsEl) dealsEl.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-[#FF5A36] transition-colors cursor-pointer flex items-center gap-1"
            >
              <Tag className="w-3.5 h-3.5 text-[#FF5A36]" />
              Deals
            </button>

            <button
              onClick={() => setActiveView('orders')}
              className="hover:text-[#FF5A36] transition-colors cursor-pointer"
            >
              Track Order
            </button>
          </div>

          {/* Desktop & Tablet Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-2 sm:mx-4 relative">
            <div className="relative flex items-center w-full">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
              <input
                id="global-search-input"
                type="text"
                placeholder="Search for products, gadgets, home essentials..."
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (activeView !== 'store') setActiveView('store');
                }}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-full py-2 pl-10 pr-9 text-xs sm:text-sm text-[#111111] placeholder:text-[#6B6B6B] focus:bg-white focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-all outline-hidden"
              />
              {searchQuery && (
                <button
                  id="clear-search-btn"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 p-1 text-neutral-400 hover:text-neutral-600 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Header Action Buttons (Wishlist, Account, Cart) */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            {/* Wishlist */}
            <button
              id="header-wishlist-btn"
              onClick={() => setActiveView('wishlist')}
              className="flex items-center justify-center p-1.5 text-neutral-700 hover:text-[#111111] transition-colors cursor-pointer relative"
              title="My Wishlist"
              aria-label="Wishlist"
            >
              <Heart
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
                  activeView === 'wishlist'
                    ? 'text-[#FF5A36] fill-[#FF5A36]'
                    : 'text-neutral-700 hover:text-[#111111]'
                }`}
              />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#FF5A36] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Account Link */}
            <button
              id="header-account-btn"
              onClick={() => setActiveView('account')}
              className="hidden sm:flex items-center gap-1.5 p-1.5 text-neutral-700 hover:text-[#111111] transition-colors cursor-pointer"
              title="My Account"
            >
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-700" />
            </button>

            {/* Cart Button */}
            <button
              id="header-cart-btn"
              onClick={openCart}
              className="flex items-center justify-center p-1.5 text-neutral-700 hover:text-[#111111] transition-colors cursor-pointer relative"
              title="Shopping Cart"
              aria-label="Cart"
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-800 hover:text-[#111111]" />
              {totalQuantity > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#FF5A36] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-xs">
                  {totalQuantity}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (Directly beneath main mobile header, exactly as requested) */}
        <div className="mt-2.5 md:hidden">
          <div className="relative flex items-center w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search for products, gadgets, home essentials..."
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (activeView !== 'store') setActiveView('store');
              }}
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-full py-2 pl-10 pr-9 text-xs text-[#111111] placeholder:text-[#6B6B6B] focus:bg-white focus:border-[#111111] outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 p-1 text-neutral-400 hover:text-neutral-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Slide-over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E5]">
              <span className="text-xl font-black text-[#111111]">
                {BRAND_CONFIG.brandNameShort}
                <span style={{ color: BRAND_CONFIG.logoDotColor }}>.</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-2 text-sm font-semibold text-[#111111]">
              <button
                onClick={() => {
                  setActiveView('store');
                  onSelectCategory('all');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 px-3 rounded-xl hover:bg-neutral-50"
              >
                Home & Store
              </button>
              <button
                onClick={() => {
                  setActiveView('store');
                  setMobileMenuOpen(false);
                  const dealsEl = document.getElementById('catalog-grid-header');
                  if (dealsEl) dealsEl.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full text-left py-2 px-3 rounded-xl hover:bg-neutral-50 flex items-center justify-between"
              >
                <span>Today's Deals</span>
                <span className="text-[10px] bg-[#FF5A36] text-white font-bold px-2 py-0.5 rounded-full">HOT</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('orders');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 px-3 rounded-xl hover:bg-neutral-50"
              >
                Track Orders
              </button>
              <button
                onClick={() => {
                  setActiveView('wishlist');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 px-3 rounded-xl hover:bg-neutral-50 flex items-center justify-between"
              >
                <span>Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="text-xs bg-[#FF5A36] text-white font-bold px-2 py-0.5 rounded-full">
                    {wishlistCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveView('account');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 px-3 rounded-xl hover:bg-neutral-50"
              >
                My Account
              </button>
            </div>

            {/* Categories list in mobile menu */}
            <div className="pt-3 border-t border-[#E8E8E5]">
              <h4 className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider mb-2 px-3">Categories</h4>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onSelectCategory(cat.slug);
                      setActiveView('store');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left py-2 px-3 text-xs font-medium rounded-xl ${
                      selectedCategory === cat.slug ? 'text-[#FF5A36] bg-neutral-50 font-bold' : 'text-[#111111]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
