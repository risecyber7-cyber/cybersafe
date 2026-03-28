import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, FileText, Terminal, BarChart3, Trash2, UserCog, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BACKEND_URL, SSH_HOST_LABEL, SSH_TERMINAL_ENABLED, getWebSocketBase } from '@/lib/config';

export default function AdminPanel() {
  const { user, api, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [s, u, sub] = await Promise.all([
        api.get('/admin/stats'), api.get('/admin/users'), api.get('/admin/subscriptions'),
      ]);
      setStats(s.data); setUsers(u.data); setSubs(sub.data);
    } catch { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) { navigate('/'); return; }
    if (!user) return;
    loadData();
  }, [user, authLoading, navigate, loadData]);

  const deleteUser = async (userId) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User deleted');
    } catch (err) { toast.error(err.response?.data?.detail || 'Delete failed'); }
    setDeleteDialog(null);
  };

  const updateRole = async (userId, role) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      toast.success(`Role updated to ${role}`);
    } catch { toast.error('Role update failed'); }
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-[#00D4FF] font-mono animate-pulse">Loading admin panel...</div></div>;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen relative" data-testid="admin-panel">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 py-10 relative">
        <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
          <div className="w-10 h-10 flex items-center justify-center bg-[#00D4FF]/10 rounded-sm">
            <Shield className="w-5 h-5 text-[#00D4FF]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Orbitron'] tracking-tight">Admin <span className="neon-text">Panel</span></h1>
            <p className="text-sm text-[#8B949E]">Manage users, content, and system</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { label: 'Users', value: stats.total_users, icon: Users },
              { label: 'Articles', value: stats.total_articles, icon: FileText },
              { label: 'Scans', value: stats.total_scans, icon: BarChart3 },
              { label: 'Challenges', value: stats.total_challenges, icon: Terminal },
              { label: 'Solved', value: stats.successful_challenges, icon: Shield },
              { label: 'Subscriptions', value: stats.total_subscriptions, icon: CreditCard },
            ].map((s, i) => (
              <div key={i} data-testid={`admin-stat-${i}`} className={`glass p-4 rounded-sm animate-fade-in-up stagger-${i + 1}`}>
                <s.icon className="w-4 h-4 text-[#00D4FF] mb-2" />
                <div className="text-xl font-black font-['Orbitron']">{s.value}</div>
                <div className="text-xs text-[#8B949E]">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="users" className="animate-fade-in-up">
          <TabsList className="bg-[#0D1117]/60 border border-[#00D4FF]/10 rounded-sm p-1">
            <TabsTrigger value="users" data-testid="admin-tab-users" className="rounded-sm data-[state=active]:bg-[#00D4FF]/10 data-[state=active]:text-[#00D4FF]"><Users className="w-3.5 h-3.5 mr-1.5" />Users</TabsTrigger>
            <TabsTrigger value="subscriptions" data-testid="admin-tab-subs" className="rounded-sm data-[state=active]:bg-[#00D4FF]/10 data-[state=active]:text-[#00D4FF]"><CreditCard className="w-3.5 h-3.5 mr-1.5" />Subscriptions</TabsTrigger>
            <TabsTrigger value="terminal" data-testid="admin-tab-terminal" className="rounded-sm data-[state=active]:bg-[#00D4FF]/10 data-[state=active]:text-[#00D4FF]"><Terminal className="w-3.5 h-3.5 mr-1.5" />SSH Terminal</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <div className="glass rounded-sm overflow-hidden" data-testid="admin-users-table">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-[#00D4FF]/10 text-xs text-[#8B949E]">
                    <th className="text-left p-3">Username</th><th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Role</th><th className="text-left p-3">Verified</th>
                    <th className="text-left p-3">Joined</th><th className="text-left p-3">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-[#00D4FF]/[0.03]">
                        <td className="p-3 text-sm font-medium">{u.username}</td>
                        <td className="p-3 text-sm text-[#8B949E]">{u.email}</td>
                        <td className="p-3">
                          <Select defaultValue={u.role} onValueChange={v => updateRole(u.id, v)}>
                            <SelectTrigger data-testid={`role-select-${u.id}`} className="w-24 h-7 bg-transparent border-[#00D4FF]/10 text-xs rounded-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0D1117] border-[#00D4FF]/10 text-white">
                              <SelectItem value="user">user</SelectItem>
                              <SelectItem value="admin">admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Badge className={u.email_verified ? 'bg-[#00D4FF]/20 text-[#00D4FF] border-0' : 'bg-red-500/20 text-red-400 border-0'}>{u.email_verified ? 'Yes' : 'No'}</Badge>
                        </td>
                        <td className="p-3 text-xs text-[#8B949E]">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          {u.id !== user.id && (
                            <Button data-testid={`delete-user-${u.id}`} variant="ghost" size="sm" onClick={() => setDeleteDialog(u)} className="text-red-400 hover:text-red-300 h-7 px-2">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-6">
            <div className="glass rounded-sm overflow-hidden" data-testid="admin-subs-table">
              {subs.length === 0 ? (
                <div className="p-8 text-center text-[#8B949E]">No subscriptions yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-[#00D4FF]/10 text-xs text-[#8B949E]">
                      <th className="text-left p-3">Name</th><th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Plan</th><th className="text-left p-3">Price</th>
                      <th className="text-left p-3">Status</th><th className="text-left p-3">Date</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {subs.map(s => (
                        <tr key={s.id} className="hover:bg-[#00D4FF]/[0.03]">
                          <td className="p-3 text-sm">{s.name}</td>
                          <td className="p-3 text-sm text-[#8B949E]">{s.email}</td>
                          <td className="p-3"><Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-0">{s.plan_name}</Badge></td>
                          <td className="p-3 text-sm">Rs.{s.price}</td>
                          <td className="p-3"><Badge className="bg-yellow-500/20 text-yellow-400 border-0">{s.status}</Badge></td>
                          <td className="p-3 text-xs text-[#8B949E]">{new Date(s.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="terminal" className="mt-6">
            <SSHTerminal token={token} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="bg-[#0D1117] border-[#00D4FF]/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-['Orbitron']">Delete User</DialogTitle>
            <DialogDescription className="text-[#8B949E]">
              Are you sure you want to delete <b className="text-white">{deleteDialog?.username}</b>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteDialog(null)} className="text-[#8B949E]">Cancel</Button>
            <Button data-testid="confirm-delete-user" onClick={() => deleteUser(deleteDialog?.id)} className="bg-red-500 text-white hover:bg-red-600 rounded-sm">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── SSH Terminal Component ──────────────────────────────
function SSHTerminal({ token }) {
  const termRef = useRef(null);
  const termInstance = useRef(null);
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (connecting || connected) return;
    setConnecting(true);

    if (!SSH_TERMINAL_ENABLED) {
      toast.error('SSH terminal is disabled for this deployment');
      setConnecting(false);
      return;
    }

    try {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      await import('@xterm/xterm/css/xterm.css');

      if (termInstance.current) {
        termInstance.current.dispose();
      }

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "'Source Code Pro', monospace",
        fontSize: 14,
        theme: {
          background: '#050505',
          foreground: '#00D4FF',
          cursor: '#00D4FF',
          selectionBackground: 'rgba(0, 255, 102, 0.3)',
        },
        rows: 24,
        cols: 100,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(termRef.current);
      fitAddon.fit();
      termInstance.current = term;

      term.writeln('\x1b[32m[CyberGuard] Connecting to remote server...\x1b[0m');

      const resolvedBackendUrl = BACKEND_URL || window.location.origin;
      const healthCheck = await fetch(`${resolvedBackendUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);

      if (!healthCheck) {
        term.writeln('\r\n\x1b[31m[Error] Backend is not reachable at the configured URL\x1b[0m');
        setConnecting(false);
        return;
      }

      if (!healthCheck.ok) {
        term.writeln(`\r\n\x1b[31m[Error] Admin authentication failed (${healthCheck.status})\x1b[0m`);
        setConnecting(false);
        return;
      }

      const wsBase = getWebSocketBase();
      const wsHost = wsBase.replace(/^wss?:\/\//, '');
      const ws = new WebSocket(`${wsBase}/api/ws/terminal?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
      };

      ws.onmessage = (event) => {
        term.write(event.data);
      };

      ws.onerror = () => {
        term.writeln(`\r\n\x1b[31m[Error] WebSocket connection failed to ${wsHost}\x1b[0m`);
        term.writeln('\x1b[33m[Hint] Local backend should be reachable on 127.0.0.1:8000\x1b[0m');
        setConnecting(false);
      };

      ws.onclose = (event) => {
        if (event.code === 4001) {
          term.writeln('\r\n\x1b[31m[Error] Authentication failed for SSH session\x1b[0m');
        } else if (event.code === 4003) {
          term.writeln('\r\n\x1b[31m[Error] Admin role required for SSH console\x1b[0m');
        } else {
          term.writeln('\r\n\x1b[33m[Disconnected] SSH session ended\x1b[0m');
        }
        setConnected(false);
        setConnecting(false);
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      const handleResize = () => fitAddon.fit();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    } catch (err) {
      console.error('Terminal init error:', err);
      termInstance.current?.writeln('\r\n\x1b[31m[Error] SSH terminal failed to initialize\x1b[0m');
      setConnecting(false);
    }
  }, [token, connecting, connected]);

  const disconnect = () => {
    if (wsRef.current) wsRef.current.close();
    if (termInstance.current) termInstance.current.dispose();
    termInstance.current = null;
    setConnected(false);
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (termInstance.current) termInstance.current.dispose();
    };
  }, []);

  return (
    <div className="space-y-4" data-testid="ssh-terminal-section">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#00D4FF]" />
          <span className="text-sm font-bold font-['Orbitron']">SSH Console</span>
          <Badge className={connected ? 'bg-[#00D4FF]/20 text-[#00D4FF] border-0' : 'bg-[#00D4FF]/5 text-[#8B949E] border-0'}>
            {connected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
          </Badge>
        </div>
        <div className="flex gap-2">
          {!connected ? (
            <Button data-testid="ssh-connect-btn" onClick={connect} disabled={connecting} className="bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm h-8 px-4 text-xs">
              {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect'}
            </Button>
          ) : (
            <Button data-testid="ssh-disconnect-btn" onClick={disconnect} variant="ghost" className="text-red-400 hover:text-red-300 h-8 px-4 text-xs border border-red-400/20">
              Disconnect
            </Button>
          )}
        </div>
      </div>

      <div className="terminal-bg rounded-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#00D4FF]/10 bg-black/50">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#00D4FF]" />
          <span className="text-xs text-[#8B949E] ml-2 font-mono">ssh://{SSH_HOST_LABEL}</span>
        </div>
        <div ref={termRef} className="min-h-[400px] bg-[#050505]" />
        {!connected && !connecting && (
          <div className="p-6 text-center">
            <Terminal className="w-8 h-8 text-[#00D4FF]/30 mx-auto mb-3" />
            <p className="text-sm text-[#8B949E]">
              {!SSH_TERMINAL_ENABLED ? 'SSH terminal is disabled for this deployment' : 'Click "Connect" to start an SSH session'}
            </p>
            <p className="text-xs text-[#8B949E]/60 mt-1">Admin-only access to remote server console</p>
          </div>
        )}
      </div>
    </div>
  );
}
