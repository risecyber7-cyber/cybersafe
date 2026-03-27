import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap, BookOpen, ArrowRight, Mail, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLAN_ICONS = { 'live-class': Zap, 'recorded-class': BookOpen, 'free-demo': Crown };

export default function Plans() {
  const [plans, setPlans] = useState([
    { id: 'live-class', name: 'Live Classes', price: 500, currency: 'INR', period: 'month', features: ['Live interactive sessions', 'Real-time Q&A', 'Hands-on labs', 'Certificate of completion', 'Discord community access'], popular: true },
    { id: 'recorded-class', name: 'Recorded Classes', price: 299, currency: 'INR', period: 'month', features: ['Self-paced learning', 'HD video lectures', 'Downloadable resources', 'Practice exercises', 'Lifetime access'] },
    { id: 'free-demo', name: 'Free Demo (7 days)', price: 0, currency: 'INR', period: '7 days', features: ['Access to 3 demo classes', 'Preview of all courses', 'Limited lab access', 'Email support'], note: 'For gokali.pro subscribers: Send subscription screenshot to risecyber7@gmail.com for free 7-day demo access.' },
  ]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleSubscribe = (plan) => {
    setSelectedPlan(plan);
    setShowDialog(true);
  };

  const submitSubscription = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/plans/subscribe`, {
        plan_id: selectedPlan.id, name: form.name, email: form.email, phone: form.phone,
      });
      toast.success(res.data.message);
      setShowDialog(false);
      setForm({ name: '', email: '', phone: '' });
    } catch (err) {
      toast.error('Subscription failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative" data-testid="plans-page">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 py-10 relative">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-0 mb-4">PRICING</Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight font-['Orbitron'] mb-4">
            Choose Your <span className="neon-text">Plan</span>
          </h1>
          <p className="text-[#8B949E] max-w-lg mx-auto">
            Level up your cybersecurity skills with our comprehensive courses and live sessions.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan, i) => {
            const Icon = PLAN_ICONS[plan.id] || Zap;
            return (
              <div
                key={plan.id}
                data-testid={`plan-card-${plan.id}`}
                className={`glass card-interactive p-6 rounded-sm relative animate-fade-in-up stagger-${i + 1} ${plan.popular ? 'border-[#00D4FF]/50 shadow-[0_0_30px_rgba(0,255,102,0.1)]' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#00D4FF] text-black font-bold border-0">MOST POPULAR</Badge>
                  </div>
                )}
                <div className="mb-6 pt-2">
                  <div className="w-10 h-10 flex items-center justify-center bg-[#00D4FF]/10 rounded-sm mb-4">
                    <Icon className="w-5 h-5 text-[#00D4FF]" />
                  </div>
                  <h3 className="text-xl font-bold font-['Orbitron'] mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    {plan.price > 0 ? (
                      <>
                        <span className="text-3xl font-black text-[#00D4FF]">Rs.{plan.price}</span>
                        <span className="text-sm text-[#8B949E]">/{plan.period}</span>
                      </>
                    ) : (
                      <span className="text-3xl font-black text-[#00D4FF]">FREE</span>
                    )}
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-[#8B949E]">
                      <Check className="w-4 h-4 text-[#00D4FF] shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                {plan.note && (
                  <div className="bg-[#00D4FF]/5 border border-[#00D4FF]/20 p-3 rounded-sm mb-6">
                    <p className="text-xs text-[#00D4FF]">{plan.note}</p>
                  </div>
                )}
                <Button
                  data-testid={`plan-subscribe-${plan.id}`}
                  onClick={() => handleSubscribe(plan)}
                  className={plan.popular ? 'w-full bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm' : 'w-full bg-[#00D4FF]/5 border border-[#00D4FF]/10 text-white hover:border-[#00D4FF] hover:text-[#00D4FF] rounded-sm'}
                >
                  {plan.price > 0 ? 'Subscribe Now' : 'Get Free Demo'} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* gokali.pro info */}
        <div className="glass p-8 rounded-sm text-center animate-fade-in-up">
          <Mail className="w-8 h-8 text-[#00D4FF] mx-auto mb-4" />
          <h3 className="text-xl font-bold font-['Orbitron'] mb-2">Have a gokali.pro subscription?</h3>
          <p className="text-[#8B949E] mb-4 max-w-md mx-auto">
            Send a screenshot of your active gokali.pro subscription to <span className="text-[#00D4FF] font-mono">risecyber7@gmail.com</span> and get <b className="text-white">7 days free demo access</b> to all classes!
          </p>
          <a href="mailto:risecyber7@gmail.com?subject=Free Demo Request - gokali.pro subscriber" data-testid="gokali-email-link">
            <Button className="bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm">
              <Mail className="w-4 h-4 mr-2" /> Send Email
            </Button>
          </a>
        </div>
      </div>

      {/* Subscribe Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#0D1117] border-[#00D4FF]/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Orbitron']">Subscribe to {selectedPlan?.name}</DialogTitle>
            <DialogDescription className="text-[#8B949E]">
              {selectedPlan?.price > 0 ? `Rs.${selectedPlan?.price}/${selectedPlan?.period}` : 'Free for 7 days'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitSubscription} className="space-y-4 mt-4">
            <div>
              <Label className="text-[#8B949E] text-xs">Full Name</Label>
              <Input data-testid="subscribe-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-black/50 border-[#00D4FF]/10 text-white focus:border-[#00D4FF] rounded-sm mt-1" required />
            </div>
            <div>
              <Label className="text-[#8B949E] text-xs">Email</Label>
              <Input data-testid="subscribe-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-black/50 border-[#00D4FF]/10 text-white focus:border-[#00D4FF] rounded-sm mt-1" required />
            </div>
            <div>
              <Label className="text-[#8B949E] text-xs">Phone (optional)</Label>
              <Input data-testid="subscribe-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-black/50 border-[#00D4FF]/10 text-white focus:border-[#00D4FF] rounded-sm mt-1" />
            </div>
            <Button data-testid="subscribe-submit" type="submit" disabled={loading} className="w-full bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm">
              {loading ? 'Processing...' : 'Confirm Subscription'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
