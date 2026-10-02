import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const passwordHash = await bcrypt.hash("Demo-Pass-123", 10);

const businesses = [
  {
    name: "Northside Barbers",
    slug: "northside-barbers",
    timezone: "America/Chicago",
    currency: "USD",
  },
  {
    name: "Lotus Physio Studio",
    slug: "lotus-physio",
    timezone: "Europe/London",
    currency: "GBP",
  },
] as const;

const serviceTemplates = [
  { name: "Signature Cut", description: "Precision haircut and finish.", durationMin: 45, usd: 3200, gbp: 3000 },
  { name: "Beard Trim", description: "Shape, trim, and hot towel finish.", durationMin: 30, usd: 2200, gbp: 2000 },
  { name: "Consultation", description: "One-to-one assessment and care plan.", durationMin: 30, usd: 1800, gbp: 1800 },
  { name: "Deep Treatment", description: "Focused treatment session.", durationMin: 60, usd: 6500, gbp: 6000 },
  { name: "Premium Session", description: "Extended personalized service.", durationMin: 90, usd: 9000, gbp: 8500 },
] as const;

const customerNames = [
  "Ava Bennett",
  "Noah Carter",
  "Mia Brooks",
  "Ethan Reed",
  "Olivia Hayes",
  "Liam Foster",
  "Emma Collins",
  "Lucas Morgan",
];

const serviceDate = (base: Date, minutes: number) => {
  const d = new Date(base);
  d.setUTCHours(0, minutes, 0, 0);
  return d;
};

async function seedBusiness(input: (typeof businesses)[number]) {
  await prisma.business.deleteMany({ where: { slug: input.slug } });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          `owner@${input.slug}.test`,
          `manager@${input.slug}.test`,
          `staff@${input.slug}.test`,
        ],
      },
    },
  });

  const business = await prisma.business.create({
    data: input,
  });

  const roles = [
    { role: "OWNER" as const, label: "owner" },
    { role: "MANAGER" as const, label: "manager" },
    { role: "STAFF" as const, label: "staff" },
  ];

  const users = [];
  for (const item of roles) {
    const user = await prisma.user.create({
      data: {
        name: `${item.label.charAt(0).toUpperCase()}${item.label.slice(1)} ${input.name}`,
        email: `${item.label}@${input.slug}.test`,
        passwordHash,
      },
    });
    await prisma.membership.create({
      data: { userId: user.id, businessId: business.id, role: item.role },
    });
    users.push(user);
  }

  const staff = [];
  for (let index = 0; index < 3; index += 1) {
    staff.push(
      await prisma.staff.create({
        data: {
          businessId: business.id,
          userId: users[index % users.length]?.id,
          name: ["Alex", "Jordan", "Taylor"][index] ?? `Staff ${index + 1}`,
          email: `${["alex", "jordan", "taylor"][index] ?? `staff${index + 1}`}@${input.slug}.test`,
          isActive: true,
        },
      }),
    );
  }

  const services = [];
  for (const template of serviceTemplates) {
    services.push(
      await prisma.service.create({
        data: {
          businessId: business.id,
          name: template.name,
          description: template.description,
          durationMin: template.durationMin,
          priceCents: input.currency === "GBP" ? template.gbp : template.usd,
          isActive: true,
        },
      }),
    );
  }

  for (const member of staff) {
    for (const service of services) {
      await prisma.staffService.create({
        data: {
          businessId: business.id,
          staffId: member.id,
          serviceId: service.id,
        },
      });
    }
  }

  for (const member of staff) {
    for (const weekday of [1, 2, 3, 4, 5]) {
      const firstEnd = member === staff[1] ? 720 : 1020;
      await prisma.workingHours.create({
        data: {
          businessId: business.id,
          staffId: member.id,
          weekday,
          startsAt: serviceDate(new Date(), 540),
          endsAt: serviceDate(new Date(), firstEnd),
        },
      });
      if (member === staff[1]) {
        await prisma.workingHours.create({
          data: {
            businessId: business.id,
            staffId: member.id,
            weekday,
            startsAt: serviceDate(new Date(), 780),
            endsAt: serviceDate(new Date(), 1020),
          },
        });
      }
    }
  }

  const customers = [];
  for (let index = 0; index < customerNames.length; index += 1) {
    customers.push(
      await prisma.customer.create({
        data: {
          businessId: business.id,
          name: customerNames[index] ?? `Customer ${index + 1}`,
          email: `customer${index + 1}@${input.slug}.test`,
          phone: `+1-555-010-${String(index + 1).padStart(2, "0")}`,
        },
      }),
    );
  }

  const now = new Date();
  const bookings = [];
  const statuses = ["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "NO_SHOW", "CANCELLED", "CANCELLED"] as const;

  for (let index = 0; index < 10; index += 1) {
    const start = new Date(now.getTime() - (index + 1) * 24 * 60 * 60 * 1000);
    start.setUTCHours(10 + index, 0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    bookings.push(
      await prisma.booking.create({
        data: {
          businessId: business.id,
          serviceId: services[index % services.length]?.id ?? "",
          staffId: staff[index % staff.length]?.id ?? "",
          customerId: customers[index % customers.length]?.id ?? "",
          startsAt: start,
          endsAt: end,
          status: statuses[index] ?? "COMPLETED",
          notes: index % 3 === 0 ? "Seeded demo booking." : null,
          cancelToken: `${input.slug}-${index}-${crypto.randomUUID()}`,
        },
      }),
    );
  }

  for (let index = 0; index < 10; index += 1) {
    const start = new Date(now.getTime() + (index + 1) * 24 * 60 * 60 * 1000);
    start.setUTCHours(10 + index, 0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    bookings.push(
      await prisma.booking.create({
        data: {
          businessId: business.id,
          serviceId: services[index % services.length]?.id ?? "",
          staffId: staff[index % staff.length]?.id ?? "",
          customerId: customers[index % customers.length]?.id ?? "",
          startsAt: start,
          endsAt: end,
          status: "CONFIRMED",
          notes: null,
          cancelToken: `${input.slug}-future-${index}-${crypto.randomUUID()}`,
        },
      }),
    );
  }

  return { business, users, staff, services, customers, bookings };
}

try {
  for (const business of businesses) {
    await seedBusiness(business);
  }
  console.log("Seed complete: 2 businesses, 40 bookings.");
} finally {
  await prisma.$disconnect();
}

