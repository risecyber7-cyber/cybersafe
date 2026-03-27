import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Send, Lightbulb, ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/config';

const DIFFICULTY_COLORS = { Easy: 'bg-[#00D4FF]/20 text-[#00D4FF]', Medium: 'bg-yellow-500/20 text-yellow-400', Hard: 'bg-red-500/20 text-red-400' };

export default function Sandbox() {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [active, setActive] = useState(null);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/sandbox/challenges`).then(r => r.json()).then(setChallenges).catch(() => {});
  }, []);

  const submit = async () => {
    if (!user) { toast.error('Login required'); navigate('/auth'); return; }
    if (!input.trim()) return;
    setLoading(true);
    setOutput('');
    setSuccess(null);
    try {
      const res = await api.post('/sandbox/submit', { challenge_id: active.id, user_input: input });
      setOutput(res.data.output);
      setSuccess(res.data.success);
      if (res.data.success) toast.success('Challenge completed!');
    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (active) {
    return (
      <div className="min-h-screen relative" data-testid="sandbox-challenge">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 py-10 relative">
          <Button data-testid="sandbox-back-btn" variant="ghost" onClick={() => { setActive(null); setOutput(''); setInput(''); setSuccess(null); setShowHint(false); }} className="text-[#8B949E] hover:text-white mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Challenges
          </Button>

          <div className="glass p-6 rounded-sm mb-6 animate-fade-in-up">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Badge className={`${DIFFICULTY_COLORS[active.difficulty]} border-0 mb-2`}>{active.difficulty}</Badge>
                <h2 className="text-2xl font-black font-['Orbitron'] tracking-tight">{active.title}</h2>
              </div>
              <Badge className="bg-[#00D4FF]/5 text-[#8B949E] border-0">{active.category}</Badge>
            </div>
            <p className="text-[#8B949E] mb-4">{active.description}</p>
            <button data-testid="sandbox-hint-btn" onClick={() => setShowHint(!showHint)} className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
              <Lightbulb className="w-3.5 h-3.5" /> {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>
            {showHint && <p className="mt-2 text-sm text-yellow-400/80 font-mono bg-yellow-400/5 px-3 py-2 rounded-sm">{active.hint}</p>}
          </div>

          {/* Terminal */}
          <div className="terminal-bg rounded-sm overflow-hidden animate-fade-in-up stagger-2" data-testid="sandbox-terminal">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#00D4FF]/10 bg-black/50">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#00D4FF]" />
              <span className="text-xs text-[#8B949E] ml-2 font-mono">cyberguard://sandbox/{active.id}</span>
            </div>

            {/* Output */}
            <div className="p-4 min-h-[200px] font-mono text-sm">
              {output ? (
                <div className="animate-fade-in">
                  <div className={`whitespace-pre-wrap ${success ? 'text-[#00D4FF]' : 'text-[#8B949E]'}`}>{output}</div>
                  {success !== null && (
                    <div className={`mt-4 flex items-center gap-2 text-sm font-bold ${success ? 'text-[#00D4FF]' : 'text-red-400'}`}>
                      {success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {success ? 'Challenge Passed!' : 'Not quite. Try again.'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[#8B949E]/50">
                  <span className="text-[#00D4FF]">$</span> Waiting for payload...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-[#00D4FF]/10 bg-black/30">
              <span className="text-[#00D4FF] font-mono">$</span>
              <input
                data-testid="sandbox-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="Enter your payload..."
                className="flex-1 bg-transparent text-white font-mono text-sm outline-none placeholder:text-[#8B949E]/30"
              />
              <Button data-testid="sandbox-submit-btn" onClick={submit} disabled={loading} size="sm" className="bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm h-8 px-3">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" data-testid="sandbox-page">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="max-w-5xl mx-auto px-4 py-10 relative">
        <div className="mb-10 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-['Orbitron'] mb-3">
            Sandbox <span className="neon-text">Labs</span>
          </h1>
          <p className="text-[#8B949E]">Practice security techniques in a safe, simulated environment. No real systems are harmed.</p>
        </div>

        {/* Background Image */}
        <div className="glass rounded-sm overflow-hidden mb-10 animate-fade-in-up stagger-1">
          <div className="relative h-40">
            <img
              src="https://static.prod-images.emergentagent.com/jobs/39d82727-d730-4c89-afad-059d3688728e/images/91f80a3d4b01ea4f3dcb2c079dcc9be49a406ddc3a92e1789a1c9e30878881d1.png"
              alt="Server room"
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060611] to-transparent" />
            <div className="absolute bottom-0 left-0 p-6">
              <FlaskConical className="w-5 h-5 text-[#00D4FF] mb-2" />
              <p className="text-sm text-[#8B949E]">All challenges are educational simulations. Safe & legal.</p>
            </div>
          </div>
        </div>

        {/* Challenges Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((c, i) => (
            <button
              key={c.id}
              data-testid={`challenge-card-${c.id}`}
              onClick={() => setActive(c)}
              className={`glass card-interactive p-6 rounded-sm text-left animate-fade-in-up stagger-${(i % 6) + 1}`}
            >
              <div className="flex items-center justify-between mb-3">
                <Badge className={`${DIFFICULTY_COLORS[c.difficulty]} border-0 text-xs`}>{c.difficulty}</Badge>
                <Badge className="bg-[#00D4FF]/5 text-[#8B949E] border-0 text-xs">{c.category}</Badge>
              </div>
              <h3 className="text-lg font-bold font-['Orbitron'] mb-2">{c.title}</h3>
              <p className="text-sm text-[#8B949E] line-clamp-2">{c.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
