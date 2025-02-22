// app/courses/[courseId]/verify/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function VerifyAttendancePage() {
  const { data: session } = useSession();
  const params = useParams();
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    if (session?.user?.role === "lecturer") {
      fetchPendingVerifications();
    }
  }, [params.courseId, currentDate, session]);

  const fetchPendingVerifications = async () => {
    try {
      const response = await fetch(
        `/api/courses/${params.courseId}/pending-verifications?date=${currentDate}`
      );

      if (!response.ok) throw new Error("Failed to fetch verifications");

      const data = await response.json();
      setPendingVerifications(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleVerification = async (attendanceId, status, comment = "") => {
    try {
      const response = await fetch(
        `/api/courses/${params.courseId}/verify-attendance/${attendanceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status, comment }),
        }
      );

      if (!response.ok) throw new Error("Failed to update verification");

      await fetchPendingVerifications();
      setSelectedVerification(null);
    } catch (err) {
      setError(err.message);
    }
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
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                Attendance Verification
              </h2>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {pendingVerifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No pending verifications for this date
              </div>
            ) : (
              pendingVerifications.map((verification) => (
                <div key={verification._id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {verification.studentName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {verification.studentEmail}
                      </p>
                      <p className="text-sm text-gray-500">
                        Marked at:{" "}
                        {new Date(verification.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          handleVerification(verification._id, "approved")
                        }
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          handleVerification(verification._id, "rejected")
                        }
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Face Image Preview */}
                  {verification.faceData && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Face Capture:
                      </p>
                      <img
                        src={verification.faceData}
                        alt="Face Capture"
                        className="h-32 w-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
