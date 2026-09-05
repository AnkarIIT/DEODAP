import { Router } from 'express';
import { db } from '../db';
import { PricingEngine } from '../pricing/PricingEngine';

const router = Router();

// GET /api/products (with filtering, search, sorting & pagination)
router.get('/', async (req, res) => {
  try {
    const {
      categoryId,
      search,
      minPrice,
      maxPrice,
      minRating,
      isTrending,
      isBestSeller,
      isNewArrival,
      sort,
      page = '1',
      limit = '16',
    } = req.query;

    const allProducts = await db.getProducts({
      categoryId: categoryId ? String(categoryId) : undefined,
      search: search ? String(search) : undefined,
      minPrice: minPrice ? parseFloat(String(minPrice)) : undefined,
      maxPrice: maxPrice ? parseFloat(String(maxPrice)) : undefined,
      minRating: minRating ? parseFloat(String(minRating)) : undefined,
      isTrending: isTrending === 'true',
      isBestSeller: isBestSeller === 'true',
      isNewArrival: isNewArrival === 'true',
      sort: sort ? String(sort) : undefined,
    });

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(250, Math.max(1, parseInt(String(limit), 10)));
    const totalCount = allProducts.length;
    const totalPages = Math.ceil(totalCount / limitNum);

    const startIndex = (pageNum - 1) * limitNum;
    const paginated = allProducts.slice(startIndex, startIndex + limitNum).map(PricingEngine.sanitizeProductForCustomer);

    res.json({
      products: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch products.' });
  }
});

// GET /api/products/:slugOrId
router.get('/:slugOrId', async (req, res) => {
  try {
    const product = await db.findProductByIdOrSlug(req.params.slugOrId);
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found or has been discontinued.' });
    }

    const safeProduct = PricingEngine.sanitizeProductForCustomer(product);
    const reviews = await db.getReviewsForProduct(product.id);

    // Get related products from same category
    const allRelated = await db.getProducts({ categoryId: product.categoryId });
    const related = allRelated
      .filter((p: any) => p.id !== product.id)
      .slice(0, 4)
      .map(PricingEngine.sanitizeProductForCustomer);

    res.json({
      product: safeProduct,
      reviews,
      relatedProducts: related,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch product.' });
  }
});

// GET /api/categories
router.get('/categories/all', async (req, res) => {
  try {
    // getCategories() already includes _count.products via Prisma,
    // avoiding an N+1 query (one fetch per category).
    const categories = await db.getCategories();
    res.json({ categories });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch categories.' });
  }
});

// Check Pincode Delivery Availability
router.get('/pincode/check', (req, res) => {
  const { pincode } = req.query;
  const pin = String(pincode || '').trim();

  if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
    return res.status(400).json({ serviceable: false, message: 'Please enter a valid 6-digit Indian PIN code.' });
  }

  // Major metro prefixes in India
  const isMetro = ['11', '40', '56', '70', '60', '50', '38', '30'].some((prefix) => pin.startsWith(prefix));
  const deliveryDays = isMetro ? '2-3 Days' : '4-5 Days';

  res.json({
    serviceable: true,
    pincode: pin,
    deliveryDays,
    cashOnDelivery: true,
    courierPartner: isMetro ? 'Delhivery Air Express' : 'Shadowfax Surface',
    message: `Delivery available in ${deliveryDays}. Free delivery on orders above ₹699.`,
  });
});

export default router;
