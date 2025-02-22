// app/profile/face-registration/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import FaceRegistration from "@/components/FaceRegistration";

export default function FaceRegistrationManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [registeredFaces, setRegisteredFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    fetchRegisteredFaces();
  }, []);

  const fetchRegisteredFaces = async () => {
    try {
      const response = await fetch("/api/users/face-registration");
      if (!response.ok) throw new Error("Failed to fetch registered faces");

      const data = await response.json();
      setRegisteredFaces(data.faceImages || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDeleteImage = async (index) => {
    try {
      const response = await fetch(`/api/users/face-registration/${index}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete face image");

      await fetchRegisteredFaces();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetRegistration = async () => {
    try {
      const response = await fetch("/api/users/face-registration", {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to reset face registration");

      setRegisteredFaces([]);
      setShowRegistration(true);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Face Registration Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your registered face images for attendance verification
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Registered Faces */}
        {registeredFaces.length > 0 && !showRegistration && (
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Registered Face Images
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {registeredFaces.map((face, index) => (
                  <div key={index} className="relative">
                    <img
                      src={face.image}
                      alt={`Registered face ${index + 1}`}
                      className="rounded-lg shadow-sm"
                    />
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => handleDeleteImage(index)}
                        className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Registered:{" "}
                      {new Date(face.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {registeredFaces.length} face images registered
                </div>
                <button
                  onClick={handleResetRegistration}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                >
                  Reset Registration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quality Status */}
        {registeredFaces.length > 0 && !showRegistration && (
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Registration Quality
              </h2>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Image Coverage
                    </span>
                    <span className="text-sm text-gray-900">Good</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: "80%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Lighting Quality
                    </span>
                    <span className="text-sm text-gray-900">Excellent</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: "90%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Face Visibility
                    </span>
                    <span className="text-sm text-gray-900">Good</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: "85%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        {(showRegistration || registeredFaces.length === 0) && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Register New Face Images
              </h2>
              <FaceRegistration
                onRegistrationComplete={() => {
                  setShowRegistration(false);
                  fetchRegisteredFaces();
                }}
              />
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800">
            Registration Tips
          </h3>
          <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
            <li>Ensure good lighting when taking photos</li>
            <li>Look directly at the camera</li>
            <li>Remove glasses or other face coverings</li>
            <li>Register multiple angles for better recognition</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
