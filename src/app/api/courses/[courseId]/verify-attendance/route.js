// // app/api/courses/[courseId]/verify-attendance/route.js
// import { NextResponse } from "next/server";
// import { connectToDatabase } from "@/lib/db";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/auth.config";
// import { ObjectId } from "mongodb";
// import { ImageValidator } from "@/lib/imageValidation";
// import { isCourseLive } from "@/lib/courseUtils";

// const imageValidator = new ImageValidator();

// export async function POST(request, { params }) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session) {
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
//     }

//     const { courseId } = params;
//     const { faceImage, timestamp } = await request.json();

//     const { db } = await connectToDatabase();

//     // Check if student is enrolled
//     const course = await db.collection("courses").findOne({
//       _id: new ObjectId(courseId),
//       students: session.user.email,
//     });

//     if (!course) {
//       return NextResponse.json(
//         { message: "Not enrolled in this course" },
//         { status: 403 }
//       );
//     }

//     // Check if course is live
//     if (!isCourseLive(course)) {
//       return NextResponse.json(
//         { message: "Course is not currently in session" },
//         { status: 403 }
//       );
//     }

//     // Check for existing attendance
//     const existingAttendance = await db.collection("attendance").findOne({
//       courseId: new ObjectId(courseId),
//       studentEmail: session.user.email,
//       timestamp: {
//         $gte: new Date(new Date(timestamp).setHours(0, 0, 0, 0)),
//         $lt: new Date(new Date(timestamp).setHours(23, 59, 59, 999)),
//       },
//     });

//     if (existingAttendance) {
//       return NextResponse.json(
//         { message: "Attendance already marked for today" },
//         { status: 400 }
//       );
//     }

//     // Get student's registered face images
//     const student = await db.collection("users").findOne({
//       email: session.user.email,
//     });

//     if (!student.faceImages || student.faceImages.length === 0) {
//       return NextResponse.json(
//         {
//           message:
//             "No registered face images found. Please complete face registration.",
//         },
//         { status: 400 }
//       );
//     }

//     // Initialize face detection
//     await imageValidator.initialize();

//     // Validate current face image
//     const currentFaceValidation = await imageValidator.validateImage(faceImage);
//     if (!currentFaceValidation.isValid) {
//       return NextResponse.json(
//         { message: currentFaceValidation.error },
//         { status: 400 }
//       );
//     }

//     // Compare with registered images
//     let matchFound = false;
//     let bestMatchScore = 0;

//     for (const registeredImage of student.faceImages) {
//       const similarity = await imageValidator.compareFaces(
//         faceImage,
//         registeredImage.image
//       );

//       if (similarity.match) {
//         matchFound = true;
//         bestMatchScore = Math.max(bestMatchScore, similarity.score);
//       }
//     }

//     if (!matchFound) {
//       return NextResponse.json(
//         { message: "Face verification failed. Please try again." },
//         { status: 400 }
//       );
//     }

//     // Record attendance
//     await db.collection("attendance").insertOne({
//       courseId: new ObjectId(courseId),
//       studentEmail: session.user.email,
//       timestamp: new Date(timestamp),
//       status: "present",
//       verificationMethod: "face_recognition",
//       verificationScore: bestMatchScore,
//       faceImage: faceImage, // Store for verification purposes
//       createdAt: new Date(),
//     });

//     return NextResponse.json({
//       message: "Attendance marked successfully",
//       verificationScore: bestMatchScore,
//     });
//   } catch (error) {
//     console.error("Attendance verification error:", error);
//     return NextResponse.json(
//       { message: "Error verifying attendance" },
//       { status: 500 }
//     );
//   }
// }

// app/api/courses/[courseId]/verify-attendance/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { ObjectId } from "mongodb";
import { FaceComparisonService } from "@/lib/faceComparison";
import { isCourseLive } from "@/lib/courseUtils";

const faceComparer = new FaceComparisonService();

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
    const { faceImage, timestamp } = await request.json();

    const { db } = await connectToDatabase();

    // Check if student is enrolled
    const course = await db.collection("courses").findOne({
      _id: new ObjectId(courseId),
      students: session.user.email,
    });

    if (!course) {
      return NextResponse.json(
        { message: "Not enrolled in this course" },
        { status: 403 }
      );
    }

    // Check if course is live
    if (!isCourseLive(course)) {
      return NextResponse.json(
        { message: "Course is not currently in session" },
        { status: 403 }
      );
    }

    // Check for existing attendance
    const existingAttendance = await db.collection("attendance").findOne({
      courseId: new ObjectId(courseId),
      studentEmail: session.user.email,
      timestamp: {
        $gte: new Date(new Date(timestamp).setHours(0, 0, 0, 0)),
        $lt: new Date(new Date(timestamp).setHours(23, 59, 59, 999)),
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { message: "Attendance already marked for today" },
        { status: 400 }
      );
    }

    // Get student's registered face images
    const student = await db
      .collection("users")
      .findOne(
        { email: session.user.email },
        { projection: { faceImages: 1 } }
      );

    if (!student?.faceImages?.length) {
      return NextResponse.json(
        { message: "No registered face images found" },
        { status: 400 }
      );
    }

    // Initialize face comparison
    await faceComparer.initialize();

    // Validate current face image
    const validation = await faceComparer.validateFaceImage(faceImage);
    if (!validation.isValid) {
      return NextResponse.json({ message: validation.error }, { status: 400 });
    }

    // Compare with registered faces
    const comparisonResult = await faceComparer.compareMultipleFaces(
      faceImage,
      student.faceImages
    );

    if (!comparisonResult.match) {
      return NextResponse.json(
        {
          message: "Face verification failed",
          details: {
            similarity: comparisonResult.similarity,
            threshold: faceComparer.similarityThreshold,
          },
        },
        { status: 400 }
      );
    }

    // Record attendance with verification details
    const attendanceRecord = {
      courseId: new ObjectId(courseId),
      studentEmail: session.user.email,
      timestamp: new Date(timestamp),
      status: "present",
      verificationMethod: "face_recognition",
      verificationDetails: {
        similarity: comparisonResult.similarity,
        bestMatchTimestamp: comparisonResult.details.bestMatch.timestamp,
        faceQuality: validation.faceDetails,
      },
      faceImage: faceImage, // Store for verification purposes
      createdAt: new Date(),
    };

    await db.collection("attendance").insertOne(attendanceRecord);

    // Store verification attempt for analytics
    await db.collection("verificationLogs").insertOne({
      userId: session.user.email,
      courseId: new ObjectId(courseId),
      timestamp: new Date(timestamp),
      success: true,
      similarity: comparisonResult.similarity,
      verificationDetails: comparisonResult.details,
      qualityMetrics: validation.faceDetails,
      createdAt: new Date(),
    });

    return NextResponse.json({
      message: "Attendance marked successfully",
      verificationScore: comparisonResult.similarity,
    });
  } catch (error) {
    console.error("Attendance verification error:", error);

    // Log failed attempt
    if (session) {
      try {
        const { db } = await connectToDatabase();
        await db.collection("verificationLogs").insertOne({
          userId: session.user.email,
          courseId: new ObjectId(params.courseId),
          timestamp: new Date(),
          success: false,
          error: error.message,
          createdAt: new Date(),
        });
      } catch (logError) {
        console.error("Error logging verification failure:", logError);
      }
    }

    return NextResponse.json(
      { message: "Error verifying attendance" },
      { status: 500 }
    );
  }
}
