// app/courses/[courseId]/page.js
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import FaceRecognition from "@/components/FaceRecognition";

export default function CourseDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const [course, setCourse] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [showFaceRecognition, setShowFaceRecognition] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCourseData();
    fetchAttendanceRecords();
  }, [params.courseId]);

  const fetchCourseData = async () => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}`);
      if (!response.ok) throw new Error("Failed to fetch course");
      const data = await response.json();
      setCourse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const response = await fetch(
        `/api/courses/${params.courseId}/attendance`
      );
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const data = await response.json();
      setAttendanceRecords(data);
    } catch (err) {
      console.error("Error fetching attendance:", err);
    }
  };

  const handleFaceDetected = async (faceData) => {
    try {
      const response = await fetch(
        `/api/courses/${params.courseId}/attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ faceData }),
        }
      );

      if (!response.ok) throw new Error("Failed to mark attendance");

      setShowFaceRecognition(false);
      fetchAttendanceRecords();
    } catch (err) {
      console.error("Error marking attendance:", err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!course) return <div>Course not found</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{course.name}</h1>
            <div className="text-sm text-gray-500">Code: {course.code}</div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Schedule</h2>
            <p className="text-gray-600">{course.schedule}</p>
          </div>

          {session?.user?.role === "student" && (
            <div className="mb-8">
              <button
                onClick={() => setShowFaceRecognition(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Mark Attendance
              </button>

              {showFaceRecognition && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white p-6 rounded-lg max-w-2xl w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">Face Recognition</h2>
                      <button
                        onClick={() => setShowFaceRecognition(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                    <FaceRecognition onFaceDetected={handleFaceDetected} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-4">Attendance Records</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {session?.user?.role === "lecturer" && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceRecords.map((record) => (
                    <tr key={record._id}>
                      {session?.user?.role === "lecturer" && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {record.studentEmail}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(record.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            record.verified
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {record.verified ? "Verified" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
