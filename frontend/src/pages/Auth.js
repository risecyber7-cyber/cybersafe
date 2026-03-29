import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  Shield,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Radar,
  Activity,
  Fingerprint,
  CheckCircle2,
  Bot,
  Sparkles,
  ScanLine,
  ChevronDown,
  Waves,
  Mic,
  Globe2,
  AlertOctagon,
  AudioLines,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { API_BASE } from '@/lib/config';

const API = API_BASE;

const AUTH_SIGNALS = [
  { icon: Radar, label: 'Threat telemetry synced', value: '24/7 visibility' },
  { icon: Activity, label: 'Incident workflow ready', value: 'Low-latency dashboard' },
  { icon: Fingerprint, label: 'Identity checks active', value: 'Role-based access' },
];

const TERMINAL_SCRIPT = [
  'Initializing biometric authentication...',
  'Validating secure access tunnel...',
  'Preparing encrypted operator session...',
];

const AI_MESSAGES = [
  'Need help logging in?',
  'Security tip: Use a strong password.',
  '2FA adds another layer of defense.',
];

const AUTH_ATTACK_POINTS = [
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'London', lat: 51.5072, lon: -0.1276 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
];

const AUTH_MAP_WIDTH = 760;
const AUTH_MAP_HEIGHT = 360;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function authProject(lat, lon) {
  return {
    x: ((lon + 180) / 360) * AUTH_MAP_WIDTH,
    y: ((90 - lat) / 180) * AUTH_MAP_HEIGHT,
  };
}

function authArc(from, to) {
  const start = authProject(from.lat, from.lon);
  const end = authProject(to.lat, to.lon);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2 - Math.max(30, Math.abs(start.x - end.x) * 0.14);
  return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(18);
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [twoFactor, setTwoFactor] = useState({ challengeId: '', code: '', email: '' });
  const [cursorGlow, setCursorGlow] = useState({ x: 0, y: 0 });
  const [cardTilt, setCardTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [terminalText, setTerminalText] = useState('');
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [activeAiMessage, setActiveAiMessage] = useState(0);
  const [ripple, setRipple] = useState(null);
  const [shakeNonce, setShakeNonce] = useState(0);
  const [authStatus, setAuthStatus] = useState('standby');
  const [warningPulse, setWarningPulse] = useState(null);
  const [glitchPulse, setGlitchPulse] = useState(false);
  const [googleProvider, setGoogleProvider] = useState({ enabled: false, clientId: '' });
  const [googleReady, setGoogleReady] = useState(false);
  const [attackBursts, setAttackBursts] = useState(() =>
    Array.from({ length: 5 }).map((_, index) => ({
      id: `auth-attack-${index}`,
      from: AUTH_ATTACK_POINTS[index % AUTH_ATTACK_POINTS.length],
      to: AUTH_ATTACK_POINTS[(index * 2 + 3) % AUTH_ATTACK_POINTS.length],
    }))
  );
  const googleButtonRef = useRef(null);
  const { login, signup, googleLogin, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();

  const [captchaDialog, setCaptchaDialog] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [humanVerified, setHumanVerified] = useState(false);

  useEffect(() => {
    const onMove = (event) => {
      setCursorGlow({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    let active = true;
    axios.get(`${API}/auth/providers`)
      .then((res) => {
        if (!active) return;
        const google = res.data?.google || {};
        setGoogleProvider({
          enabled: Boolean(google.enabled && google.client_id),
          clientId: google.client_id || '',
        });
      })
      .catch(() => {
        if (active) {
          setGoogleProvider({ enabled: false, clientId: '' });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!googleProvider.enabled || !googleProvider.clientId) {
      return undefined;
    }
    if (window.google?.accounts?.id) {
      setGoogleReady(true);
      return undefined;
    }

    const existingScript = document.querySelector('script[data-google-identity="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setGoogleReady(true));
      return undefined;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => setGoogleReady(true);
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [googleProvider]);

  useEffect(() => {
    if (!googleReady || !googleProvider.clientId || !googleButtonRef.current || !window.google?.accounts?.id) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleProvider.clientId,
      callback: async (response) => {
        if (!response?.credential) {
          toast.error('Google login did not return a credential');
          return;
        }
        setLoading(true);
        setAuthStatus('verifying');
        try {
          await googleLogin(response.credential);
          setLoadingProgress(100);
          setAuthStatus('granted');
          toast.success('Signed in with Google');
          window.setTimeout(() => navigate('/dashboard'), 380);
        } catch (err) {
          setAuthStatus('denied');
          setShakeNonce((prev) => prev + 1);
          toast.error(err.response?.data?.detail || 'Google login failed');
        } finally {
          setLoading(false);
        }
      },
    });

    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      type: 'standard',
      theme: 'filled_black',
      text: 'continue_with',
      shape: 'pill',
      size: 'large',
      width: 340,
      logo_alignment: 'left',
    });
  }, [googleLogin, googleProvider.clientId, googleReady, navigate]);

  useEffect(() => {
    const line = TERMINAL_SCRIPT[activeAiMessage % TERMINAL_SCRIPT.length];
    let index = 0;
    setTerminalText('');
    const interval = window.setInterval(() => {
      index += 1;
      setTerminalText(line.slice(0, index));
      if (index >= line.length) {
        window.clearInterval(interval);
      }
    }, 42);
    return () => window.clearInterval(interval);
  }, [activeAiMessage]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveAiMessage((prev) => (prev + 1) % AI_MESSAGES.length);
    }, 3400);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const warningLabels = ['Credential spray blocked', 'Botnet ping detected', 'Geo anomaly observed', 'Suspicious token replay'];
    const interval = window.setInterval(() => {
      setWarningPulse(warningLabels[Math.floor(Math.random() * warningLabels.length)]);
      setGlitchPulse(true);
      window.setTimeout(() => setGlitchPulse(false), 520);
      const from = AUTH_ATTACK_POINTS[Math.floor(Math.random() * AUTH_ATTACK_POINTS.length)];
      let to = AUTH_ATTACK_POINTS[Math.floor(Math.random() * AUTH_ATTACK_POINTS.length)];
      while (to.name === from.name) {
        to = AUTH_ATTACK_POINTS[Math.floor(Math.random() * AUTH_ATTACK_POINTS.length)];
      }
      setAttackBursts((prev) => [{ id: `${from.name}-${to.name}-${Date.now()}`, from, to }, ...prev.slice(0, 6)]);
    }, 2600);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(18);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setLoadingProgress((prev) => Math.min(prev + Math.random() * 16, 92));
    }, 180);

    return () => window.clearInterval(interval);
  }, [loading]);

  const loadCaptcha = async () => {
    try {
      const res = await axios.post(`${API}/captcha/generate`);
      setCaptcha(res.data);
      setCaptchaAnswer('');
    } catch {
      toast.error('Failed to load captcha');
    }
  };

  const verifyCaptcha = () => {
    if (!captchaAnswer.trim()) return;
    setCaptchaDialog(false);
    setHumanVerified(true);
    toast.success('Human verification passed!');
  };

  const handleHumanCheck = async (checked) => {
    if (checked && !humanVerified) {
      await loadCaptcha();
      setCaptchaDialog(true);
    }
  };

  const triggerRipple = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setRipple({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      id: Date.now(),
    });
  };

  const handleCardMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const rotateY = clamp(((offsetX / rect.width) - 0.5) * 12, -6, 6);
    const rotateX = clamp((((offsetY / rect.height) - 0.5) * -12), -6, 6);
    setCardTilt({ rotateX, rotateY });
  };

  const resetCardTilt = () => setCardTilt({ rotateX: 0, rotateY: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin && !humanVerified) {
      toast.error('Please verify you are human');
      return;
    }

    setLoading(true);
    setAuthStatus('verifying');
    try {
      if (isLogin) {
        const result = await login(form.email, form.password);
        if (result?.requires_2fa) {
          setTwoFactor({ challengeId: result.challenge_id, code: '', email: result.email });
          setAuthStatus('twofactor');
          toast.success('Verification code sent to your email');
          return;
        }
        setLoadingProgress(100);
        setAuthStatus('granted');
        toast.success('Welcome back!');
      } else {
        await signup(form.email, form.username, form.password);
        setLoadingProgress(100);
        setAuthStatus('granted');
        toast.success('Account created! Check email for verification.');
      }
      window.setTimeout(() => navigate('/dashboard'), 380);
    } catch (err) {
      setAuthStatus('denied');
      setShakeNonce((prev) => prev + 1);
      toast.error(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e) => {
    e.preventDefault();
    if (!twoFactor.code.trim()) return;
    setLoading(true);
    setAuthStatus('verifying');
    try {
      await verifyTwoFactor(twoFactor.challengeId, twoFactor.code);
      setLoadingProgress(100);
      setAuthStatus('granted');
      toast.success('2FA verification complete');
      window.setTimeout(() => navigate('/dashboard'), 380);
    } catch (err) {
      setAuthStatus('denied');
      setShakeNonce((prev) => prev + 1);
      toast.error(err.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const assistantHints = useMemo(
    () => [
      AI_MESSAGES[activeAiMessage],
      'Security tip: Use strong password',
      isLogin ? 'Need an account? Switch to sign up.' : 'Already onboarded? Switch to login.',
    ],
    [activeAiMessage, isLogin]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-4 py-8 sm:px-6 lg:px-8">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `radial-gradient(circle 260px at ${cursorGlow.x}px ${cursorGlow.y}px, rgba(0,255,200,0.16), rgba(0,194,255,0.08) 28%, rgba(184,41,255,0.07) 45%, transparent 75%)`,
        }}
      />
      <div className="auth-grid pointer-events-none absolute inset-0 z-0" />
      <div className="auth-gradient-cloud pointer-events-none absolute inset-0 z-0" />
      <div className="pointer-events-none absolute left-[-12rem] top-[8%] z-0 h-80 w-80 rounded-full bg-[#00D4FF]/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-[-10rem] bottom-[10%] z-0 h-96 w-96 rounded-full bg-[#B829FF]/10 blur-[150px]" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.06fr_0.94fr]">
        <section className="hidden lg:block">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/20 bg-[#00D4FF]/5 px-4 py-2 text-xs font-mono uppercase tracking-[0.22em] text-[#00D4FF]">
              <span className="threat-dot safe" />
              Military Grade Secure Access
            </div>

            <h1 className="mt-8 text-5xl font-black leading-[0.98] tracking-tight font-['Orbitron'] text-white xl:text-6xl">
              Secure Access
              <span className="block neon-blue">For Cyber Operations</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[#9AA7BC]">
              Sign in to the CyberSafe platform with protected account access, session validation, and optional two-factor security controls.
            </p>

            <div className="mt-8 rounded-[28px] border border-[#00D4FF]/10 bg-white/[0.03] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-[#8B949E]">Access Control</div>
                  <div className={`mt-2 font-['Orbitron'] text-lg text-white ${glitchPulse ? 'auth-glitch-text' : ''}`}>Session Verification Monitor</div>
                </div>
                <Badge className="border-0 bg-[#00FF9F]/10 text-[#00FF9F]">ACTIVE</Badge>
              </div>

              <div className="auth-world-map mb-4">
                <div className="auth-world-map-overlay" />
                <svg viewBox={`0 0 ${AUTH_MAP_WIDTH} ${AUTH_MAP_HEIGHT}`} className="h-full w-full">
                  <defs>
                    <linearGradient id="authAttackLine" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="rgba(0,194,255,0.08)" />
                      <stop offset="50%" stopColor="rgba(0,255,159,0.65)" />
                      <stop offset="100%" stopColor="rgba(184,41,255,0.18)" />
                    </linearGradient>
                  </defs>
                  <g opacity="0.18" fill="rgba(110,143,190,0.14)">
                    <path d="M72 112c78-40 166-50 228-24 26 10 47 23 58 43-17 27-58 37-92 42-62 10-146 10-206-5-28-7-54-20-58-39-4-20 23-29 70-17z" />
                    <path d="M305 98c64-28 149-28 212-8 34 11 69 33 76 67 6 30-18 58-46 73-60 30-163 32-228 3-27-12-49-29-54-57-6-29 13-58 40-78z" />
                    <path d="M585 142c42-13 88-13 126-3 28 8 61 25 65 54 5 28-17 49-41 59-48 20-119 18-164-6-18-10-34-28-31-51 3-22 22-42 45-53z" />
                  </g>
                  {AUTH_ATTACK_POINTS.map((point) => {
                    const p = authProject(point.lat, point.lon);
                    return (
                      <g key={point.name} transform={`translate(${p.x} ${p.y})`}>
                        <motion.circle
                          cx="0"
                          cy="0"
                          r="11"
                          fill="rgba(0,194,255,0.05)"
                          animate={{ scale: [0.7, 1.6, 0.7], opacity: [0.4, 0, 0.4] }}
                          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <circle cx="0" cy="0" r="3" fill="rgba(0,255,159,0.92)" />
                      </g>
                    );
                  })}
                  {attackBursts.map((attack, index) => (
                    <motion.path
                      key={attack.id}
                      d={authArc(attack.from, attack.to)}
                      fill="none"
                      stroke="url(#authAttackLine)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="8 12"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: [0.1, 0.9, 0.18] }}
                      transition={{ duration: 1.4, delay: index * 0.05 }}
                    />
                  ))}
                </svg>
                <div className="auth-world-map-label left-5 top-5">
                  <Globe2 className="mr-2 h-3.5 w-3.5 text-[#00D4FF]" />
                  Live Threat Grid
                </div>
                {warningPulse && (
                  <motion.div
                    key={warningPulse}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="auth-world-map-label right-5 bottom-5 text-red-300"
                  >
                    <AlertOctagon className="mr-2 h-3.5 w-3.5 text-red-400" />
                    {warningPulse}
                  </motion.div>
                )}
              </div>

              <div className="auth-biometric-frame">
                <div className="auth-scan-box">
                  <div className="auth-scan-line" />
                  <div className="absolute inset-6 rounded-[20px] border border-[#00D4FF]/15" />
                  <div className="absolute inset-10 rounded-[18px] border border-[#00FF9F]/15" />
                  <div className="absolute left-6 top-6 h-10 w-10 border-l-2 border-t-2 border-[#00D4FF]" />
                  <div className="absolute right-6 top-6 h-10 w-10 border-r-2 border-t-2 border-[#00D4FF]" />
                  <div className="absolute bottom-6 left-6 h-10 w-10 border-b-2 border-l-2 border-[#00D4FF]" />
                  <div className="absolute bottom-6 right-6 h-10 w-10 border-b-2 border-r-2 border-[#00D4FF]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="auth-face-orb">
                      <Fingerprint className="h-14 w-14 text-[#00FF9F]" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-[22px] border border-white/8 bg-black/25 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-[#8B949E]">Scan Status</div>
                    <div className="mt-3 font-mono text-sm text-[#00FF9F]">Scanning identity...</div>
                    <div className="mt-2 font-mono text-xs text-[#8B949E]">Access verifying...</div>
                    <div className="mt-5 space-y-2">
                      {AUTH_SIGNALS.map((item) => (
                        <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3">
                          <item.icon className="h-4 w-4 text-[#00D4FF]" />
                          <div>
                            <div className="text-xs text-white">{item.label}</div>
                            <div className="text-[11px] text-[#8B949E]">{item.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-[#00D4FF]/10 bg-black/25 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-[#8B949E]">Authentication Console</div>
                    <div className="auth-terminal mt-4">
                      <div className="mb-3 flex items-center gap-2 text-[#00D4FF]">
                        <ScanLine className="h-4 w-4" />
                        <span>secure-shell</span>
                      </div>
                      <div className="font-mono text-sm text-[#00FF9F]">
                        {terminalText}
                        <span className="auth-terminal-cursor">|</span>
                      </div>
                      <div className="mt-5 space-y-2 text-xs text-[#8B949E]">
                        <div>[+] Neural trust model loaded</div>
                        <div>[+] Token signatures aligned</div>
                        <div>[+] Awaiting operator credentials</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="auth-float-panel rounded-[22px] border border-[#00D4FF]/10 bg-black/25 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-[#8B949E]">Face Scan</div>
                    <div className="mt-3 text-sm text-white">Camera overlay active</div>
                    <div className="mt-2 text-xs text-[#8B949E]">Depth mesh and facial trust score aligned.</div>
                  </div>
                  <div className="auth-float-panel rounded-[22px] border border-[#B829FF]/10 bg-black/25 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-[#8B949E]">Fingerprint</div>
                    <div className="mt-3 text-sm text-white">Alternative login ready</div>
                    <div className="mt-2 text-xs text-[#8B949E]">Touch sensor can be wired later to real identity providers.</div>
                  </div>
                  <div className="auth-float-panel rounded-[22px] border border-[#00FF9F]/10 bg-black/25 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-[#8B949E]">Voice Command</div>
                    <div className="mt-3 text-sm text-white">Listening shell armed</div>
                    <div className="mt-2 text-xs text-[#8B949E]">Say login to proceed.</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="relative">
          <AnimatePresence>
            {assistantOpen && (
              <motion.aside
                initial={{ opacity: 0, x: 24, y: 12 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 24, y: 12 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="auth-ai-panel hidden xl:block"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#00D4FF]/10">
                      <Bot className="h-4 w-4 text-[#00D4FF]" />
                    </div>
                    <div>
                      <div className="text-sm text-white">AI Security Guide</div>
                      <div className="text-[11px] text-[#8B949E]">Assistive operator panel</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setAssistantOpen(false)} className="text-[#8B949E] transition-colors hover:text-white">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {assistantHints.map((message, index) => (
                    <motion.div
                      key={`${message}-${index}`}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[#C8D2E2]"
                    >
                      {message}
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-[12px] text-[#8B949E]">
                  Voice UI ready: <span className="text-[#00FF9F]">“Say login to proceed”</span>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {!assistantOpen && (
            <button
              type="button"
              onClick={() => setAssistantOpen(true)}
              className="absolute right-0 top-0 z-20 hidden rounded-2xl border border-[#00D4FF]/15 bg-[#00D4FF]/10 px-4 py-2 text-sm text-[#00D4FF] shadow-[0_0_30px_rgba(0,212,255,0.12)] xl:flex"
            >
              <Bot className="mr-2 h-4 w-4" />
              Open AI Guide
            </button>
          )}

          <motion.div
            key={shakeNonce}
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              x: authStatus === 'denied' ? [0, -10, 10, -8, 8, 0] : 0,
            }}
            transition={{ duration: authStatus === 'denied' ? 0.42 : 0.45, ease: [0.16, 1, 0.3, 1] }}
            onMouseMove={handleCardMove}
            onMouseLeave={resetCardTilt}
            className="auth-card-shell mx-auto w-full max-w-xl"
            style={{
              transform: `perspective(1000px) rotateX(${cardTilt.rotateX}deg) rotateY(${cardTilt.rotateY}deg)`,
            }}
          >
            <div className="auth-card-grid" />
            <div className="auth-card-scanline" />
            <div className="auth-card-glow-orb" />

            <div className="relative z-10 rounded-[26px] border border-white/10 bg-[rgba(6,8,14,0.76)] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-5">
              <div className="rounded-[22px] border border-white/8 bg-[rgba(5,8,13,0.82)] p-6 sm:p-8">
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00D4FF]/10 shadow-[inset_0_0_24px_rgba(0,212,255,0.12),0_0_32px_rgba(0,212,255,0.08)]">
                      <Shield className="h-6 w-6 text-[#00D4FF]" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.28em] text-[#8B949E]">CyberGuard</div>
                      <h2 className="text-xl font-black tracking-tight font-['Orbitron'] text-white">
                        {isLogin ? 'Operator Login' : 'Create Access Profile'}
                      </h2>
                    </div>
                  </div>
                  <div className="hidden rounded-full border border-[#00FF66]/20 bg-[#00FF66]/10 px-3 py-1 text-xs font-mono text-[#00FF66] sm:block">
                    AUTH ONLINE
                  </div>
                </div>

                <div className="mb-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#00D4FF]/10 bg-[#00D4FF]/[0.04] p-4">
                    <div className="mb-2 flex items-center gap-2 text-[#00D4FF]">
                      <Fingerprint className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.22em]">Fingerprint Scan</span>
                    </div>
                    <div className="auth-fingerprint-strip">
                      <motion.div
                        className="auth-fingerprint-sweep"
                        animate={{ x: ['-20%', '110%'] }}
                        transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </div>
                    <div className="mt-2 text-[11px] text-[#8B949E]">Alternative secure entry mode armed.</div>
                  </div>
                  <div className="rounded-2xl border border-[#B829FF]/10 bg-[#B829FF]/[0.04] p-4">
                    <div className="mb-2 flex items-center gap-2 text-[#B829FF]">
                      <Mic className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.22em]">Voice Command</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/25 px-3 py-3">
                      <motion.div
                        className="flex gap-1"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                      >
                        <span className="h-4 w-1 rounded-full bg-[#00FF9F]" />
                        <span className="h-6 w-1 rounded-full bg-[#00D4FF]" />
                        <span className="h-3 w-1 rounded-full bg-[#B829FF]" />
                      </motion.div>
                      <div className="text-sm text-white">Say login to proceed</div>
                    </div>
                  </div>
                </div>

                <div className="mb-8 grid grid-cols-2 gap-2 rounded-2xl border border-white/8 bg-black/35 p-1.5">
                  <button
                    type="button"
                    data-testid="auth-mode-login"
                    onClick={() => setIsLogin(true)}
                    className={`pressable auth-mode-chip rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      isLogin
                        ? 'bg-[#00D4FF] text-black shadow-[0_10px_30px_rgba(0,212,255,0.28)]'
                        : 'text-[#8B949E] hover:text-white'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    data-testid="auth-mode-signup"
                    onClick={() => setIsLogin(false)}
                    className={`pressable auth-mode-chip rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      !isLogin
                        ? 'bg-[#B829FF] text-white shadow-[0_10px_30px_rgba(184,41,255,0.24)]'
                        : 'text-[#8B949E] hover:text-white'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {googleProvider.enabled && (
                  <div className="mb-6 rounded-2xl border border-white/8 bg-black/35 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Direct Gmail Login</div>
                        <div className="mt-1 text-sm text-white">Continue instantly with your Google account</div>
                      </div>
                      <AudioLines className="h-4 w-4 text-[#00D4FF]" />
                    </div>
                    <div ref={googleButtonRef} className="flex min-h-11 items-center justify-center overflow-hidden rounded-2xl bg-white/5" />
                  </div>
                )}

                {twoFactor.challengeId ? (
                  <form onSubmit={handleVerifyTwoFactor} className="space-y-5">
                    <div className="rounded-2xl border border-[#00FF9F]/20 bg-[#00FF9F]/5 p-4 animate-fade-in-up">
                      <div className="text-xs uppercase tracking-[0.22em] text-[#00FF9F]">Two-Factor Authentication</div>
                      <p className="mt-2 text-sm text-[#8B949E]">Enter the 6-digit verification code sent to {twoFactor.email}.</p>
                      <Input
                        data-testid="auth-2fa-code"
                        value={twoFactor.code}
                        onChange={e => setTwoFactor(prev => ({ ...prev, code: e.target.value }))}
                        className="mt-4 h-14 rounded-2xl border-[#00D4FF]/10 bg-black/40 text-center font-mono tracking-[0.4em] text-white focus:border-[#00D4FF]"
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="auth-submit-btn ripple-surface pressable relative h-14 w-full overflow-hidden rounded-2xl bg-[#00FF9F] text-sm font-bold text-black hover:bg-[#00e58f]"
                    >
                      {loading ? 'Verifying Code...' : 'Complete Secure Login'}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setTwoFactor({ challengeId: '', code: '', email: '' })}
                      className="w-full rounded-2xl border border-white/8 text-[#8B949E]"
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <Label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B949E]" />
                        <Input
                          data-testid="auth-email-input"
                          type="email"
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          className="auth-input h-14 rounded-2xl border-[#00D4FF]/10 bg-black/40 pl-11 text-white placeholder:text-[#657184] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                          placeholder="agent@cyberguard.io"
                          required
                        />
                      </div>
                    </div>

                    {!isLogin && (
                      <div>
                        <Label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Username</Label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B949E]" />
                          <Input
                            data-testid="auth-username-input"
                            value={form.username}
                            onChange={e => setForm({ ...form, username: e.target.value })}
                            className="auth-input h-14 rounded-2xl border-[#00D4FF]/10 bg-black/40 pl-11 text-white placeholder:text-[#657184] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                            placeholder="hackerman"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B949E]" />
                        <Input
                          data-testid="auth-password-input"
                          type={showPass ? 'text' : 'password'}
                          value={form.password}
                          onChange={e => setForm({ ...form, password: e.target.value })}
                          className="auth-input h-14 rounded-2xl border-[#00D4FF]/10 bg-black/40 pl-11 pr-12 text-white placeholder:text-[#657184] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                          placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                          required
                        />
                        <button
                          type="button"
                          data-testid="toggle-password-visibility"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B949E] transition-colors hover:text-white"
                        >
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {!isLogin && (
                      <div className="rounded-2xl border border-[#00D4FF]/10 bg-[#00D4FF]/[0.03] p-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            data-testid="human-checkbox"
                            checked={humanVerified}
                            onCheckedChange={handleHumanCheck}
                            className="border-white/20 data-[state=checked]:border-[#00D4FF] data-[state=checked]:bg-[#00D4FF]"
                          />
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#8B949E]" onClick={() => !humanVerified && handleHumanCheck(true)}>
                            <ShieldCheck className="h-4 w-4 text-[#00D4FF]" />
                            {humanVerified ? <span className="text-[#00D4FF]">Human verification passed</span> : 'Run identity verification'}
                          </label>
                        </div>
                      </div>
                    )}

                    <Button
                      data-testid="auth-submit-button"
                      type="submit"
                      disabled={loading}
                      onClick={triggerRipple}
                      className="auth-submit-btn ripple-surface pressable relative h-14 w-full overflow-hidden rounded-2xl bg-[#00D4FF] text-sm font-bold text-black hover:bg-[#00B8E6]"
                    >
                      {ripple && (
                        <motion.span
                          key={ripple.id}
                          initial={{ opacity: 0.9, scale: 0 }}
                          animate={{ opacity: 0, scale: 14 }}
                          transition={{ duration: 0.75, ease: 'easeOut' }}
                          className="pointer-events-none absolute h-10 w-10 rounded-full border border-white/70 bg-white/10"
                          style={{ left: ripple.x - 20, top: ripple.y - 20 }}
                        />
                      )}
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="loading-spinner" />
                          Processing...
                        </span>
                      ) : (
                        <>
                          {isLogin ? 'Enter Dashboard' : 'Create Secure Access'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-between gap-4 text-sm">
                      <button
                        data-testid="auth-toggle"
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-[#8B949E] transition-colors hover:text-[#00D4FF]"
                      >
                        {isLogin ? 'Need an account? ' : 'Already onboarded? '}
                        <span className="font-medium text-[#00D4FF]">{isLogin ? 'Sign up' : 'Login'}</span>
                      </button>

                      {isLogin && (
                        <Link
                          to="/forgot-password"
                          data-testid="forgot-password-link"
                          className="text-[#8B949E] transition-colors hover:text-[#00D4FF]"
                        >
                          Forgot password?
                        </Link>
                      )}
                    </div>
                  </form>
                )}

                <div className="mt-6 flex items-center gap-4 text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">
                  <div className="flex items-center gap-2">
                    <Waves className="h-3.5 w-3.5 text-[#00D4FF]" />
                    Scan ripple armed
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#B829FF]" />
                    Holographic access
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center rounded-[28px] border border-[#00D4FF]/20 bg-black/70 backdrop-blur-xl"
              >
                <div className="w-full max-w-sm rounded-[24px] border border-[#00D4FF]/15 bg-[#07101a]/92 p-6 text-center shadow-[0_0_40px_rgba(0,212,255,0.12)]">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00D4FF]/20 bg-[#00D4FF]/8">
                    <Fingerprint className="h-7 w-7 text-[#00FF9F]" />
                  </div>
                  <div className="text-xs uppercase tracking-[0.3em] text-[#8B949E]">Secure Validation</div>
                  <div className="mt-3 font-['Orbitron'] text-lg text-white">
                    {authStatus === 'verifying' ? 'Access Verifying...' : authStatus === 'granted' ? 'Access Granted' : 'Access Denied'}
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#00D4FF,#00FF9F,#B829FF)]"
                      animate={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <div className="mt-3 font-mono text-xs text-[#8B949E]">Scanning identity... Access verifying...</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <Dialog open={captchaDialog} onOpenChange={setCaptchaDialog}>
        <DialogContent className="max-w-sm border-[#00D4FF]/10 bg-[#0D1117] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-['Orbitron']">
              <ShieldCheck className="h-5 w-5 text-[#00D4FF]" /> Human Verification
            </DialogTitle>
            <DialogDescription className="text-[#8B949E]">Solve this challenge to continue registration</DialogDescription>
          </DialogHeader>
          {captcha && (
            <div className="mt-2 space-y-4">
              <div className="terminal-bg rounded-2xl p-4 text-center">
                <span className="font-mono text-xl font-bold text-[#00D4FF]">{captcha.question}</span>
              </div>
              <Input
                data-testid="captcha-answer-input"
                value={captchaAnswer}
                onChange={e => setCaptchaAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && verifyCaptcha()}
                className="rounded-2xl border-[#00D4FF]/10 bg-black/50 text-center text-lg font-mono text-white focus:border-[#00D4FF]"
                placeholder="Your answer"
                autoFocus
              />
              <Button
                data-testid="captcha-submit"
                onClick={verifyCaptcha}
                className="w-full rounded-2xl bg-[#00D4FF] font-bold text-black hover:bg-[#00B8E6]"
              >
                Verify
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
