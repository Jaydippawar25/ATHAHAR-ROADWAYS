import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("atharva@admin.com");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
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

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setErrorMsg("Please enter email and password");
      return;
    }

    setErrorMsg("");
    setInfoMsg("");
    setIsSubmitting(true);

    try {
      await login(email, password, remember);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error("Firebase Auth sign-in failed:", err);
      let message = "Invalid email or password. Please verify your credentials.";
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        message = "Invalid email or password. Please check your credentials.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (err.code === "auth/user-disabled") {
        message = "This account has been disabled. Please contact the administrator.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many failed login attempts. Please wait a few minutes or reset your password.";
      } else if (err.code === "auth/network-request-failed") {
        message = "Network error. Please verify your internet connection.";
      } else if (err.message) {
        message = err.message;
      }
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter your email address in the operator email field first.");
      return;
    }
    setErrorMsg("");
    setInfoMsg("");
    setIsResetting(true);
    try {
      await resetPassword(email);
      setInfoMsg(`Password reset link sent to ${email}. Please check your inbox.`);
    } catch (err) {
      console.error("Password reset failed:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setErrorMsg("No user account found with this email address.");
      } else {
        setErrorMsg("Failed to send password reset email. Please try again later.");
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">

        {/* LEFT SIDE */}
        <section className="auth-form-panel">

          <div className="auth-brand">
            <div className="small-logo">
              <img 
                src="/assets/atharva-logo.png" 
                alt="Logo" 
                onError={(e) => { e.currentTarget.src = "/logo.png"; }}
              />
            </div>

            <div className="brand-details">
              <div className="portal-text">
                <span className="green-dot"></span>
                ENTERPRISE PORTAL
              </div>
              <h3>ATHAHAR ROADWAYS</h3>
            </div>
          </div>

          <div className="form-heading">
            <h1>Sign In to Godown</h1>
            <p>
              Safe • On Time • Always — Terminal Operating System
            </p>
          </div>

          {/* Error & Info Feedback */}
          {errorMsg && (
            <div className="auth-alert-error">
              <span>⚠</span> {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="auth-alert-info">
              <span>✓</span> {infoMsg}
            </div>
          )}

          <form onSubmit={handleLogin}>

            <div className="auth-field">
              <label>OPERATOR EMAIL</label>
              <div className="auth-input">
                <span>👤</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label>ACCOUNT PASSWORD</label>
              <div className="auth-input password-input">
                <span>🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "👁"}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-login-btn" disabled={isSubmitting || loading}>
              <span>{isSubmitting ? "⏳" : "➜"}</span> {isSubmitting ? "Logging in..." : "Login"}
            </button>

            <div className="auth-options">
              <label>
                <input 
                  type="checkbox" 
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Keep me logged in
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResetting}
                className="forgot-link"
              >
                {isResetting ? "Sending..." : "Forgot password?"}
              </button>
            </div>

          </form>

          <div className="auth-copyright">
            © 2026 ATHAHAR ROADWAYS. Cloud Transport ERP.
          </div>

        </section>

        {/* RIGHT SIDE */}
        <section className="auth-brand-panel">

          <div className="orange-curve"></div>

          <div className="brand-panel-content">

            <div className="big-logo">
              <img 
                src="/assets/atharva-logo.png" 
                alt="Atharva Logo" 
                onError={(e) => { e.currentTarget.src = "/logo.png"; }}
              />
            </div>

            <h2>ATHAHAR ROADWAYS</h2>

            <h4>SAFE • ON TIME • ALWAYS</h4>

            <div className="system-label">
              Godown Management System
            </div>

            <div className="hub-details">
              <h3>HQ & Godown Hub 01</h3>

              <p>
                Next to Parvati Crane, Vakhar Bhag,
                Sangli - 416416
              </p>

              <h5>
                TEL: 9370229449 / 9850329449
              </h5>
            </div>

          </div>

          <div className="truck-background"></div>

        </section>

      </div>
    </main>
  );
}

// Default export
export default Login;
