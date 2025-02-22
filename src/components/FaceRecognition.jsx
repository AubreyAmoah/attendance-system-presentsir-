// components/FaceRecognition.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

export default function FaceRecognition({ onFaceDetected, mode = 'register' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isVideoMounted, setIsVideoMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle video mounting
  useEffect(() => {
    if (videoRef.current) {
      setIsVideoMounted(true);
    }
  }, []);

  const startCamera = async () => {
    if (!videoRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });

      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      
      return new Promise((resolve) => {
        videoRef.current.onloadeddata = () => {
          resolve();
        };
      });
    } catch (err) {
      console.error('Camera error:', err);
      throw new Error(`Camera access failed: ${err.message}`);
    }
  };

  // Initialize only after video is mounted
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!isVideoMounted) return;

      try {
        setLoading(true);
        setError(null);

        // Start camera
        await startCamera();
        
        // Load face detection model
        await tf.ready();
        await blazeface.load();

        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isVideoMounted]);

  const captureFrame = async () => {
    if (!videoRef.current) return;

    try {
      const model = await blazeface.load();
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

      const faceCanvas = document.createElement('canvas');
      const width = bottomRight[0] - topLeft[0] + padding * 2;
      const height = bottomRight[1] - topLeft[1] + padding * 2;
      faceCanvas.width = width;
      faceCanvas.height = height;

      const faceCtx = faceCanvas.getContext('2d');
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

      onFaceDetected(faceCanvas.toDataURL('image/jpeg'));
    } catch (err) {
      console.error('Capture error:', err);
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
            startCamera();
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-2">Starting camera...</span>
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