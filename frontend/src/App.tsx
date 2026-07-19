import { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import {
  Shield, LayoutDashboard, History, Settings, LogOut, LogIn,
  Menu, X, ChevronRight, Zap, Activity
} from "lucide-react";
import Landing    from "./pages/Landing.tsx";
import Dashboard  from "./pages/Dashboard.tsx";
import HistoryPage from "./pages/History.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";
import AuthPage   from "./pages/Auth.tsx";
import axios from "axios";

// Configure global Axios baseURL for production deployment (e.g. Railway)
// @ts-ignore
axios.defaults.baseURL = import.meta.env.VITE_API_URL || "";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface User { id: number; email: string; full_name: string | null; role: string; is_active: number; }
interface AuthContextType {
  user: User | null; token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}
const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

interface ToastMsg { id: number; message: string; type: "success" | "error" | "info"; }

/* ── NavLink ────────────────────────────────────────────────────────────────── */
function NavLink({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick?: () => void }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link to={to} onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
        ${active
          ? "bg-cyber-accent/10 text-cyber-accent border border-cyber-accent/20 shadow-glow-cyan"
          : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent"}`}>
      <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${active ? "text-cyber-accent" : ""}`} />
      <span>{label}</span>
      {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-cyber-accent" />}
    </Link>
  );
}

/* ── App ────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [user,   setUser]   = useState<User | null>(null);
  const [token,  setToken]  = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("pg_token");
    const u = localStorage.getItem("pg_user");
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
  }, []);

  const login = (jwtToken: string, userData: User) => {
    localStorage.setItem("pg_token", jwtToken);
    localStorage.setItem("pg_user", JSON.stringify(userData));
    setToken(jwtToken); setUser(userData);
    showToast(`Welcome back, ${userData.full_name || userData.email}!`, "success");
  };
  const logout = () => {
    localStorage.removeItem("pg_token"); localStorage.removeItem("pg_user");
    setToken(null); setUser(null);
    showToast("You have been signed out.", "info");
  };
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, showToast }}>
      <Router>
        {/* Background orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="orb w-[600px] h-[600px] -top-40 -left-40 bg-cyan-500/5" style={{ animationDelay: "0s" }} />
          <div className="orb w-[500px] h-[500px] -top-20 -right-40 bg-indigo-500/5" style={{ animationDelay: "3s" }} />
          <div className="orb w-[400px] h-[400px] bottom-0 left-1/3 bg-pink-500/4" style={{ animationDelay: "5s" }} />
        </div>

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* ── Top Bar ──────────────────────────────────────────────────── */}
          <header className="glass-panel sticky top-0 z-50 border-b border-white/5">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center gap-4">

              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-glow-cyan animate-glow-pulse">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-lg font-black tracking-tight gradient-text-cyber">PhishGuard</span>
                  <span className="ml-1 text-xs font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-1.5 py-0.5 rounded-md">AI</span>
                </div>
              </Link>

              {/* Status badge */}
              <div className="hidden md:flex items-center gap-1.5 ml-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse-slow pulse-dot" />
                <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">System Online</span>
              </div>

              <div className="flex-1" />

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-1">
                <NavLink to="/" icon={Zap} label="Home" />
                {user && <>
                  <NavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                  <NavLink to="/history"   icon={History}         label="History" />
                  {user.role === "Admin" && <NavLink to="/admin" icon={Settings} label="Admin" />}
                </>}
              </nav>

              <div className="hidden lg:flex items-center gap-3 ml-2">
                {user ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5 px-3 py-2 glass-panel rounded-xl border border-white/5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-600/20 border border-cyan-400/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                        {(user.full_name || user.email)[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-200 leading-none">{user.full_name || user.email.split("@")[0]}</span>
                        <span className={`text-[10px] font-bold leading-none mt-0.5 ${user.role === "Admin" ? "text-cyan-400" : "text-slate-500"}`}>{user.role}</span>
                      </div>
                    </div>
                    <button onClick={logout}
                      className="p-2 rounded-xl border border-white/5 bg-white/3 hover:bg-rose-500/10 hover:border-rose-500/20 text-slate-500 hover:text-rose-400 transition-all"
                      title="Sign Out">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Link to="/auth"
                    className="btn-primary flex items-center gap-2">
                    <LogIn className="w-4 h-4" /> Sign In
                  </Link>
                )}
              </div>

              {/* Mobile hamburger */}
              <button onClick={() => setMobileOpen(o => !o)}
                className="lg:hidden p-2 rounded-xl border border-white/5 text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </header>

          {/* ── Mobile Drawer ─────────────────────────────────────────────── */}
          {mobileOpen && (
            <div className="lg:hidden glass-panel fixed inset-x-0 top-16 z-40 border-b border-white/5 p-5 flex flex-col gap-2 animate-fade-up">
              <NavLink to="/" icon={Zap} label="Home" onClick={() => setMobileOpen(false)} />
              {user && <>
                <NavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setMobileOpen(false)} />
                <NavLink to="/history"   icon={History}         label="History"   onClick={() => setMobileOpen(false)} />
                {user.role === "Admin" && <NavLink to="/admin" icon={Settings} label="Admin Panel" onClick={() => setMobileOpen(false)} />}
                <div className="my-2 border-t border-white/5" />
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm text-slate-400">{user.full_name || user.email} · <span className="text-cyan-400">{user.role}</span></span>
                  <button onClick={() => { logout(); setMobileOpen(false); }}
                    className="text-rose-400 flex items-center gap-1.5 text-sm hover:underline">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </>}
              {!user && (
                <Link to="/auth" onClick={() => setMobileOpen(false)} className="btn-primary flex items-center justify-center gap-2 mt-2">
                  <LogIn className="w-4 h-4" /> Sign In
                </Link>
              )}
            </div>
          )}

          {/* ── Page Content ──────────────────────────────────────────────── */}
          <main className="flex-grow max-w-[1400px] w-full mx-auto px-4 md:px-8 py-8">
            <Routes>
              <Route path="/"          element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/history"   element={<HistoryPage />} />
              <Route path="/admin"     element={<AdminPanel />} />
              <Route path="/auth"      element={<AuthPage />} />
            </Routes>
          </main>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <footer className="border-t border-white/5 py-6">
            <div className="max-w-[1400px] mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-cyan-400/50" />
                <span>© {new Date().getFullYear()} PhishGuard AI · Enterprise Threat Intelligence Platform</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-emerald-400/50" />
                <span className="text-emerald-400/50">All systems operational</span>
              </div>
            </div>
          </footer>
        </div>

        {/* ── Toast Stack ──────────────────────────────────────────────────── */}
        <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full">
          {toasts.map(t => (
            <div key={t.id}
              className={`toast-enter flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl
                ${t.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200"
                : t.type === "error"   ? "bg-rose-950/90    border-rose-500/30    text-rose-200"
                :                       "bg-slate-900/95    border-cyan-500/20    text-cyan-200"}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                t.type === "success" ? "bg-emerald-400" : t.type === "error" ? "bg-rose-400" : "bg-cyan-400"
              }`} />
              <p className="text-sm font-medium leading-snug">{t.message}</p>
            </div>
          ))}
        </div>
      </Router>
    </AuthContext.Provider>
  );
}
