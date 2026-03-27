import { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, ArrowLeft, Clock, User, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API_BASE } from '@/lib/config';

const API = API_BASE;
const CATEGORIES = ['all', 'Web Hacking', 'Network Security', 'OSINT', 'Cryptography'];

export default function LearningHub() {
  const [articles, setArticles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/articles`, { params: category !== 'all' ? { category } : {} })
      .then(res => setArticles(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  if (selected) {
    return (
      <div className="min-h-screen relative">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 py-10 relative">
          <Button
            data-testid="article-back-btn"
            variant="ghost"
            onClick={() => setSelected(null)}
            className="text-[#8B949E] hover:text-white mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Articles
          </Button>
          <article className="glass p-6 sm:p-8 rounded-sm animate-fade-in-up" data-testid="article-detail">
            <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-0 mb-4">{selected.category}</Badge>
            <h1 className="text-2xl sm:text-3xl font-black font-['Orbitron'] tracking-tight mb-4">{selected.title}</h1>
            <div className="flex items-center gap-4 text-xs text-[#8B949E] mb-8 pb-4 border-b border-[#00D4FF]/10">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{selected.author_name}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(selected.created_at).toLocaleDateString()}</span>
            </div>
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" data-testid="learning-hub-page">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 py-10 relative">
        {/* Header */}
        <div className="mb-10 animate-fade-in-up">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-['Orbitron'] mb-3">
            Learning <span className="neon-text">Hub</span>
          </h1>
          <p className="text-[#8B949E]">Cybersecurity articles and guides for all skill levels.</p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 animate-fade-in-up stagger-1" data-testid="category-filters">
          {CATEGORIES.map(c => (
            <Button
              key={c}
              data-testid={`category-${c.replace(/\s/g, '-').toLowerCase()}`}
              variant={category === c ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(c)}
              className={category === c
                ? 'bg-[#00D4FF] text-black font-bold rounded-sm'
                : 'border-[#00D4FF]/10 text-[#8B949E] hover:border-[#00D4FF] hover:text-[#00D4FF] rounded-sm bg-transparent'
              }
            >
              {c === 'all' ? 'All' : c}
            </Button>
          ))}
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="text-center py-20 text-[#8B949E]">Loading articles...</div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-[#8B949E]">No articles found.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((a, i) => (
              <button
                key={a.id}
                data-testid={`article-card-${i}`}
                onClick={() => setSelected(a)}
                className={`glass card-interactive p-6 rounded-sm text-left animate-fade-in-up stagger-${(i % 6) + 1}`}
              >
                <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-0 mb-3 text-xs">{a.category}</Badge>
                <h3 className="text-lg font-bold font-['Orbitron'] mb-2 leading-tight">{a.title}</h3>
                <p className="text-sm text-[#8B949E] line-clamp-2 mb-4">{a.summary}</p>
                <div className="flex items-center gap-3 text-xs text-[#8B949E]">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{a.author_name}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Featured Image */}
        <div className="mt-16 glass rounded-sm overflow-hidden animate-fade-in-up">
          <div className="relative h-48 sm:h-64">
            <img
              src="https://images.unsplash.com/photo-1760199789455-49098afd02f0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwyfHxjeWJlcnNlY3VyaXR5JTIwaGFja2VyJTIwY29kZXxlbnwwfHx8fDE3NzQ2MDU3MDB8MA&ixlib=rb-4.1.0&q=85"
              alt="Cybersecurity"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060611] via-[#060611]/60 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 sm:p-8">
              <Tag className="w-4 h-4 text-[#00D4FF] mb-2" />
              <h3 className="text-xl font-bold font-['Orbitron']">Stay Updated</h3>
              <p className="text-sm text-[#8B949E] mt-1">New articles added regularly. Keep learning, keep hacking ethically.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
