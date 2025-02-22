// components/FaceDetectionTest.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

export default function FaceDetectionTest() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const modelRef = useRef(null);
  const [status, setStatus] = useState("Initializing...");
  const [error, setError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);

  const initCamera = async () => {
    try {
      setStatus("Requesting camera permissions...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStatus("Camera initialized");
      }
    } catch (err) {
      console.error("Camera initialization error:", err);
      setError("Camera initialization failed: " + err.message);
    }
  };

  const initTensorFlow = async () => {
    try {
      setStatus("Initializing TensorFlow.js...");
      await tf.ready();
      setStatus("Loading face detection model...");
      const model = await blazeface.load();
      modelRef.current = model;
      setStatus("Model loaded, starting detection...");
      startFaceDetection();
    } catch (err) {
      console.error("TensorFlow initialization error:", err);
      setError("TensorFlow initialization failed: " + err.message);
    }
  };

  const startFaceDetection = () => {
    if (!modelRef.current || !videoRef.current) return;

    const detectFaces = async () => {
      try {
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          const predictions = await modelRef.current.estimateFaces(
            videoRef.current,
            false
          );

          if (predictions.length > 0) {
            setFaceDetected(true);
            setStatus("Face detected! ✓");
          } else {
            setFaceDetected(false);
            setStatus(
              "No face detected. Please center your face in the frame."
            );
          }
        }
      } catch (err) {
        console.error("Face detection error:", err);
      }
    };

    // Run detection every 100ms
    const detectionInterval = setInterval(detectFaces, 100);
    return () => clearInterval(detectionInterval);
  };

  const captureImage = async () => {
    if (!videoRef.current || !faceDetected) return;

    try {
      setStatus("Capturing image...");

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);

      const predictions = await modelRef.current.estimateFaces(
        videoRef.current,
        false
      );

      if (predictions.length > 0) {
        const face = predictions[0];
        const { topLeft, bottomRight } = face;

        // Add padding around face
        const padding = 50;
        const width = bottomRight[0] - topLeft[0] + padding * 2;
        const height = bottomRight[1] - topLeft[1] + padding * 2;

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

        setStatus("Image captured successfully! ✓");
        return faceCanvas.toDataURL("image/jpeg", 0.9);
      }
    } catch (err) {
      console.error("Image capture error:", err);
      setError("Failed to capture image: " + err.message);
    }
  };

  useEffect(() => {
    const init = async () => {
      await initCamera();
      await initTensorFlow();
    };

    init();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div
        className={`p-4 rounded ${
          faceDetected ? "bg-green-50" : "bg-yellow-50"
        }`}
      >
        <p className={`${faceDetected ? "text-green-800" : "text-yellow-800"}`}>
          Status: {status}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => {
              setError(null);
              initCamera();
            }}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-w-2xl mx-auto"
          style={{ transform: "scaleX(-1)" }}
        />

        {faceDetected && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
            Face Detected
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={captureImage}
          disabled={!faceDetected}
          className={`px-6 py-2 rounded-lg ${
            faceDetected
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Capture Image
        </button>
      </div>
    </div>
  );
}
