// app/api/users/face-registration/[index]/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const index = parseInt(params.index);
    if (isNaN(index)) {
      return NextResponse.json({ message: "Invalid index" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Get current face images
    const user = await db
      .collection("users")
      .findOne(
        { email: session.user.email },
        { projection: { faceImages: 1 } }
      );

    if (!user || !user.faceImages || !user.faceImages[index]) {
      return NextResponse.json(
        { message: "Face image not found" },
        { status: 404 }
      );
    }

    // Remove the specified image
    const updatedImages = user.faceImages.filter((_, i) => i !== index);

    // Update user record
    await db.collection("users").updateOne(
      { email: session.user.email },
      {
        $set: {
          faceImages: updatedImages,
          faceRegistrationComplete: updatedImages.length > 0,
          updatedAt: new Date(),
        },
      }
    );

    // Log the change
    await db.collection("faceRegistrationLogs").insertOne({
      userId: session.user.email,
      action: "delete_image",
      imageIndex: index,
      timestamp: new Date(),
      remainingImages: updatedImages.length,
    });

    return NextResponse.json({
      message: "Face image deleted successfully",
      remainingCount: updatedImages.length,
    });
  } catch (error) {
    console.error("Error deleting face image:", error);
    return NextResponse.json(
      { message: "Error deleting face image" },
      { status: 500 }
    );
  }
}

