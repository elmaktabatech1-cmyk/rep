import '../src/config/env.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123456', 12);
  const salesHash = await bcrypt.hash('Sales@123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@erp.local' },
    update: {},
    create: { name: 'System Administrator', email: 'admin@erp.local', passwordHash: adminHash, role: 'ADMIN', isActive: true },
  });

  const sales = await prisma.user.upsert({
    where: { email: 'sales@erp.local' },
    update: {},
    create: { name: 'Sales Representative', email: 'sales@erp.local', passwordHash: salesHash, role: 'SALES', isActive: true },
  });

  console.log(`✅ Users: ${admin.email}, ${sales.email}`);

  // ── Payment Accounts ───────────────────────────────────────────────────────
  await prisma.paymentAccount.upsert({
    where: { id: 'acc-cash-default' },
    update: {},
    create: { id: 'acc-cash-default', name: 'Main Cash Register', type: 'CASH', balance: 0, openingBalance: 0, currency: 'USD', isActive: true },
  });
  await prisma.paymentAccount.upsert({
    where: { id: 'acc-bank-default' },
    update: {},
    create: { id: 'acc-bank-default', name: 'Business Checking', type: 'BANK', balance: 0, openingBalance: 0, currency: 'USD', isActive: true },
  });
  console.log('✅ Payment accounts created');

  // ── Products ───────────────────────────────────────────────────────────────
  const products = [
    { sku: 'SCR-IP14-OEM', name: 'iPhone 14 OLED Screen Assembly', category: 'Screens', costPrice: 45.0, sellPrice: 89.99, stockQty: 15, minStockAlert: 3, warrantyMonths: 6, compatibility: ['iPhone 14', 'iPhone 14 Plus'] },
    { sku: 'BAT-SS23-OEM', name: 'Samsung Galaxy S23 Battery', category: 'Batteries', costPrice: 12.5, sellPrice: 29.99, stockQty: 25, minStockAlert: 5, warrantyMonths: 3, compatibility: ['Samsung S23'] },
    { sku: 'CHG-USB-C65W', name: 'USB-C 65W Fast Charger', category: 'Chargers', costPrice: 8.0, sellPrice: 19.99, stockQty: 50, minStockAlert: 10, warrantyMonths: 12, compatibility: ['Universal'] },
    { sku: 'CSE-IP15-TPU', name: 'iPhone 15 TPU Clear Case', category: 'Cases', costPrice: 2.5, sellPrice: 12.99, stockQty: 100, minStockAlert: 20, warrantyMonths: 0, compatibility: ['iPhone 15'] },
  ];
  for (const p of products) {
    await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: { ...p, images: [], isActive: true } });
  }
  console.log(`✅ ${products.length} products created`);

  // ── Customers ──────────────────────────────────────────────────────────────
  const customers = [
    { name: 'John Smith', phone: '+15551234567', email: 'john@example.com', deviceModel: 'iPhone 14', totalSpent: 189.98, loyaltyPoints: 19, tags: ['vip', 'repeat-buyer'] },
    { name: 'Maria Garcia', phone: '+15559876543', email: 'maria@example.com', deviceModel: 'Samsung S23', totalSpent: 59.98, loyaltyPoints: 6, tags: ['new'] },
  ];
  for (const c of customers) {
    await prisma.customer.upsert({ where: { phone: c.phone }, update: {}, create: { ...c, optInWhatsApp: true, optInEmail: true } });
  }
  console.log(`✅ ${customers.length} customers created`);

  // ── Segment ────────────────────────────────────────────────────────────────
  await prisma.segment.upsert({
    where: { name: 'VIP Customers' },
    update: {},
    create: { name: 'VIP Customers', description: 'Customers with total spend over $100', filters: { totalSpent: { gte: 100 }, optInWhatsApp: true }, customerCount: 1 },
  });
  console.log('✅ Default segment created');

  // ── Supplier ───────────────────────────────────────────────────────────────
  await prisma.supplier.upsert({
    where: { id: 'sup-default-001' },
    update: {},
    create: { id: 'sup-default-001', name: 'Mobile Parts Wholesale Co.', phone: '+15550001111', email: 'parts@wholesale.example', address: '123 Parts St', taxNumber: 'TX-123456789', isActive: true },
  });
  console.log('✅ Default supplier created');

  console.log('\n🎉 Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin  → admin@erp.local  / Admin@123456');
  console.log('  Sales  → sales@erp.local  / Sales@123456');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  CHANGE PASSWORDS IMMEDIATELY IN PRODUCTION!');
}

main()
  .catch((err) => { console.error('❌ Seed failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
