import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Radar, Globe, FileText, KeyRound, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const TOOLS = [
  { id: 'subdomain', label: 'Subdomains', icon: Search, placeholder: 'example.com', endpoint: '/tools/subdomain-finder' },
  { id: 'portscan', label: 'Port Scan', icon: Radar, placeholder: '192.168.1.1 or example.com', endpoint: '/tools/port-scanner' },
  { id: 'whois', label: 'WHOIS', icon: Globe, placeholder: 'example.com', endpoint: '/tools/whois' },
  { id: 'headers', label: 'HTTP Headers', icon: FileText, placeholder: 'https://example.com', endpoint: '/tools/http-headers' },
  { id: 'password', label: 'Password Check', icon: KeyRound, placeholder: 'Enter a password to test', endpoint: '/tools/password-strength' },
];

function ToolPanel({ tool }) {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!input.trim()) return;
    if (!user && tool.id !== 'password') {
      toast.error('Login required to use this tool');
      navigate('/auth');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const body = tool.id === 'password' ? { password: input } : { target: input };
      const res = await api.post(tool.endpoint, body);
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Tool execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Input
          data-testid={`tool-input-${tool.id}`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run()}
          placeholder={tool.placeholder}
          className="bg-black/50 border-[#00D4FF]/10 text-white focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-sm flex-1 font-mono"
        />
        <Button
          data-testid={`tool-run-${tool.id}`}
          onClick={run}
          disabled={loading}
          className="bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm px-6"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run'}
        </Button>
      </div>

      {loading && (
        <div className="terminal-bg p-6 rounded-sm animate-fade-in">
          <div className="flex items-center gap-2 text-[#00D4FF] font-mono text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Scanning...</span>
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="terminal-bg p-6 rounded-sm animate-fade-in-up font-mono text-sm space-y-4" data-testid={`tool-result-${tool.id}`}>
          {tool.id === 'subdomain' && <SubdomainResult data={result} />}
          {tool.id === 'portscan' && <PortScanResult data={result} />}
          {tool.id === 'whois' && <WhoisResult data={result} />}
          {tool.id === 'headers' && <HeadersResult data={result} />}
          {tool.id === 'password' && <PasswordResult data={result} />}
        </div>
      )}
    </div>
  );
}

function SubdomainResult({ data }) {
  return (
    <>
      <div className="text-[#00D4FF] mb-3">$ subdomain-finder {data.domain} -- Found {data.count} subdomains</div>
      <div className="space-y-1">
        {data.subdomains?.map((s, i) => (
          <div key={i} className="flex items-center justify-between py-1 border-b border-white/5">
            <span className="text-white">{s.subdomain}</span>
            <span className="text-[#8B949E]">{s.ip}</span>
            <Badge variant={s.status === 'Active' ? 'default' : 'secondary'} className={s.status === 'Active' ? 'bg-[#00D4FF]/20 text-[#00D4FF] border-0' : 'bg-[#00D4FF]/5 text-[#8B949E] border-0'}>
              {s.status}
            </Badge>
          </div>
        ))}
      </div>
    </>
  );
}

function PortScanResult({ data }) {
  const stateColors = { open: 'text-[#00D4FF]', closed: 'text-red-400', filtered: 'text-yellow-400' };
  const stateIcons = { open: CheckCircle, closed: XCircle, filtered: AlertTriangle };
  return (
    <>
      <div className="text-[#00D4FF] mb-3">$ port-scan {data.target} -- {data.scan_time}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {data.ports?.map((p, i) => {
          const Icon = stateIcons[p.state] || AlertTriangle;
          return (
            <div key={i} className="flex items-center gap-3 py-1.5 px-2 bg-[#00D4FF]/[0.03] rounded-sm">
              <Icon className={`w-3.5 h-3.5 ${stateColors[p.state]}`} />
              <span className="text-white w-12">{p.port}</span>
              <span className="text-[#8B949E] flex-1">{p.service}</span>
              <span className={`text-xs ${stateColors[p.state]}`}>{p.state}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function WhoisResult({ data }) {
  const fields = [
    ['Domain', data.domain], ['Registrar', data.registrar],
    ['Created', data.creation_date], ['Expires', data.expiration_date],
    ['Updated', data.updated_date], ['Country', data.registrant_country],
    ['DNSSEC', data.dnssec], ['Name Servers', data.name_servers?.join(', ')],
    ['Status', data.status?.join(', ')],
  ];
  return (
    <>
      <div className="text-[#00D4FF] mb-3">$ whois {data.domain}</div>
      {fields.map(([k, v], i) => (
        <div key={i} className="flex py-1 border-b border-white/5">
          <span className="text-[#8B949E] w-32">{k}:</span>
          <span className="text-white flex-1">{v}</span>
        </div>
      ))}
    </>
  );
}

function HeadersResult({ data }) {
  return (
    <>
      <div className="text-[#00D4FF] mb-3">$ http-headers {data.url} -- Status: {data.status_code || 'Error'}</div>
      {data.error && <div className="text-red-400">Error: {data.error}</div>}
      {data.security_analysis?.length > 0 && (
        <div className="mb-4">
          <div className="text-white mb-2 font-bold">Security Headers Analysis:</div>
          {data.security_analysis.map((h, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              {h.present ? <CheckCircle className="w-3.5 h-3.5 text-[#00D4FF]" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
              <span className={h.present ? 'text-[#00D4FF]' : 'text-red-400'}>{h.header}</span>
              <span className="text-[#8B949E] text-xs ml-auto truncate max-w-[200px]">{h.value}</span>
            </div>
          ))}
        </div>
      )}
      {Object.keys(data.headers || {}).length > 0 && (
        <div>
          <div className="text-white mb-2 font-bold">All Headers:</div>
          {Object.entries(data.headers).map(([k, v], i) => (
            <div key={i} className="flex py-0.5 text-xs">
              <span className="text-[#00D4FF] w-48 shrink-0">{k}:</span>
              <span className="text-[#8B949E] break-all">{v}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function PasswordResult({ data }) {
  const colors = { 'Very Weak': 'bg-red-500', 'Weak': 'bg-orange-500', 'Fair': 'bg-yellow-500', 'Good': 'bg-lime-500', 'Strong': 'bg-[#00D4FF]', 'Very Strong': 'bg-[#00D4FF]' };
  const pct = (data.score / data.max_score) * 100;
  return (
    <>
      <div className="text-[#00D4FF] mb-3">$ password-check -- Length: {data.length}</div>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-white">{data.strength}</span>
            <span className="text-[#8B949E]">{data.score}/{data.max_score}</span>
          </div>
          <Progress value={pct} className="h-2 bg-white/10 [&>div]:transition-all [&>div]:duration-500" style={{ '--tw-bg-opacity': 1 }} />
          <div className={`h-2 rounded-full ${colors[data.strength] || 'bg-white/20'} transition-all duration-500`} style={{ width: `${pct}%`, marginTop: '-8px', position: 'relative', zIndex: 1 }} />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[#8B949E]">Entropy: {data.entropy_bits} bits</span>
          <span className="text-[#8B949E]">Crack time: {data.crack_time}</span>
        </div>
        {data.feedback?.length > 0 && (
          <div className="border-t border-[#00D4FF]/10 pt-3">
            <div className="text-white text-xs font-bold mb-1">Recommendations:</div>
            {data.feedback.map((f, i) => (
              <div key={i} className="text-yellow-400 text-xs flex items-center gap-1.5 py-0.5">
                <AlertTriangle className="w-3 h-3" /> {f}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function Tools() {
  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      {/* Marquee */}
      <div className="overflow-hidden py-3 border-b border-white/5">
        <div className="marquee-track">
          {[...Array(2)].map((_, i) => (
            <span key={i} className="text-4xl font-black text-white/[0.03] tracking-widest font-['Orbitron'] whitespace-nowrap mx-8">
              SUBDOMAIN FINDER &bull; PORT SCANNER &bull; WHOIS LOOKUP &bull; HTTP HEADERS &bull; PASSWORD CHECK &bull;&nbsp;
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10" data-testid="tools-page">
        <div className="mb-10 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-['Orbitron'] mb-3">
            Security <span className="neon-text">Tools</span>
          </h1>
          <p className="text-[#8B949E] text-base">Educational cybersecurity utilities for ethical hackers and researchers.</p>
        </div>

        <Tabs defaultValue="subdomain" className="animate-fade-in-up stagger-2">
          <TabsList className="bg-[#0D1117]/60 border border-[#00D4FF]/10 rounded-sm p-1 w-full flex flex-wrap gap-1 h-auto">
            {TOOLS.map(t => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                data-testid={`tool-tab-${t.id}`}
                className="flex-1 min-w-[120px] rounded-sm text-xs data-[state=active]:bg-[#00D4FF]/10 data-[state=active]:text-[#00D4FF] data-[state=active]:shadow-none text-[#8B949E] gap-1.5 py-2"
              >
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TOOLS.map(t => (
            <TabsContent key={t.id} value={t.id} className="mt-6">
              <ToolPanel tool={t} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
