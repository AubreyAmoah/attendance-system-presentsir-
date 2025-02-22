import CourseNavigation from "@/components/CourseNavigation";
import EnrollmentNavigation from "@/components/EnrollmentNavigation";

export default function CourseLayout({ children }) {
  return (
    <div>
      <main className="min-h-screen bg-gray-100">{children}</main>
    </div>
  );
}
