import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../hooks/useEvents';
import { useAttendance } from '../hooks/useAttendance';
import { QRCodeSVG } from 'qrcode.react';
import { Search, Calendar, MapPin, Users, Tag, Filter, CheckCircle2, ChevronRight, QrCode, Ticket, Layers, Sparkles, Trophy, ShieldCheck, ArrowUpRight, Flame, Terminal, Rocket, Music } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SOSCLogo, SynergiaLogo } from '../components/Logos';

export default function Home() {
  const { user } = useAuth();
  const { events, loading: eventsLoading } = useEvents();
  const { register } = useAttendance();
  const router = useRouter();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Selected Event Modal state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  // Load redirects or active QR events
  useEffect(() => {
    if (eventsLoading || events.length === 0) return;

    const { registerEvent, resolveActive, noActiveEvent, errorRedirect } = router.query;

    if (registerEvent) {
      const foundEvent = events.find(e => e.id === registerEvent);
      if (foundEvent) {
        setSelectedEvent(foundEvent);
      }
    } else if (resolveActive === 'true') {
      // Mock mode active redirect resolution
      const now = new Date().getTime();
      const active = events.find(e => {
        if (e.status !== 'approved') return false;
        const start = new Date(e.startTime).getTime();
        const end = new Date(e.endTime).getTime();
        return now >= start && now <= end;
      });

      if (active) {
        setSelectedEvent(active);
        showToast(`Dynamic QR resolved active event: ${active.title}`, 'success');
      } else {
        const upcoming = [...events]
          .filter(e => e.status === 'approved' && new Date(e.startTime).getTime() > now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        if (upcoming.length > 0) {
          setSelectedEvent(upcoming[0]);
          showToast(`No live events. Dynamic QR resolved next upcoming event: ${upcoming[0].title}`, 'info');
        } else {
          showToast('No approved active or upcoming events found.', 'warning');
        }
      }
    } else if (noActiveEvent === 'true') {
      showToast('No active events currently running.', 'warning');
    } else if (errorRedirect === 'true') {
      showToast('Redirect failed. Please browse events manually.', 'error');
    }

    if (router.query.scrollToEvents === 'true') {
      setTimeout(() => {
        const elem = document.getElementById('hot-events-section') || document.getElementById('events-explorer');
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
        }
      }, 250);
    }
  }, [router.query, events, eventsLoading]);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleRegister = async (eventId) => {
    if (!user) {
      // Redirect to login but keep the target event ID in query param
      router.push(`/login?registerEvent=${eventId}`);
      return;
    }

    setRegistering(true);
    try {
      const res = await register(eventId);
      showToast(`Registered successfully! Dynamic QR token generated.`, 'success');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setSelectedEvent(null);
    } catch (err) {
      showToast(err.message || 'Failed to register', 'error');
    } finally {
      setRegistering(false);
    }
  };

  const filteredEvents = events.filter(e => {
    if (e.status !== 'approved') return false;

    const matchesSearch = searchTerm === '' || 
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === 'all' || e.department === selectedDept;
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;

    return matchesSearch && matchesDept && matchesCategory;
  });

  const getAbsoluteRedirectUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/active-redirect`;
    }
    return 'http://localhost:3000/api/active-redirect';
  };

  return (
    <div className="space-y-12">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl border flex items-center space-x-2 shadow-2xl transition-all duration-300 animate-bounce ${
          toastType === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
          toastType === 'error' ? 'bg-rose-50 border-rose-300 text-rose-800' :
          toastType === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-800' :
          'bg-sky-50 border-sky-300 text-sky-800'
        }`}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Hero Welcome Section - Universal Campus Theme */}
      <section className="relative rounded-3xl bg-gradient-to-br from-white via-amber-50/40 to-emerald-50/30 p-8 md:p-12 overflow-hidden border border-amber-200/70 shadow-lg">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 border border-amber-300 text-amber-800 tracking-wide shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Universal Campus & University Event Platform</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Reimagining Campus <br className="hidden sm:inline" />
              <span className="text-amber-600">Events & Smart Attendance</span>
            </h1>
            
            <p className="text-slate-600 text-sm md:text-base leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
              Discover technical symposia, workshops, cultural fests, and guest lectures across Engineering, Arts, Management, and Science departments. Register seamlessly with dynamic digital QR passes.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={() => {
                  const elem = document.getElementById('hot-events-section') || document.getElementById('events-explorer');
                  elem?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md flex items-center space-x-2 cursor-pointer transition-all hover:scale-105"
              >
                <span>Explore Events</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              {!user && (
                <Link href="/login" className="px-6 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center space-x-2">
                  <span>Student & Faculty Portal</span>
                </Link>
              )}
            </div>
          </div>

          {/* Dynamic Static QR code poster */}
          <div className="p-6 rounded-2xl bg-white max-w-sm w-full border border-amber-200 shadow-xl flex flex-col items-center text-center relative group">
            <div className="absolute -top-3 bg-amber-500 text-white font-extrabold text-[10px] uppercase tracking-widest px-3 py-0.5 rounded-full shadow-md">
              Dynamic Pass Scanner
            </div>
            <div className="p-3 bg-white rounded-2xl my-3 border border-slate-100 shadow-inner transform transition-transform group-hover:scale-105">
              <QRCodeSVG value={getAbsoluteRedirectUrl()} size={150} />
            </div>
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 justify-center mb-1">
              <QrCode className="w-4 h-4 text-amber-600" />
              <span>Campus Dynamic QR Poster</span>
            </span>
            <p className="text-[10px] text-slate-500 max-w-[220px] leading-tight">
              Scans automatically redirect to `/api/active-redirect` to check-in or register for the currently running active event.
            </p>
          </div>
        </div>
      </section>

      {/* Most Hyped & Hot Campus Events Shortcuts */}
      <section id="hot-events-section" className="grid grid-cols-2 md:grid-cols-4 gap-4 scroll-mt-24">
        
        {/* 1. SYNERGIA Mega Fest */}
        <div 
          onClick={() => {
            setSelectedCategory('Flagship Fest');
            document.getElementById('events-explorer')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="p-5 rounded-2xl bg-white border border-amber-300 hover:border-amber-500 cursor-pointer shadow-xs hover:shadow-md transition-all group flex flex-col justify-between space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <SynergiaLogo className="h-7 py-1 px-2 text-[9px]" />
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 border border-amber-300 text-amber-800 uppercase tracking-wide">
              ★ Flagship
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <p className="text-base font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors">SYNERGIA 2025</p>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">₹7 Lakhs Cash Prizes & Air Show</p>
          </div>
        </div>

        {/* 2. SOSC & MSME Hackathons */}
        <div 
          onClick={() => {
            setSelectedCategory('Hackathons');
            document.getElementById('events-explorer')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="p-5 rounded-2xl bg-white border border-emerald-300 hover:border-emerald-500 cursor-pointer shadow-xs hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <SOSCLogo className="w-8 h-8" />
              <span className="text-xs font-bold text-slate-800">SOSC</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 border border-emerald-300 text-emerald-800 uppercase tracking-wide">
              🔥 SOSC Hacks
            </span>
          </div>
          <div>
            <p className="text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">Hackathons</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">Hacknight 24 & MSME 5.0 Grants</p>
          </div>
        </div>

        {/* 3. Aerophilia Tech Fest */}
        <div 
          onClick={() => {
            setSelectedCategory('Technical');
            document.getElementById('events-explorer')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="p-5 rounded-2xl bg-white border border-amber-300 hover:border-amber-500 cursor-pointer shadow-xs hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Rocket className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 border border-amber-300 text-amber-800 uppercase tracking-wide">
              ⚡ National
            </span>
          </div>
          <div>
            <p className="text-base font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors">Aerophilia 2025</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">Drone Racing & Bot Fights</p>
          </div>
        </div>

        {/* 4. Cultural Fest & Carnival */}
        <div 
          onClick={() => {
            setSelectedCategory('Cultural');
            document.getElementById('events-explorer')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="p-5 rounded-2xl bg-white border border-emerald-300 hover:border-emerald-500 cursor-pointer shadow-xs hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Music className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 border border-emerald-300 text-emerald-800 uppercase tracking-wide">
              🎉 Cultural
            </span>
          </div>
          <div>
            <p className="text-base font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">Carnival & Fests</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">Beat Blast & Market Verse</p>
          </div>
        </div>
      </section>

      {/* Main Event Explorer */}
      <section id="events-explorer" className="space-y-6 pt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-amber-600" />
              <span>Campus Approved Events</span>
            </h2>
            <p className="text-xs text-slate-500">Browse official campus events across all academic departments</p>
          </div>
          
          {/* Search Inputs */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
            <input
              type="text"
              placeholder="Search event title, venue or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-amber-500 shadow-xs"
            />
          </div>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <Filter className="w-4 h-4 text-amber-600 mr-1" />
          
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Departments</option>
            <option value="CSE">Computer Science (CSE)</option>
            <option value="AIML">CSE - AI & Machine Learning (AIML)</option>
            <option value="ISE">Information Science (ISE)</option>
            <option value="ECE">Electronics & Comm. (ECE)</option>
            <option value="ME">Mechanical Engineering (ME)</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Categories</option>
            <option value="Flagship Fest">🌟 Flagship Fest (Synergia)</option>
            <option value="Hackathons">💻 Hackathons (MSME & SOSC)</option>
            <option value="Seminars">🎓 Seminars & Quizzes</option>
            <option value="Technical">🚀 Technical Symposia</option>
            <option value="Cultural">💃 Cultural & Carnivals</option>
            <option value="Sports">🏃 Sports & Athletics</option>
            <option value="Alumni">🤝 Alumni & Networking</option>
          </select>
        </div>

        {/* Events Grid */}
        {eventsLoading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-sm">
            Loading events catalog...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl text-slate-500 text-sm">
            No approved events found matching your search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const start = new Date(event.startTime);
              const formattedDate = start.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              const formattedTime = start.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="rounded-2xl bg-white border border-slate-200 hover:border-amber-300 p-6 cursor-pointer flex flex-col justify-between space-y-4 shadow-sm hover:shadow-xl transition-all duration-300 relative group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 border border-amber-300 text-amber-800 uppercase tracking-wide">
                        {event.category}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {event.department}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
                      {event.title}
                    </h3>
                    
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />
                        <span className="line-clamp-1 font-medium">{event.venue}</span>
                      </div>
                      <div className="flex items-center space-x-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] text-amber-900 font-bold">
                        <Users className="w-3.5 h-3.5 text-amber-600" />
                        <span>{event.currentOccupancy}/{event.capacity}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>{formattedDate} at {formattedTime}</span>
                      <span className="flex items-center text-amber-700 font-bold group-hover:translate-x-1 transition-transform">
                        <span>Pass & Details</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-xl p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl relative space-y-6">
            
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 border border-amber-300 text-amber-800 uppercase tracking-wide">
                  {selectedEvent.category}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-2">{selectedEvent.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              >
                &times;
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              {selectedEvent.description}
            </p>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <div className="space-y-1">
                <span className="text-slate-500 block text-[11px]">Timings</span>
                <span className="font-semibold text-slate-900">
                  {new Date(selectedEvent.startTime).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block text-[11px]">Venue</span>
                <span className="font-bold text-amber-700">{selectedEvent.venue}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block text-[11px]">Faculty In Charge</span>
                <span className="font-semibold text-slate-900">{selectedEvent.facultyInCharge || 'Unassigned'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block text-[11px]">Department</span>
                <span className="font-bold text-emerald-700">{selectedEvent.department}</span>
              </div>
            </div>

            {selectedEvent.tags && selectedEvent.tags.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs text-slate-500">Event Tags:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEvent.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] text-amber-800 font-bold font-mono">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-600 flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                <span>Occupancy: <b className="text-slate-900">{selectedEvent.currentOccupancy}</b> / {selectedEvent.capacity} seats</span>
              </span>
              
              <button
                onClick={() => handleRegister(selectedEvent.id)}
                disabled={registering || selectedEvent.currentOccupancy >= selectedEvent.capacity}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 text-sm font-bold rounded-full shadow-md transition-all duration-200"
              >
                {registering 
                  ? 'Registering...' 
                  : selectedEvent.currentOccupancy >= selectedEvent.capacity 
                    ? 'Event Full' 
                    : user 
                      ? 'Register Pass' 
                      : 'Login to Register'
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
