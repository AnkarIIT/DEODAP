import React from 'react';
import {
  ArrowRight,
  Truck,
  RotateCcw,
  ShieldCheck,
  Users,
  Sparkles,
  Percent,
} from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand';
import { Category } from '../../types';

interface HeroBannerProps {
  onExploreClick: () => void;
  onSelectCategory: (slug: string) => void;
  categories?: Category[];
  selectedCategory?: string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExploreClick,
  onSelectCategory,
  categories = [],
  selectedCategory = 'all',
}) => {
  return (
    <div className="space-y-8 mb-10">
      {/* Editorial Hero Container */}
      <section className="bg-[#F7F7F4] border border-[#E8E8E5] rounded-3xl p-6 sm:p-10 lg:p-14 overflow-hidden relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Editorial Typography & CTAs */}
          <div className="lg:col-span-7 space-y-5 text-left z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1EE] border border-[#FFD9D0] text-[#FF5A36] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5A36]" />
              TRENDING
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight text-[#111111] font-sans leading-[1.08]">
              Good stuff. <br />
              <span className="text-[#111111]">Better prices.</span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-[#6B6B6B] max-w-lg leading-relaxed">
              Everyday products, smart finds, and little things worth buying.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                id="hero-shop-now-btn"
                onClick={onExploreClick}
                className="h-12 px-7 bg-[#FF5A36] hover:bg-[#E54C29] text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="hero-explore-deals-btn"
                onClick={() => {
                  onExploreClick();
                  onSelectCategory('all');
                }}
                className="h-12 px-6 bg-white hover:bg-neutral-50 text-[#111111] font-bold text-sm rounded-xl border border-[#E8E8E5] transition-all cursor-pointer shadow-2xs active:scale-98"
              >
                Explore Deals
              </button>
            </div>
          </div>

          {/* Right Column: Asymmetrical Editorial Product Showcase */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Background Soft Shape */}
            <div className="w-full max-w-sm aspect-4/3 sm:aspect-square bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-[#E8E8E5] relative flex flex-col justify-between overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700&auto=format&fit=crop&q=80"
                alt="Minimalist Table Lamp"
                className="w-full h-48 sm:h-60 object-contain rounded-2xl transition-transform duration-500 hover:scale-105"
              />

              {/* Floating Sale Tag */}
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-xs border border-[#E8E8E5] px-3 py-1.5 rounded-xl shadow-xs text-right">
                <span className="block text-[10px] text-[#6B6B6B] font-semibold uppercase">Up to</span>
                <span className="block text-sm font-black text-[#FF5A36]">50% OFF</span>
                <span className="block text-[9px] text-neutral-500">Home Essentials</span>
              </div>

              {/* Floating Cursive Note */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-xs border border-[#E8E8E5] px-3 py-1 rounded-full shadow-2xs">
                <span className="text-xs font-serif italic text-[#111111]">Small Things, Big Happiness</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reassurance Strip (Clean 4-column bar exactly as requested) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-3">
        <div className="flex items-center gap-3 p-3.5 bg-white border border-[#E8E8E5] rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-[#E8E8E5] flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-[#111111]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#111111] leading-tight">Free Delivery</h4>
            <p className="text-[11px] text-[#6B6B6B]">on orders above ₹{BRAND_CONFIG.freeShippingThreshold}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 bg-white border border-[#E8E8E5] rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-[#E8E8E5] flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5 text-[#111111]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#111111] leading-tight">Easy Returns</h4>
            <p className="text-[11px] text-[#6B6B6B]">7-day hassle-free policy</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 bg-white border border-[#E8E8E5] rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-[#E8E8E5] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#111111]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#111111] leading-tight">Secure Payments</h4>
            <p className="text-[11px] text-[#6B6B6B]">Instant UPI, Cards, Netbanking</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 bg-white border border-[#E8E8E5] rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-[#E8E8E5] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-[#111111]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#111111] leading-tight">Trusted Store</h4>
            <p className="text-[11px] text-[#6B6B6B]">50,000+ happy buyers</p>
          </div>
        </div>
      </div>

      {/* Shop by Category Section (Horizontally scrollable on mobile, as required) */}
      <div id="shop-by-category-section" className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-[#111111] tracking-tight">
            Shop by Category
          </h2>
          <button
            onClick={() => onSelectCategory('all')}
            className="text-xs font-semibold text-[#FF5A36] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-2 pt-1">
          {/* All / Deals Card */}
          <button
            onClick={() => onSelectCategory('all')}
            className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer"
          >
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all shadow-2xs ${
                selectedCategory === 'all'
                  ? 'ring-2 ring-[#FF5A36] bg-[#FFF1EE] text-[#FF5A36]'
                  : 'bg-white border border-[#E8E8E5] text-[#111111] group-hover:border-neutral-400'
              }`}
            >
              <Percent className="w-7 h-7" />
            </div>
            <span
              className={`text-xs text-center whitespace-nowrap font-medium ${
                selectedCategory === 'all' ? 'text-[#FF5A36] font-bold' : 'text-[#111111]'
              }`}
            >
              All Items
            </span>
          </button>

          {/* Dynamic Categories */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.slug)}
                className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer"
              >
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden transition-all shadow-2xs ${
                    isSelected
                      ? 'ring-2 ring-[#FF5A36] ring-offset-2'
                      : 'border border-[#E8E8E5] group-hover:scale-105'
                  }`}
                >
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover bg-neutral-100"
                    loading="lazy"
                  />
                </div>
                <span
                  className={`text-xs text-center whitespace-nowrap font-medium ${
                    isSelected ? 'text-[#FF5A36] font-bold' : 'text-[#111111]'
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
