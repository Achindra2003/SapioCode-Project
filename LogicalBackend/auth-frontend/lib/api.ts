const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Something went wrong");
    }

    return data as T;
}

export const authApi = {
    register: (body: any) => apiRequest("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body: any) => apiRequest("/auth/login", { method: "POST", body: JSON.stringify(body) }),
};
