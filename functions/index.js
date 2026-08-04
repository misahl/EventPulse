// functions/index.js
// Firebase Cloud Functions — EventPulse API Routes
// Migrated from Next.js pages/api/*

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (automatically uses project credentials in Cloud Functions)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Define secrets (set via: firebase functions:secrets:set TOKEN_SECRET)
const TOKEN_SECRET = defineSecret('TOKEN_SECRET');
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers (inlined from src/lib/qrToken.js — no ESM imports in CJS)
// ─────────────────────────────────────────────────────────────────────────────

async function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  let payload = '';
  try {
    payload = Buffer.from(encodedPayload, 'base64').toString('utf8');
  } catch {
    return null;
  }

  const crypto = require('crypto');
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (signature !== expectedSignature) return null;

  const [studentId, eventId, timestampStr] = payload.split(':');
  const timestamp = parseInt(timestampStr, 10);
  if (!studentId || !eventId || isNaN(timestamp)) return null;

  return { studentId, eventId, timestamp };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/send-otp
// ─────────────────────────────────────────────────────────────────────────────
exports.sendOtp = onRequest(
  { secrets: [RESEND_API_KEY], cors: true },
  async (req, res) => {
    // CORS preflight
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
      return res.status(400).json({ error: 'Missing required parameters: email or otpCode' });
    }

    const resendApiKey = RESEND_API_KEY.value();

    if (!resendApiKey) {
      const logMsg = `\n=======================================================\n[MOCK MAILER] ✉️ Simulated OTP email for ${email}\nVerification Code: ${otpCode}\n=======================================================\n`;
      console.log(logMsg);
      return res.status(200).json({
        success: true,
        emailSent: false,
        fallback: true,
        message: 'Email service credentials not configured. OTP code logged to server console.'
      });
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'EventPulse <onboarding@resend.dev>',
          to: email,
          subject: 'EventPulse — 6-Digit Account Verification OTP',
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 20px auto; padding: 30px; background-color: #0d121e; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); color: #f8fafc; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #a78bfa; margin: 0; font-size: 24px; letter-spacing: -0.5px;">EventPulse</h2>
                <span style="font-size: 11px; color: #64748b; font-family: monospace;">CAMPUS EVENT MANAGEMENT</span>
              </div>
              <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin-bottom: 20px;" />
              <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1;">Hello,</p>
              <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1;">Thank you for registering on EventPulse. Use the following 6-digit OTP to verify your account:</p>
              <div style="font-size: 36px; font-weight: bold; text-align: center; letter-spacing: 6px; margin: 25px 0; color: #34d399; padding: 15px; background-color: #020617; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); font-family: monospace;">
                ${otpCode}
              </div>
              <p style="font-size: 13px; line-height: 1.5; color: #94a3b8;">This code expires shortly. If you did not create an account, ignore this email.</p>
            </div>
          `,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Resend API request failed');

      console.log(`[MAILER] ✉️ OTP email sent to ${email} (ID: ${result.id})`);
      return res.status(200).json({ success: true, emailSent: true, fallback: false, message: 'OTP email sent successfully!' });
    } catch (error) {
      console.error('Mailer Error:', error);
      return res.status(500).json({ error: 'Failed to send verification email', details: error.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/verify-token
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyTokenFn = onRequest(
  { secrets: [TOKEN_SECRET], cors: true },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { studentId, eventId, qrToken } = req.body;
    if (!studentId || !eventId || !qrToken) {
      return res.status(400).json({ error: 'Missing required parameters: studentId, eventId, or qrToken' });
    }

    const SECRET = TOKEN_SECRET.value() || 'eventpulse-default-secret-key-12345';

    try {
      const payload = await verifyToken(qrToken, SECRET);
      if (!payload) {
        return res.status(401).json({ error: 'Invalid or tampered QR attendance token signature' });
      }

      if (payload.studentId !== studentId || payload.eventId !== eventId) {
        return res.status(400).json({ error: 'Token payload mismatch. Scanned student/event does not match signed token.' });
      }

      const expiryWindowMs = 10 * 60 * 1000; // 10 minutes
      if (Date.now() - payload.timestamp > expiryWindowMs) {
        return res.status(403).json({ error: 'QR Code has expired. Please refresh the QR code.' });
      }

      // Firestore transactional check-in/check-out
      const firestore = admin.firestore();
      const eventRef = firestore.collection('events').doc(eventId);
      const regRef = firestore.collection('registrations').doc(`reg_${studentId}_${eventId}`);

      const result = await firestore.runTransaction(async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        const regDoc = await transaction.get(regRef);

        if (!eventDoc.exists) throw new Error('Event does not exist');
        if (!regDoc.exists) throw new Error('Student is not registered for this event');

        const eventData = eventDoc.data();
        const regData = regDoc.data();
        const now = new Date();
        let updatedReg = {};
        let updatedEvent = {};
        let action = '';

        if (regData.status === 'registered') {
          if (eventData.currentOccupancy >= eventData.capacity) throw new Error('Event capacity is full');
          const eventStart = new Date(eventData.startTime);
          const isLate = now.getTime() > (eventStart.getTime() + 15 * 60 * 1000);
          updatedReg = { status: isLate ? 'late' : 'checkedIn', checkInTime: now.toISOString() };
          updatedEvent = { currentOccupancy: eventData.currentOccupancy + 1 };
          action = isLate ? 'Checked in late' : 'Checked in successfully';
        } else if (regData.status === 'checkedIn' || regData.status === 'late') {
          updatedReg = { status: 'checkedOut', checkOutTime: now.toISOString() };
          updatedEvent = { currentOccupancy: Math.max(0, eventData.currentOccupancy - 1) };
          action = 'Checked out successfully';
        } else {
          throw new Error('Student is already checked out');
        }

        transaction.update(regRef, updatedReg);
        transaction.update(eventRef, updatedEvent);
        return { action, reg: { ...regData, ...updatedReg }, event: { ...eventData, ...updatedEvent } };
      });

      return res.status(200).json({ success: true, verified: true, action: result.action, reg: result.reg, event: result.event });
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/active-redirect
// ─────────────────────────────────────────────────────────────────────────────
exports.activeRedirect = onRequest({ cors: false }, async (req, res) => {
  try {
    return res.redirect(302, '/?resolveActive=true');
  } catch (error) {
    console.error('Active redirect error:', error);
    return res.redirect(302, '/?errorRedirect=true');
  }
});
