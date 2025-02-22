// components/FaceRecognition.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

export default function FaceRecognition({ onFaceDetected, mode = 'register' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  const checkVideoStream = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      setDebugInfo({
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
        ended: video.ended,
        error: video.error,
        srcObject: !!video.srcObject
      });
    }
  };

  const startCamera = async () => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      // Store stream reference
      streamRef.current = stream;

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Important: Set these attributes via JavaScript
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');

        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play()
              .then(resolve)
              .catch(reject);
          };
          // Add timeout for error handling
          setTimeout(() => reject(new Error('Video stream timeout')), 10000);
        });

        // Start debug info interval
        const debugInterval = setInterval(checkVideoStream, 1000);
        return () => clearInterval(debugInterval);
      }
    } catch (err) {
      console.error('Camera start error:', err);
      setError(`Camera error: ${err.message}`);
      throw err;
    }
  };

  const initFaceDetection = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Load model first
      await tf.ready();
      console.log('TensorFlow.js ready');
      
      const loadedModel = await blazeface.load();
      console.log('Face detection model loaded');
      setModel(loadedModel);

      // Start camera
      await startCamera();
      console.log('Camera started');

      setLoading(false);
    } catch (err) {
      console.error('Initialization error:', err);
      setError(`Initialization failed: ${err.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    initFaceDetection();

    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureFrame = async () => {
    if (!model || !videoRef.current) {
      setError('Video or model not ready');
      return;
    }

    try {
      // Check if video is playing and has dimensions
      if (
        videoRef.current.paused ||
        videoRef.current.ended ||
        !videoRef.current.videoWidth ||
        !videoRef.current.videoHeight
      ) {
        throw new Error('Video stream not ready');
      }

      const predictions = await model.estimateFaces(videoRef.current, false);

      if (!predictions.length) {
        throw new Error('No face detected. Please center your face in the frame.');
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);

      const face = predictions[0];
      const { topLeft, bottomRight } = face;
      
      // Add padding
      const padding = 50;
      const width = bottomRight[0] - topLeft[0] + (padding * 2);
      const height = bottomRight[1] - topLeft[1] + (padding * 2);

      // Ensure coordinates are within bounds
      const x = Math.max(0, topLeft[0] - padding);
      const y = Math.max(0, topLeft[1] - padding);
      const w = Math.min(width, canvas.width - x);
      const h = Math.min(height, canvas.height - y);

      // Create face canvas
      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = w;
      faceCanvas.height = h;
      
      const faceCtx = faceCanvas.getContext('2d');
      faceCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

      onFaceDetected(faceCanvas.toDataURL('image/jpeg', 0.9));
    } catch (err) {
      console.error('Capture error:', err);
      setError(err.message);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-red-600">{error}</p>
          {Object.keys(debugInfo).length > 0 && (
            <details className="mt-2">
              <summary className="text-sm text-gray-600 cursor-pointer">Debug Info</summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}
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
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Starting camera...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full max-w-2xl mx-auto"
          style={{ transform: 'scaleX(-1)' }}
        />
      </div>
      
      {mode === 'register' && (
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