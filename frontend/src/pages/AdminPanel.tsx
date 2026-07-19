import { useState, useEffect } from "react";
import { useAuth } from "../App.tsx";
import { Shield, Users, Activity, UserCheck, UserX, Trash2, RefreshCw } from "lucide-react";
import axios from "axios";

interface UserRecord {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: number;
  created_at: string;
}

interface AuditLog {
  id: number;
  user_email: string | null;
  action: string;
  ip_address: string | null;
  details: string | null;
  timestamp: string;
}

const ROLE_OPTIONS = ["User", "Analyst", "Admin"];

export default function AdminPanel() {
  const { token, user, showToast } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "logs">("users");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (user?.role !== "Admin") return;
    fetchUsers();
    fetchLogs();
  }, [token]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch {
      showToast("Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await axios.get("/api/v1/users/logs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data);
    } catch {
      // Silently fail for logs, not critical
    }
  };

  const updateUserRole = async (userId: number, role: string) => {
    try {
      await axios.put(`/api/v1/users/${userId}`, { role }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("User role updated.", "success");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch {
      showToast("Failed to update role.", "error");
    }
  };

  const toggleUserActive = async (userId: number, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    try {
      await axios.put(`/api/v1/users/${userId}`, { is_active: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(`User ${newStatus === 1 ? "activated" : "deactivated"}.`, "success");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: newStatus } : u));
    } catch {
      showToast("Failed to update status.", "error");
    }
  };

  const deleteUser = async (userId: number, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("User deleted.", "success");
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch {
      showToast("Failed to delete user.", "error");
    }
  };

  const actionColor = (action: string) => {
    if (action.includes("DELETE") || action.includes("ERROR")) return "text-red-400";
    if (action.includes("PHISHING") || action.includes("SCAN")) return "text-amber-400";
    if (action.includes("LOGIN") || action.includes("REGISTER")) return "text-emerald-400";
    return "text-slate-400";
  };

  if (!user || user.role !== "Admin") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="glass-panel p-10 rounded-3xl border border-white/10 text-center max-w-md">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-200">Access Denied</h2>
          <p className="text-sm text-slate-400 mt-2">Administrator privileges are required to access this panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-sans tracking-tight flex items-center gap-2">
            <Shield className="w-7 h-7 text-cyber-accent" /> Admin Control Panel
          </h1>
          <p className="text-xs text-slate-400">Manage users, roles, and review security audit logs.</p>
        </div>
        <button
          onClick={() => { fetchUsers(); fetchLogs(); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5"><Users className="w-3 h-3" /> Total Users</span>
          <span className="text-2xl font-extrabold text-white">{users.length}</span>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5"><UserCheck className="w-3 h-3" /> Active</span>
          <span className="text-2xl font-extrabold text-emerald-400">{users.filter(u => u.is_active === 1).length}</span>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-red-400 font-bold flex items-center gap-1.5"><UserX className="w-3 h-3" /> Inactive</span>
          <span className="text-2xl font-extrabold text-red-400">{users.filter(u => u.is_active === 0).length}</span>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5"><Activity className="w-3 h-3" /> Audit Events</span>
          <span className="text-2xl font-extrabold text-white">{logs.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-0">
        {(["users", "logs"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-4 text-sm font-semibold transition-all capitalize border-b-2 ${
              activeTab === tab
                ? "border-cyber-accent text-cyber-accent"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab === "users" ? "User Management" : "Audit Logs"}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-500 font-semibold bg-white/[0.02]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-500">Loading users...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-500">No users found.</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">{u.full_name || "—"}</span>
                        <span className="text-slate-500 text-[10px]">{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={e => updateUserRole(u.id, e.target.value)}
                        disabled={u.id === user.id}
                        className="bg-slate-950/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyber-accent disabled:opacity-50 transition-colors"
                      >
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.is_active === 1 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {u.is_active === 1 ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => toggleUserActive(u.id, u.is_active)}
                          disabled={u.id === user.id}
                          title={u.is_active === 1 ? "Deactivate" : "Activate"}
                          className="p-1.5 bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/20 rounded-lg text-slate-400 hover:text-amber-400 transition-all disabled:opacity-30"
                        >
                          {u.is_active === 1 ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => deleteUser(u.id, u.email)}
                          disabled={u.id === user.id}
                          title="Delete User"
                          className="p-1.5 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-all disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === "logs" && (
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-500 font-semibold bg-white/[0.02]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center text-slate-500">No audit logs available.</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-400">{log.user_email || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${actionColor(log.action)}`}>{log.action}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-[300px] truncate">{log.details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
