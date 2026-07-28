import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAllowedEmployeeDomain, getAllowedDomainName } from "@/lib/domain";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  const email = session.user.email.toLowerCase().trim();

  try {
    let employee = await prisma.employee.findUnique({
      where: { email },
    });

    // If no existing record and domain is not allowed, block automatic creation
    if (!employee) {
      if (!isAllowedEmployeeDomain(email)) {
        const allowedDomain = getAllowedDomainName();
        return NextResponse.json(
          {
            error: `Access Denied: Your email domain (@${email.split("@")[1]}) is not authorized to register as an employee.`,
            domainRestricted: true,
            allowedDomain: allowedDomain ? `@${allowedDomain}` : null,
          },
          { status: 403 }
        );
      }

      // Auto-create Employee record ONLY if email domain matches ALLOWED_EMAIL_DOMAIN
      employee = await prisma.employee.create({
        data: {
          name: session.user.name || email.split("@")[0],
          email: email,
          department: "General",
          workStatus: "in_office",
        },
      });
    }

    return NextResponse.json(employee);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  const email = session.user.email.toLowerCase().trim();

  try {
    const body = await request.json();
    const { workStatus } = body;

    if (workStatus !== "in_office" && workStatus !== "remote") {
      return NextResponse.json(
        { error: "Invalid workStatus. Must be 'in_office' or 'remote'." },
        { status: 400 }
      );
    }

    let employee = await prisma.employee.findUnique({
      where: { email },
    });

    if (!employee) {
      if (!isAllowedEmployeeDomain(email)) {
        const allowedDomain = getAllowedDomainName();
        return NextResponse.json(
          {
            error: `Access Denied: Your email domain (@${email.split("@")[1]}) is not authorized to toggle employee presence.`,
            domainRestricted: true,
            allowedDomain: allowedDomain ? `@${allowedDomain}` : null,
          },
          { status: 403 }
        );
      }

      employee = await prisma.employee.create({
        data: {
          name: session.user.name || email.split("@")[0],
          email: email,
          department: "General",
          workStatus,
        },
      });
    } else {
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: { workStatus },
      });
    }

    return NextResponse.json(employee);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update work status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
