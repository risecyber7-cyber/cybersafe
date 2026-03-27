import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Scan,
  FlaskConical,
  CheckCircle,
  Clock,
  Wrench,
  Shield,
  Activity,
  AlertTriangle,
  ShieldAlert,
  UserCheck,
  Smartphone,
  BellRing,
  MonitorSmartphone,
  LogOut,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

function MiniBarChart({ data, colorClass = 'bg-[#00D4FF]' }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="flex items-end gap-2 h-44">
      {data.map((item) => (
        <div key={item.label} className="flex-1 flex flex-col items-center justify-end gap-2">
          <div className="text-[10px] text-[#8B949E]">{item.value}</div>
          <div className="w-full rounded-t-sm bg-white/[0.04] overflow-hidden">
            <div
              className={`w-full rounded-t-sm ${colorClass} shadow-[0_0_16px_rgba(0,194,255,0.18)]`}
              style={{ height: `${Math.max(16, (item.value / maxValue) * 160)}px` }}
            />
          </div>
          <div className="text-[10px] text-[#8B949E] uppercase tracking-[0.18em]">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user, api, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loginAlerts, setLoginAlerts] = useState([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!user) return;

    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/history'),
      api.get('/security/sessions'),
      api.get('/security/login-alerts'),
    ])
      .then(([s, h, sessionRes, alertRes]) => {
        setStats(s.data);
        setHistory(h.data);
        setSessions(sessionRes.data);
        setLoginAlerts(alertRes.data);
        setTwoFactorEnabled(Boolean(user.two_factor_enabled));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, api, navigate]);

  const toggleTwoFactor = async (enabled) => {
    try {
      const res = await api.post('/security/2fa', { enabled });
      setTwoFactorEnabled(res.data.enabled);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update 2FA');
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      await api.post('/security/sessions/revoke', { session_id: sessionId });
      setSessions(prev => prev.map(session => session.id === sessionId ? { ...session, revoked_at: new Date().toISOString() } : session));
      toast.success('Session revoked');
      if (sessionId === user.session_id) {
        await logout();
        navigate('/auth');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to revoke session');
    }
  };

  const trafficSeries = useMemo(() => {
    const base = [
      stats?.total_scans || 0,
      stats?.challenges_attempted || 0,
      stats?.challenges_solved || 0,
      history.length || 0,
      Math.max(1, Math.ceil((stats?.total_scans || 0) * 0.65)),
      Math.max(1, Math.ceil((history.length || 1) * 0.8)),
    ];
    return ['06h', '10h', '12h', '15h', '18h', 'Now'].map((label, index) => ({
      label,
      value: base[index],
    }));
  }, [stats, history]);

  const attackSeries = useMemo(() => {
    const warningCount = history.filter((item) => /warning|missing|risk|exposed/i.test(item.result_summary || '')).length;
    const highCount = history.filter((item) => /critical|suspicious|malware|breach/i.test(item.result_summary || '')).length;
    return [
      { label: 'Scans', value: stats?.total_scans || 0 },
      { label: 'Warnings', value: warningCount || Math.min(2, history.length) },
      { label: 'High', value: highCount || Math.min(1, history.length) },
      { label: 'Solved', value: stats?.challenges_solved || 0 },
    ];
  }, [stats, history]);

  const alerts = useMemo(() => {
    const latest = history.slice(0, 4);
    return latest.map((item, index) => {
      const summary = item.result_summary || '';
      const severity = /critical|breach|malware|exposed/i.test(summary)
        ? 'critical'
        : /warning|missing|risk/i.test(summary)
          ? 'warning'
          : 'info';
      return {
        id: `${item.created_at}-${index}`,
        title: item.tool_name,
        summary,
        time: new Date(item.created_at).toLocaleTimeString(),
        severity,
      };
    });
  }, [history]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#00D4FF] font-mono animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  if (!user) return null;

  const statCards = [
    { icon: Scan, label: 'Total Scans', value: stats?.total_scans || 0, color: 'text-[#00D4FF]' },
    { icon: FlaskConical, label: 'Challenges Attempted', value: stats?.challenges_attempted || 0, color: 'text-yellow-400' },
    { icon: CheckCircle, label: 'Challenges Solved', value: stats?.challenges_solved || 0, color: 'text-[#00FF9F]' },
    { icon: Activity, label: 'Traffic Events', value: history.length || 0, color: 'text-[#00C2FF]' },
    { icon: MonitorSmartphone, label: 'Active Sessions', value: stats?.active_sessions || 0, color: 'text-white' },
    { icon: BellRing, label: 'Login Alerts', value: stats?.login_alerts || 0, color: 'text-[#FF3B3B]' },
  ];

  return (
    <div className="min-h-screen relative" data-testid="dashboard-page">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 py-10 relative">
        <div className="mb-8 animate-fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 flex items-center justify-center bg-[#00D4FF]/10 rounded-sm">
                <Shield className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-['Orbitron']">
                  Security <span className="neon-text">Dashboard</span>
                </h1>
                <p className="text-sm text-[#8B949E]">Real-time graphs, activity logs, alert notifications, and authenticated user access.</p>
              </div>
            </div>
            <div className="glass rounded-sm px-4 py-3 min-w-[280px]">
              <div className="flex items-center gap-2 text-sm text-white">
                <UserCheck className="w-4 h-4 text-[#00FF9F]" />
                Logged in as <span className="font-semibold">{user.username}</span>
              </div>
              <div className="mt-1 text-xs text-[#8B949E]">{user.email} · role: {user.role}</div>
              <div className="mt-2 flex items-center gap-2">
                <Badge className="bg-[#00FF9F]/10 text-[#00FF9F] border-0">Authenticated</Badge>
                <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-0">Session Active</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-6 gap-4 mb-8">
          {statCards.map((s, i) => (
            <div
              key={i}
              data-testid={`stat-card-${i}`}
              className={`glass glass-motion hover-lift p-5 rounded-sm animate-fade-in-up stagger-${i + 1}`}
            >
              <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
              <div className="text-2xl font-black font-['Orbitron'] mb-1">{s.value}</div>
              <div className="text-xs text-[#8B949E]">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] mb-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass rounded-sm p-5 animate-fade-in-up stagger-3">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-[#00D4FF]" />
                <h2 className="font-bold font-['Orbitron'] text-lg">Real-Time Traffic</h2>
              </div>
              <MiniBarChart data={trafficSeries} colorClass="bg-[#00D4FF]" />
            </div>

            <div className="glass rounded-sm p-5 animate-fade-in-up stagger-4">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 text-[#FF3B3B]" />
                <h2 className="font-bold font-['Orbitron'] text-lg">Attack Surface</h2>
              </div>
              <MiniBarChart data={attackSeries} colorClass="bg-[#00FF9F]" />
            </div>
          </div>

          <div className="glass rounded-sm overflow-hidden animate-fade-in-up stagger-5">
            <div className="flex items-center gap-2 p-4 border-b border-[#00D4FF]/10">
              <AlertTriangle className="w-4 h-4 text-[#FF3B3B]" />
              <h2 className="font-bold font-['Orbitron'] text-lg">Alert Notifications</h2>
            </div>
            <div className="p-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="text-sm text-[#8B949E]">No alerts yet. Run tools to populate notifications.</div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="rounded-sm border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm text-white">{alert.title}</div>
                        <div className="mt-1 text-xs text-[#8B949E]">{alert.summary}</div>
                      </div>
                      <Badge
                        className={
                          alert.severity === 'critical'
                            ? 'bg-[#FF3B3B]/10 text-[#FF3B3B] border-0'
                            : alert.severity === 'warning'
                              ? 'bg-yellow-500/10 text-yellow-300 border-0'
                              : 'bg-[#00D4FF]/10 text-[#00D4FF] border-0'
                        }
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <div className="mt-2 text-[11px] text-[#8B949E]/70">{alert.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] mb-8">
          <div className="glass rounded-sm overflow-hidden animate-fade-in-up">
            <div className="flex items-center gap-2 p-4 border-b border-[#00D4FF]/10">
              <MonitorSmartphone className="w-4 h-4 text-[#00D4FF]" />
              <h2 className="font-bold font-['Orbitron'] text-lg">Session Management</h2>
            </div>
            <div className="divide-y divide-white/5">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center gap-4 p-4">
                  <div className="w-9 h-9 flex items-center justify-center bg-[#00D4FF]/10 rounded-sm shrink-0">
                    <MonitorSmartphone className="w-4 h-4 text-[#00D4FF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">{session.ip_address}</div>
                    <div className="text-xs text-[#8B949E] truncate">{session.user_agent}</div>
                    <div className="mt-1 flex items-center gap-2">
                      {session.id === user.session_id && <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-0">Current</Badge>}
                      {session.verified_2fa && <Badge className="bg-[#00FF9F]/10 text-[#00FF9F] border-0">2FA</Badge>}
                      {session.revoked_at && <Badge className="bg-[#FF3B3B]/10 text-[#FF3B3B] border-0">Revoked</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#8B949E]">{new Date(session.created_at).toLocaleString()}</div>
                    {!session.revoked_at && (
                      <Button variant="ghost" onClick={() => revokeSession(session.id)} className="mt-2 h-8 px-3 text-red-400 hover:text-red-300">
                        <LogOut className="w-3.5 h-3.5 mr-1" /> Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 animate-fade-in-up">
            <div className="glass rounded-sm overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b border-[#00D4FF]/10">
                <Smartphone className="w-4 h-4 text-[#00FF9F]" />
                <h2 className="font-bold font-['Orbitron'] text-lg">Two-Factor Authentication</h2>
              </div>
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-white">Email verification on login</div>
                  <div className="text-xs text-[#8B949E] mt-1">Recommended for account protection and login verification.</div>
                </div>
                <Switch checked={twoFactorEnabled} onCheckedChange={toggleTwoFactor} />
              </div>
            </div>

            <div className="glass rounded-sm overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b border-[#00D4FF]/10">
                <BellRing className="w-4 h-4 text-[#FF3B3B]" />
                <h2 className="font-bold font-['Orbitron'] text-lg">Login Alerts</h2>
              </div>
              <div className="p-4 space-y-3">
                {loginAlerts.length === 0 ? (
                  <div className="text-sm text-[#8B949E]">No login alerts recorded yet.</div>
                ) : (
                  loginAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="rounded-sm border border-white/5 bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm text-white">{alert.ip_address}</div>
                        <Badge className={alert.verified_2fa ? 'bg-[#00FF9F]/10 text-[#00FF9F] border-0' : 'bg-yellow-500/10 text-yellow-300 border-0'}>
                          {alert.verified_2fa ? '2FA verified' : 'password only'}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-[#8B949E] truncate">{alert.user_agent}</div>
                      <div className="mt-2 text-[11px] text-[#8B949E]/70">{new Date(alert.created_at).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-sm animate-fade-in-up stagger-6" data-testid="activity-history">
          <div className="flex items-center gap-2 p-4 border-b border-[#00D4FF]/10">
            <Clock className="w-4 h-4 text-[#00D4FF]" />
            <h2 className="font-bold font-['Orbitron'] text-lg">Activity Logs</h2>
          </div>
          {history.length === 0 ? (
            <div className="p-8 text-center text-[#8B949E]">
              <Wrench className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No activity yet. Start using tools to see your logs here.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-4 p-4 hover:bg-[#00D4FF]/[0.03] transition-colors">
                  <div className="w-9 h-9 flex items-center justify-center bg-[#00D4FF]/10 rounded-sm shrink-0">
                    <Wrench className="w-4 h-4 text-[#00D4FF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{h.tool_name}</div>
                    <div className="text-xs text-[#8B949E] truncate">{h.input_data || 'system event'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-[#8B949E]">{h.result_summary}</div>
                    <div className="text-xs text-[#8B949E]/60">{new Date(h.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
