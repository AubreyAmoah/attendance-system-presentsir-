import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "student") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { message: "Course code is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Find courses that match the code and where the student is not already enrolled
    const courses = await db
      .collection("courses")
      .find({
        code: { $regex: code, $options: "i" },
        students: { $ne: session.user.email },
      })
      .toArray();

    return NextResponse.json(courses);
  } catch (error) {
    return NextResponse.json(
      { message: "Error searching courses" },
      { status: 500 }
    );
  }
}
