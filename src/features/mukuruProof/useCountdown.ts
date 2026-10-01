import { useEffect, useState } from 'react';

/** Seconds left until `expiresAt`, corrected by the server/client clock offset. */
export function useCountdown(expiresAt: string | null, serverOffsetMs = 0): number {
  const compute = () => (expiresAt ? Math.max(0, Math.ceil((Date.parse(expiresAt) - (Date.now() + serverOffsetMs)) / 1000)) : 0);
  const [left, setLeft] = useState(compute);
  useEffect(() => {
    setLeft(compute());
    if (!expiresAt) return;
    const id = window.setInterval(() => setLeft(compute()), 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- compute closes over the two inputs below
  }, [expiresAt, serverOffsetMs]);
  return left;
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
