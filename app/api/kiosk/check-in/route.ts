import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { visitorName, company, hostId } = body;

    if (
      !visitorName ||
      typeof visitorName !== "string" ||
      !visitorName.trim() ||
      visitorName.trim().length > 100
    ) {
      return NextResponse.json(
        { error: "Valid visitor name (max 100 chars) is required." },
        { status: 400 }
      );
    }

    if (!hostId || typeof hostId !== "string" || !hostId.trim()) {
      return NextResponse.json(
        { error: "Valid host employee ID is required." },
        { status: 400 }
      );
    }

    if (company && (typeof company !== "string" || company.trim().length > 100)) {
      return NextResponse.json(
        { error: "Company name exceeds maximum length (max 100 chars)." },
        { status: 400 }
      );
    }

    const host = await prisma.employee.findUnique({
      where: { id: hostId },
    });

    if (!host) {
      return NextResponse.json(
        { error: "Selected host employee not found." },
        { status: 404 }
      );
    }

    // STEP 1: Always record the check-in in the database FIRST!
    const visit = await prisma.visit.create({
      data: {
        visitorName: String(visitorName).trim(),
        company: company ? String(company).trim() : null,
        hostId: host.id,
        hostNotified: false,
      },
    });

    // STEP 2: Attempt to send host notification email via Resend
    let hostNotified = false;
    let notificationError: string | null = null;

    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const emailResult = await resend.emails.send({
          from: "Lobby Kiosk <onboarding@resend.dev>",
          to: [host.email],
          subject: `🔔 Visitor Arrival: ${visitorName}`,
          html: `
            <div style="font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; rounded: 16px;">
              <h2 style="color: #4f46e5; margin-top: 0;">Your Visitor Has Arrived!</h2>
              <p>Hi <strong>${host.name}</strong>,</p>
              <p>Your visitor is currently checked in and waiting in the lobby:</p>
              <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #4f46e5;">
                <p style="margin: 4px 0;"><strong>Visitor Name:</strong> ${visitorName}</p>
                <p style="margin: 4px 0;"><strong>Company:</strong> ${company || "Independent / N/A"}</p>
                <p style="margin: 4px 0;"><strong>Check-in Time:</strong> ${new Date().toLocaleTimeString()}</p>
              </div>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Automated notification from Lobby Touchscreen Kiosk System.</p>
            </div>
          `,
        });

        if (emailResult.error) {
          notificationError = emailResult.error.message;
          console.warn("Resend API warning:", emailResult.error);
        } else {
          hostNotified = true;
        }
      } catch (err: unknown) {
        notificationError = err instanceof Error ? err.message : "Failed to dispatch Resend email";
        console.error(
          "Resend email error (handled gracefully):",
          err instanceof Error ? err.message : "Unknown error"
        );
      }
    } else {
      notificationError = "email skipped: no API key configured";
      console.info("[Kiosk Check-In] email skipped: no API key configured. Visit recorded in database.");
    }

    // STEP 3: Update visit record with email notification result
    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        hostNotified,
        notificationError,
      },
    });

    // STEP 4: Return HTTP 200 SUCCESS regardless of email outcome!
    return NextResponse.json({
      success: true,
      visitId: visit.id,
      hostName: host.name,
      hostNotified,
      notificationError,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Check-in failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
