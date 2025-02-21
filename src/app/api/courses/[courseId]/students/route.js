import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { ObjectId } from "mongodb";

// Get all students in a course
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "lecturer") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
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

    // Get student details
    const students = await db
      .collection("users")
      .find({
        email: { $in: course.students },
        role: "student",
      })
      .project({
        name: 1,
        email: 1,
      })
      .toArray();

    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching students" },
      { status: 500 }
    );
  }
}

// Add a student to a course
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "lecturer") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
    const { email } = await request.json();
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

    // Verify the student exists
    const student = await db.collection("users").findOne({
      email,
      role: "student",
    });

    if (!student) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 }
      );
    }

    // Add student to course
    await db
      .collection("courses")
      .updateOne(
        { _id: new ObjectId(courseId) },
        { $addToSet: { students: email } }
      );

    return NextResponse.json(
      { message: "Student added successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error adding student" },
      { status: 500 }
    );
  }
}
