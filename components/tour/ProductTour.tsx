'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';
import TourSpotlight from '@/components/TourSpotlight';

type Step = {
  id: string;
  title: string;
  body: string;
  target: string; // CSS selector for the highlighted element
  placement?: 'top' | 'right' | 'bottom' | 'left';
};

type Props = {
  open: boolean;
  onClose: () => void;
  steps: Step[];
};

export default function ProductTour({ open, onClose, steps }: Props) {
  const [idx, setIdx] = useState(0);
  const portalRef = useRef<HTMLDivElement | null>(null);

  const step = steps[idx];
  const targetEl = typeof window !== 'undefined' ? document.querySelector(step?.target || '') as HTMLElement | null : null;

  // Track tour events
  useEffect(() => {
    if (open && idx === 0) {
      trackEvent(ANALYTICS_EVENTS.TOUR_STARTED, { stepCount: steps.length });
    }
  }, [open, idx, steps.length]);

  useEffect(() => {
    if (open && step) {
      trackEvent(ANALYTICS_EVENTS.TOUR_STEP, { 
        stepId: step.id, 
        stepIndex: idx, 
        stepTitle: step.title 
      });
    }
  }, [open, step, idx]);

  useEffect(() => {
    if (!open) return;
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    // center viewport on element
    if (targetEl) targetEl.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [open, idx, targetEl]);

  if (!open || !step) return null;

  // bounding box for spotlight
  const rect = targetEl?.getBoundingClientRect();

  const handleNext = () => {
    if (idx < steps.length - 1) {
      setIdx(idx + 1);
    } else {
      trackEvent(ANALYTICS_EVENTS.TOUR_COMPLETED, { stepCount: steps.length });
      onClose();
    }
  };

  const handleSkip = () => {
    trackEvent(ANALYTICS_EVENTS.TOUR_SKIPPED, { 
      stepIndex: idx, 
      stepId: step.id,
      stepCount: steps.length 
    });
    onClose();
  };

  return (
    <div ref={portalRef}>
      {/* Crisp spotlight with masked hole */}
      <TourSpotlight target={targetEl} />

      {/* card */}
      <div
        className={clsx(
          'fixed z-[10000] max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 p-5',
          rect ? positionFrom(rect, step.placement) : 'inset-x-0 mx-auto top-20'
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-8 w-8 rounded-md bg-indigo-50 text-indigo-600 grid place-items-center font-semibold">{idx + 1}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{step.body}</p>
            <div className="mt-4 flex items-center gap-2">
              <button
                className="text-sm px-3 py-2 rounded-md bg-white ring-1 ring-slate-200 hover:bg-slate-50"
                onClick={handleSkip}
              >
                Skip tour
              </button>
              <button
                className="text-sm px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 inline-flex items-center gap-1"
                onClick={handleNext}
              >
                {idx < steps.length - 1 ? 'Next' : 'Finish'} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <button className="p-1 text-slate-400 hover:text-slate-600" onClick={handleSkip} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function positionFrom(rect: DOMRect, placement: Step['placement'] = 'right') {
  const gap = 12;
  switch (placement) {
    case 'top':    return { left: rect.left, top: rect.top - 140 };
    case 'bottom': return { left: rect.left, top: rect.bottom + gap };
    case 'left':   return { left: Math.max(rect.left - 360, 16), top: rect.top };
    case 'right':
    default:       return { left: Math.min(rect.right + gap, window.innerWidth - 380), top: rect.top };
  }
}
