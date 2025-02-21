import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/auth.config";


export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "lecturer") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, code, schedule } = await request.json();
    const { db } = await connectToDatabase();

    const course = await db.collection("courses").insertOne({
      name,
      code,
      schedule,
      lecturerId: session.user.email,
      createdAt: new Date(),
      students: [],
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating course" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    const courses =
      session.user.role === "lecturer"
        ? await db
            .collection("courses")
            .find({ lecturerId: session.user.email })
            .toArray()
        : await db
            .collection("courses")
            .find({ students: session.user.email })
            .toArray();

    return NextResponse.json(courses);
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching courses" },
      { status: 500 }
    );
  }
}
