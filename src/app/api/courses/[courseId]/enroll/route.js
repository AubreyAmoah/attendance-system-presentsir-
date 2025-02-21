import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { ObjectId } from "mongodb";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
    const { db } = await connectToDatabase();

    await db
      .collection("courses")
      .updateOne(
        { _id: new ObjectId(courseId) },
        { $addToSet: { students: session.user.email } }
      );

    return NextResponse.json(
      { message: "Successfully enrolled in course" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error enrolling in course" },
      { status: 500 }
    );
  }
}
