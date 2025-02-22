// app/courses/[courseId]/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isCourseLive } from "@/lib/courseUtils";

export default function CourseDetailsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState(null);

  useEffect(() => {
    fetchCourseDetails();
    const interval = setInterval(checkLiveStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [params.courseId]);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`/api/courses/${params.courseId}`);
      if (!response.ok) throw new Error("Failed to fetch course");
      const data = await response.json();
      setCourse(data);
      setStudentCount(data.students?.length || 0);
      setIsLive(isCourseLive(data));

      if (session?.user?.role === "student") {
        await fetchTodayAttendance();
      }

      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `/api/courses/${params.courseId}/attendance?date=${today}`
      );
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const checkLiveStatus = () => {
    if (course) {
      setIsLive(isCourseLive(course));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-500 text-center">Course not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                {course.name}
              </h1>
              <div
                className={`px-3 py-1 rounded-full text-sm font-semibold
                ${
                  isLive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {isLive ? "Live Now" : "Not Live"}
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">Code: {course.code}</p>
          </div>

          {/* Course Details */}
          <div className="px-6 py-4">
            <div className="space-y-4">
              {/* Schedule */}
              <div>
                <h3 className="text-lg font-medium text-gray-900">Schedule</h3>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Days</p>
                    <p className="mt-1">
                      {course.daysOfWeek
                        .map(
                          (day) => day.charAt(0).toUpperCase() + day.slice(1)
                        )
                        .join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Time</p>
                    <p className="mt-1">
                      {course.startTime} - {course.endTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Students
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{studentCount}</p>
                </div>
                {session?.user?.role === "lecturer" && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-500">
                      Today's Attendance
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {todayAttendance?.length || 0} / {studentCount}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                {session?.user?.role === "student" && (
                  <>
                    <button
                      onClick={() =>
                        router.push(
                          `/courses/${params.courseId}/mark-attendance`
                        )
                      }
                      disabled={!isLive || todayAttendance}
                      className={`w-full px-4 py-2 rounded-md ${
                        isLive && !todayAttendance
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {todayAttendance
                        ? "Attendance Already Marked"
                        : isLive
                        ? "Mark Attendance"
                        : "Attendance Only Available During Class"}
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/courses/${params.courseId}/my-attendance`)
                      }
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      View My Attendance History
                    </button>
                  </>
                )}

                {session?.user?.role === "lecturer" && (
                  <>
                    <button
                      onClick={() =>
                        router.push(`/courses/${params.courseId}/verify`)
                      }
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Verify Attendance
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/courses/${params.courseId}/students`)
                      }
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Manage Students
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/courses/${params.courseId}/reports`)
                      }
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      View Reports
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
