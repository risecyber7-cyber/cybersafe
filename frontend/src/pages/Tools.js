import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, Download, Globe, Loader2, Radar, Server, Settings2, ShieldAlert, TerminalSquare, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { getWebSocketBase } from '@/lib/config';

const STAGES = [
  { key: 'queued', label: 'Queued', progress: 0 },
  { key: 'subdomains', label: 'Subdomains', progress: 20 },
  { key: 'hosts', label: 'Live Hosts', progress: 45 },
  { key: 'ports', label: 'Open Ports', progress: 72 },
  { key: 'urls', label: 'URLs', progress: 92 },
  { key: 'complete', label: 'Complete', progress: 100 },
];

const INITIAL_RESULT = {
  subdomains: [],
  live_hosts: [],
  ports: [],
  urls: [],
  logs: [],
};

const WORKSPACE_TABS = [
  { key: 'console', label: 'Console' },
  { key: 'options', label: 'Options' },
  { key: 'reports', label: 'Reports' },
];

const RECON_PROFILES = [
  { key: 'surface', label: 'Surface', summary: 'Fast passive recon for triage and validation.' },
  { key: 'balanced', label: 'Balanced', summary: 'Default coverage for most external recon targets.' },
  { key: 'deep', label: 'Deep', summary: 'Longer collection path for wider asset discovery.' },
];

function stageFromKey(key) {
  return STAGES.find((stage) => stage.key === key) || STAGES[0];
}

function buildPrintableReport({ domain, result, status, currentStage, startedAt, finishedAt }) {
  const portsMarkup = (result.ports || [])
    .map((port) => `<tr><td>${port.port}/${port.protocol}</td><td>${port.service}</td><td>${port.state}</td></tr>`)
    .join('');
  const listMarkup = (items) => items.map((item) => `<li>${item}</li>`).join('');

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Recon Report - ${domain}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
        h1, h2 { margin-bottom: 12px; }
        .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
        .panel { border: 1px solid #d1d5db; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
        ul { margin: 0; padding-left: 18px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 14px; }
        .logs { white-space: pre-wrap; font-family: monospace; font-size: 12px; background: #111827; color: #d1fae5; padding: 16px; border-radius: 12px; }
      </style>
    </head>
    <body>
      <h1>Reconnaissance Report</h1>
      <div class="meta">
        <div class="panel"><strong>Domain</strong><div>${domain}</div></div>
        <div class="panel"><strong>Status</strong><div>${status}</div></div>
        <div class="panel"><strong>Stage</strong><div>${currentStage.label}</div></div>
        <div class="panel"><strong>Duration</strong><div>${result.duration_seconds || '--'}s</div></div>
        <div class="panel"><strong>Started</strong><div>${startedAt || '--'}</div></div>
        <div class="panel"><strong>Finished</strong><div>${finishedAt || '--'}</div></div>
      </div>
      <div class="panel"><h2>Subdomains</h2><ul>${listMarkup(result.subdomains || [])}</ul></div>
      <div class="panel"><h2>Live Hosts</h2><ul>${listMarkup(result.live_hosts || [])}</ul></div>
      <div class="panel"><h2>Open Ports</h2><table><thead><tr><th>Port</th><th>Service</th><th>State</th></tr></thead><tbody>${portsMarkup}</tbody></table></div>
      <div class="panel"><h2>URLs</h2><ul>${listMarkup(result.urls || [])}</ul></div>
      <div class="panel"><h2>Terminal Logs</h2><div class="logs">${(result.logs || []).join('\n')}</div></div>
      <script>window.print();</script>
    </body>
  </html>`;
}

function ResultBlock({ title, icon: Icon, items, children }) {
  return (
    <section className="rounded-[24px] border border-[#00f7ff]/10 bg-black/25 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#00f7ff]" />
        <h2 className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.24em] text-white">{title}</h2>
        <Badge className="ml-auto border-0 bg-white/5 text-[#8aa3bc]">{items.length}</Badge>
      </div>
      {children}
    </section>
  );
}

export default function Tools() {
  const { user, token, api, loading } = useAuth();
  const navigate = useNavigate();
  const terminalRef = useRef(null);
  const wsRef = useRef(null);
  const [domain, setDomain] = useState('');
  const [scanId, setScanId] = useState('');
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(STAGES[0]);
  const [result, setResult] = useState(INITIAL_RESULT);
  const [startedAt, setStartedAt] = useState('');
  const [finishedAt, setFinishedAt] = useState('');
  const [workspaceTab, setWorkspaceTab] = useState('console');
  const [selectedProfile, setSelectedProfile] = useState('balanced');
  const [capabilities, setCapabilities] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [loadingCapabilities, setLoadingCapabilities] = useState(false);
  const activeProfile = useMemo(
    () => RECON_PROFILES.find((profile) => profile.key === selectedProfile) || RECON_PROFILES[1],
    [selectedProfile],
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!terminalRef.current) return;
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [result.logs]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!user || loading) return;
    let mounted = true;
    const loadWorkspaceMeta = async () => {
      setLoadingCapabilities(true);
      try {
        const [capabilityResponse, reportsResponse] = await Promise.all([
          api.get('/recon/capabilities'),
          api.get('/recon/reports'),
        ]);
        if (!mounted) return;
        setCapabilities(capabilityResponse.data);
        setRecentReports(reportsResponse.data || []);
      } catch (err) {
        if (!mounted) return;
        toast.error(err.response?.data?.detail || 'Failed to load recon workspace state');
      } finally {
        if (mounted) {
          setLoadingCapabilities(false);
        }
      }
    };
    loadWorkspaceMeta();
    return () => {
      mounted = false;
    };
  }, [api, loading, user]);

  const applySnapshot = (payload) => {
    setScanId(payload.scan_id || '');
    setStatus(payload.status || 'idle');
    setProgress(payload.progress || 0);
    setCurrentStage(payload.stage || STAGES[0]);
    setStartedAt(payload.started_at || '');
    setFinishedAt(payload.finished_at || '');
    if (payload.domain) {
      setDomain(payload.domain);
    }
    if (payload.result) {
      setResult({
        subdomains: payload.result.subdomains || [],
        live_hosts: payload.result.live_hosts || [],
        ports: payload.result.ports || [],
        urls: payload.result.urls || [],
        logs: payload.result.logs || [],
        duration_seconds: payload.result.duration_seconds,
      });
    }
  };

  const connectToScan = (nextScanId) => {
    if (!token) return;
    if (wsRef.current) {
      wsRef.current.close();
    }
    const ws = new WebSocket(`${getWebSocketBase()}/api/ws/recon/${nextScanId}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'snapshot') {
          applySnapshot(payload);
          return;
        }
        if (payload.type === 'stage') {
          setStatus(payload.status || 'running');
          setProgress(payload.progress || 0);
          setCurrentStage(payload.stage || STAGES[0]);
          return;
        }
        if (payload.type === 'log') {
          setResult((prev) => ({
            ...prev,
            logs: [...prev.logs, payload.line].slice(-600),
          }));
          return;
        }
        if (payload.type === 'error') {
          toast.error(payload.message || 'Recon socket error');
        }
      } catch {
        toast.error('Invalid recon socket payload');
      }
    };

    ws.onerror = () => {
      toast.error('Recon socket connection failed');
    };
  };

  const startRecon = async () => {
    if (!domain.trim()) {
      toast.error('Enter a domain first');
      return;
    }

    setStatus('starting');
    setProgress(2);
    setCurrentStage(stageFromKey('queued'));
    setResult(INITIAL_RESULT);
    setFinishedAt('');

    try {
      const response = await api.post('/recon/start', { domain: domain.trim() });
      setScanId(response.data.scan_id);
      setStartedAt(new Date().toISOString());
      setResult({
        ...INITIAL_RESULT,
        logs: [`[queue] Recon request accepted for ${response.data.domain}`],
      });
      connectToScan(response.data.scan_id);
      toast.success(`Recon started for ${response.data.domain}`);
    } catch (err) {
      setStatus('idle');
      setProgress(0);
      toast.error(err.response?.data?.detail || 'Failed to start recon');
    }
  };

  const exportPdf = () => {
    if (!domain || result.logs.length === 0) {
      toast.error('Run a scan before exporting');
      return;
    }
    const win = window.open('', '_blank', 'width=1200,height=900');
    if (!win) {
      toast.error('Popup blocked. Allow popups to export the report');
      return;
    }
    win.document.open();
    win.document.write(buildPrintableReport({ domain, result, status, currentStage, startedAt, finishedAt }));
    win.document.close();
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-3xl border border-[#00f7ff]/10 bg-black/30 px-6 py-4 font-['Orbitron'] text-sm uppercase tracking-[0.32em] text-[#00f7ff]">
          Loading tools
        </div>
      </div>
    );
  }

  const isRunning = status === 'running' || status === 'queued' || status === 'starting';
  const readyToolCount = capabilities?.available_count || 0;
  const totalToolCount = capabilities?.total_count || 0;
  const missingTools = (capabilities?.tools || []).filter((tool) => !tool.available);
  const readinessTone = readyToolCount === totalToolCount ? 'text-[#00ff9d]' : readyToolCount >= 4 ? 'text-[#ffd166]' : 'text-[#ff6b81]';

  const loadReport = (report) => {
    applySnapshot({
      scan_id: report.id,
      status: report.status,
      domain: report.domain,
      progress: report.progress,
      stage: stageFromKey(report.stage),
      started_at: report.created_at,
      finished_at: report.finished_at,
      result: report.result,
    });
    setWorkspaceTab('console');
    toast.success(`Loaded report for ${report.domain}`);
  };

  return (
    <div className="min-h-screen bg-[#03070d] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(0,247,255,0.12),transparent_22%),radial-gradient(circle_at_84%_22%,rgba(0,255,157,0.08),transparent_16%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,247,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,247,255,0.03)_1px,transparent_1px)] bg-[size:34px_34px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" data-testid="tools-page">
        <div className="mb-6 rounded-[28px] border border-[#00f7ff]/10 bg-[linear-gradient(140deg,rgba(2,8,14,0.96),rgba(5,14,24,0.92))] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="border-0 bg-[#00f7ff]/10 text-[#00f7ff]">Focused Workspace</Badge>
              <h1 className="mt-4 font-['Orbitron'] text-3xl font-black uppercase tracking-[0.08em] text-white">Recon Tools</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#8ea3b8]">
                One workspace only: run recon on the left, inspect results on the right, and manage real recon coverage from the options tab.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#7d91a8]">Tool Readiness</div>
                <div className={`mt-2 font-['Orbitron'] text-xl font-black ${readinessTone}`}>
                  {loadingCapabilities ? '...' : `${readyToolCount}/${totalToolCount || 6}`}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#7d91a8]">Profile</div>
                <div className="mt-2 font-['Orbitron'] text-xl font-black text-white">{activeProfile.label}</div>
              </div>
              <Button
                onClick={startRecon}
                disabled={isRunning}
                className="h-12 rounded-2xl border border-[#00f7ff]/30 bg-[#00f7ff]/10 px-5 font-['Orbitron'] text-[#00f7ff] hover:bg-[#00f7ff]/15"
              >
                {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
                Start Recon
              </Button>
              <Button
                variant="ghost"
                onClick={exportPdf}
                className="h-12 rounded-2xl border border-white/10 px-5 text-white hover:bg-white/5"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[28px] border border-[#00f7ff]/10 bg-[linear-gradient(180deg,rgba(2,7,14,0.97),rgba(1,4,8,0.96))] p-5"
          >
            <div className="mb-4 flex flex-wrap gap-2">
              {WORKSPACE_TABS.map((tab) => {
                const active = workspaceTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setWorkspaceTab(tab.key)}
                    className={`rounded-2xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${
                      active
                        ? 'border-[#00f7ff]/30 bg-[#00f7ff]/10 text-[#d8ffff]'
                        : 'border-white/8 bg-white/[0.02] text-[#7d91a8] hover:border-[#00f7ff]/20 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {workspaceTab === 'console' && (
              <>
            <div className="mb-4">
              <div className="mb-2 text-xs uppercase tracking-[0.28em] text-[#7d91a8]">Target Domain</div>
              <Input
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && !isRunning && startRecon()}
                placeholder="example.com"
                className="h-13 rounded-2xl border-[#00f7ff]/15 bg-black/35 font-mono text-lg text-[#c8ffee] placeholder:text-[#577088] focus:border-[#00f7ff] focus:ring-1 focus:ring-[#00f7ff]"
              />
            </div>

            <div className="mb-5 rounded-[22px] border border-white/8 bg-black/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TerminalSquare className="h-4 w-4 text-[#00f7ff]" />
                  <span className="font-['Orbitron'] text-sm uppercase tracking-[0.2em] text-white">Scan Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="border-0 bg-[#00ff9d]/10 text-[#00ff9d]">{status}</Badge>
                  <Badge className="border-0 bg-white/5 text-[#8aa3bc]">{currentStage.label}</Badge>
                </div>
              </div>
              <Progress value={progress} className="h-2 bg-white/10 [&>div]:bg-[linear-gradient(90deg,#00f7ff,#00ff9d)]" />
              <div className="mt-4 grid grid-cols-2 gap-2">
                {STAGES.map((stage) => {
                  const active = currentStage.key === stage.key;
                  const complete = progress >= stage.progress;
                  return (
                    <div
                      key={stage.key}
                      className={`rounded-2xl border px-3 py-3 text-xs ${
                        active
                          ? 'border-[#00f7ff]/30 bg-[#00f7ff]/10 text-[#d8ffff]'
                          : complete
                            ? 'border-[#00ff9d]/20 bg-[#00ff9d]/8 text-[#a4f3d0]'
                            : 'border-white/8 bg-white/[0.02] text-[#7d91a8]'
                      }`}
                    >
                      <div className="font-semibold uppercase tracking-[0.18em]">{stage.label}</div>
                      <div className="mt-1 text-[11px]">{stage.progress}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#7d91a8]">Target</div>
                <div className="mt-2 font-mono text-sm text-white">{domain || '--'}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#7d91a8]">Scan ID</div>
                <div className="mt-2 font-mono text-sm text-white">{scanId ? scanId.slice(0, 8) : '--'}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#7d91a8]">Started</div>
                <div className="mt-2 text-sm text-white">{startedAt ? new Date(startedAt).toLocaleString() : '--'}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#7d91a8]">Finished</div>
                <div className="mt-2 text-sm text-white">{finishedAt ? new Date(finishedAt).toLocaleString() : '--'}</div>
              </div>
            </div>

            <div
              ref={terminalRef}
              className="mt-5 h-[540px] overflow-y-auto rounded-[24px] border border-[#00f7ff]/10 bg-[#02060b] p-4 font-mono text-sm text-[#8ef7c2] shadow-[inset_0_0_60px_rgba(0,247,255,0.05)]"
            >
              {result.logs.length === 0 ? (
                <div className="text-[#557086]">Awaiting recon launch...</div>
              ) : (
                result.logs.map((line, index) => (
                  <motion.div
                    key={`${line}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.16 }}
                    className="mb-1 break-all"
                  >
                    <span className="mr-2 text-[#00f7ff]">&gt;</span>
                    {line}
                  </motion.div>
                ))
              )}
              <div className="mt-2 inline-block h-4 w-2 animate-pulse bg-[#00f7ff]" />
            </div>
              </>
            )}

            {workspaceTab === 'options' && (
              <div className="space-y-5">
                <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-[#00f7ff]" />
                    <div className="font-['Orbitron'] text-sm uppercase tracking-[0.2em] text-white">Scan Profiles</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {RECON_PROFILES.map((profile) => {
                      const active = selectedProfile === profile.key;
                      return (
                        <button
                          key={profile.key}
                          type="button"
                          onClick={() => setSelectedProfile(profile.key)}
                          className={`rounded-2xl border p-4 text-left transition-colors ${
                            active
                              ? 'border-[#00f7ff]/30 bg-[#00f7ff]/10'
                              : 'border-white/8 bg-white/[0.02] hover:border-[#00f7ff]/20'
                          }`}
                        >
                          <div className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.16em] text-white">{profile.label}</div>
                          <div className="mt-2 text-sm leading-6 text-[#8ea3b8]">{profile.summary}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-[#00f7ff]" />
                    <div className="font-['Orbitron'] text-sm uppercase tracking-[0.2em] text-white">Engine Readiness</div>
                    <Badge className="ml-auto border-0 bg-white/5 text-[#8aa3bc]">
                      {loadingCapabilities ? 'loading' : `${readyToolCount}/${totalToolCount || 6} online`}
                    </Badge>
                  </div>
                  <div className="mb-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-[#8ea3b8]">
                    Real recon needs the native binaries on the backend host. Missing tools are why scans return empty results.
                  </div>
                  <div className="space-y-3">
                    {(capabilities?.tools || []).map((tool) => (
                      <div key={tool.key} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.16em] text-white">{tool.label}</div>
                          <Badge className={`border-0 ${tool.available ? 'bg-[#00ff9d]/10 text-[#00ff9d]' : 'bg-[#ff6b81]/10 text-[#ff6b81]'}`}>
                            {tool.available ? 'Ready' : 'Missing'}
                          </Badge>
                          <Badge className="border-0 bg-white/5 text-[#8aa3bc]">{tool.stage}</Badge>
                        </div>
                        <div className="mt-2 text-sm text-[#8ea3b8]">{tool.purpose}</div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-xs text-[#8ea3b8]">
                            <div className="uppercase tracking-[0.18em] text-[#63788f]">Path / Version</div>
                            <div className="mt-2 break-all font-mono text-white">{tool.path || tool.version || '--'}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(tool.install_command).then(() => toast.success(`${tool.label} install command copied`)).catch(() => toast.error('Copy failed'))}
                            className="rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-left transition-colors hover:border-[#00f7ff]/20"
                          >
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#63788f]">
                              <Copy className="h-3.5 w-3.5" />
                              Install Command
                            </div>
                            <div className="mt-2 break-all font-mono text-xs text-white">{tool.install_command}</div>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#7d91a8]">Coverage</div>
                    <div className="mt-2 font-['Orbitron'] text-2xl font-black text-white">{capabilities?.coverage_percent ?? 0}%</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#7d91a8]">Stage Timeout</div>
                    <div className="mt-2 font-['Orbitron'] text-2xl font-black text-white">{capabilities?.stage_timeout_seconds ?? '--'}s</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#7d91a8]">Total Timeout</div>
                    <div className="mt-2 font-['Orbitron'] text-2xl font-black text-white">{capabilities?.total_timeout_seconds ?? '--'}s</div>
                  </div>
                </div>

                {missingTools.length > 0 && (
                  <div className="rounded-[22px] border border-[#ff6b81]/20 bg-[#ff6b81]/[0.06] p-4 text-sm leading-7 text-[#f6c2cc]">
                    Missing tools right now: {missingTools.map((tool) => tool.label).join(', ')}. Install these on the backend host if you want real subdomains,
                    hosts, ports, and URL coverage.
                  </div>
                )}
              </div>
            )}

            {workspaceTab === 'reports' && (
              <div className="space-y-4">
                <div className="rounded-[22px] border border-white/8 bg-black/25 p-4 text-sm text-[#8ea3b8]">
                  Recent recon outputs are stored server-side. Load any previous report back into the console and result panes.
                </div>
                {(recentReports || []).length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-[#7d91a8]">
                    No reports saved yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentReports.map((report) => (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => loadReport(report)}
                        className="w-full rounded-[22px] border border-white/8 bg-white/[0.02] p-4 text-left transition-colors hover:border-[#00f7ff]/20 hover:bg-white/[0.04]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.16em] text-white">{report.domain}</div>
                          <Badge className={`border-0 ${report.status === 'completed' ? 'bg-[#00ff9d]/10 text-[#00ff9d]' : 'bg-[#ff6b81]/10 text-[#ff6b81]'}`}>
                            {report.status}
                          </Badge>
                          <Badge className="border-0 bg-white/5 text-[#8aa3bc]">{report.stage}</Badge>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-[#63788f]">Created</div>
                            <div className="mt-2 text-sm text-white">{new Date(report.created_at).toLocaleString()}</div>
                          </div>
                          <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-[#63788f]">Subdomains</div>
                            <div className="mt-2 text-sm text-white">{report.result?.subdomains?.length || 0}</div>
                          </div>
                          <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-[#63788f]">URLs</div>
                            <div className="mt-2 text-sm text-white">{report.result?.urls?.length || 0}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.section>

          <div className="space-y-6">
            <section className="rounded-[24px] border border-[#00f7ff]/10 bg-black/25 p-5">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#00f7ff]" />
                <h2 className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.24em] text-white">Workspace Signal</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#63788f]">Coverage Score</div>
                  <div className="mt-2 font-['Orbitron'] text-2xl font-black text-white">{capabilities?.coverage_percent ?? 0}%</div>
                  <div className="mt-2 text-sm text-[#8ea3b8]">Native tool coverage on the backend host.</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#63788f]">Saved Reports</div>
                  <div className="mt-2 font-['Orbitron'] text-2xl font-black text-white">{recentReports.length}</div>
                  <div className="mt-2 text-sm text-[#8ea3b8]">Recent reconnaissance outputs ready for reload.</div>
                </div>
              </div>
            </section>

            <ResultBlock title="Subdomains" icon={Globe} items={result.subdomains || []}>
              <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {(result.subdomains || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-[#7d91a8]">
                    No subdomains captured yet.
                  </div>
                ) : (
                  result.subdomains.map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 font-mono text-sm text-[#d7f7ff]">
                      {item}
                    </div>
                  ))
                )}
              </div>
            </ResultBlock>

            <ResultBlock title="Live Hosts" icon={Wifi} items={result.live_hosts || []}>
              <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {(result.live_hosts || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-[#7d91a8]">
                    No live hosts captured yet.
                  </div>
                ) : (
                  result.live_hosts.map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 font-mono text-sm text-[#c6ffe0]">
                      {item}
                    </div>
                  ))
                )}
              </div>
            </ResultBlock>

            <ResultBlock title="Open Ports" icon={Server} items={result.ports || []}>
              <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {(result.ports || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-[#7d91a8]">
                    No open ports captured yet.
                  </div>
                ) : (
                  result.ports.map((item, index) => (
                    <div key={`${item.port}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-mono text-sm text-white">{item.port}/{item.protocol}</div>
                        <Badge className="border-0 bg-[#00f7ff]/10 text-[#00f7ff]">{item.state}</Badge>
                      </div>
                      <div className="mt-2 text-xs text-[#7d91a8]">{item.service}</div>
                    </div>
                  ))
                )}
              </div>
            </ResultBlock>

            <ResultBlock title="URLs" icon={Radar} items={result.urls || []}>
              <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                {(result.urls || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-[#7d91a8]">
                    No URLs captured yet.
                  </div>
                ) : (
                  result.urls.map((item, index) => (
                    <div key={`${item}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 font-mono text-sm text-[#d7f7ff]">
                      {item}
                    </div>
                  ))
                )}
              </div>
            </ResultBlock>
          </div>
        </div>
      </div>
    </div>
  );
}
