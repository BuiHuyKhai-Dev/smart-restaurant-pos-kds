'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { UserRole } from './types';
import { apiClient } from './api-client';

export interface StaffSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string;
  branchName: string;
  token?: string;
}

export const DEMO_STAFF_ACCOUNTS: Array<{
  email: string;
  password: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  description: string;
  targetRoute: string;
  color: string;
  accentColor: string;
}> = [
  {
    email: 'cashier@smartpos.vn',
    password: '123456',
    name: 'Trần Thị Thu (Thu Ngân)',
    role: 'cashier',
    roleTitle: 'Thu Ngân & Bán Hàng',
    description: 'Quản lý sơ đồ bàn, gộp/tách bàn, in tạm tính và thanh toán',
    targetRoute: '/pos',
    color: 'from-blue-600 to-indigo-600',
    accentColor: 'blue',
  },
  {
    email: 'kitchen@smartpos.vn',
    password: '123456',
    name: 'Đội Ngũ Bếp Trung Tâm',
    role: 'cook',
    roleTitle: 'Khu Vực Bếp (KDS)',
    description: 'Tiếp nhận order realtime, hệ thống tự chia trạm bếp và cảnh báo trễ',
    targetRoute: '/kds',
    color: 'from-amber-500 to-orange-600',
    accentColor: 'amber',
  },
  {
    email: 'admin@smartpos.vn',
    password: '123456',
    name: 'Nguyễn Văn Minh (Quản Lý)',
    role: 'admin',
    roleTitle: 'Quản Trị & Kho BOM',
    description: 'Quản lý định lượng nguyên liệu BOM, trừ kho tự động và báo cáo chuỗi',
    targetRoute: '/admin',
    color: 'from-emerald-600 to-teal-600',
    accentColor: 'emerald',
  },
];

interface AuthState {
  session: StaffSession | null;
  token: string | null;
  hasHydrated: boolean;
  login: (staffData: StaffSession, token?: string) => void;
  loginWithApi: (usernameOrEmail: string, password: string, branchNameFallback?: string) => Promise<StaffSession>;
  logout: () => void;
  setHydrated: (value: boolean) => void;
}

const AUTH_STORAGE_KEY = 'pos_kds_staff_session_v3';
const TOKEN_STORAGE_KEY = 'pos_kds_access_token';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      token: null,
      hasHydrated: false,
      login: (staffData: StaffSession, token?: string) => {
        const authToken = token || staffData.token || null;
        if (typeof window !== 'undefined' && authToken) {
          try {
            localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
          } catch {}
        }
        set({ session: { ...staffData, token: authToken || undefined }, token: authToken, hasHydrated: true });
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new Event('auth-session-updated'));
          } catch {}
        }
      },
      loginWithApi: async (usernameOrEmail: string, password: string, branchNameFallback = 'Chi nhánh 1 - Quận 1, TP.HCM') => {
        const res = await apiClient.post('/auth/login', {
          username: usernameOrEmail,
          password,
        });

        const authData = res.data;
        const accessToken = authData.accessToken;
        const user = authData.user;

        // Map role backend (IN HOA) sang UserRole frontend (thường)
        const role = user.role.toLowerCase() as UserRole;

        const sessionData: StaffSession = {
          id: user.id,
          name: user.fullName || user.username,
          email: user.email || `${user.username}@smartpos.vn`,
          role,
          branchId: user.branchId || 'branch-1',
          branchName: user.branch?.name || branchNameFallback,
          token: accessToken,
        };

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
          } catch {}
        }

        set({ session: sessionData, token: accessToken, hasHydrated: true });

        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new Event('auth-session-updated'));
          } catch {}
        }

        return sessionData;
      },
      logout: () => {
        set({ session: null, token: null, hasHydrated: true });
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            window.dispatchEvent(new Event('auth-session-updated'));
          } catch {}
        }
      },
      setHydrated: (value: boolean) => set({ hasHydrated: value }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);

export function useCurrentAuth() {
  const store = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  return {
    session: store.session,
    token: store.token,
    isAuthenticated: !!store.session,
    isReady: isReady && store.hasHydrated,
    login: store.login,
    loginWithApi: store.loginWithApi,
    logout: store.logout,
  };
}
