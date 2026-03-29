import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  Building2,
  CheckSquare,
  Cloud,
  Database,
  FileText,
  Globe2,
  KeyRound,
  LoaderCircle,
  MapPinned,
  MessageSquareMore,
  Plus,
  Trash2,
  Workflow,
} from 'lucide-react';

const SECTION_META = {
  spatial: {
    eyebrow: 'Architectural And Spatial',
    title: 'Real-world site intelligence',
    summary: 'Ground site work in actual map, terrain, and GIS context instead of isolated concept renders.',
    icon: Building2,
    color: '#00D4FF',
  },
  software: {
    eyebrow: 'Data Science And Software',
    title: 'Production-grade application workflow',
    summary: 'Move from demo flows to live APIs, real databases, authenticated users, and reusable CRUD patterns.',
    icon: Database,
    color: '#00FF9F',
  },
  delivery: {
    eyebrow: 'Execution And Delivery',
    title: 'Make the project real and usable',
    summary: 'Ship around a practical problem, document decisions, and deploy to a real public environment.',
    icon: Cloud,
    color: '#B829FF',
  },
};

const DELIVERY_ITEMS = [
  { icon: Workflow, label: 'CI/CD automation', detail: 'GitHub Actions pipeline for test, build, and deploy' },
  { icon: KeyRound, label: 'Authentication', detail: 'Real user login, protected workflows, and session handling' },
  { icon: Globe2, label: 'Live deployment', detail: 'Public URL with production environment variables and hosting' },
  { icon: FileText, label: 'Documentation', detail: 'Setup, architecture, API, and delivery notes' },
];

const STATUS_STYLES = {
  pending: 'border-white/10 bg-white/[0.03] text-[#C8D2E2]',
  in_progress: 'border-[#00D4FF]/25 bg-[#00D4FF]/10 text-[#00D4FF]',
  done: 'border-[#00FF9F]/25 bg-[#00FF9F]/10 text-[#00FF9F]',
};

function orderTasks(tasks) {
  const statusOrder = { in_progress: 0, pending: 1, done: 2 };
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    const statusDiff = (statusOrder[a.status] ?? 10) - (statusOrder[b.status] ?? 10);
    if (statusDiff !== 0) return statusDiff;
    const priorityDiff = (priorityOrder[a.priority] ?? 10) - (priorityOrder[b.priority] ?? 10);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export default function Roadmap() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'software', summary: '', priority: 'medium' });
  const { user, loading: authLoading, api } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    let active = true;
    api.get('/roadmap/tasks')
      .then((res) => {
        if (active) setTasks(orderTasks(res.data || []));
      })
      .catch((err) => {
        toast.error(err.response?.data?.detail || 'Failed to load roadmap tasks');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, user, api, navigate]);

  const groupedTasks = useMemo(() => {
    const grouped = { spatial: [], software: [], delivery: [] };
    tasks.forEach((task) => {
      const key = grouped[task.category] ? task.category : 'software';
      grouped[key].push(task);
    });
    return grouped;
  }, [tasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.status === 'done').length;
    const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
    return {
      total,
      done,
      inProgress,
      completion: total ? Math.round((done / total) * 100) : 0,
    };
  }, [tasks]);

  const patchTask = async (taskId, payload) => {
    const res = await api.patch(`/roadmap/tasks/${taskId}`, payload);
    setTasks((prev) => orderTasks(prev.map((task) => (task.id === taskId ? res.data : task))));
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await patchTask(taskId, { status });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update task');
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/roadmap/tasks/${taskId}`);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      toast.success('Roadmap task removed');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete task');
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/roadmap/tasks', form);
      setTasks((prev) => orderTasks([...prev, res.data]));
      setForm({ title: '', category: 'software', summary: '', priority: 'medium' });
      toast.success('Roadmap task added');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060611]">
        <div className="flex items-center gap-3 text-[#00D4FF] font-mono">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading roadmap...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#060611]" data-testid="roadmap-page">
      <div className="absolute inset-0 cyber-grid opacity-60 pointer-events-none" />
      <div className="absolute left-[-10rem] top-16 h-72 w-72 rounded-full bg-[#00D4FF]/10 blur-[130px] pointer-events-none" />
      <div className="absolute right-[-12rem] top-52 h-96 w-96 rounded-full bg-[#B829FF]/10 blur-[150px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <Badge className="border-0 bg-[#00D4FF]/10 text-[#00D4FF]">LIVE ROADMAP BOARD</Badge>
          <h1 className="mt-5 text-4xl font-black tracking-tight font-['Orbitron'] text-white sm:text-5xl">
            Real-World <span className="neon-blue">Execution Tracker</span>
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#93A4BA]">
            Roadmap ko website ke andar real task system bana diya gaya hai. Ab yahan se planning nahi, actual execution track hoga.
          </p>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            {Object.entries(SECTION_META).map(([sectionId, section], index) => {
              const Icon = section.icon;
              const sectionTasks = groupedTasks[sectionId] || [];
              return (
                <motion.section
                  key={sectionId}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="glass hud-border rounded-[28px] border border-white/8 bg-white/[0.03] p-6 sm:p-7"
                >
                  <div className="mb-6 flex items-start gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: `${section.color}14`, boxShadow: `0 0 30px ${section.color}1f` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: section.color }} />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.28em] text-[#8B949E]">{section.eyebrow}</div>
                      <h2 className="mt-2 text-2xl font-black font-['Orbitron'] text-white">{section.title}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8B949E]">{section.summary}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {sectionTasks.map((task) => (
                      <div key={task.id} className="rounded-[24px] border border-white/8 bg-black/20 px-4 py-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <CheckSquare className="h-4 w-4 text-[#00D4FF]" />
                              <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${STATUS_STYLES[task.status] || STATUS_STYLES.pending}`}>
                                {task.status.replace('_', ' ')}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-[#8B949E]">
                                {task.priority}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-[#B8C6D9]">{task.summary || 'No task notes added yet.'}</p>
                            <div className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[#66758B]">
                              Source: {task.source === 'template' ? 'Roadmap template' : 'Custom task'}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            {['pending', 'in_progress', 'done'].map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleStatusChange(task.id, status)}
                                className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors ${
                                  task.status === status
                                    ? 'border-[#00D4FF]/30 bg-[#00D4FF]/12 text-[#00D4FF]'
                                    : 'border-white/10 bg-white/[0.03] text-[#8B949E] hover:text-white'
                                }`}
                              >
                                {status.replace('_', ' ')}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleDelete(task.id)}
                              className="rounded-full border border-red-500/20 bg-red-500/10 p-2 text-red-300 transition-colors hover:text-red-200"
                              aria-label={`Delete ${task.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>
              );
            })}
          </div>

          <div className="space-y-6">
            <motion.aside
              initial={{ opacity: 0, x: 22 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="glass rounded-[28px] border border-white/8 bg-white/[0.03] p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00FF9F]/10">
                  <MapPinned className="h-5 w-5 text-[#00FF9F]" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-[#8B949E]">Execution Status</div>
                  <div className="mt-1 text-lg font-bold text-white">Current delivery pulse</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Total</div>
                  <div className="mt-2 text-3xl font-black font-['Orbitron'] text-white">{stats.total}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Done</div>
                  <div className="mt-2 text-3xl font-black font-['Orbitron'] text-[#00FF9F]">{stats.done}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">In Progress</div>
                  <div className="mt-2 text-3xl font-black font-['Orbitron'] text-[#00D4FF]">{stats.inProgress}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Completion</div>
                  <div className="mt-2 text-3xl font-black font-['Orbitron'] text-white">{stats.completion}%</div>
                </div>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#00D4FF,#00FF9F,#B829FF)] transition-all duration-500"
                  style={{ width: `${stats.completion}%` }}
                />
              </div>

              <div className="mt-6 space-y-3">
                {DELIVERY_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                      <div className="flex items-center gap-3 text-white">
                        <Icon className="h-4 w-4 text-[#00D4FF]" />
                        <span className="text-sm font-semibold">{item.label}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#8B949E]">{item.detail}</p>
                    </div>
                  );
                })}
              </div>
            </motion.aside>

            <motion.aside
              initial={{ opacity: 0, x: 22 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="glass rounded-[28px] border border-[#00D4FF]/10 bg-[linear-gradient(180deg,rgba(0,212,255,0.08),rgba(6,8,14,0.6))] p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00D4FF]/10">
                  <MessageSquareMore className="h-5 w-5 text-[#00D4FF]" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-[#8B949E]">Add New Task</div>
                  <div className="mt-1 text-lg font-bold text-white">Convert ideas into execution</div>
                </div>
              </div>

              <form onSubmit={handleCreate} className="mt-6 space-y-4">
                <div>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Task Title</div>
                  <Input
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="h-12 rounded-2xl border-white/10 bg-black/30 text-white"
                    placeholder="Add a concrete implementation step"
                  />
                </div>
                <div>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Summary</div>
                  <Input
                    value={form.summary}
                    onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
                    className="h-12 rounded-2xl border-white/10 bg-black/30 text-white"
                    placeholder="Short task note or blocker"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Category</div>
                    <select
                      value={form.category}
                      onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
                    >
                      <option value="spatial">Spatial</option>
                      <option value="software">Software</option>
                      <option value="delivery">Delivery</option>
                    </select>
                  </div>
                  <div>
                    <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[#8B949E]">Priority</div>
                    <select
                      value={form.priority}
                      onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-[#00D4FF] font-bold text-black hover:bg-[#00B8E6]"
                >
                  {saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add Task To Roadmap
                </Button>
              </form>
            </motion.aside>
          </div>
        </div>
      </div>
    </div>
  );
}
