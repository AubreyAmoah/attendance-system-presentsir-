export async function checkAttendanceEligibility(courseId, studentEmail) {
  const { db } = await connectToDatabase();

  // Get course schedule
  const course = await db.collection("courses").findOne({
    _id: new ObjectId(courseId),
  });

  if (!course) {
    throw new Error("Course not found");
  }

  // Check if student is enrolled
  if (!course.students.includes(studentEmail)) {
    throw new Error("Not enrolled in this course");
  }

  // Check for existing attendance in the time window
  const currentTime = new Date();
  const attendanceWindow = 15; // 15 minutes

  const existingAttendance = await db.collection("attendance").findOne({
    courseId: new ObjectId(courseId),
    studentEmail,
    timestamp: {
      $gte: new Date(currentTime.getTime() - attendanceWindow * 60 * 1000),
      $lte: currentTime,
    },
  });

  if (existingAttendance) {
    throw new Error("Attendance already marked for this session");
  }

  return true;
}
