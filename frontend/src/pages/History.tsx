import { useState, useEffect } from "react";
import { useAuth } from "../App.tsx";
import { Search, Download, Filter, ChevronLeft, ChevronRight, AlertTriangle, ShieldCheck, AlertOctagon, ExternalLink, X } from "lucide-react";
import axios from "axios";

interface ScanRecord {
  id: number;
  url: string;
  risk_score: number;
  classification: string;
  confidence: number;
  explanation?: string;
  recommendation?: string;
  indicators: string[];
  model_name?: string;
  created_at: string;
}

const DEMO_RECORDS: ScanRecord[] = [
  { id: 1, url: "http://chase-bank-verify.security-server.xyz/login", risk_score: 95, classification: "Phishing", confidence: 98, indicators: ["IP address domain", "Brand spoofing"], model_name: "Random Forest", created_at: "2026-07-19T10:30:00Z", explanation: "Multiple high-severity phishing indicators.", recommendation: "Do not visit." },
  { id: 2, url: "https://github.com/trending", risk_score: 3, classification: "Safe", confidence: 99.5, indicators: ["No threats"], model_name: "Logistic Regression", created_at: "2026-07-19T09:15:00Z", explanation: "No indicators found.", recommendation: "Safe to browse." },
  { id: 3, url: "http://login-metamask.xyz/connect", risk_score: 91, classification: "Phishing", confidence: 94, indicators: ["Suspicious keywords", "High-risk TLD"], model_name: "Random Forest", created_at: "2026-07-18T20:45:00Z", explanation: "Multiple phishing features.", recommendation: "Avoid this site." },
  { id: 4, url: "https://stripe.com/payments", risk_score: 2, classification: "Safe", confidence: 99, indicators: ["No threats"], model_name: "Heuristic Engine", created_at: "2026-07-18T14:00:00Z", explanation: "Official stripe domain.", recommendation: "Safe." },
  { id: 5, url: "http://secure-paypal-update.click/verify", risk_score: 89, classification: "Phishing", confidence: 92, indicators: ["Brand spoofing", "Suspicious TLD", "Suspicious keywords"], model_name: "XGBoost", created_at: "2026-07-17T11:30:00Z", explanation: "Classic paypal phishing structure.", recommendation: "Do not submit credentials." },
  { id: 6, url: "http://bit.ly/3mAbCdEf", risk_score: 45, classification: "Suspicious", confidence: 62, indicators: ["URL shortener detected"], model_name: "Decision Tree", created_at: "2026-07-17T08:00:00Z", explanation: "Shortened URL masks destination.", recommendation: "Verify destination before clicking." },
];

export default function HistoryPage() {
  const { token, showToast } = useAuth();
  const [records, setRecords] = useState<ScanRecord[]>(DEMO_RECORDS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<ScanRecord | null>(null);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (token) fetchHistory();
  }, [token]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: 1, limit: 100 };
      if (searchQuery) params.q = searchQuery;
      if (filterClass) params.classification = filterClass;
      const res = await axios.get("/api/v1/analysis/history", {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setRecords(res.data.length > 0 ? res.data : DEMO_RECORDS);
    } catch {
      showToast("Could not load history from server. Showing demo data.", "info");
      setRecords(DEMO_RECORDS);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!token) { showToast("Login required to export.", "error"); return; }
    try {
      const res = await axios.get(`/api/v1/analysis/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob"
      });
      const ext = format === "json" ? "json" : format === "pdf" ? "txt" : "csv";
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `scan_history.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast(`Exported as ${format.toUpperCase()}.`, "success");
    } catch {
      showToast("Export failed – please check your session.", "error");
    }
  };

  // Client-side filter
  const filtered = records.filter(r => {
    const matchSearch = !searchQuery || r.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchClass = !filterClass || r.classification === filterClass;
    return matchSearch && matchClass;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const classIcon = (c: string) => {
    if (c === "Phishing") return <AlertOctagon className="w-3.5 h-3.5 text-red-400" />;
    if (c === "Suspicious") return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
  };

  const classBadge = (c: string) =>
    `px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
      c === "Phishing" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
      c === "Suspicious" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    }`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-sans tracking-tight">Scan History</h1>
          <p className="text-xs text-slate-400">
            Complete audit trail of all scanned URLs.{" "}
            {filtered.length > 0 && <span className="text-slate-500">{filtered.length} records found.</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["csv", "json", "pdf"].map(fmt => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search URLs..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full bg-slate-950/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyber-accent transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <select
            value={filterClass}
            onChange={e => { setFilterClass(e.target.value); setPage(1); }}
            className="bg-slate-950/40 border border-white/10 rounded-xl pl-10 pr-8 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyber-accent transition-colors appearance-none"
          >
            <option value="">All Classifications</option>
            <option value="Phishing">Phishing</option>
            <option value="Suspicious">Suspicious</option>
            <option value="Safe">Safe</option>
          </select>
        </div>
        {token && (
          <button
            onClick={fetchHistory}
            className="px-4 py-2.5 bg-cyber-accent/10 border border-cyber-accent/30 rounded-xl text-xs font-semibold text-cyber-accent hover:bg-cyber-accent/20 transition-all"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Records Table */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-500 font-semibold bg-white/[0.02]">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">URL</th>
                <th className="py-3 px-4">Risk</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Engine</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-500 text-xs">Loading history...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-500 text-xs">No records match your criteria.</td></tr>
              ) : (
                paginated.map((r, idx) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.025] transition-colors">
                    <td className="py-3 px-4 text-slate-600">{(page - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td className="py-3 px-4 max-w-[260px]">
                      <span className="font-mono text-[11px] text-slate-300 break-all line-clamp-1">{r.url}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${r.risk_score >= 70 ? "bg-red-500" : r.risk_score >= 40 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${r.risk_score}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-200">{r.risk_score}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={classBadge(r.classification)}>
                        {classIcon(r.classification)} {r.classification}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{r.confidence}%</td>
                    <td className="py-3 px-4 text-slate-500">{r.model_name || "—"}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="text-cyber-accent hover:underline text-[10px] flex items-center gap-0.5 ml-auto"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-xs text-slate-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-white/10 relative">
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
            <h3 className="text-base font-bold text-slate-200 mb-4">Scan Detail Report</h3>
            <div className="flex flex-col gap-3 text-xs">
              <div className="font-mono text-[11px] text-slate-400 bg-slate-950/40 p-3 rounded border border-white/5 break-all">
                {selectedRecord.url}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col items-center">
                  <span className="text-2xl font-extrabold text-white">{selectedRecord.risk_score}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">Risk</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col items-center">
                  <span className={`text-sm font-bold ${
                    selectedRecord.classification === "Phishing" ? "text-red-400" :
                    selectedRecord.classification === "Suspicious" ? "text-amber-400" : "text-emerald-400"
                  }`}>{selectedRecord.classification}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">Class</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col items-center">
                  <span className="text-sm font-bold text-slate-200">{selectedRecord.confidence}%</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">Confidence</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-bold block mb-1.5">Indicators:</span>
                <ul className="flex flex-col gap-1">
                  {selectedRecord.indicators.map((ind, i) => (
                    <li key={i} className="flex items-start gap-1.5 bg-slate-950/30 p-2 rounded border border-white/5">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                        selectedRecord.risk_score >= 70 ? "bg-red-500" : selectedRecord.risk_score >= 40 ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      {ind}
                    </li>
                  ))}
                </ul>
              </div>
              {selectedRecord.explanation && (
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-300 font-bold block">Explanation:</span>
                  <p className="text-slate-400 mt-1">{selectedRecord.explanation}</p>
                  {selectedRecord.recommendation && <>
                    <span className="text-slate-300 font-bold block mt-2">Recommendation:</span>
                    <p className="text-slate-400 mt-1">{selectedRecord.recommendation}</p>
                  </>}
                </div>
              )}
              <div className="text-slate-500">
                Engine: {selectedRecord.model_name} · Scanned: {new Date(selectedRecord.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
