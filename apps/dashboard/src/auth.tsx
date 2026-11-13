import React, { createContext, useContext, useMemo, useState } from 'react';
import { api, setToken } from './api';

interface AuthState {
  token: string | null;
  uid: string | null;
  login: (loginUid: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTok] = useState<string | null>(() => localStorage.getItem('pr_token'));
  const [uid, setUid] = useState<string | null>(() => localStorage.getItem('pr_uid'));

  const value = useMemo<AuthState>(
    () => ({
      token,
      uid,
      async login(loginUid, password) {
        const res = await api.login(loginUid, password);
        setToken(res.tokens.accessToken);
        localStorage.setItem('pr_token', res.tokens.accessToken);
        localStorage.setItem('pr_uid', res.uid);
        setTok(res.tokens.accessToken);
        setUid(res.uid);
      },
      logout() {
        setToken(null);
        localStorage.removeItem('pr_token');
        localStorage.removeItem('pr_uid');
        setTok(null);
        setUid(null);
      },
    }),
    [token, uid],
  );

  if (token) setToken(token);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
}
