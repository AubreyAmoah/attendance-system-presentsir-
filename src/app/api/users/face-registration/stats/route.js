// app/api/users/face-registration/stats/route.js
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Get user's verification statistics
    const verificationStats = await db
      .collection("verificationLogs")
      .aggregate([
        {
          $match: {
            userId: session.user.email,
            timestamp: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            successfulAttempts: {
              $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] },
            },
            averageSimilarity: { $avg: "$similarity" },
          },
        },
      ])
      .toArray();

    // Get registered faces quality metrics
    const user = await db
      .collection("users")
      .findOne(
        { email: session.user.email },
        { projection: { faceImages: 1 } }
      );

    const qualityMetrics =
      user?.faceImages?.map((face) => ({
        timestamp: face.timestamp,
        quality: face.metadata?.quality || {},
      })) || [];

    return NextResponse.json({
      stats: verificationStats[0] || {
        totalAttempts: 0,
        successfulAttempts: 0,
        averageSimilarity: 0,
      },
      qualityMetrics,
    });
  } catch (error) {
    console.error("Error fetching face registration stats:", error);
    return NextResponse.json(
      { message: "Error fetching statistics" },
      { status: 500 }
    );
  }
}
