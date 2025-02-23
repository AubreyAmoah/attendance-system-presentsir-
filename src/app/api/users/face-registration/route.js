// app/api/users/face-registration/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { ImageValidator } from "@/lib/imageValidation";

const imageValidator = new ImageValidator();

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { faceImages } = await request.json();

    // Validate input
    if (!Array.isArray(faceImages) || faceImages.length === 0) {
      return NextResponse.json(
        { message: "At least one face image is required" },
        { status: 400 }
      );
    }

    // Initialize validator
    await imageValidator.initialize();

    // Validate each image
    const validationResults = await Promise.all(
      faceImages.map(async (face) => {
        const result = await imageValidator.validateImage(face.image);
        return {
          ...face,
          validation: result,
        };
      })
    );

    // Check if any images failed validation
    const failedValidations = validationResults.filter(
      (result) => !result.validation.isValid
    );
    if (failedValidations.length > 0) {
      return NextResponse.json(
        {
          message: "Some images failed validation",
          errors: failedValidations.map((result) => ({
            timestamp: result.timestamp,
            error: result.validation.error,
          })),
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Store validated face images
    const processedImages = validationResults.map((result) => ({
      image: result.image,
      timestamp: result.timestamp,
      metadata: {
        dimensions: result.validation.dimensions,
        faceLocation: result.validation.faceLocation,
        quality: result.validation.quality,
      },
      registeredAt: new Date(),
    }));

    // Update user record
    const updateResult = await db.collection("users").updateOne(
      { email: session.user.email },
      {
        $set: {
          faceImages: processedImages,
          faceRegistrationComplete: true,
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Create registration record
    await db.collection("faceRegistrations").insertOne({
      userId: session.user.email,
      imageCount: processedImages.length,
      registeredAt: new Date(),
      status: "active",
      metadata: {
        userAgent: request.headers.get("user-agent"),
        registrationMethod: "web",
        imageQualities: processedImages.map((img) => img.metadata.quality),
      },
    });

    return NextResponse.json({
      message: "Face images saved successfully",
      imageCount: processedImages.length,
      validationDetails: processedImages.map((img) => ({
        timestamp: img.timestamp,
        quality: img.metadata.quality,
      })),
    });
  } catch (error) {
    console.error("Face registration error:", error);
    return NextResponse.json(
      { message: "Error saving face images" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Fetch user's face registration data
    const user = await db.collection("users").findOne(
      { email: session.user.email },
      {
        projection: {
          faceImages: 1,
          faceRegistrationComplete: 1,
          updatedAt: 1,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // If no face registration data exists
    if (!user.faceImages || user.faceImages.length === 0) {
      return NextResponse.json({
        message: "No face registration data found",
        isRegistered: false,
        data: null,
      });
    }

    // Return face registration data
    return NextResponse.json({
      message: "Face registration data retrieved successfully",
      isRegistered: user.faceRegistrationComplete || false,
      data: {
        images: user.faceImages.map((img) => ({
          timestamp: img.timestamp,
          metadata: img.metadata,
          registeredAt: img.registeredAt,
        })),
        updatedAt: user.updatedAt,
        totalImages: user.faceImages.length,
      },
    });
  } catch (error) {
    console.error("Error fetching face registration data:", error);
    return NextResponse.json(
      { message: "Error retrieving face registration data" },
      { status: 500 }
    );
  }
}
