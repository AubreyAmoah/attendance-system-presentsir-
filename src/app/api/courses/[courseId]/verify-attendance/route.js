// app/api/courses/[courseId]/verify-attendance/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { ObjectId } from "mongodb";
import { isCourseLive } from "@/lib/courseUtils";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
    const { faceData, timestamp } = await request.json();

    const { db } = await connectToDatabase();

    // Verify student is enrolled in the course
    const course = await db.collection("courses").findOne({
      _id: new ObjectId(courseId),
      students: session.user.email,
    });

    if (!course) {
      return NextResponse.json(
        { message: "Not enrolled in this course" },
        { status: 403 }
      );
    }

    // Check if course is live
    if (!isCourseLive(course)) {
      return NextResponse.json(
        {
          message: "Attendance can only be marked during scheduled class time",
        },
        { status: 403 }
      );
    }

    // Check if attendance already marked for today
    const today = new Date(timestamp);
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await db.collection("attendance").findOne({
      courseId: new ObjectId(courseId),
      studentEmail: session.user.email,
      timestamp: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { message: "Attendance already marked for today" },
        { status: 400 }
      );
    }

    // Store attendance record with face data
    const attendanceRecord = await db.collection("attendance").insertOne({
      courseId: new ObjectId(courseId),
      studentEmail: session.user.email,
      timestamp: new Date(timestamp),
      faceData,
      verificationMethod: "face_recognition",
      status: "present",
      createdAt: new Date(),
    });

    return NextResponse.json({
      message: "Attendance marked successfully",
      attendanceId: attendanceRecord.insertedId,
    });
  } catch (error) {
    console.error("Attendance verification error:", error);
    return NextResponse.json(
      { message: "Error marking attendance" },
      { status: 500 }
    );
  }
}
