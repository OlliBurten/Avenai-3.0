// app/(components)/copilot/ConfidenceBadge.tsx
import React from "react";
import clsx from "clsx";

type Props = {
  topScore: number;          // 0..1 similarity
  scoreGap: number;          // top1 - median(top5)
  uniqueSections: number;    // distinct sectionPath in selected contexts
  confidenceLevel?: 'high' | 'medium' | 'low';  // Server-determined confidence (takes precedence)
};

function computeLevel(topScore: number, scoreGap: number, uniqueSections: number): 'high' | 'medium' | 'low' {
  // Tunable thresholds; aligned with fallback logic
  if (topScore >= 0.22 && scoreGap >= 0.06 && uniqueSections >= 3) return "high";
  if (topScore >= 0.14 && scoreGap >= 0.04 && uniqueSections >= 2) return "medium";
  return "low";
}

export const ConfidenceBadge: React.FC<Props> = ({ topScore, scoreGap, uniqueSections, confidenceLevel }) => {
  // Prefer server-determined confidence, fallback to computed level
  const level = confidenceLevel || computeLevel(topScore, scoreGap, uniqueSections);
  const label = level === "high" ? "High" : level === "medium" ? "Medium" : "Low";

  return (
    <span
      title={`Confidence • score=${topScore.toFixed(2)} gap=${scoreGap.toFixed(2)} sections=${uniqueSections}`}
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        level === "high" && "bg-emerald-100 text-emerald-800",
        level === "medium" && "bg-amber-100 text-amber-800",
        level === "low" && "bg-rose-100 text-rose-800"
      )}
    >
      Confidence: {label}
    </span>
  );
};

