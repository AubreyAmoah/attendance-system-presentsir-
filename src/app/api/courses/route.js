import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "lecturer") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const courseData = await request.json();
    const { db } = await connectToDatabase();

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (
      !timeRegex.test(courseData.startTime) ||
      !timeRegex.test(courseData.endTime)
    ) {
      return NextResponse.json(
        { message: "Invalid time format" },
        { status: 400 }
      );
    }

    // Validate days of week
    const validDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    if (!courseData.daysOfWeek.every((day) => validDays.includes(day))) {
      return NextResponse.json(
        { message: "Invalid days of week" },
        { status: 400 }
      );
    }

    const course = await db.collection("courses").insertOne({
      ...courseData,
      lecturerId: session.user.email,
      students: [],
      createdAt: new Date(),
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating course" },
      { status: 500 }
    );
  }
}
