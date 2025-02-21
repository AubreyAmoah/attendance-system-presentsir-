// // app/api/face/register/route.js
// import { NextResponse } from "next/server";
// import { connectToDatabase } from "@/lib/db";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// export async function POST(request) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session) {
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
//     }

//     const { faceData } = await request.json();
//     const { db } = await connectToDatabase();

//     await db
//       .collection("users")
//       .updateOne({ email: session.user.email }, { $set: { faceData } });

//     return NextResponse.json(
//       { message: "Face data registered successfully" },
//       { status: 200 }
//     );
//   } catch (error) {
//     return NextResponse.json(
//       { message: "Error registering face data" },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { FaceComparisonService } from "@/lib/faceComparison";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { faceData } = await request.json();
    const { db } = await connectToDatabase();

    // Initialize face service and get embedding
    const faceService = new FaceComparisonService();
    await faceService.initialize();
    const embedding = await faceService.getFaceEmbedding(faceData);

    // Store face embedding
    await db.collection("users").updateOne(
      { email: session.user.email },
      {
        $set: {
          registeredFaceData: JSON.stringify(embedding),
          faceRegisteredAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: "Face registered successfully",
    });
  } catch (error) {
    console.error("Face registration error:", error);
    return NextResponse.json(
      { message: error.message || "Error registering face" },
      { status: 500 }
    );
  }
}
