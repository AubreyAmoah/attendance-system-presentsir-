// components/FaceRegistration.jsx
"use client";

import { useState, useRef, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

export default function FaceRegistration() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModel] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    initializeModel();
  }, []);

  // Initialize face detection model
  const initializeModel = async () => {
    try {
      setLoading(true);
      await tf.ready();
      const loadedModel = await blazeface.load();
      setModel(loadedModel);
      setLoading(false);
    } catch (err) {
      setError("Error initializing face detection model");
      setLoading(false);
    }
  };

  // Start camera for selfie
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        streamRef.current = stream;
        setIsCameraActive(true);
        console.log("started camera");
      }
    } catch (err) {
      setError("Error accessing camera");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const faceData = await processImage(file);
        if (faceData) {
          setImages([...images, faceData]);
        }
      } catch (err) {
        setError("Error processing uploaded image");
      }
    }
  };

  // Take selfie
  const takeSelfie = async () => {
    if (!videoRef.current || !model) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);

      const faces = await model.estimateFaces(videoRef.current, false);

      if (faces.length === 0) {
        setError(
          "No face detected. Please ensure your face is clearly visible."
        );
        return;
      }

      if (faces.length > 1) {
        setError(
          "Multiple faces detected. Please ensure only your face is visible."
        );
        return;
      }

      const face = faces[0];
      const { topLeft, bottomRight } = face;
      const padding = 50;

      // Crop face region
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

      const faceData = {
        image: faceCanvas.toDataURL("image/jpeg", 0.9),
        timestamp: new Date().toISOString(),
      };

      setImages([...images, faceData]);
      stopCamera();
    } catch (err) {
      setError("Error capturing selfie");
    }
  };

  // Process uploaded image
  const processImage = async (file) => {
    if (!model) await initializeModel();

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);

          const faces = await model.estimateFaces(img, false);

          if (faces.length === 0) {
            reject("No face detected in uploaded image");
            return;
          }

          if (faces.length > 1) {
            reject("Multiple faces detected in uploaded image");
            return;
          }

          const face = faces[0];
          resolve({
            image: canvas.toDataURL("image/jpeg", 0.9),
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          reject(err);
        }
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // Save face images
  const saveFaceImages = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users/face-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ faceImages: images }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          // Show specific validation errors
          setError(data.errors.map((e) => e.error).join("\n"));
        } else {
          setError(data.message);
        }
        return;
      }

      // Show success and redirect
    } catch (err) {
      setError("Error saving face images");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Face Registration</h2>

        {/* Upload Button */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Upload Photo
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="mt-1 block w-full"
          />
        </div>

        {/* Camera Section */}
        <div className="mb-4">
          <button
            onClick={isCameraActive ? stopCamera : startCamera}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isCameraActive ? "Stop Camera" : "Take Selfie"}
          </button>

          <div className="mt-4">
            <video
              ref={videoRef}
              autoPlay
              className="w-full max-w-md mx-auto"
            />
            {isCameraActive && (
              <button
                onClick={takeSelfie}
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Capture
              </button>
            )}
          </div>
        </div>

        {/* Preview Section */}
        {images.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Registered Face Images</h3>
            <div className="grid grid-cols-3 gap-4">
              {images.map((face, index) => (
                <div key={index} className="relative">
                  <img
                    src={face.image}
                    alt={`Face ${index + 1}`}
                    className="rounded-lg"
                  />
                  <button
                    onClick={() =>
                      setImages(images.filter((_, i) => i !== index))
                    }
                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        {images.length > 0 && (
          <button
            onClick={saveFaceImages}
            disabled={loading}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? "Saving..." : "Save Face Images"}
          </button>
        )}

        {/* Error Messages */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded">{error}</div>
        )}
      </div>
    </div>
  );
}
