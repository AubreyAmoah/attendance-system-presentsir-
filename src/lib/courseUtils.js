// lib/courseUtils.js
export function isCourseLive(course) {
  if (!course.startTime || !course.endTime || !course.daysOfWeek) {
    return false;
  }

  const now = new Date();
  const courseStart = new Date(course.startDate);
  const courseEnd = new Date(course.endDate);

  // Check if current date is within course duration
  if (now < courseStart || now > courseEnd) {
    return false;
  }

  // Check for exceptions
  const todayStr = now.toISOString().split("T")[0];
  if (course.recurrence?.exceptions?.includes(todayStr)) {
    return false;
  }

  // Check if today is a course day
  const currentDay = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  if (!course.daysOfWeek.includes(currentDay)) {
    return false;
  }

  // Check recurrence pattern
  if (course.recurrence?.pattern === "biweekly") {
    const weekDiff = Math.floor(
      (now - courseStart) / (7 * 24 * 60 * 60 * 1000)
    );
    if (weekDiff % 2 !== 0) {
      return false;
    }
  } else if (course.recurrence?.pattern === "custom") {
    const weekDiff = Math.floor(
      (now - courseStart) / (7 * 24 * 60 * 60 * 1000)
    );
    if (weekDiff % course.recurrence.interval !== 0) {
      return false;
    }
  }

  // Check if current time is within class hours
  const [startHours, startMinutes] = course.startTime.split(":");
  const [endHours, endMinutes] = course.endTime.split(":");

  const classStart = new Date(now);
  classStart.setHours(parseInt(startHours), parseInt(startMinutes), 0);

  const classEnd = new Date(now);
  classEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0);

  return now >= classStart && now <= classEnd;
}
