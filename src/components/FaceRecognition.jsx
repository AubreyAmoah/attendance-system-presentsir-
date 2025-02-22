// components/FaceRecognition.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

export default function FaceRecognition({ onFaceDetected, mode = 'register' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingState, setLoadingState] = useState('Initializing...');
  const [error, setError] = useState(null);

  const startCamera = async () => {
    try {
      setLoadingState('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }, // Simplified constraints
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      // Simple video ready check
      return new Promise((resolve) => {
        videoRef.current.onloadeddata = () => {
          resolve();
        };
      });
    } catch (err) {
      throw new Error(`Camera access failed: ${err.message}`);
    }
  };

  const initializeSystem = async () => {
    try {
      // Start camera first
      setLoadingState('Starting camera...');
      await startCamera();

      // Load TF.js and model in parallel with camera setup
      setLoadingState('Loading face detection...');
      await tf.ready();
      const model = await blazeface.load();

      setLoading(false);
      return model;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  };

  useEffect(() => {
    initializeSystem();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureFrame = async () => {
    try {
      const model = await blazeface.load(); // Load model on demand
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
      const padding = 50;

      // Capture face region
      const faceCanvas = document.createElement('canvas');
      const width = bottomRight[0] - topLeft[0] + padding * 2;
      const height = bottomRight[1] - topLeft[1] + padding * 2;
      faceCanvas.width = width;
      faceCanvas.height = height;

      const faceCtx = faceCanvas.getContext('2d');
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

      onFaceDetected(faceCanvas.toDataURL('image/jpeg'));
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-600">{error}</p>
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
      <div className="flex flex-col items-center justify-center p-4 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <p className="text-sm text-gray-600">{loadingState}</p>
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