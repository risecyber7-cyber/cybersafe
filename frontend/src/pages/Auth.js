import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Shield, Mail, User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { API_BASE } from '@/lib/config';

const API = API_BASE;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  // Captcha state
  const [captchaDialog, setCaptchaDialog] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [humanVerified, setHumanVerified] = useState(false);

  const loadCaptcha = async () => {
    try {
      const res = await axios.post(`${API}/captcha/generate`);
      setCaptcha(res.data);
      setCaptchaAnswer('');
    } catch { toast.error('Failed to load captcha'); }
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
        await login(form.email, form.password);
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute inset-0 hero-gradient pointer-events-none" />

      <div className="w-full max-w-md relative animate-fade-in-up" data-testid="auth-container">
        <div className="glass p-8 rounded-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 bg-[#00D4FF]/10 rounded-sm flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#00D4FF]" />
            </div>
            <h1 className="text-2xl font-black font-['Orbitron'] tracking-tight">
              {isLogin ? 'Welcome Back' : 'Join CyberGuard'}
            </h1>
            <p className="text-sm text-[#8B949E] mt-2">
              {isLogin ? 'Access your security terminal' : 'Start your ethical hacking journey'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-[#8B949E] text-xs mb-1.5 block">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
                <Input
                  data-testid="auth-email-input"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="bg-black/50 border-[#00D4FF]/10 text-white pl-10 focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-sm"
                  placeholder="agent@cyberguard.io"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <Label className="text-[#8B949E] text-xs mb-1.5 block">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
                  <Input
                    data-testid="auth-username-input"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    className="bg-black/50 border-[#00D4FF]/10 text-white pl-10 focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-sm"
                    placeholder="hackerman"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-[#8B949E] text-xs mb-1.5 block">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
                <Input
                  data-testid="auth-password-input"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="bg-black/50 border-[#00D4FF]/10 text-white pl-10 pr-10 focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] rounded-sm"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  data-testid="toggle-password-visibility"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-white"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="flex items-center gap-3 mt-2 glass p-3 rounded-sm">
                <Checkbox
                  data-testid="human-checkbox"
                  checked={humanVerified}
                  onCheckedChange={handleHumanCheck}
                  className="border-white/20 data-[state=checked]:bg-[#00D4FF] data-[state=checked]:border-[#00D4FF]"
                />
                <label className="text-sm text-[#8B949E] cursor-pointer flex items-center gap-2" onClick={() => !humanVerified && handleHumanCheck(true)}>
                  <ShieldCheck className="w-4 h-4 text-[#00D4FF]" />
                  {humanVerified ? <span className="text-[#00D4FF]">Verified - You are human</span> : 'I am not a robot'}
                </label>
              </div>
            )}

            <Button
              data-testid="auth-submit-button"
              type="submit"
              disabled={loading}
              className="w-full bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm h-11 mt-2"
            >
              {loading ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <>{isLogin ? 'Login' : 'Create Account'} <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>

            {isLogin && (
              <div className="text-center mt-2">
                <Link to="/forgot-password" data-testid="forgot-password-link" className="text-xs text-[#8B949E] hover:text-[#00D4FF] transition-colors">
                  Forgot your password?
                </Link>
              </div>
            )}
          </form>

          {/* Captcha Dialog */}
          <Dialog open={captchaDialog} onOpenChange={setCaptchaDialog}>
            <DialogContent className="bg-[#0D1117] border-[#00D4FF]/10 text-white max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-['Orbitron'] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#00D4FF]" /> Human Verification
                </DialogTitle>
                <DialogDescription className="text-[#8B949E]">Solve this to prove you're human</DialogDescription>
              </DialogHeader>
              {captcha && (
                <div className="space-y-4 mt-2">
                  <div className="terminal-bg p-4 rounded-sm text-center">
                    <span className="text-xl font-mono text-[#00D4FF] font-bold">{captcha.question}</span>
                  </div>
                  <Input
                    data-testid="captcha-answer-input"
                    value={captchaAnswer}
                    onChange={e => setCaptchaAnswer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && verifyCaptcha()}
                    className="bg-black/50 border-[#00D4FF]/10 text-white focus:border-[#00D4FF] rounded-sm font-mono text-center text-lg"
                    placeholder="Your answer"
                    autoFocus
                  />
                  <Button data-testid="captcha-submit" onClick={verifyCaptcha} className="w-full bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm">
                    Verify
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              data-testid="auth-toggle"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-[#8B949E] hover:text-[#00D4FF] transition-colors"
            >
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="text-[#00D4FF] font-medium">{isLogin ? 'Sign up' : 'Login'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
