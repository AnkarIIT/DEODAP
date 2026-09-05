import { Router } from 'express';
import { db } from '../db';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { PricingEngine } from '../pricing/PricingEngine';

const router = Router();

// GET /api/account/addresses
router.get('/addresses', requireAuth, async (req: AuthRequest, res) => {
  const addresses = await db.getAddresses(req.user!.id);
  res.json({ addresses });
});

// POST /api/account/addresses
router.post('/addresses', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { fullName, phone, street, city, state, pincode, landmark, isDefault } = req.body;
    if (!fullName || !phone || !street || !pincode) {
      return res.status(400).json({ error: 'Please provide full name, phone, street, and PIN code.' });
    }

    const newAddress = await db.createAddress({
      id: `addr-${Date.now()}`,
      userId: req.user!.id,
      fullName: fullName.trim(),
      phone: phone.trim(),
      street: street.trim(),
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      pincode: pincode.trim(),
      landmark: landmark ? landmark.trim() : '',
      isDefault: Boolean(isDefault),
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ address: newAddress });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reviews
router.post('/reviews', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { productId, rating, comment } = req.body;
    if (!productId || !rating || !comment) {
      return res.status(400).json({ error: 'Product ID, rating (1-5), and review text are required.' });
    }

    const review = await db.addReview({
      id: `rev-${Date.now()}`,
      productId,
      userId: req.user!.id,
      userName: req.user!.name,
      rating: Math.max(1, Math.min(5, parseInt(String(rating), 10))),
      title: (req.body.title || 'Verified Purchase Review').trim(),
      comment: comment.trim(),
      verifiedPurchase: true,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ review });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
