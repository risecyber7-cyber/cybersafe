import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle,
  Clock3,
  FlaskConical,
  LogOut,
  MonitorSmartphone,
  Scan,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const sidebarItems = [
  { id: 'overview', label: 'Dashboard', icon: Shield },
  { id: 'live-scan', label: 'Scan', icon: Scan },
  { id: 'reports', label: 'Reports', icon: BellRing },
];

const cardMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
};

const EARTH_HUBS = [
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194, region: 'US-West', status: 'Stable' },
  { name: 'New York', lat: 40.7128, lon: -74.006, region: 'US-East', status: 'Stable' },
  { name: 'Sao Paulo', lat: -23.5505, lon: -46.6333, region: 'LATAM', status: 'Monitoring' },
  { name: 'London', lat: 51.5072, lon: -0.1276, region: 'Europe', status: 'Stable' },
  { name: 'Lagos', lat: 6.5244, lon: 3.3792, region: 'Africa', status: 'Monitoring' },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708, region: 'Middle-East', status: 'Stable' },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198, region: 'SEA', status: 'Optimal' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, region: 'APAC', status: 'Optimal' },
];

function EarthOverview() {
  const earthMarkers = useMemo(
    () =>
      EARTH_HUBS.map((hub, index) => {
        const x = 180 + (hub.lon / 180) * 110;
        const y = 180 - (hub.lat / 90) * 92;
        return {
          ...hub,
          id: `${hub.name}-${index}`,
          x,
          y,
        };
      }),
    []
  );

  const monitoredRegions = new Set(EARTH_HUBS.map((hub) => hub.region)).size;
  const stableHubs = EARTH_HUBS.filter((hub) => hub.status !== 'Monitoring').length;

  return (
    <motion.section
      {...cardMotion}
      transition={{ ...cardMotion.transition, delay: 0.14 }}
      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
    >
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[var(--cyber-muted)]">Earth Visualization</div>
          <h2 className="mt-2 text-xl font-bold text-[var(--cyber-text)] font-['Orbitron']">Global Earth Grid</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--cyber-muted)]">
            A rotating earth-style control view showing monitored hubs, calm orbital motion, and global platform coverage.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-[var(--cyber-muted)]">
          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.24em]">Active Hubs</div>
            <div className="mt-2 text-2xl font-black text-[var(--cyber-text)] font-['Orbitron']">{EARTH_HUBS.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.24em]">Regions</div>
            <div className="mt-2 text-2xl font-black text-[var(--cyber-text)] font-['Orbitron']">{monitoredRegions}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.24em]">Stable Nodes</div>
            <div className="mt-2 text-2xl font-black text-[var(--cyber-text)] font-['Orbitron']">{stableHubs}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="attack-map-shell rounded-[24px] border border-[var(--cyber-blue)]/15 bg-[#07101a] p-3">
          <svg viewBox="0 0 420 360" className="h-full w-full overflow-visible rounded-[18px]">
            <defs>
              <radialGradient id="earthGlow" cx="50%" cy="48%" r="58%">
                <stop offset="0%" stopColor="rgba(0,194,255,0.32)" />
                <stop offset="65%" stopColor="rgba(0,194,255,0.08)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
              <linearGradient id="earthSphere" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(12, 32, 56, 0.98)" />
                <stop offset="55%" stopColor="rgba(8, 87, 124, 0.88)" />
                <stop offset="100%" stopColor="rgba(2, 11, 25, 0.98)" />
              </linearGradient>
              <filter id="attackGlow">
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width="420" height="360" fill="url(#earthGlow)" />

            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: '180px 180px' }}
            >
              <circle cx="180" cy="180" r="126" fill="url(#earthSphere)" stroke="rgba(130,189,224,0.24)" />
              <ellipse cx="180" cy="180" rx="126" ry="42" fill="none" stroke="rgba(144,214,255,0.18)" />
              <ellipse cx="180" cy="180" rx="126" ry="78" fill="none" stroke="rgba(144,214,255,0.16)" />
              <ellipse cx="180" cy="180" rx="126" ry="108" fill="none" stroke="rgba(144,214,255,0.12)" />
              <ellipse cx="180" cy="180" rx="42" ry="126" fill="none" stroke="rgba(144,214,255,0.15)" />
              <ellipse cx="180" cy="180" rx="84" ry="126" fill="none" stroke="rgba(144,214,255,0.1)" />

              <path d="M103 134c24-18 44-20 59-15 9 3 20 11 26 20-8 13-27 18-40 20-20 3-44 2-61-4-10-3-20-10-19-21 0-1 12-1 35 0z" fill="rgba(141, 214, 255, 0.18)" />
              <path d="M173 110c22-14 51-17 75-13 17 3 39 11 51 27 15 18 7 39-14 47-31 13-89 14-122 4-17-5-38-18-35-40 1-10 12-18 22-25 8-6 15-10 23-12z" fill="rgba(141, 214, 255, 0.13)" />
              <path d="M140 214c18-10 43-12 64-7 14 4 31 13 35 29 5 15-4 31-18 38-24 13-61 13-83 0-12-7-21-19-19-33 2-10 9-18 21-27z" fill="rgba(95, 197, 168, 0.16)" />
            </motion.g>

            <motion.ellipse
              cx="180"
              cy="180"
              rx="154"
              ry="60"
              fill="none"
              stroke="rgba(216,179,106,0.22)"
              strokeDasharray="10 14"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: '180px 180px' }}
            />
            <motion.ellipse
              cx="180"
              cy="180"
              rx="154"
              ry="60"
              fill="none"
              stroke="rgba(0,194,255,0.2)"
              strokeDasharray="6 12"
              animate={{ rotate: -360 }}
              transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: '180px 180px' }}
            />

            {earthMarkers.map((hub) => (
              <g key={hub.id} transform={`translate(${hub.x} ${hub.y})`}>
                <motion.circle
                  cx="0"
                  cy="0"
                  r="12"
                  fill="rgba(0,194,255,0.08)"
                  animate={{ scale: [0.7, 1.7, 0.7], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeOut' }}
                />
                <circle
                  cx="0"
                  cy="0"
                  r="3.5"
                  fill={hub.status === 'Monitoring' ? 'rgba(216,179,106,0.95)' : 'rgba(0,194,255,0.95)'}
                  filter="url(#attackGlow)"
                />
              </g>
            ))}

            <g opacity="0.9">
              {earthMarkers.map((hub) => (
                <g key={`${hub.id}-label`}>
                  <line x1={hub.x} y1={hub.y} x2="340" y2={hub.y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 6" />
                  <text x="348" y={hub.y + 4} fill="rgba(221,232,243,0.8)" fontSize="10">
                    {hub.name}
                  </text>
                </g>
              ))}
            </g>

            <g opacity="0.1">
              {Array.from({ length: 7 }).map((_, index) => (
                <line
                  key={`h-${index}`}
                  x1="0"
                  x2="420"
                  y1={40 + index * 40}
                  y2={40 + index * 40}
                  stroke="rgba(110,143,190,0.35)"
                  strokeDasharray="4 10"
                />
              ))}
            </g>
          </svg>
        </div>

        <div className="space-y-3">
          {EARTH_HUBS.map((hub) => (
            <div key={hub.name} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-[var(--cyber-text)]">{hub.name}</div>
                  <div className="mt-1 text-xs text-[var(--cyber-muted)]">{hub.region} coverage node</div>
                </div>
                <Badge
                  className={
                    hub.status === 'Monitoring'
                      ? 'border-0 bg-[var(--cyber-orange)]/12 text-[var(--cyber-orange)]'
                      : hub.status === 'Optimal'
                        ? 'border-0 bg-[var(--cyber-green)]/12 text-[var(--cyber-green)]'
                        : 'border-0 bg-[var(--cyber-blue)]/12 text-[var(--cyber-blue)]'
                  }
                >
                  {hub.status}
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--cyber-muted)]">
                <span>{hub.lat.toFixed(1)} latitude</span>
                <span>{hub.lon.toFixed(1)} longitude</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
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
      .then(([statsRes, historyRes, sessionsRes, alertsRes]) => {
        setStats(statsRes.data);
        setHistory(historyRes.data);
        setSessions(sessionsRes.data);
        setLoginAlerts(alertsRes.data);
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
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, revoked_at: new Date().toISOString() } : session
        )
      );
      toast.success('Session revoked');
      if (sessionId === user.session_id) {
        await logout();
        navigate('/auth');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to revoke session');
    }
  };

  const statCards = useMemo(
    () => [
      {
        label: 'Scans',
        value: stats?.total_scans || 0,
        icon: Scan,
        tint: 'text-[var(--cyber-orange)]',
      },
      {
        label: 'Threats',
        value: history.filter((item) => /critical|risk|warning|breach|malware/i.test(item.result_summary || '')).length,
        icon: ShieldAlert,
        tint: 'text-[var(--cyber-red)]',
      },
      {
        label: 'Reports',
        value: loginAlerts.length || history.length,
        icon: BellRing,
        tint: 'text-[var(--cyber-blue)]',
      },
    ],
    [stats, history, loginAlerts]
  );

  const liveLogs = useMemo(() => {
    const derived = history.slice(0, 6).map((item) => {
      const summary = item.result_summary || 'Scan event recorded';
      if (/critical|breach|malware|exposed/i.test(summary)) return `[!] ${item.tool_name}: ${summary}`;
      if (/warning|risk|missing/i.test(summary)) return `[~] ${item.tool_name}: ${summary}`;
      return `[+] ${item.tool_name}: ${summary}`;
    });

    if (derived.length > 0) return derived;

    return [
      '[+] Command center online',
      '[+] Awaiting authenticated scan activity',
      '[~] No live telemetry recorded yet',
    ];
  }, [history]);

  const quickStats = useMemo(
    () => ({
      attempted: stats?.challenges_attempted || 0,
      solved: stats?.challenges_solved || 0,
      activeSessions: stats?.active_sessions || sessions.filter((session) => !session.revoked_at).length,
    }),
    [stats, sessions]
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-3xl px-6 py-4 text-sm tracking-[0.24em] uppercase text-[var(--cyber-orange)] font-['Orbitron']">
          Loading command center
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen relative overflow-hidden" data-testid="dashboard-page">
      <div className="absolute inset-0 pointer-events-none opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(216,179,106,0.14),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(110,143,190,0.18),transparent_26%),radial-gradient(circle_at_82%_78%,rgba(147,183,171,0.12),transparent_22%)]" />
        <div className="absolute inset-0 cyber-grid opacity-40" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(21,30,45,0.92),rgba(13,19,32,0.86))] px-5 py-4 shadow-[0_24px_80px_rgba(7,12,20,0.42)] backdrop-blur-xl"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--cyber-orange)]/30 bg-[var(--cyber-orange)]/10">
                <Shield className="h-5 w-5 text-[var(--cyber-orange)]" />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Badge className="border-0 bg-[var(--cyber-orange)]/10 text-[var(--cyber-orange)]">Premium Security Grid</Badge>
                  <Badge className="border-0 bg-[var(--cyber-blue)]/10 text-[var(--cyber-blue)]">Authenticated</Badge>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-[var(--cyber-text)] font-['Orbitron'] sm:text-3xl">
                  CyberSafe Command Center
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-[var(--cyber-muted)]">
                  A live premium dashboard for scans, threat telemetry, session control, and account protection.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-[var(--cyber-text)]">
                  <UserCheck className="h-4 w-4 text-[var(--cyber-green)]" />
                  {user.username}
                </div>
                <div className="mt-1 text-xs text-[var(--cyber-muted)]">{user.email}</div>
              </div>

              <Button
                onClick={() => navigate('/tools')}
                className="btn-glow rounded-xl border border-[var(--cyber-orange)]/30 bg-[var(--cyber-orange)]/10 text-[var(--cyber-orange)] hover:bg-[var(--cyber-orange)]/15"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Start Scan
              </Button>

              <Button
                variant="ghost"
                onClick={logout}
                className="rounded-xl border border-white/10 text-[var(--cyber-text)] hover:bg-white/5"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          <motion.aside
            {...cardMotion}
            className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
          >
            <div className="mb-4 text-xs uppercase tracking-[0.3em] text-[var(--cyber-muted)]">Navigation</div>
            <div className="space-y-2">
              {sidebarItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/10 px-4 py-3 text-sm text-[var(--cyber-text)] transition-colors hover:border-[var(--cyber-orange)]/20 hover:bg-white/[0.03]"
                >
                  <item.icon className="h-4 w-4 text-[var(--cyber-orange)]" />
                  {item.label}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--cyber-blue)]/15 bg-[var(--cyber-blue)]/8 p-4">
              <div className="text-xs uppercase tracking-[0.28em] text-[var(--cyber-muted)]">Account Shield</div>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-[var(--cyber-text)]">2FA Login</div>
                  <div className="mt-1 text-xs text-[var(--cyber-muted)]">Email verification for every protected session.</div>
                </div>
                <Switch checked={twoFactorEnabled} onCheckedChange={toggleTwoFactor} />
              </div>
            </div>
          </motion.aside>

          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-3">
              {statCards.map((card, index) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ scale: 1.02, y: -3 }}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-[var(--cyber-muted)]">{card.label}</div>
                      <div className="mt-3 text-4xl font-black text-[var(--cyber-text)] font-['Orbitron']">{card.value}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                      <card.icon className={`h-5 w-5 ${card.tint}`} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <motion.section
                {...cardMotion}
                transition={{ ...cardMotion.transition, delay: 0.08 }}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
              >
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-[var(--cyber-muted)]">Live Scan Status</div>
                    <h2 className="mt-2 text-xl font-bold text-[var(--cyber-text)] font-['Orbitron']">Telemetry Overview</h2>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.08, boxShadow: '0px 0px 24px rgba(216,179,106,0.25)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Button
                      onClick={() => navigate('/tools')}
                      className="rounded-xl border border-[var(--cyber-orange)]/35 bg-black/20 text-[var(--cyber-orange)] hover:bg-[var(--cyber-orange)]/10"
                    >
                      Start Scan
                    </Button>
                  </motion.div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs uppercase tracking-[0.26em] text-[var(--cyber-muted)]">Challenges</div>
                    <div className="mt-3 flex items-center gap-2 text-2xl font-black text-[var(--cyber-text)] font-['Orbitron']">
                      <FlaskConical className="h-5 w-5 text-[var(--cyber-blue)]" />
                      {quickStats.attempted}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs uppercase tracking-[0.26em] text-[var(--cyber-muted)]">Solved</div>
                    <div className="mt-3 flex items-center gap-2 text-2xl font-black text-[var(--cyber-text)] font-['Orbitron']">
                      <CheckCircle className="h-5 w-5 text-[var(--cyber-green)]" />
                      {quickStats.solved}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <div className="text-xs uppercase tracking-[0.26em] text-[var(--cyber-muted)]">Sessions</div>
                    <div className="mt-3 flex items-center gap-2 text-2xl font-black text-[var(--cyber-text)] font-['Orbitron']">
                      <MonitorSmartphone className="h-5 w-5 text-[var(--cyber-orange)]" />
                      {quickStats.activeSessions}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[22px] border border-[var(--cyber-orange)]/25 bg-black/35 p-4 font-mono text-sm">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="text-[var(--cyber-orange)]">Live terminal logs</div>
                    <div className="text-xs text-[var(--cyber-muted)]">updated from dashboard history</div>
                  </div>
                  <div className="max-h-52 space-y-2 overflow-y-auto text-[var(--cyber-text)]">
                    {liveLogs.map((log, index) => (
                      <motion.div
                        key={`${log}-${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {log}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.section>

              <motion.section
                {...cardMotion}
                transition={{ ...cardMotion.transition, delay: 0.12 }}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
              >
                <div className="mb-5 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--cyber-red)]" />
                  <h2 className="text-lg font-bold text-[var(--cyber-text)] font-['Orbitron']">Priority Alerts</h2>
                </div>

                <div className="space-y-3">
                  {history.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-[var(--cyber-muted)]">
                      No threat alerts yet. Start scans to populate the command feed.
                    </div>
                  ) : (
                    history.slice(0, 4).map((item, index) => {
                      const summary = item.result_summary || 'Recorded event';
                      const severe = /critical|breach|malware|exposed/i.test(summary);
                      const risky = /warning|risk|missing/i.test(summary);
                      return (
                        <div key={`${item.created_at}-${index}`} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm text-[var(--cyber-text)]">{item.tool_name}</div>
                              <div className="mt-1 text-xs leading-5 text-[var(--cyber-muted)]">{summary}</div>
                            </div>
                            <Badge
                              className={
                                severe
                                  ? 'border-0 bg-[var(--cyber-red)]/12 text-[var(--cyber-red)]'
                                  : risky
                                    ? 'border-0 bg-[var(--cyber-orange)]/12 text-[var(--cyber-orange)]'
                                    : 'border-0 bg-[var(--cyber-blue)]/12 text-[var(--cyber-blue)]'
                              }
                            >
                              {severe ? 'critical' : risky ? 'warning' : 'stable'}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--cyber-muted)]">
                            <Clock3 className="h-3.5 w-3.5" />
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.section>
            </div>

            <EarthOverview />

            <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <motion.section
                {...cardMotion}
                transition={{ ...cardMotion.transition, delay: 0.14 }}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
              >
                <div className="mb-5 flex items-center gap-2">
                  <MonitorSmartphone className="h-4 w-4 text-[var(--cyber-blue)]" />
                  <h2 className="text-lg font-bold text-[var(--cyber-text)] font-['Orbitron']">Session Control</h2>
                </div>

                <div className="space-y-3">
                  {sessions.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-[var(--cyber-muted)]">
                      No active sessions recorded.
                    </div>
                  ) : (
                    sessions.slice(0, 4).map((session) => (
                      <div key={session.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm text-[var(--cyber-text)]">{session.ip_address}</div>
                            <div className="mt-1 truncate text-xs text-[var(--cyber-muted)]">{session.user_agent}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {session.id === user.session_id && (
                                <Badge className="border-0 bg-[var(--cyber-blue)]/12 text-[var(--cyber-blue)]">Current</Badge>
                              )}
                              {session.verified_2fa && (
                                <Badge className="border-0 bg-[var(--cyber-green)]/12 text-[var(--cyber-green)]">2FA</Badge>
                              )}
                              {session.revoked_at && (
                                <Badge className="border-0 bg-[var(--cyber-red)]/12 text-[var(--cyber-red)]">Revoked</Badge>
                              )}
                            </div>
                          </div>
                          {!session.revoked_at && (
                            <Button
                              variant="ghost"
                              onClick={() => revokeSession(session.id)}
                              className="rounded-xl border border-white/10 text-[var(--cyber-text)] hover:bg-white/5"
                            >
                              <LogOut className="mr-2 h-4 w-4 text-[var(--cyber-red)]" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.section>

              <motion.section
                {...cardMotion}
                transition={{ ...cardMotion.transition, delay: 0.18 }}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
              >
                <div className="mb-5 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[var(--cyber-orange)]" />
                  <h2 className="text-lg font-bold text-[var(--cyber-text)] font-['Orbitron']">Recent Reports</h2>
                </div>

                <div className="space-y-3">
                  {history.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-[var(--cyber-muted)]">
                      Activity logs will appear here once tools are used.
                    </div>
                  ) : (
                    history.slice(0, 5).map((item, index) => (
                      <div key={`${item.created_at}-${index}`} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm text-[var(--cyber-text)]">
                              <Wrench className="h-4 w-4 text-[var(--cyber-orange)]" />
                              {item.tool_name}
                            </div>
                            <div className="mt-1 truncate text-xs text-[var(--cyber-muted)]">
                              {item.input_data || 'system event'}
                            </div>
                          </div>
                          <div className="text-right text-[11px] text-[var(--cyber-muted)]">
                            {new Date(item.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="mt-3 text-xs leading-5 text-[var(--cyber-muted)]">{item.result_summary}</div>
                      </div>
                    ))
                  )}
                </div>
              </motion.section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
