// src/components/Logos.js
import React from 'react';

/**
 * Official Main EventPulse Brand Logo Icon
 */
export function EventPulseMainLogo({ className = "w-10 h-10" }) {
  return (
    <div suppressHydrationWarning className={`inline-flex items-center justify-center p-1.5 rounded-2xl bg-slate-950 border border-amber-500/30 shadow-lg ${className}`}>
      <svg viewBox="0 0 120 120" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="eventPulseLogoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Outer Gap Ring */}
        <path 
          d="M 68 18 A 42 42 0 1 0 98 54" 
          fill="none" 
          stroke="url(#eventPulseLogoGrad)" 
          strokeWidth="11" 
          strokeLinecap="round" 
        />

        {/* Top-Right Sparkle Star */}
        <path 
          d="M 94 8 Q 94 22 108 22 Q 94 22 94 36 Q 94 22 80 22 Q 94 22 94 8 Z" 
          fill="url(#eventPulseLogoGrad)" 
        />

        {/* Central Compass Diamond */}
        <path 
          d="M 38 78 L 76 38 L 58 48 Z" 
          fill="url(#eventPulseLogoGrad)" 
        />
        <path 
          d="M 38 78 L 76 38 L 48 58 Z" 
          fill="#c2410c" 
        />
        <circle cx="57" cy="57" r="5" fill="#0f172a" />
      </svg>
    </div>
  );
}

/**
 * SOSC (Student Open Source Community) Logo Icon
 */
export function SOSCLogo({ className = "w-8 h-8" }) {
  return (
    <div className={`inline-flex items-center justify-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-sm ${className}`}>
      <svg viewBox="0 0 200 160" className="w-full h-full text-white fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M 60 40 C 40 40 30 55 30 70 C 30 85 45 95 65 95 C 85 95 100 80 100 65 C 100 50 115 40 135 40 C 155 40 170 55 170 75 C 170 95 150 110 125 110 C 105 110 90 95 90 80 C 90 65 75 55 55 55" fill="none" stroke="currentColor" strokeWidth="18" strokeLinecap="round"/>
        <text x="100" y="148" textAnchor="middle" fill="currentColor" fontFamily="monospace, sans-serif" fontWeight="900" fontSize="38" letterSpacing="4">SOSC</text>
      </svg>
    </div>
  );
}

/**
 * SYNERGIA Flagship Mega Fest Logo Icon & Badge
 */
export function SynergiaLogo({ className = "h-8" }) {
  return (
    <div className={`inline-flex items-center space-x-2.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 shadow-md ${className}`}>
      <svg viewBox="0 0 100 100" className="w-7 h-7 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M 20 80 Q 30 20 80 20" fill="none" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" />
        <path d="M 15 50 Q 50 10 85 50" fill="none" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
        <path d="M 20 20 Q 80 30 80 80" fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" />
        <path d="M 30 85 Q 70 85 85 30" fill="none" stroke="#ec4899" strokeWidth="6" strokeLinecap="round" />
        <path d="M 40 15 Q 85 50 40 85" fill="none" stroke="#a855f7" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <div className="flex flex-col text-left">
        <span className="text-white font-extrabold text-xs tracking-wider leading-none font-poppins">
          SYN<span className="text-amber-400">ERGIA</span>
        </span>
        <span className="text-[8px] text-amber-300 font-semibold tracking-widest uppercase mt-0.5">Flagship Fest</span>
      </div>
    </div>
  );
}
