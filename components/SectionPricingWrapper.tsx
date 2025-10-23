import { Suspense } from "react";
import SectionPricing from "./SectionPricing";

function LoadingSkeleton() {
  return (
    <section id="pricing" className="scroll-mt-24 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <div className="h-8 bg-gray-200 rounded w-96 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mx-auto mb-6"></div>
          <div className="h-10 bg-gray-200 rounded-full w-48 mx-auto"></div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-64 bg-gray-200 rounded-2xl"></div>
          <div className="h-64 bg-gray-200 rounded-2xl"></div>
        </div>
        <div className="mt-12 h-96 bg-gray-200 rounded-2xl"></div>
        <div className="mt-12 h-64 bg-gray-200 rounded-2xl"></div>
      </div>
    </section>
  );
}

export default function SectionPricingWrapper() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SectionPricing />
    </Suspense>
  );
}
