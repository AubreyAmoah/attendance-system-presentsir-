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
    const { status } = await request.json();

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

    // Update attendance verification status
    const result = await db.collection("attendance").updateOne(
      {
        _id: new ObjectId(attendanceId),
        courseId: new ObjectId(courseId),
        verificationStatus: "pending",
      },
      {
        $set: {
          verificationStatus: status,
          verifiedBy: session.user.email,
          verifiedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Attendance record not found or already verified" },
        { status: 404 }
      );
    }

    // Get updated attendance record
    const updatedAttendance = await db
      .collection("attendance")
      .aggregate([
        {
          $match: {
            _id: new ObjectId(attendanceId),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "studentEmail",
            foreignField: "email",
            as: "studentDetails",
          },
        },
        {
          $unwind: "$studentDetails",
        },
        {
          $project: {
            _id: 1,
            timestamp: 1,
            studentEmail: 1,
            studentName: "$studentDetails.name",
            verificationStatus: 1,
            verifiedBy: 1,
            verifiedAt: 1,
          },
        },
      ])
      .next();

    return NextResponse.json({
      message: `Attendance ${status} successfully`,
      attendance: updatedAttendance,
    });
  } catch (error) {
    console.error("Error updating verification status:", error);
    return NextResponse.json(
      { message: "Error updating verification status" },
      { status: 500 }
    );
  }
}
