import { Platform } from 'react-native';

/** Android emulator → host machine; iOS sim / web → localhost. */
const DEFAULT_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export class ApiClient {
  baseUrl: string;
  accessToken: string | null = null;

  constructor(baseUrl = process.env.EXPO_PUBLIC_API_BASE ?? DEFAULT_BASE) {
    this.baseUrl = baseUrl;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
    };
  }

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    return this.decode(res);
  }

  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers() });
    return this.decode(res);
  }

  private async decode<T>(res: Response): Promise<T> {
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) {
      let message =
        body && typeof body === 'object' && 'message' in body
          ? String((body as { message: unknown }).message)
          : `Request failed (${res.status})`;
      if (
        body &&
        typeof body === 'object' &&
        Array.isArray((body as { issues?: unknown }).issues)
      ) {
        const issues = (body as { issues: Array<{ path?: string; message?: string }> }).issues
          .map((i) => (i.path ? `${i.path}: ${i.message ?? ''}` : i.message ?? ''))
          .filter(Boolean)
          .join('; ');
        if (issues) message = issues;
      }
      throw new Error(message);
    }
    return body as T;
  }
}

export const api = new ApiClient();
