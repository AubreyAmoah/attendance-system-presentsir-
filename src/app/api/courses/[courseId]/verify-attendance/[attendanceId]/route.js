// app/api/courses/[courseId]/verify-attendance/[attendanceId]/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { ObjectId } from "mongodb";

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "lecturer") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId, attendanceId } = params;
    const { status, comment } = await request.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { message: "Invalid verification status" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Verify lecturer owns the course
    const course = await db.collection("courses").findOne({
      _id: new ObjectId(courseId),
      lecturerId: session.user.email,
    });

    if (!course) {
      return NextResponse.json(
        { message: "Course not found or access denied" },
        { status: 404 }
      );
    }

    // Update attendance record
    const result = await db.collection("attendance").updateOne(
      {
        _id: new ObjectId(attendanceId),
        courseId: new ObjectId(courseId),
      },
      {
        $set: {
          status: status === "approved" ? "present" : "absent",
          verifiedBy: session.user.email,
          verifiedAt: new Date(),
          verificationComment: comment,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Attendance record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Attendance ${status} successfully`,
    });
  } catch (error) {
    console.error("Error verifying attendance:", error);
    return NextResponse.json(
      { message: "Error verifying attendance" },
      { status: 500 }
    );
  }
}
