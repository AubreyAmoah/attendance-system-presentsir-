// app/api/courses/[courseId]/schedule/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/auth.config";
import { ObjectId } from "mongodb";

// Helper function to validate date range
function isValidDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end && !isNaN(start) && !isNaN(end);
}

// Helper function to check if two date ranges overlap
function doDateRangesOverlap(start1, end1, start2, end2) {
  return (
    new Date(start1) <= new Date(end2) && new Date(end1) >= new Date(start2)
  );
}

// Helper function to check if two time ranges overlap
function doTimeRangesOverlap(start1, end1, start2, end2) {
  const [startHour1, startMinute1] = start1.split(":");
  const [endHour1, endMinute1] = end1.split(":");
  const [startHour2, startMinute2] = start2.split(":");
  const [endHour2, endMinute2] = end2.split(":");

  const startMinutes1 = parseInt(startHour1) * 60 + parseInt(startMinute1);
  const endMinutes1 = parseInt(endHour1) * 60 + parseInt(endMinute1);
  const startMinutes2 = parseInt(startHour2) * 60 + parseInt(startMinute2);
  const endMinutes2 = parseInt(endHour2) * 60 + parseInt(endMinute2);

  return startMinutes1 < endMinutes2 && endMinutes1 > startMinutes2;
}

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "lecturer") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = params;
    const { daysOfWeek, startTime, endTime, startDate, endDate, recurrence } =
      await request.json();

    // Validate required fields
    if (
      !daysOfWeek ||
      !startTime ||
      !endTime ||
      !startDate ||
      !endDate ||
      !recurrence
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate dates
    if (!isValidDateRange(startDate, endDate)) {
      return NextResponse.json(
        { message: "Invalid date range" },
        { status: 400 }
      );
    }

    // Validate days of week
    const validDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const invalidDays = daysOfWeek.filter(
      (day) => !validDays.includes(day.toLowerCase())
    );
    if (invalidDays.length > 0) {
      return NextResponse.json(
        { message: `Invalid days: ${invalidDays.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { message: "Invalid time format. Use HH:mm format" },
        { status: 400 }
      );
    }

    // Validate time range
    const [startHour, startMinute] = startTime.split(":");
    const [endHour, endMinute] = endTime.split(":");
    const startMinutes = parseInt(startHour) * 60 + parseInt(startMinute);
    const endMinutes = parseInt(endHour) * 60 + parseInt(endMinute);

    if (startMinutes >= endMinutes) {
      return NextResponse.json(
        { message: "Start time must be before end time" },
        { status: 400 }
      );
    }

    // Validate recurrence pattern
    const validPatterns = ["weekly", "biweekly", "custom"];
    if (!validPatterns.includes(recurrence.pattern)) {
      return NextResponse.json(
        { message: "Invalid recurrence pattern" },
        { status: 400 }
      );
    }

    if (
      recurrence.pattern === "custom" &&
      (!recurrence.interval || recurrence.interval < 1)
    ) {
      return NextResponse.json(
        { message: "Invalid recurrence interval" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Verify lecturer owns the course
    const course = await db.collection("courses").findOne({
      _id: new ObjectId(courseId),
      lecturerId: session.user.email,
    });

    if (!course) {
      return NextResponse.json(
        { message: "Course not found or access denied" },
        { status: 404 }
      );
    }

    // Check for scheduling conflicts with lecturer's other courses
    const conflictingCourses = await db
      .collection("courses")
      .find({
        _id: { $ne: new ObjectId(courseId) },
        lecturerId: session.user.email,
        daysOfWeek: { $in: daysOfWeek },
        $or: [
          {
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
          },
        ],
      })
      .toArray();

    // Check each potentially conflicting course for time overlap
    for (const conflictingCourse of conflictingCourses) {
      if (
        doTimeRangesOverlap(
          startTime,
          endTime,
          conflictingCourse.startTime,
          conflictingCourse.endTime
        )
      ) {
        return NextResponse.json(
          {
            message: `Schedule conflicts with your course: ${conflictingCourse.name}`,
            conflictingCourse: conflictingCourse.name,
          },
          { status: 400 }
        );
      }
    }

    // Validate exceptions (if any)
    if (recurrence.exceptions) {
      recurrence.exceptions = recurrence.exceptions.filter((date) => {
        const exceptionDate = new Date(date);
        return (
          !isNaN(exceptionDate) &&
          exceptionDate >= new Date(startDate) &&
          exceptionDate <= new Date(endDate)
        );
      });
    }

    // Update course schedule
    const result = await db.collection("courses").updateOne(
      { _id: new ObjectId(courseId) },
      {
        $set: {
          daysOfWeek: daysOfWeek.map((day) => day.toLowerCase()),
          startTime,
          endTime,
          startDate,
          endDate,
          recurrence,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Course not found" },
        { status: 404 }
      );
    }

    // Get updated course
    const updatedCourse = await db.collection("courses").findOne({
      _id: new ObjectId(courseId),
    });

    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json(
      { message: "Error updating schedule" },
      { status: 500 }
    );
  }
}

// Helper function to get all session dates for a course
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;
    const { db } = await connectToDatabase();

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

    // Calculate all session dates based on schedule
    const sessionDates = [];
    const start = new Date(course.startDate);
    const end = new Date(course.endDate);
    const exceptions = new Set(course.recurrence?.exceptions || []);

    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate
        .toLocaleDateString("en-US", {
          weekday: "long",
        })
        .toLowerCase();

      if (
        course.daysOfWeek.includes(dayOfWeek) &&
        !exceptions.has(currentDate.toISOString().split("T")[0])
      ) {
        sessionDates.push({
          date: currentDate.toISOString().split("T")[0],
          startTime: course.startTime,
          endTime: course.endTime,
        });
      }

      // Increment based on recurrence pattern
      const incrementDays =
        course.recurrence.pattern === "biweekly"
          ? 14
          : course.recurrence.pattern === "custom"
          ? course.recurrence.interval * 7
          : 1;

      currentDate.setDate(currentDate.getDate() + incrementDays);
    }

    return NextResponse.json({
      schedule: {
        daysOfWeek: course.daysOfWeek,
        startTime: course.startTime,
        endTime: course.endTime,
        startDate: course.startDate,
        endDate: course.endDate,
        recurrence: course.recurrence,
      },
      sessionDates,
    });
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { message: "Error fetching schedule" },
      { status: 500 }
    );
  }
}
