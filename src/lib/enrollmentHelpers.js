export async function getEnrollmentStatus(courseId, userEmail) {
  const { db } = await connectToDatabase();

  const course = await db.collection("courses").findOne({
    _id: new ObjectId(courseId),
    students: userEmail,
  });

  return {
    isEnrolled: !!course,
    course,
  };
}

export async function validateEnrollment(courseId, userEmail) {
  const { db } = await connectToDatabase();

  // Check if course exists and has space
  const course = await db.collection("courses").findOne({
    _id: new ObjectId(courseId),
  });

  if (!course) {
    throw new Error("Course not found");
  }

  // Check if student is already enrolled
  if (course.students.includes(userEmail)) {
    throw new Error("Already enrolled in this course");
  }

  // Check if course has reached maximum capacity (if applicable)
  if (course.maxStudents && course.students.length >= course.maxStudents) {
    throw new Error("Course is full");
  }

  return course;
}
