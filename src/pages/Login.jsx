import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff, AlertCircle, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-[#EBF0F7] flex items-center justify-center p-3 sm:p-6 select-none font-sans relative overflow-hidden">
      {/* Background Soft Ambient Vignettes */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#3956D4]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[#EA580C]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card - Responsive max-w-md on mobile, split-card max-w-4xl on desktop */}
      <div className="bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl overflow-hidden w-full max-w-md lg:max-w-4xl min-h-0 lg:min-h-[560px] relative border border-[#DCE4F0] z-10 flex flex-col lg:flex-row">
        
        {/* DESKTOP 1:1 EXACT GRAPHIC BACKGROUND (Retina 2x Crisp) */}
        <div className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none z-0">
          <img
            src="/login-card-bg-v4.png"
            alt=""
            className="w-full h-full object-cover select-none pointer-events-none"
          />
        </div>

        {/* LEFT COLUMN: INTERACTIVE SIGN IN FORM */}
        <div className="w-full lg:w-[50%] p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative z-10 bg-white lg:bg-transparent">
          <div>
            {/* Top Logo & Enterprise Portal Badge */}
            <div className="flex items-center space-x-3 mb-5">
              <div
                className="rounded-2xl bg-white border border-slate-200 shadow-sm p-1 flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ width: '48px', height: '48px' }}
              >
                <img
                  src="/logo.png"
                  alt="ATHAHAR Logo"
                  style={{ width: '38px', height: '38px', objectFit: 'contain' }}
                />
              </div>
              <div>
                <div className="flex items-center space-x-1.5 text-[10px] font-black tracking-widest uppercase text-[#FF8A00]">
                  <span className="w-2 h-2 rounded-full bg-[#FF8A00] inline-block" />
                  <span>ENTERPRISE PORTAL</span>
                </div>
                <div className="text-xs font-black text-[#061944] tracking-tight uppercase">
                  ATHAHAR ROADWAYS
                </div>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-[28px] font-black text-[#061944] tracking-tight mb-1">
              Sign In to Godown
            </h2>
            <p className="text-xs text-slate-500 font-semibold mb-6">
              Safe &bull; On Time &bull; Always &mdash; Terminal Operating System
            </p>

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-[#CF1113]/30 text-[#CF1113] rounded-2xl text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#CF1113]" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* Success / Info Notification */}
            {infoMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                <span className="font-semibold">{infoMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm mx-auto lg:mx-0">
              {/* Operator Email Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase text-[#061944] tracking-wider">
                  OPERATOR EMAIL
                </label>
                <div className="relative bg-[#F0F4FA] border border-[#DCE4F0] rounded-2xl px-4 py-3 sm:py-3.5 flex items-center space-x-3 focus-within:border-[#FF8A00] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FF8A00]/20 transition-all shadow-inner">
                  <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder="atharva@admin.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full text-sm sm:text-xs font-bold text-[#061944] placeholder-slate-400 focus:outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase text-[#061944] tracking-wider">
                  ACCOUNT PASSWORD
                </label>
                <div className="relative bg-[#F0F4FA] border border-[#DCE4F0] rounded-2xl px-4 py-3 sm:py-3.5 flex items-center space-x-3 focus-within:border-[#FF8A00] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#FF8A00]/20 transition-all shadow-inner">
                  <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-sm sm:text-xs font-bold text-[#061944] placeholder-slate-400 focus:outline-none bg-transparent"
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

              {/* Vibrant Orange Gradient Login Button with Arrow */}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full mt-4 bg-gradient-to-r from-[#FF7A00] via-[#FF6A00] to-[#EA580C] hover:from-[#FF8A00] hover:to-[#C2410C] text-white font-black py-3.5 px-6 rounded-2xl text-sm shadow-lg shadow-orange-500/35 transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <div className="flex items-center space-x-2">
                    <ArrowRight className="w-4 h-4 text-white stroke-[2.5]" />
                    <span className="text-sm font-black tracking-wide">Login</span>
                  </div>
                )}
              </button>

              {/* Keep Me Logged In & Forgot Password */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs pt-2">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded text-[#EA580C] focus:ring-[#EA580C] accent-[#EA580C] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">Keep me logged in</span>
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                  className="text-xs font-bold text-[#EA580C] hover:text-[#C2410C] hover:underline cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? 'Sending link...' : 'Forgot password?'}
                </button>
              </div>
            </form>
          </div>

          {/* Footer: Terminal Info on Mobile & Copyright */}
          <div className="pt-6 sm:pt-7 mt-4 border-t border-slate-100 lg:border-none space-y-1.5">
            <div className="lg:hidden text-[11px] text-slate-600 font-medium text-center space-y-0.5 pb-1">
              <p className="font-extrabold text-[#061944] tracking-tight">HQ &amp; Godown Hub 01 &bull; Vakhar Bhag, Sangli - 416416</p>
              <p className="font-mono text-[10.5px] text-slate-500 font-bold">TEL.: 9370229449 / 9850329449</p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium text-center lg:text-left">
              &copy; 2026 ATHAHAR ROADWAYS. Cloud Transport ERP.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: CRYSTAL-CLEAR BRAND INFORMATION PANEL & HIGHWAY FLEET (Desktop Only) */}
        <div className="hidden lg:flex lg:w-[48%] lg:ml-auto flex-col justify-between items-center text-center relative z-10 pt-7 sm:pt-9 text-white overflow-hidden">
          {/* Brand Presentation with Crisp Vector Typography & High-Res Logo */}
          <div className="flex flex-col items-center px-6 relative z-20">
            {/* White Squircle Logo Card */}
            <div
              className="rounded-3xl bg-white p-3.5 flex items-center justify-center shadow-2xl mx-auto ring-4 ring-white/10 overflow-hidden"
              style={{ width: '108px', height: '108px' }}
            >
              <img
                src="/logo.png"
                alt="ATHAHAR ROADWAYS"
                style={{ width: '84px', height: '84px', objectFit: 'contain' }}
              />
            </div>

            {/* Crisp Title */}
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase mt-3.5 drop-shadow-sm">
              ATHAHAR ROADWAYS
            </h1>

            {/* Pill Badge */}
            <div className="inline-block mt-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#EA580C] text-white text-xs font-black shadow-lg shadow-orange-500/25 uppercase tracking-wider">
              Safe &bull; On Time &bull; Always
            </div>

            {/* Hairline Divider */}
            <div className="w-16 h-0.5 bg-white/20 my-3 mx-auto rounded-full" />

            {/* Godown Hub & Contact Information */}
            <div className="space-y-0.5 text-center">
              <p className="text-white font-black text-xs sm:text-sm tracking-wide">
                HQ &amp; Godown Hub 01
              </p>
              <p className="text-blue-100/90 text-[11px] sm:text-xs font-medium leading-tight max-w-[260px] mx-auto">
                Next to Parvati Crane, Vakhar Bhag, Sangli - 416416
              </p>
              <p className="text-white font-mono text-xs font-bold tracking-tight pt-1">
                TEL.: 9370229449 / 9850329449
              </p>
            </div>
          </div>

          {/* Desktop Spacer: Truck is seamlessly part of /login-card-bg-v4.png background, perfectly clipped to the curve with zero steps or protrusion */}
          <div className="h-36 sm:h-44 w-full pointer-events-none" />
        </div>

      </div>
    </div>
  );
};
