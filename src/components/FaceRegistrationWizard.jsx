"use client";

import { useState, useRef, useEffect } from "react";
import {
  Camera,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { FaceComparisonService } from "@/lib/faceComparison";
import FaceQualityCheck from "./FaceQualityCheck";

const REQUIRED_CAPTURES = 3;

export default function FaceRegistrationWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [faceService, setFaceService] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [qualityGood, setQualityGood] = useState(false);

  const steps = [
    {
      title: "Welcome",
      description: `Let's set up your face recognition for attendance tracking.`,
      instruction:
        "Please ensure you are in a well-lit area and your face is clearly visible.",
    },
    {
      title: "Position Your Face",
      description: `We'll take multiple photos to ensure accurate recognition.`,
      instruction:
        "Center your face in the frame and look directly at the camera.",
    },
    {
      title: "Capture Photos",
      description: `We need ${REQUIRED_CAPTURES} clear photos of your face.`,
      instruction:
        "Slightly change your position between captures while keeping your face visible.",
    },
    {
      title: "Verification",
      description: `Let's verify your face registration.`,
      instruction: "Look at the camera for a final verification check.",
    },
  ];

  useEffect(() => {
    initFaceService();
    return () => stopCamera();
  }, []);

  const initFaceService = async () => {
    const service = new FaceComparisonService();
    await service.initialize();
    setFaceService(service);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError(
        "Failed to access camera. Please ensure camera permissions are granted."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current || !faceService) return;

    try {
      setLoading(true);
      setError(null);

      // Create canvas and capture frame
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);

      // Get face embedding
      const embedding = await faceService.getFaceEmbedding(canvas);

      // Add to captures
      setCaptures((prev) => [...prev, embedding]);

      if (captures.length + 1 >= REQUIRED_CAPTURES) {
        await registerFace();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const registerFace = async () => {
    try {
      setLoading(true);
      setError(null);

      // Average the embeddings
      const averageEmbedding = captures.reduce((acc, curr) => {
        return acc.map((val, idx) => val + curr[idx] / captures.length);
      }, new Array(captures[0].length).fill(0));

      // Register with the server
      const response = await fetch("/api/face/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          faceData: JSON.stringify(averageEmbedding),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to register face data");
      }

      setStep(3); // Move to verification step
    } catch (err) {
      setError(err.message);
      setCaptures([]); // Reset captures on error
    } finally {
      setLoading(false);
    }
  };

  const verifyRegistration = async () => {
    try {
      setLoading(true);
      setError(null);

      // Capture current frame for verification
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);

      const currentEmbedding = await faceService.getFaceEmbedding(canvas);

      // Compare with registered face
      const { match } = await faceService.compareFaces(
        currentEmbedding,
        captures[0] // Compare with first capture
      );

      if (match) {
        stopCamera();
        onComplete();
      } else {
        throw new Error("Verification failed. Please try registration again.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      startCamera();
    }
    setStep((prev) => prev + 1);
  };

  const resetRegistration = () => {
    setCaptures([]);
    setStep(1);
    setError(null);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {steps[step].title}
        </h2>
        <p className="mt-2 text-gray-600">{steps[step].description}</p>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {step === 0 ? (
          <div className="text-center">
            <Camera className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-600">{steps[step].instruction}</p>
            <button
              onClick={handleNext}
              className="mt-6 flex items-center justify-center w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        ) : (
          <div>
            {/* Camera Preview */}
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
              />

              {step > 0 && step < 4 && (
                <FaceQualityCheck
                  videoRef={videoRef}
                  onQualityCheck={(isGood) => setQualityGood(isGood)}
                />
              )}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <RefreshCw className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Instructions */}
            <p className="mt-4 text-sm text-gray-600">
              {steps[step].instruction}
            </p>

            {/* Progress */}
            {step === 2 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Captures: {captures.length} / {REQUIRED_CAPTURES}
                </p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-blue-600 rounded-full transition-all"
                    style={{
                      width: `${(captures.length / REQUIRED_CAPTURES) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="ml-3 text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex space-x-4">
              {step === 2 && captures.length < REQUIRED_CAPTURES && (
                <button
                  onClick={captureFrame}
                  disabled={loading || !qualityGood}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {!qualityGood
                    ? "Waiting for good quality..."
                    : `Capture Photo (${
                        captures.length + 1
                      }/${REQUIRED_CAPTURES})`}
                </button>
              )}
              {step === 3 && (
                <>
                  <button
                    onClick={verifyRegistration}
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300"
                  >
                    Complete Verification
                  </button>
                  <button
                    onClick={resetRegistration}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Start Over
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {!qualityGood && step > 0 && step < 4 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
          <div className="text-center text-white p-4">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Please adjust lighting and position before capturing</p>
          </div>
        </div>
      )}
    </div>
  );
}
