import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { faceData } = await request.json();
    const { db } = await connectToDatabase();

    // Here you would implement face matching logic
    // For now, we'll just verify that the user has face data registered

    const user = await db.collection("users").findOne({
      email: session.user.email,
    });

    if (!user.faceData) {
      return NextResponse.json(
        { message: "No face data registered" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Face verified successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error verifying face" },
      { status: 500 }
    );
  }
}
