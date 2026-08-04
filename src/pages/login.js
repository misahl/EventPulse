// src/pages/login.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, User, Hash, BookOpen, Layers, Award, Tag } from 'lucide-react';

export default function Login() {
  const { user, login, signUp, verifyOTP } = useAuth();
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [role, setRole] = useState('student');
  const [department, setDepartment] = useState('CSE');
  const [year, setYear] = useState('1');
  const [interestsInput, setInterestsInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [demoOTP, setDemoOTP] = useState('');

  // Redirect if already logged in and active
  useEffect(() => {
    if (user && user.status === 'active') {
      router.push(`/dashboard/${user.role}`);
    } else if (user && user.status === 'pending') {
      setIsVerifyingOTP(true);
      setEmail(user.email);
      if (user.otpCode) {
        setDemoOTP(user.otpCode);
        setOtpCode(user.otpCode);
      }
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      if (isVerifyingOTP) {
        // Handle OTP verification
        const activeUser = await verifyOTP(email, otpCode);
        setSuccessMsg('Account activated successfully! Redirecting...');
        setTimeout(() => {
          router.push(`/dashboard/${activeUser.role}`);
        }, 1200);
      } else if (isLogin) {
        // Handle Login
        const loggedInUser = await login(email, password);
        if (loggedInUser.status === 'pending') {
          setIsVerifyingOTP(true);
          if (loggedInUser.otpCode) {
            setDemoOTP(loggedInUser.otpCode);
            setOtpCode(loggedInUser.otpCode);
          }
          setSuccessMsg('Account pending activation! Code auto-filled below.');
        } else {
          router.push(`/dashboard/${loggedInUser.role}`);
        }
      } else {
        // Handle Sign Up
        const interests = interestsInput
          ? interestsInput.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean)
          : [];

        const profile = await signUp({
          email,
          password,
          name,
          usn: role === 'student' ? usn : '',
          role,
          department,
          year: role === 'student' ? year : '',
          interests
        });

        setIsVerifyingOTP(true);
        if (profile && profile.otpCode) {
          setDemoOTP(profile.otpCode);
          setOtpCode(profile.otpCode);
        }
        setSuccessMsg(`Registration successful! OTP code auto-filled below for instant verification.`);
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[75vh]">
      <div className="w-full max-w-lg p-8 rounded-3xl bg-white border border-amber-200/80 shadow-xl relative">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-amber-50 border border-amber-200 mb-3 shadow-xs">
            <ShieldCheck className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {isVerifyingOTP 
              ? 'Campus Account Verification' 
              : isLogin 
                ? 'Welcome Back to EventPulse' 
                : 'Create Campus Account'
            }
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {isVerifyingOTP 
              ? `Enter the 6-digit OTP code sent to ${email}` 
              : isLogin 
                ? 'Sign in to register and check in for campus events' 
                : 'Join EventPulse to track and explore events'
            }
          </p>
        </div>

        {/* Tab switcher (Login / Register) */}
        {!isVerifyingOTP && (
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 pb-3 text-sm font-bold transition-all duration-200 ${
                isLogin 
                  ? 'border-b-2 border-amber-500 text-amber-700' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 pb-3 text-sm font-bold transition-all duration-200 ${
                !isLogin 
                  ? 'border-b-2 border-amber-500 text-amber-700' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* OTP VERIFICATION VIEW */}
          {isVerifyingOTP && (
            <div className="space-y-4">
              
              {/* DEMO OTP AUTO-FILL HELPER CARD */}
              {demoOTP && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2 text-center shadow-xs">
                  <p className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center justify-center space-x-1">
                    <span>⚡ Local Demo Activation Code</span>
                  </p>
                  <div className="flex items-center justify-center space-x-3 pt-0.5">
                    <span className="text-2xl font-black font-mono tracking-widest text-amber-800 bg-white px-4 py-1 rounded-xl border border-amber-200 shadow-inner">
                      {demoOTP}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(demoOTP)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      Pre-Filled
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-slate-700 font-semibold">OTP Verification Code</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-amber-600">
                    <Hash className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-amber-300 rounded-2xl text-slate-900 text-base font-bold font-mono tracking-wider focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 mt-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-sm font-bold text-white shadow-md transition-all duration-200 cursor-pointer"
              >
                Verify & Activate Account
              </button>
              
              <button
                type="button"
                onClick={() => { setIsVerifyingOTP(false); setError(''); }}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Back to Authentication
              </button>
            </div>
          )}

          {/* LOGIN & SIGN UP FORM FIELDS */}
          {!isVerifyingOTP && (
            <>
              {/* Full Name (Sign Up only) */}
              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-amber-600">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs text-slate-700 font-semibold">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-amber-600">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="student@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs text-slate-700 font-semibold">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-amber-600">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Role Selection (Sign Up only) */}
              {!isLogin && (
                <div className="grid grid-cols-3 gap-2 py-1">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`py-2 px-3 text-xs font-bold rounded-2xl border transition-all ${
                      role === 'student'
                        ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('organizer')}
                    className={`py-2 px-3 text-xs font-bold rounded-2xl border transition-all ${
                      role === 'organizer'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Organizer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-3 text-xs font-bold rounded-2xl border transition-all ${
                      role === 'admin'
                        ? 'bg-rose-100 border-rose-300 text-rose-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Faculty Admin
                  </button>
                </div>
              )}

              {/* Student specific fields (Sign Up only) */}
              {!isLogin && role === 'student' && (
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold">Student ID / USN</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-amber-600">
                        <Hash className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. STU2026001"
                        value={usn}
                        onChange={(e) => setUsn(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold">Year</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-amber-600">
                        <Layers className="w-4 h-4" />
                      </span>
                      <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-amber-500"
                      >
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Shared Profile fields (Sign Up only) */}
              {!isLogin && (
                <div className="space-y-4 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold">Department</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-amber-600">
                        <BookOpen className="w-4 h-4" />
                      </span>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-amber-500"
                      >
                        <option value="CSE">Computer Science (CSE)</option>
                        <option value="AIML">CSE - AI & Machine Learning (AIML)</option>
                        <option value="CSE (AIML)">CSE (AIML)</option>
                        <option value="ISE">Information Science (ISE)</option>
                        <option value="ECE">Electronics & Communication (ECE)</option>
                        <option value="ME">Mechanical Engineering (ME)</option>
                      </select>
                    </div>
                  </div>

                  {role === 'student' && (
                    <div className="space-y-1">
                      <label className="text-xs text-slate-700 font-semibold">Interests (Comma separated)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-amber-600">
                          <Tag className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. AI, Web, Robotics, Python, Data Science"
                          value={interestsInput}
                          onChange={(e) => setInterestsInput(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                className={`w-full py-3 mt-4 rounded-full font-bold text-white shadow-md transition-all duration-300 ${
                  isLogin 
                    ? 'bg-amber-600 hover:bg-amber-700' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isLogin ? 'Sign In to Portal' : 'Register Account'}
              </button>
            </>
          )}

        </form>
      </div>
    </div>
  );
}
