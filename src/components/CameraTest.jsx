// components/CameraTest.jsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function CameraTest() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Initializing...");
  const [error, setError] = useState(null);

  const initCamera = async () => {
    try {
      setStatus("Requesting camera permissions...");
      console.log("Requesting camera access");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      console.log("Camera access granted", stream);
      setStatus("Camera access granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log("Stream attached to video element");
        setStatus("Stream attached to video");
      }
    } catch (err) {
      console.error("Camera initialization error:", err);
      setError(err.message);
      setStatus("Error initializing camera");
    }
  };

  useEffect(() => {
    initCamera();
  }, []);

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded">
        <h3 className="text-red-800 font-bold">Camera Error:</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={initCamera}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry Camera Access
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded">
        <p className="text-blue-800">Status: {status}</p>
      </div>

      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-w-2xl mx-auto"
          onLoadedMetadata={() => {
            console.log("Video metadata loaded");
            setStatus("Video ready");
            videoRef.current.play();
          }}
          onError={(e) => {
            console.error("Video element error:", e);
            setError("Error loading video stream");
          }}
        />
      </div>
    </div>
  );
}
