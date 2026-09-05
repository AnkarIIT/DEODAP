import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../types';
import { api } from '../lib/api';

export interface CartItemState {
  productId: string;
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItemState[];
  savedForLater: CartItemState[];
  totalQuantity: number;
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  appliedCoupon: any;
  isCartOpen: boolean;
  isCalculating: boolean;
  couponCodeInput: string;
  couponError: string;
  pincode: string;
  pincodeEstimate: any;
  setCouponCodeInput: (code: string) => void;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: Product, quantity?: number, openDrawer?: boolean) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  saveForLater: (productId: string) => void;
  moveToCartFromSaved: (productId: string) => void;
  removeSavedItem: (productId: string) => void;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  checkPincode: (pin: string) => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'bharatcart_cart_items';
const SAVED_STORAGE_KEY = 'bharatcart_saved_items';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItemState[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [savedForLater, setSavedForLater] = useState<CartItemState[]>(() => {
    try {
      const saved = localStorage.getItem(SAVED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponCodeInput, setCouponCodeInput] = useState<string>('');
  const [couponError, setCouponError] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const [pincode, setPincode] = useState<string>('110001');
  const [pincodeEstimate, setPincodeEstimate] = useState<any>({
    serviceable: true,
    deliveryDays: '2-3 Days',
    courierPartner: 'Delhivery Express',
  });

  // Persist items
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedForLater));
  }, [savedForLater]);

  // Recalculate totals with backend whenever items or coupon changes
  useEffect(() => {
    const fetchBackendTotals = async () => {
      if (items.length === 0) {
        setSubtotal(0);
        setShippingFee(0);
        setDiscount(0);
        setTotalAmount(0);
        return;
      }

      setIsCalculating(true);
      try {
        const payload = items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
        const res = await api.calculateCart(payload, appliedCoupon?.code);
        setSubtotal(res.subtotal);
        setShippingFee(res.shippingFee);
        setDiscount(res.discount);
        setTotalAmount(res.totalAmount);
      } catch (err) {
        console.warn('Backend cart calculation error, fallback to client estimate:', err);
        const clientSubtotal = items.reduce((sum, i) => sum + i.product.sellingPrice * i.quantity, 0);
        const fee = clientSubtotal >= 699 ? 0 : 49;
        setSubtotal(clientSubtotal);
        setShippingFee(fee);
        setTotalAmount(clientSubtotal + fee);
      } finally {
        setIsCalculating(false);
      }
    };

    fetchBackendTotals();
  }, [items, appliedCoupon]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const addToCart = (product: Product, quantity = 1, openDrawer = true) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: Math.min(20, i.quantity + quantity) } : i
        );
      }
      return [...prev, { productId: product.id, product, quantity }];
    });

    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(20, quantity) } : i))
    );
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const saveForLater = (productId: string) => {
    const item = items.find((i) => i.productId === productId);
    if (item) {
      setSavedForLater((prev) => [...prev, item]);
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    }
  };

  const moveToCartFromSaved = (productId: string) => {
    const item = savedForLater.find((i) => i.productId === productId);
    if (item) {
      setItems((prev) => [...prev, item]);
      setSavedForLater((prev) => prev.filter((i) => i.productId !== productId));
    }
  };

  const removeSavedItem = (productId: string) => {
    setSavedForLater((prev) => prev.filter((i) => i.productId !== productId));
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    setCouponError('');
    try {
      const res = await api.applyCoupon(code, subtotal);
      if (res.success) {
        setAppliedCoupon(res.coupon);
        setCouponCodeInput('');
        return true;
      }
      return false;
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
      return false;
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
  };

  const checkPincode = async (pin: string) => {
    setPincode(pin);
    try {
      const res = await api.checkPincode(pin);
      setPincodeEstimate(res);
    } catch (err: any) {
      setPincodeEstimate({
        serviceable: false,
        message: err.message || 'Invalid pincode',
      });
    }
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setSubtotal(0);
    setShippingFee(0);
    setDiscount(0);
    setTotalAmount(0);
  };

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        savedForLater,
        totalQuantity,
        subtotal,
        shippingFee,
        discount,
        totalAmount,
        appliedCoupon,
        isCartOpen,
        isCalculating,
        couponCodeInput,
        couponError,
        pincode,
        pincodeEstimate,
        setCouponCodeInput,
        openCart,
        closeCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        saveForLater,
        moveToCartFromSaved,
        removeSavedItem,
        applyCoupon,
        removeCoupon,
        checkPincode,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
