'use client';
import { signOut } from 'next-auth/react';

export default function SignOutButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/auth/signin' })}
      className={className}
      aria-label="Sign out"
    >
      Sign Out
    </button>
  );
}
