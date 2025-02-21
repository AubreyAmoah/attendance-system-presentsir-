"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [courses, setCourses] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchCourses();
    }
  }, [status, router]);

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {session?.user?.role === "lecturer"
              ? "Lecturer Dashboard"
              : "Student Dashboard"}
          </h1>
          {session?.user?.role === "lecturer" && (
            <button
              onClick={() => router.push("/courses/create")}
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              Create Course
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course._id}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {course.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Course Code: {course.code}
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => router.push(`/courses/${course._id}`)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
