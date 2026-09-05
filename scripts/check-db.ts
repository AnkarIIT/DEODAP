import { prisma } from '../server/prisma';

async function main() {
  // Check tables
  const tables = await prisma.$queryRaw<
    Array<{ table_name: string }>
  >`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log('Tables in database:');
  tables.forEach((t) => console.log('  -', t.table_name));
  console.log(`Total tables: ${tables.length}\n`);

  // Check data counts
  const modelCounts: Array<[string, number]> = [];
  for (const model of [
    'Category', 'Product', 'ProductVariant', 'Supplier', 'SupplierProduct',
    'Inventory', 'User', 'Wishlist', 'Review', 'Coupon', 'Order',
    'OrderItem', 'Setting', 'ImportJob', 'ImportRow'
  ]) {
    try {
      const count = await (prisma as any)[model.toLowerCase()].count();
      if (typeof count === 'number') modelCounts.push([model, count]);
    } catch {
      // Some models might not have count accessible this way
    }
  }

  console.log('Record counts:');
  for (const [name, count] of modelCounts) {
    console.log(`  ${name}: ${count}`);
  }

  // List categories
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  console.log('\nCategories:');
  for (const c of categories) {
    console.log(`  ${c.id} | ${c.name} | slug: ${c.slug} | active: ${c.isActive}`);
  }

  // List products
  const products = await prisma.product.findMany({
    select: { id: true, title: true, slug: true, sellingPrice: true, categoryId: true, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\nProducts (${products.length}):`);
  for (const p of products) {
    console.log(`  ${p.id} | ${p.title} | ₹${p.sellingPrice} | cat=${p.categoryId} | active=${p.isActive}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
