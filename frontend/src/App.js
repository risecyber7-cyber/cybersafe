import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Tools from "@/pages/Tools";
import LearningHub from "@/pages/LearningHub";
import Sandbox from "@/pages/Sandbox";
import Dashboard from "@/pages/Dashboard";
import AIAssistant from "@/pages/AIAssistant";
import Plans from "@/pages/Plans";
import ForgotPassword from "@/pages/ForgotPassword";
import AdminPanel from "@/pages/AdminPanel";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-[#0A0A0A]">
          <Navbar />
          <main className="pt-16">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="/learn" element={<LearningHub />} />
              <Route path="/sandbox" element={<Sandbox />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/ai" element={<AIAssistant />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ForgotPassword />} />
              <Route path="/verify-email/:token" element={<ForgotPassword />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </main>
          <Toaster position="top-right" theme="dark" />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
