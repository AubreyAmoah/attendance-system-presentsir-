import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { scheduleNotifications } from "@/lib/scheduleJobs";

export async function GET(request) {
  try {
    // Verify cron secret to ensure only authorized calls
    const { headers } = request;
    const authHeader = headers.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    await scheduleNotifications(db);

    return NextResponse.json({
      message: "Notifications scheduled successfully",
    });
  } catch (error) {
    console.error("Error in notification cron:", error);
    return NextResponse.json(
      { message: "Error scheduling notifications" },
      { status: 500 }
    );
  }
}
