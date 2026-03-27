import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Send, Loader2, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const QUICK_PROMPTS = [
  'What is a zero-day exploit?',
  'How does JWT authentication work?',
  'Explain OWASP Top 10',
  'Best practices for password security',
];

export default function AIAssistant() {
  const { user, api, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', { message: msg, session_id: sessionId });
      setSessionId(res.data.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch (err) {
      toast.error('AI service error. Try again.');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId('');
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen relative flex flex-col" data-testid="ai-assistant-page">
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-[#00D4FF]/10 bg-[#00D4FF]/[0.03]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-[#00D4FF]/10 rounded-sm">
              <Bot className="w-5 h-5 text-[#00D4FF]" />
            </div>
            <div>
              <h1 className="font-bold font-['Orbitron'] text-lg">CyberGuard AI</h1>
              <p className="text-xs text-[#8B949E]">Your cybersecurity expert assistant</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button data-testid="ai-clear-chat" variant="ghost" onClick={clearChat} className="text-[#8B949E] hover:text-red-400 gap-1.5" size="sm">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-16 animate-fade-in-up" data-testid="ai-welcome">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#00D4FF]/10 rounded-sm flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#00D4FF]" />
              </div>
              <h2 className="text-xl font-bold font-['Orbitron'] mb-2">Ask me anything about cybersecurity</h2>
              <p className="text-sm text-[#8B949E] mb-8 max-w-md mx-auto">
                From vulnerability analysis to security best practices, I'm here to help.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    data-testid={`ai-quick-prompt-${i}`}
                    onClick={() => sendMessage(p)}
                    className="glass px-4 py-2 rounded-sm text-sm text-[#8B949E] hover:text-[#00D4FF] hover:border-[#00D4FF]/40 transition-all card-interactive"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 animate-fade-in-up ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 flex items-center justify-center bg-[#00D4FF]/10 rounded-sm shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-[#00D4FF]" />
                </div>
              )}
              <div
                data-testid={`ai-message-${i}`}
                className={`max-w-[80%] rounded-sm p-4 ${
                  m.role === 'user'
                    ? 'bg-[#00D4FF]/10 text-white'
                    : 'glass'
                }`}
              >
                {m.role === 'assistant' ? (
                  <div className="markdown-content text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{m.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-7 h-7 flex items-center justify-center bg-[#00D4FF]/10 rounded-sm shrink-0">
                <Bot className="w-4 h-4 text-[#00D4FF]" />
              </div>
              <div className="glass p-4 rounded-sm">
                <div className="flex items-center gap-2 text-[#00D4FF] text-sm font-mono">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input */}
      <div className="relative border-t border-[#00D4FF]/10 bg-[#060611]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <input
              data-testid="ai-chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask a cybersecurity question..."
              className="flex-1 bg-[#0D1117]/60 border border-[#00D4FF]/10 text-white px-4 py-3 rounded-sm font-mono text-sm focus:border-[#00D4FF] focus:outline-none focus:ring-1 focus:ring-[#00D4FF] placeholder:text-[#8B949E]/40"
            />
            <Button
              data-testid="ai-send-button"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm px-5 h-auto"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
