// src/pages/_app.js
import "@/styles/globals.css";
import { AuthProvider } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Head from 'next/head';
import { Mail, Phone, Award, ShieldCheck, Sparkles } from 'lucide-react';
import { EventPulseMainLogo } from '../components/Logos';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <title>EventPulse | Universal Campus Event & Attendance Platform</title>
        <meta name="description" content="Universal Campus Event Management & Attendance Platform — Dynamic QR Registration, AI Interest Recommendations, and HMAC Pass Verification." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-poppins">
        {/* Top Announcement Bar */}
        <div className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white text-xs py-2 px-6 shadow-sm hidden lg:block">
          <div className="max-w-7xl mx-auto flex items-center justify-between font-medium">
            <div className="flex items-center space-x-6">
              <a href="mailto:support@campus-eventpulse.edu" className="flex items-center space-x-1.5 hover:text-amber-100 transition-colors">
                <Mail className="w-3.5 h-3.5" />
                <span>support@campus-eventpulse.edu</span>
              </a>
              <span className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>Campus Helpline Support</span>
              </span>
              <span className="text-amber-300">|</span>
              <span className="flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Instant Digital QR Passes & Real-Time Event Management</span>
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1 bg-white/20 px-3 py-0.5 rounded-full text-[11px] font-bold">
                <Award className="w-3 h-3 text-amber-200" />
                <span>Multi-College & University Ready</span>
              </span>
              <span className="flex items-center space-x-1 bg-emerald-700/40 text-emerald-100 px-3 py-0.5 rounded-full text-[11px] font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Attendance Security</span>
              </span>
            </div>
          </div>
        </div>

        <Navbar />
        
        <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
          <Component {...pageProps} />
        </main>

        <footer className="w-full bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500 shadow-inner">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <EventPulseMainLogo className="w-9 h-9" />
              <div className="text-left">
                <p className="font-bold text-slate-800 text-sm">EventPulse Campus Network</p>
                <p className="text-xs text-slate-500">Universal Event Registration & Cryptographic Attendance Management</p>
              </div>
            </div>
            <div className="text-slate-500 text-center md:text-right">
              <p>&copy; {new Date().getFullYear()} EventPulse Platform. Built for Higher Education Institutions & Universities.</p>
              <p className="mt-1 text-[11px] text-amber-700 font-semibold">Supporting Engineering, Management, Arts, Science & Professional Colleges</p>
            </div>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}


