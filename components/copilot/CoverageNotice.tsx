"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, Info, Lock } from "lucide-react";

interface CoverageNoticeProps {
  metadata?: {
    outOfScope?: boolean;
    docsReferenced?: string[];
    partialCoverage?: boolean;
    policyRefusal?: boolean;
    coveredDoc?: string; // Which doc provided the answer
    missingTopic?: string; // What topic is missing
  };
  showCoverageNotices?: boolean;
}

export default function CoverageNotice({ metadata, showCoverageNotices = true }: CoverageNoticeProps) {
  const [opacity, setOpacity] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  // Determine if we should show the notice
  const shouldShow = showCoverageNotices && metadata && (
    metadata.outOfScope === true ||
    (metadata.docsReferenced && metadata.docsReferenced.length === 0) ||
    metadata.partialCoverage === true ||
    metadata.policyRefusal === true
  );

  // Determine the notice type and content
  const getNoticeContent = () => {
    if (!metadata) return null;

    if (metadata.policyRefusal) {
      return {
        icon: <Lock size={12} className="text-indigo-500" />,
        text: "I can't help with that request.",
        reason: "policy" as const
      };
    }

    if (metadata.outOfScope) {
      return {
        icon: <AlertTriangle size={12} className="text-indigo-500" />,
        text: "This question isn't covered by your uploaded documentation.",
        reason: "out_of_scope" as const
      };
    }

    if (metadata.docsReferenced && metadata.docsReferenced.length === 0) {
      return {
        icon: <Info size={12} className="text-indigo-500" />,
        text: "No indexed documents yet. Upload or finish indexing to improve answers.",
        reason: "no_docs" as const
      };
    }

    if (metadata.partialCoverage) {
      // Enhanced partial coverage message with specific doc and missing topic
      const coveredDoc = metadata.coveredDoc ? metadata.coveredDoc.substring(0, 30) : "available docs";
      const missingTopic = metadata.missingTopic || "some topics";
      
      return {
        icon: <Info size={12} className="text-indigo-500" />,
        text: `Covered from ${coveredDoc} but missing ${missingTopic} — consider adding related docs.`,
        reason: "partial" as const
      };
    }

    return null;
  };

  // Auto-fade effect
  useEffect(() => {
    if (!shouldShow) return;

    const timer = setTimeout(() => {
      if (!isHovered) {
        setOpacity(0.6);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [shouldShow, isHovered]);

  // Reset opacity on hover
  useEffect(() => {
    if (isHovered) {
      setOpacity(1);
    }
  }, [isHovered]);

  const noticeContent = getNoticeContent();

  if (!shouldShow || !noticeContent) {
    return null;
  }

  // Log telemetry
  useEffect(() => {
    if (noticeContent) {
      console.log('Coverage notice shown:', {
        coverageNoticeShown: true,
        reason: noticeContent.reason,
        docsReferencedCount: metadata?.docsReferenced?.length || 0
      });
    }
  }, [noticeContent, metadata]);

  return (
    <div
      className="text-[13px] text-gray-500 italic flex items-center gap-1 mb-2 transition-opacity duration-300"
      style={{ opacity }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="status"
      aria-live="polite"
    >
      {noticeContent.icon}
      <span>{noticeContent.text}</span>
    </div>
  );
}
