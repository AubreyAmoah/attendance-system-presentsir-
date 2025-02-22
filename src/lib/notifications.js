export const NotificationType = {
  CLASS_REMINDER: "CLASS_REMINDER",
  SCHEDULE_CHANGE: "SCHEDULE_CHANGE",
  CLASS_CANCELLED: "CLASS_CANCELLED",
  ATTENDANCE_WINDOW: "ATTENDANCE_WINDOW",
};

export async function createNotification(
  db,
  { type, userId, courseId, message, scheduledFor, metadata = {} }
) {
  return await db.collection("notifications").insertOne({
    type,
    userId,
    courseId,
    message,
    scheduledFor,
    metadata,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
