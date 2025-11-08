import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log("🗑️  Clearing existing data...");
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.property.deleteMany();
  await prisma.mpesaTransaction.deleteMany();
  await prisma.pesapalTransaction.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agency.deleteMany();

  // Create Agencies
  console.log("🏢 Creating agencies...");
  const agency1 = await prisma.agency.create({
    data: {
      name: "Acme Realty",
      invoiceDayOfMonth: 28,
      dueDayOfMonth: 5,
    },
  });

  const agency2 = await prisma.agency.create({
    data: {
      name: "Prime Properties Ltd",
      invoiceDayOfMonth: 25,
      dueDayOfMonth: 1,
    },
  });

  // Create Users
  console.log("👥 Creating users...");
  const passwordHash = await bcrypt.hash("password123", 10);

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@acme.com",
      name: "Admin User",
      passwordHash,
      role: "ADMIN",
      agencyId: agency1.id,
      emailVerified: true,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: "manager@acme.com",
      name: "Manager Smith",
      passwordHash,
      role: "USER",
      agencyId: agency1.id,
      emailVerified: true,
    },
  });

  const agentUser = await prisma.user.create({
    data: {
      email: "agent@prime.com",
      name: "Agent Johnson",
      passwordHash,
      role: "USER",
      agencyId: agency2.id,
      emailVerified: true,
    },
  });

  // Create Properties
  console.log("🏠 Creating properties...");
  const property1 = await prisma.property.create({
    data: {
      title: "Sunset Apartments",
      address: "123 Main Street",
      city: "Nairobi",
      state: "Nairobi County",
      zip: "00100",
      bedrooms: 2,
      bathrooms: 2,
      sizeSqFt: 1200,
      rentAmount: 50000,
      status: "AVAILABLE",
      type: "TWO_BEDROOM",
      agencyId: agency1.id,
    },
  });

  const property2 = await prisma.property.create({
    data: {
      title: "Green Valley Residences",
      address: "456 Oak Avenue",
      city: "Mombasa",
      state: "Mombasa County",
      zip: "80100",
      bedrooms: 3,
      bathrooms: 2.5,
      sizeSqFt: 1500,
      rentAmount: 75000,
      status: "AVAILABLE",
      type: "THREE_BEDROOM",
      agencyId: agency1.id,
    },
  });

  const property3 = await prisma.property.create({
    data: {
      title: "Downtown Plaza",
      address: "789 Business District",
      city: "Nairobi",
      state: "Nairobi County",
      zip: "00200",
      bedrooms: 1,
      bathrooms: 1,
      sizeSqFt: 600,
      rentAmount: 35000,
      status: "OCCUPIED",
      type: "ONE_BEDROOM",
      agencyId: agency2.id,
    },
  });

  // Create Units
  console.log("🚪 Creating units...");
  const unit1 = await prisma.unit.create({
    data: {
      propertyId: property1.id,
      unitNumber: "A101",
      type: "TWO_BEDROOM",
      bedrooms: 2,
      bathrooms: 2,
      sizeSqFt: 1200,
      rentAmount: 50000,
      status: "OCCUPIED",
    },
  });

  const unit2 = await prisma.unit.create({
    data: {
      propertyId: property1.id,
      unitNumber: "A102",
      type: "TWO_BEDROOM",
      bedrooms: 2,
      bathrooms: 2,
      sizeSqFt: 1200,
      rentAmount: 50000,
      status: "VACANT",
    },
  });

  const unit3 = await prisma.unit.create({
    data: {
      propertyId: property1.id,
      unitNumber: "A103",
      type: "TWO_BEDROOM",
      bedrooms: 2,
      bathrooms: 2,
      sizeSqFt: 1200,
      rentAmount: 50000,
      status: "MAINTENANCE",
    },
  });

  const unit4 = await prisma.unit.create({
    data: {
      propertyId: property2.id,
      unitNumber: "B201",
      type: "THREE_BEDROOM",
      bedrooms: 3,
      bathrooms: 2.5,
      sizeSqFt: 1500,
      rentAmount: 75000,
      status: "OCCUPIED",
    },
  });

  const unit5 = await prisma.unit.create({
    data: {
      propertyId: property2.id,
      unitNumber: "B202",
      type: "THREE_BEDROOM",
      bedrooms: 3,
      bathrooms: 2.5,
      sizeSqFt: 1500,
      rentAmount: 75000,
      status: "VACANT",
    },
  });

  // Create Tenants
  console.log("👨‍👩‍👧‍👦 Creating tenants...");
  const tenant1 = await prisma.tenant.create({
    data: {
      name: "John Kamau",
      email: "john.kamau@email.com",
      phone: "+254712345678",
      agencyId: agency1.id,
      averageRating: 4.5,
      isHighRisk: false,
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      name: "Mary Wanjiku",
      email: "mary.wanjiku@email.com",
      phone: "+254723456789",
      agencyId: agency1.id,
      averageRating: 5.0,
      isHighRisk: false,
    },
  });

  const tenant3 = await prisma.tenant.create({
    data: {
      name: "Peter Omondi",
      email: "peter.omondi@email.com",
      phone: "+254734567890",
      agencyId: agency2.id,
      averageRating: 3.5,
      isHighRisk: true,
    },
  });

  const tenant4 = await prisma.tenant.create({
    data: {
      name: "Sarah Njeri",
      email: "sarah.njeri@email.com",
      phone: "+254745678901",
      agencyId: agency1.id,
      averageRating: 4.8,
      isHighRisk: false,
    },
  });

  // Create Leases
  console.log("📄 Creating leases...");
  const now = new Date();
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

  const lease1 = await prisma.lease.create({
    data: {
      unitId: unit1.id,
      tenantId: tenant1.id,
      agencyId: agency1.id,
      startDate: sixMonthsAgo,
      endDate: oneYearFromNow,
      rentAmount: 50000,
      paymentDayOfMonth: 1,
    },
  });

  const lease2 = await prisma.lease.create({
    data: {
      unitId: unit4.id,
      tenantId: tenant2.id,
      agencyId: agency1.id,
      startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
      endDate: new Date(now.getFullYear() + 1, now.getMonth() - 3, 1),
      rentAmount: 75000,
      paymentDayOfMonth: 5,
    },
  });

  const lease3 = await prisma.lease.create({
    data: {
      propertyId: property3.id,
      tenantId: tenant3.id,
      agencyId: agency2.id,
      startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      endDate: new Date(now.getFullYear() + 1, now.getMonth() - 2, 1),
      rentAmount: 35000,
      paymentDayOfMonth: 1,
    },
  });

  // Create Invoices
  console.log("🧾 Creating invoices...");
  const invoice1 = await prisma.invoice.create({
    data: {
      leaseId: lease1.id,
      agencyId: agency1.id,
      amount: 50000,
      periodYear: now.getFullYear(),
      periodMonth: now.getMonth() + 1,
      issuedAt: new Date(now.getFullYear(), now.getMonth(), 28),
      dueAt: new Date(now.getFullYear(), now.getMonth() + 1, 5),
      status: "PAID",
      totalPaid: 50000,
    },
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      leaseId: lease2.id,
      agencyId: agency1.id,
      amount: 75000,
      periodYear: now.getFullYear(),
      periodMonth: now.getMonth() + 1,
      issuedAt: new Date(now.getFullYear(), now.getMonth(), 25),
      dueAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      status: "PENDING",
      totalPaid: 0,
    },
  });

  const invoice3 = await prisma.invoice.create({
    data: {
      leaseId: lease3.id,
      agencyId: agency2.id,
      amount: 35000,
      periodYear: now.getFullYear(),
      periodMonth: now.getMonth() + 1,
      issuedAt: new Date(now.getFullYear(), now.getMonth(), 28),
      dueAt: new Date(now.getFullYear(), now.getMonth() + 1, 5),
      status: "OVERDUE",
      totalPaid: 0,
    },
  });

  // Create Payments
  console.log("💰 Creating payments...");
  const payment1 = await prisma.payment.create({
    data: {
      leaseId: lease1.id,
      invoiceId: invoice1.id,
      amount: 50000,
      paidAt: new Date(now.getFullYear(), now.getMonth(), 3),
      method: "MPESA_C2B",
      referenceNumber: "QA12XYZ789",
      notes: "Rent payment for current month",
      agencyId: agency1.id,
    },
  });

  const payment2 = await prisma.payment.create({
    data: {
      leaseId: lease1.id,
      amount: 50000,
      paidAt: new Date(now.getFullYear(), now.getMonth() - 1, 2),
      method: "BANK_TRANSFER",
      referenceNumber: "BNK456789",
      notes: "Previous month rent",
      agencyId: agency1.id,
    },
  });

  const payment3 = await prisma.payment.create({
    data: {
      leaseId: lease2.id,
      amount: 75000,
      paidAt: new Date(now.getFullYear(), now.getMonth() - 1, 4),
      method: "PESAPAL",
      referenceNumber: "PP789456",
      notes: "Online payment via PesaPal",
      agencyId: agency1.id,
    },
  });

  // Create M-Pesa Transactions
  console.log("📱 Creating M-Pesa transactions...");
  await prisma.mpesaTransaction.create({
    data: {
      merchantRequestId: "29115-34620561-1",
      checkoutRequestId: "ws_CO_191220191020363925",
      phoneNumber: "254712345678",
      amount: 50000,
      accountReference: lease1.id,
      transactionDesc: "Rent Payment",
      status: "SUCCESS",
      responseCode: "0",
      responseDescription: "The service request is processed successfully.",
      mpesaReceiptNumber: "QA12XYZ789",
      transactionDate: new Date(),
      resultCode: "0",
      resultDescription: "The service request is processed successfully.",
      leaseId: lease1.id,
      agencyId: agency1.id,
      completedAt: new Date(),
    },
  });

  await prisma.mpesaTransaction.create({
    data: {
      merchantRequestId: "29115-34620562-1",
      checkoutRequestId: "ws_CO_191220191020363926",
      phoneNumber: "254723456789",
      amount: 75000,
      accountReference: lease2.id,
      transactionDesc: "Rent Payment",
      status: "PENDING",
      agencyId: agency1.id,
    },
  });

  // Create PesaPal Transactions
  console.log("💳 Creating PesaPal transactions...");
  await prisma.pesapalTransaction.create({
    data: {
      merchantReference: "PP" + Date.now(),
      orderTrackingId: "d9e0b8c1-4a5f-4c3d-9e2f-1a2b3c4d5e6f",
      amount: 75000,
      currency: "KES",
      description: "Rent Payment - Unit B201",
      customerEmail: "mary.wanjiku@email.com",
      customerPhone: "+254723456789",
      status: "COMPLETED",
      paymentMethod: "Card",
      paymentAccount: "****1234",
      transactionDate: new Date(),
      confirmationCode: "PP789456",
      paymentStatusDescription: "Payment completed successfully",
      leaseId: lease2.id,
      agencyId: agency1.id,
      completedAt: new Date(),
    },
  });

  await prisma.pesapalTransaction.create({
    data: {
      merchantReference: "PP" + (Date.now() + 1),
      amount: 35000,
      currency: "KES",
      description: "Rent Payment - Downtown Plaza",
      customerEmail: "peter.omondi@email.com",
      customerPhone: "+254734567890",
      status: "PENDING",
      agencyId: agency2.id,
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`- Agencies: 2`);
  console.log(`- Users: 3 (admin@acme.com, manager@acme.com, agent@prime.com)`);
  console.log(`- Properties: 3`);
  console.log(`- Units: 5`);
  console.log(`- Tenants: 4`);
  console.log(`- Leases: 3`);
  console.log(`- Invoices: 3`);
  console.log(`- Payments: 3`);
  console.log(`- M-Pesa Transactions: 2`);
  console.log(`- PesaPal Transactions: 2`);
  console.log("\n🔑 Login credentials:");
  console.log("Email: admin@acme.com");
  console.log("Password: password123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
