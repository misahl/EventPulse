// src/components/Navbar.js
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { isMock, isMailMock } from '../firebase/config';
import { Calendar, LogOut, QrCode, ShieldAlert, Award, Activity } from 'lucide-react';
import { SOSCLogo, SynergiaLogo, EventPulseMainLogo } from './Logos';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleExploreEvents = (e) => {
    e.preventDefault();
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
    <nav className="sticky top-0 z-50 w-full px-6 py-3.5 backdrop-blur-md border-b border-amber-200/60 bg-white/90 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Community Crests */}
        <Link href="/" className="flex items-center space-x-3.5 group">
          <EventPulseMainLogo className="w-10 h-10 transform transition-transform group-hover:scale-105" />
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-tight text-slate-800 group-hover:text-amber-600 transition-colors">
                Event<span className="text-amber-600">Pulse</span>
              </span>
              {isMock && (
                <span 
                  className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-100 border border-amber-300 text-amber-800 uppercase tracking-widest animate-pulse-slow"
                  title="Running in local storage mock database mode"
                >
                  Mock DB
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide">Campus Event & Attendance System</span>
          </div>

          <div className="hidden xl:flex items-center space-x-2 pl-3 border-l border-slate-200">
            <SynergiaLogo className="h-7 py-1 px-2.5 text-[10px]" />
            <SOSCLogo className="w-7 h-7" />
          </div>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-6">
          <button 
            onClick={handleExploreEvents}
            className={`text-sm font-semibold transition-colors hover:text-amber-600 flex items-center space-x-1.5 cursor-pointer ${
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
                className={`text-sm font-semibold transition-colors hover:text-amber-600 flex items-center space-x-1.5 ${
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
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-800">{user.name}</span>
                  <span className="text-xs text-amber-700 font-mono capitalize">{user.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all duration-200"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <Link 
              href="/login" 
              className="px-5 py-2 rounded-full campus-btn-primary text-sm font-bold shadow-md hover:shadow-amber-500/20 transition-all duration-200 flex items-center space-x-1.5"
            >
              <span>Portal Login</span>
            </Link>
          )}

        </div>
      </div>
    </nav>
  );
}
