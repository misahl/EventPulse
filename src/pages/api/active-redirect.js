// src/pages/api/active-redirect.js
import { isMock } from '../../firebase/config';

export default async function handler(req, res) {
  try {
    let activeEvent = null;
    const nowMs = Date.now();

    if (isMock) {
      // In Mock Mode, fetch from localStorage (simulated here via a mock API check or server-side memory)
      // Since server API doesn't have access to browser localStorage, we can look up from a mock array
      // of events we might have generated, or redirect to a landing page route that does the redirect client-side!
      // This is a robust fallback: redirect to '/' with a query parameter like `resolveActive=true`
      // so the client-side landing page, which DOES have access to localStorage, can find the active event and open the register modal!
      return res.redirect(302, '/?resolveActive=true');
    }

    // REAL FIREBASE: Query active approved events directly on the server
    const admin = require('firebase-admin');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }

    const firestore = admin.firestore();
    const snapshot = await firestore
      .collection('events')
      .where('status', '==', 'approved')
      .get();

    const events = [];
    snapshot.forEach(doc => {
      events.push(doc.data());
    });

    // Find the event whose time window contains "now", or the one starting soonest
    const activeEvents = events.filter(e => {
      const start = new Date(e.startTime).getTime();
      const end = new Date(e.endTime).getTime();
      return nowMs >= start && nowMs <= end;
    });

    if (activeEvents.length > 0) {
      // Return the first active event
      activeEvent = activeEvents[0];
    } else {
      // If none active right now, find the upcoming approved event that starts soonest
      const upcoming = events
        .filter(e => new Date(e.startTime).getTime() > nowMs)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      if (upcoming.length > 0) {
        activeEvent = upcoming[0];
      }
    }

    if (activeEvent) {
      // Redirect to the landing page with the registration modal open for the active event
      return res.redirect(302, `/?registerEvent=${activeEvent.id}`);
    } else {
      // Redirect to main page with a notification query param
      return res.redirect(302, '/?noActiveEvent=true');
    }

  } catch (error) {
    console.error("Active redirect error:", error);
    // Redirect to home page on error
    return res.redirect(302, '/?errorRedirect=true');
  }
}
