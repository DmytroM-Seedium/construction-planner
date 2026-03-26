import { useAuthStore } from "@/features/auth/store/auth.store";
import { env } from "@/shared/config/env";

const API_URL = env.apiBaseUrl;

const getToken = () => useAuthStore.getState().token;

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Request failed: ${status}`);
    this.name = "HttpError";
    this.status = status;
  }
}

export const api = {
  async post<T>(path: string, body: unknown): Promise<T> {
    const token = getToken();
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new HttpError(response.status);
    return response.json() as Promise<T>;
  },
  async get<T>(path: string): Promise<T> {
    const token = getToken();
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!response.ok) throw new HttpError(response.status);
    return response.json() as Promise<T>;
  },
  async upload<T = unknown>(
    path: string,
    args: { file: File; fields?: Record<string, string | number | boolean | null | undefined> },
  ): Promise<T> {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", args.file);
    if (args.fields) {
      for (const [key, raw] of Object.entries(args.fields)) {
        if (raw === undefined || raw === null) continue;
        formData.append(key, String(raw));
      }
    }
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData
    });
    if (!response.ok) throw new HttpError(response.status, `Upload failed: ${response.status}`);
    return response.json() as Promise<T>;
  }
};
