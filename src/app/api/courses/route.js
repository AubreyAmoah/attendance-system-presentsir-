import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { isCourseLive } from "@/lib/courseUtils";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    let courses;

    if (session.user.role === "lecturer") {
      // Get courses where user is lecturer
      courses = await db
        .collection("courses")
        .find({ lecturerId: session.user.email })
        .toArray();
    } else {
      // Get courses where user is enrolled as student
      courses = await db
        .collection("courses")
        .find({ students: session.user.email })
        .toArray();
    }

    // Add live status to each course
    const coursesWithStatus = courses.map((course) => ({
      ...course,
      isLive: isCourseLive(course),
    }));

    return NextResponse.json(coursesWithStatus);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { message: "Error fetching courses" },
      { status: 500 }
    );
  }
}

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
