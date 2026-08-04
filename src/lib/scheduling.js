// src/lib/scheduling.js

/**
 * A basic Priority Queue implementation using a sorted array.
 * Keeps elements ordered by their priority value (ascending order).
 * Good for Priority Queue showcase in DSA.
 */
export class PriorityQueue {
  constructor(comparator = (a, b) => a.priority - b.priority) {
    this.elements = [];
    this.comparator = comparator;
  }

  push(element) {
    this.elements.push(element);
    this.elements.sort(this.comparator);
  }

  pop() {
    return this.elements.shift();
  }

  peek() {
    return this.elements[0];
  }

  size() {
    return this.elements.length;
  }

  isEmpty() {
    return this.elements.length === 0;
  }
}

/**
 * Checks if two events overlap in time.
 * Overlap condition: StartA < EndB AND StartB < EndA
 */
export function areOverlapping(eventA, eventB) {
  const startA = new Date(eventA.startTime).getTime();
  const endA = new Date(eventA.endTime).getTime();
  const startB = new Date(eventB.startTime).getTime();
  const endB = new Date(eventB.endTime).getTime();

  return startA < endB && startB < endA;
}

/**
 * Detects all conflicting events from a list of existing approved events
 * that share resources with the new event.
 * Shared resources check: venue, facultyInCharge, or overlapping equipment.
 */
export function detectConflicts(newEvent, existingApprovedEvents) {
  const conflicts = [];
  const resources = {
    venue: false,
    faculty: false,
    equipment: false,
  };

  const newStart = new Date(newEvent.startTime).getTime();
  const newEnd = new Date(newEvent.endTime).getTime();
  
  if (isNaN(newStart) || isNaN(newEnd) || newStart >= newEnd) {
    return { conflicts: [], resources };
  }

  for (const event of existingApprovedEvents) {
    // Skip checking itself if editing
    if (event.id === newEvent.id) continue;

    const overlap = areOverlapping(newEvent, event);
    if (!overlap) continue;

    let conflictFound = false;

    // Check Venue Conflict
    if (newEvent.venue && event.venue && newEvent.venue.toLowerCase().trim() === event.venue.toLowerCase().trim()) {
      resources.venue = true;
      conflictFound = true;
    }

    // Check Faculty Conflict
    if (newEvent.facultyInCharge && event.facultyInCharge && 
        newEvent.facultyInCharge.toLowerCase().trim() === event.facultyInCharge.toLowerCase().trim()) {
      resources.faculty = true;
      conflictFound = true;
    }

    // Check Equipment Conflict (if array of tags exists)
    if (newEvent.equipment && event.equipment && Array.isArray(newEvent.equipment) && Array.isArray(event.equipment)) {
      const commonEquipment = newEvent.equipment.filter(e => event.equipment.includes(e));
      if (commonEquipment.length > 0) {
        resources.equipment = true;
        conflictFound = true;
      }
    }

    if (conflictFound) {
      conflicts.push(event);
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    resources,
  };
}

/**
 * Suggests the next available conflict-free time slot for the new event's resources
 * using a Priority Queue ordered by earliest event end time.
 * Finds a gap of the same duration as the new event.
 */
export function suggestNextSlot(newEvent, existingApprovedEvents, searchLimitDays = 7) {
  const duration = new Date(newEvent.endTime).getTime() - new Date(newEvent.startTime).getTime();
  if (duration <= 0) return null;

  // Filter existing events that share the same venue, faculty, or equipment
  const resourceSpecificEvents = existingApprovedEvents.filter(event => {
    if (event.id === newEvent.id) return false;
    
    const venueMatch = newEvent.venue && event.venue && 
      newEvent.venue.toLowerCase().trim() === event.venue.toLowerCase().trim();
      
    const facultyMatch = newEvent.facultyInCharge && event.facultyInCharge && 
      newEvent.facultyInCharge.toLowerCase().trim() === event.facultyInCharge.toLowerCase().trim();
      
    const equipmentMatch = newEvent.equipment && event.equipment && Array.isArray(newEvent.equipment) && Array.isArray(event.equipment) &&
      newEvent.equipment.some(e => event.equipment.includes(e));

    return venueMatch || facultyMatch || equipmentMatch;
  });

  if (resourceSpecificEvents.length === 0) {
    // No events sharing resources, current slot is actually fine!
    return {
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
    };
  }

  // Populate Priority Queue sorted by earliest end time (Greedy strategy)
  const pq = new PriorityQueue((a, b) => a.endTimeMs - b.endTimeMs);
  
  resourceSpecificEvents.forEach(event => {
    pq.push({
      event,
      startTimeMs: new Date(event.startTime).getTime(),
      endTimeMs: new Date(event.endTime).getTime()
    });
  });

  // Start searching from the proposed start time or current time, whichever is later
  let searchStartMs = Math.max(new Date(newEvent.startTime).getTime(), Date.now());
  const maxSearchEndMs = searchStartMs + (searchLimitDays * 24 * 60 * 60 * 1000);

  // We loop to find the earliest slot of 'duration' starting at or after searchStartMs
  // that does not overlap with any intervals in our priority queue.
  while (searchStartMs < maxSearchEndMs) {
    const proposedEndMs = searchStartMs + duration;
    
    // Check if the interval [searchStartMs, proposedEndMs] overlaps with any event in our list
    let overlapFound = false;
    let nextPossibleStartMs = null;

    for (let i = 0; i < resourceSpecificEvents.length; i++) {
      const event = resourceSpecificEvents[i];
      const eStart = new Date(event.startTime).getTime();
      const eEnd = new Date(event.endTime).getTime();

      // Check overlap
      if (searchStartMs < eEnd && eStart < proposedEndMs) {
        overlapFound = true;
        // The earliest next start is right after this conflicting event ends
        if (nextPossibleStartMs === null || eEnd > nextPossibleStartMs) {
          nextPossibleStartMs = eEnd;
        }
      }
    }

    if (!overlapFound) {
      // Found a gap! Return it
      return {
        startTime: new Date(searchStartMs).toISOString(),
        endTime: new Date(proposedEndMs).toISOString(),
      };
    }

    // Move search window forward
    searchStartMs = nextPossibleStartMs || (searchStartMs + 15 * 60 * 1000); // default step 15 min
  }

  return null; // No slot found in search limit
}
