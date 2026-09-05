import { prisma } from '../server/prisma';

async function main() {
  console.time('getCategories');
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  console.timeEnd('getCategories');
  console.log('Categories:', cats.length);
  cats.forEach(c => {
    console.log(`  ${c.name}: ${c._count.products} products`);
  });

  console.time('getFashionProducts');
  const prods = await prisma.product.findMany({
    where: { isActive: true, categoryId: 'cat-fashion' },
    include: {
      category: true,
      supplierProducts: { include: { supplier: true }, orderBy: { costPrice: 'asc' } },
      inventory: true,
    },
    take: 10,
  });
  console.timeEnd('getFashionProducts');
  console.log('Fashion products:', prods.length);

  // Test the specific categories/all endpoint flow
  console.time('categories_all_sim');
  const allCats = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  for (const cat of allCats) {
    await prisma.product.findMany({
      where: { isActive: true, categoryId: cat.id },
      include: {
        category: true,
        supplierProducts: { include: { supplier: true }, orderBy: { costPrice: 'asc' } },
        inventory: true,
      },
    });
  }
  console.timeEnd('categories_all_sim');
  console.log('Done');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e);
  await prisma.$disconnect();
});
