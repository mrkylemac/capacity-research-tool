"use client";

import { useEffect, useRef, useState } from 'react';

// ── Session count ticker (lightweight number animation, no deps) ─────────────

export function SessionTicker({ count }: { count: number }) {
  const [displayed, setDisplayed] = useState(0);
  const displayedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (count <= displayedRef.current) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const target = count;
    const STEP = 10;
    const diff = target - displayedRef.current;
    const frames = Math.max(10, Math.ceil(diff / STEP));
    const delay = Math.max(16, Math.round(300 / frames));

    timerRef.current = setInterval(() => {
      const next = displayedRef.current + STEP;
      if (next >= target) {
        displayedRef.current = target;
        setDisplayed(target);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        displayedRef.current = next;
        setDisplayed(next);
      }
    }, delay);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count]);

  return <>{displayed.toLocaleString()}</>;
}
