import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  Check,
  Lock,
  Mail,
  UserPlus,
  KeyRound,
  Trash2,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateUtils';

const OPERATORS_STORAGE_KEY = 'atharva_operators_registry';

export const Settings = () => {
  const { user, changePassword, changeEmail, createOperatorUser, resetPassword } = useAuth();

  // Notification states
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [emailNotice, setEmailNotice] = useState(null);
  const [userNotice, setUserNotice] = useState(null);

  // Loading states
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Form states - Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states - Email
  const [newEmail, setNewEmail] = useState('');

  // Form states - Add User
  const [newUserForm, setNewUserForm] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'Godown Operator',
  });
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);

  // Operators List
  const [operatorsList, setOperatorsList] = useState(() => {
    try {
      const saved = localStorage.getItem(OPERATORS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        uid: user?.uid || 'admin-01',
        displayName: user?.displayName || 'Principal Administrator',
        email: user?.email || 'admin@atharvaroadways.com',
        role: 'Administrator',
        createdAt: new Date().toISOString(),
        isSuperAdmin: true,
      },
    ];
  });

  // Sync current user into operators list if not present
  useEffect(() => {
    if (user?.email) {
      setOperatorsList((prev) => {
        const exists = prev.some((op) => op.email.toLowerCase() === user.email.toLowerCase());
        if (!exists) {
          const updated = [
            {
              uid: user.uid,
              displayName: user.displayName || 'Administrator',
              email: user.email,
              role: 'Administrator',
              createdAt: new Date().toISOString(),
              isSuperAdmin: true,
            },
            ...prev,
          ];
          localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  }, [user]);

  // Save operators list to localStorage
  const saveOperators = (list) => {
    setOperatorsList(list);
    try {
      localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save operators registry:', e);
    }
  };

  // 1. Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordNotice(null);

    if (newPassword.length < 6) {
      setPasswordNotice({
        type: 'error',
        message: 'Password must be at least 6 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({
        type: 'error',
        message: 'New password and confirmation password do not match.',
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await changePassword(newPassword);
      setIsUpdatingPassword(false);
      setPasswordNotice({
        type: 'success',
        message: 'Password successfully updated! Use your new password on next login.',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setIsUpdatingPassword(false);
      console.error('Password update error:', err);
      let msg = err.message || 'Failed to update password.';
      if (err.code === 'auth/requires-recent-login') {
        msg = 'This operation is sensitive and requires recent login. Please log out and sign back in, or use the reset password link.';
      }
      setPasswordNotice({
        type: 'error',
        message: msg,
      });
    }
  };

  // Quick Password Reset Link
  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    setIsUpdatingPassword(true);
    setPasswordNotice(null);
    try {
      await resetPassword(user.email);
      setIsUpdatingPassword(false);
      setPasswordNotice({
        type: 'success',
        message: `A password reset link has been dispatched to ${user.email}. Check your inbox or spam folder.`,
      });
    } catch (err) {
      setIsUpdatingPassword(false);
      setPasswordNotice({
        type: 'error',
        message: err.message || 'Failed to send reset link.',
      });
    }
  };

  // 2. Handle Change Email
  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setEmailNotice(null);

    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setEmailNotice({
        type: 'error',
        message: 'Please enter a valid email address.',
      });
      return;
    }

    if (cleanEmail === user?.email?.toLowerCase()) {
      setEmailNotice({
        type: 'error',
        message: 'New email must be different from your current email.',
      });
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const res = await changeEmail(cleanEmail);
      setIsUpdatingEmail(false);
      if (res?.verifySent) {
        setEmailNotice({
          type: 'success',
          message: `Verification link sent to ${cleanEmail}. Please click the verification link to complete the change.`,
        });
      } else {
        setEmailNotice({
          type: 'success',
          message: `Email successfully updated to ${cleanEmail}!`,
        });
      }
      setNewEmail('');
    } catch (err) {
      setIsUpdatingEmail(false);
      console.error('Email update error:', err);
      let msg = err.message || 'Failed to update email address.';
      if (err.code === 'auth/requires-recent-login') {
        msg = 'Changing email requires recent authentication. Please sign out, log back in, and try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already in use by another account.';
      }
      setEmailNotice({
        type: 'error',
        message: msg,
      });
    }
  };

  // 3. Handle Add New User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserNotice(null);

    const { displayName, email, password, role } = newUserForm;
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setUserNotice({
        type: 'error',
        message: 'Please provide a valid operator email address.',
      });
      return;
    }

    if (password.length < 6) {
      setUserNotice({
        type: 'error',
        message: 'Initial password must be at least 6 characters.',
      });
      return;
    }

    const alreadyExists = operatorsList.some(
      (op) => op.email.toLowerCase() === cleanEmail
    );
    if (alreadyExists) {
      setUserNotice({
        type: 'error',
        message: 'An operator with this email is already registered.',
      });
      return;
    }

    setIsCreatingUser(true);
    try {
      const createdUser = await createOperatorUser(
        cleanEmail,
        password,
        displayName.trim() || cleanEmail.split('@')[0],
        role
      );

      const updatedList = [
        ...operatorsList,
        {
          uid: createdUser.uid,
          displayName: createdUser.displayName,
          email: createdUser.email,
          role: createdUser.role,
          createdAt: createdUser.createdAt,
          isSuperAdmin: false,
        },
      ];

      saveOperators(updatedList);
      setIsCreatingUser(false);
      setUserNotice({
        type: 'success',
        message: `Operator account "${cleanEmail}" created successfully in Firebase Auth!`,
      });

      setNewUserForm({
        displayName: '',
        email: '',
        password: '',
        role: 'Godown Operator',
      });
    } catch (err) {
      setIsCreatingUser(false);
      console.error('Create user error:', err);
      let msg = err.message || 'Failed to create operator user.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists in Firebase Auth.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      }
      setUserNotice({
        type: 'error',
        message: msg,
      });
    }
  };

  // Delete Operator
  const handleDeleteOperator = (emailToDelete) => {
    if (emailToDelete.toLowerCase() === user?.email?.toLowerCase()) {
      alert('You cannot delete your own currently active administrator account.');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to remove access for operator "${emailToDelete}"?`
    );
    if (!confirmed) return;

    const filtered = operatorsList.filter(
      (op) => op.email.toLowerCase() !== emailToDelete.toLowerCase()
    );
    saveOperators(filtered);
    setUserNotice({
      type: 'success',
      message: `Access revoked for operator "${emailToDelete}".`,
    });
  };

  // Send Reset Link to Operator
  const handleSendResetToOperator = async (opEmail) => {
    try {
      await resetPassword(opEmail);
      setUserNotice({
        type: 'success',
        message: `Password reset link dispatched to ${opEmail}.`,
      });
    } catch (err) {
      setUserNotice({
        type: 'error',
        message: err.message || 'Failed to dispatch reset link.',
      });
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* ROYAL NAVY HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d2358] via-[#102d73] to-[#163a94] p-6 text-white shadow-lg border border-blue-900/40">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-extrabold tracking-widest uppercase text-sky-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>OPERATOR SECURITY &amp; ACCESS CONTROL</span>
              <span className="text-blue-200/50">•</span>
              <span className="text-blue-100 font-mono">AUTH GOVERNANCE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Account &amp; User Access Settings
            </h1>
            <p className="text-xs text-blue-100/80 mt-1 max-w-xl">
              Change administrator password, update account login email, and provision new user accounts with role-based access.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. CHANGE PASSWORD CARD */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Change Password</h3>
                  <p className="text-xs text-slate-400">Update your current account credentials</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={isUpdatingPassword}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                title="Send a secure password reset link to your registered email"
              >
                <Send className="w-3 h-3 text-[#1d4ed8]" />
                <span>Email Reset Link</span>
              </button>
            </div>

            {passwordNotice && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-start space-x-2 border ${
                  passwordNotice.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {passwordNotice.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <span>{passwordNotice.message}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                  Confirm New Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full py-2.5 bg-[#1d4ed8] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isUpdatingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            Passwords must contain at least 6 characters. If logged in for a long duration, re-login may be requested by Firebase for security.
          </div>
        </div>

        {/* 2. UPDATE EMAIL CARD */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1d4ed8]">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Update Login Email</h3>
                <p className="text-xs text-slate-400">Change your primary login and alert email</p>
              </div>
            </div>

            {emailNotice && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-start space-x-2 border ${
                  emailNotice.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {emailNotice.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <span>{emailNotice.message}</span>
              </div>
            )}

            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1.5">
                  Current Email
                </label>
                <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700">
                  {user?.email || 'admin@atharvaroadways.com'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                  New Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. newoperator@atharvaroadways.com"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingEmail}
                  className="w-full py-2.5 bg-[#1d4ed8] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isUpdatingEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Email...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Save New Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            A confirmation link will be delivered to the new address to complete verification.
          </div>
        </div>

        {/* 3. ADD NEW USER / OPERATOR PROVISIONING CARD */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Add New Operator / User Account
                </h3>
                <p className="text-xs text-slate-400">
                  Provision new employee logins with Firebase Auth credentials
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-400">
              Total Active Logins: <span className="text-[#1d4ed8] font-black">{operatorsList.length}</span>
            </span>
          </div>

          {userNotice && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-start space-x-2 border ${
                userNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {userNotice.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <span>{userNotice.message}</span>
            </div>
          )}

          {/* Form to Create New Operator */}
          <form
            onSubmit={handleCreateUser}
            className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end"
          >
            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                Full Name / Identifier *
              </label>
              <input
                type="text"
                required
                value={newUserForm.displayName}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, displayName: e.target.value })
                }
                placeholder="e.g. Ramesh Patil"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                Operator Email *
              </label>
              <input
                type="email"
                required
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="ramesh@atharvaroadways.com"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#1d4ed8]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                Initial Password *
              </label>
              <div className="relative">
                <input
                  type={showNewUserPassword ? 'text' : 'password'}
                  required
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, password: e.target.value })
                  }
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 pr-9 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#1d4ed8]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewUserPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                Role &amp; Permissions
              </label>
              <select
                value={newUserForm.role}
                onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#1d4ed8]"
              >
                <option value="Godown Operator">Godown Operator</option>
                <option value="Billing Staff">Billing Staff</option>
                <option value="Dispatch Supervisor">Dispatch Supervisor</option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>

            <div className="sm:col-span-2 md:col-span-4 flex justify-end pt-1">
              <button
                type="submit"
                disabled={isCreatingUser}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                {isCreatingUser ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Account in Firebase...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Operator Account</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Registered Users Directory */}
          <div className="pt-2">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2.5">
              Authorized Users Registry
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead className="bg-[#0d2358] text-white">
                  <tr className="text-[10px] uppercase font-extrabold tracking-wider">
                    <th className="py-2.5 px-3">Operator Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Date Added</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {operatorsList.map((op, idx) => (
                    <tr key={op.uid || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">
                        {op.displayName || 'Operator'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                        {op.email}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-[#1d4ed8] border border-blue-200">
                          {op.role || 'Operator'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-medium">
                        {formatDate(op.createdAt)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> ACTIVE
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleSendResetToOperator(op.email)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Send Password Reset Email"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          {!op.isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteOperator(op.email)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Revoke User Access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 4. ACTIVE OPERATOR SESSION INFO */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3 text-xs uppercase tracking-wider">
            <Users className="w-4 h-4 text-[#1d4ed8]" />
            <span>Active Operator Session</span>
          </h3>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500 uppercase text-[10px]">OPERATOR UID</span>
              <span className="font-mono text-slate-900 font-bold">{user?.uid || 'local-operator'}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500 uppercase text-[10px]">OPERATOR EMAIL</span>
              <span className="font-bold text-slate-900">{user?.email || 'admin@atharvaroadways.com'}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-500 uppercase text-[10px]">ACCOUNT STATUS</span>
              <span className="bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full text-[10px]">
                AUTHENTICATED
              </span>
            </div>
          </div>
        </div>

        {/* 5. BUSINESS RULE CHECKLIST */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3 text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Critical Business Guardrails</span>
          </h3>

          <div className="space-y-2.5 text-xs font-semibold text-slate-700">
            <div className="flex items-center space-x-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>LR No. manually accepted from client document (Never auto-generated).</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Duplicate LR entries in Pending Stock are strictly blocked.</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Outward requires selecting an existing PENDING stock LR.</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Cross Stock-Out works as independent manual dispatch.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
