// app/api/courses/[courseId]/pending-verifications/route.js
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
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

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

    // Get date range for the specified date
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    // Get pending verifications with student details
    const pendingVerifications = await db
      .collection("attendance")
      .aggregate([
        {
          $match: {
            courseId: new ObjectId(courseId),
            verificationMethod: "face_recognition",
            status: "pending",
            timestamp: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "studentEmail",
            foreignField: "email",
            as: "student",
          },
        },
        {
          $unwind: "$student",
        },
        {
          $project: {
            _id: 1,
            timestamp: 1,
            faceData: 1,
            studentEmail: 1,
            studentName: "$student.name",
            status: 1,
          },
        },
        {
          $sort: { timestamp: -1 },
        },
      ])
      .toArray();

    return NextResponse.json(pendingVerifications);
  } catch (error) {
    console.error("Error fetching pending verifications:", error);
    return NextResponse.json(
      { message: "Error fetching verifications" },
      { status: 500 }
    );
  }
}
