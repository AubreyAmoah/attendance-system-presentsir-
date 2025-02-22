import { createNotification, NotificationType } from "./notifications";
import { isCourseLive } from "./courseUtils";

export async function scheduleNotifications(db) {
  try {
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);

    // Get all courses with sessions in the next 30 minutes
    const courses = await db
      .collection("courses")
      .find({
        startDate: { $lte: thirtyMinutesFromNow },
        endDate: { $gte: now },
      })
      .toArray();

    for (const course of courses) {
      const isLive = isCourseLive(course);
      const isAboutToStart = checkCourseStartingSoon(
        course,
        thirtyMinutesFromNow
      );

      if (isAboutToStart) {
        // Notify students about upcoming class
        for (const studentEmail of course.students) {
          await createNotification(db, {
            type: NotificationType.CLASS_REMINDER,
            userId: studentEmail,
            courseId: course._id,
            message: `Your class ${course.name} starts in 30 minutes`,
            scheduledFor: new Date(thirtyMinutesFromNow),
            metadata: {
              courseName: course.name,
              startTime: course.startTime,
            },
          });
        }

        // Notify lecturer
        await createNotification(db, {
          type: NotificationType.CLASS_REMINDER,
          userId: course.lecturerId,
          courseId: course._id,
          message: `Your class ${course.name} starts in 30 minutes`,
          scheduledFor: new Date(thirtyMinutesFromNow),
          metadata: {
            courseName: course.name,
            startTime: course.startTime,
          },
        });
      }

      if (isLive) {
        // Notify students about attendance window
        for (const studentEmail of course.students) {
          await createNotification(db, {
            type: NotificationType.ATTENDANCE_WINDOW,
            userId: studentEmail,
            courseId: course._id,
            message: `Attendance window is now open for ${course.name}`,
            scheduledFor: now,
            metadata: {
              courseName: course.name,
              windowDuration: "15 minutes",
            },
          });
        }
      }
    }

    // Check for schedule changes
    const recentChanges = await db
      .collection("courses")
      .find({
        updatedAt: { $gte: new Date(now - 24 * 60 * 60000) }, // Last 24 hours
        "recurrence.exceptions": { $exists: true, $ne: [] },
      })
      .toArray();

    for (const course of recentChanges) {
      // Notify about schedule changes
      for (const studentEmail of course.students) {
        await createNotification(db, {
          type: NotificationType.SCHEDULE_CHANGE,
          userId: studentEmail,
          courseId: course._id,
          message: `Schedule changes have been made to ${course.name}`,
          scheduledFor: now,
          metadata: {
            courseName: course.name,
            changes: course.recurrence.exceptions,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error scheduling notifications:", error);
  }
}

function checkCourseStartingSoon(course, targetTime) {
  const currentDay = targetTime.toLocaleDateString("en-US", {
    weekday: "lowercase",
  });
  if (!course.daysOfWeek.includes(currentDay)) return false;

  const [hours, minutes] = course.startTime.split(":");
  const courseStartTime = new Date(targetTime);
  courseStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  // Check if the course starts within 30 minutes
  const timeDiff = courseStartTime.getTime() - targetTime.getTime();
  return timeDiff > 0 && timeDiff <= 30 * 60000;
}
