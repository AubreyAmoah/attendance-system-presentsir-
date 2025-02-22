// components/FaceRecognition.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

export default function FaceRecognition({ onFaceDetected, mode = "register" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState("prompt"); // 'prompt', 'granted', 'denied'

  const requestCameraPermission = async () => {
    try {
      // First check if permissions API is supported
      if (!navigator.permissions || !navigator.permissions.query) {
        // Fallback to direct getUserMedia request
        await startCamera();
        setPermissionState("granted");
        return true;
      }

      // Check camera permission status
      const permission = await navigator.permissions.query({ name: "camera" });
      setPermissionState(permission.state);

      // Listen for permission changes
      permission.addEventListener("change", () => {
        setPermissionState(permission.state);
      });

      if (permission.state === "granted") {
        await startCamera();
        return true;
      } else if (permission.state === "prompt") {
        // Try to get camera access which will trigger the permission prompt
        await startCamera();
        setPermissionState("granted");
        return true;
      } else {
        setError(
          "Camera permission was denied. Please allow camera access to use this feature."
        );
        return false;
      }
    } catch (err) {
      console.error("Permission request error:", err);
      setError(
        "Failed to access camera. Please ensure camera permissions are granted."
      );
      return false;
    }
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
      console.error("Camera access error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setError(
          "Camera access was denied. Please allow camera access in your browser settings."
        );
      } else {
        setError(
          "Failed to access camera. Please ensure your camera is connected and not in use by another application."
        );
      }
      throw err;
    }
  };

  const initFaceDetection = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in your browser");
      }

      // Initialize TensorFlow
      await tf.ready();

      // Load the face detection model
      const loadedModel = await blazeface.load();
      setModel(loadedModel);

      // Request camera permission and start camera
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        throw new Error("Camera permission is required for face detection");
      }

      setLoading(false);
    } catch (err) {
      console.error("Face detection initialization error:", err);
      setError(err.message || "Failed to initialize face detection");
      setLoading(false);
    }
  };

  useEffect(() => {
    initFaceDetection();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureFrame = async () => {
    if (
      !model ||
      !videoRef.current ||
      !videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
    ) {
      return;
    }

    try {
      setError(null);

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);

      const predictions = await model.estimateFaces(videoRef.current, false);

      if (predictions.length === 0) {
        throw new Error(
          "No face detected. Please ensure your face is clearly visible."
        );
      }

      if (predictions.length > 1) {
        throw new Error(
          "Multiple faces detected. Please ensure only your face is visible."
        );
      }

      const face = predictions[0];
      const { topLeft, bottomRight } = face;

      const padding = 50;
      const width = bottomRight[0] - topLeft[0] + padding * 2;
      const height = bottomRight[1] - topLeft[1] + padding * 2;

      const faceCanvas = document.createElement("canvas");
      faceCanvas.width = width;
      faceCanvas.height = height;
      const faceCtx = faceCanvas.getContext("2d");

      faceCtx.drawImage(
        canvas,
        Math.max(0, topLeft[0] - padding),
        Math.max(0, topLeft[1] - padding),
        width,
        height,
        0,
        0,
        width,
        height
      );

      const faceImage = faceCanvas.toDataURL("image/jpeg", 0.9);
      onFaceDetected(faceImage);
    } catch (err) {
      console.error("Face capture error:", err);
      setError(err.message || "Failed to capture face");
    }
  };

  useEffect(() => {
    let interval;

    if (mode === "verify" && model && videoRef.current) {
      interval = setInterval(captureFrame, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [mode, model]);

  if (permissionState === "denied") {
    return (
      <div className="p-6 bg-red-50 rounded-lg text-center">
        <h3 className="text-lg font-semibold text-red-700 mb-2">
          Camera Access Required
        </h3>
        <p className="text-red-600 mb-4">
          Camera access was denied. To use face recognition, please allow camera
          access in your browser settings.
        </p>
        <button
          onClick={() => initFaceDetection()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">
          {permissionState === "prompt"
            ? "Waiting for camera permission..."
            : "Initializing face detection..."}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => {
            setError(null);
            initFaceDetection();
          }}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="rounded-lg shadow-lg"
        style={{ width: "100%", maxWidth: "640px" }}
      />

      {mode === "register" && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={captureFrame}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Capture Face
          </button>
        </div>
      )}
    </div>
  );
}
