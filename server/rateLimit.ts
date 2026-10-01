/**
 * Best-effort, in-memory, per-instance sliding-window rate limiter.
 * It blunts casual abuse (report spam, proof flooding) without storing IP
 * addresses anywhere durable. A production deployment would add an edge
 * rate limit or WAF rule in front of it.
 */
export interface RateLimiter {
  /** Returns true when the call is allowed. */
  allow(bucket: string, key: string, limit: number, windowMs?: number): boolean;
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  allow(bucket: string, key: string, limit: number, windowMs = 60_000): boolean {
    const id = `${bucket}:${key}`;
    const t = this.now();
    const recent = (this.hits.get(id) ?? []).filter((at) => t - at < windowMs);
    if (recent.length >= limit) {
      this.hits.set(id, recent);
      return false;
    }
    recent.push(t);
    this.hits.set(id, recent);
    if (this.hits.size > 10_000) this.hits.clear(); // bounded memory
    return true;
  }
}

export const RATE_LIMITS = {
  check: 60,
  report: 10,
  proofCreate: 10,
  proofRead: 120,
  transaction: 60,
} as const;
