// src/hooks/useEvents.js
import { useState, useEffect } from 'react';
import { 
  fetchAllEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  subscribeToEvents 
} from '../firebase/firestore';
import { detectConflicts, suggestNextSlot } from '../lib/scheduling';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time events on mount
  useEffect(() => {
    setTimeout(() => setLoading(true), 0);
    const unsubscribe = subscribeToEvents((data) => {
      setEvents(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addEvent = async (eventData) => {
    // 1. Fetch approved events to check conflicts
    const approvedEvents = events.filter(e => e.status === 'approved');
    
    // 2. Perform Conflict Check
    const conflictResult = detectConflicts(eventData, approvedEvents);
    
    // 3. Create Event in Database (initially pending)
    const newEvent = await createEvent(eventData);

    return {
      event: newEvent,
      conflictResult,
      suggestedSlot: conflictResult.hasConflict ? suggestNextSlot(eventData, approvedEvents) : null
    };
  };

  const approveRejectEvent = async (eventId, status, facultyInCharge = '') => {
    const fields = { status };
    if (facultyInCharge) {
      fields.facultyInCharge = facultyInCharge;
    }
    return await updateEvent(eventId, fields);
  };

  const removeEvent = async (eventId) => {
    return await deleteEvent(eventId);
  };

  const getConflictWarning = (newEventData) => {
    const approvedEvents = events.filter(e => e.status === 'approved' && e.id !== newEventData.id);
    const conflictResult = detectConflicts(newEventData, approvedEvents);
    const suggestedSlot = conflictResult.hasConflict ? suggestNextSlot(newEventData, approvedEvents) : null;
    
    return {
      ...conflictResult,
      suggestedSlot
    };
  };

  return {
    events,
    loading,
    addEvent,
    approveRejectEvent,
    removeEvent,
    getConflictWarning,
  };
}
