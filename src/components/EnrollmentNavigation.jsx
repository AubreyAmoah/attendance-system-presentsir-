"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function EnrollmentNavigation() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/dashboard"
                className="text-gray-800 hover:text-gray-900"
              >
                Dashboard
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {session.user.role === "student" && (
                <Link
                  href="/courses/join"
                  className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300"
                >
                  Join Course
                </Link>
              )}
              {session.user.role === "lecturer" && (
                <Link
                  href="/courses/create"
                  className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300"
                >
                  Create Course
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
