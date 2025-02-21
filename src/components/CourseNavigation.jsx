// components/CourseNavigation.jsx
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function CourseNavigation({ courseId }) {
  const { data: session } = useSession();

  return (
    <nav className="bg-white shadow-sm mb-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex space-x-8">
          <Link
            href={`/courses/${courseId}`}
            className="px-3 py-2 hover:text-blue-600"
          >
            Overview
          </Link>
          {session?.user?.role === "lecturer" ? (
            <Link
              href={`/courses/${courseId}/verify`}
              className="px-3 py-2 hover:text-blue-600"
            >
              Verify Attendance
            </Link>
          ) : (
            <Link
              href={`/courses/${courseId}/mark-attendance`}
              className="px-3 py-2 hover:text-blue-600"
            >
              Mark Attendance
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
