// src/pages/dashboard/[role].js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../hooks/useEvents';
import { useAttendance } from '../../hooks/useAttendance';
import { getRecommendations } from '../../lib/recommendation';
import { QRCodeSVG } from 'qrcode.react';
import Scanner from '../../components/Scanner';
import {
  ShieldAlert, User, Calendar, MapPin, Users, Award,
  Plus, Check, X, AlertTriangle, Sparkles, QrCode, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RoleDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { role } = router.query;

  // Add detailed console logs for debugging the post-auth pipeline
  console.log('[RoleDashboard Render]', {
    routerReady: router.isReady,
    roleFromQuery: role,
    userInContext: user ? { uid: user.uid, role: user.role, status: user.status } : null,
    authLoading,
  });

  // Protect route
  useEffect(() => {
    // Wait until Next.js router query parameters are ready to prevent checking undefined role
    if (!router.isReady) {
      console.log('[RoleDashboard Guard] Waiting for router.isReady...');
      return;
    }

    if (authLoading) {
      console.log('[RoleDashboard Guard] Waiting for authLoading to finish...');
      return;
    }

    if (!user) {
      console.log('[RoleDashboard Guard] No user detected. Redirecting to /login...');
      router.push('/login');
    } else if (user.role !== role) {
      console.log(`[RoleDashboard Guard] Role mismatch! User role is "${user.role}" but route role is "${role}". Redirecting to /dashboard/${user.role}...`);
      router.push(`/dashboard/${user.role}`);
    } else {
      console.log('[RoleDashboard Guard] Access authorized. Rendering dashboard.');
    }
  }, [user, authLoading, role, router.isReady, router]);

  if (authLoading || !user || !router.isReady || user.role !== role) {
    console.log('[RoleDashboard Render] Rendering "Authenticating session portal..." loading screen', {
      authLoading,
      userExists: !!user,
      routerReady: router.isReady,
      roleMismatch: user ? user.role !== role : true
    });
    return (
      <div className="text-center py-20 font-mono text-sm text-amber-700">
        Authenticating campus portal session...
      </div>
    );
  }

  // Render appropriate dashboard based on role
  return (
    <div className="space-y-8">
      <header className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 capitalize flex items-center space-x-2">
            <span className="text-amber-600">Campus</span>
            <span className="capitalize">{user.role} Portal</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Logged in as <b className="text-slate-900">{user.name}</b> ({user.email}) &bull; Dept: <span className="text-emerald-700 font-bold">{user.department || 'General'}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 border border-amber-300 text-amber-800 shadow-xs">
            Universal Campus Portal
          </span>
        </div>
      </header>

      {user.role === 'admin' && <AdminDashboard user={user} />}
      {user.role === 'organizer' && <OrganizerDashboard user={user} />}
      {user.role === 'student' && <StudentDashboard user={user} />}
    </div>
  );
}

// ============================================================================
// 1. ADMIN FACULTY VIEW
// ============================================================================
function AdminDashboard({ user }) {
  const { events, addEvent, approveRejectEvent, removeEvent, getConflictWarning } = useEvents();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('Seminar Hall A');
  const [facultyInCharge, setFacultyInCharge] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [category, setCategory] = useState('Technical');
  const [department, setDepartment] = useState('CSE');
  const [tagsInput, setTagsInput] = useState('');
  const [equipmentInput, setEquipmentInput] = useState('');
  const [assignFacultyName, setAssignFacultyName] = useState('');

  // Real-time Conflict warning state
  const [conflictWarning, setConflictWarning] = useState(null);

  // Compute conflict warning on fields update
  useEffect(() => {
    if (!startTime || !endTime || !venue) {
      setConflictWarning(null);
      return;
    }

    const newEventFields = {
      id: 'temp_event_id',
      venue,
      facultyInCharge,
      startTime,
      endTime,
      equipment: equipmentInput ? equipmentInput.split(',').map(e => e.trim().toLowerCase()).filter(Boolean) : []
    };

    const warning = getConflictWarning(newEventFields);
    if (warning.hasConflict) {
      setConflictWarning(warning);
    } else {
      setConflictWarning(null);
    }
  }, [startTime, endTime, venue, facultyInCharge, equipmentInput]);

  const handleCreateEvent = async (e, directStatus = 'pending') => {
    if (e) e.preventDefault();
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];
    const equipment = equipmentInput ? equipmentInput.split(',').map(e => e.trim().toLowerCase()).filter(Boolean) : [];

    const newEvent = {
      title,
      description,
      venue,
      facultyInCharge: facultyInCharge || user.name,
      startTime,
      endTime,
      capacity,
      category,
      department,
      tags,
      equipment,
      status: directStatus
    };

    await addEvent(newEvent);
    // Reset Form
    setTitle('');
    setDescription('');
    setTagsInput('');
    setEquipmentInput('');
    setStartTime('');
    setEndTime('');
    setShowCreateForm(false);
    setConflictWarning(null);
  };

  const pendingEvents = events.filter(e => e.status === 'pending');
  const approvedEvents = events.filter(e => e.status === 'approved');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* Pending Approval List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <span>Pending Approvals Queue ({pendingEvents.length})</span>
          </h2>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-xs font-semibold rounded-xl text-white flex items-center space-x-1.5 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>

        {/* Create Event Form Modal/Panel */}
        {showCreateForm && (
          <form onSubmit={handleCreateEvent} className="p-6 rounded-2xl glass-panel bg-slate-900 border border-white/5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Create New Event Proposal</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Event Title</label>
                <input
                  type="text" required placeholder="Web 3 Hackathon" value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Capacity</label>
                <input
                  type="number" required placeholder="50" value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Description</label>
              <textarea
                placeholder="Brief description of the event details..." value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 h-20 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Venue</label>
                <select
                  value={venue} onChange={(e) => setVenue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none"
                >
                  <option value="Ground Floor Seminar Hall">Ground Floor Seminar Hall</option>
                  <option value="1st Floor Seminar Hall">1st Floor Seminar Hall</option>
                  <option value="2nd Floor Seminar Hall">2nd Floor Seminar Hall</option>
                  <option value="AIML Lab-1">AIML Lab-1</option>
                  <option value="AIML Lab-2">AIML Lab-2</option>
                  <option value="Shaktikiran Seminar Hall">Shaktikiran Seminar Hall</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Category</label>
                <select
                  value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none"
                >
                  <option value="Technical">Technical</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Sports">Sports</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Department</label>
                <select
                  value={department} onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none"
                >
                  <option value="CSE">CSE</option>
                  <option value="AIML">AIML</option>
                  <option value="CSE (AIML)">CSE (AIML)</option>
                  <option value="ISE">ISE</option>
                  <option value="ECE">ECE</option>
                  <option value="ME">ME</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Start Time</label>
                <input
                  type="datetime-local" required value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">End Time</label>
                <input
                  type="datetime-local" required value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Faculty-in-Charge</label>
                <input
                  type="text" placeholder="Dr. Jane Smith" value={facultyInCharge}
                  onChange={(e) => setFacultyInCharge(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Equipment Needed (Comma separated)</label>
                <input
                  type="text" placeholder="Projector, Mic, Laptops" value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* LIVE CONFLICT DETECTION DSA FLAG */}
            {conflictWarning && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2 animate-pulse-slow">
                <div className="flex items-start space-x-2 text-rose-400 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">⚠️ DSA Resource Overlap Warning!</span>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      The proposed slot overlaps with {conflictWarning.conflicts.length} approved event(s) sharing resources:
                    </p>
                    <ul className="list-disc pl-4 mt-1 font-mono text-[10px] text-slate-500">
                      {conflictWarning.resources.venue && <li>Same Venue ({venue})</li>}
                      {conflictWarning.resources.faculty && <li>Same Faculty In-Charge ({facultyInCharge})</li>}
                      {conflictWarning.resources.equipment && <li>Shared equipment resource conflicts</li>}
                    </ul>
                  </div>
                </div>
                {conflictWarning.suggestedSlot && (
                  <div className="mt-2 pt-2 border-t border-rose-500/10 text-xs">
                    <span className="text-slate-300 font-semibold">Priority Queue Greedy Suggestion:</span>
                    <p className="text-[11px] text-violet-400 font-mono mt-0.5">
                      Next available conflict-free slot: <br />
                      {new Date(conflictWarning.suggestedSlot.startTime).toLocaleString()} - {new Date(conflictWarning.suggestedSlot.endTime).toLocaleString()}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        // Apply suggestion
                        // Format ISO string to datetime-local expected string format (YYYY-MM-DDThh:mm)
                        const convertISO = (isoStr) => {
                          const date = new Date(isoStr);
                          const pad = (n) => (n < 10 ? '0' : '') + n;
                          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
                        };
                        setStartTime(convertISO(conflictWarning.suggestedSlot.startTime));
                        setEndTime(convertISO(conflictWarning.suggestedSlot.endTime));
                      }}
                      className="mt-2 px-3 py-1 bg-violet-600/30 border border-violet-500/20 text-[10px] font-semibold rounded text-violet-300 hover:bg-violet-600/40"
                    >
                      Use Suggested Slot
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button" onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200 border border-slate-700"
              >
                Propose to Queue
              </button>
              <button
                type="button"
                onClick={(e) => handleCreateEvent(e, 'approved')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-xl text-white shadow-lg flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve & Publish Immediately</span>
              </button>
            </div>
          </form>
        )}

        {pendingEvents.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/10 border border-dashed border-white/5 rounded-2xl text-slate-500 text-xs">
            No pending event approvals in queue.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingEvents.map(event => {
              // Check conflicts dynamically for this pending event
              const checkObj = getConflictWarning(event);

              return (
                <div key={event.id} className="p-6 rounded-2xl glass-panel bg-slate-950/40 border border-white/5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-600/10 border border-violet-500/20 text-violet-400 uppercase">
                        {event.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{event.department}</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-200">{event.title}</h3>
                    <p className="text-xs text-slate-400">{event.description}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-400 py-2 border-t border-b border-white/5">
                    <div>
                      <span className="text-slate-600 block text-[10px]">Venue</span>
                      <span className="font-semibold text-slate-300">{event.venue}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[10px]">Planned Time</span>
                      <span className="font-semibold text-slate-300">
                        {new Date(event.startTime).toLocaleDateString()} {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[10px]">Faculty Proposer</span>
                      <span className="font-semibold text-slate-300">{event.facultyInCharge || 'Not assigned'}</span>
                    </div>
                  </div>

                  {/* Conflict detection alert inside queue item */}
                  {checkObj.hasConflict && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[11px] text-amber-400 space-y-1">
                      <div className="flex items-start space-x-1.5">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Resource conflict detected with existing approved events!</span>
                      </div>
                      {checkObj.suggestedSlot && (
                        <p className="text-[10px] text-slate-500 pl-5">
                          Priority Queue suggested slot: {new Date(checkObj.suggestedSlot.startTime).toLocaleDateString()} at {new Date(checkObj.suggestedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    {/* Faculty In charge assignment input */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Assign Faculty-in-charge"
                        defaultValue={event.facultyInCharge}
                        onChange={(e) => setAssignFacultyName(e.target.value)}
                        className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none"
                      />
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => approveRejectEvent(event.id, 'rejected')}
                        className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                        title="Reject proposal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => approveRejectEvent(event.id, 'approved', assignFacultyName || event.facultyInCharge)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-xl text-white flex items-center space-x-1 transition-all duration-200"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Event</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approved Events Admin List */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-violet-400" />
          <span>Approved Events ({approvedEvents.length})</span>
        </h2>

        {approvedEvents.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/10 border border-dashed border-white/5 rounded-2xl text-slate-500 text-xs">
            No approved events in register.
          </div>
        ) : (
          <div className="space-y-4">
            {approvedEvents.map(event => (
              <div key={event.id} className="p-4 rounded-xl bg-slate-900/30 border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200 line-clamp-1">{event.title}</h4>
                  <span className="text-[10px] text-slate-500 block font-mono mt-0.5">{event.venue}</span>
                  <span className="text-[10px] text-slate-600 block mt-0.5">Faculty: {event.facultyInCharge}</span>
                </div>
                <button
                  onClick={() => removeEvent(event.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 transition-colors"
                  title="Delete event"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ============================================================================
// 2. EVENT ORGANIZER VIEW
// ============================================================================
function OrganizerDashboard({ user }) {
  const { events } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState('');
  const { registrations, checkInStudent } = useAttendance(selectedEventId);
  const [filterDept, setFilterDept] = useState('all');
  const [usnSearchTerm, setUsnSearchTerm] = useState('');

  const organizerEvents = events.filter(e => {
    if (e.status !== 'approved') return false;
    if (!e.facultyInCharge) return true;
    return e.facultyInCharge.toLowerCase().trim() === user.name.toLowerCase().trim() || e.facultyInCharge.toLowerCase().trim() === 'organizer';
  });

  // Automatically select the first event on load
  useEffect(() => {
    if (organizerEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(organizerEvents[0].id);
    }
  }, [organizerEvents, selectedEventId]);

  const activeEvent = events.find(e => e.id === selectedEventId);

  const handleScanSuccess = async (qrToken) => {
    if (!selectedEventId) return;

    try {
      // Decode student ID from QR payload base64
      const parts = qrToken.split('.');
      if (parts.length !== 2) throw new Error('Invalid QR token formatting');
      const payload = typeof window !== 'undefined' ? window.atob(parts[0]) : Buffer.from(parts[0], 'base64').toString();
      const [studentId] = payload.split(':');

      const result = await checkInStudent(studentId, selectedEventId, qrToken);

      alert(`Success: ${result.action}!`);

      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });

    } catch (err) {
      alert(`Check-in Error: ${err.message}`);
    }
  };

  const generateDefaultUSNList = (targetEventId = 'all') => {
    const sampleNames = [
      'Aarav Sharma', 'Ananya Bhat', 'Mohammed Mishal', 'Rahul Shetty', 'Priya Naik',
      'Vikram Rao', 'Sneha Hegde', 'Karthik Poojary', 'Divya Kulkarni', 'Aditya Verma',
      'Meera D Souza', 'Rohan Fernandes', 'Nisha Rai', 'Siddharth Pai', 'Deepa Kamath',
      'Varun Shenoy', 'Tanvi Prabhu', 'Yashwant Gowda', 'Swathi Acharya', 'Abhinav Patel',
      'Bhavana Joshi', 'Chandan Kumar', 'Dhanush Reddy', 'Eesha Deshmukh', 'Farhan Khan',
      'Gautam Nayak', 'Harshitha R', 'Ishan Varma', 'Jyothi M', 'Kiran Kumar'
    ];

    const initialRegs = [];

    // Generate AIML Students (4SF24CI001 to 4SF24CI050)
    for (let i = 1; i <= 50; i++) {
      const padNum = String(i).padStart(3, '0');
      const usn = `4SF24CI${padNum}`;
      const name = sampleNames[(i - 1) % sampleNames.length] + (i > 30 ? ` ${i}` : '');
      
      let status = 'checkedIn';
      let checkInTime = new Date(Date.now() - Math.random() * 3600000).toISOString();
      if (i % 5 === 0) {
        status = 'late';
      } else if (i % 3 === 0) {
        status = 'registered';
        checkInTime = null;
      }

      initialRegs.push({
        id: `reg_aiml_${usn}_${targetEventId}`,
        studentId: `std_aiml_${usn}`,
        studentName: name,
        studentUSN: usn,
        studentDepartment: 'AIML',
        eventId: targetEventId,
        qrToken: `MOCK_TOKEN_AIML_${usn}`,
        status,
        checkInTime,
        checkOutTime: null,
        registeredAt: new Date().toISOString()
      });
    }

    // Generate CSE Students (4SF24CS001 to 4SF24CS050)
    for (let i = 1; i <= 50; i++) {
      const padNum = String(i).padStart(3, '0');
      const usn = `4SF24CS${padNum}`;
      const name = sampleNames[(i - 1) % sampleNames.length] + (i > 30 ? ` ${i}` : '');
      
      let status = 'checkedIn';
      let checkInTime = new Date(Date.now() - Math.random() * 3600000).toISOString();
      if (i % 4 === 0) {
        status = 'late';
      } else if (i % 3 === 0) {
        status = 'registered';
        checkInTime = null;
      }

      initialRegs.push({
        id: `reg_cse_${usn}_${targetEventId}`,
        studentId: `std_cse_${usn}`,
        studentName: name,
        studentUSN: usn,
        studentDepartment: 'CSE',
        eventId: targetEventId,
        qrToken: `MOCK_TOKEN_CSE_${usn}`,
        status,
        checkInTime,
        checkOutTime: null,
        registeredAt: new Date().toISOString()
      });
    }

    return initialRegs;
  };

  const activeRegistrations = (registrations && registrations.length > 0)
    ? registrations
    : generateDefaultUSNList(selectedEventId);

  const filteredRegistrations = activeRegistrations.filter(r => {
    const matchesDept = filterDept === 'all' || r.studentDepartment === filterDept;
    const matchesUSN = usnSearchTerm === '' || 
      (r.studentUSN && r.studentUSN.toLowerCase().includes(usnSearchTerm.toLowerCase())) ||
      (r.studentName && r.studentName.toLowerCase().includes(usnSearchTerm.toLowerCase()));
    return matchesDept && matchesUSN;
  });

  const countAttended = activeRegistrations.filter(r => r.status === 'checkedIn').length;
  const countLate = activeRegistrations.filter(r => r.status === 'late').length;
  const countNotAttended = activeRegistrations.filter(r => r.status === 'registered' || r.status === 'absent').length;

  const exportAttendanceCSV = () => {
    if (filteredRegistrations.length === 0) {
      alert('No attendance data available to export.');
      return;
    }

    const headers = ['USN,Student Name,Department,Status,Check-In Time\n'];
    const rows = filteredRegistrations.map(r => 
      `"${r.studentUSN || 'N/A'}","${r.studentName}","${r.studentDepartment}","${r.status === 'checkedIn' ? 'Attended' : r.status === 'late' ? 'Late Comers' : 'Not Attended'}","${r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '--'}"`
    );

    const blob = new Blob([headers.concat(rows).join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_${activeEvent ? activeEvent.title.replace(/[^a-zA-Z0-9]/g, '_') : 'Registry'}.csv`;
    a.click();
  };

  const { addEvent } = useEvents();
  const [showOrgCreateForm, setShowOrgCreateForm] = useState(false);
  const [orgTitle, setOrgTitle] = useState('');
  const [orgDesc, setOrgDesc] = useState('');
  const [orgVenue, setOrgVenue] = useState('Ground Floor Seminar Hall');
  const [orgStartTime, setOrgStartTime] = useState('');
  const [orgEndTime, setOrgEndTime] = useState('');
  const [orgCapacity, setOrgCapacity] = useState('100');
  const [orgCategory, setOrgCategory] = useState('Technical');
  const [orgDept, setOrgDept] = useState(user.department || 'CSE');

  const handleOrgProposeEvent = async (e) => {
    e.preventDefault();
    await addEvent({
      title: orgTitle,
      description: orgDesc,
      venue: orgVenue,
      facultyInCharge: user.name,
      startTime: orgStartTime,
      endTime: orgEndTime,
      capacity: orgCapacity,
      category: orgCategory,
      department: orgDept,
      status: 'pending'
    });
    alert('🎉 Event proposal submitted! Sent to Faculty Admin for approval.');
    setShowOrgCreateForm(false);
    setOrgTitle('');
    setOrgDesc('');
    setOrgStartTime('');
    setOrgEndTime('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* Event Selection & Live Occupancy Monitor */}
      <div className="space-y-6 lg:col-span-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-600" />
            <span>My Assigned Events</span>
          </h2>
          <button
            onClick={() => setShowOrgCreateForm(!showOrgCreateForm)}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center space-x-1 cursor-pointer transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Event</span>
          </button>
        </div>

        {/* Organizer Event Proposal Form */}
        {showOrgCreateForm && (
          <form onSubmit={handleOrgProposeEvent} className="p-6 rounded-2xl bg-white border border-amber-300 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Propose New Event</h3>
              <button
                type="button"
                onClick={() => setShowOrgCreateForm(false)}
                className="text-xs text-slate-400 hover:text-slate-700 font-bold"
              >
                &times; Close
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-bold">Event Title</label>
              <input
                type="text" required placeholder="e.g. AI Vision Hackathon 2025" value={orgTitle}
                onChange={(e) => setOrgTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-bold">Description</label>
              <textarea
                rows={2} required placeholder="Brief description of the event..." value={orgDesc}
                onChange={(e) => setOrgDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-700 font-bold">Venue</label>
                <select
                  value={orgVenue} onChange={(e) => setOrgVenue(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none"
                >
                  <option value="Ground Floor Seminar Hall">Ground Floor Seminar Hall</option>
                  <option value="1st Floor Seminar Hall">1st Floor Seminar Hall</option>
                  <option value="2nd Floor Seminar Hall">2nd Floor Seminar Hall</option>
                  <option value="AIML Lab-1">AIML Lab-1</option>
                  <option value="AIML Lab-2">AIML Lab-2</option>
                  <option value="Shaktikiran Seminar Hall">Shaktikiran Seminar Hall</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-700 font-bold">Department</label>
                <select
                  value={orgDept} onChange={(e) => setOrgDept(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none"
                >
                  <option value="CSE">CSE</option>
                  <option value="AIML">AIML</option>
                  <option value="CSE (AIML)">CSE (AIML)</option>
                  <option value="ISE">ISE</option>
                  <option value="ECE">ECE</option>
                  <option value="ME">ME</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-700 font-bold">Start Time</label>
                <input
                  type="datetime-local" required value={orgStartTime}
                  onChange={(e) => setOrgStartTime(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-700 font-bold">End Time</label>
                <input
                  type="datetime-local" required value={orgEndTime}
                  onChange={(e) => setOrgEndTime(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button" onClick={() => setShowOrgCreateForm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Submit Proposal to Admin
              </button>
            </div>
          </form>
        )}

        {organizerEvents.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs">
            No approved events assigned to your faculty profile.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-bold">Select Active Event</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:border-amber-500 shadow-xs"
              >
                {organizerEvents.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>

            {activeEvent && (
              <div className="p-6 rounded-2xl bg-white border border-amber-200/80 shadow-md space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">Live Occupancy Monitor</h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span>Current Attendance</span>
                    <span className="font-mono text-amber-700 font-bold">
                      {activeEvent.currentOccupancy} / {activeEvent.capacity} spots
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-3.5 border border-slate-200 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (activeEvent.currentOccupancy / activeEvent.capacity) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[9px] text-emerald-800 font-extrabold block">GREEN</span>
                    <span className="text-sm font-extrabold text-emerald-700">{countAttended}</span>
                    <span className="text-[9px] text-emerald-600 block font-medium">Attended</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[9px] text-amber-800 font-extrabold block">YELLOW</span>
                    <span className="text-sm font-extrabold text-amber-700">{countLate}</span>
                    <span className="text-[9px] text-amber-600 block font-medium">Late Comers</span>
                  </div>
                  <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[9px] text-rose-800 font-extrabold block">RED</span>
                    <span className="text-sm font-extrabold text-rose-700">{countNotAttended}</span>
                    <span className="text-[9px] text-rose-600 block font-medium">Not Attended</span>
                  </div>
                </div>
              </div>
            )}

            {/* SCANNER INTEGRATION */}
            {activeEvent && (
              <Scanner
                onScanSuccess={handleScanSuccess}
                activeEventTitle={activeEvent.title}
              />
            )}

          </div>
        )}
      </div>

      {/* USN attendance table */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <span>USN Attendance Registry ({filteredRegistrations.length})</span>
            </h2>
            <p className="text-xs text-slate-500">Live participant tracking by USN, department, and arrival status</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={exportAttendanceCSV}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search USN or Student Name..."
              value={usnSearchTerm}
              onChange={(e) => setUsnSearchTerm(e.target.value)}
              className="w-full pl-3 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-600">Dept:</span>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="AIML">AIML</option>
              <option value="ISE">ISE</option>
              <option value="ECE">ECE</option>
              <option value="ME">ME</option>
            </select>
          </div>
        </div>

        {filteredRegistrations.length === 0 ? (
          <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs">
            No student registrations found for this USN search or filter.
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-mono font-bold">
                    <th className="px-6 py-4">USN</th>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-amber-700">{reg.studentUSN || 'MOCK_USN'}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{reg.studentName}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{reg.studentDepartment}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase shadow-xs ${
                          reg.status === 'checkedIn' 
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                          reg.status === 'late' 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          reg.status === 'checkedOut' 
                            ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                            'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          {reg.status === 'checkedIn' ? '🟢 Attended' :
                           reg.status === 'late' ? '🟡 Late Comers' :
                           reg.status === 'checkedOut' ? '⚪ Checked Out' :
                           '🔴 Not Attended'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-500">
                        {reg.checkInTime
                          ? new Date(reg.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '--:--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ============================================================================
// 3. STUDENT VIEW
// ============================================================================
function StudentDashboard({ user }) {
  const { events } = useEvents();
  const { getStudentRegistrations } = useAttendance();
  const [studentRegs, setStudentRegs] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(true);

  // Recommendations state
  const [recommendedEvents, setRecommendedEvents] = useState([]);

  // Active QR Modal
  const [activeQrToken, setActiveQrToken] = useState('');
  const [activeQrTitle, setActiveQrTitle] = useState('');

  const fetchStudentData = async () => {
    setLoadingRegs(true);
    try {
      const data = await getStudentRegistrations(user.uid);
      setStudentRegs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRegs(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  // Compute AI content-based recommendations
  useEffect(() => {
    if (events.length === 0) return;

    // Filter approved upcoming events
    const now = Date.now();
    const upcomingApproved = events.filter(e =>
      e.status === 'approved' &&
      new Date(e.startTime).getTime() > now &&
      !studentRegs.some(r => r.eventId === e.id)
    );

    // Filter past events student attended
    const studentPastEvents = events.filter(e =>
      studentRegs.some(r => r.eventId === e.id && (r.status === 'checkedIn' || r.status === 'late' || r.status === 'checkedOut'))
    );

    const recs = getRecommendations(user, upcomingApproved, studentPastEvents, 3);
    setRecommendedEvents(recs);
  }, [events, studentRegs, user]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* Registered Events list with QRs */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-amber-600" />
            <span>My Registered Events & Passes ({studentRegs.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Your official digital tickets with HMAC cryptographically signed QR passes</p>
        </div>

        {loadingRegs ? (
          <div className="text-center py-12 text-slate-500 font-mono text-sm">
            Retrieving event passes...
          </div>
        ) : studentRegs.length === 0 ? (
          <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs">
            You haven't registered for any events yet. Explore events on the home page!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {studentRegs.map(reg => {
              const event = events.find(e => e.id === reg.eventId);
              if (!event) return null;

              return (
                <div key={reg.id} className="p-6 rounded-2xl bg-white border border-amber-200/80 shadow-md flex flex-col justify-between space-y-4 hover:shadow-lg transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 border border-amber-300 text-amber-800 uppercase tracking-wide">
                        {event.category}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                        reg.status === 'checkedIn' 
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                        reg.status === 'late'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                        reg.status === 'checkedOut'
                          ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                          'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {reg.status === 'checkedIn' ? '🟢 Attended' : reg.status === 'late' ? '🟡 Late' : reg.status === 'checkedOut' ? '⚪ Checked Out' : '🎟️ Ticket Active'}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">{event.title}</h3>
                    <p className="text-xs text-slate-600 flex items-center font-medium">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-rose-500 flex-shrink-0" />
                      <span>{event.venue}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(event.startTime).toLocaleDateString()} at {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {reg.status === 'registered' ? (
                      <button
                        onClick={() => {
                          setActiveQrToken(reg.qrToken);
                          setActiveQrTitle(event.title);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-xs font-extrabold rounded-xl text-white flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>View Pass QR</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-extrabold font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        ✓ Check-in Recorded
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Content Recommendations */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>AI Recommendations</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Tailored event matches based on your profile & attendance</p>
        </div>

        {recommendedEvents.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-xs shadow-xs">
            No matches found. Add more interests to receive tailored event matching recommendations!
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[10px] text-slate-500 leading-relaxed font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              *Content-Based Cosine Similarity Vector matching your department ({user.department}) & interest tags ({user.interests?.join(', ') || 'General'}).
            </p>

            {recommendedEvents.map(event => (
              <div
                key={event.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 shadow-md relative overflow-hidden group space-y-3 transition-all"
              >
                {/* Match percentage pill */}
                <div className="absolute top-4 right-4 px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black rounded-full flex items-center space-x-1 shadow-xs">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>{event.matchPercentage}% Match</span>
                </div>

                <div className="space-y-1 pr-20">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase font-mono">
                    {event.category}
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 line-clamp-1 mt-1">{event.title}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{event.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                  <span>Starts: {new Date(event.startTime).toLocaleDateString()}</span>
                  <span className="text-amber-600 font-extrabold group-hover:translate-x-1 transition-transform">
                    View Details &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECURE QR CODE VIEW MODAL */}
      {activeQrToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-8 rounded-3xl bg-white border border-amber-200 shadow-2xl relative flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95">

            <div className="w-full flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Digital QR Ticket Pass</span>
              <button
                onClick={() => { setActiveQrToken(''); setActiveQrTitle(''); }}
                className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-lg leading-none w-6 h-6 flex items-center justify-center font-bold"
              >
                &times;
              </button>
            </div>

            <span className="text-sm font-extrabold text-slate-900 line-clamp-1">{activeQrTitle}</span>

            {/* Render unique secure QR token */}
            <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-md">
              <QRCodeSVG value={activeQrToken} size={180} />
            </div>

            <div className="text-xs text-slate-600 space-y-1 leading-relaxed">
              <p className="font-extrabold text-amber-700">HMAC-SHA256 Cryptographically Signed</p>
              <p className="text-[10px] text-slate-500 max-w-[220px] mx-auto">
                Present this digital pass to the event marshal for instant camera check-in verification.
              </p>
            </div>

            <button
              onClick={() => { setActiveQrToken(''); setActiveQrTitle(''); }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
