import { Router } from 'express';
import { db } from '../db';
import { PricingEngine } from '../pricing/PricingEngine';

const router = Router();

// Calculate cart totals securely from database
router.post('/calculate', (req, res) => {
  try {
    const { items, couponCode, paymentMethod } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.json({
        items: [],
        subtotal: 0,
        shippingFee: 0,
        discount: 0,
        totalAmount: 0,
        appliedCoupon: null,
      });
    }

    const calculated = PricingEngine.calculateOrderTotals(items, couponCode, paymentMethod);

    // Strip internal wholesale cost before sending to customer
    const clientItems = calculated.items.map((item) => ({
      productId: item.productId,
      productTitle: item.productTitle,
      productThumbnail: item.productThumbnail,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    res.json({
      items: clientItems,
      subtotal: calculated.subtotal,
      shippingFee: calculated.shippingFee,
      discount: calculated.discount,
      appliedCoupon: calculated.appliedCoupon,
      totalAmount: calculated.totalAmount,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Cart calculation failed.' });
  }
});

// Validate coupon code
router.post('/apply-coupon', (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Please provide a coupon code.' });
    }

    const coupon = db.findCoupon(code);
    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or expired coupon code.' });
    }

    if (subtotal < coupon.minOrderValue) {
      return res.status(400).json({
        error: `Coupon '${coupon.code}' requires a minimum cart value of ₹${coupon.minOrderValue}.`,
      });
    }

    let discount = 0;
    if (coupon.discountAmount) {
      discount = coupon.discountAmount;
    } else if (coupon.discountPercent) {
      discount = (subtotal * coupon.discountPercent) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    }

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountAmount: discount,
      },
      message: `Coupon '${coupon.code}' applied! You save ₹${Math.round(discount)}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Coupon verification failed.' });
  }
});

export default router;
