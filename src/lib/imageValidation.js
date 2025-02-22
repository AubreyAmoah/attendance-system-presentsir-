// lib/imageValidation.js
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

export class ImageValidator {
  constructor() {
    this.model = null;
    this.initialized = false;
    this.maxImageSize = 5 * 1024 * 1024; // 5MB
    this.minDimension = 200; // Minimum width/height
    this.maxDimension = 4096; // Maximum width/height
  }

  async initialize() {
    if (!this.initialized) {
      await tf.ready();
      this.model = await blazeface.load();
      this.initialized = true;
    }
  }

  // Validate base64 image
  async validateImage(base64String) {
    try {
      // Check base64 format
      if (!this.isValidBase64(base64String)) {
        throw new Error("Invalid image format");
      }

      // Check file size
      const sizeInBytes = this.getBase64Size(base64String);
      if (sizeInBytes > this.maxImageSize) {
        throw new Error(
          `Image size must be less than ${this.maxImageSize / (1024 * 1024)}MB`
        );
      }

      // Load and check image dimensions
      const imageDimensions = await this.getImageDimensions(base64String);
      if (!this.isValidDimensions(imageDimensions)) {
        throw new Error(
          `Image dimensions must be between ${this.minDimension}px and ${this.maxDimension}px`
        );
      }

      // Check image quality
      const quality = await this.assessImageQuality(base64String);
      if (!quality.isAcceptable) {
        throw new Error(quality.message);
      }

      // Validate face detection
      const faceDetection = await this.detectFace(base64String);
      if (!faceDetection.isValid) {
        throw new Error(faceDetection.message);
      }

      return {
        isValid: true,
        dimensions: imageDimensions,
        faceLocation: faceDetection.faceLocation,
        quality: quality.metrics,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  isValidBase64(str) {
    try {
      if (!str.startsWith("data:image/")) return false;
      const regex = /^data:image\/(jpeg|jpg|png);base64,/;
      if (!regex.test(str)) return false;
      const base64 = str.split(",")[1];
      return btoa(atob(base64)) === base64;
    } catch (e) {
      return false;
    }
  }

  getBase64Size(base64String) {
    const base64 = base64String.split(",")[1];
    return (base64.length * 3) / 4;
  }

  async getImageDimensions(base64String) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
        });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = base64String;
    });
  }

  isValidDimensions({ width, height }) {
    return (
      width >= this.minDimension &&
      width <= this.maxDimension &&
      height >= this.minDimension &&
      height <= this.maxDimension
    );
  }

  async assessImageQuality(base64String) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const metrics = this.calculateImageMetrics(imageData);

        resolve({
          isAcceptable:
            metrics.brightness >= 40 &&
            metrics.brightness <= 240 &&
            metrics.contrast >= 20 &&
            metrics.sharpness >= 0.4,
          message: this.getQualityMessage(metrics),
          metrics,
        });
      };
      img.onerror = () => reject(new Error("Failed to analyze image quality"));
      img.src = base64String;
    });
  }

  calculateImageMetrics(imageData) {
    const data = imageData.data;
    let brightness = 0;
    let contrast = 0;
    let sharpness = 0;

    // Calculate brightness and contrast
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const value = (r + g + b) / 3;
      brightness += value;
      contrast += Math.abs(value - 128);
    }

    const pixels = data.length / 4;
    brightness = brightness / pixels;
    contrast = contrast / pixels;

    // Calculate sharpness using Laplacian
    const width = imageData.width;
    for (let i = 0; i < data.length; i += 4) {
      if (i > width * 4 && i < data.length - width * 4) {
        const center = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const top =
          (data[i - width * 4] +
            data[i - width * 4 + 1] +
            data[i - width * 4 + 2]) /
          3;
        const bottom =
          (data[i + width * 4] +
            data[i + width * 4 + 1] +
            data[i + width * 4 + 2]) /
          3;
        sharpness += Math.abs(center - top) + Math.abs(center - bottom);
      }
    }
    sharpness = sharpness / (pixels * 255);

    return {
      brightness,
      contrast,
      sharpness,
    };
  }

  getQualityMessage(metrics) {
    if (metrics.brightness < 40) return "Image is too dark";
    if (metrics.brightness > 240) return "Image is too bright";
    if (metrics.contrast < 20) return "Image has low contrast";
    if (metrics.sharpness < 0.4) return "Image is not sharp enough";
    return "Image quality is acceptable";
  }

  async detectFace(base64String) {
    if (!this.initialized) {
      await this.initialize();
    }

    const img = new Image();
    img.src = base64String;
    await new Promise((resolve) => (img.onload = resolve));

    const predictions = await this.model.estimateFaces(img, false);

    if (predictions.length === 0) {
      return {
        isValid: false,
        message: "No face detected in the image",
      };
    }

    if (predictions.length > 1) {
      return {
        isValid: false,
        message: "Multiple faces detected in the image",
      };
    }

    const face = predictions[0];
    const { topLeft, bottomRight, landmarks } = face;

    // Check face position (should be roughly centered)
    const faceCenter = {
      x: (topLeft[0] + bottomRight[0]) / 2,
      y: (topLeft[1] + bottomRight[1]) / 2,
    };

    const imageCenter = {
      x: img.width / 2,
      y: img.height / 2,
    };

    const distanceFromCenter = Math.sqrt(
      Math.pow(faceCenter.x - imageCenter.x, 2) +
        Math.pow(faceCenter.y - imageCenter.y, 2)
    );

    const maxAllowedDistance = Math.min(img.width, img.height) * 0.2;

    if (distanceFromCenter > maxAllowedDistance) {
      return {
        isValid: false,
        message: "Face is not centered in the image",
      };
    }

    return {
      isValid: true,
      faceLocation: {
        topLeft,
        bottomRight,
        landmarks,
      },
    };
  }
}
