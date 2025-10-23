'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export default function DashboardGate() {
  const { update } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    // write into JWT via NextAuth update callback
    update({ onboardingCompleted: true }).finally(() => {
      // clear client bypass cookie
      document.cookie = 'av_onb=; Path=/; Max-Age=0; SameSite=Lax';
    });
  }, [update]);

  return null;
}
