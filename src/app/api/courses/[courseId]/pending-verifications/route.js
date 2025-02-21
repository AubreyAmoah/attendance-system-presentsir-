import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "lecturer") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
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

    // Get all pending verifications with student details
    const pendingVerifications = await db
      .collection("attendance")
      .aggregate([
        {
          $match: {
            courseId: new ObjectId(courseId),
            verificationStatus: "pending",
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
            location: 1,
            faceData: 1,
            studentEmail: 1,
            studentName: "$studentDetails.name",
            verificationStatus: 1,
            createdAt: 1,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray();

    return NextResponse.json(pendingVerifications);
  } catch (error) {
    console.error("Error fetching pending verifications:", error);
    return NextResponse.json(
      { message: "Error fetching pending verifications" },
      { status: 500 }
    );
  }
}
