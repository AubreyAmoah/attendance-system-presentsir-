// app/courses/[courseId]/verify/page.js
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function VerificationDashboardPage() {
  const { data: session } = useSession();
  const params = useParams();
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (session?.user?.role === "lecturer") {
      fetchPendingVerifications();
    }
  }, [params.courseId, session]);

  const fetchPendingVerifications = async () => {
    try {
      const response = await fetch(
        `/api/courses/${params.courseId}/pending-verifications`
      );
      if (!response.ok) throw new Error("Failed to fetch verifications");
      const data = await response.json();
      setPendingVerifications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (attendanceId, status) => {
    try {
      const response = await fetch(
        `/api/courses/${params.courseId}/verify-attendance/${attendanceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) throw new Error("Failed to update verification");

      // Refresh the pending verifications list
      fetchPendingVerifications();
      setSelectedVerification(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (session?.user?.role !== "lecturer") return <div>Access denied</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Attendance Verification Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pending Verifications List */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Pending Verifications
            </h2>

            {pendingVerifications.length === 0 ? (
              <p className="text-gray-500">No pending verifications</p>
            ) : (
              <div className="space-y-4">
                {pendingVerifications.map((verification) => (
                  <div
                    key={verification._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedVerification(verification)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {verification.studentName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(verification.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verification Details */}
          {selectedVerification && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Verification Details
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Student Information</h3>
                  <p className="text-gray-600">
                    {selectedVerification.studentName}
                  </p>
                  <p className="text-gray-500">
                    {selectedVerification.studentEmail}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Timestamp</h3>
                  <p className="text-gray-600">
                    {new Date(selectedVerification.timestamp).toLocaleString()}
                  </p>
                </div>

                {selectedVerification.location && (
                  <div>
                    <h3 className="text-lg font-medium">Location</h3>
                    <p className="text-gray-600">
                      Latitude: {selectedVerification.location.latitude}
                      <br />
                      Longitude: {selectedVerification.location.longitude}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={() =>
                      handleVerification(selectedVerification._id, "approved")
                    }
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      handleVerification(selectedVerification._id, "rejected")
                    }
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
