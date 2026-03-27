import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Radar, Globe, FileText, KeyRound, Loader2, CheckCircle, XCircle, AlertTriangle, ShieldAlert, Activity, ScanSearch, FileWarning, Fingerprint, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const TOOLS = [
  { id: 'subdomain', label: 'Subdomains', icon: Search, placeholder: 'example.com', endpoint: '/tools/subdomain-finder' },
  { id: 'portscan', label: 'Port Scan', icon: Radar, placeholder: '192.168.1.1 or example.com', endpoint: '/tools/port-scanner' },
  { id: 'vulnscan', label: 'Vulnerability Scanner', icon: ShieldAlert, placeholder: 'example.com or 192.168.1.10', endpoint: '/tools/vulnerability-scanner' },
  { id: 'threat', label: 'Threat Intel', icon: Activity, placeholder: '', endpoint: '/tools/threat-intelligence', noInput: true },
  { id: 'darkweb', label: 'Dark Web Scanner', icon: ScanSearch, placeholder: 'name@example.com', endpoint: '/tools/dark-web-scanner' },
  { id: 'malware', label: 'File Malware Scanner', icon: FileWarning, placeholder: '', endpoint: '/tools/file-malware-scanner', inputType: 'file' },
  { id: 'hash', label: 'Hash Generator', icon: Fingerprint, placeholder: 'Enter text to hash', endpoint: '/tools/hash-generator', publicTool: true },
  { id: 'browser', label: 'Mini Browser', icon: Monitor, placeholder: 'https://example.com', publicTool: true, frontendOnly: true },
  { id: 'whois', label: 'WHOIS', icon: Globe, placeholder: 'example.com', endpoint: '/tools/whois' },
  { id: 'headers', label: 'HTTP Headers', icon: FileText, placeholder: 'https://example.com', endpoint: '/tools/http-headers' },
  { id: 'password', label: 'Password Check', icon: KeyRound, placeholder: 'Enter a password to test', endpoint: '/tools/password-strength', publicTool: true },
];

function ToolPanel({ tool }) {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!tool.noInput && tool.inputType !== 'file' && !input.trim()) return;
    if (tool.inputType === 'file' && !file) return;
    if (!user && !tool.publicTool) {
      toast.error('Login required to use this tool');
      navigate('/auth');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      if (tool.frontendOnly) {
        const url = /^(https?:)?\/\//i.test(input) ? input : `https://${input}`;
        setResult({ url });
        return;
      }
      let res;
      if (tool.inputType === 'file') {
        const formData = new FormData();
        formData.append('file', file);
        res = await api.post(tool.endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const body = tool.id === 'password' ? { password: input } : { target: input };
        res = await api.post(tool.endpoint, body);
      }
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
        {tool.noInput ? (
          <div className="flex-1 rounded-sm border border-[#00D4FF]/10 bg-black/30 px-4 py-3 text-sm text-[#8B949E]">
            No input required. Fetches live-style threat and malware telemetry.
          </div>
        ) : tool.inputType === 'file' ? (
          <Input
            data-testid={`tool-input-${tool.id}`}
            type="file"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="bg-black/50 border-[#00D4FF]/10 text-white file:text-white focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-sm flex-1 font-mono"
          />
        ) : (
          <Input
            data-testid={`tool-input-${tool.id}`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder={tool.placeholder}
            className="bg-black/50 border-[#00D4FF]/10 text-white focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-sm flex-1 font-mono"
          />
        )}
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
          {tool.id === 'vulnscan' && <VulnerabilityResult data={result} />}
          {tool.id === 'threat' && <ThreatIntelResult data={result} />}
          {tool.id === 'darkweb' && <DarkWebResult data={result} />}
          {tool.id === 'malware' && <MalwareResult data={result} />}
          {tool.id === 'hash' && <HashResult data={result} />}
          {tool.id === 'browser' && <MiniBrowserResult data={result} />}
          {tool.id === 'whois' && <WhoisResult data={result} />}
          {tool.id === 'headers' && <HeadersResult data={result} />}
          {tool.id === 'password' && <PasswordResult data={result} />}
        </div>
      )}
    </div>
  );
}

function SubdomainResult({ data }) {
  return <>
    <div className="text-[#00D4FF] mb-3">$ subdomain-finder {data.domain} -- Found {data.count} subdomains</div>
    <div className="space-y-1">
      {data.subdomains?.map((s, i) => (
        <div key={i} className="flex items-center justify-between py-1 border-b border-white/5">
          <span className="text-white">{s.subdomain}</span>
          <span className="text-[#8B949E]">{s.ip}</span>
          <Badge variant={s.status === 'Active' ? 'default' : 'secondary'} className={s.status === 'Active' ? 'bg-[#00D4FF]/20 text-[#00D4FF] border-0' : 'bg-[#00D4FF]/5 text-[#8B949E] border-0'}>{s.status}</Badge>
        </div>
      ))}
    </div>
  </>;
}

function PortScanResult({ data }) {
  const stateColors = { open: 'text-[#00D4FF]', closed: 'text-red-400', filtered: 'text-yellow-400' };
  const stateIcons = { open: CheckCircle, closed: XCircle, filtered: AlertTriangle };
  return <>
    <div className="text-[#00D4FF] mb-3">$ port-scan {data.target} -- {data.scan_time}</div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {data.ports?.map((p, i) => {
        const Icon = stateIcons[p.state] || AlertTriangle;
        return <div key={i} className="flex items-center gap-3 py-1.5 px-2 bg-[#00D4FF]/[0.03] rounded-sm">
          <Icon className={`w-3.5 h-3.5 ${stateColors[p.state]}`} />
          <span className="text-white w-12">{p.port}</span>
          <span className="text-[#8B949E] flex-1">{p.service}</span>
          <span className={`text-xs ${stateColors[p.state]}`}>{p.state}</span>
        </div>;
      })}
    </div>
  </>;
}

function WhoisResult({ data }) {
  const fields = [['Domain', data.domain], ['Registrar', data.registrar], ['Created', data.creation_date], ['Expires', data.expiration_date], ['Updated', data.updated_date], ['Country', data.registrant_country], ['DNSSEC', data.dnssec], ['Name Servers', data.name_servers?.join(', ')], ['Status', data.status?.join(', ')]];
  return <>
    <div className="text-[#00D4FF] mb-3">$ whois {data.domain}</div>
    {fields.map(([k, v], i) => <div key={i} className="flex py-1 border-b border-white/5"><span className="text-[#8B949E] w-32">{k}:</span><span className="text-white flex-1">{v}</span></div>)}
  </>;
}

function VulnerabilityResult({ data }) {
  const severityStyles = { low: 'bg-[#00FF9F]/10 text-[#00FF9F]', medium: 'bg-yellow-500/10 text-yellow-300', high: 'bg-[#FF3B3B]/10 text-[#FF3B3B]' };
  const openServices = (data.services || []).filter(service => service.state === 'open');
  return <>
    <div className="text-[#00D4FF] mb-3">$ vulnerability-scan {data.target} -- {data.scan_time}</div>
    <div className="grid gap-4 md:grid-cols-[180px_1fr]">
      <div className="rounded-sm border border-[#00D4FF]/10 bg-[#00D4FF]/[0.03] p-4">
        <div className="text-xs uppercase tracking-[0.24em] text-[#8B949E]">Risk Score</div>
        <div className="mt-2 text-4xl font-black font-['Orbitron'] text-white">{data.risk_score}</div>
        <div className="mt-2 text-xs text-[#8B949E]">{openServices.length} open services detected</div>
        <div className="mt-1 text-xs text-[#8B949E]">{data.resolved_host}</div>
      </div>
      <div className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-4">
        <div className="mb-3 text-white font-bold">Detected Weak Points</div>
        <div className="space-y-3">
          {data.findings?.map((finding, index) => <div key={index} className="rounded-sm border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-white">{finding.title}</div>
              <Badge className={`border-0 ${severityStyles[finding.severity] || severityStyles.low}`}>{finding.severity}</Badge>
            </div>
            <p className="mt-2 text-xs leading-6 text-[#8B949E]">{finding.detail}</p>
          </div>)}
        </div>
      </div>
    </div>
    <div className="border-t border-[#00D4FF]/10 pt-4">
      <div className="mb-2 text-white font-bold">Open Services</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {data.services?.map((service, index) => <div key={index} className="flex items-center justify-between rounded-sm bg-[#00D4FF]/[0.03] px-3 py-2">
          <div><div className="text-white">{service.service}</div><div className="text-xs text-[#8B949E]">Port {service.port}</div></div>
          <Badge className={service.state === 'open' ? 'bg-[#00D4FF]/20 text-[#00D4FF] border-0' : 'bg-white/5 text-[#8B949E] border-0'}>{service.state}</Badge>
        </div>)}
      </div>
    </div>
    {data.tls && <div className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-4">
      <div className="mb-2 text-white font-bold">TLS Metadata</div>
      <div className="space-y-1 text-xs text-[#8B949E]">
        <div>Issuer: {data.tls.issuer || 'Unknown'}</div>
        <div>Subject: {data.tls.subject || 'Unknown'}</div>
        <div>Expires: {data.tls.expires_at || 'Unknown'}</div>
        <div>Days Remaining: {data.tls.days_remaining ?? 'Unknown'}</div>
      </div>
    </div>}
  </>;
}

function ThreatIntelResult({ data }) {
  const severityStyles = { medium: 'bg-yellow-500/10 text-yellow-300', high: 'bg-[#FF3B3B]/10 text-[#FF3B3B]', critical: 'bg-red-600/20 text-red-300' };
  return <>
    <div className="text-[#00D4FF] mb-3">$ threat-intel -- live telemetry snapshot</div>
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-sm border border-[#00D4FF]/10 bg-[#00D4FF]/[0.03] p-4 lg:col-span-2">
        <div className="mb-3 text-white font-bold">Attack Sources</div>
        <div className="space-y-2">
          {data.attack_map?.map((item, index) => <div key={index}><div className="mb-1 flex justify-between text-xs text-[#8B949E]"><span>{item.country}</span><span>{item.count} events</span></div><div className="h-2 rounded-full bg-white/5"><div className="h-2 rounded-full bg-[#00D4FF]" style={{ width: `${Math.min(item.count, 100)}%` }} /></div></div>)}
        </div>
      </div>
      <div className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-4">
        <div className="mb-3 text-white font-bold">Malware Trends</div>
        <div className="space-y-2">{data.malware_trends?.map((item, index) => <div key={index} className="flex items-center justify-between text-xs"><span className="text-white">{item.family}</span><span className="text-[#8B949E]">{item.detections}</span></div>)}</div>
      </div>
    </div>
    <div className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-4"><div className="mb-3 text-white font-bold">Live Sources</div><div className="grid gap-3 md:grid-cols-2">{data.sources?.map((source, index) => <div key={index} className="rounded-sm border border-white/5 bg-white/[0.02] p-3"><div className="text-sm text-white">{source.name}</div><div className="mt-1 text-xs text-[#8B949E]">{source.updated}</div></div>)}</div></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-4"><div className="mb-3 text-white font-bold">Real-Time Alerts</div><div className="space-y-3">{data.alerts?.map((alert) => <div key={alert.id} className="rounded-sm border border-white/5 bg-white/[0.02] p-3"><div className="flex items-center justify-between gap-2"><div className="text-sm text-white">{alert.title}</div><Badge className={`border-0 ${severityStyles[alert.severity]}`}>{alert.severity}</Badge></div><div className="mt-2 text-xs text-[#8B949E]">{alert.source} · {alert.time}</div></div>)}</div></div>
      <div className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-4"><div className="mb-3 text-white font-bold">Attack Timeline</div><div className="space-y-2">{data.timeline?.map((point, index) => <div key={index}><div className="mb-1 flex justify-between text-xs text-[#8B949E]"><span>{point.label}</span><span>{point.attacks} hits</span></div><div className="h-2 rounded-full bg-white/5"><div className="h-2 rounded-full bg-[#00FF9F]" style={{ width: `${Math.min(point.attacks, 100)}%` }} /></div></div>)}</div></div>
    </div>
    {data.vendor_trends?.length > 0 && <div className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-4"><div className="mb-3 text-white font-bold">Most Targeted Vendors In KEV Feed</div><div className="space-y-2">{data.vendor_trends.map((row, index) => <div key={index} className="flex items-center justify-between text-xs"><span className="text-white">{row.vendor}</span><span className="text-[#8B949E]">{row.count}</span></div>)}</div></div>}
  </>;
}

function DarkWebResult({ data }) {
  return <>
    <div className="text-[#00D4FF] mb-3">$ dark-web-scan {data.target}</div>
    {!data.configured && <div className="rounded-sm border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">Real breach lookup is not configured. Add `HIBP_API_KEY` on the backend to query Have I Been Pwned.</div>}
    <div className="grid gap-4 md:grid-cols-[180px_1fr]">
      <div className="rounded-sm border border-[#00D4FF]/10 bg-[#00D4FF]/[0.03] p-4">
        <div className="text-xs uppercase tracking-[0.24em] text-[#8B949E]">Exposure Risk</div>
        <div className="mt-2 text-4xl font-black font-['Orbitron'] text-white">{data.risk_score ?? '--'}</div>
        <div className="mt-2 text-xs text-[#8B949E]">{data.found === null ? 'Configuration required' : data.found ? 'Potential dark web exposure found' : 'No leaked entries detected'}</div>
        <div className="mt-1 text-xs text-[#8B949E]">{data.source}</div>
      </div>
      <div className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-4">
        <div className="mb-3 text-white font-bold">Leak Sources</div>
        {data.entries?.length ? <div className="space-y-3">{data.entries.map((entry, index) => <div key={index} className="rounded-sm border border-white/5 bg-white/[0.02] p-3"><div className="flex items-center justify-between"><div className="text-sm text-white">{entry.source}</div><Badge className={entry.risk === 'high' ? 'bg-[#FF3B3B]/10 text-[#FF3B3B] border-0' : 'bg-yellow-500/10 text-yellow-300 border-0'}>{entry.risk}</Badge></div><div className="mt-2 text-xs text-[#8B949E]">{entry.exposed} · {entry.year}</div>{entry.domain && <div className="mt-1 text-xs text-[#8B949E]/80">{entry.domain}</div>}</div>)}</div> : <div className="text-sm text-[#8B949E]">No entries surfaced in this simulated scan.</div>}
      </div>
    </div>
    <div className="border-t border-[#00D4FF]/10 pt-4"><div className="mb-2 text-white font-bold">Recommendations</div><div className="space-y-2">{data.recommendations?.map((item, index) => <div key={index} className="text-xs text-[#8B949E]">- {item}</div>)}</div></div>
  </>;
}

function MalwareResult({ data }) {
  return <>
    <div className="text-[#00D4FF] mb-3">$ malware-scan {data.filename}</div>
    {!data.configured && <div className="rounded-sm border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">Real malware verdict is not configured. Add `VIRUSTOTAL_API_KEY` on the backend to query VirusTotal.</div>}
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-sm border border-[#00D4FF]/10 bg-[#00D4FF]/[0.03] p-4"><div className="text-xs uppercase tracking-[0.24em] text-[#8B949E]">Status</div><div className={`mt-2 text-3xl font-black font-['Orbitron'] ${data.status === 'Suspicious' ? 'text-[#FF3B3B]' : 'text-[#00FF9F]'}`}>{data.status}</div></div>
      <div className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-4"><div className="text-xs uppercase tracking-[0.24em] text-[#8B949E]">Detections</div><div className="mt-2 text-3xl font-black font-['Orbitron'] text-white">{data.detections}/{data.engine_count}</div></div>
      <div className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-4"><div className="text-xs uppercase tracking-[0.24em] text-[#8B949E]">Size</div><div className="mt-2 text-3xl font-black font-['Orbitron'] text-white">{Math.max(1, Math.round(data.size / 1024))} KB</div></div>
    </div>
    <div className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-4"><div className="mb-2 text-white font-bold">SHA256</div><div className="break-all text-xs text-[#8B949E]">{data.sha256}</div></div>
    <div className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-4"><div className="mb-2 text-white font-bold">Indicators</div><div className="space-y-2">{data.signature_hits?.map((hit, index) => <div key={index} className="text-xs text-[#8B949E]">- {typeof hit === 'string' ? hit : `${hit.engine}: ${hit.result}`}</div>)}</div></div>
  </>;
}

function HashResult({ data }) {
  const rows = [['MD5', data.md5], ['SHA1', data.sha1], ['SHA256', data.sha256], ['SHA512', data.sha512]];
  return <>
    <div className="text-[#00D4FF] mb-3">$ hash-generator -- Input length: {data.input_length}</div>
    <div className="space-y-2">{rows.map(([label, value]) => <div key={label} className="rounded-sm border border-[#00D4FF]/10 bg-black/20 p-3"><div className="text-xs text-[#8B949E]">{label}</div><div className="mt-1 break-all text-xs text-white">{value}</div></div>)}</div>
  </>;
}

function MiniBrowserResult({ data }) {
  return <>
    <div className="text-[#00D4FF] mb-3">$ embedded-browser {data.url}</div>
    <div className="overflow-hidden rounded-sm border border-[#00D4FF]/10 bg-black/20 shadow-[0_0_40px_rgba(0,194,255,0.08)]">
      <div className="flex items-center gap-2 border-b border-[#00D4FF]/10 bg-black/50 px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#00FF9F]" />
        <div className="ml-2 flex-1 truncate rounded-sm border border-[#00D4FF]/10 bg-black/30 px-3 py-1.5 text-xs text-[#8B949E]">{data.url}</div>
      </div>
      <iframe title="mini-browser" src={data.url} className="h-[78vh] min-h-[720px] w-full bg-white" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" referrerPolicy="no-referrer" />
    </div>
    <div className="text-xs text-[#8B949E]">Some websites block iframe embedding via `X-Frame-Options` or CSP. Agar blank dikhe, iska matlab site embedded browser allow nahi kar rahi.</div>
  </>;
}

function HeadersResult({ data }) {
  return <>
    <div className="text-[#00D4FF] mb-3">$ http-headers {data.url} -- Status: {data.status_code || 'Error'}</div>
    {data.error && <div className="text-red-400">Error: {data.error}</div>}
    {data.security_analysis?.length > 0 && <div className="mb-4"><div className="text-white mb-2 font-bold">Security Headers Analysis:</div>{data.security_analysis.map((h, i) => <div key={i} className="flex items-center gap-2 py-1">{h.present ? <CheckCircle className="w-3.5 h-3.5 text-[#00D4FF]" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}<span className={h.present ? 'text-[#00D4FF]' : 'text-red-400'}>{h.header}</span><span className="text-[#8B949E] text-xs ml-auto truncate max-w-[200px]">{h.value}</span></div>)}</div>}
    {Object.keys(data.headers || {}).length > 0 && <div><div className="text-white mb-2 font-bold">All Headers:</div>{Object.entries(data.headers).map(([k, v], i) => <div key={i} className="flex py-0.5 text-xs"><span className="text-[#00D4FF] w-48 shrink-0">{k}:</span><span className="text-[#8B949E] break-all">{v}</span></div>)}</div>}
  </>;
}

function PasswordResult({ data }) {
  const colors = { 'Very Weak': 'bg-red-500', 'Weak': 'bg-orange-500', 'Fair': 'bg-yellow-500', 'Good': 'bg-lime-500', 'Strong': 'bg-[#00D4FF]', 'Very Strong': 'bg-[#00D4FF]' };
  const pct = (data.score / data.max_score) * 100;
  return <>
    <div className="text-[#00D4FF] mb-3">$ password-check -- Length: {data.length}</div>
    <div className="space-y-3">
      <div><div className="flex justify-between mb-1"><span className="text-white">{data.strength}</span><span className="text-[#8B949E]">{data.score}/{data.max_score}</span></div><Progress value={pct} className="h-2 bg-white/10 [&>div]:transition-all [&>div]:duration-500" style={{ '--tw-bg-opacity': 1 }} /><div className={`h-2 rounded-full ${colors[data.strength] || 'bg-white/20'} transition-all duration-500`} style={{ width: `${pct}%`, marginTop: '-8px', position: 'relative', zIndex: 1 }} /></div>
      <div className="flex justify-between text-xs"><span className="text-[#8B949E]">Entropy: {data.entropy_bits} bits</span><span className="text-[#8B949E]">Crack time: {data.crack_time}</span></div>
      {data.feedback?.length > 0 && <div className="border-t border-[#00D4FF]/10 pt-3"><div className="text-white text-xs font-bold mb-1">Recommendations:</div>{data.feedback.map((f, i) => <div key={i} className="text-yellow-400 text-xs flex items-center gap-1.5 py-0.5"><AlertTriangle className="w-3 h-3" /> {f}</div>)}</div>}
    </div>
  </>;
}

export default function Tools() {
  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="overflow-hidden py-3 border-b border-white/5">
        <div className="marquee-track">
          {[...Array(2)].map((_, i) => <span key={i} className="text-4xl font-black text-white/[0.03] tracking-widest font-['Orbitron'] whitespace-nowrap mx-8">SUBDOMAIN FINDER &bull; PORT SCANNER &bull; VULNERABILITY SCANNER &bull; THREAT INTEL &bull; DARK WEB SCANNER &bull; FILE MALWARE SCANNER &bull; HASH GENERATOR &bull; MINI BROWSER &bull; WHOIS LOOKUP &bull; HTTP HEADERS &bull; PASSWORD CHECK &bull;&nbsp;</span>)}
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-10" data-testid="tools-page">
        <div className="mb-10 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-['Orbitron'] mb-3">Security <span className="neon-text">Tools</span></h1>
          <p className="text-[#8B949E] text-base">Educational cybersecurity utilities for ethical hackers and researchers.</p>
          <p className="text-[#8B949E] text-sm mt-2">Includes Vulnerability Scanner, Threat Intelligence Dashboard, Dark Web Scanner, File Malware Scanner, Hash Generator, and a Mini Browser.</p>
        </div>
        <Tabs defaultValue="subdomain" className="animate-fade-in-up stagger-2">
          <TabsList className="bg-[#0D1117]/60 border border-[#00D4FF]/10 rounded-sm p-1 w-full flex flex-wrap gap-1 h-auto">
            {TOOLS.map(t => <TabsTrigger key={t.id} value={t.id} data-testid={`tool-tab-${t.id}`} className="flex-1 min-w-[120px] rounded-sm text-xs data-[state=active]:bg-[#00D4FF]/10 data-[state=active]:text-[#00D4FF] data-[state=active]:shadow-none text-[#8B949E] gap-1.5 py-2"><t.icon className="w-3.5 h-3.5" />{t.label}</TabsTrigger>)}
          </TabsList>
          {TOOLS.map(t => <TabsContent key={t.id} value={t.id} className="mt-6"><ToolPanel tool={t} /></TabsContent>)}
        </Tabs>
      </div>
    </div>
  );
}
