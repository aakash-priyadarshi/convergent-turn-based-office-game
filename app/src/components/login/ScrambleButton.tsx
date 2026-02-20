'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

/**
 * Button that runs a "decrypting…" text-scramble effect on click,
 * then calls `onComplete`.
 */
export default function ScrambleButton({
  label,
  loadingLabel,
  loading,
  disabled,
  type = 'submit',
}: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  disabled?: boolean;
  type?: 'submit' | 'button';
}) {
  const [display, setDisplay] = useState(label);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scramble = useCallback(() => {
    let tick = 0;
    const target = loadingLabel;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplay(
        target
          .split('')
          .map((ch, i) =>
            i < tick ? ch : CHARS[Math.floor(Math.random() * CHARS.length)]
          )
          .join('')
      );
      tick++;
      if (tick > target.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 40);
  }, [loadingLabel]);

  useEffect(() => {
    if (loading) {
      scramble();
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplay(label);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading, label, scramble]);

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className="group relative w-full overflow-hidden rounded-lg bg-blue-600 py-3.5 font-mono font-bold tracking-wider text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      <span className="relative z-10">{display}</span>
      {/* Shimmer sweep */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700" />
    </button>
  );
}
