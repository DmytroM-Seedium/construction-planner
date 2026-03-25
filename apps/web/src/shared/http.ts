import { useTaskStore } from "@/store/useTaskStore";

const API_URL = "http://localhost:4000";

const getToken = () => useTaskStore.getState().token;

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
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json() as Promise<T>;
  },
  async get<T>(path: string): Promise<T> {
    const token = getToken();
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json() as Promise<T>;
  },
  async upload(path: string, file: File): Promise<unknown> {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData
    });
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    return response.json();
  }
};
