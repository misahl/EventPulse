// src/components/RollingQRPoster.js
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, ShieldCheck, Clock, Zap } from 'lucide-react';
import { generateRollingEventToken } from '../lib/qrToken';

export default function RollingQRPoster({ event }) {
  const [token, setToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!event || !event.id) return;

    // Generate initial token
    const newToken = generateRollingEventToken(event.id, 'eventpulse-default-secret-key-12345', 30);
    setTimeout(() => {
      setToken(newToken);
      setTimeLeft(30);
    }, 0);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          const freshToken = generateRollingEventToken(event.id, 'eventpulse-default-secret-key-12345', 30);
          setToken(freshToken);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [event]);

  if (!event) return null;

  const progressPercent = ((30 - timeLeft) / 30) * 100;

  return (
    <div className="p-6 rounded-3xl bg-white border border-amber-200 shadow-xl space-y-4 text-center max-w-md mx-auto relative overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Live Event QR Check-In</span>
        </div>
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
      </div>

      <div>
        <h3 className="text-lg font-extrabold text-slate-900">{event.title}</h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{event.venue} &bull; {event.department}</p>
      </div>

      {/* QR Code Container */}
      <div className="relative p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
        {token && (
          <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200">
            <QRCodeSVG value={token} size={180} level="H" includeMargin={true} />
          </div>
        )}

        {/* Live Timer Indicator */}
        <div className="w-full space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span className="flex items-center space-x-1">
              <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
              <span>Token Rotates Every 30s</span>
            </span>
            <span className="font-mono text-amber-700 font-extrabold">{timeLeft}s remaining</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${100 - progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Security Badge */}
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center space-x-2 text-emerald-900 text-xs font-bold">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <span>Anti-Proxy Security: Screenshots & Shared Codes Expire Automatically</span>
      </div>
    </div>
  );
}
