import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { HeroBanner } from './components/customer/HeroBanner';
import { ProductCard } from './components/customer/ProductCard';
import { ProductDetailModal } from './components/customer/ProductDetailModal';
import { CartDrawer } from './components/customer/CartDrawer';
import { CheckoutModal } from './components/customer/CheckoutModal';
import { UPIPaymentModal } from './components/customer/UPIPaymentModal';
import { OrderSuccessModal } from './components/customer/OrderSuccessModal';
import { OrderTrackingView } from './components/customer/OrderTrackingView';
import { CustomerOrdersList } from './components/customer/CustomerOrdersList';
import { WishlistView } from './components/customer/WishlistView';
import { AccountView } from './components/customer/AccountView';
import { ReturnRequestModal } from './components/customer/ReturnRequestModal';
import { LegalView, LegalSection } from './components/common/LegalView';
import { api } from './lib/api';
import { Product, Category, Order } from './types';
import { SlidersHorizontal, AlertCircle, Tag, ArrowRight } from 'lucide-react';
import { BRAND_CONFIG } from './config/brand';

function MainContent() {
  const { addToCart } = useCart();

  // Navigation and Views
  const [activeView, setActiveView] = useState<'store' | 'orders' | 'wishlist' | 'account' | 'legal'>('store');
  const [legalSection, setLegalSection] = useState<LegalSection>('about');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [filterDealsOnly, setFilterDealsOnly] = useState<boolean>(false);

  // Catalog Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // Modals & Active Workflows
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [activeUpiOrder, setActiveUpiOrder] = useState<any>(null);
  const [activeUpiPaymentDetails, setActiveUpiPaymentDetails] = useState<any>(null);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);

  // Fetch initial catalog
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.getProducts({ limit: 200 }),
          api.getCategories(),
        ]);
        setProducts(prodRes.products);
        setCategories(catRes.categories);
      } catch (err) {
        console.error('Failed to load initial catalog:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchCatalog();
  }, []);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory && selectedCategory !== 'all') {
      const target = selectedCategory.toLowerCase();
      const matchedCat = categories.find(
        (c) => c.slug.toLowerCase() === target || c.id.toLowerCase() === target
      );
      result = result.filter((p) => {
        if (p.categorySlug && p.categorySlug.toLowerCase() === target) return true;
        if (p.categoryId && p.categoryId.toLowerCase() === target) return true;
        if (matchedCat && (p.categoryId === matchedCat.id || p.categorySlug === matchedCat.slug)) return true;
        if (matchedCat && p.categoryName && p.categoryName.toLowerCase() === matchedCat.name.toLowerCase()) return true;
        return false;
      });
    }

    if (filterDealsOnly) {
      result = result.filter((p) => p.mrp > p.sellingPrice);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.sellingPrice - b.sellingPrice);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.sellingPrice - a.sellingPrice);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [products, selectedCategory, filterDealsOnly, searchQuery, sortBy]);

  const handleBuyNow = (product: Product) => {
    addToCart(product, 1, false);
    setIsCheckoutOpen(true);
  };

  const handleOrderCreated = (order: any, paymentDetails: any) => {
    if (order.paymentMethod === 'UPI_MANUAL') {
      setActiveUpiOrder(order);
      setActiveUpiPaymentDetails(paymentDetails);
    } else {
      setOrderSuccess(order);
    }
  };

  const handleUpiPaymentSubmitted = (orderId: string, utr: string) => {
    setActiveUpiOrder(null);
    setOrderSuccess({ ...activeUpiOrder, status: 'PAYMENT_REVIEW' });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans text-[#111111] selection:bg-[#FF5A36] selection:text-white">
      {/* Top Global Header */}
      <Header
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(slug) => {
          setSelectedCategory(slug);
          if (activeView !== 'store') setActiveView('store');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenDeals={() => {
          setFilterDealsOnly(true);
          setSelectedCategory('all');
        }}
      />

      {/* Main Container */}
      <main className="flex-1">
        {/* VIEW: Customer Orders Tracking Detail */}
        {activeView === 'orders' && trackingOrderId && (
          <OrderTrackingView
            orderId={trackingOrderId}
            onBack={() => setTrackingOrderId(null)}
            onRequestReturn={(order) => setReturnOrder(order)}
          />
        )}

        {/* VIEW: Customer Orders List */}
        {activeView === 'orders' && !trackingOrderId && (
          <CustomerOrdersList
            onSelectOrder={(orderId) => setTrackingOrderId(orderId)}
            onExploreProducts={() => {
              setActiveView('store');
              setSelectedCategory('all');
            }}
          />
        )}

        {/* VIEW: Customer Wishlist */}
        {activeView === 'wishlist' && (
          <WishlistView
            onExploreProducts={() => {
              setActiveView('store');
              setSelectedCategory('all');
            }}
            onViewDetails={(prod) => setDetailProduct(prod)}
            onBuyNow={handleBuyNow}
          />
        )}

        {/* VIEW: Customer Account */}
        {activeView === 'account' && (
          <AccountView
            onNavigate={(view) => {
              setActiveView(view);
            }}
          />
        )}

        {/* VIEW: Legal / Company & Policy Pages */}
        {activeView === 'legal' && (
          <LegalView
            initialSection={legalSection}
            onNavigate={(view) => setActiveView(view)}
          />
        )}

        {/* VIEW: Customer Storefront */}
        {activeView === 'store' && (
          <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
            {/* Hero Banner (Shown on initial store view without search) */}
            {!searchQuery && selectedCategory === 'all' && (
              <HeroBanner
                onExploreClick={() => {
                  const element = document.getElementById('catalog-grid-header');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }}
                onSelectCategory={(slug) => {
                  setSelectedCategory(slug);
                  const element = document.getElementById('catalog-grid-header');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }}
                categories={categories}
                selectedCategory={selectedCategory}
              />
            )}

            {/* Catalog Grid Header & Sorting Controls */}
            <div id="catalog-grid-header" className="pt-2 pb-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E8E5]">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight flex items-center gap-2">
                    <span>
                      {searchQuery
                        ? `Search Results for "${searchQuery}"`
                        : filterDealsOnly
                        ? "Today's Hot Deals"
                        : selectedCategory === 'all'
                        ? 'Trending Catalog'
                        : categories.find((c) => c.slug === selectedCategory)?.name || 'Category'}
                    </span>
                    <span className="text-xs font-bold text-[#6B6B6B] bg-[#E8E8E5]/70 px-2.5 py-0.5 rounded-full">
                      {filteredProducts.length} items
                    </span>
                  </h2>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    Everyday smart finds • Direct warehouse pricing • Fast delivery
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {/* Deals filter button */}
                  <button
                    onClick={() => setFilterDealsOnly(!filterDealsOnly)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      filterDealsOnly
                        ? 'bg-[#FF5A36] text-white shadow-2xs'
                        : 'bg-white border border-[#E8E8E5] text-[#111111] hover:border-neutral-400'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Deals Only</span>
                  </button>

                  <span className="text-[#6B6B6B] font-medium hidden sm:inline">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1.5 bg-white border border-[#E8E8E5] rounded-full text-xs font-semibold text-[#111111] focus:border-[#111111] outline-hidden cursor-pointer shadow-2xs"
                  >
                    <option value="featured">Featured & Trending</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating">Highest Customer Rating</option>
                  </select>
                </div>
              </div>

              {/* Category Pills Strip */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-4">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setFilterDealsOnly(false);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    selectedCategory === 'all' && !filterDealsOnly
                      ? 'bg-[#111111] text-white shadow-2xs'
                      : 'bg-white border border-[#E8E8E5] text-[#111111] hover:border-neutral-400'
                  }`}
                >
                  All Items
                </button>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.slug && !filterDealsOnly;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.slug);
                        setFilterDealsOnly(false);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-[#111111] text-white shadow-2xs font-bold'
                          : 'bg-white border border-[#E8E8E5] text-[#111111] hover:border-neutral-400'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product Grid (Responsive: 2-col on mobile, 3-col on tablet, 4-col on desktop) */}
            {loadingProducts ? (
              <div className="text-center py-20">
                <div className="w-8 h-8 border-3 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-[#6B6B6B]">Loading everyday products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-[#E8E8E5]">
                <AlertCircle className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-[#111111] mb-1">No products found</h3>
                <p className="text-xs text-[#6B6B6B] mb-4">Try checking for spelling errors or clear your filters.</p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setFilterDealsOnly(false);
                    setSearchQuery('');
                  }}
                  className="px-5 py-2 bg-[#111111] hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onViewDetails={(p) => setDetailProduct(p)}
                    onBuyNow={handleBuyNow}
                    onSelectCategory={(slug) => {
                      setSelectedCategory(slug);
                      setFilterDealsOnly(false);
                      const el = document.getElementById('catalog-grid-header');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Footer */}
      <Footer
        onSelectCategory={(slug) => {
          setSelectedCategory(slug);
          setActiveView('store');
        }}
        onNavigate={(view) => setActiveView(view)}
        onOpenLegal={(section) => {
          setLegalSection(section);
          setActiveView('legal');
        }}
      />

      {/* Mobile Bottom Navigation Bar (Visible only on mobile) */}
      <MobileBottomNav
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenDeals={() => {
          setFilterDealsOnly(true);
          setSelectedCategory('all');
        }}
      />

      {/* Cart Slide-Over Drawer */}
      <CartDrawer onCheckout={() => setIsCheckoutOpen(true)} />

      {/* Product Details Modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onBuyNow={handleBuyNow}
        />
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onOrderSuccess={handleOrderCreated}
        />
      )}

      {/* UPI Payment Screen with NPCI QR Code & UTR Submission */}
      {activeUpiOrder && (
        <UPIPaymentModal
          order={activeUpiOrder}
          paymentDetails={activeUpiPaymentDetails}
          onClose={() => {
            setActiveUpiOrder(null);
            setOrderSuccess(activeUpiOrder);
          }}
          onPaymentSubmitted={handleUpiPaymentSubmitted}
        />
      )}

      {/* Order Success Screen */}
      {orderSuccess && (
        <OrderSuccessModal
          order={orderSuccess}
          onClose={() => setOrderSuccess(null)}
          onTrackOrder={(orderId) => {
            setOrderSuccess(null);
            setTrackingOrderId(orderId);
            setActiveView('orders');
          }}
        />
      )}

      {/* Customer Return Claim Modal */}
      {returnOrder && (
        <ReturnRequestModal
          order={returnOrder}
          onClose={() => setReturnOrder(null)}
          onSuccess={() => {
            if (trackingOrderId) {
              setTrackingOrderId(null);
              setTimeout(() => setTrackingOrderId(returnOrder.id), 100);
            }
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <MainContent />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
