import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

type AuthContextValue = {
  ready: boolean;
  token: string | null;
  uid: string | null;
  role: string | null;
  login: (loginUid: string, password: string) => Promise<void>;
  saveSession: (token: string, uid: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const KEYS = { token: 'pr_token', uid: 'pr_uid', role: 'pr_role' };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [t, u, r] = await Promise.all([
        AsyncStorage.getItem(KEYS.token),
        AsyncStorage.getItem(KEYS.uid),
        AsyncStorage.getItem(KEYS.role),
      ]);
      if (t) {
        api.accessToken = t;
        setToken(t);
        setUid(u);
        setRole(r);
      }
      setReady(true);
    })();
  }, []);

  async function saveSession(nextToken: string, nextUid: string, nextRole: string) {
    api.accessToken = nextToken;
    setToken(nextToken);
    setUid(nextUid);
    setRole(nextRole);
    await AsyncStorage.multiSet([
      [KEYS.token, nextToken],
      [KEYS.uid, nextUid],
      [KEYS.role, nextRole],
    ]);
  }

  async function login(loginUid: string, password: string) {
    const res = await api.post<{
      uid: string;
      role: string;
      tokens: { accessToken: string };
    }>('/auth/login', { loginUid, password });
    await saveSession(res.tokens.accessToken, res.uid, res.role);
  }

  async function logout() {
    api.accessToken = null;
    setToken(null);
    setUid(null);
    setRole(null);
    await AsyncStorage.multiRemove([KEYS.token, KEYS.uid, KEYS.role]);
  }

  return (
    <AuthContext.Provider value={{ ready, token, uid, role, login, saveSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
