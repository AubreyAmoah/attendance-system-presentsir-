//components/FaceQualityCheck.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, AlertTriangle, Check } from "lucide-react";

export default function FaceQualityCheck({ onQualityCheck, videoRef }) {
  const canvasRef = useRef(null);
  const [quality, setQuality] = useState({
    brightness: 0,
    contrast: 0,
    facePosition: "unknown",
  });

  useEffect(() => {
    if (!videoRef.current) return;

    const checkInterval = setInterval(() => {
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        analyzeFrame(videoRef.current);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [videoRef]);

  const analyzeFrame = (videoElement) => {
    if (!canvasRef.current || !videoElement) return;

    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoElement.videoWidth;
    canvasRef.current.height = videoElement.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(videoElement, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    const data = imageData.data;

    // Calculate brightness and contrast
    let brightness = 0;
    let contrast = 0;
    const pixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate relative luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      brightness += luminance;

      // Accumulate contrast values
      contrast += Math.abs(luminance - 0.5);
    }

    brightness = (brightness / pixels) * 100;
    contrast = (contrast / pixels) * 100;

    const newQuality = {
      brightness,
      contrast,
      facePosition: determineFacePosition(data),
    };

    setQuality(newQuality);
    onQualityCheck(isQualityGood(newQuality));
  };

  const determineFacePosition = (imageData) => {
    // This would be replaced with actual face detection logic
    // For now, we'll assume centered if brightness and contrast are good
    return quality.brightness > 40 && quality.brightness < 90
      ? "centered"
      : "not-centered";
  };

  const isQualityGood = (quality) => {
    return (
      quality.brightness > 40 && // Not too dark
      quality.brightness < 90 && // Not too bright
      quality.contrast > 20 && // Sufficient contrast
      quality.facePosition === "centered"
    );
  };

  const getQualityFeedback = () => {
    const feedback = [];

    if (quality.brightness < 40) {
      feedback.push({
        type: "warning",
        message: "Scene is too dark. Please find better lighting.",
        icon: <Sun className="h-5 w-5 text-yellow-500" />,
      });
    } else if (quality.brightness > 90) {
      feedback.push({
        type: "warning",
        message: "Scene is too bright. Reduce direct light.",
        icon: <Sun className="h-5 w-5 text-red-500" />,
      });
    }

    if (quality.contrast < 20) {
      feedback.push({
        type: "warning",
        message: "Low contrast. Try adjusting lighting.",
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      });
    }

    if (quality.facePosition !== "centered") {
      feedback.push({
        type: "info",
        message: "Center your face in the frame.",
        icon: <AlertTriangle className="h-5 w-5 text-blue-500" />,
      });
    }

    return feedback;
  };

  const getQualityIndicatorColor = (value, thresholds) => {
    if (value < thresholds.low) return "bg-red-500";
    if (value < thresholds.medium) return "bg-yellow-500";
    if (value < thresholds.high) return "bg-green-500";
    return "bg-red-500"; // Too high is also bad
  };

  return (
    <div className="mt-4 bg-gray-50 rounded-lg p-4">
      <canvas ref={canvasRef} className="hidden" />

      {/* Quality Indicators */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Brightness</span>
            <span className="text-sm font-medium">
              {Math.round(quality.brightness)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className={`h-2 rounded-full transition-all ${getQualityIndicatorColor(
                quality.brightness,
                {
                  low: 40,
                  medium: 60,
                  high: 90,
                }
              )}`}
              style={{ width: `${quality.brightness}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Contrast</span>
            <span className="text-sm font-medium">
              {Math.round(quality.contrast)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className={`h-2 rounded-full transition-all ${getQualityIndicatorColor(
                quality.contrast,
                {
                  low: 20,
                  medium: 40,
                  high: 80,
                }
              )}`}
              style={{ width: `${quality.contrast}%` }}
            />
          </div>
        </div>

        {/* Feedback Messages */}
        <div className="mt-4 space-y-2">
          {getQualityFeedback().map((feedback, index) => (
            <div
              key={index}
              className={`flex items-center space-x-2 text-sm ${
                feedback.type === "warning"
                  ? "text-yellow-700"
                  : "text-blue-700"
              }`}
            >
              {feedback.icon}
              <span>{feedback.message}</span>
            </div>
          ))}

          {isQualityGood(quality) && (
            <div className="flex items-center space-x-2 text-sm text-green-700">
              <Check className="h-5 w-5" />
              <span>Image quality is good. Ready to capture!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
