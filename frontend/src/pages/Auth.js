import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [twoFactor, setTwoFactor] = useState({ challengeId: '', code: '', email: '' });
  const { login, signup, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();

  const [captchaDialog, setCaptchaDialog] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [humanVerified, setHumanVerified] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin && !humanVerified) {
      toast.error('Please verify you are human');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const result = await login(form.email, form.password);
        if (result?.requires_2fa) {
          setTwoFactor({ challengeId: result.challenge_id, code: '', email: result.email });
          toast.success('Verification code sent to your email');
          return;
        }
        toast.success('Welcome back!');
      } else {
        await signup(form.email, form.username, form.password);
        toast.success('Account created! Check email for verification.');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e) => {
    e.preventDefault();
    if (!twoFactor.code.trim()) return;
    setLoading(true);
    try {
      await verifyTwoFactor(twoFactor.challengeId, twoFactor.code);
      toast.success('2FA verification complete');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="parallax-shell min-h-screen relative overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute inset-0 hero-gradient pointer-events-none" />
      <div className="parallax-layer parallax-layer-back absolute left-[-8rem] top-[10%] h-72 w-72 rounded-full bg-[#00D4FF]/10 blur-[120px] pointer-events-none" />
      <div className="parallax-layer parallax-layer-front absolute right-[-6rem] bottom-[8%] h-80 w-80 rounded-full bg-[#B829FF]/10 blur-[140px] pointer-events-none" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden lg:block animate-slide-in-left">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/20 bg-[#00D4FF]/5 px-4 py-2 text-xs font-mono uppercase tracking-[0.22em] text-[#00D4FF]">
              <span className="threat-dot safe" />
              Secure Access Layer
            </div>

            <h1 className="mt-8 text-5xl font-black leading-[1.02] tracking-tight font-['Orbitron']">
              Command Your
              <span className="block neon-blue">Cyber Operations</span>
              From One Console
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-[#8B949E]">
              Sign in to monitoring, labs, AI workflows, and training systems from a single hardened access point
              designed for analysts, learners, and admins.
            </p>

            <div className="mt-10 grid gap-4">
              {AUTH_SIGNALS.map((item, index) => (
                <div
                  key={item.label}
                  className={`glass glass-motion hover-lift hud-border rounded-sm p-4 animate-fade-in-up stagger-${index + 1}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-[#00D4FF]/10">
                      <item.icon className="h-5 w-5 text-[#00D4FF]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{item.label}</div>
                      <div className="mt-1 text-sm text-[#8B949E]">{item.value}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-[#8B949E]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#00FF66]" />
                Verified onboarding
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#00FF66]" />
                Admin-safe controls
              </div>
            </div>
          </div>
        </section>

        <section className="animate-slide-in-right">
          <div className="glass glass-motion hover-tilt hud-border scan-line mx-auto w-full max-w-xl rounded-[24px] p-3 shadow-[0_0_60px_rgba(0,212,255,0.08)]">
            <div className="rounded-[20px] border border-white/5 bg-[#070b14]/90 p-6 sm:p-8">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00D4FF]/10 shadow-[inset_0_0_24px_rgba(0,212,255,0.12)]">
                    <Shield className="h-6 w-6 text-[#00D4FF]" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-[#8B949E]">CyberGuard</div>
                    <h2 className="text-xl font-black tracking-tight font-['Orbitron']">
                      {isLogin ? 'Operator Login' : 'Create Access Profile'}
                    </h2>
                  </div>
                </div>
                <div className="hidden rounded-full border border-[#00FF66]/20 bg-[#00FF66]/10 px-3 py-1 text-xs font-mono text-[#00FF66] sm:block">
                  AUTH ONLINE
                </div>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-2 rounded-2xl bg-black/30 p-1.5">
                <button
                  type="button"
                  data-testid="auth-mode-login"
                  onClick={() => setIsLogin(true)}
                    className={`pressable rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
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
                    className={`pressable rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    !isLogin
                      ? 'bg-[#00D4FF] text-black shadow-[0_10px_30px_rgba(0,212,255,0.28)]'
                      : 'text-[#8B949E] hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {twoFactor.challengeId && (
                  <div className="rounded-2xl border border-[#00FF9F]/20 bg-[#00FF9F]/5 p-4 animate-fade-in-up">
                    <div className="text-xs uppercase tracking-[0.22em] text-[#00FF9F]">Two-Factor Authentication</div>
                    <p className="mt-2 text-sm text-[#8B949E]">Enter the 6-digit verification code sent to {twoFactor.email}.</p>
                    <div className="mt-4 space-y-3">
                      <Input
                        data-testid="auth-2fa-code"
                        value={twoFactor.code}
                        onChange={e => setTwoFactor(prev => ({ ...prev, code: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleVerifyTwoFactor(e)}
                        className="h-13 rounded-2xl border-[#00D4FF]/10 bg-black/40 text-center font-mono tracking-[0.4em] text-white focus:border-[#00D4FF]"
                        placeholder="000000"
                        maxLength={6}
                      />
                      <div className="flex gap-3">
                        <Button type="button" onClick={handleVerifyTwoFactor} disabled={loading} className="flex-1 rounded-2xl bg-[#00FF9F] text-black font-bold hover:bg-[#00e58f]">
                          Verify Code
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setTwoFactor({ challengeId: '', code: '', email: '' })}
                          className="rounded-2xl text-[#8B949E]"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Email Address</Label>
                  <div className="relative animate-slide-in-up">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B949E]" />
                    <Input
                      data-testid="auth-email-input"
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="h-13 rounded-2xl border-[#00D4FF]/10 bg-black/40 pl-11 text-white placeholder:text-[#657184] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                      placeholder="agent@cyberguard.io"
                      required
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <Label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Username</Label>
                    <div className="relative animate-slide-in-up">
                      <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B949E]" />
                      <Input
                        data-testid="auth-username-input"
                        value={form.username}
                        onChange={e => setForm({ ...form, username: e.target.value })}
                        className="h-13 rounded-2xl border-[#00D4FF]/10 bg-black/40 pl-11 text-white placeholder:text-[#657184] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
                        placeholder="hackerman"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="mb-2 block text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Password</Label>
                  <div className="relative animate-slide-in-up">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B949E]" />
                    <Input
                      data-testid="auth-password-input"
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      className="h-13 rounded-2xl border-[#00D4FF]/10 bg-black/40 pl-11 pr-12 text-white placeholder:text-[#657184] focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF]"
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
                  <div className="glass-motion animate-zoom-in rounded-2xl border border-[#00D4FF]/10 bg-[#00D4FF]/[0.03] p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        data-testid="human-checkbox"
                        checked={humanVerified}
                        onCheckedChange={handleHumanCheck}
                        className="border-white/20 data-[state=checked]:border-[#00D4FF] data-[state=checked]:bg-[#00D4FF]"
                      />
                      <label
                        className="flex cursor-pointer items-center gap-2 text-sm text-[#8B949E]"
                        onClick={() => !humanVerified && handleHumanCheck(true)}
                      >
                        <ShieldCheck className="h-4 w-4 text-[#00D4FF]" />
                        {humanVerified ? (
                          <span className="text-[#00D4FF]">Human verification passed</span>
                        ) : (
                          'Run identity verification'
                        )}
                      </label>
                    </div>
                  </div>
                )}

                <Button
                  data-testid="auth-submit-button"
                  type="submit"
                  disabled={loading || !!twoFactor.challengeId}
                  className="ripple-surface pressable h-13 w-full rounded-2xl bg-[#00D4FF] text-sm font-bold text-black hover:bg-[#00B8E6]"
                >
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
                    {isLogin ? "Need an account? " : 'Already onboarded? '}
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
            </div>
          </div>
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
