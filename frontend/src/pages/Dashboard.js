import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Scan, FlaskConical, CheckCircle, Bot, Clock, Wrench, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const { user, api, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!user) return;
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/history'),
    ]).then(([s, h]) => {
      setStats(s.data);
      setHistory(h.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user, authLoading, api, navigate]);

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
    { icon: CheckCircle, label: 'Challenges Solved', value: stats?.challenges_solved || 0, color: 'text-[#00D4FF]' },
    { icon: Bot, label: 'AI Conversations', value: stats?.ai_conversations || 0, color: 'text-blue-400' },
  ];

  return (
    <div className="min-h-screen relative" data-testid="dashboard-page">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 py-10 relative">
        {/* Header */}
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 flex items-center justify-center bg-[#00D4FF]/10 rounded-sm">
              <Shield className="w-5 h-5 text-[#00D4FF]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-['Orbitron']">
                Welcome, <span className="neon-text">{user.username}</span>
              </h1>
              <p className="text-sm text-[#8B949E]">{user.email} &bull; {user.role}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {statCards.map((s, i) => (
            <div
              key={i}
              data-testid={`stat-card-${i}`}
              className={`glass card-interactive p-5 rounded-sm animate-fade-in-up stagger-${i + 1}`}
            >
              <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
              <div className="text-2xl font-black font-['Orbitron'] mb-1">{s.value}</div>
              <div className="text-xs text-[#8B949E]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Activity History */}
        <div className="glass rounded-sm animate-fade-in-up stagger-5" data-testid="activity-history">
          <div className="flex items-center gap-2 p-4 border-b border-[#00D4FF]/10">
            <Clock className="w-4 h-4 text-[#00D4FF]" />
            <h2 className="font-bold font-['Orbitron'] text-lg">Recent Activity</h2>
          </div>
          {history.length === 0 ? (
            <div className="p-8 text-center text-[#8B949E]">
              <Wrench className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No activity yet. Start using tools to see your history here.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-4 p-4 hover:bg-[#00D4FF]/[0.03] transition-colors">
                  <div className="w-8 h-8 flex items-center justify-center bg-[#00D4FF]/10 rounded-sm shrink-0">
                    <Wrench className="w-4 h-4 text-[#00D4FF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{h.tool_name}</div>
                    <div className="text-xs text-[#8B949E] truncate">{h.input_data}</div>
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
