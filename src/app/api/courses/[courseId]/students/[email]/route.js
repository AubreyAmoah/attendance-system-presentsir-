import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { ObjectId } from "mongodb";

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "lecturer") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId, email } = params;
    const { db } = await connectToDatabase();

    // Verify the lecturer owns the course
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

    // Remove student from course
    await db
      .collection("courses")
      .updateOne(
        { _id: new ObjectId(courseId) },
        { $pull: { students: email } }
      );

    // Delete attendance records for this student in this course
    await db.collection("attendance").deleteMany({
      courseId: new ObjectId(courseId),
      studentEmail: email,
    });

    return NextResponse.json(
      { message: "Student removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error removing student" },
      { status: 500 }
    );
  }
}
