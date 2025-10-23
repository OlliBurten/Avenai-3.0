'use client';

import { useEffect, useState } from 'react';

const TOUR_COOKIE = 'avenai_tour_seen';

// Cookie utilities
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;sameSite=Lax`;
}

export function useDashboardTour() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const sp = new URLSearchParams(window.location.search);
    const force = sp.get('tour') === '1';
    const tourSeen = getCookie(TOUR_COOKIE) === '1';
    
    // Show tour if forced or if user hasn't seen it
    if (force || !tourSeen) {
      setOpen(true);
    }
  }, []);

  function close() {
    setCookie(TOUR_COOKIE, '1', 365); // Mark as seen for 1 year
    setOpen(false);
  }

  function replay() {
    setCookie(TOUR_COOKIE, '0', 0); // Clear the cookie
    setOpen(true);
  }

  return { open, close, replay };
}
