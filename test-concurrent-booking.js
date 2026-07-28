const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function attemptBooking(requestId, roomId, startTime, endTime) {
  console.log(`[Request ${requestId}] Starting booking transaction...`);
  return await prisma.$transaction(
    async (tx) => {
      // 1. Acquire exclusive PostgreSQL row lock on Room
      await tx.$executeRawUnsafe(
        'SELECT id FROM "Room" WHERE id = $1 FOR UPDATE',
        roomId
      );
      console.log(`[Request ${requestId}] Acquired row lock on Room.`);

      // 2. Check for overlapping bookings in the database
      const overlapping = await tx.booking.findFirst({
        where: {
          roomId: roomId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (overlapping) {
        console.log(`[Request ${requestId}] CONFLICT detected! Overlapping booking exists.`);
        throw new Error("CONFLICT:Room is already booked for this time slot.");
      }

      // Simulate a small delay (e.g. calling external API like Google Calendar)
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 3. Create the booking record
      const booking = await tx.booking.create({
        data: {
          roomId: roomId,
          eventId: `test_event_${requestId}_${Date.now()}`,
          startTime: startTime,
          endTime: endTime,
        },
      });

      console.log(`[Request ${requestId}] Booking successful! Created booking ID: ${booking.id}`);
      return booking;
    },
    { maxWait: 10000, timeout: 15000 }
  );
}

async function runTest() {
  const roomId = "cms2u6utn0000vgzwc3qg3mcu";
  const now = new Date();
  const thirtyMinsLater = new Date(now.getTime() + 30 * 60 * 1000);

  console.log("=== Starting Concurrent Booking Simulation ===");
  console.log(`Simulating 2 simultaneous booking requests for room: ${roomId}`);

  // Ensure no test bookings exist before running
  await prisma.booking.deleteMany({ where: { roomId } });

  // Fire both booking requests at the exact same moment
  const results = await Promise.allSettled([
    attemptBooking(1, roomId, now, thirtyMinsLater),
    attemptBooking(2, roomId, now, thirtyMinsLater),
  ]);

  let successes = 0;
  let conflicts = 0;

  results.forEach((res, index) => {
    if (res.status === "fulfilled") {
      successes++;
      console.log(`✓ Request ${index + 1}: SUCCEEDED (${res.value.eventId})`);
    } else {
      const isConflict = res.reason.message.includes("CONFLICT:");
      if (isConflict) {
        conflicts++;
        console.log(`✓ Request ${index + 1}: BLOCKED AS EXPECTED (${res.reason.message})`);
      } else {
        console.error(`✗ Request ${index + 1}: UNEXPECTED ERROR:`, res.reason.message);
      }
    }
  });

  console.log("\n=== Test Results ===");
  console.log(`Total Requests: 2 | Successes: ${successes} | Conflicts Blocked: ${conflicts}`);

  if (successes === 1 && conflicts === 1) {
    console.log("🎉 SUCCESS: Double-booking prevention verified! Only 1 booking succeeded.");
  } else {
    console.error("❌ FAILURE: Concurrency test did not behave as expected.");
    process.exitCode = 1;
  }

  // Clean up test booking
  await prisma.booking.deleteMany({ where: { roomId } });
  await prisma.$disconnect();
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
