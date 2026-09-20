import React, { createContext, useContext, useEffect, useState } from 'react';
import { caloriqApi, type AuthUser } from '../services/api';
import type { NutritionProfileInput } from '../utils/nutrition';
import { clearAuthToken, readAuthToken, saveAuthToken } from '../services/auth-storage';
import { cancelNotificationSchedule } from '../services/notifications';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: { name: string; email: string; password: string }) => Promise<AuthUser>;
  completeOnboarding: (profile: NutritionProfileInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readAuthToken().then(async token => {
      if (!token) return;
      try { setUser((await caloriqApi.getCurrentUser()).user); }
      catch { await clearAuthToken(); }
    }).finally(() => setLoading(false));
  }, []);

  const accept = async (result: Awaited<ReturnType<typeof caloriqApi.login>>) => {
    await saveAuthToken(result.token);
    setUser(result.user);
    return result.user;
  };

  return <AuthContext.Provider value={{
    user, loading,
    login: async (email, password) => accept(await caloriqApi.login(email, password)),
    register: async data => accept(await caloriqApi.register(data)),
    completeOnboarding: async profile => {
      const result = await caloriqApi.completeOnboarding(profile);
      setUser(result.user);
    },
    logout: async () => {
      try { await caloriqApi.logout(); } finally {
        if (user?.id) await cancelNotificationSchedule(user.id).catch(() => {});
        await clearAuthToken();
        setUser(null);
      }
    },
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
