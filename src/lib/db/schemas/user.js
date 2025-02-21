export const userSchema = {
  bsonType: "object",
  required: ["email", "name", "role"],
  properties: {
    email: {
      bsonType: "string",
      description: "Email address - required and unique",
    },
    name: {
      bsonType: "string",
      description: "Full name - required",
    },
    role: {
      enum: ["student", "lecturer"],
      description: "User role - must be either student or lecturer",
    },
    registeredFaceData: {
      bsonType: "string",
      description: "Face embedding data for verification",
    },
    faceRegisteredAt: {
      bsonType: "date",
      description: "Timestamp of face registration",
    },
  },
};

db.createCollection("users", {
  validator: {
    $jsonSchema: userSchema,
  },
});

db.users.createIndex({ email: 1 }, { unique: true });
