"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FaceRegistrationWizard from "@/components/FaceRegistrationWizard";

export default function FaceRegistrationPage() {
  const router = useRouter();

  const handleRegistrationComplete = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <FaceRegistrationWizard onComplete={handleRegistrationComplete} />
        </div>
      </div>
    </div>
  );
}
