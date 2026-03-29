import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BookOpenText, Boxes, LogOut, SearchCode, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IS_VERCEL } from '@/lib/config';

const NAV_LINKS = [
  { path: '/tools', label: 'Tools', icon: Wrench },
  ...(IS_VERCEL ? [] : [{ path: '/docker-ssh', label: 'Docker SSH', icon: Boxes }]),
  { path: '/tool-explorer', label: 'Tool Explorer', icon: SearchCode },
];

export default function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <nav data-testid="main-navbar" className="fixed inset-x-0 top-0 z-50 border-b border-[#00f7ff]/10 bg-[#05080d]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/tools" className="flex items-center gap-3 text-white" data-testid="nav-logo">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#00f7ff]/20 bg-[#00f7ff]/10">
            <BookOpenText className="h-4 w-4 text-[#00f7ff]" />
          </div>
          <div>
            <div className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.22em]">CyberSafe</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#6f879f]">Tool Workspace</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {NAV_LINKS.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'border-[#00f7ff]/30 bg-[#00f7ff]/10 text-[#00f7ff]'
                    : 'border-white/8 bg-white/[0.02] text-[#9ab1c6] hover:border-[#00f7ff]/20 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}

          {user && (
            <Button
              variant="ghost"
              onClick={logout}
              className="rounded-xl border border-white/8 text-[#9ab1c6] hover:bg-white/5 hover:text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{user.username}</span>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
