import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import Auth from "@/pages/Auth";
import DockerSSH from "@/pages/DockerSSH";
import Tools from "@/pages/Tools";
import ToolExplorer from "@/pages/ToolExplorer";
import ForgotPassword from "@/pages/ForgotPassword";

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
          <Route path="/" element={<Navigate to="/tools" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/docker-ssh" element={<DockerSSH />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/tool-explorer" element={<ToolExplorer />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ForgotPassword />} />
          <Route path="/verify-email/:token" element={<ForgotPassword />} />
          <Route path="*" element={<Navigate to="/tools" replace />} />
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
