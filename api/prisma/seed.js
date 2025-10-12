import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const agency = await prisma.agency.create({ data: { name: "Acme Realty" } });
  const passwordHash = await bcrypt.hash("password123", 10);
  const user = await prisma.user.create({
    data: {
      email: "owner@acme.com",
      name: "Owner One",
      passwordHash,
      role: "ADMIN",
      agencyId: agency.id,
    },
  });

  const property = await prisma.property.create({
    data: {
      title: "Sunny Apartment",
      address: "123 Main St",
      city: "Metropolis",
      bedrooms: 2,
      bathrooms: 1,
      sizeSqFt: 900,
      rentAmount: 1500,
      agencyId: agency.id,
    },
  });

  const tenant = await prisma.tenant.create({
    data: { name: "Jane Doe", email: "jane@example.com", agencyId: agency.id },
  });

  const lease = await prisma.lease.create({
    data: {
      propertyId: property.id,
      tenantId: tenant.id,
      agencyId: agency.id,
      startDate: new Date(),
      rentAmount: 1500,
      paymentDayOfMonth: 1,
    },
  });

  await prisma.payment.create({
    data: {
      leaseId: lease.id,
      amount: 1500,
      paidAt: new Date(),
      method: "bank",
      agencyId: agency.id,
    },
  });

  console.log({ agency, user, property, tenant, lease });
}

main().finally(() => prisma.$disconnect());
