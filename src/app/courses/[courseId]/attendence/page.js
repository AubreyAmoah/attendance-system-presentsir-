// app/courses/[courseId]/attendance/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";

export default function AttendancePage() {
  const { data: session } = useSession();
  const params = useParams();
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchStudents();
    fetchAttendance();
  }, [params.courseId, date]);

  const fetchStudents = async () => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}/students`);
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      setStudents(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await fetch(
        `/api/courses/${params.courseId}/attendance?date=${date}`
      );
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const data = await response.json();

      // Convert array to object for easier lookup
      const attendanceMap = {};
      data.forEach((record) => {
        attendanceMap[record.studentId] = record.status;
      });
      setAttendance(attendanceMap);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const markAttendance = async (studentId, status) => {
    try {
      const response = await fetch(
        `/api/courses/${params.courseId}/attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId,
            date,
            status,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to mark attendance");

      setAttendance((prev) => ({
        ...prev,
        [studentId]: status,
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Attendance Management</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {student.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{student.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${
                      attendance[student._id] === "present"
                        ? "bg-green-100 text-green-800"
                        : attendance[student._id] === "absent"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {attendance[student._id] || "Not marked"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => markAttendance(student._id, "present")}
                    className="text-green-600 hover:text-green-900 mr-4"
                  >
                    Present
                  </button>
                  <button
                    onClick={() => markAttendance(student._id, "absent")}
                    className="text-red-600 hover:text-red-900"
                  >
                    Absent
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
