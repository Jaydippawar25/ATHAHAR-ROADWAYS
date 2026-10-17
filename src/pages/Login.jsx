import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff, AlertCircle, RefreshCw, CheckCircle2, Truck } from 'lucide-react';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { user, loading, login, resetPassword } = useAuth();
  const navigate = useNavigate();

  // If already authenticated via Firebase Auth, redirect to dashboard
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setIsSubmitting(true);

    try {
      await login(username, password, remember);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Firebase Auth sign-in failed:', err);
      let message = 'Invalid email or password. Please verify your credentials.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        message = 'Invalid email or password. Please check your credentials.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (err.code === 'auth/user-disabled') {
        message = 'This account has been disabled. Please contact the administrator.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please wait a few minutes or reset your password.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Network error. Please verify your internet connection.';
      } else if (err.message) {
        message = err.message;
      }
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!username || !username.includes('@')) {
      setErrorMsg('Please enter your email address in the user name field first.');
      return;
    }
    setErrorMsg('');
    setInfoMsg('');
    setIsResetting(true);
    try {
      await resetPassword(username);
      setInfoMsg(`Password reset link sent to ${username}. Please check your inbox.`);
    } catch (err) {
      console.error('Password reset failed:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setErrorMsg('No user account found with this email address.');
      } else {
        setErrorMsg('Failed to send password reset email. Please try again later.');
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 flex items-center justify-center p-4 sm:p-6 select-none font-sans">
      {/* Main Login Card */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 min-h-[520px] relative border border-slate-200">
        
        {/* Left Column — Sign In Form */}
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-between bg-white z-10">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-extrabold tracking-widest uppercase text-[#1d4ed8] mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>ENTERPRISE PORTAL</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-6">
              Sign In to Godown
            </h2>

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* Success / Info Notification */}
            {infoMsg && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                <span className="font-semibold">{infoMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 max-w-sm">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase text-slate-600 tracking-wider">
                  Email Address
                </label>
                <div className="relative border border-slate-200 bg-slate-50/50 rounded-xl focus-within:border-[#1d4ed8] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all px-3 py-2.5 flex items-center space-x-2.5">
                  <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder="operator@atharvaroadways.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase text-slate-600 tracking-wider">
                  Password
                </label>
                <div className="relative border border-slate-200 bg-slate-50/50 rounded-xl focus-within:border-[#1d4ed8] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all px-3 py-2.5 flex items-center space-x-2.5">
                  <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full mt-2 bg-[#1d4ed8] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-70 text-white font-black py-3 px-6 rounded-xl text-xs shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Access Dashboard</span>
                )}
              </button>

              {/* Options */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-slate-300 text-[#1d4ed8] focus:ring-[#1d4ed8] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-slate-600">Keep me logged in</span>
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                  className="text-[#1d4ed8] hover:underline font-bold text-[11px] disabled:opacity-50 cursor-pointer"
                >
                  {isResetting ? 'Sending...' : 'Forgot password?'}
                </button>
              </div>
            </form>
          </div>

          {/* Copyright Footer */}
          <p className="text-[11px] text-slate-400 pt-8 font-normal">
            &copy; 2026 ATHARVA ROADWAYS. Cloud Transport ERP.
          </p>
        </div>

        {/* Right Column — Brand Card */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#0d2358] via-[#102d73] to-[#163a94] text-white p-8 sm:p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-300/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center space-y-4 max-w-xs">
            {/* Logo Badge */}
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
              <Truck className="w-8 h-8 text-sky-400" />
            </div>

            {/* Title */}
            <div>
              <h1 className="text-xl font-black tracking-tight text-white uppercase">
                ATHARVA ROADWAYS
              </h1>
              <p className="text-[10px] font-extrabold tracking-widest text-sky-300 uppercase mt-0.5">
                GODOWN MANAGEMENT SYSTEM
              </p>
            </div>

            {/* Address */}
            <div className="text-[11px] text-blue-100/80 font-medium leading-relaxed space-y-1 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10 w-full">
              <p className="text-white font-bold">HQ &amp; Godown Hub 01</p>
              <p>Next to Parvati Crane, Vakhar Bhag, Sangli - 416416</p>
              <p className="font-mono text-sky-300 pt-1 text-[10px]">
                TEL: 9370229449 / 9850329449
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
