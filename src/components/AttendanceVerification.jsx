// components/AttendanceVerification.jsx
"use client";

import { useState, useRef, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

export default function AttendanceVerification({
  courseId,
  onVerificationComplete,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [model, setModel] = useState(null);
  const [status, setStatus] = useState("initializing"); // initializing, ready, verifying, success, error
  const [error, setError] = useState(null);

  useEffect(() => {
    initFaceDetection();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const initFaceDetection = async () => {
    try {
      setStatus("initializing");

      // Initialize TensorFlow and load model
      await tf.ready();
      const loadedModel = await blazeface.load();
      setModel(loadedModel);

      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      setStatus("ready");
    } catch (err) {
      console.error("Initialization error:", err);
      setError("Failed to initialize camera and face detection");
      setStatus("error");
    }
  };

  const captureAndVerify = async () => {
    if (!model || !videoRef.current) return;

    try {
      setStatus("verifying");
      setError(null);

      // Create canvas for capture
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);

      // Detect face
      const predictions = await model.estimateFaces(videoRef.current, false);

      if (predictions.length === 0) {
        throw new Error(
          "No face detected. Please look directly at the camera."
        );
      }

      if (predictions.length > 1) {
        throw new Error(
          "Multiple faces detected. Please ensure only your face is visible."
        );
      }

      // Process face region
      const face = predictions[0];
      const { topLeft, bottomRight } = face;
      const padding = 50;

      const faceCanvas = document.createElement("canvas");
      const width = bottomRight[0] - topLeft[0] + padding * 2;
      const height = bottomRight[1] - topLeft[1] + padding * 2;
      faceCanvas.width = width;
      faceCanvas.height = height;

      const faceCtx = faceCanvas.getContext("2d");
      faceCtx.drawImage(
        canvas,
        topLeft[0] - padding,
        topLeft[1] - padding,
        width,
        height,
        0,
        0,
        width,
        height
      );

      // Send for verification
      const response = await fetch(
        `/api/courses/${courseId}/verify-attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            faceImage: faceCanvas.toDataURL("image/jpeg", 0.9),
            timestamp: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Verification failed");
      }

      setStatus("success");
      onVerificationComplete && onVerificationComplete(true);
    } catch (err) {
      console.error("Verification error:", err);
      setError(err.message);
      setStatus("error");
      onVerificationComplete && onVerificationComplete(false, err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Message */}
      <div
        className={`p-4 rounded-lg ${
          status === "error"
            ? "bg-red-50 text-red-700"
            : status === "success"
            ? "bg-green-50 text-green-700"
            : "bg-blue-50 text-blue-700"
        }`}
      >
        {status === "initializing" &&
          "Initializing camera and face detection..."}
        {status === "ready" &&
          "Camera ready. Please look directly at the camera."}
        {status === "verifying" && "Verifying your identity..."}
        {status === "success" && "Identity verified successfully!"}
        {status === "error" && error}
      </div>

      {/* Camera Feed */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-w-2xl mx-auto"
          style={{ transform: "scaleX(-1)" }}
        />

        {status === "verifying" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {status === "ready" && (
        <div className="flex justify-center">
          <button
            onClick={captureAndVerify}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Mark Attendance
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              setError(null);
              setStatus("ready");
            }}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
