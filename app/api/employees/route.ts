import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_EMPLOYEES = [
  { name: "Ali Hasan", email: "hf.alihasan0@gmail.com", department: "Engineering" },
  { name: "Ali Hasan (Secondary)", email: "0alihasanfarooqui0@gmail.com", department: "Product & Operations" },
  { name: "Sarah Jenkins", email: "sarah.jenkins@company.com", department: "Design" },
  { name: "Michael Chen", email: "michael.chen@company.com", department: "Executive" },
];

export async function GET() {
  try {
    let employees = await prisma.employee.findMany({
      orderBy: { name: "asc" },
    });

    // Auto-seed default employees if table is empty
    if (employees.length === 0) {
      await prisma.employee.createMany({
        data: DEFAULT_EMPLOYEES,
      });
      employees = await prisma.employee.findMany({
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json(employees);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load employees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
