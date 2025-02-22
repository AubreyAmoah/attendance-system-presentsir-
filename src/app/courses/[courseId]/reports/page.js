// app/courses/[courseId]/reports/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function CourseReportsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const [course, setCourse] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [selectedView, setSelectedView] = useState("overview"); // overview, individual, dates
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchReportData();
  }, [params.courseId, selectedView, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/courses/${params.courseId}/reports?` +
          new URLSearchParams({
            view: selectedView,
            startDate: dateRange.start,
            endDate: dateRange.end,
          })
      );

      if (!response.ok) throw new Error("Failed to fetch report data");
      const data = await response.json();

      setCourse(data.course);
      setAttendanceData(data.attendance);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const renderOverview = () => {
    if (!attendanceData?.overview) return null;

    const { totalSessions, totalStudents, averageAttendance } =
      attendanceData.overview;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Total Sessions</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {totalSessions}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Total Students</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {totalStudents}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">
            Average Attendance
          </h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {averageAttendance}%
          </p>
        </div>
      </div>
    );
  };

  const renderAttendanceChart = () => {
    if (!attendanceData?.attendance) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Attendance Trends
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceData.attendance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" fill="#4CAF50" name="Present" />
              <Bar dataKey="absent" fill="#f44336" name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderStudentList = () => {
    if (!attendanceData?.students) return null;

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Sessions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sessions Attended
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attendance Rate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendanceData.students.map((student) => (
              <tr key={student.email}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {student.name}
                  </div>
                  <div className="text-sm text-gray-500">{student.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {student.totalSessions}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {student.sessionsAttended}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900">
                      {student.attendanceRate}%
                    </span>
                    <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 rounded-full h-2"
                        style={{ width: `${student.attendanceRate}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Attendance Reports - {course?.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Course Code: {course?.code}
          </p>
        </div>

        {/* Controls */}
        <div className="mb-8 flex flex-wrap gap-4">
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="overview">Overview</option>
            <option value="individual">Individual Students</option>
            <option value="dates">By Date</option>
          </select>

          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, start: e.target.value }))
            }
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, end: e.target.value }))
            }
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Report Content */}
        {renderOverview()}
        {renderAttendanceChart()}
        {selectedView === "individual" && renderStudentList()}
      </div>
    </div>
  );
}
