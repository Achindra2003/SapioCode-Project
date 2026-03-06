"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { User } from "../lib/types";

const TOKEN_KEY = "sapiocode_token";
const USER_KEY = "sapiocode_user";

// ── Storage event bus so all useAuth consumers re-render on login/logout ──
type Listener = () => void;
const listeners = new Set<Listener>();
function emitAuthChange() {
  listeners.forEach((l) => l());
}
function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
let snapshotVersion = 0;
function getSnapshot() {
  return snapshotVersion;
}
function getServerSnapshot() {
  return 0;
}

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

/** Check if JWT token has expired (returns true if expired or invalid) */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false; // no expiry claim
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true; // malformed token
  }
}

// ── Cached user to keep stable reference across renders ──
let _cachedUser: User | null = null;
let _cachedUserVersion = -1;

export const authStorage = {
  setToken: (token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
      setCookie(TOKEN_KEY, token);
      snapshotVersion++;
      emitAuthChange();
    }
  },
  getToken: (): string | null => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && isTokenExpired(token)) {
        // Auto-clear expired tokens
        authStorage.logout();
        return null;
      }
      return token;
    }
    return null;
  },
  setUser: (user: User) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      snapshotVersion++;
      emitAuthChange();
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
      snapshotVersion++;
      emitAuthChange();
    }
  },
};

export function useAuth() {
  // Re-render whenever authStorage changes (login/logout/setUser)
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Return cached user so the reference is stable between renders
  // (prevents useEffect infinite loops when [user] is a dependency)
  if (_cachedUserVersion !== snapshotVersion) {
    _cachedUser = typeof window !== "undefined" ? authStorage.getUser() : null;
    _cachedUserVersion = snapshotVersion;
  }

  const user = _cachedUser;
  const isAuthenticated = !!(typeof window !== "undefined" && authStorage.getToken());

  const logout = useCallback(() => {
    authStorage.logout();
  }, []);

  return {
    user,
    isAuthenticated,
    logout,
  };
}
