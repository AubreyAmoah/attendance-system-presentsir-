// app/api/courses/[courseId]/reports/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "overview";
    const startDate = new Date(searchParams.get("startDate"));
    const endDate = new Date(searchParams.get("endDate"));

    const { db } = await connectToDatabase();

    // Verify course access
    const course = await db.collection("courses").findOne({
      _id: new ObjectId(courseId),
      $or: [
        { lecturerId: session.user.email },
        { students: session.user.email },
      ],
    });

    if (!course) {
      return NextResponse.json(
        { message: "Course not found or access denied" },
        { status: 404 }
      );
    }

    // Get attendance data based on view type
    let attendanceData = {};

    // Get total sessions first
    const totalSessions = await db
      .collection("attendance")
      .distinct("timestamp", {
        courseId: new ObjectId(courseId),
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      });

    const sessionCount = totalSessions.length;

    // Overview statistics
    const totalStudents = course.students.length;
    const totalAttendance = await db.collection("attendance").countDocuments({
      courseId: new ObjectId(courseId),
      status: "present",
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    attendanceData.overview = {
      totalSessions: sessionCount,
      totalStudents,
      averageAttendance:
        totalStudents > 0
          ? Math.round((totalAttendance / (sessionCount * totalStudents)) * 100)
          : 0,
    };

    // Attendance by date
    if (view === "dates" || view === "overview") {
      const attendanceByDate = await db
        .collection("attendance")
        .aggregate([
          {
            $match: {
              courseId: new ObjectId(courseId),
              timestamp: {
                $gte: startDate,
                $lte: endDate,
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
              },
              present: {
                $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
              },
              absent: {
                $sum: { $cond: [{ $eq: ["$status", "present"] }, 0, 1] },
              },
            },
          },
          {
            $project: {
              date: "$_id",
              present: 1,
              absent: 1,
            },
          },
          {
            $sort: { date: 1 },
          },
        ])
        .toArray();

      attendanceData.attendance = attendanceByDate;
    }

    // Individual student statistics
    if (view === "individual") {
      const studentStats = await db
        .collection("attendance")
        .aggregate([
          {
            $match: {
              courseId: new ObjectId(courseId),
              timestamp: {
                $gte: startDate,
                $lte: endDate,
              },
            },
          },
          {
            $group: {
              _id: "$studentEmail",
              sessionsAttended: {
                $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
              },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "email",
              as: "studentInfo",
            },
          },
          {
            $unwind: "$studentInfo",
          },
          {
            $addFields: {
              attendanceRate: {
                $multiply: [
                  {
                    $cond: [
                      { $eq: [sessionCount, 0] },
                      0,
                      { $divide: ["$sessionsAttended", sessionCount] },
                    ],
                  },
                  100,
                ],
              },
            },
          },
          {
            $project: {
              email: "$_id",
              name: "$studentInfo.name",
              sessionsAttended: 1,
              totalSessions: { $literal: sessionCount },
              attendanceRate: 1,
            },
          },
          {
            $sort: { attendanceRate: -1 },
          },
        ])
        .toArray();

      attendanceData.students = studentStats;
    }

    return NextResponse.json({
      course: {
        id: course._id,
        name: course.name,
        code: course.code,
      },
      attendance: attendanceData,
    });
  } catch (error) {
    console.error("Error generating reports:", error);
    return NextResponse.json(
      { message: "Error generating reports" },
      { status: 500 }
    );
  }
}
