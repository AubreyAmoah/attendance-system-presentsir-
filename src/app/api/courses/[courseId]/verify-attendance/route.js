// import { NextResponse } from "next/server";
// import { connectToDatabase } from "@/lib/db";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/route";
// import { ObjectId } from "mongodb";

// export async function POST(request, { params }) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session) {
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
//     }

//     const { courseId } = params;
//     const { faceData, location, timestamp } = await request.json();
//     const { db } = await connectToDatabase();

//     // Verify student is enrolled in the course
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

//     // Check if attendance window is open
//     const currentTime = new Date();
//     const classStartTime = new Date(timestamp);
//     const attendanceWindow = 15; // 15 minutes window

//     if (Math.abs(currentTime - classStartTime) > attendanceWindow * 60 * 1000) {
//       return NextResponse.json(
//         { message: "Attendance window is closed" },
//         { status: 400 }
//       );
//     }

//     // Check for duplicate attendance
//     const existingAttendance = await db.collection("attendance").findOne({
//       courseId: new ObjectId(courseId),
//       studentEmail: session.user.email,
//       timestamp: {
//         $gte: new Date(
//           classStartTime.setMinutes(
//             classStartTime.getMinutes() - attendanceWindow
//           )
//         ),
//         $lte: new Date(
//           classStartTime.setMinutes(
//             classStartTime.getMinutes() + attendanceWindow * 2
//           )
//         ),
//       },
//     });

//     if (existingAttendance) {
//       return NextResponse.json(
//         { message: "Attendance already marked" },
//         { status: 400 }
//       );
//     }

//     // Record attendance
//     const attendance = await db.collection("attendance").insertOne({
//       courseId: new ObjectId(courseId),
//       studentEmail: session.user.email,
//       faceData,
//       location,
//       timestamp: new Date(timestamp),
//       verificationStatus: "pending",
//       createdAt: new Date(),
//     });

//     return NextResponse.json(
//       {
//         message: "Attendance recorded",
//         attendanceId: attendance.insertedId,
//       },
//       { status: 201 }
//     );
//   } catch (error) {
//     console.error("Attendance verification error:", error);
//     return NextResponse.json(
//       { message: "Error recording attendance" },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { FaceComparisonService } from "@/lib/faceComparison";
import { authOptions } from "@/app/api/auth/auth.config";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
    const { faceData, location, timestamp } = await request.json();
    const { db } = await connectToDatabase();

    // Get student's registered face data
    const user = await db.collection("users").findOne({
      email: session.user.email,
    });

    if (!user.registeredFaceData) {
      return NextResponse.json(
        { message: "Face data not registered" },
        { status: 400 }
      );
    }

    // Initialize face comparison service
    const faceService = new FaceComparisonService();
    await faceService.initialize();

    // Compare faces
    const registeredEmbedding = JSON.parse(user.registeredFaceData);
    const currentEmbedding = await faceService.getFaceEmbedding(faceData);

    const { match, similarity } = await faceService.compareFaces(
      currentEmbedding,
      registeredEmbedding
    );

    // Determine verification status
    const verificationStatus = match ? "verified" : "rejected";

    // Record attendance with verification result
    const attendance = await db.collection("attendance").insertOne({
      courseId: new ObjectId(courseId),
      studentEmail: session.user.email,
      timestamp: new Date(timestamp),
      location,
      verificationStatus,
      similarityScore: similarity,
      automaticVerification: true,
      createdAt: new Date(),
    });

    return NextResponse.json(
      {
        message: match
          ? "Face verified successfully"
          : "Face verification failed",
        verified: match,
        similarity,
        attendanceId: attendance.insertedId,
      },
      { status: match ? 200 : 400 }
    );
  } catch (error) {
    console.error("Face verification error:", error);
    return NextResponse.json(
      { message: error.message || "Error during face verification" },
      { status: 500 }
    );
  }
}
