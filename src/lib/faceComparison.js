// lib/faceComparison.js
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

export class FaceComparisonService {
  constructor() {
    this.model = null;
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await tf.ready();
      this.model = await blazeface.load();
      this.initialized = true;
    }
  }

  async getFaceEmbedding(imageData) {
    await this.initialize();

    // Convert image data to tensor
    const tensor = await this.preprocessImage(imageData);

    // Get face detection
    const faces = await this.model.estimateFaces(tensor, false);

    if (faces.length === 0) {
      throw new Error("No face detected in the image");
    }

    if (faces.length > 1) {
      throw new Error("Multiple faces detected in the image");
    }

    // Get face embedding
    const embedding = await this.extractFaceEmbedding(faces[0], tensor);

    // Cleanup
    tf.dispose(tensor);

    return embedding;
  }

  async preprocessImage(imageData) {
    // If imageData is a base64 string
    if (typeof imageData === "string" && imageData.startsWith("data:image")) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const tensor = tf.browser.fromPixels(img);
          resolve(tensor);
        };
        img.onerror = reject;
        img.src = imageData;
      });
    }

    // If imageData is already an HTML element
    return tf.browser.fromPixels(imageData);
  }

  async extractFaceEmbedding(face, tensor) {
    const { topLeft, bottomRight } = face;

    // Get face region
    const [x1, y1] = topLeft;
    const [x2, y2] = bottomRight;
    const width = x2 - x1;
    const height = y2 - y1;

    // Add padding
    const padding = Math.floor(Math.min(width, height) * 0.2);
    const startX = Math.max(0, Math.floor(x1 - padding));
    const startY = Math.max(0, Math.floor(y1 - padding));
    const endX = Math.min(tensor.shape[1], Math.floor(x2 + padding));
    const endY = Math.min(tensor.shape[0], Math.floor(y2 + padding));

    // Extract face region
    const faceTensor = tf.tidy(() => {
      const face = tf.slice(
        tensor,
        [startY, startX, 0],
        [endY - startY, endX - startX, 3]
      );
      // Resize to standard size
      return tf.image.resizeBilinear(face, [112, 112]).div(255.0).expandDims(0);
    });

    // Get embedding from the model
    const embedding = await this.model.predict(faceTensor).data();

    // Cleanup
    tf.dispose(faceTensor);

    return Array.from(embedding);
  }

  async compareFaces(embedding1, embedding2, threshold = 0.6) {
    const similarity = this.calculateCosineSimilarity(embedding1, embedding2);
    return {
      similarity,
      match: similarity >= threshold,
    };
  }

  calculateCosineSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error("Embeddings must have the same length");
    }

    const dotProduct = embedding1.reduce((sum, value, index) => {
      return sum + value * embedding2[index];
    }, 0);

    const magnitude1 = Math.sqrt(
      embedding1.reduce((sum, value) => sum + value * value, 0)
    );
    const magnitude2 = Math.sqrt(
      embedding2.reduce((sum, value) => sum + value * value, 0)
    );

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  dispose() {
    if (this.model) {
      this.model.dispose();
    }
    this.initialized = false;
  }
}

// Helper functions for image processing
export const imageUtils = {
  async loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },

  async canvasToBase64(canvas) {
    return canvas.toDataURL("image/jpeg", 0.9);
  },

  async base64ToImage(base64) {
    return this.loadImage(base64);
  },

  createCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  },
};

// Create and export a singleton instance
export const faceComparisonService = new FaceComparisonService();

// Export constants for face comparison
export const FACE_COMPARISON_CONSTANTS = {
  MINIMUM_CONFIDENCE: 0.8,
  SIMILARITY_THRESHOLD: 0.6,
  FACE_SIZE: 112,
  MAX_FACES: 1,
};
