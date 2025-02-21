"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function JoinCoursePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [courseCode, setCourseCode] = useState("");
  const [error, setError] = useState("");
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchCourses = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/courses/search?code=${courseCode}`);
      const data = await response.json();

      if (response.ok) {
        setAvailableCourses(data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to search courses");
    } finally {
      setLoading(false);
    }
  };

  const enrollInCourse = async (courseId) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
      });

      if (response.ok) {
        router.push(`/courses/${courseId}`);
      } else {
        const data = await response.json();
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to enroll in course");
    }
  };

  if (session?.user?.role !== "student") {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Join a Course</h1>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="Enter course code"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              onClick={searchCourses}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          {availableCourses.length > 0 ? (
            <div className="space-y-4">
              {availableCourses.map((course) => (
                <div
                  key={course._id}
                  className="border rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-lg font-medium">{course.name}</h3>
                    <p className="text-sm text-gray-500">Code: {course.code}</p>
                    <p className="text-sm text-gray-500">
                      Schedule: {course.schedule}
                    </p>
                  </div>
                  <button
                    onClick={() => enrollInCourse(course._id)}
                    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                  >
                    Join Course
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">
              No courses found. Try searching with a course code.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
