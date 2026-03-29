import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Boxes, Copy, ExternalLink, Loader2, LockKeyhole, Monitor, PlugZap, Server, TerminalSquare, Unplug, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { BACKEND_URL, getWebSocketBase, IS_VERCEL } from '@/lib/config';

const NODE_SLOTS = [
  {
    id: 'docker-01',
    title: 'Kali Node',
    status: 'SSH Ready',
    role: 'Primary container host',
    host: '20.244.12.203',
    port: '2222',
    user: 'root',
    rootUser: 'root',
    password: 'K@liR00t#8vLp!',
    rootPassword: 'K@liR00t#8vLp!',
    ssh: 'ssh root@20.244.12.203 -p 2222',
    gui: 'http://20.244.12.203:6906/vnc.html',
    guiPassword: 'KaliVNC@123',
    rdp: '20.244.12.203:3394',
  },
];

function DockerTerminal({ token, selectedNode }) {
  const termRef = useRef(null);
  const termInstance = useRef(null);
  const wsRef = useRef(null);
  const fitAddonRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const windowResizeCleanupRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const disconnect = useCallback(() => {
    if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
    if (windowResizeCleanupRef.current) windowResizeCleanupRef.current();
    if (wsRef.current) wsRef.current.close();
    if (termInstance.current) termInstance.current.dispose();
    wsRef.current = null;
    termInstance.current = null;
    fitAddonRef.current = null;
    resizeObserverRef.current = null;
    windowResizeCleanupRef.current = null;
    setConnected(false);
    setConnecting(false);
  }, []);

  const connect = useCallback(async () => {
    if (!selectedNode || !token || connecting || connected) return;
    setConnecting(true);

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
        lineHeight: 1.2,
        allowTransparency: true,
        convertEol: true,
        scrollback: 4000,
        theme: {
          background: '#05070b',
          foreground: '#00f7ff',
          cursor: '#00f7ff',
          selectionBackground: 'rgba(0, 247, 255, 0.25)',
          selectionInactiveBackground: 'rgba(0, 247, 255, 0.12)',
        },
        rows: 28,
        cols: 110,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      if (termRef.current) termRef.current.innerHTML = '';
      term.open(termRef.current);
      fitAddon.fit();
      termInstance.current = term;
      fitAddonRef.current = fitAddon;
      term.writeln(`\x1b[32m[DockerSSH] Connecting to ${selectedNode.title}...\x1b[0m`);
      term.focus();

      const resolvedBackendUrl = BACKEND_URL || window.location.origin;
      const healthCheck = await fetch(`${resolvedBackendUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (!healthCheck || !healthCheck.ok) {
        term.writeln('\r\n\x1b[31m[Error] Backend auth check failed\x1b[0m');
        setConnecting(false);
        return;
      }

      const ws = new WebSocket(`${getWebSocketBase()}/api/ws/docker-ssh/${selectedNode.id}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      };

      ws.onmessage = (event) => {
        term.write(event.data);
      };

      ws.onerror = () => {
        term.writeln('\r\n\x1b[31m[Error] Docker SSH socket connection failed\x1b[0m');
        setConnecting(false);
      };

      ws.onclose = () => {
        term.writeln('\r\n\x1b[33m[Disconnected] Shell session ended\x1b[0m');
        setConnected(false);
        setConnecting(false);
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });

      const syncSize = () => {
        fitAddon.fit();
        term.focus();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      };

      const handleResize = () => syncSize();
      window.addEventListener('resize', handleResize);
      windowResizeCleanupRef.current = () => window.removeEventListener('resize', handleResize);
      if (typeof ResizeObserver !== 'undefined' && termRef.current) {
        const observer = new ResizeObserver(() => syncSize());
        observer.observe(termRef.current);
        resizeObserverRef.current = observer;
      }

      term.element?.addEventListener('click', () => term.focus());
    } catch (err) {
      console.error(err);
      termInstance.current?.writeln('\r\n\x1b[31m[Error] Failed to initialize terminal\x1b[0m');
      setConnecting(false);
    }
  }, [connected, connecting, selectedNode, token]);

  useEffect(() => {
    disconnect();
  }, [selectedNode?.id, disconnect]);

  useEffect(() => () => disconnect(), [disconnect]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-[#00f7ff]" />
          <span className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.24em] text-white">Live Shell</span>
          <Badge className={connected ? 'border-0 bg-[#00ff9d]/10 text-[#00ff9d]' : 'border-0 bg-white/5 text-[#9ab1c6]'}>
            {connected ? 'Connected' : connecting ? 'Connecting' : 'Idle'}
          </Badge>
        </div>
        <div className="flex gap-2">
          {!connected ? (
            <Button
              onClick={connect}
              disabled={!selectedNode || connecting}
              className="rounded-xl border border-[#00f7ff]/30 bg-[#00f7ff]/10 text-[#00f7ff] hover:bg-[#00f7ff]/15"
            >
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
              Connect
            </Button>
          ) : (
            <Button
              onClick={disconnect}
              variant="ghost"
              className="rounded-xl border border-white/10 text-white hover:bg-white/5"
            >
              <Unplug className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          )}
        </div>
      </div>

      <div
        ref={termRef}
        className="docker-ssh-terminal h-[56vh] min-h-[420px] w-full min-w-0 overflow-hidden rounded-[24px] border border-[#00f7ff]/10 bg-[#02060b] p-0 shadow-[inset_0_0_60px_rgba(0,247,255,0.05)] sm:h-[60vh] sm:min-h-[500px] lg:h-[68vh] lg:min-h-[620px] 2xl:h-[74vh] 2xl:min-h-[760px]"
      >
        {!selectedNode && (
          <div className="p-4 font-mono text-sm text-[#587087]">
            Select a node to prepare the shell session.
          </div>
        )}
      </div>
    </div>
  );
}

export default function DockerSSH() {
  const { token } = useAuth();
  const [selectedNodeId, setSelectedNodeId] = useState(NODE_SLOTS[0].id);
  const [guiNodeId, setGuiNodeId] = useState(null);
  const selectedNode = useMemo(() => NODE_SLOTS.find((node) => node.id === selectedNodeId) || NODE_SLOTS[0], [selectedNodeId]);
  const guiNode = useMemo(() => NODE_SLOTS.find((node) => node.id === guiNodeId) || null, [guiNodeId]);
  const isSecurePage = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const canEmbedGui = Boolean(guiNode) && !isSecurePage;
  const buildGuiUrl = useCallback((node) => {
    const url = new URL(node.gui);
    url.searchParams.set('autoconnect', 'true');
    url.searchParams.set('resize', 'remote');
    url.searchParams.set('reconnect', 'true');
    if (node.guiPassword) {
      url.searchParams.set('password', node.guiPassword);
    }
    return url.toString();
  }, []);

  const selectNode = async (node) => {
    setSelectedNodeId(node.id);
    try {
      await navigator.clipboard.writeText(node.rootPassword);
      toast.success(`${node.title} root password copied`);
    } catch {
      toast.error('Password copy failed');
    }
  };

  const launchGui = async () => {
    try {
      const guiSecret = selectedNode.guiPassword || selectedNode.rootPassword;
      await navigator.clipboard.writeText(guiSecret);
      toast.success(`${selectedNode.title} GUI secret copied`);
    } catch {
      toast.error('GUI secret copy failed');
    }
    setGuiNodeId(selectedNode.id);
    if (isSecurePage) {
      window.open(buildGuiUrl(selectedNode), '_blank', 'noopener,noreferrer');
      toast.message('Direct GUI launch opened', {
        description: 'HTTPS page se HTTP noVNC embed blocked hota hai, isliye direct tab launch use ho raha hai.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#03070d] text-white">
      <style>{`
        .docker-ssh-terminal .xterm,
        .docker-ssh-terminal .xterm-screen,
        .docker-ssh-terminal .xterm-viewport {
          height: 100% !important;
        }

        .docker-ssh-terminal .xterm-viewport {
          overflow-y: auto !important;
        }

        .docker-ssh-terminal .xterm-screen canvas {
          width: 100% !important;
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(0,247,255,0.12),transparent_22%),radial-gradient(circle_at_84%_18%,rgba(0,255,157,0.08),transparent_16%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,247,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,247,255,0.03)_1px,transparent_1px)] bg-[size:34px_34px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 rounded-[28px] border border-[#00f7ff]/10 bg-[linear-gradient(140deg,rgba(2,8,14,0.96),rgba(5,14,24,0.92))] p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="border-0 bg-[#00f7ff]/10 text-[#00f7ff]">Docker SSH Workspace</Badge>
              <h1 className="mt-4 font-['Orbitron'] text-3xl font-black uppercase tracking-[0.08em] text-white">
                Docker SSH Fleet
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#8ea3b8]">
                Pick a node, auto-copy its root password, then open the shell directly as root from the terminal panel.
              </p>
              {IS_VERCEL && (
                <div className="mt-4 rounded-2xl border border-[#ffd166]/20 bg-[#ffd166]/[0.08] px-4 py-3 text-sm leading-6 text-[#ffe6a3]">
                  Docker SSH and embedded terminal sessions are disabled on Vercel. Use a persistent backend host for live shell access.
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#00f7ff]/10 bg-black/25 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#7d91a8]">Node Slots</div>
                <div className="mt-2 font-['Orbitron'] text-2xl font-black text-[#00f7ff]">1</div>
              </div>
              <div className="rounded-2xl border border-[#00f7ff]/10 bg-black/25 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#7d91a8]">Selected</div>
                <div className="mt-2 font-['Orbitron'] text-xl font-black text-white">{selectedNode.title}</div>
              </div>
              <div className="rounded-2xl border border-[#00f7ff]/10 bg-black/25 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#7d91a8]">Clipboard</div>
                <div className="mt-2 font-['Orbitron'] text-2xl font-black text-[#00ff9d]">Auto</div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-5 2xl:grid-cols-[minmax(430px,0.98fr)_minmax(0,1.32fr)]">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="rounded-[24px] border border-[#00f7ff]/10 bg-[linear-gradient(180deg,rgba(2,7,14,0.97),rgba(1,4,8,0.96))] p-4 sm:rounded-[28px] sm:p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <Boxes className="h-4 w-4 text-[#00f7ff]" />
              <h2 className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.24em] text-white">Node Picker</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-1">
              {NODE_SLOTS.map((node) => {
                const active = node.id === selectedNodeId;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => selectNode(node)}
                    className={`rounded-[20px] border p-4 text-left transition-colors sm:rounded-[22px] ${
                      active
                        ? 'border-[#00f7ff]/30 bg-[#00f7ff]/10'
                        : 'border-white/8 bg-white/[0.02] hover:border-[#00f7ff]/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.18em] text-white">{node.title}</div>
                        <div className="mt-2 text-sm text-[#7d91a8]">{node.role}</div>
                      </div>
                      <Badge className="border-0 bg-white/5 text-[#9ab1c6]">{node.port}</Badge>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-[#00f7ff]">
                      <Copy className="h-3.5 w-3.5" />
                      Click to select, copy root password, and prepare shell
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-[20px] border border-white/8 bg-white/[0.02] p-4 sm:rounded-[22px]">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7d91a8]">
                <LockKeyhole className="h-3.5 w-3.5" />
                Tree Structure
              </div>
              <div className="space-y-1 overflow-x-auto font-mono text-xs text-white sm:text-sm">
                <div>├─ host: {selectedNode.host}</div>
                <div>├─ port: {selectedNode.port}</div>
                <div>├─ user</div>
                <div className="pl-4">├─ username: {selectedNode.user}</div>
                <div className="pl-4">└─ password: {selectedNode.password}</div>
                <div>├─ root</div>
                <div className="pl-4">├─ username: {selectedNode.rootUser}</div>
                <div className="pl-4">└─ password: {selectedNode.rootPassword}</div>
                <div>├─ ssh: {selectedNode.ssh}</div>
                <div>├─ gui: {selectedNode.gui}</div>
                <div>└─ rdp: {selectedNode.rdp}</div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-white/8 bg-white/[0.02] p-4 sm:rounded-[22px]">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7d91a8]">
                <Server className="h-3.5 w-3.5" />
                Connection
              </div>
              <div className="font-mono text-sm text-white">{selectedNode.host}:{selectedNode.port}</div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(selectedNode.password).then(() => toast.success('Root password copied')).catch(() => toast.error('Copy failed'))}
                  className="rounded-xl border border-white/10 text-white hover:bg-white/5"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Root Pass
                </Button>
                <Button
                  variant="ghost"
                  onClick={launchGui}
                  className="rounded-xl border border-[#00f7ff]/20 text-[#00f7ff] hover:bg-[#00f7ff]/10"
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  GUI Connect
                </Button>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="rounded-[24px] border border-[#00f7ff]/10 bg-[linear-gradient(180deg,rgba(2,7,14,0.97),rgba(1,4,8,0.96))] p-4 sm:rounded-[28px] sm:p-5"
          >
            {IS_VERCEL ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm leading-7 text-[#8ea3b8]">
                This page is deploy-safe on Vercel, but live websocket shell sessions are intentionally disabled in serverless mode.
              </div>
            ) : (
              <DockerTerminal token={token} selectedNode={selectedNode} />
            )}
          </motion.section>
        </div>
      </div>

      {guiNode && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-[#00f7ff]/20 bg-[#04090f] shadow-[0_30px_120px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <div className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.2em] text-[#00f7ff]">Embedded GUI</div>
                <div className="mt-1 truncate text-sm text-white">{guiNode.title} noVNC Session</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => window.open(buildGuiUrl(guiNode), '_blank', 'noopener,noreferrer')}
                  className="rounded-xl border border-white/10 text-white hover:bg-white/5"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Direct
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setGuiNodeId(null)}
                  className="rounded-xl border border-white/10 text-white hover:bg-white/5"
                >
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-white/[0.02] px-4 py-3 sm:px-6">
              <div className="text-sm text-[#9ab1c6]">
                GUI URL: <span className="font-mono text-white">{guiNode.gui}</span>
              </div>
              <div className="text-sm text-[#9ab1c6]">
                Secret copied: <span className="font-mono text-[#00ff9d]">{guiNode.guiPassword || guiNode.rootPassword}</span>
              </div>
            </div>

            <div className="min-h-0 flex-1 bg-[#02060b]">
              {canEmbedGui ? (
                <iframe
                  title={`${guiNode.title} GUI`}
                  src={buildGuiUrl(guiNode)}
                  className="h-full w-full border-0"
                  allow="clipboard-read; clipboard-write"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6">
                  <div className="max-w-2xl rounded-[24px] border border-[#00f7ff]/10 bg-[#061019] p-6 text-center">
                    <div className="font-['Orbitron'] text-lg font-bold uppercase tracking-[0.12em] text-white">GUI Launch Ready</div>
                    <p className="mt-3 text-sm leading-7 text-[#8ea3b8]">
                      Public HTTPS page ke andar external HTTP noVNC embed browser block karta hai. Direct tab launch already available hai with
                      auto-connect URL and copied password.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <Button
                        onClick={() => window.open(buildGuiUrl(guiNode), '_blank', 'noopener,noreferrer')}
                        className="rounded-xl border border-[#00f7ff]/30 bg-[#00f7ff]/10 text-[#00f7ff] hover:bg-[#00f7ff]/15"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open noVNC
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => navigator.clipboard.writeText(guiNode.guiPassword || guiNode.rootPassword).then(() => toast.success('GUI secret copied')).catch(() => toast.error('Copy failed'))}
                        className="rounded-xl border border-white/10 text-white hover:bg-white/5"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Secret
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
