import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App.tsx";
import { Shield, Mail, Lock, User, Eye, EyeOff, ArrowRight, Zap, CheckCircle } from "lucide-react";
import axios from "axios";

const FEATURES = ["ML-powered phishing detection", "34-feature URL analysis engine", "Real-time SOC dashboard", "Enterprise-grade security"];

export default function AuthPage() {
  const { login, showToast } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin]       = useState(true);
  const [loading, setLoading]       = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const [errors, setErrors]         = useState<{ email?: string, password?: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear error when user types
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const validateForm = () => {
    const newErrors: { email?: string, password?: string } = {};
    if (!form.email.includes("@")) {
      newErrors.email = "Please enter a valid email address.";
    }
    
    if (!isLogin) {
      // Enforce the same strong password regex as the backend for registration
      const passRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passRegex.test(form.password)) {
        newErrors.password = "Password must be 8+ characters, with 1 uppercase, 1 number, and 1 special character.";
      }
    } else if (form.password.length < 6) {
      newErrors.password = "Password cannot be empty.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      if (isLogin) {
        const fd = new FormData();
        fd.append("username", form.email);
        fd.append("password", form.password);
        const res = await axios.post("/api/v1/auth/login", fd);
        login(res.data.access_token, res.data.user);
        navigate("/dashboard");
      } else {
        await axios.post("/api/v1/auth/register", {
          email: form.email, password: form.password,
          full_name: form.full_name || undefined
        });
        showToast("Account created! Please sign in.", "success");
        setIsLogin(true);
        setForm({ email: form.email, password: "", full_name: "" });
        setErrors({});
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Authentication failed. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-8">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-white/8 shadow-glow-card">

        {/* ── Left panel – Branding ──────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col justify-between p-10 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(6,18,44,0.95) 0%, rgba(2,8,23,0.98) 100%)" }}>

          {/* Background art */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl" />
            {/* Grid */}
            <div className="absolute inset-0 opacity-30"
              style={{ backgroundImage: "linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-glow-cyan">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-black gradient-text-cyber">PhishGuard AI</span>
            </div>

            <h2 className="text-3xl font-black text-white leading-tight mb-4">
              Enterprise-Grade<br />
              <span className="gradient-text">Phishing Defence</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-10">
              Protect your organisation from phishing threats with AI-powered URL analysis, real-time threat intelligence, and SOC-grade analytics.
            </p>

            <ul className="flex flex-col gap-4">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3 h-3 text-cyan-400" />
                  </div>
                  <span className="text-sm text-slate-300">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-8">
            <div className="flex items-center gap-2 px-3 py-2 bg-white/4 border border-white/8 rounded-xl w-fit">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[11px] text-slate-400 font-medium">22/22 tests passing · Production ready</span>
            </div>
          </div>
        </div>

        {/* ── Right panel – Form ────────────────────────────────────────── */}
        <div className="flex flex-col justify-center p-8 md:p-10 relative"
          style={{ background: "rgba(4, 10, 26, 0.97)" }}>

          {/* Tab switch */}
          <div className="flex gap-1 p-1 bg-white/4 border border-white/6 rounded-xl mb-8">
            {(["Sign In", "Sign Up"] as const).map((label, i) => (
              <button key={label}
                onClick={() => { setIsLogin(i === 0); setForm({ email: "", password: "", full_name: "" }); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                  ${(i === 0) === isLogin
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/25 shadow-glow-cyan"
                    : "text-slate-500 hover:text-slate-300"}`}>
                {label}
              </button>
            ))}
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">
            {isLogin ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-sm text-slate-500 mb-7">
            {isLogin ? "Sign in to your SOC workspace" : "Join PhishGuard AI to start protecting your infrastructure"}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div className="relative">
                <User className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="text" name="full_name" placeholder="Full Name (optional)"
                  value={form.full_name} onChange={handleChange}
                  className="cyber-input pl-10" />
              </div>
            )}

            <div className="relative">
              <Mail className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type="email" name="email" placeholder="Email address"
                value={form.email} onChange={handleChange} required
                className={`cyber-input pl-10 ${errors.email ? 'border-red-500/50 focus:border-red-500/50 shadow-glow-red' : ''}`} />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type={showPass ? "text" : "password"} name="password"
                placeholder="Password" value={form.password}
                onChange={handleChange} required
                className={`cyber-input pl-10 pr-11 ${errors.password ? 'border-red-500/50 focus:border-red-500/50 shadow-glow-red' : ''}`} />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3.5 top-[22px] -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.password && <p className="text-xs text-red-400 mt-1 max-w-[300px] leading-tight">{errors.password}</p>}
            </div>

            {isLogin && (
              <div className="text-right -mt-2">
                <button type="button" className="text-xs text-slate-600 hover:text-cyan-400 transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 mt-2 h-11 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isLogin ? "Authenticating..." : "Creating account..."}
                </span>
              ) : (
                <>{isLogin ? "Sign In" : "Create Account"}<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          {isLogin && (
            <div className="mt-6 p-4 bg-cyan-500/5 border border-cyan-500/15 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Demo Admin</span>
              </div>
              <button type="button"
                onClick={() => setForm({ ...form, email: "admin@phishguard.ai", password: "Admin@1234" })}
                className="text-left w-full">
                <div className="text-xs text-slate-400 font-mono-cyber space-y-0.5">
                  <div><span className="text-slate-600">email</span> <span className="text-slate-300">admin@phishguard.ai</span></div>
                  <div><span className="text-slate-600">pass </span> <span className="text-slate-300">Admin@1234</span></div>
                </div>
                <span className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors mt-1 block">Click to autofill →</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
