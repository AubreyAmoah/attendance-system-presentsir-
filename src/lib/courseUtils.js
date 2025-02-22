// lib/courseUtils.js
export function isCourseLive(course) {
  if (!course.startTime || !course.endTime || !course.daysOfWeek) {
    return false;
  }

  const now = new Date();
  const currentDay = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  // Check if course runs on current day
  if (!course.daysOfWeek.includes(currentDay)) {
    return false;
  }

  // Convert course times to today's date for comparison
  const [startHours, startMinutes] = course.startTime.split(":");
  const [endHours, endMinutes] = course.endTime.split(":");

  const courseStart = new Date(now);
  courseStart.setHours(parseInt(startHours), parseInt(startMinutes), 0);

  const courseEnd = new Date(now);
  courseEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0);

  // Check if current time is within course hours
  return now >= courseStart && now <= courseEnd;
}
