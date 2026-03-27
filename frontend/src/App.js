import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Tools from "@/pages/Tools";
import ToolExplorer from "@/pages/ToolExplorer";
import LearningHub from "@/pages/LearningHub";
import Sandbox from "@/pages/Sandbox";
import Dashboard from "@/pages/Dashboard";
import Plans from "@/pages/Plans";
import ForgotPassword from "@/pages/ForgotPassword";
import AdminPanel from "@/pages/AdminPanel";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className="page-transition"
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.99 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tool-explorer" element={<ToolExplorer />} />
          <Route path="/learn" element={<LearningHub />} />
          <Route path="/sandbox" element={<Sandbox />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ForgotPassword />} />
          <Route path="/verify-email/:token" element={<ForgotPassword />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen" style={{ background: 'var(--cyber-bg)', color: 'var(--cyber-text)' }}>
          <Navbar />
          <main className="pt-16">
            <AnimatedRoutes />
          </main>
          <Toaster position="top-right" theme="dark" />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
