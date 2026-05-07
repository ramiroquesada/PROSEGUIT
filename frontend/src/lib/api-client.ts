const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    if (!skipAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // Si el token expiró, intentar refresh
    if (response.status === 401 && this.refreshToken && !skipAuth) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(`${API_URL}${endpoint}`, {
          ...fetchOptions,
          headers,
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error de red' }));
      throw new ApiError(response.status, error.error || 'Error desconocido');
    }

    return response.json();
  }

  private tryRefresh(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.doRefresh().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async doRefresh(): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!res.ok) {
        this.clearTokens();
        window.dispatchEvent(new Event('auth:expired'));
        return false;
      }

      const data = await res.json();
      this.accessToken = data.accessToken;
      localStorage.setItem('accessToken', data.accessToken);
      // Guardar el nuevo refresh token (rotación)
      if (data.refreshToken) {
        this.refreshToken = data.refreshToken;
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      return true;
    } catch {
      this.clearTokens();
      window.dispatchEvent(new Event('auth:expired'));
      return false;
    }
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /** Sube un archivo (multipart/form-data). No pone Content-Type para que el browser lo genere con el boundary. */
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

    let response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers,
          body: formData,
        });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error de red' }));
      throw new ApiError(response.status, error.error || 'Error desconocido');
    }

    return response.json();
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = new ApiClient();
