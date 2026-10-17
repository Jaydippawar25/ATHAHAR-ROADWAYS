import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen bg-[#edf4f8] flex items-center justify-center p-4 sm:p-6 select-none font-sans">
      {/* Main Login Card */}
      <div className="bg-white rounded-[28px] shadow-2xl overflow-hidden w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 min-h-[520px] relative border border-slate-100">
        
        {/* Left Column — Sign In Form */}
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-between bg-white z-10">
          <div>
            <h2 className="text-3xl font-black text-[#1e295b] tracking-wider mb-6">
              SIGN IN
            </h2>

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Success / Info Notification */}
            {infoMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{infoMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 max-w-sm">
              {/* Username Input */}
              <div className="relative border-b border-slate-300 focus-within:border-[#1e295b] transition-colors py-2 flex items-center space-x-3">
                <User className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                />
              </div>

              {/* Password Input */}
              <div className="relative border-b border-slate-300 focus-within:border-[#1e295b] transition-colors py-2 flex items-center space-x-3">
                <Lock className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full mt-4 bg-[#1e295b] hover:bg-[#18214a] disabled:opacity-70 text-white font-bold py-3.5 px-6 rounded-xl text-sm shadow-md transition-all duration-200 active:scale-[0.99] flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </button>

              {/* Options */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-slate-300 text-[#1e295b] focus:ring-[#1e295b] w-4 h-4 cursor-pointer"
                  />
                  <span>Remember</span>
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                  className="text-[#1e295b] hover:underline font-bold text-xs disabled:opacity-50"
                >
                  {isResetting ? 'Sending Link...' : 'Forgot Password?'}
                </button>
              </div>
            </form>
          </div>

          {/* Copyright Footer */}
          <p className="text-[11px] text-slate-400 pt-8 font-normal">
            Copyright &copy;2026 ATHARVA ROADWAYS. All rights reserved.
          </p>
        </div>

        {/* Right Column — Brand Card (Dark Navy with decorative elements) */}
        <div className="md:col-span-5 bg-[#1b2456] text-white p-8 sm:p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
          
          {/* Background Decorative SVG Shapes */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 400 500" fill="none">
              <circle cx="350" cy="100" r="80" stroke="white" strokeWidth="2" />
              <circle cx="300" cy="400" r="120" stroke="white" strokeWidth="2" />
              <path d="M20 50 Q 50 20, 80 50 T 140 50" stroke="white" strokeWidth="3" fill="none" />
              <path d="M30 420 L50 450 L10 450 Z" stroke="white" strokeWidth="2" fill="none" />
              <text x="50" y="200" fill="white" fontSize="24" opacity="0.3">+</text>
              <text x="250" y="380" fill="white" fontSize="24" opacity="0.3">+</text>
            </svg>
          </div>

          <div className="relative z-10 flex flex-col items-center space-y-4 max-w-xs">
            {/* Logo Badge */}
            <div className="bg-[#2a3875] text-sky-400 font-black text-2xl px-5 py-4 rounded-2xl shadow-inner border border-sky-400/20">
              AR
            </div>

            {/* Title */}
            <h1 className="text-xl font-black tracking-wider text-white uppercase">
              ATHARVA ROADWAYS
            </h1>

            {/* Address */}
            <div className="text-[11px] text-sky-100 font-medium leading-relaxed space-y-1 opacity-90">
              <p>NEXT TO PARVATI CRANE, VAKHAR BHAG, SANGLI-416416</p>
              <p className="font-semibold text-sky-200">
                MOB NO. 9370229449 / 9850329449
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
