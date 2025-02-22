"use client";

import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

const DEBUG = true;

function debugLog(message, data = null) {
  if (DEBUG) {
    const timestamp = new Date().toISOString().split("T")[1];
    console.log(`[${timestamp}] ${message}`, data || "");
  }
}

export default function FaceRecognition({ onFaceDetected, mode = "register" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [initState, setInitState] = useState({
    videoMounted: false,
    cameraRequested: false,
    cameraStarted: false,
    modelLoaded: false,
    tensorflowReady: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const analyzeBrowserSupport = () => {
    const support = {
      mediaDevices: !!navigator.mediaDevices,
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      enumerateDevices: !!navigator.mediaDevices?.enumerateDevices,
      secure:
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost",
      video: typeof HTMLVideoElement !== "undefined",
      canvas: typeof HTMLCanvasElement !== "undefined",
    };
    debugLog("Browser support analysis:", support);
    return support;
  };

  const checkCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      debugLog("Available video devices:", videoDevices);
      return videoDevices.length > 0;
    } catch (err) {
      debugLog("Error checking camera devices:", err);
      return false;
    }
  };

  const startCamera = async () => {
    debugLog("Starting camera initialization");
    if (!videoRef.current) {
      throw new Error("Video element not mounted");
    }

    setInitState((prev) => ({ ...prev, cameraRequested: true }));

    try {
      // First check if we can access any video devices
      const hasCamera = await checkCameraDevices();
      if (!hasCamera) {
        throw new Error("No camera devices found");
      }

      debugLog("Requesting camera stream");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      debugLog(
        "Camera stream obtained:",
        stream.getVideoTracks()[0].getSettings()
      );

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        debugLog("Stream attached to video element");

        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error("Video loading timed out"));
          }, 10000);

          videoRef.current.onloadeddata = () => {
            debugLog("Video data loaded");
            clearTimeout(timeoutId);
            resolve();
          };

          videoRef.current.onerror = (error) => {
            debugLog("Video element error:", error);
            clearTimeout(timeoutId);
            reject(error);
          };
        });

        setInitState((prev) => ({ ...prev, cameraStarted: true }));
        debugLog("Camera initialization complete");
      }
    } catch (err) {
      debugLog("Camera initialization error:", err);
      throw err;
    }
  };

  const initializeSystem = async () => {
    try {
      debugLog("Starting system initialization");

      // Check browser support
      const support = analyzeBrowserSupport();
      if (!support.mediaDevices || !support.getUserMedia) {
        throw new Error("Camera access not supported in this browser");
      }

      setLoading(true);
      debugLog("Initializing TensorFlow.js");
      await tf.ready();
      setInitState((prev) => ({ ...prev, tensorflowReady: true }));
      debugLog("TensorFlow.js initialized");

      debugLog("Loading face detection model");
      const model = await blazeface.load();
      setInitState((prev) => ({ ...prev, modelLoaded: true }));
      debugLog("Face detection model loaded");

      debugLog("Starting camera");
      await startCamera();

      setLoading(false);
      debugLog("System initialization complete");
    } catch (err) {
      debugLog("System initialization error:", err);
      setError(`Initialization failed: ${err.message}`);
      setLoading(false);
    }
  };

  // Handle video mounting
  useEffect(() => {
    if (videoRef.current) {
      debugLog("Video element mounted");
      setInitState((prev) => ({ ...prev, videoMounted: true }));
    }
  }, []);

  // Initialize system
  useEffect(() => {
    if (!initState.videoMounted) {
      debugLog("Waiting for video element to mount");
      return;
    }

    debugLog("Starting initialization process");
    initializeSystem();

    return () => {
      debugLog("Cleaning up resources");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          debugLog("Stopping track:", track.label);
          track.stop();
        });
      }
    };
  }, [initState.videoMounted]);

  // Debug display
  const renderDebugInfo = () => (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-gray-600">Debug Info</summary>
      <pre className="mt-1 p-2 bg-gray-100 rounded">
        {JSON.stringify(initState, null, 2)}
      </pre>
    </details>
  );

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-600">{error}</p>
        {renderDebugInfo()}
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            initializeSystem();
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
      <div className="p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-2">Starting camera...</span>
        </div>
        {renderDebugInfo()}
        <div className="mt-2 text-sm">
          <h3 className="font-medium">Initialization Status:</h3>
          <ul className="mt-1 space-y-1">
            <li
              className={
                initState.videoMounted ? "text-green-600" : "text-gray-500"
              }
            >
              ✓ Video Element Mounted
            </li>
            <li
              className={
                initState.tensorflowReady ? "text-green-600" : "text-gray-500"
              }
            >
              ✓ TensorFlow Initialized
            </li>
            <li
              className={
                initState.modelLoaded ? "text-green-600" : "text-gray-500"
              }
            >
              ✓ Face Detection Model Loaded
            </li>
            <li
              className={
                initState.cameraRequested ? "text-green-600" : "text-gray-500"
              }
            >
              ✓ Camera Access Requested
            </li>
            <li
              className={
                initState.cameraStarted ? "text-green-600" : "text-gray-500"
              }
            >
              ✓ Camera Stream Started
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-w-2xl mx-auto"
          style={{ transform: "scaleX(-1)" }}
        />
      </div>

      {mode === "register" && (
        <div className="flex justify-center">
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
