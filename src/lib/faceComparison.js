// // lib/faceComparison.js
// import * as tf from "@tensorflow/tfjs";
// import * as blazeface from "@tensorflow-models/blazeface";

// export class FaceComparisonService {
//   constructor() {
//     this.model = null;
//     this.initialized = false;
//   }

//   async initialize() {
//     if (!this.initialized) {
//       await tf.ready();
//       this.model = await blazeface.load();
//       this.initialized = true;
//     }
//   }

//   async getFaceEmbedding(imageData) {
//     await this.initialize();

//     // Convert image data to tensor
//     const tensor = await this.preprocessImage(imageData);

//     // Get face detection
//     const faces = await this.model.estimateFaces(tensor, false);

//     if (faces.length === 0) {
//       throw new Error("No face detected in the image");
//     }

//     if (faces.length > 1) {
//       throw new Error("Multiple faces detected in the image");
//     }

//     // Get face embedding
//     const embedding = await this.extractFaceEmbedding(faces[0], tensor);

//     // Cleanup
//     tf.dispose(tensor);

//     return embedding;
//   }

//   async preprocessImage(imageData) {
//     // If imageData is a base64 string
//     if (typeof imageData === "string" && imageData.startsWith("data:image")) {
//       return new Promise((resolve, reject) => {
//         const img = new Image();
//         img.onload = () => {
//           const tensor = tf.browser.fromPixels(img);
//           resolve(tensor);
//         };
//         img.onerror = reject;
//         img.src = imageData;
//       });
//     }

//     // If imageData is already an HTML element
//     return tf.browser.fromPixels(imageData);
//   }

//   async extractFaceEmbedding(face, tensor) {
//     const { topLeft, bottomRight } = face;

//     // Get face region
//     const [x1, y1] = topLeft;
//     const [x2, y2] = bottomRight;
//     const width = x2 - x1;
//     const height = y2 - y1;

//     // Add padding
//     const padding = Math.floor(Math.min(width, height) * 0.2);
//     const startX = Math.max(0, Math.floor(x1 - padding));
//     const startY = Math.max(0, Math.floor(y1 - padding));
//     const endX = Math.min(tensor.shape[1], Math.floor(x2 + padding));
//     const endY = Math.min(tensor.shape[0], Math.floor(y2 + padding));

//     // Extract face region
//     const faceTensor = tf.tidy(() => {
//       const face = tf.slice(
//         tensor,
//         [startY, startX, 0],
//         [endY - startY, endX - startX, 3]
//       );
//       // Resize to standard size
//       return tf.image.resizeBilinear(face, [112, 112]).div(255.0).expandDims(0);
//     });

//     // Get embedding from the model
//     const embedding = await this.model.predict(faceTensor).data();

//     // Cleanup
//     tf.dispose(faceTensor);

//     return Array.from(embedding);
//   }

//   async compareFaces(embedding1, embedding2, threshold = 0.6) {
//     const similarity = this.calculateCosineSimilarity(embedding1, embedding2);
//     return {
//       similarity,
//       match: similarity >= threshold,
//     };
//   }

//   calculateCosineSimilarity(embedding1, embedding2) {
//     if (embedding1.length !== embedding2.length) {
//       throw new Error("Embeddings must have the same length");
//     }

//     const dotProduct = embedding1.reduce((sum, value, index) => {
//       return sum + value * embedding2[index];
//     }, 0);

//     const magnitude1 = Math.sqrt(
//       embedding1.reduce((sum, value) => sum + value * value, 0)
//     );
//     const magnitude2 = Math.sqrt(
//       embedding2.reduce((sum, value) => sum + value * value, 0)
//     );

//     if (magnitude1 === 0 || magnitude2 === 0) {
//       return 0;
//     }

//     return dotProduct / (magnitude1 * magnitude2);
//   }

//   dispose() {
//     if (this.model) {
//       this.model.dispose();
//     }
//     this.initialized = false;
//   }
// }

// // Helper functions for image processing
// export const imageUtils = {
//   async loadImage(src) {
//     return new Promise((resolve, reject) => {
//       const img = new Image();
//       img.crossOrigin = "anonymous";
//       img.onload = () => resolve(img);
//       img.onerror = reject;
//       img.src = src;
//     });
//   },

//   async canvasToBase64(canvas) {
//     return canvas.toDataURL("image/jpeg", 0.9);
//   },

//   async base64ToImage(base64) {
//     return this.loadImage(base64);
//   },

//   createCanvas(width, height) {
//     const canvas = document.createElement("canvas");
//     canvas.width = width;
//     canvas.height = height;
//     return canvas;
//   },
// };

// // Create and export a singleton instance
// export const faceComparisonService = new FaceComparisonService();

// // Export constants for face comparison
// export const FACE_COMPARISON_CONSTANTS = {
//   MINIMUM_CONFIDENCE: 0.8,
//   SIMILARITY_THRESHOLD: 0.6,
//   FACE_SIZE: 112,
//   MAX_FACES: 1,
// };

// lib/faceComparison.js
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import * as faceapi from "@tensorflow-models/face-landmarks-detection";

export class FaceComparisonService {
  constructor() {
    this.detectionModel = null;
    this.recognitionModel = null;
    this.initialized = false;
    this.similarityThreshold = 0.6; // Adjust this threshold based on testing
  }

  async initialize() {
    if (!this.initialized) {
      await tf.ready();
      // Load both detection and recognition models
      this.detectionModel = await blazeface.load();
      this.recognitionModel = await faceapi.load({
        inputResolution: { width: 640, height: 480 },
        scale: 0.8,
      });
      this.initialized = true;
    }
  }

  async getFaceEmbedding(imageData) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Convert image to tensor
    const tensor = await this.imageToTensor(imageData);

    try {
      // Detect face location
      const faces = await this.detectionModel.estimateFaces(tensor, false);

      if (faces.length === 0) {
        throw new Error("No face detected in the image");
      }

      if (faces.length > 1) {
        throw new Error("Multiple faces detected in the image");
      }

      // Get face landmarks and embedding
      const detection = await this.recognitionModel
        .detectSingleFace(tensor)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error("Failed to extract face features");
      }

      // Convert descriptor to array
      const embedding = Array.from(detection.descriptor);

      return {
        embedding,
        landmarks: detection.landmarks,
        faceBox: faces[0],
      };
    } finally {
      tf.dispose(tensor);
    }
  }

  async imageToTensor(imageData) {
    // Handle different image input types
    if (typeof imageData === "string" && imageData.startsWith("data:image")) {
      // Base64 image
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(tf.browser.fromPixels(img));
        img.onerror = reject;
        img.src = imageData;
      });
    } else if (
      imageData instanceof HTMLImageElement ||
      imageData instanceof HTMLVideoElement ||
      imageData instanceof HTMLCanvasElement
    ) {
      // DOM element
      return tf.browser.fromPixels(imageData);
    } else {
      throw new Error("Unsupported image format");
    }
  }

  calculateSimilarity(embedding1, embedding2) {
    // Cosine similarity between two embeddings
    const dotProduct = embedding1.reduce((sum, value, index) => {
      return sum + value * embedding2[index];
    }, 0);

    const magnitude1 = Math.sqrt(
      embedding1.reduce((sum, value) => sum + value * value, 0)
    );
    const magnitude2 = Math.sqrt(
      embedding2.reduce((sum, value) => sum + value * value, 0)
    );

    return dotProduct / (magnitude1 * magnitude2);
  }

  async compareFaces(face1Data, face2Data) {
    try {
      // Get embeddings for both faces
      const face1 = await this.getFaceEmbedding(face1Data);
      const face2 = await this.getFaceEmbedding(face2Data);

      // Calculate similarity score
      const similarity = this.calculateSimilarity(
        face1.embedding,
        face2.embedding
      );

      return {
        match: similarity >= this.similarityThreshold,
        similarity,
        details: {
          face1Landmarks: face1.landmarks,
          face2Landmarks: face2.landmarks,
          face1Box: face1.faceBox,
          face2Box: face2.faceBox,
        },
      };
    } catch (error) {
      throw new Error(`Face comparison failed: ${error.message}`);
    }
  }

  async compareMultipleFaces(targetFace, registeredFaces) {
    try {
      // Get embedding for target face
      const targetEmbedding = await this.getFaceEmbedding(targetFace);

      // Compare with each registered face
      const results = await Promise.all(
        registeredFaces.map(async (regFace) => {
          try {
            const regEmbedding = await this.getFaceEmbedding(regFace.image);
            const similarity = this.calculateSimilarity(
              targetEmbedding.embedding,
              regEmbedding.embedding
            );

            return {
              timestamp: regFace.timestamp,
              similarity,
              match: similarity >= this.similarityThreshold,
            };
          } catch (error) {
            console.warn(`Skipping invalid registered face: ${error.message}`);
            return null;
          }
        })
      );

      // Filter out failed comparisons and sort by similarity
      const validResults = results
        .filter((result) => result !== null)
        .sort((a, b) => b.similarity - a.similarity);

      // Calculate overall match based on best matches
      const bestMatches = validResults.slice(0, 3); // Consider top 3 matches
      const averageSimilarity =
        bestMatches.reduce((sum, result) => sum + result.similarity, 0) /
        bestMatches.length;

      return {
        match: averageSimilarity >= this.similarityThreshold,
        similarity: averageSimilarity,
        details: {
          allMatches: validResults,
          bestMatch: validResults[0],
          targetLandmarks: targetEmbedding.landmarks,
        },
      };
    } catch (error) {
      throw new Error(`Multiple face comparison failed: ${error.message}`);
    }
  }

  async validateFaceImage(imageData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const tensor = await this.imageToTensor(imageData);

    try {
      // Check face detection
      const faces = await this.detectionModel.estimateFaces(tensor, false);

      if (faces.length === 0) {
        return {
          isValid: false,
          error: "No face detected",
        };
      }

      if (faces.length > 1) {
        return {
          isValid: false,
          error: "Multiple faces detected",
        };
      }

      // Check face quality
      const face = faces[0];
      const { width, height } = tensor.shape;

      // Check face size relative to image
      const faceWidth = face.bottomRight[0] - face.topLeft[0];
      const faceHeight = face.bottomRight[1] - face.topLeft[1];
      const faceRatio = (faceWidth * faceHeight) / (width * height);

      if (faceRatio < 0.1) {
        return {
          isValid: false,
          error: "Face too small in image",
        };
      }

      // Check if face is centered
      const centerX = (face.topLeft[0] + face.bottomRight[0]) / 2;
      const centerY = (face.topLeft[1] + face.bottomRight[1]) / 2;
      const offsetX = Math.abs(centerX - width / 2) / width;
      const offsetY = Math.abs(centerY - height / 2) / height;

      if (offsetX > 0.3 || offsetY > 0.3) {
        return {
          isValid: false,
          error: "Face not centered in image",
        };
      }

      return {
        isValid: true,
        faceDetails: {
          box: {
            topLeft: face.topLeft,
            bottomRight: face.bottomRight,
          },
          landmarks: face.landmarks,
          faceRatio,
          centerOffset: { x: offsetX, y: offsetY },
        },
      };
    } finally {
      tf.dispose(tensor);
    }
  }
}
