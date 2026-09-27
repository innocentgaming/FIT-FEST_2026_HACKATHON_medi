/**
 * In-Memory Sliding Window Rate Limiter Middleware
 * Protects critical endpoints: /login, /patient/register, /requests, /admin/reset-demo
 */

function createRateLimiter({
  windowMs = 60 * 1000,
  maxRequests = 60,
  message = 'Too many requests. Please try again later.',
  statusCode = 429,
  keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || 'global'
}) {
  const requestHits = new Map();

  return (req, res, next) => {
    // Skip rate limiting if explicitly bypassed for test suites via header or test flag
    if (req.headers['x-bypass-rate-limit'] === 'test-bypass-key') {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    const timestamps = requestHits.get(key) || [];

    // Filter timestamps within the current window
    const windowStart = now - windowMs;
    const validTimestamps = timestamps.filter((t) => t > windowStart);

    if (validTimestamps.length >= maxRequests) {
      const oldest = validTimestamps[0];
      const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(statusCode).json({
        error: message,
        retryAfterSeconds
      });
    }

    validTimestamps.push(now);
    requestHits.set(key, validTimestamps);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - validTimestamps.length));

    // Cleanup expired keys periodically
    if (requestHits.size > 1000) {
      for (const [k, ts] of requestHits.entries()) {
        const active = ts.filter((t) => t > windowStart);
        if (active.length === 0) {
          requestHits.delete(k);
        } else {
          requestHits.set(k, active);
        }
      }
    }

    next();
  };
}

// 1. Auth Rate Limiter (Login & Register: 30 requests per minute)
const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many authentication attempts. Please wait 1 minute before trying again.'
});

// 2. Emergency Creation Limiter (60 requests per minute per client)
const emergencyLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Emergency request rate limit exceeded. Please wait a moment.'
});

// 3. Admin Reset Limiter (5 requests per 5 minutes)
const adminResetLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 5,
  message: 'Database reset rate limit exceeded. Reset is restricted to 5 attempts per 5 minutes.'
});

// 4. Telemetry Stream Limiter (120 updates per minute)
const telemetryLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Telemetry streaming rate limit exceeded.'
});

module.exports = {
  createRateLimiter,
  authLimiter,
  emergencyLimiter,
  adminResetLimiter,
  telemetryLimiter
};
