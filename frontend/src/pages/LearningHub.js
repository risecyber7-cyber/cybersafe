import { useState } from 'react';
import { PlayCircle, Shield, ExternalLink, Radio, Cloud, Bug, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const CHANNELS = [
  {
    id: 'infosec-institute',
    name: 'The Infosec Institute',
    url: 'https://www.youtube.com/c/InfoSecInstitute',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=InfoSecInstitute',
    category: 'Career Growth',
    focus: ['Security awareness', 'Certifications', 'Beginner friendly'],
    description:
      'Infosec focuses on skill development, certifications, phishing awareness, and practical cyber education for both professionals and beginners.',
  },
  {
    id: 'david-bombal',
    name: 'David Bombal',
    url: 'https://www.youtube.com/c/DavidBombal',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=DavidBombal',
    category: 'Networking + Hacking',
    focus: ['Linux', 'Python', 'Ethical hacking'],
    description:
      'Detailed but engaging videos on Linux, Python, networking, virtualization, and practical ethical hacking workflows.',
  },
  {
    id: 'infosec-live',
    name: 'Infosec Live',
    url: 'https://www.youtube.com/c/infoseclive',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=infoseclive',
    category: 'Live Mentorship',
    focus: ['Live streams', 'Community', 'Walkthroughs'],
    description:
      'A strong pick when you want livestreams, tutorials, interviews, and a mentor-driven cybersecurity learning community.',
  },
  {
    id: 'security-onion',
    name: 'Security Onion',
    url: 'https://www.youtube.com/channel/UCNBFTyYCdjT5hnm7uW25vGQ',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=UCNBFTyYCdjT5hnm7uW25vGQ',
    category: 'Threat Hunting',
    focus: ['Zeek', 'Suricata', 'Wazuh'],
    description:
      'Ideal for threat hunting and network monitoring with real-world open-source tooling like Zeek, Suricata, Wazuh, and Elastic.',
  },
  {
    id: 'cyberwire',
    name: 'The CyberWire',
    url: 'https://www.youtube.com/c/Thecyberwire',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=Thecyberwire',
    category: 'Cyber News',
    focus: ['Breach news', 'Vulnerabilities', 'Daily digest'],
    description:
      'A fast way to stay current on breaches, vulnerabilities, exploits, and industry events without wasting time on noise.',
  },
  {
    id: 'cyber-chronicle',
    name: 'The Cyber Chronicle',
    url: 'https://www.youtube.com/c/TheCyberChronicle',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=TheCyberChronicle',
    category: 'Weekly Roundups',
    focus: ['Podcast style', 'Trend summaries', 'Shared stories'],
    description:
      'Weekly cyber video blogs that compress what people are sharing most across the web, LinkedIn, and YouTube.',
  },
  {
    id: 'cristof-paar',
    name: 'Introduction to Cryptography by Cristof Paar',
    url: 'https://www.youtube.com/channel/UC1usFRN4LCMcfIV7UjHNuQg',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=UC1usFRN4LCMcfIV7UjHNuQg',
    category: 'Cryptography',
    focus: ['Applied crypto', 'Academic depth', 'Low math barrier'],
    description:
      'One of the strongest free introductions to modern applied cryptography, built like a real university course.',
  },
  {
    id: 'cloud-security-podcast',
    name: 'Cloud Security Podcast',
    url: 'https://www.youtube.com/c/CloudSecurityPodcast',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=CloudSecurityPodcast',
    category: 'Cloud Security',
    focus: ['CSPM', 'IAM', 'Practitioner interviews'],
    description:
      'Useful for learning what is hot in cloud security from practitioners, security architects, and CISOs.',
  },
  {
    id: 'professor-messer',
    name: 'Professor Messer',
    url: 'https://www.youtube.com/c/professormesser',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=professormesser',
    category: 'Certification Prep',
    focus: ['A+', 'Network+', 'Security+'],
    description:
      'A classic free resource for CompTIA learners who want structured certification-oriented material that is easy to follow.',
  },
  {
    id: 'mah',
    name: 'Malware Analysis for Hedgehogs',
    url: 'https://www.youtube.com/c/MalwareAnalysisForHedgehogs',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=MalwareAnalysisForHedgehogs',
    category: 'DFIR + Malware',
    focus: ['Malware analysis', 'DFIR', 'Reverse engineering'],
    description:
      'A focused channel for malware analysis and DFIR fundamentals, especially useful once you move beyond beginner content.',
  },
  {
    id: 'john-hammond',
    name: 'John Hammond',
    url: 'https://www.youtube.com/c/JohnHammond010',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=JohnHammond010',
    category: 'Hands-On Offense',
    focus: ['CTFs', 'Python', 'Adversarial mindset'],
    description:
      'One of the most approachable practical security creators for CTFs, scripting, labs, red-team thinking, and research breakdowns.',
  },
  {
    id: 'owasp',
    name: 'OWASP Foundation',
    url: 'https://www.youtube.com/c/OWASPGLOBAL',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=OWASPGLOBAL',
    category: 'AppSec',
    focus: ['OWASP projects', 'Software security', 'Community talks'],
    description:
      'A must-have source for software security, AppSec community sessions, and OWASP project knowledge.',
  },
  {
    id: 'stok',
    name: 'STÖK',
    url: 'https://www.youtube.com/c/STOKfredrik',
    embedUrl: 'https://www.youtube.com/embed?listType=user_uploads&list=STOKfredrik',
    category: 'Bug Bounty',
    focus: ['Recon', 'Bounty workflows', 'Research mindset'],
    description:
      'Great for bug bounty learners who want high-signal recon, methodology, and practical hacker workflows.',
  },
];

const CATEGORY_ICONS = {
  'Career Growth': GraduationCap,
  'Networking + Hacking': Shield,
  'Live Mentorship': Radio,
  'Threat Hunting': Bug,
  'Cyber News': Radio,
  'Weekly Roundups': Radio,
  Cryptography: Shield,
  'Cloud Security': Cloud,
  'Certification Prep': GraduationCap,
  'DFIR + Malware': Bug,
  'Hands-On Offense': Shield,
  AppSec: Shield,
  'Bug Bounty': Bug,
};

export default function LearningHub() {
  const [activeId, setActiveId] = useState(CHANNELS[0].id);
  const activeChannel = CHANNELS.find(channel => channel.id === activeId) || CHANNELS[0];
  const ActiveIcon = CATEGORY_ICONS[activeChannel.category] || Shield;

  return (
    <div className="min-h-screen relative" data-testid="learning-hub-page">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute inset-0 hero-gradient pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 py-10 relative">
        <div className="mb-10 animate-slide-in-down">
          <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-0 mb-4">LEARN TAB</Badge>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-['Orbitron'] mb-3">
            Cyber <span className="neon-text">Video Library</span>
          </h1>
          <p className="text-[#8B949E] max-w-3xl">
            Curated cybersecurity creators, channels, and learning streams. Pick a creator from the left and watch
            their video feed on the right.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] items-start">
          <aside className="glass glass-motion hover-lift rounded-sm overflow-hidden h-fit animate-slide-in-left" data-testid="learning-channel-list">
            <div className="px-5 py-4 border-b border-[#00D4FF]/10 bg-[#00D4FF]/[0.03]">
              <div className="text-sm font-bold font-['Orbitron']">Featured Creators</div>
              <div className="text-xs text-[#8B949E] mt-1">Best channels for labs, certs, DFIR, AppSec, and cloud security.</div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto divide-y divide-white/5">
              {CHANNELS.map((channel, index) => {
                const ItemIcon = CATEGORY_ICONS[channel.category] || Shield;
                const isActive = channel.id === activeId;
                return (
                  <button
                    key={channel.id}
                    data-testid={`learning-channel-${channel.id}`}
                    onClick={() => setActiveId(channel.id)}
                    className={`pressable w-full text-left px-5 py-4 transition-colors ${isActive ? 'bg-[#00D4FF]/10' : 'hover:bg-white/[0.03]'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-sm ${isActive ? 'bg-[#00D4FF]/20 text-[#00D4FF]' : 'bg-white/[0.04] text-[#8B949E]'}`}>
                        <ItemIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-[#8B949E]">#{String(index + 1).padStart(2, '0')}</span>
                          <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-0 text-[10px]">{channel.category}</Badge>
                        </div>
                        <h3 className={`font-semibold leading-tight ${isActive ? 'text-white' : 'text-[#C9D1D9]'}`}>{channel.name}</h3>
                        <p className="text-xs text-[#8B949E] mt-2 line-clamp-2">{channel.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-6 animate-slide-in-right stagger-2">
            <div className="glass glass-motion hover-lift rounded-sm overflow-hidden" data-testid="learning-video-player">
              <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[#00D4FF]/10 bg-[#0A0F1D]/70">
                <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-[#00D4FF]/10 text-[#00D4FF]">
                  <ActiveIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-0">{activeChannel.category}</Badge>
                    <span className="text-xs font-mono text-[#8B949E]">YouTube Spotlight</span>
                  </div>
                  <h2 className="text-xl font-black font-['Orbitron'] tracking-tight">{activeChannel.name}</h2>
                </div>
                <a href={activeChannel.url} target="_blank" rel="noreferrer" data-testid="learning-open-youtube">
                  <Button variant="outline" className="ripple-surface pressable border-[#00D4FF]/20 text-[#00D4FF] hover:bg-[#00D4FF]/10 hover:border-[#00D4FF] bg-transparent rounded-sm">
                    Open Channel <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>

              <div className="aspect-video bg-black animate-zoom-in">
                <iframe
                  title={activeChannel.name}
                  src={activeChannel.embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="glass glass-motion hover-lift rounded-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <PlayCircle className="w-4 h-4 text-[#00D4FF]" />
                  <h3 className="font-bold font-['Orbitron']">Why This Creator</h3>
                </div>
                <p className="text-sm leading-7 text-[#8B949E]">{activeChannel.description}</p>
              </div>

              <div className="glass glass-motion hover-lift rounded-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-[#00D4FF]" />
                  <h3 className="font-bold font-['Orbitron']">Best For</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeChannel.focus.map(item => (
                    <Badge key={item} className="bg-white/[0.04] text-[#C9D1D9] border-0 px-3 py-1">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
