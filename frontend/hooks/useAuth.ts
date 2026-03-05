"use client";

import { User } from "../lib/types";

const TOKEN_KEY = "sapiocode_token";
const USER_KEY = "sapiocode_user";

function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document !== "undefined") {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }
}

function deleteCookie(name: string) {
  if (typeof document !== "undefined") {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  }
}

export const authStorage = {
  setToken: (token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
      setCookie(TOKEN_KEY, token);
    }
  },
  getToken: (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },
  setUser: (user: User) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },
  getUser: (): User | null => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    }
    return null;
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      deleteCookie(TOKEN_KEY);
    }
  },
};

export function useAuth() {
  const user = typeof window !== "undefined" ? authStorage.getUser() : null;
  const isAuthenticated = !!(typeof window !== "undefined" && authStorage.getToken());

  return {
    user,
    isAuthenticated,
    logout: authStorage.logout,
  };
}
