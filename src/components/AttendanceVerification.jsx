"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import FaceRecognition from "./FaceRecognition";

export default function AttendanceVerification({ courseId }) {
  const { data: session } = useSession();
  const [verificationStatus, setVerificationStatus] = useState("ready");
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    // Get user's location if they allow it
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Location access denied:", error);
        }
      );
    }
  }, []);

  const handleFaceDetected = async (faceData) => {
    try {
      setVerificationStatus("verifying");
      setError(null);

      const response = await fetch(
        `/api/courses/${courseId}/verify-attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            faceData,
            location,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setVerificationStatus("success");
    } catch (err) {
      setError(err.message);
      setVerificationStatus("error");
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Attendance Verification</h2>

      {verificationStatus === "ready" && (
        <div>
          <p className="mb-4 text-gray-600">
            Please look at the camera and ensure your face is clearly visible.
          </p>
          <FaceRecognition onFaceDetected={handleFaceDetected} mode="verify" />
        </div>
      )}

      {verificationStatus === "verifying" && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verifying attendance...</p>
        </div>
      )}

      {verificationStatus === "success" && (
        <div className="text-center py-4 text-green-600">
          <svg
            className="h-12 w-12 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <p>Attendance verified successfully!</p>
        </div>
      )}

      {verificationStatus === "error" && (
        <div className="text-center py-4 text-red-600">
          <svg
            className="h-12 w-12 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <p>Error: {error}</p>
          <button
            onClick={() => setVerificationStatus("ready")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
