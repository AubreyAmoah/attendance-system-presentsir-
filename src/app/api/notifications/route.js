import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const { db } = await connectToDatabase();

    const query = { userId: session.user.email };
    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await db
      .collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { message: "Error fetching notifications" },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { notificationId } = await request.json();

    const { db } = await connectToDatabase();

    const result = await db.collection("notifications").updateOne(
      {
        _id: new ObjectId(notificationId),
        userId: session.user.email,
      },
      {
        $set: {
          isRead: true,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { message: "Error updating notification" },
      { status: 500 }
    );
  }
}
