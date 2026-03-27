import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '@/lib/config';

const AuthContext = createContext(null);
const API = API_BASE;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const api = useCallback(() => {
    const instance = axios.create({ baseURL: API });
    if (token) {
      instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    return instance;
  }, [token]);

  useEffect(() => {
    if (token) {
      api().get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, api]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const signup = async (email, username, password) => {
    const res = await axios.post(`${API}/auth/signup`, { email, username, password });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, api: api() }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
