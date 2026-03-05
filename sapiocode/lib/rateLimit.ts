/**
 * Simple in-memory rate limiter (token-bucket style).
 * Each IP gets a bucket that refills at `refillRate` tokens per second,
 * up to `maxTokens`. Each request consumes one token.
 */

interface Bucket {
    tokens: number;
    lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
    key: string,
    maxTokens: number,
    refillRatePerSecond: number
): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket) {
        bucket = { tokens: maxTokens, lastRefill: now };
        buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRatePerSecond);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { allowed: true, retryAfterMs: 0 };
    }

    // Calculate when next token will be available
    const deficit = 1 - bucket.tokens;
    const retryAfterMs = Math.ceil((deficit / refillRatePerSecond) * 1000);
    return { allowed: false, retryAfterMs };
}

// Periodic cleanup of stale buckets (every 5 minutes)
setInterval(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [key, bucket] of buckets.entries()) {
        if (bucket.lastRefill < fiveMinutesAgo) {
            buckets.delete(key);
        }
    }
}, 5 * 60 * 1000);
