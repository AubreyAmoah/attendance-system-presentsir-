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
  const [isVideoReady, setIsVideoReady] = useState(false);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in your browser");
      }

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

        // Wait for the video to be ready
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => {
              // Add a small delay to ensure video is actually playing
              setTimeout(() => {
                setIsVideoReady(true);
                resolve();
              }, 100);
            });
          };
        });
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError(err.message || "Failed to access camera");
    }
  };

  const initFaceDetection = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize TensorFlow and load model
      await tf.ready();
      const loadedModel = await blazeface.load();
      setModel(loadedModel);

      // Start camera after model is loaded
      await startCamera();

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
    if (!model || !videoRef.current || !isVideoReady) {
      console.log("Not ready:", {
        hasModel: !!model,
        hasVideo: !!videoRef.current,
        isVideoReady,
        videoWidth: videoRef.current?.videoWidth,
        videoHeight: videoRef.current?.videoHeight,
      });
      return;
    }

    try {
      setError(null);

      // Ensure video dimensions are valid
      if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
        throw new Error("Video dimensions not ready");
      }

      // Create canvas with video dimensions
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      // Draw the current frame
      ctx.drawImage(videoRef.current, 0, 0);

      // Detect faces
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

      // Add padding around the face
      const padding = 50;
      const width = bottomRight[0] - topLeft[0] + padding * 2;
      const height = bottomRight[1] - topLeft[1] + padding * 2;

      // Create a new canvas for the face crop
      const faceCanvas = document.createElement("canvas");
      faceCanvas.width = width;
      faceCanvas.height = height;
      const faceCtx = faceCanvas.getContext("2d");

      // Ensure coordinates are within bounds
      const sourceX = Math.max(0, topLeft[0] - padding);
      const sourceY = Math.max(0, topLeft[1] - padding);
      const sourceWidth = Math.min(width, canvas.width - sourceX);
      const sourceHeight = Math.min(height, canvas.height - sourceY);

      // Draw the face region
      faceCtx.drawImage(
        canvas,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        width,
        height
      );

      // Convert to base64
      const faceImage = faceCanvas.toDataURL("image/jpeg", 0.9);
      onFaceDetected(faceImage);
    } catch (err) {
      console.error("Face capture error:", err);
      setError(err.message || "Failed to capture face");
    }
  };

  useEffect(() => {
    let interval;

    if (mode === "verify" && model && isVideoReady) {
      interval = setInterval(captureFrame, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [mode, model, isVideoReady]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Initializing camera and face detection...</span>
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

      {mode === "register" && isVideoReady && (
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
