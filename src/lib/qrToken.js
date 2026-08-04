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
