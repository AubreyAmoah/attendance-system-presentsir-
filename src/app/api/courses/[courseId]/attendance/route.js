import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { ObjectId } from "mongodb";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
    const { faceData } = await request.json();
    const { db } = await connectToDatabase();

    // Verify student is enrolled in the course
    const course = await db.collection("courses").findOne({
      _id: new ObjectId(courseId),
      students: session.user.email,
    });

    if (!course) {
      return NextResponse.json(
        { message: "Student not enrolled in course" },
        { status: 403 }
      );
    }

    // Record attendance
    const attendance = await db.collection("attendance").insertOne({
      courseId: new ObjectId(courseId),
      studentEmail: session.user.email,
      faceData,
      timestamp: new Date(),
      verified: true, // In production, implement face matching here
    });

    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error recording attendance" },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
    const { db } = await connectToDatabase();

    const attendance =
      session.user.role === "lecturer"
        ? await db
            .collection("attendance")
            .find({ courseId: new ObjectId(courseId) })
            .toArray()
        : await db
            .collection("attendance")
            .find({
              courseId: new ObjectId(courseId),
              studentEmail: session.user.email,
            })
            .toArray();

    return NextResponse.json(attendance);
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching attendance" },
      { status: 500 }
    );
  }
}
