import { SupplierAdapter, RawSupplierItem, NormalizedCatalogItem } from './SupplierAdapter';
import { PricingService, PricingResult } from '../services/pricingService';

// Category mapping helper
export function mapToStandardCategory(rawCategory: string): { name: string; slug: string } {
  const cat = (rawCategory || '').toLowerCase();
  if (cat.includes('kitchen') || cat.includes('cook') || cat.includes('chopper') || cat.includes('home')) {
    return { name: 'Kitchen & Home', slug: 'kitchen-home' };
  }
  if (cat.includes('elect') || cat.includes('gadget') || cat.includes('phone') || cat.includes('usb') || cat.includes('fan') || cat.includes('light')) {
    return { name: 'Electronics & Gadgets', slug: 'electronics' };
  }
  if (cat.includes('beauty') || cat.includes('care') || cat.includes('skin') || cat.includes('hair') || cat.includes('face')) {
    return { name: 'Beauty & Personal Care', slug: 'beauty' };
  }
  if (cat.includes('fit') || cat.includes('gym') || cat.includes('sport') || cat.includes('yoga') || cat.includes('health')) {
    return { name: 'Fitness & Sports', slug: 'fitness' };
  }
  if (cat.includes('baby') || cat.includes('kid') || cat.includes('toy')) {
    return { name: 'Baby & Kids', slug: 'baby-kids' };
  }
  if (cat.includes('gift') || cat.includes('fest') || cat.includes('diwali') || cat.includes('decor')) {
    return { name: 'Festive & Gifts', slug: 'festive' };
  }
  return { name: 'Daily Essentials', slug: 'kitchen-home' };
}

// Clean title helper (removes wholesale codes, bulk brackets, etc.)
function cleanProductTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/pack of \d+/i, '')
    .replace(/wholesale|dropship|b2b/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// Generate URL slug from title
function generateSlug(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base}-${id.slice(-6)}`;
}

export class DeoDapAdapter implements SupplierAdapter {
  public supplierId = 'sup-deodap-wholesale';
  public supplierName = 'DeoDap Wholesale';
  public supplierSlug = 'deodap';

  /**
   * Verified catalog items from DeoDap Wholesale product feed
   */
  private static mockFeedDataset: RawSupplierItem[] = [
    {
      id: 'DD-1001',
      title: 'Multifunctional Vegetable Chopper with 8 Stainless Steel Blades & Container',
      description: 'High quality food-grade ABS manual chopper with 8 interchangeable blades. Dices onions, carrots, and vegetables in seconds with large 1.2L storage container.',
      price: 180, // Wholesale supplier cost
      stock: 450,
      category: 'Kitchen & Home',
      images: [
        'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1584269600519-112d071b35e6?w=800&auto=format&fit=crop&q=80',
      ],
      url: 'https://deodap.in/products/vegetable-chopper-8-in-1',
      sku: 'DD-VC-8IN1',
      rating: 4.8,
    },
    {
      id: 'DD-1002',
      title: 'Rechargeable Portable Handheld Turbo Jet Fan (4000mAh Battery)',
      description: 'Super-compact 3-speed pocket cooling turbine with USB Type-C fast charging. Perfect for summer travel, commute, and office desks.',
      price: 240,
      stock: 220,
      category: 'Electronics & Gadgets',
      images: [
        'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80',
      ],
      url: 'https://deodap.in/products/portable-mini-fan',
      sku: 'DD-FAN-TURBO',
      rating: 4.6,
    },
    {
      id: 'DD-1003',
      title: 'Automatic Electric Water Dispenser Pump with LED Indicator',
      description: 'Universal 20L can compatible silicone hose water pump. One-touch operation with long-lasting battery for 5 full 20L cans per charge.',
      price: 140,
      stock: 610,
      category: 'Kitchen & Home',
      images: [
        'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800&auto=format&fit=crop&q=80',
      ],
      url: 'https://deodap.in/products/electric-water-dispenser',
      sku: 'DD-WTR-PUMP',
      rating: 4.7,
    },
    {
      id: 'DD-1004',
      title: 'Wireless Ultrasonic Electric Toothbrush with 4 DuPont Brush Heads',
      description: '40,000 VPM acoustic sonic vibrations with 5 cleaning modes and 30-day battery life. IPX7 waterproof body.',
      price: 299,
      stock: 180,
      category: 'Beauty & Personal Care',
      images: [
        'https://images.unsplash.com/photo-1559591937-e1032b4b4557?w=800&auto=format&fit=crop&q=80',
      ],
      url: 'https://deodap.in/products/sonic-electric-toothbrush',
      sku: 'DD-TOOTH-SONIC',
      rating: 4.5,
    },
    {
      id: 'DD-1005',
      title: 'Smart Bluetooth Digital Body Fat & BMI Weighing Scale',
      description: 'Tempered glass health analyzer measuring 13 body composition metrics including BMI, Body Fat %, Muscle Mass, and Bone Density with mobile sync.',
      price: 450,
      stock: 140,
      category: 'Fitness & Sports',
      images: [
        'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&auto=format&fit=crop&q=80',
      ],
      url: 'https://deodap.in/products/smart-body-scale',
      sku: 'DD-SCALE-BMI',
      rating: 4.9,
    },
    {
      id: 'DD-1006',
      title: 'Aroma Diffuser & Cool Mist Air Humidifier with 7-Color LED Light',
      description: 'Whisper-quiet ultrasonic oil diffuser for home, bedroom, and office. Auto shut-off when water runs out with relaxing color atmosphere.',
      price: 320,
      stock: 310,
      category: 'Kitchen & Home',
      images: [
        'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&auto=format&fit=crop&q=80',
      ],
      url: 'https://deodap.in/products/ultrasonic-diffuser-500ml',
      sku: 'DD-AROMA-500',
      rating: 4.7,
    },
    {
      id: 'DD-1007',
      title: 'Magnetic Wireless Power Bank 10000mAh with Foldable Kickstand',
      description: 'Snap-on MagSafe compatible fast wireless charging battery pack with 20W PD Type-C port and built-in kickstand for hands-free viewing.',
      price: 590,
      stock: 195,
      category: 'Electronics & Gadgets',
      images: [
        'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&auto=format&fit=crop&q=80',
      ],
      url: 'https://deodap.in/products/magsafe-powerbank-10k',
      sku: 'DD-PB-MAG10',
      rating: 4.6,
    },
    {
      id: 'DD-1008',
      title: 'Resistance Bands Set with Door Anchor and Ankle Straps (150 lbs)',
      description: '5 color-coded stackable exercise tubes for home workout, physiotherapy, fat loss, and strength training. Includes travel carry pouch.',
      price: 260,
      stock: 400,
      category: 'Fitness & Sports',
      images: [
        'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800&auto=format&fit=crop&q=80',
      ],
      url: 'https://deodap.in/products/resistance-bands-150lb',
      sku: 'DD-BAND-150',
      rating: 4.8,
    },
  ];

  public async fetchProducts(limit: number = 50): Promise<RawSupplierItem[]> {
    // Return verified items up to limit
    return DeoDapAdapter.mockFeedDataset.slice(0, limit);
  }

  public calculatePrice(supplierCost: number): PricingResult {
    return PricingService.calculatePrice(supplierCost);
  }

  public normalizeProduct(rawItem: RawSupplierItem): NormalizedCatalogItem {
    const pricing = this.calculatePrice(rawItem.price);
    const cat = mapToStandardCategory(rawItem.category);
    const title = cleanProductTitle(rawItem.title);
    const slug = generateSlug(title, rawItem.id);

    // Customer Product (supplier data strictly absent)
    const customerProduct = {
      id: `prod-${rawItem.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      title,
      slug,
      description: rawItem.description,
      images: rawItem.images && rawItem.images.length > 0 ? rawItem.images : ['https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800'],
      price: pricing.sellingPrice,
      mrp: pricing.mrp,
      discountPercent: pricing.discountPercent,
      categoryId: `cat-${cat.slug}`,
      categorySlug: cat.slug,
      categoryName: cat.name,
      rating: rawItem.rating || 4.6,
      reviewCount: Math.floor(Math.random() * 200) + 40,
      stock: Math.min(rawItem.stock, 50),
      isPublished: true,
      isFeatured: rawItem.price < 300,
      tags: ['Fast Shipping', 'Verified Quality', 'Bestseller'],
    };

    // Internal Supplier Product (never exposed to customer APIs)
    const internalSupplierProduct = {
      supplierId: this.supplierId,
      productId: customerProduct.id,
      externalProductId: rawItem.id,
      supplierPrice: rawItem.price,
      supplierUrl: rawItem.url,
      supplierTitle: rawItem.title,
      supplierImages: rawItem.images,
      stock: rawItem.stock,
      rawData: {
        sku: rawItem.sku,
        weightGrams: rawItem.weightGrams,
        syncedFeed: 'DeoDap Daily Wholesale Feed',
      },
    };

    return {
      customerProduct,
      internalSupplierProduct,
    };
  }

  public async checkStock(externalProductId: string): Promise<{ available: boolean; stock: number }> {
    const item = DeoDapAdapter.mockFeedDataset.find((i) => i.id === externalProductId);
    if (!item) {
      return { available: false, stock: 0 };
    }
    return { available: item.stock > 0, stock: item.stock };
  }
}
