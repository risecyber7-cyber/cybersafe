import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Shield, Menu, X, Terminal, FlaskConical, LayoutDashboard, Wrench, LogOut, User, CreditCard, ShieldCheck, SearchCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const NAV_LINKS = [
  { path: '/tools', label: 'Tools', icon: Wrench },
  { path: '/tool-explorer', label: 'ToolExplorer', icon: SearchCode },
  { path: '/sandbox', label: 'Sandbox', icon: FlaskConical },
  { path: '/plans', label: 'Plans', icon: CreditCard },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav data-testid="main-navbar" className="fixed top-0 left-0 right-0 z-50 bg-[#060611]/70 backdrop-blur-xl border-b border-[#00D4FF]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
            <Shield className="w-7 h-7 text-[#00D4FF] transition-transform group-hover:rotate-12" style={{ filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.4))' }} />
            <span className="font-['Orbitron'] font-bold text-lg tracking-tight text-white">
              Cyber<span className="neon-blue">Guard</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all ${
                  location.pathname === path
                    ? 'text-[#00D4FF]'
                    : 'text-[#8B949E] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Auth / Profile */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/dashboard" data-testid="nav-dashboard">
                  <Button variant="ghost" className="text-[#8B949E] hover:text-white gap-1.5">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" data-testid="nav-admin">
                    <Button variant="ghost" className="text-[#8B949E] hover:text-white gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      Admin
                    </Button>
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button data-testid="nav-user-menu" variant="ghost" className="border border-[#00D4FF]/10 hover:border-[#00D4FF]/50 gap-2">
                      <User className="w-4 h-4 text-[#00D4FF]" />
                      <span className="text-white text-sm">{user.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0D1117] border-[#00D4FF]/10 text-white">
                    <DropdownMenuItem className="text-[#8B949E] text-xs" disabled>{user.email}</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem data-testid="nav-logout-btn" onClick={logout} className="text-red-400 cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth" data-testid="nav-access-terminal">
                <Button className="btn-glow bg-[#00D4FF] text-black font-bold hover:bg-[#00B8E6] rounded-sm px-5 font-['Orbitron'] text-xs">
                  <Terminal className="w-4 h-4 mr-1.5" />
                  Access Terminal
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            data-testid="mobile-menu-toggle"
            className="md:hidden text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#060611]/95 backdrop-blur-xl border-t border-[#00D4FF]/10 animate-fade-in">
          <div className="px-4 py-4 space-y-2">
            {NAV_LINKS.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded text-sm ${
                  location.pathname === path ? 'text-[#00D4FF] bg-[#00D4FF]/5' : 'text-[#8B949E]'
                }`}
              >
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#8B949E]">
                  <LayoutDashboard className="w-4 h-4" />Dashboard
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#00D4FF]">
                    <ShieldCheck className="w-4 h-4" />Admin Panel
                  </Link>
                )}
                <button onClick={() => { logout(); setMobileOpen(false); }} className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 w-full">
                  <LogOut className="w-4 h-4" />Logout
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)} className="block mt-2">
                <Button className="w-full btn-glow bg-[#00D4FF] text-black font-bold">Access Terminal</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
