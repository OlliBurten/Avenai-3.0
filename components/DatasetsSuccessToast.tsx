"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Upload, Database } from "lucide-react";

export default function DatasetsSuccessToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const created = searchParams.get('created');
    const sample = searchParams.get('sample');

    if (created || sample) {
      const message = created 
        ? "Dataset created successfully! Upload documents to get started."
        : "Sample dataset loaded! You can now explore AI-powered insights.";
      
      // Create and show toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg p-4 shadow-lg flex items-center';
      toast.innerHTML = `
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-full mr-3">
            <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <div>
            <p class="font-medium text-gray-900">Success!</p>
            <p class="text-sm text-gray-600">${message}</p>
          </div>
        </div>
      `;

      document.body.appendChild(toast);

      // Remove toast after 5 seconds
      setTimeout(() => {
        toast.remove();
      }, 5000);

      // Clean up URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete(created ? 'created' : 'sample');
      window.history.replaceState({}, '', url.pathname);
    }
  }, [searchParams]);

  return null;
}
