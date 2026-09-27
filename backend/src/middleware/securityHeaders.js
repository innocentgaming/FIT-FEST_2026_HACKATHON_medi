/**
 * HTTP Security Headers Middleware
 * Implements CSP, X-Content-Type-Options, Referrer-Policy, Frame-Options, HSTS, Permissions-Policy
 */

function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'DENY');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Cross-Origin Resource Policy & Embedder Policy
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Permissions Policy (Limit sensitive browser APIs)
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  // Content Security Policy (Allows necessary Google Fonts, Icons, and WebSockets)
  const cspPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https: wss: ws:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspPolicy);

  // Strict-Transport-Security for production HTTPS
  if (process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}

module.exports = { securityHeaders };
