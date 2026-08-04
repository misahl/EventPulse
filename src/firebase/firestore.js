// src/firebase/firestore.js
import { isMock, db } from './config';
import { generateToken } from '../lib/qrToken';
import { detectConflicts, suggestNextSlot } from '../lib/scheduling';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  runTransaction 
} from 'firebase/firestore';

// Mock storage keys
const MOCK_EVENTS_KEY = 'eventpulse_mock_events';
const MOCK_REGISTRATIONS_KEY = 'eventpulse_mock_registrations';

// Helper functions for mock data
const DEFAULT_EVENTS = [
  {
    id: 'event_synergia_2025',
    title: 'SYNERGIA 2025 — Grand Techno-Cultural Mega Fest',
    description: 'The flagship national-level techno-cultural festival bringing together 6,000+ students from 200+ institutions. Featuring Air Shows, Project Expos, Technical Workshops, Expert Tech Talks, Live Concert, Food Fiesta, and Codeblaze Hackathon with ₹7 Lakhs cash prize pool!',
    venue: 'Campus Main Grounds & Netravathi Auditorium',
    facultyInCharge: 'Dr. S.S. Inamdar & Student Committee',
    startTime: '2025-12-07T09:00:00.000Z',
    endTime: '2025-12-09T22:00:00.000Z',
    capacity: 2500,
    currentOccupancy: 840,
    department: 'CSE',
    category: 'Flagship Fest',
    tags: ['Flagship', 'TechnoCultural', 'AirShow', 'Concert', 'Codeblaze', 'Prize7Lakhs'],
    status: 'approved',
    equipment: ['Main Stage Audio System', 'LED Screens', 'Air Show Launch Pad', 'High Speed Wi-Fi'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'event_msme_hackathon_5',
    title: 'MSME Idea Hackathon 5.0 (Smart & Sustainable MSMEs)',
    description: 'Ministry of MSME Govt. of India sponsored national innovation hackathon. Themes include Low-carbon technologies, Stealth & Cyber Defense, Industry 4.0/5.0, Smart Supply Chains, and Coastal Business Upliftment with funding support up to ₹15,00,000 per team.',
    venue: 'Incubation & Research Center (HI-BI)',
    facultyInCharge: 'Dr. Ajith B.S. (Convener MSME)',
    startTime: '2025-07-14T09:30:00.000Z',
    endTime: '2025-07-15T18:00:00.000Z',
    capacity: 300,
    currentOccupancy: 120,
    department: 'ME',
    category: 'Hackathons',
    tags: ['MSME', 'GovernmentGrant', 'Hackathon', 'Funding15Lakhs', 'CyberDefense', 'Industry4.0'],
    status: 'approved',
    equipment: ['Power Distribution Hubs', 'High Speed LAN', 'Projector Systems'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'event_hacknight_2024',
    title: 'Hacknight 2024 — 20 Hour Student Hackathon',
    description: 'Organized by SOSC (Student Open Source Community) & Synergia. An intense 20-hour overnight hackathon for developers, designers, and innovators to build real-world software solutions from scratch.',
    venue: 'Computer Center Lab 3 & 4',
    facultyInCharge: 'Pratheek G. Shetty & Ashika (SOSC Leads)',
    startTime: '2025-11-08T14:30:00.000Z',
    endTime: '2025-11-09T10:30:00.000Z',
    capacity: 150,
    currentOccupancy: 110,
    department: 'CSE',
    category: 'Hackathons',
    tags: ['SOSC', 'Hackathon', 'Overnight', 'OpenSource', 'WebDev', 'AI'],
    status: 'approved',
    equipment: ['High-speed Fiber LAN', 'Night Refreshments', 'Whiteboards'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'event_aerophilia_2025',
    title: 'Aerophilia 2025 — National Technical Fest',
    description: 'National-level aerospace and technical fest featuring RC Aeromodelling, Drone Racing, Paper Presentations, Autonomous Bot Fights, and Tech Exhibitions.',
    venue: 'Aerospace Arena & Open Lawn',
    facultyInCharge: 'Dept. of Aeronautical & Mechanical Engineering',
    startTime: '2025-11-20T09:00:00.000Z',
    endTime: '2025-11-21T17:00:00.000Z',
    capacity: 800,
    currentOccupancy: 310,
    department: 'ME',
    category: 'Technical',
    tags: ['Aerophilia', 'DroneRacing', 'Aeromodelling', 'Robotics', 'TechFest'],
    status: 'approved',
    equipment: ['Drone Net Enclosure', 'Flight Track Sensors', 'PA System'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'event_campus_carnival_2025',
    title: 'Campus Business Carnival 2025',
    description: 'Annual Business & Management Carnival featuring Market Verse, Whiz Quiz, Job Fair 2025, Battle of Blue Whales, Student Corner stalls, and Gully Cricket League.',
    venue: 'MBA Quadrangle & Campus Arena',
    facultyInCharge: 'Dr. Vishal Samartha & Ms. Monisha Shetty',
    startTime: '2025-05-23T09:00:00.000Z',
    endTime: '2025-05-24T18:00:00.000Z',
    capacity: 1200,
    currentOccupancy: 450,
    department: 'ISE',
    category: 'Cultural',
    tags: ['Carnival', 'JobFair', 'MarketVerse', 'GullyCricket', 'MBA'],
    status: 'approved',
    equipment: ['Exhibition Stalls', 'Public Address Mic', 'Cricket Turf Pitch'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'event_cultural_fest_2025',
    title: 'Cultural Fest 2025 — "Where Experience Inspires Expression"',
    description: 'Vibrant cultural extravaganza showcasing Beat Blast (Group Dance Competition), Transition Threads (Campus to Corporate Fashion Show), and Rhythmic Rivalry (Dance Battles).',
    venue: 'Open Air Amphitheatre',
    facultyInCharge: 'Mr. Awin Eric Cutinha & Mr. Sagar Attavar',
    startTime: '2025-05-24T16:00:00.000Z',
    endTime: '2025-05-24T22:30:00.000Z',
    capacity: 1500,
    currentOccupancy: 620,
    department: 'ECE',
    category: 'Cultural',
    tags: ['CulturalFest', 'GroupDance', 'BeatBlast', 'FashionShow', 'DanceBattle'],
    status: 'approved',
    equipment: ['Concert Lighting Rig', 'Subwoofer Array', 'Green Rooms'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'event_whiz_quiz_2025',
    title: 'Whiz Quiz Junior 2025 — National Management Quiz',
    description: 'National inter-collegiate quiz championship hosted by Dept. of Business Administration. Featuring Chief Guest Dr. Jitendra Kumar Das (Founder FORE School & Ex-Dean IIM Noida).',
    venue: 'Seminar Hall A',
    facultyInCharge: 'Prof. Ramesh KG & Prof. Monisha Shetty',
    startTime: '2025-12-23T10:00:00.000Z',
    endTime: '2025-12-23T16:00:00.000Z',
    capacity: 400,
    currentOccupancy: 180,
    department: 'AIML',
    category: 'Seminars',
    tags: ['WhizQuiz', 'QuizChampionship', 'DrJitendraDas', 'MBA', 'Management'],
    status: 'approved',
    equipment: ['Buzzer System', 'Podium Mics', 'Projector Screens'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'event_aicte_lecture_series',
    title: 'AICTE Distinguished Chair Professor Lecture Series',
    description: 'Virtual keynote address on "Reinventing Indian Education, Research & Innovation System" by Dr. R.A. Mashelkar (Padma Vibhushan, Former Director General CSIR).',
    venue: 'Virtual Conference Hall & Zoom Stream',
    facultyInCharge: 'Office of Academic Affairs',
    startTime: '2025-10-18T11:00:00.000Z',
    endTime: '2025-10-18T13:00:00.000Z',
    capacity: 1000,
    currentOccupancy: 380,
    department: 'CSE',
    category: 'Seminars',
    tags: ['AICTE', 'DrMashelkar', 'Keynote', 'Research', 'Innovation'],
    status: 'approved',
    equipment: ['Zoom Webinar Pro', 'HD Stream Console', 'Live Q&A Portal'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'event_arena_sports_2026',
    title: 'Arena 2026 — Annual Campus Sports Day',
    description: 'Inter-departmental annual sports championship organized by Dept. of Physical Education. Featuring Track & Field, Sprint Relay, Shot Put, Volleyball, and Football finals.',
    venue: 'Main Athletic Grounds',
    facultyInCharge: 'Dept. of Physical Education',
    startTime: '2026-04-11T09:00:00.000Z',
    endTime: '2026-04-11T18:00:00.000Z',
    capacity: 2000,
    currentOccupancy: 540,
    department: 'ME',
    category: 'Sports',
    tags: ['Arena2026', 'SportsDay', 'Athletics', 'TrackAndField', 'Football'],
    status: 'approved',
    equipment: ['Digital Finish Line Timer', 'Sound Horns', 'First Aid Station'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'event_alumni_meet_2025',
    title: 'Grand Alumni Meet 2025 & Networking Gala',
    description: 'Annual reunion for campus alumni across all batches. Featuring department interactions, high tea networking, formal ceremony, cultural performances, campfire, and gala dinner.',
    venue: 'Central Lawn & Auditorium',
    facultyInCharge: 'Campus Alumni Association',
    startTime: '2025-12-27T14:30:00.000Z',
    endTime: '2025-12-27T21:30:00.000Z',
    capacity: 600,
    currentOccupancy: 290,
    department: 'CSE',
    category: 'Alumni',
    tags: ['Alumni2025', 'Networking', 'Reunion', 'Campfire', 'GalaDinner'],
    status: 'approved',
    equipment: ['Registration Desk', 'Banquet Catering', 'Acoustic Stage'],
    createdAt: new Date().toISOString()
  }
];

function getMockEvents() {
  if (typeof window === 'undefined') return DEFAULT_EVENTS;
  const data = localStorage.getItem(MOCK_EVENTS_KEY);
  if (!data) {
    saveMockEvents(DEFAULT_EVENTS);
    return DEFAULT_EVENTS;
  }
  return JSON.parse(data);
}

function saveMockEvents(events) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOCK_EVENTS_KEY, JSON.stringify(events));
}

function getMockRegistrations() {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(MOCK_REGISTRATIONS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveMockRegistrations(regs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOCK_REGISTRATIONS_KEY, JSON.stringify(regs));
}

// ==========================================
// 1. EVENT CRUD OPERATIONS
// ==========================================

export async function createEvent(eventData) {
  const eventId = 'event_' + Math.random().toString(36).substr(2, 9);
  const newEvent = {
    id: eventId,
    title: eventData.title,
    description: eventData.description || '',
    venue: eventData.venue,
    facultyInCharge: eventData.facultyInCharge || '',
    startTime: eventData.startTime, // ISO string
    endTime: eventData.endTime,     // ISO string
    capacity: parseInt(eventData.capacity, 10) || 50,
    currentOccupancy: 0,
    department: eventData.department || '',
    category: eventData.category || 'General',
    tags: eventData.tags || [],
    status: 'pending', // pending -> approved | rejected
    equipment: eventData.equipment || [],
    createdAt: new Date().toISOString()
  };

  if (isMock) {
    const events = getMockEvents();
    events.push(newEvent);
    saveMockEvents(events);
    return newEvent;
  } else {
    await setDoc(doc(db, 'events', eventId), newEvent);
    return newEvent;
  }
}

export async function updateEvent(eventId, updatedFields) {
  if (isMock) {
    const events = getMockEvents();
    const index = events.findIndex(e => e.id === eventId);
    if (index !== -1) {
      events[index] = { ...events[index], ...updatedFields };
      saveMockEvents(events);
      return events[index];
    }
    throw new Error('Event not found');
  } else {
    const eventDocRef = doc(db, 'events', eventId);
    await updateDoc(eventDocRef, updatedFields);
    return { id: eventId, ...updatedFields };
  }
}

export async function deleteEvent(eventId) {
  if (isMock) {
    const events = getMockEvents();
    const filtered = events.filter(e => e.id !== eventId);
    saveMockEvents(filtered);
    return true;
  } else {
    await deleteDoc(doc(db, 'events', eventId));
    return true;
  }
}

export async function fetchAllEvents() {
  if (isMock) {
    return getMockEvents();
  } else {
    const querySnapshot = await getDocs(collection(db, 'events'));
    const events = [];
    querySnapshot.forEach(doc => {
      events.push(doc.data());
    });
    return events;
  }
}

/**
 * Live updates listener for events (real-time occupancy sync)
 */
export function subscribeToEvents(callback) {
  if (isMock) {
    // Return a mock unsubscribe function and invoke callback
    callback(getMockEvents());
    // Simulate real-time updates check every 2 seconds
    const interval = setInterval(() => {
      callback(getMockEvents());
    }, 2000);
    return () => clearInterval(interval);
  } else {
    const q = collection(db, 'events');
    return onSnapshot(q, (snapshot) => {
      const events = [];
      snapshot.forEach((doc) => {
        events.push(doc.data());
      });
      callback(events);
    });
  }
}

// ==========================================
// 2. EVENT REGISTRATION SYSTEM
// ==========================================

export async function registerForEvent(student, eventId) {
  const regId = `reg_${student.uid}_${eventId}`;

  if (isMock) {
    const regs = getMockRegistrations();
    if (regs.find(r => r.id === regId)) {
      throw new Error('Student is already registered for this event');
    }

    const qrToken = await generateToken(student.uid, eventId, Date.now());

    const newReg = {
      id: regId,
      studentId: student.uid,
      studentName: student.name,
      studentUSN: student.usn || '',
      studentDepartment: student.department || '',
      eventId,
      qrToken,
      status: 'registered', // registered | checkedIn | checkedOut | late
      checkInTime: null,
      checkOutTime: null,
      registeredAt: new Date().toISOString()
    };

    regs.push(newReg);
    saveMockRegistrations(regs);
    return newReg;
  } else {
    // Check if already registered
    const docRef = doc(db, 'registrations', regId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      throw new Error('Student is already registered for this event');
    }

    const qrToken = await generateToken(student.uid, eventId, Date.now());

    const newReg = {
      id: regId,
      studentId: student.uid,
      studentName: student.name,
      studentUSN: student.usn || '',
      studentDepartment: student.department || '',
      eventId,
      qrToken,
      status: 'registered',
      checkInTime: null,
      checkOutTime: null,
      registeredAt: new Date().toISOString()
    };

    await setDoc(docRef, newReg);
    return newReg;
  }
}

export async function fetchStudentRegistrations(studentId) {
  if (isMock) {
    const regs = getMockRegistrations();
    return regs.filter(r => r.studentId === studentId);
  } else {
    const q = query(collection(db, 'registrations'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    const regs = [];
    snapshot.forEach(doc => regs.push(doc.data()));
    return regs;
  }
}

export async function fetchEventRegistrations(eventId) {
  if (isMock) {
    const regs = getMockRegistrations();
    return regs.filter(r => r.eventId === eventId);
  } else {
    const q = query(collection(db, 'registrations'), where('eventId', '==', eventId));
    const snapshot = await getDocs(q);
    const regs = [];
    snapshot.forEach(doc => regs.push(doc.data()));
    return regs;
  }
}

export function subscribeToEventRegistrations(eventId, callback) {
  if (isMock) {
    callback(getMockRegistrations().filter(r => r.eventId === eventId));
    const interval = setInterval(() => {
      callback(getMockRegistrations().filter(r => r.eventId === eventId));
    }, 2000);
    return () => clearInterval(interval);
  } else {
    const q = query(collection(db, 'registrations'), where('eventId', '==', eventId));
    return onSnapshot(q, (snapshot) => {
      const regs = [];
      snapshot.forEach(doc => regs.push(doc.data()));
      callback(regs);
    });
  }
}

// ==========================================
// 3. SECURE CHECK-IN / CHECK-OUT TRANSACTION
// ==========================================

/**
 * Performs transactional secure check-in or check-out of a student in Firestore/LocalStorage.
 * Validates check-in limits, increments/decrements live occupancy, prevents race conditions.
 */
export async function executeCheckInTransaction(studentId, eventId, qrToken) {
  const regId = `reg_${studentId}_${eventId}`;

  if (isMock) {
    // LocalStorage Transaction Simulation
    const events = getMockEvents();
    const regs = getMockRegistrations();

    const eventIndex = events.findIndex(e => e.id === eventId);
    const regIndex = regs.findIndex(r => r.id === regId);

    if (eventIndex === -1) throw new Error('Event does not exist');
    if (regIndex === -1) throw new Error('Student is not registered for this event');

    const event = events[eventIndex];
    const reg = regs[regIndex];

    if (reg.qrToken !== qrToken) throw new Error('Invalid QR Token signature');

    let action = '';
    const now = new Date();

    if (reg.status === 'registered') {
      // PERFORM CHECK-IN
      if (event.currentOccupancy >= event.capacity) {
        throw new Error('Event capacity is full');
      }

      // Check if student is late (e.g. checked in 15 minutes after start time)
      const eventStart = new Date(event.startTime);
      const gracePeriodMs = 15 * 60 * 1000; // 15 minutes grace
      const isLate = now.getTime() > (eventStart.getTime() + gracePeriodMs);

      reg.status = isLate ? 'late' : 'checkedIn';
      reg.checkInTime = now.toISOString();
      event.currentOccupancy += 1;
      action = isLate ? 'Checked in late' : 'Checked in successfully';
    } else if (reg.status === 'checkedIn' || reg.status === 'late') {
      // PERFORM CHECK-OUT
      reg.status = 'checkedOut';
      reg.checkOutTime = now.toISOString();
      event.currentOccupancy = Math.max(0, event.currentOccupancy - 1);
      action = 'Checked out successfully';
    } else {
      throw new Error('Student is already checked out');
    }

    // Save changes
    events[eventIndex] = event;
    regs[regIndex] = reg;
    saveMockEvents(events);
    saveMockRegistrations(regs);

    return { success: true, action, reg, event };
  } else {
    // REAL FIRESTORE TRANSACTIONS
    const eventRef = doc(db, 'events', eventId);
    const regRef = doc(db, 'registrations', regId);

    return await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      const regDoc = await transaction.get(regRef);

      if (!eventDoc.exists()) throw new Error('Event does not exist');
      if (!regDoc.exists()) throw new Error('Student is not registered for this event');

      const eventData = eventDoc.data();
      const regData = regDoc.data();

      if (regData.qrToken !== qrToken) throw new Error('Invalid QR Token signature');

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
        success: true, 
        action, 
        reg: { ...regData, ...updatedReg }, 
        event: { ...eventData, ...updatedEvent } 
      };
    });
  }
}
