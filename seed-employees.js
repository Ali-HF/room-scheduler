const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const sampleEmployees = [
  {
    name: "Alex Morgan",
    email: "alex.morgan@company.com",
    department: "Engineering",
    workStatus: "in_office",
  },
  {
    name: "Sarah Chen",
    email: "sarah.chen@company.com",
    department: "Product Design",
    workStatus: "remote",
  },
  {
    name: "Jordan Taylor",
    email: "jordan.taylor@company.com",
    department: "Engineering",
    workStatus: "in_office",
  },
  {
    name: "David Miller",
    email: "david.miller@company.com",
    department: "Finance & Ops",
    workStatus: "in_office",
  },
  {
    name: "Elena Rostova",
    email: "elena.rostova@company.com",
    department: "Product Design",
    workStatus: "remote",
  },
  {
    name: "Marcus Vance",
    email: "marcus.vance@company.com",
    department: "Executive",
    workStatus: "in_office",
  },
  {
    name: "Priya Patel",
    email: "priya.patel@company.com",
    department: "People & HR",
    workStatus: "remote",
  },
  {
    name: "Lucas Santos",
    email: "lucas.santos@company.com",
    department: "Marketing",
    workStatus: "in_office",
  },
];

async function seed() {
  console.log("Seeding realistic sample employees (in office & remote)...");
  for (const emp of sampleEmployees) {
    const res = await prisma.employee.upsert({
      where: { email: emp.email },
      update: {
        name: emp.name,
        department: emp.department,
        workStatus: emp.workStatus,
      },
      create: emp,
    });
    console.log(` -> Seeded: ${res.name} (${res.department}) - [${res.workStatus === "remote" ? "Remote" : "In Office"}]`);
  }
  console.log("✅ Successfully seeded 8 employees!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
