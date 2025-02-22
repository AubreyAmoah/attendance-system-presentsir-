"use client";

import CourseCalendar from "@/components/CourseCalender";
import { useParams } from "next/navigation";


export default function ViewSchedulePage() {
  const params = useParams();

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CourseCalendar courseId={params.courseId} />
      </div>
    </div>
  );
}
