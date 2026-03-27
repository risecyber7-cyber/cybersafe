import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { Shield, Wrench, BookOpen, FlaskConical, Bot, ArrowRight, Lock, Eye, Zap, Globe, Cpu, ShieldCheck, Radar, Activity, AlertTriangle, Mail, Send, Server, Bug, MonitorCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Animated Counter
function Counter({ from = 0, to, duration = 2, suffix = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const count = useMotionValue(from);
  const rounded = useTransform(count, v => Math.round(v));
  const [display, setDisplay] = useState(from);

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, to, { duration });
      const unsub = rounded.on('change', v => setDisplay(v));
      return () => { controls.stop(); unsub(); };
    }
  }, [isInView, count, to, duration, rounded]);

  return <span ref={ref}>{display}{suffix}</span>;
}

// Particle Background
function Particles() {
  return (
    <div className="particle-field">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 6}s`,
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            background: ['#00D4FF', '#00FF66', '#B829FF', '#FF2D78'][Math.floor(Math.random() * 4)],
          }}
        />
      ))}
    </div>
  );
}

// Radar Component
function RadarWidget() {
  return (
    <div className="radar-container animate-float">
      <div className="radar-sweep" />
      <div className="radar-ring" style={{ inset: '15%' }} />
      <div className="radar-ring" style={{ inset: '30%' }} />
      <div className="radar-ring" style={{ inset: '45%' }} />
      {/* Radar dots */}
      {[
        { top: '25%', left: '60%', color: '#FF2D78', delay: '0s' },
        { top: '40%', left: '30%', color: '#00FF66', delay: '1s' },
        { top: '65%', left: '70%', color: '#FF6B00', delay: '0.5s' },
        { top: '55%', left: '45%', color: '#00D4FF', delay: '1.5s' },
      ].map((d, i) => (
        <div key={i} className="absolute w-2 h-2 rounded-full" style={{ top: d.top, left: d.left, background: d.color, boxShadow: `0 0 8px ${d.color}`, animation: `threatPulse 2s ${d.delay} infinite` }} />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <Radar className="w-6 h-6 text-[#00D4FF]/30" />
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Cpu, title: 'Threat Detection AI', desc: 'Advanced AI-powered threat analysis and real-time vulnerability scanning.', color: '#00D4FF', glow: 'rgba(0,212,255,0.15)' },
  { icon: Globe, title: 'Network Monitoring', desc: 'Monitor network traffic, detect anomalies, and analyze security headers.', color: '#00FF66', glow: 'rgba(0,255,102,0.15)' },
  { icon: Bug, title: 'Vulnerability Scanner', desc: 'Comprehensive scanning tools for subdomains, ports, and WHOIS data.', color: '#B829FF', glow: 'rgba(184,41,255,0.15)' },
];

const SERVICES = [
  { icon: ShieldCheck, title: 'Penetration Testing', desc: 'Simulated attacks to find vulnerabilities before hackers do.', color: '#00D4FF' },
  { icon: Bug, title: 'Bug Bounty', desc: 'Practice responsible disclosure with sandbox challenges.', color: '#FF2D78' },
  { icon: MonitorCheck, title: 'SOC Monitoring', desc: 'Security Operations Center simulation with real-time alerts.', color: '#00FF66' },
];

const STATS = [
  { value: 2847, label: 'Active Threats Detected', suffix: '+', color: '#FF2D78' },
  { value: 15420, label: 'Attacks Blocked', suffix: '+', color: '#00FF66' },
  { value: 99, label: 'Risk Score', suffix: '%', color: '#00D4FF' },
  { value: 5, label: 'Security Tools', suffix: '+', color: '#B829FF' },
];

const LOG_ENTRIES = [
  { time: '10:42:33', type: 'ALERT', msg: 'Suspicious login attempt from 192.168.1.105', color: '#FF2D78' },
  { time: '10:42:31', type: 'BLOCK', msg: 'SQL injection attempt blocked on /api/login', color: '#FF6B00' },
  { time: '10:42:28', type: 'INFO', msg: 'Port scan detected from 10.0.0.45', color: '#00D4FF' },
  { time: '10:42:25', type: 'SAFE', msg: 'TLS certificate renewed successfully', color: '#00FF66' },
  { time: '10:42:22', type: 'ALERT', msg: 'Brute force attempt on SSH port 22', color: '#FF2D78' },
  { time: '10:42:19', type: 'BLOCK', msg: 'XSS payload sanitized in comment form', color: '#FF6B00' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function Landing() {
  return (
    <div className="relative overflow-hidden bg-[#060611]">
      <div className="cyber-grid" />
      <Particles />

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[95vh] flex items-center" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 glass rounded-full text-xs font-mono animate-border-glow">
                <span className="threat-dot safe" style={{ width: 6, height: 6 }} />
                <span className="text-[#00FF66]">SYSTEM ONLINE</span>
                <span className="text-[#8B949E]">&bull; v3.0</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-6 font-['Orbitron']">
                <span className="text-white">Next-Gen</span>
                <br />
                <span className="neon-blue">Cyber Defense</span>
                <br />
                <span className="text-white">System</span>
              </h1>
              <p className="text-[#8B949E] text-base sm:text-lg max-w-lg mb-8 leading-relaxed">
                Advanced cybersecurity platform with AI-powered threat detection,
                real-time monitoring, and hands-on vulnerability training.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/tools" data-testid="hero-start-scanning">
                  <Button className="btn-glow bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm px-7 py-3.5 text-sm h-auto font-['Orbitron']">
                    <Radar className="w-4 h-4 mr-2" /> Start Scanning
                  </Button>
                </Link>
                <Link to="/learn" data-testid="hero-learn-more">
                  <Button variant="outline" className="border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/10 hover:border-[#00D4FF] rounded-sm px-7 py-3.5 text-sm h-auto bg-transparent">
                    Learn More
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:flex justify-center"
            >
              <RadarWidget />
            </motion.div>
          </div>
        </div>
        {/* Hero gradient glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00D4FF]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#B829FF]/5 rounded-full blur-[100px] pointer-events-none" />
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="relative border-y border-[#00D4FF]/10 bg-[#060611]/80 backdrop-blur-xl" data-testid="stats-section">
        <div className="data-stream absolute inset-0 pointer-events-none" />
        <motion.div
          variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10"
        >
          {STATS.map((s, i) => (
            <motion.div key={i} variants={itemVariants} className="text-center">
              <div className="text-3xl sm:text-4xl font-black font-['Orbitron']" style={{ color: s.color, textShadow: `0 0 20px ${s.color}40` }}>
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div className="text-xs text-[#8B949E] mt-2 font-mono uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="relative py-24 lg:py-32" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-xs font-mono text-[#00D4FF] tracking-[0.3em] uppercase">Core Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-3 font-['Orbitron']">
              Powered by <span className="neon-blue">Advanced Tech</span>
            </h2>
          </motion.div>
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={itemVariants} data-testid={`feature-card-${i}`}
                className="glass glass-hover card-3d hud-border p-8 rounded-sm group cursor-default"
              >
                <div className="w-14 h-14 flex items-center justify-center rounded-sm mb-6"
                  style={{ background: f.glow, boxShadow: `0 0 20px ${f.glow}` }}>
                  <f.icon className="w-7 h-7" style={{ color: f.color }} />
                </div>
                <h3 className="text-lg font-bold mb-3 font-['Orbitron'] group-hover:neon-blue transition-all">{f.title}</h3>
                <p className="text-sm text-[#8B949E] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ LIVE DASHBOARD ═══ */}
      <section className="relative py-24 border-y border-[#00D4FF]/5" data-testid="dashboard-section">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#B829FF]/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-xs font-mono text-[#B829FF] tracking-[0.3em] uppercase">Real-Time Intelligence</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-3 font-['Orbitron']">
              Live <span className="neon-purple">Threat Dashboard</span>
            </h2>
          </motion.div>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Alert Feed */}
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="glass rounded-sm overflow-hidden hud-border"
            >
              <div className="px-4 py-3 border-b border-[#00D4FF]/10 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00D4FF]" />
                <span className="text-sm font-bold font-['Orbitron']">Alert Feed</span>
                <span className="ml-auto text-xs text-[#8B949E] font-mono">LIVE</span>
                <div className="threat-dot critical" style={{ width: 6, height: 6 }} />
              </div>
              <div className="p-4 space-y-2 font-mono text-xs max-h-[280px] overflow-hidden">
                {LOG_ENTRIES.map((l, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }} viewport={{ once: true }}
                    className="flex items-start gap-3 py-1.5 px-2 rounded bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="text-[#8B949E] shrink-0">{l.time}</span>
                    <span className="font-bold shrink-0 w-12" style={{ color: l.color }}>{l.type}</span>
                    <span className="text-[#C9D1D9]">{l.msg}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Threat Stats */}
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="glass rounded-sm hud-border p-6 space-y-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-[#FF2D78]" />
                <span className="text-sm font-bold font-['Orbitron']">Threat Overview</span>
              </div>
              {[
                { label: 'Critical', value: 12, max: 100, color: '#FF2D78' },
                { label: 'High', value: 34, max: 100, color: '#FF6B00' },
                { label: 'Medium', value: 67, max: 100, color: '#00D4FF' },
                { label: 'Low', value: 89, max: 100, color: '#00FF66' },
              ].map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#8B949E] font-mono">{t.label}</span>
                    <span style={{ color: t.color }} className="font-mono">{t.value}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${t.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{ background: t.color, boxShadow: `0 0 10px ${t.color}40` }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ SERVICES ═══ */}
      <section className="relative py-24" data-testid="services-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-xs font-mono text-[#00FF66] tracking-[0.3em] uppercase">What We Offer</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-3 font-['Orbitron']">
              Security <span className="neon-green">Services</span>
            </h2>
          </motion.div>
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <motion.div key={i} variants={itemVariants}
                className="glass glass-hover card-3d p-8 rounded-sm text-center group"
              >
                <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full mb-6"
                  style={{ background: `${s.color}10`, boxShadow: `0 0 30px ${s.color}15` }}>
                  <s.icon className="w-8 h-8" style={{ color: s.color }} />
                </div>
                <h3 className="text-lg font-bold mb-3 font-['Orbitron']">{s.title}</h3>
                <p className="text-sm text-[#8B949E]">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ MARQUEE ═══ */}
      <div className="overflow-hidden border-y border-[#00D4FF]/5 py-5">
        <div className="marquee-track">
          {[...Array(2)].map((_, i) => (
            <span key={i} className="text-5xl font-black text-white/[0.02] tracking-[0.2em] font-['Orbitron'] whitespace-nowrap mx-8">
              SECURE THE NETWORK &bull; HACK THE PLANET &bull; DEFEND THE SYSTEM &bull; BREAK THE CODE &bull;&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ═══ CONTACT ═══ */}
      <section className="relative py-24" data-testid="contact-section">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="glass hud-border rounded-sm p-8 sm:p-10"
          >
            <div className="text-center mb-8">
              <Mail className="w-8 h-8 text-[#00D4FF] mx-auto mb-4" />
              <h2 className="text-2xl font-black font-['Orbitron'] mb-2">Secure <span className="neon-blue">Contact</span></h2>
              <p className="text-sm text-[#8B949E]">Send an encrypted message to our security team</p>
            </div>
            <div className="space-y-4">
              <Input data-testid="contact-name" placeholder="Your Name" className="bg-[#0D1117] border-[#00D4FF]/10 text-white focus:border-[#00D4FF] rounded-sm font-mono" />
              <Input data-testid="contact-email" placeholder="Your Email" type="email" className="bg-[#0D1117] border-[#00D4FF]/10 text-white focus:border-[#00D4FF] rounded-sm font-mono" />
              <textarea data-testid="contact-message" placeholder="Your Message" rows={4} className="w-full bg-[#0D1117] border border-[#00D4FF]/10 text-white focus:border-[#00D4FF] rounded-sm font-mono p-3 text-sm resize-none outline-none focus:ring-1 focus:ring-[#00D4FF]" />
              <Button data-testid="contact-submit" className="w-full btn-glow bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm h-11 font-['Orbitron']">
                <Send className="w-4 h-4 mr-2" /> Encrypted Send
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative py-20 border-t border-[#00D4FF]/5" data-testid="cta-section">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00D4FF]/[0.02] to-transparent pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-3xl mx-auto px-4 text-center relative z-10"
        >
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 font-['Orbitron']">
            Ready to <span className="neon-blue">Defend</span>?
          </h2>
          <p className="text-[#8B949E] mb-8 max-w-lg mx-auto">
            Join CyberGuard and start protecting your digital assets with next-gen security tools.
          </p>
          <Link to="/auth" data-testid="cta-signup">
            <Button className="btn-glow bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm px-8 py-3.5 text-sm h-auto font-['Orbitron']">
              Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#00D4FF]/10 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#00D4FF]" />
            <span className="font-['Orbitron'] text-sm font-bold">CyberGuard</span>
          </div>
          <p className="text-xs text-[#8B949E] font-mono">Educational purposes only. All tools are safe and legal.</p>
        </div>
      </footer>
    </div>
  );
}
