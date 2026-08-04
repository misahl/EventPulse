// src/lib/test-runner.js
const { generateToken, verifyToken } = require('./qrToken.js');
const { PriorityQueue, areOverlapping, detectConflicts, suggestNextSlot } = require('./scheduling.js');
const { cosineSimilarity, buildTransientVector, buildEventVector, getRecommendations } = require('./recommendation.js');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(` ✅ PASS: ${message}`);
  } else {
    failCount++;
    console.error(` ❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('=== RUNNING EVENTPULSE ALGORITHM TESTS ===\n');

  // ==========================================
  // 1. QR TOKEN TESTS
  // ==========================================
  console.log('--- Testing QR Cryptographic Tokens ---');
  const secret = 'test-secret-key-999';
  const studentId = 'USN001';
  const eventId = 'EVENT_WEB_DEV';
  const timestamp = Date.now();

  const token = await generateToken(studentId, eventId, timestamp, secret);
  assert(token && token.includes('.'), 'Token generated with dot signature separator');

  const decoded = await verifyToken(token, secret);
  assert(decoded !== null, 'Valid token verified successfully');
  assert(decoded && decoded.studentId === studentId, 'Verified studentId matches original');
  assert(decoded && decoded.eventId === eventId, 'Verified eventId matches original');

  // Test tampering
  const tamperedToken = token + 'a';
  const tamperedDecoded = await verifyToken(tamperedToken, secret);
  assert(tamperedDecoded === null, 'Tampered token verification failed (correct behavior)');

  // Test incorrect secret
  const wrongSecretDecoded = await verifyToken(token, 'wrong-secret');
  assert(wrongSecretDecoded === null, 'Verification with incorrect secret failed (correct behavior)');
  console.log('');


  // ==========================================
  // 2. SCHEDULING & CONFLICT DETECTION TESTS
  // ==========================================
  console.log('--- Testing Interval Scheduling & Priority Queue ---');

  // Test Priority Queue
  const pq = new PriorityQueue((a, b) => a.val - b.val);
  pq.push({ name: 'Job C', val: 30 });
  pq.push({ name: 'Job A', val: 10 });
  pq.push({ name: 'Job B', val: 20 });

  assert(pq.size() === 3, 'Priority queue pushes three items');
  assert(pq.pop().name === 'Job A', 'PQ pops minimum priority item first');
  assert(pq.pop().name === 'Job B', 'PQ pops second item in order');
  assert(pq.pop().name === 'Job C', 'PQ pops third item in order');

  // Test overlapping
  const ev1 = { startTime: '2026-08-04T10:00:00.000Z', endTime: '2026-08-04T12:00:00.000Z' };
  const ev2 = { startTime: '2026-08-04T11:00:00.000Z', endTime: '2026-08-04T13:00:00.000Z' };
  const ev3 = { startTime: '2026-08-04T13:00:00.000Z', endTime: '2026-08-04T14:00:00.000Z' };

  assert(areOverlapping(ev1, ev2) === true, 'Overlapping events ev1 and ev2 overlap correctly');
  assert(areOverlapping(ev1, ev3) === false, 'Non-overlapping adjacent events do not overlap');

  // Test conflict detection
  const existing = [
    {
      id: '1',
      title: 'Web Design Workshop',
      venue: 'Seminar Hall A',
      facultyInCharge: 'Dr. Jane Smith',
      startTime: '2026-08-04T10:00:00.000Z',
      endTime: '2026-08-04T12:00:00.000Z',
      equipment: ['Projector', 'Audio System']
    }
  ];

  const newEvent1 = {
    id: '2',
    title: 'AI Lab Session',
    venue: 'Seminar Hall A', // venue conflict!
    facultyInCharge: 'Dr. John Doe',
    startTime: '2026-08-04T11:00:00.000Z',
    endTime: '2026-08-04T13:00:00.000Z',
    equipment: ['Projector']
  };

  const conflictResult = detectConflicts(newEvent1, existing);
  assert(conflictResult.hasConflict === true, 'Conflict detected for same venue and overlapping time');
  assert(conflictResult.resources.venue === true, 'Venue conflict flag is set');

  // Test suggestion
  const suggested = suggestNextSlot(newEvent1, existing);
  assert(suggested !== null, 'Next slot suggested successfully');
  if (suggested) {
    const suggestedStart = new Date(suggested.startTime).toISOString();
    assert(suggestedStart === '2026-08-04T12:00:00.000Z', 'Suggested slot starts right after conflicting event ends (12:00)');
  }
  console.log('');


  // ==========================================
  // 3. RECOMMENDATION ENGINE TESTS
  // ==========================================
  console.log('--- Testing AI Content-Based Recommendation ---');

  const student = {
    department: 'CSE',
    interests: ['AI', 'React']
  };

  const upcoming = [
    {
      id: 'e1',
      title: 'Advanced Neural Networks',
      department: 'CSE',
      category: 'AI',
      tags: ['AI', 'Python', 'ML']
    },
    {
      id: 'e2',
      title: 'React Fundamentals',
      department: 'ISE',
      category: 'Web',
      tags: ['React', 'JS']
    },
    {
      id: 'e3',
      title: 'Mechanical Design',
      department: 'ME',
      category: 'CAD',
      tags: ['3D', 'Mechanical']
    }
  ];

  const recs = getRecommendations(student, upcoming, [], 3);
  assert(recs.length === 3, 'Returns recommendations list');
  assert(recs[0].id === 'e1', 'First match is Neural Networks (highest CSE/AI relevance)');
  assert(recs[0].matchPercentage > recs[1].matchPercentage, 'Neural Networks match percentage is higher than React Fundamentals');
  assert(recs[2].matchPercentage === 0, 'Mechanical Design (unrelated) yields 0% match');

  console.log(`\n=== TEST SUITE COMPLETED ===`);
  console.log(`Passed: ${passCount} | Failed: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
