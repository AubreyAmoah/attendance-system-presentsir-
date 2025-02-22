// app/api/courses/[courseId]/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "../../auth/auth.config";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;
    const { db } = await connectToDatabase();

    // Find the course
    const course = await db.collection("courses").findOne({
      _id: new ObjectId(courseId),
    });

    if (!course) {
      return NextResponse.json(
        { message: "Course not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this course
    const hasAccess =
      (session.user.role === "lecturer" &&
        course.lecturerId === session.user.email) ||
      (session.user.role === "student" &&
        course.students.includes(session.user.email));

    if (!hasAccess) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    // Get attendance statistics
    const attendanceStats = await db
      .collection("attendance")
      .aggregate([
        { $match: { courseId: new ObjectId(courseId) } },
        {
          $group: {
            _id: "$studentEmail",
            totalAttendance: { $sum: 1 },
            verifiedAttendance: {
              $sum: { $cond: ["$verified", 1, 0] },
            },
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      ...course,
      attendanceStats,
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { message: "Error fetching course details" },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "lecturer") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
    const updates = await request.json();
    const { db } = await connectToDatabase();

    // Ensure lecturer owns the course
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

    // Update course details
    const result = await db
      .collection("courses")
      .updateOne({ _id: new ObjectId(courseId) }, { $set: updates });

    if (result.modifiedCount === 0) {
      return NextResponse.json({ message: "No changes made" }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Course updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { message: "Error updating course" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "lecturer") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
    const { db } = await connectToDatabase();

    // Ensure lecturer owns the course
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

    // Delete all attendance records for this course
    await db.collection("attendance").deleteMany({
      courseId: new ObjectId(courseId),
    });

    // Delete the course
    await db.collection("courses").deleteOne({
      _id: new ObjectId(courseId),
    });

    return NextResponse.json(
      { message: "Course deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { message: "Error deleting course" },
      { status: 500 }
    );
  }
}
