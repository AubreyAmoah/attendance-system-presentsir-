// app/camera-test/page.js
"use client";

import CameraTest from "@/components/CameraTest";

export default function CameraTestPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Camera Test</h1>
      <CameraTest />
    </div>
  );
}
