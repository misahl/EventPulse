// src/components/Navbar.js
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { isMock } from '../firebase/config';
import { Calendar, LogOut, QrCode, ShieldAlert, Award, Menu, X } from 'lucide-react';
import { SOSCLogo, SynergiaLogo, EventPulseMainLogo } from './Logos';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    router.push('/login');
  };

  const handleExploreEvents = (e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (router.pathname === '/') {
      const elem = document.getElementById('hot-events-section') || document.getElementById('events-explorer');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      router.push('/?scrollToEvents=true');
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full px-4 sm:px-6 py-3 backdrop-blur-md border-b border-amber-200/60 bg-white/95 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Community Crests */}
        <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center space-x-2.5 sm:space-x-3.5 group">
          <EventPulseMainLogo className="w-8 h-8 sm:w-10 sm:h-10 transform transition-transform group-hover:scale-105" />
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-800 group-hover:text-amber-600 transition-colors">
                Event<span className="text-amber-600">Pulse</span>
              </span>
              {isMock && (
                <span 
                  className="px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold bg-amber-100 border border-amber-300 text-amber-800 uppercase tracking-widest"
                  title="Running in local storage mock database mode"
                >
                  Mock DB
                </span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium tracking-wide">Campus Event & Attendance System</span>
          </div>

          <div className="hidden xl:flex items-center space-x-2 pl-3 border-l border-slate-200">
            <SynergiaLogo className="h-7 py-1 px-2.5 text-[10px]" />
            <SOSCLogo className="w-7 h-7" />
          </div>
        </Link>

        {/* Desktop Navigation Actions */}
        <div className="hidden md:flex items-center space-x-6">
          <button 
            onClick={handleExploreEvents}
            className={`text-sm font-semibold transition-colors hover:text-amber-600 flex items-center space-x-1.5 cursor-pointer min-h-[44px] px-2 ${
              router.pathname === '/' ? 'text-amber-600 font-bold' : 'text-slate-600'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Explore Events</span>
          </button>

          {user ? (
            <>
              {/* Dashboard Link based on Role */}
              <Link 
                href={`/dashboard/${user.role}`} 
                className={`text-sm font-semibold transition-colors hover:text-amber-600 flex items-center space-x-1.5 min-h-[44px] px-2 ${
                  router.pathname.startsWith('/dashboard') ? 'text-amber-600 font-bold' : 'text-slate-600'
                }`}
              >
                {user.role === 'admin' && <ShieldAlert className="w-4 h-4 text-amber-600" />}
                {user.role === 'organizer' && <Award className="w-4 h-4 text-amber-600" />}
                {user.role === 'student' && <QrCode className="w-4 h-4 text-emerald-600" />}
                <span className="capitalize">{user.role} Portal</span>
              </Link>

              {/* User Badge / Sign Out */}
              <div className="flex items-center space-x-4 border-l border-slate-200 pl-6">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-800">{user.name}</span>
                  <span className="text-xs text-amber-700 font-mono capitalize">{user.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <Link 
              href="/login" 
              className="min-h-[44px] px-5 py-2.5 rounded-full campus-btn-primary text-sm font-bold shadow-md hover:shadow-amber-500/20 transition-all flex items-center justify-center space-x-1.5"
            >
              <span>Portal Login</span>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-amber-50 focus:outline-none flex items-center justify-center cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-amber-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
          </button>
        </div>

      </div>

      {/* Mobile Collapsible Navigation Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-slate-200 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <button 
            onClick={handleExploreEvents}
            className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl text-left text-sm font-semibold flex items-center space-x-2.5 cursor-pointer ${
              router.pathname === '/' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Explore Events</span>
          </button>

          {user ? (
            <>
              <Link 
                href={`/dashboard/${user.role}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl text-left text-sm font-semibold flex items-center space-x-2.5 ${
                  router.pathname.startsWith('/dashboard') ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {user.role === 'admin' && <ShieldAlert className="w-4 h-4 text-amber-600" />}
                {user.role === 'organizer' && <Award className="w-4 h-4 text-amber-600" />}
                {user.role === 'student' && <QrCode className="w-4 h-4 text-emerald-600" />}
                <span className="capitalize">{user.role} Portal</span>
              </Link>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between mt-2">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">{user.name}</span>
                  <span className="text-xs text-amber-700 font-mono capitalize">{user.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="min-h-[44px] px-3.5 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)}
              className="w-full min-h-[44px] px-4 py-3 rounded-xl campus-btn-primary text-sm font-bold shadow-md flex items-center justify-center space-x-2"
            >
              <span>Portal Login</span>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
