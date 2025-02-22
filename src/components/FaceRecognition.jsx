// components/FaceRecognition.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

export default function FaceRecognition({ onFaceDetected, mode = "register" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const modelRef = useRef(null);
  const [status, setStatus] = useState("Initializing...");
  const [error, setError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);

  const initCamera = async () => {
    try {
      setStatus("Requesting camera access...");
      console.log("Starting camera initialization");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      console.log("Camera stream obtained");
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(resolve);
          };
        });
        console.log("Video element initialized");
        setStatus("Camera ready");
      }
    } catch (err) {
      console.error("Camera init error:", err);
      setError("Camera access failed: " + err.message);
    }
  };

  const initFaceDetection = async () => {
    try {
      setStatus("Loading face detection...");
      console.log("Initializing TensorFlow");

      await tf.ready();
      const model = await blazeface.load();
      modelRef.current = model;

      console.log("Face detection model loaded");
      setStatus("Face detection ready");

      startFaceDetection();
    } catch (err) {
      console.error("Face detection init error:", err);
      setError("Face detection initialization failed: " + err.message);
    }
  };

  const startFaceDetection = () => {
    if (!modelRef.current || !videoRef.current) return;

    const detectFaces = async () => {
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        try {
          const predictions = await modelRef.current.estimateFaces(
            videoRef.current,
            false
          );

          setFaceDetected(predictions.length > 0);
          setStatus(
            predictions.length > 0 ? "Face detected" : "No face detected"
          );

          if (predictions.length > 0 && mode === "verify") {
            await captureFrame(predictions[0]);
          }
        } catch (err) {
          console.error("Detection error:", err);
        }
      }
    };

    const interval = setInterval(detectFaces, 100);
    return () => clearInterval(interval);
  };

  const captureFrame = async (facePrediction) => {
    if (!videoRef.current || !facePrediction) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);

      const { topLeft, bottomRight } = facePrediction;
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
      console.error("Capture error:", err);
      setError("Failed to capture image: " + err.message);
    }
  };

  useEffect(() => {
    const init = async () => {
      console.log("Starting initialization");
      await initCamera();
      await initFaceDetection();
    };

    init();

    return () => {
      console.log("Cleaning up");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => {
            setError(null);
            initCamera();
          }}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`p-4 rounded ${
          faceDetected ? "bg-green-50" : "bg-yellow-50"
        }`}
      >
        <p className={`${faceDetected ? "text-green-800" : "text-yellow-800"}`}>
          {status}
        </p>
      </div>

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

      {mode === "register" && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (faceDetected && modelRef.current) {
                modelRef.current
                  .estimateFaces(videoRef.current, false)
                  .then((predictions) => {
                    if (predictions.length > 0) {
                      captureFrame(predictions[0]);
                    }
                  });
              }
            }}
            disabled={!faceDetected}
            className={`px-6 py-2 rounded-lg ${
              faceDetected
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Capture
          </button>
        </div>
      )}
    </div>
  );
}
