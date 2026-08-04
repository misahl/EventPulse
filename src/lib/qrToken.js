// src/lib/qrToken.js

/**
 * Generates a signed token for event attendance.
 * Payload format: studentId:eventId:timestamp
 * Signature: HMAC-SHA256 of payload using secret key.
 */
export async function generateToken(studentId, eventId, timestamp, secret = 'eventpulse-default-secret-key-12345') {
  const payload = `${studentId}:${eventId}:${timestamp}`;
  let signature = '';

  if (typeof window === 'undefined') {
    // Server-side: Use Node.js native crypto module dynamically
    const crypto = await import('crypto');
    signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  } else {
    // Client-side fallback (for mock demo mode in-browser)
    signature = mockHmac(payload, secret);
  }

  const encodedPayload = typeof window !== 'undefined' 
    ? window.btoa(payload) 
    : Buffer.from(payload).toString('base64');

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies a token and returns the parsed payload { studentId, eventId, timestamp }
 * If invalid or tampered, returns null.
 */
export async function verifyToken(token, secret = 'eventpulse-default-secret-key-12345') {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  let payload = '';

  try {
    payload = typeof window !== 'undefined'
      ? window.atob(encodedPayload)
      : Buffer.from(encodedPayload, 'base64').toString('utf8');
  } catch (e) {
    return null; // Invalid base64 encoding
  }

  let expectedSignature = '';
  if (typeof window === 'undefined') {
    const crypto = await import('crypto');
    expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  } else {
    expectedSignature = mockHmac(payload, secret);
  }

  if (signature !== expectedSignature) {
    return null; // Tampered token!
  }

  const [studentId, eventId, timestampStr] = payload.split(':');
  const timestamp = parseInt(timestampStr, 10);

  if (!studentId || !eventId || isNaN(timestamp)) {
    return null;
  }

  return { studentId, eventId, timestamp };
}

// Simple deterministic hash for browser fallback
function mockHmac(string, key) {
  let hash = 0;
  const combined = string + key;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'mock_' + Math.abs(hash).toString(16);
}

/**
 * Generates a rolling event QR token that rotates every TTL seconds (default 30s).
 * Payload format: eventId:timestampWindow:ttl
 */
export function generateRollingEventToken(eventId, secret = 'eventpulse-default-secret-key-12345', ttlSeconds = 30) {
  const currentWindow = Math.floor(Date.now() / (ttlSeconds * 1000));
  const payload = `${eventId}:${currentWindow}:${ttlSeconds}`;
  const signature = mockHmac(payload, secret);
  const encodedPayload = typeof window !== 'undefined'
    ? window.btoa(payload)
    : Buffer.from(payload).toString('base64');
  return `${encodedPayload}.${signature}`;
}

/**
 * Validates a scanned rolling event QR token against current and immediate previous window.
 * Returns { valid: boolean, eventId: string, error?: string }
 */
export function verifyRollingEventToken(token, secret = 'eventpulse-default-secret-key-12345', maxAllowedWindowsDelta = 1) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Invalid or empty QR code token.' };
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed QR code format.' };
  }

  const [encodedPayload, signature] = parts;
  let payload = '';
  try {
    payload = typeof window !== 'undefined'
      ? window.atob(encodedPayload)
      : Buffer.from(encodedPayload, 'base64').toString('utf8');
  } catch (e) {
    return { valid: false, error: 'Invalid base64 payload.' };
  }

  const expectedSignature = mockHmac(payload, secret);
  if (signature !== expectedSignature) {
    return { valid: false, error: 'Counterfeit or tampered QR code signature!' };
  }

  const [eventId, tokenWindowStr, ttlStr] = payload.split(':');
  const tokenWindow = parseInt(tokenWindowStr, 10);
  const ttlSeconds = parseInt(ttlStr, 10) || 30;

  if (!eventId || isNaN(tokenWindow)) {
    return { valid: false, error: 'Invalid event data inside token.' };
  }

  const currentWindow = Math.floor(Date.now() / (ttlSeconds * 1000));

  // Check if token window matches current window (or 1 window ago for network delays)
  if (Math.abs(currentWindow - tokenWindow) > maxAllowedWindowsDelta) {
    return {
      valid: false,
      eventId,
      error: 'Expired QR Code! Screenshots or shared old codes cannot be reused. Please scan the current live QR code on the organizer screen.'
    };
  }

  return { valid: true, eventId };
}
