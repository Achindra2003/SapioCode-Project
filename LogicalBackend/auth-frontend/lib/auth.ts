import Cookies from "js-cookie";

export interface User {
    id: string;
    email: string;
    role: "student" | "teacher";
    full_name?: string;
}

const TOKEN_KEY = "sapiocode_token";
const USER_KEY = "sapiocode_user";

export const authStorage = {
    setToken: (token: string) => {
        Cookies.set(TOKEN_KEY, token, { expires: 7, secure: true, sameSite: "strict" });
    },
    getToken: () => {
        return Cookies.get(TOKEN_KEY);
    },
    setUser: (user: User) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    getUser: (): User | null => {
        const user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    },
    logout: () => {
        Cookies.remove(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },
};

// Simple hook-like function for components
export function useAuth() {
    const user = typeof window !== "undefined" ? authStorage.getUser() : null;
    const isAuthenticated = !!(typeof window !== "undefined" && authStorage.getToken());

    return {
        user,
        isAuthenticated,
        logout: authStorage.logout,
    };
}
