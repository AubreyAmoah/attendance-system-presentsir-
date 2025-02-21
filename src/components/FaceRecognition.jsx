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
      await tf.ready();
      const loadedModel = await blazeface.load();
      setModel(loadedModel);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const captureFrame = async () => {
    if (!model || !videoRef.current) return;

    try {
      // Create a canvas to capture the frame
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);

      // Get face predictions
      const predictions = await model.estimateFaces(videoRef.current, false);

      if (predictions.length > 0) {
        const face = predictions[0];
        const { topLeft, bottomRight } = face;

        // Add padding around the face
        const padding = 50;
        const width = bottomRight[0] - topLeft[0] + padding * 2;
        const height = bottomRight[1] - topLeft[1] + padding * 2;

        // Crop to face region
        const faceCanvas = document.createElement("canvas");
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

        // Convert to base64
        const faceImage = faceCanvas.toDataURL("image/jpeg");
        onFaceDetected(faceImage);
      } else {
        throw new Error("No face detected");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const startContinuousDetection = () => {
    if (mode === "verify") {
      const interval = setInterval(async () => {
        try {
          if (!model || !videoRef.current) return;

          const predictions = await model.estimateFaces(
            videoRef.current,
            false
          );
          if (predictions.length > 0) {
            await captureFrame();
          }
        } catch (err) {
          console.error("Detection error:", err);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  };

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
        <span className="ml-2">Loading face detection model...</span>
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
        onPlay={startContinuousDetection}
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
