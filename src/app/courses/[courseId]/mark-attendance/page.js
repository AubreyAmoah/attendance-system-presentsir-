// app/courses/[courseId]/mark-attendance/page.js
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import FaceRecognition from "@/components/FaceRecognition";

export default function MarkAttendancePage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState("waiting"); // waiting, processing, success, error
  const [error, setError] = useState(null);

  const handleFaceDetected = async (faceImage) => {
    try {
      setStatus("processing");

      const response = await fetch(
        `/api/courses/${params.courseId}/verify-attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            faceData: faceImage,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to mark attendance");
      }

      setStatus("success");

      // Redirect to success page after 2 seconds
      setTimeout(() => {
        router.push(`/courses/${params.courseId}`);
      }, 2000);
    } catch (err) {
      console.error("Attendance marking error:", err);
      setError(err.message);
      setStatus("error");
    }
  };

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Mark Attendance
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Please center your face in the frame to mark your attendance
            </p>
          </div>

          {/* Face Recognition Component */}
          <div className="p-6">
            {status === "waiting" && (
              <FaceRecognition
                onFaceDetected={handleFaceDetected}
                mode="verify"
              />
            )}

            {status === "processing" && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">
                  Verifying and marking attendance...
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="text-center py-12">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="mt-4 text-lg font-medium text-gray-900">
                  Attendance Marked Successfully!
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Redirecting to course page...
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="text-center py-12">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <p className="mt-4 text-lg font-medium text-red-900">
                  {error || "Failed to mark attendance"}
                </p>
                <button
                  onClick={() => setStatus("waiting")}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
