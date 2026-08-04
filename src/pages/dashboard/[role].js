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

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];
    const equipment = equipmentInput ? equipmentInput.split(',').map(e => e.trim().toLowerCase()).filter(Boolean) : [];

    const newEvent = {
      title,
      description,
      venue,
      facultyInCharge,
      startTime,
      endTime,
      capacity,
      category,
      department,
      tags,
      equipment,
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
                  <option value="Seminar Hall A">Seminar Hall A</option>
                  <option value="Seminar Hall B">Seminar Hall B</option>
                  <option value="Computer Lab 3">Computer Lab 3</option>
                  <option value="Auditorium">Auditorium</option>
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

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button" onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-xl text-white shadow-lg"
              >
                Propose Event
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

  const organizerEvents = events.filter(e => {
    // Show events assigned to this organizer, or all events if no specific in-charge is matching
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

  const filteredRegistrations = registrations.filter(r => {
    if (filterDept === 'all') return true;
    return r.studentDepartment === filterDept;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* Event Selection & Live Occupancy Chart */}
      <div className="space-y-6 lg:col-span-1">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center space-x-2">
          <Award className="w-5 h-5 text-cyan-400" />
          <span>My Assigned Events</span>
        </h2>

        {organizerEvents.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/10 border border-dashed border-white/5 rounded-2xl text-slate-500 text-xs">
            No approved events assigned to your faculty name.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Select Active Event</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-slate-200 text-sm focus:outline-none"
              >
                {organizerEvents.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>

            {activeEvent && (
              <div className="p-6 rounded-2xl glass-panel bg-slate-950/40 border border-white/5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200">Live Occupancy Monitor</h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Current Attendance</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {activeEvent.currentOccupancy} / {activeEvent.capacity} spots
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-900 rounded-full h-3.5 border border-white/5 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (activeEvent.currentOccupancy / activeEvent.capacity) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-2">
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-500 block">Total Registered</span>
                    <span className="text-base font-bold text-slate-200">{registrations.length}</span>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-500 block">Checked In</span>
                    <span className="text-base font-bold text-emerald-400">
                      {registrations.filter(r => r.status === 'checkedIn' || r.status === 'late').length}
                    </span>
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
          <h2 className="text-lg font-semibold text-slate-200 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-violet-400" />
            <span>USN Attendance Registry ({filteredRegistrations.length})</span>
          </h2>

          {/* Department Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Filter Dept:</span>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-2.5 py-1 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="CSE">CSE</option>
              <option value="ISE">ISE</option>
              <option value="ECE">ECE</option>
              <option value="ME">ME</option>
            </select>
          </div>
        </div>

        {filteredRegistrations.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/10 border border-dashed border-white/5 rounded-2xl text-slate-500 text-xs">
            No registrations found for this event or department.
          </div>
        ) : (
          <div className="rounded-2xl glass-panel bg-slate-950/40 border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-slate-400 uppercase tracking-wider font-mono">
                    <th className="px-6 py-4">USN</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Dept</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-slate-300">{reg.studentUSN || 'MOCK_USN'}</td>
                      <td className="px-6 py-4 font-medium text-slate-200">{reg.studentName}</td>
                      <td className="px-6 py-4 text-slate-400">{reg.studentDepartment}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${reg.status === 'checkedIn' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            reg.status === 'checkedOut' ? 'bg-slate-500/10 text-slate-400 border border-white/10' :
                              reg.status === 'late' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                          {reg.status === 'checkedIn' ? 'Attended' :
                            reg.status === 'checkedOut' ? 'Checked Out' :
                              reg.status === 'late' ? 'Checked In Late' :
                                'Absent'}
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
      // Filter out events the student has already registered for
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
        <h2 className="text-lg font-semibold text-slate-200 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-violet-400" />
          <span>My Registered Events ({studentRegs.length})</span>
        </h2>

        {loadingRegs ? (
          <div className="text-center py-12 text-slate-500 font-mono text-sm">
            Retrieving event passes...
          </div>
        ) : studentRegs.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/10 border border-dashed border-white/5 rounded-2xl text-slate-500 text-xs">
            You haven't registered for any events yet. Explore events on the home page!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {studentRegs.map(reg => {
              const event = events.find(e => e.id === reg.eventId);
              if (!event) return null;

              return (
                <div key={reg.id} className="p-6 rounded-2xl glass-panel bg-slate-950/40 border border-white/5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-600/10 border border-violet-500/20 text-violet-400 uppercase">
                        {event.category}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${reg.status === 'checkedIn' || reg.status === 'late' ? 'bg-emerald-500/10 text-emerald-400' :
                          reg.status === 'checkedOut' ? 'bg-slate-500/10 text-slate-400' :
                            'bg-violet-600/10 text-violet-400'
                        }`}>
                        {reg.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-200 line-clamp-1">{event.title}</h3>
                    <p className="text-xs text-slate-500 font-mono flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-rose-500" />
                      <span>{event.venue}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      {new Date(event.startTime).toLocaleDateString()} at {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {reg.status === 'registered' ? (
                      <button
                        onClick={() => {
                          setActiveQrToken(reg.qrToken);
                          setActiveQrTitle(event.title);
                        }}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-xs font-semibold rounded-xl text-white flex items-center space-x-1 transition-all duration-200"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>View Attendance QR</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold font-mono text-emerald-400">
                        Check-in Recorded
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
        <h2 className="text-lg font-semibold text-slate-200 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse-slow" />
          <span>AI Recommendations</span>
        </h2>

        {recommendedEvents.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/10 border border-white/5 rounded-2xl text-slate-500 text-xs">
            No matches found. Add more interests to receive tailored event matching recommendations!
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
              *Explainability: Content-based cosine vector similarity calculated using your department ({user.department}) and tags interest list ({user.interests.join(', ') || 'none'}).
            </p>

            {recommendedEvents.map(event => (
              <div
                key={event.id}
                className="p-5 rounded-2xl glass-panel bg-slate-950/40 border border-white/5 relative overflow-hidden group space-y-3"
              >
                {/* Match percentage pill */}
                <div className="absolute top-4 right-4 px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-[10px] font-bold rounded-lg flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{event.matchPercentage}% Match</span>
                </div>

                <div className="space-y-1 pr-16">
                  <span className="px-2 py-0.5 rounded text-[8px] font-semibold bg-violet-600/10 border border-violet-500/20 text-violet-400 uppercase font-mono">
                    {event.category}
                  </span>
                  <h4 className="text-sm font-bold text-slate-200 line-clamp-1 mt-1">{event.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{event.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] text-slate-500">
                  <span>Starts: {new Date(event.startTime).toLocaleDateString()}</span>
                  <span className="text-violet-400 font-semibold group-hover:translate-x-1 transition-transform">
                    View Details
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECURE QR CODE VIEW MODAL */}
      {activeQrToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm p-8 rounded-2xl glass-panel bg-slate-900 border border-white/10 shadow-2xl relative flex flex-col items-center text-center space-y-6">

            <div className="w-full flex justify-between items-center pb-2 border-b border-white/5">
              <span className="text-xs font-bold text-slate-200">Attendance QR Pass</span>
              <button
                onClick={() => { setActiveQrToken(''); setActiveQrTitle(''); }}
                className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <span className="text-sm font-semibold text-slate-200 line-clamp-1">{activeQrTitle}</span>

            {/* Render unique secure QR token */}
            <div className="p-3 bg-white rounded-xl shadow-inner">
              <QRCodeSVG value={activeQrToken} size={180} />
            </div>

            <div className="text-xs text-slate-400 space-y-1 leading-relaxed">
              <p className="font-semibold text-violet-400">Cryptographically Signed Pass</p>
              <p className="text-[10px] text-slate-500 max-w-[220px] mx-auto">
                This QR code contains an HMAC-signed token verified on the server. Please present this to the entry marshal.
              </p>
            </div>

            <button
              onClick={() => { setActiveQrToken(''); setActiveQrTitle(''); }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-300 transition-colors"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
