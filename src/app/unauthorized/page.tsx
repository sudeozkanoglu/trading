"use client";

import { useRouter } from "next/navigation";
import { Lock, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-center p-8">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-10 shadow-lg max-w-md">
        <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">
          Unauthorized Access
        </h1>
        <p className="text-gray-400 mb-6">
          You do not have permission to access this page.
        </p>

        <button
          onClick={() => router.push("/home")}
          className="flex items-center justify-center w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-2 px-4 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </button>
      </div>
    </div>
  );
}