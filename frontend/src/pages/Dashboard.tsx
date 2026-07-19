import { useState, useEffect } from "react";
import { useAuth } from "../App.tsx";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Search, AlertTriangle, ShieldCheck, Upload, Activity, AlertOctagon, TrendingUp, Layers } from "lucide-react";
import axios from "axios";

export default function Dashboard() {
  const { token, user, showToast } = useAuth();
  
  // Scans & API states
  const [urlInput, setUrlInput] = useState("");
  const [batchInput, setBatchInput] = useState("");
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedScan, setSelectedScan] = useState<any>(null);
  
  // Dashboard Analytics
  const [stats, setStats] = useState<any>({
    total_scanned: 1420,
    total_phishing: 412,
    total_suspicious: 180,
    total_safe: 828,
    avg_risk_score: 41.5,
    recent_activity: [
      { id: 1, url: "http://chase-bank-verify.security-server.xyz", risk_score: 95, classification: "Phishing", confidence: 98, created_at: "2026-07-19T10:30:00Z", model_name: "XGBoost", indicators: ["IP address in domain", "Suspicious keywords"] },
      { id: 2, url: "https://github.com/trending", risk_score: 4, classification: "Safe", confidence: 99.5, created_at: "2026-07-19T09:15:00Z", model_name: "Logistic Regression", indicators: ["No threat flags matched"] },
      { id: 3, url: "http://login-verification-metamask.xyz", risk_score: 91, classification: "Phishing", confidence: 94, created_at: "2026-07-19T08:45:00Z", model_name: "Random Forest", indicators: ["Suspicious keywords", "High-risk TLD"] },
      { id: 4, url: "https://google.com/", risk_score: 2, classification: "Safe", confidence: 99, created_at: "2026-07-19T08:00:00Z", model_name: "Heuristic Engine", indicators: ["No threat flags matched"] }
    ],
    trends: [
      { date: "Jul 13", phishing: 12, suspicious: 4, safe: 34 },
      { date: "Jul 14", phishing: 15, suspicious: 8, safe: 28 },
      { date: "Jul 15", phishing: 8, suspicious: 12, safe: 42 },
      { date: "Jul 16", phishing: 22, suspicious: 6, safe: 31 },
      { date: "Jul 17", phishing: 19, suspicious: 5, safe: 39 },
      { date: "Jul 18", phishing: 25, suspicious: 9, safe: 45 },
      { date: "Jul 19", phishing: 18, suspicious: 7, safe: 36 }
    ]
  });

  const [loading, setLoading] = useState(false);

  // Load stats from API on mount (if authenticated)
  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  const fetchStats = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get("/api/v1/analysis/stats", { headers });
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
      showToast("Could not load real-time statistics. Displaying offline simulation dashboard.", "info");
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setLoading(true);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post("/api/v1/analysis/scan", { url: urlInput.trim() }, { headers });
      
      setSelectedScan(res.data);
      showToast("Scan completed successfully.", "success");
      setUrlInput("");
      
      if (token) fetchStats(); // Refresh stats on successful scan
    } catch (err: any) {
      console.error(err);
      showToast("API Scan failed. Displaying simulated report.", "error");
      // Fallback local simulation report
      simulateSingleResult(urlInput.trim());
    } finally {
      setLoading(false);
    }
  };

  const simulateSingleResult = (url: string) => {
    const isPhish = /paypal|secure|login|signin|bank|update|verify|xn--|\.xyz|\.top/i.test(url) || url.startsWith("http://");
    const score = isPhish ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 20) + 5;
    const mockRes = {
      id: Date.now(),
      url,
      risk_score: score,
      classification: score >= 70 ? "Phishing" : score >= 40 ? "Suspicious" : "Safe",
      confidence: 89.2,
      created_at: new Date().toISOString(),
      explanation: score >= 70 
        ? "The domain footprint displays look-alike brand signatures combined with unsafe protocols, indicative of account harvest phishing pages."
        : "Standard lexical composition utilizing secure transport layers. No malicious structural features identified.",
      recommendation: score >= 70 
        ? "Do not navigate to this address. Mark as blacklisted."
        : "Standard browser safety rules apply.",
      indicators: score >= 70 
        ? ["Contains brand name spoofing", "Uses insecure HTTP link", "Contains credential update keywords"]
        : ["No indicators triggered"],
      features: { url_length: url.length, uses_http: url.startsWith("http://") ? 1 : 0 },
      model_name: "Simulation Engine v1.0"
    };

    setSelectedScan(mockRes);
    // Add to local stats list to display interactivity
    setStats((prev: any) => ({
      ...prev,
      total_scanned: prev.total_scanned + 1,
      total_phishing: score >= 70 ? prev.total_phishing + 1 : prev.total_phishing,
      total_safe: score < 40 ? prev.total_safe + 1 : prev.total_safe,
      recent_activity: [mockRes, ...prev.recent_activity.slice(0, 4)]
    }));
  };

  const handleBatchScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchInput.trim()) return;
    setLoading(true);

    const urls = batchInput.split("\n").map(u => u.trim()).filter(Boolean);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post("/api/v1/analysis/batch", { urls }, { headers });
      
      showToast(`Batch scan completed for ${res.data.summary.total_scanned} URLs.`, "success");
      setBatchInput("");
      setIsBatchMode(false);
      
      // Load first scan from results to display
      if (res.data.scans.length > 0) {
        setSelectedScan(res.data.scans[0]);
      }
      
      fetchStats();
    } catch (err: any) {
      console.error(err);
      showToast("Batch scan API failed. Simulating batch operations.", "error");
      simulateBatch(urls);
    } finally {
      setLoading(false);
    }
  };

  const simulateBatch = (urls: string[]) => {
    const mockScans = urls.map((url, idx) => {
      const isPhish = /paypal|secure|login|signin|bank|update|verify|xn--|\.xyz|\.top/i.test(url) || url.startsWith("http://");
      const score = isPhish ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 20) + 5;
      return {
        id: Date.now() + idx,
        url,
        risk_score: score,
        classification: score >= 70 ? "Phishing" : score >= 40 ? "Suspicious" : "Safe",
        confidence: 88,
        created_at: new Date().toISOString(),
        explanation: "Simulated batch analyzer verdict.",
        recommendation: "Simulation advisory.",
        indicators: ["Batch inspection signature triggered"],
        features: {},
        model_name: "Batch Simulator v1.0"
      };
    });

    if (mockScans.length > 0) {
      setSelectedScan(mockScans[0]);
    }

    setStats((prev: any) => ({
      ...prev,
      total_scanned: prev.total_scanned + mockScans.length,
      recent_activity: [...mockScans, ...prev.recent_activity.slice(0, 4)]
    }));
    setBatchInput("");
    setIsBatchMode(false);
  };

  // Pie chart data structure
  const pieData = [
    { name: "Safe", value: stats.total_safe, color: "#10b981" },
    { name: "Suspicious", value: stats.total_suspicious, color: "#f59e0b" },
    { name: "Phishing", value: stats.total_phishing, color: "#ef4444" }
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Top Banner Dashboard Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-sans tracking-tight flex items-center gap-2">
            SOC Operations Hub
          </h1>
          <p className="text-xs text-slate-400">
            Real-time phishing verification and cyber threat statistics. {user ? `Authenticated as: ${user.email} (${user.role})` : "Viewing Offline Demo Mode."}
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={`px-4 py-2 border rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              isBatchMode 
                ? "bg-cyber-accent/10 border-cyber-accent text-cyber-accent" 
                : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> {isBatchMode ? "Single URL Mode" : "Batch Upload"}
          </button>
        </div>
      </div>

      {/* Search Scan Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 glow-border">
        {!isBatchMode ? (
          <form onSubmit={handleScan} className="flex gap-3">
            <div className="relative flex-grow">
              <Search className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Enter single suspicious URL to analyze (e.g. http://wells-fargo-signin-verify.xyz)..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyber-accent text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-cyber-accent to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Scan URL"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleBatchScan} className="flex flex-col gap-3">
            <textarea
              placeholder="Enter list of URLs (one URL per line, max 50)..."
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              rows={4}
              className="w-full bg-slate-950/40 border border-white/10 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyber-accent text-sm font-mono"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="self-end px-6 py-2.5 bg-gradient-to-r from-cyber-accent to-blue-600 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              {loading ? "Processing Batch..." : "Scan Batch List"}
            </button>
          </form>
        )}
      </div>

      {/* Analytics stats metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyber-accent" /> Total Scanned
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-white">{stats.total_scanned}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5 text-red-500" /> Phishing Threats
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-red-400">{stats.total_phishing}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Suspicious Links
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-400">{stats.total_suspicious}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Safe Domains
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{stats.total_safe}</span>
        </div>
      </div>

      {/* Selected scan detailed analysis overlay panel */}
      {selectedScan && (
        <div className="glass-panel p-6 rounded-2xl border border-cyber-accent/30 relative overflow-hidden scan-effect animate-fade-in">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-slate-200">Inspected URL Diagnostic</h3>
            <button 
              onClick={() => setSelectedScan(null)} 
              className="text-xs text-slate-500 hover:text-white px-2 py-1 rounded bg-white/5"
            >
              Dismiss
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/4 flex flex-col items-center justify-center p-4 bg-slate-950/40 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">VERDICT SCORE</span>
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="48" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                  <circle 
                    cx="56" 
                    cy="56" 
                    r="48" 
                    stroke={selectedScan.risk_score >= 70 ? "#ef4444" : selectedScan.risk_score >= 40 ? "#f59e0b" : "#10b981"} 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray={301}
                    strokeDashoffset={301 - (301 * selectedScan.risk_score) / 100}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-white font-sans">{selectedScan.risk_score}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">Score</span>
                </div>
              </div>
              <span className={`mt-3 px-3 py-1 text-xs font-bold rounded-full ${
                selectedScan.classification === "Phishing" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                selectedScan.classification === "Suspicious" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}>
                {selectedScan.classification}
              </span>
            </div>

            <div className="lg:w-3/4 flex flex-col gap-3">
              <span className="text-xs text-slate-500 break-all font-mono bg-slate-950/40 p-2 rounded border border-white/5">{selectedScan.url}</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                  <span className="text-[10px] text-slate-500 block">MODEL ALGORITHM</span>
                  <span className="text-xs font-semibold text-slate-300">{selectedScan.model_name}</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-lg border border-white/5">
                  <span className="text-[10px] text-slate-500 block">MODEL PROBABILITY</span>
                  <span className="text-xs font-semibold text-slate-300">{selectedScan.confidence}%</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-400">Triggered Cyber Indicators:</span>
                <ul className="text-xs text-slate-300 flex flex-col gap-1">
                  {selectedScan.indicators.map((ind: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-950/40 p-2 rounded border border-white/5">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                        selectedScan.risk_score >= 70 ? "bg-red-500" : selectedScan.risk_score >= 40 ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      <span>{ind}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-xs font-bold text-slate-300 block">Explanation Details:</span>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{selectedScan.explanation}</p>
                <span className="text-xs font-bold text-slate-300 block mt-2">Recommended Mitigation:</span>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{selectedScan.recommendation}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Trend Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyber-accent" /> 7-Day Threat History
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="phishColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="safeColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: "10px" }} />
                <YAxis stroke="#64748b" style={{ fontSize: "10px" }} />
                <Tooltip contentStyle={{ background: "#0b0f19", borderColor: "rgba(255,255,255,0.1)", fontSize: "12px", borderRadius: "8px" }} />
                <Area type="monotone" dataKey="phishing" stroke="#ef4444" fillOpacity={1} fill="url(#phishColor)" strokeWidth={2} />
                <Area type="monotone" dataKey="safe" stroke="#10b981" fillOpacity={1} fill="url(#safeColor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat Distribution Pie Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyber-accent" /> Threat Distribution
          </h3>
          <div className="h-60 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0b0f19", borderColor: "rgba(255,255,255,0.1)", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-extrabold text-white">{stats.total_scanned}</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">Total Scans</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-slate-300">Recently Scanned Threat Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-500 font-semibold">
                <th className="py-3 px-4">URL</th>
                <th className="py-3 px-4">Risk Rating</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_activity.map((scan: any, idx: number) => (
                <tr key={scan.id || idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 break-all max-w-[280px] font-mono">{scan.url}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        scan.risk_score >= 70 ? "bg-red-500" : scan.risk_score >= 40 ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      <span className="font-semibold text-slate-200">{scan.risk_score}/100</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      scan.classification === "Phishing" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                      scan.classification === "Suspicious" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      {scan.classification}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{scan.confidence}%</td>
                  <td className="py-3 px-4 text-right">
                    <button 
                      onClick={() => setSelectedScan(scan)}
                      className="text-cyber-accent hover:underline text-[10px]"
                    >
                      Diagnose
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
