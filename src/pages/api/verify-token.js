// src/pages/api/verify-token.js
import { verifyToken } from '../../lib/qrToken';
import { isMock } from '../../firebase/config';

// Server-side secret key (should match the one used to sign)
const SECRET = process.env.TOKEN_SECRET || 'eventpulse-default-secret-key-12345';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { studentId, eventId, qrToken } = req.body;

  if (!studentId || !eventId || !qrToken) {
    return res.status(400).json({ error: 'Missing required parameters: studentId, eventId, or qrToken' });
  }

  try {
    // 1. Verify cryptographic token authenticity
    const payload = await verifyToken(qrToken, SECRET);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid or tampered QR attendance token signature' });
    }

    // 2. Validate token contents match the scanned request
    if (payload.studentId !== studentId || payload.eventId !== eventId) {
      return res.status(400).json({ error: 'Token payload mismatch. Scanned student/event does not match signed token.' });
    }

    // 3. Check for expiration (e.g. token is valid for 5 minutes only to prevent photocopy/sharing)
    const tokenTime = payload.timestamp;
    const currentTime = Date.now();
    const expiryWindowMs = 10 * 60 * 1000; // 10 minutes validation window

    if (currentTime - tokenTime > expiryWindowMs) {
      return res.status(403).json({ error: 'QR Code has expired. Please refresh the QR code.' });
    }

    if (isMock) {
      // In Mock Mode, return verified status. The client-side hook will complete the mock transaction.
      return res.status(200).json({ 
        success: true, 
        verified: true, 
        mockMode: true,
        message: 'Cryptographic signature verified on server. Processing mock check-in...',
        payload 
      });
    }

    // REAL FIREBASE: Run the Firestore transactional check-in on the server side
    const admin = require('firebase-admin');
    
    // Initialize Admin SDK if not already done
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault() // or credentials from env
      });
    }

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
        if (eventData.currentOccupancy >= eventData.capacity) {
          throw new Error('Event capacity is full');
        }

        const eventStart = new Date(eventData.startTime);
        const gracePeriodMs = 15 * 60 * 1000;
        const isLate = now.getTime() > (eventStart.getTime() + gracePeriodMs);

        updatedReg = {
          status: isLate ? 'late' : 'checkedIn',
          checkInTime: now.toISOString()
        };
        updatedEvent = {
          currentOccupancy: eventData.currentOccupancy + 1
        };
        action = isLate ? 'Checked in late' : 'Checked in successfully';
      } else if (regData.status === 'checkedIn' || regData.status === 'late') {
        updatedReg = {
          status: 'checkedOut',
          checkOutTime: now.toISOString()
        };
        updatedEvent = {
          currentOccupancy: Math.max(0, eventData.currentOccupancy - 1)
        };
        action = 'Checked out successfully';
      } else {
        throw new Error('Student is already checked out');
      }

      transaction.update(regRef, updatedReg);
      transaction.update(eventRef, updatedEvent);

      return { 
        action, 
        reg: { ...regData, ...updatedReg }, 
        event: { ...eventData, ...updatedEvent } 
      };
    });

    return res.status(200).json({ 
      success: true, 
      verified: true, 
      action: result.action,
      reg: result.reg,
      event: result.event
    });

  } catch (error) {
    console.error("API Token verification error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
