import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Shield, Zap, Brain, Lock, BarChart3, Globe, ArrowRight, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import axios from "axios";

/* ── Animated counter ──────────────────────────────────────────────────────── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 20);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{val.toLocaleString()}{suffix}</span>;
}

/* ── Risk meter ────────────────────────────────────────────────────────────── */
function RiskMeter({ score }: { score: number }) {
  const color = score >= 70 ? "#f43f5e" : score >= 40 ? "#f59e0b" : "#10b981";
  const shadow = score >= 70 ? "rgba(244,63,94,0.6)" : score >= 40 ? "rgba(245,158,11,0.5)" : "rgba(16,185,129,0.5)";
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${score * 2.513} 251.3`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${shadow})`, transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black" style={{ color }}>{score}</span>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Risk</span>
      </div>
    </div>
  );
}

const STATS = [
  { label: "URLs Analysed", value: 2847193, suffix: "+" },
  { label: "Threats Blocked", value: 184203, suffix: "+" },
  { label: "ML Accuracy",  value: 97, suffix: "%" },
  { label: "Response Time", value: 120, suffix: "ms" },
];

const FEATURES = [
  { icon: Brain, title: "34-Feature ML Engine", desc: "Logistic Regression, Random Forest & Decision Tree trained on real phishing datasets. Auto-selects the best model.", color: "text-cyan-400", bg: "from-cyan-500/10 to-transparent" },
  { icon: Zap, title: "Instant Classification", desc: "Safe, Suspicious, or Phishing verdict in under 200ms with confidence score and full explanation.", color: "text-indigo-400", bg: "from-indigo-500/10 to-transparent" },
  { icon: BarChart3, title: "SOC Analytics Dashboard", desc: "7-day trend charts, risk distribution, real-time activity feed, and full scan history export.", color: "text-purple-400", bg: "from-purple-500/10 to-transparent" },
  { icon: Lock, title: "Enterprise Security", desc: "JWT auth, bcrypt hashing, rate limiting, RBAC (Admin/Analyst/User), and complete audit trails.", color: "text-pink-400", bg: "from-pink-500/10 to-transparent" },
  { icon: Globe, title: "Heuristic Fallback", desc: "Works without a trained model. Heuristics engine catches brand spoofing, IP domains, suspicious TLDs.", color: "text-emerald-400", bg: "from-emerald-500/10 to-transparent" },
  { icon: Shield, title: "Zero-Friction API", desc: "Public /scan endpoint requires no auth. RESTful, documented in Swagger. Production Docker-ready.", color: "text-amber-400", bg: "from-amber-500/10 to-transparent" },
];

const DEMO_URLS = [
  "https://google.com",
  "https://github.com",
  "http://paypal-secure-login.xyz/webscr",
  "http://192.168.1.1/verify.php",
  "http://login-metamask.xyz/connect",
  "https://stripe.com/payments",
];

export default function Landing() {
  const [url,    setUrl]    = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoad]  = useState(false);
  const [error,  setError]  = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const scan = async (scanUrl?: string) => {
    const target = (scanUrl || url).trim();
    if (!target) { setError("Please enter a URL to scan."); return; }
    setLoad(true); setError(""); setResult(null);
    try {
      const res = await axios.post("/api/v1/analysis/scan", { url: target });
      setResult(res.data);
      if (!scanUrl) setUrl(target);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Scan failed. Please check the URL.");
    } finally {
      setLoad(false);
    }
  };

  const classColor = (c: string) =>
    c === "Phishing"  ? "text-rose-400"    :
    c === "Suspicious"? "text-amber-400"   : "text-emerald-400";

  const classBg = (c: string) =>
    c === "Phishing"  ? "bg-rose-500/10 border-rose-500/25"  :
    c === "Suspicious"? "bg-amber-500/10 border-amber-500/25" : "bg-emerald-500/10 border-emerald-500/25";

  return (
    <div className="flex flex-col gap-24 pb-12">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-8 md:pt-16">
        {/* Decorative glow orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

        <div className="relative flex flex-col items-center text-center gap-6 max-w-4xl mx-auto">
          {/* Version badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/8 border border-cyan-500/20 rounded-full text-[11px] font-bold text-cyan-400 tracking-wider uppercase">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            AI-Powered · Real-time · Enterprise Grade
          </div>

          <h1 className="hero-title">
            <span className="gradient-text-cyber">Detect Phishing</span><br />
            <span className="text-white">Before It Strikes</span>
          </h1>

          <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
            PhishGuard AI uses machine learning with 34 engineered URL features to classify threats in milliseconds.
            Built for SOC teams, security engineers, and enterprise environments.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/dashboard" className="btn-primary flex items-center gap-2 px-6 py-3 text-sm">
              <BarChart3 className="w-4 h-4" /> Open Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/auth" className="btn-ghost flex items-center gap-2 px-6 py-3 text-sm">
              <Shield className="w-4 h-4" /> Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── LIVE SCANNER ──────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto w-full">
        <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/8 scan-effect">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live Threat Scanner</h2>
              <p className="text-xs text-slate-500">No account needed · Powered by ML</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Online</span>
            </div>
          </div>

          {/* Input row */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-grow">
              <Globe className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={inputRef} type="url" value={url}
                onChange={e => { setUrl(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && scan()}
                placeholder="https://example.com or paste any URL..."
                className="cyber-input pl-10 font-mono-cyber text-sm" />
            </div>
            <button onClick={() => scan()} disabled={loading}
              className="btn-primary flex items-center gap-2 px-5 whitespace-nowrap disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" />Scan</>}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm mb-4">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Quick URLs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-[10px] text-slate-600 self-center font-medium uppercase tracking-wider">Try:</span>
            {DEMO_URLS.map(u => (
              <button key={u} onClick={() => { setUrl(u); scan(u); }}
                className="text-[10px] font-mono-cyber px-2.5 py-1 bg-white/4 border border-white/8 rounded-lg text-slate-500 hover:text-cyan-400 hover:border-cyan-500/25 transition-all truncate max-w-[160px]">
                {u.replace(/https?:\/\//, "").split("/")[0]}
              </button>
            ))}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="flex flex-col gap-3 mt-2">
              <div className="shimmer h-5 w-3/4 rounded-lg" />
              <div className="shimmer h-4 w-1/2 rounded-lg" />
              <div className="shimmer h-4 w-2/3 rounded-lg" />
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className={`mt-2 p-5 border rounded-2xl ${classBg(result.classification)}`}>
              <div className="flex flex-col md:flex-row gap-5 items-start md:items-center">
                <RiskMeter score={result.risk_score} />

                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    {result.classification === "Phishing"  && <XCircle     className="w-5 h-5 text-rose-400" />}
                    {result.classification === "Suspicious" && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    {result.classification === "Safe"       && <CheckCircle   className="w-5 h-5 text-emerald-400" />}
                    <span className={`text-xl font-black ${classColor(result.classification)}`}>{result.classification}</span>
                    <span className="text-xs text-slate-500 ml-auto">{result.confidence}% confidence</span>
                  </div>

                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">{result.explanation}</p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {result.indicators?.slice(0, 3).map((ind: string, i: number) => (
                      <span key={i} className={`text-[10px] px-2 py-0.5 rounded border font-medium ${classBg(result.classification)} ${classColor(result.classification)}`}>
                        {ind.length > 48 ? ind.slice(0, 48) + "…" : ind}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-slate-300">{result.recommendation}</p>
                  <p className="text-[10px] text-slate-600 mt-1">Engine: {result.model_name}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(({ label, value, suffix }) => (
            <div key={label} className="glass-panel glass-panel-hover rounded-2xl p-6 text-center border border-white/8">
              <div className="text-3xl font-black gradient-text mb-1">
                <Counter target={value} suffix={suffix} />
              </div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section>
        <div className="text-center mb-12">
          <span className="text-[11px] font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-3 py-1 rounded-full uppercase tracking-wider">Platform Capabilities</span>
          <h2 className="section-heading mt-4">Built for Security Professionals</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-xl mx-auto">Every component designed with SOC analysts, threat hunters, and enterprise security teams in mind.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="glass-panel glass-panel-hover rounded-2xl p-6 border border-white/8 group">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bg} border border-white/8 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-bold text-slate-100 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="relative rounded-3xl overflow-hidden p-10 md:p-16 text-center border border-white/8"
        style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(99,102,241,0.06) 50%, rgba(244,63,94,0.04) 100%)" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative z-10">
          <h2 className="section-heading mb-4">Ready to Protect Your Organisation?</h2>
          <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">Register in seconds. First login unlocks the full SOC dashboard, history, analytics, and admin tools.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/auth" className="btn-primary flex items-center gap-2 px-8 py-3">
              Start Free <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer"
              className="btn-ghost flex items-center gap-2 px-6 py-3">
              API Docs <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
