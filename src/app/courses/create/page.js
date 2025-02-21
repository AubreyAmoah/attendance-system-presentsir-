"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function CreateCoursePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [courseData, setCourseData] = useState({
    name: "",
    code: "",
    schedule: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(courseData),
      });

      if (response.ok) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error creating course:", error);
    }
  };

  if (session?.user?.role !== "lecturer") {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Create New Course
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow rounded-lg p-6"
        >
          <div className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Course Name
              </label>
              <input
                type="text"
                id="name"
                value={courseData.name}
                onChange={(e) =>
                  setCourseData({
                    ...courseData,
                    name: e.target.value,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700"
              >
                Course Code
              </label>
              <input
                type="text"
                id="code"
                value={courseData.code}
                onChange={(e) =>
                  setCourseData({
                    ...courseData,
                    code: e.target.value,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="schedule"
                className="block text-sm font-medium text-gray-700"
              >
                Schedule
              </label>
              <input
                type="text"
                id="schedule"
                value={courseData.schedule}
                onChange={(e) =>
                  setCourseData({
                    ...courseData,
                    schedule: e.target.value,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                placeholder="e.g., Monday 10:00 AM - 12:00 PM"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Create Course
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
