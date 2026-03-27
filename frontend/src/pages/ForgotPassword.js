import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, ArrowRight, ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { API_BASE } from '@/lib/config';

const API = API_BASE;

export default function ForgotPassword() {
  const [step, setStep] = useState('email'); // email | sent | reset | done
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Extract token from URL if present
  useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/reset-password/')) {
      const t = path.replace('/reset-password/', '');
      setToken(t);
      setStep('reset');
    } else if (path.startsWith('/verify-email/')) {
      const t = path.replace('/verify-email/', '');
      setToken(t);
      setStep('verify');
    }
  });

  const requestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setStep('sent');
      toast.success('Check your email for the reset link');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: newPassword });
      setStep('done');
      toast.success('Password reset successfully!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid or expired token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="w-full max-w-md relative animate-fade-in-up" data-testid="forgot-password-page">
        <div className="glass p-8 rounded-sm">
          {step === 'email' && (
            <>
              <div className="text-center mb-8">
                <div className="w-12 h-12 mx-auto mb-4 bg-[#00D4FF]/10 rounded-sm flex items-center justify-center">
                  <Mail className="w-6 h-6 text-[#00D4FF]" />
                </div>
                <h1 className="text-2xl font-black font-['Orbitron'] tracking-tight">Forgot Password</h1>
                <p className="text-sm text-[#8B949E] mt-2">Enter your email to receive a reset link</p>
              </div>
              <form onSubmit={requestReset} className="space-y-4">
                <div>
                  <Label className="text-[#8B949E] text-xs mb-1.5 block">Email Address</Label>
                  <Input data-testid="forgot-email-input" type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-black/50 border-[#00D4FF]/10 text-white focus:border-[#00D4FF] rounded-sm" placeholder="agent@cyberguard.io" required />
                </div>
                <Button data-testid="forgot-submit" type="submit" disabled={loading} className="w-full bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm h-11">
                  {loading ? 'Sending...' : 'Send Reset Link'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </>
          )}

          {step === 'sent' && (
            <div className="text-center" data-testid="forgot-email-sent">
              <div className="w-12 h-12 mx-auto mb-4 bg-[#00D4FF]/10 rounded-sm flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#00D4FF]" />
              </div>
              <h2 className="text-xl font-bold font-['Orbitron'] mb-2">Check Your Email</h2>
              <p className="text-sm text-[#8B949E] mb-6">If an account exists for {email}, we've sent a password reset link.</p>
              <p className="text-xs text-[#8B949E]">Didn't receive it? Check your spam folder or try again.</p>
            </div>
          )}

          {step === 'reset' && (
            <>
              <div className="text-center mb-8">
                <div className="w-12 h-12 mx-auto mb-4 bg-[#00D4FF]/10 rounded-sm flex items-center justify-center">
                  <Lock className="w-6 h-6 text-[#00D4FF]" />
                </div>
                <h1 className="text-2xl font-black font-['Orbitron'] tracking-tight">Reset Password</h1>
                <p className="text-sm text-[#8B949E] mt-2">Enter your new password</p>
              </div>
              <form onSubmit={resetPassword} className="space-y-4">
                <div>
                  <Label className="text-[#8B949E] text-xs mb-1.5 block">New Password</Label>
                  <Input data-testid="reset-password-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-black/50 border-[#00D4FF]/10 text-white focus:border-[#00D4FF] rounded-sm" placeholder="Enter new password" required />
                </div>
                <Button data-testid="reset-submit" type="submit" disabled={loading} className="w-full bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm h-11">
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </>
          )}

          {step === 'done' && (
            <div className="text-center" data-testid="reset-success">
              <div className="w-12 h-12 mx-auto mb-4 bg-[#00D4FF]/10 rounded-sm flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#00D4FF]" />
              </div>
              <h2 className="text-xl font-bold font-['Orbitron'] mb-2">Password Reset!</h2>
              <p className="text-sm text-[#8B949E] mb-6">Your password has been updated. You can now login.</p>
              <Link to="/auth">
                <Button className="bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm">
                  Go to Login <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}

          {step === 'verify' && (
            <div className="text-center" data-testid="verify-email-page">
              <div className="w-12 h-12 mx-auto mb-4 bg-[#00D4FF]/10 rounded-sm flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#00D4FF]" />
              </div>
              <h2 className="text-xl font-bold font-['Orbitron'] mb-2">Verify Email</h2>
              <p className="text-sm text-[#8B949E] mb-6">Click below to verify your account email.</p>
              <Button
                data-testid="verify-email-submit"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await axios.get(`${API}/auth/verify-email/${token}`);
                    toast.success('Email verified successfully');
                    setStep('done');
                  } catch (err) {
                    toast.error(err.response?.data?.detail || 'Verification failed');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </Button>
            </div>
          )}

          {(step === 'email' || step === 'sent' || step === 'verify') && (
            <div className="mt-6 text-center">
              <Link to="/auth" className="text-sm text-[#8B949E] hover:text-[#00D4FF] flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
