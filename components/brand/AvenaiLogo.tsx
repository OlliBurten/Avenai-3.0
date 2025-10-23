"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "glyph" | "wordmark" | "lockup";

type Props = {
  variant?: Variant;
  className?: string;
  gradient?: boolean;
  title?: string;
};

export default function AvenaiLogo({
  variant = "lockup",
  className,
  gradient = false,
  title = "Avenai",
}: Props) {
  const gradId = React.useId();

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 250 70"
      className={cn(
        "block align-middle select-none",
        className
      )}
      shapeRendering="geometricPrecision"
      textRendering="optimizeLegibility"
      vectorEffect="non-scaling-stroke"
      focusable="false"
      style={{ transform: "translateZ(0)" }}
    >
      <title>{title}</title>

      <defs>
        <linearGradient id={`${gradId}-glyph1`} gradientUnits="userSpaceOnUse" x1="34.125" y1="54.2596" x2="23.6863" y2="31.2282">
          <stop offset="0" style={{ stopColor: gradient ? "#6D5EF9" : "currentColor" }} />
          <stop offset="1" style={{ stopColor: gradient ? "#A78BFA" : "currentColor" }} />
        </linearGradient>
        
        <linearGradient id={`${gradId}-glyph2`} gradientUnits="userSpaceOnUse" x1="46.9707" y1="48.4375" x2="36.532" y2="25.406">
          <stop offset="0" style={{ stopColor: gradient ? "#6D5EF9" : "currentColor" }} />
          <stop offset="1" style={{ stopColor: gradient ? "#A78BFA" : "currentColor" }} />
        </linearGradient>

        <linearGradient id={`${gradId}-a`} gradientUnits="userSpaceOnUse" x1="75.6508" y1="34.192" x2="244.7261" y2="34.192">
          <stop offset="0" style={{ stopColor: gradient ? "#A78BFA" : "currentColor" }} />
          <stop offset="1" style={{ stopColor: gradient ? "#6D5EF9" : "currentColor" }} />
        </linearGradient>
        
        <linearGradient id={`${gradId}-v`} gradientUnits="userSpaceOnUse" x1="75.6508" y1="34.964" x2="244.7261" y2="34.964">
          <stop offset="0" style={{ stopColor: gradient ? "#A78BFA" : "currentColor" }} />
          <stop offset="1" style={{ stopColor: gradient ? "#6D5EF9" : "currentColor" }} />
        </linearGradient>
        
        <linearGradient id={`${gradId}-e`} gradientUnits="userSpaceOnUse" x1="75.6508" y1="34.4854" x2="244.7261" y2="34.4854">
          <stop offset="0" style={{ stopColor: gradient ? "#A78BFA" : "currentColor" }} />
          <stop offset="1" style={{ stopColor: gradient ? "#6D5EF9" : "currentColor" }} />
        </linearGradient>
        
        <linearGradient id={`${gradId}-n`} gradientUnits="userSpaceOnUse" x1="75.6508" y1="34.7512" x2="244.7261" y2="34.7512">
          <stop offset="0" style={{ stopColor: gradient ? "#A78BFA" : "currentColor" }} />
          <stop offset="1" style={{ stopColor: gradient ? "#6D5EF9" : "currentColor" }} />
        </linearGradient>
        
        <linearGradient id={`${gradId}-a2`} gradientUnits="userSpaceOnUse" x1="75.6508" y1="34.964" x2="244.7261" y2="34.964">
          <stop offset="0" style={{ stopColor: gradient ? "#A78BFA" : "currentColor" }} />
          <stop offset="1" style={{ stopColor: gradient ? "#6D5EF9" : "currentColor" }} />
        </linearGradient>
        
        <linearGradient id={`${gradId}-i-rect`} gradientUnits="userSpaceOnUse" x1="75.6508" y1="11.8284" x2="244.7261" y2="11.8284">
          <stop offset="0" style={{ stopColor: gradient ? "#A78BFA" : "currentColor" }} />
          <stop offset="1" style={{ stopColor: gradient ? "#6D5EF9" : "currentColor" }} />
        </linearGradient>
        
        <linearGradient id={`${gradId}-i`} gradientUnits="userSpaceOnUse" x1="75.6508" y1="34.883" x2="244.7261" y2="34.883">
          <stop offset="0" style={{ stopColor: gradient ? "#A78BFA" : "currentColor" }} />
          <stop offset="1" style={{ stopColor: gradient ? "#6D5EF9" : "currentColor" }} />
        </linearGradient>
      </defs>

      {/* GLYPH (icon mark) - the "A" shape */}
      {variant !== "wordmark" && (
        <g>
          <g>
            <g>
              <g>
                <path fill={`url(#${gradId}-glyph1)`} d="M52.94,40.56H42.57l-8.29-16.57c-1.24-2.45-3.63-3.94-6.37-3.94c-2.76,0-5.13,1.48-6.37,3.94l-8.29,16.57
                  H2.89l10.37-20.71c2.78-5.59,8.41-9.07,14.65-9.07c6.25,0,11.87,3.48,14.65,9.07L52.94,40.56z"/>
              </g>
            </g>
            <g>
              <g>
                <path fill={`url(#${gradId}-glyph2)`} d="M63.32,40.56l-7.4,14.78
                  c-2.37,4.76-7.17,7.73-12.51,7.73c-0.02,0-0.02,0-0.02,0c-5.34,0-10.14-2.97-12.51-7.73l-7.4-14.78h10.39l5.3,10.61
                  c0.82,1.65,2.41,2.62,4.23,2.62h0.02c1.81,0,3.4-0.97,4.23-2.62l5.32-10.61H63.32z"/>
              </g>
            </g>
          </g>
        </g>
      )}

      {/* WORDMARK (text shapes) - "avenai" */}
      {variant !== "glyph" && (
        <g>
          <g>
            {/* "a" */}
            <path fill={`url(#${gradId}-a)`} d="M106.42,37.39
              c-0.78-1.17-1.27-2.56-1.36-4.07c-0.21-3.82-1.79-7.24-4.24-9.82c-0.38-0.4-0.78-0.78-1.19-1.13c-2.93-2.5-6.8-3.92-10.95-3.69
              c-8.57,0.48-15.12,7.82-14.64,16.38c0.48,8.57,7.82,15.12,16.38,14.64c4.15-0.23,7.83-2.08,10.47-4.89
              c-0.04-0.04-0.09-0.09-0.13-0.13c-1.83-1.92-3.17-4.24-3.94-6.75c-1.28,2.49-3.82,4.26-6.81,4.43c-4.5,0.25-8.37-3.2-8.62-7.7
              c-0.25-4.5,3.2-8.37,7.7-8.62c2.99-0.17,5.71,1.3,7.26,3.63c0.78,1.17,1.27,2.56,1.36,4.07c0.21,3.82,1.79,7.24,4.24,9.82
              c0.38,0.4,0.78,0.78,1.19,1.13c2.56,2.18,5.83,3.54,9.37,3.7l0.85-7.34C110.5,41.09,107.92,39.64,106.42,37.39z"/>
          </g>
          
          {/* "v" */}
          <path fill={`url(#${gradId}-v)`} d="M124.5,42.84l7.45-22.6h7.92l-10.9,29.46
            h-9.04l-10.85-29.46h7.98L124.5,42.84z"/>
          
          {/* "e" */}
          <path fill={`url(#${gradId}-e)`} d="M206.63,26.45
            c1.19-2.3,2.8-4.08,4.84-5.32c2.04-1.24,4.32-1.86,6.83-1.86c2.2,0,4.12,0.44,5.77,1.33c1.65,0.89,2.97,2,3.96,3.35v-4.2h7.5
            v29.46h-7.5v-4.31c-0.96,1.38-2.28,2.53-3.96,3.43c-1.68,0.9-3.63,1.36-5.82,1.36c-2.48,0-4.74-0.64-6.78-1.91
            c-2.04-1.28-3.65-3.08-4.84-5.4c-1.19-2.32-1.78-4.99-1.78-8C204.85,31.4,205.44,28.76,206.63,26.45z M226.97,29.83
            c-0.71-1.29-1.67-2.29-2.87-2.98c-1.21-0.69-2.5-1.04-3.88-1.04c-1.38,0-2.66,0.34-3.83,1.01c-1.17,0.67-2.12,1.66-2.85,2.95
            c-0.73,1.29-1.09,2.83-1.09,4.6c0,1.77,0.36,3.32,1.09,4.65c0.73,1.33,1.68,2.35,2.87,3.06c1.19,0.71,2.45,1.06,3.8,1.06
            c1.38,0,2.68-0.35,3.88-1.04c1.21-0.69,2.16-1.68,2.87-2.98c0.71-1.29,1.06-2.85,1.06-4.65
            C228.04,32.68,227.68,31.13,226.97,29.83z"/>
          
          {/* "n" */}
          <path fill={`url(#${gradId}-n)`} d="M198.17,23.13
            c2.16,2.22,3.24,5.31,3.24,9.28V49.7h-7.45V33.42c0-2.34-0.58-4.14-1.76-5.4c-1.17-1.26-2.77-1.89-4.79-1.89
            c-2.06,0-3.68,0.63-4.87,1.89c-1.19,1.26-1.78,3.06-1.78,5.4V49.7h-7.45V20.23h7.45v3.67c0.99-1.28,2.26-2.28,3.8-3
            c1.54-0.73,3.24-1.09,5.08-1.09C193.17,19.81,196.01,20.91,198.17,23.13z"/>
          
          {/* "a" (second one) */}
          <g>
            <rect x="239.66" y="20.23" fill={`url(#${gradId}-a2)`} width="7.45" height="29.46"/>
            <path fill={`url(#${gradId}-i-rect)`} d="M244.15,16.72h-4.49V6.94h7.45v6.83
              C247.11,15.4,245.78,16.72,244.15,16.72z"/>
          </g>
          
          {/* "i" (the "e" in the middle) */}
          <g>
            <g>
              <path fill={`url(#${gradId}-i)`} d="M139.08,34.77
                c0-8.89,6.8-14.95,15.68-14.95c8.72,0,15.4,6,15.12,16.7h-23.21c0.74,4.93,3.85,7.7,8.04,7.7c3.51,0,6.45-1.7,7.53-4.98h7.3
                c-1.53,6.34-7.25,10.7-15.06,10.7C145.88,49.94,139.08,43.77,139.08,34.77z M162.41,31.71c-0.74-4.19-3.79-6.34-7.59-6.34
                c-3.28,0-7.08,1.59-8.1,6.34H162.41z"/>
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}
