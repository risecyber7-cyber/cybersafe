import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_BASE } from '@/lib/config';

const AuthContext = createContext(null);
const API = API_BASE;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const completeAuth = (data) => {
    if (!data?.token) return data;
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API });
    if (token) {
      instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    return instance;
  }, [token]);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, api]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    if (res.data.requires_2fa) {
      return res.data;
    }
    return completeAuth(res.data);
  };

  const googleLogin = async (credential) => {
    const res = await axios.post(`${API}/auth/google`, { credential });
    return completeAuth(res.data);
  };

  const signup = async (email, username, password) => {
    const res = await axios.post(`${API}/auth/signup`, { email, username, password });
    return completeAuth(res.data);
  };

  const verifyTwoFactor = async (challengeId, code) => {
    const res = await axios.post(`${API}/auth/2fa/verify`, { challenge_id: challengeId, code });
    return completeAuth(res.data);
  };

  const logout = async () => {
    if (token) {
      try {
        await api.post('/auth/logout');
      } catch {}
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, googleLogin, logout, verifyTwoFactor, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
